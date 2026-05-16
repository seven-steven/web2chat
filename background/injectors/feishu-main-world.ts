/**
 * Feishu/Lark MAIN world paste injector (FSL-03).
 * Runs in MAIN world context via chrome.scripting.executeScript.
 * Finds Feishu contenteditable editor, dispatches synthetic ClipboardEvent.
 *
 * Selector strategy (ARIA-first, three-tier fallback, per D-164):
 *   Tier 1: [contenteditable="true"][role="textbox"]
 *   Tier 2: .message-input [contenteditable="true"] (class context)
 *   Tier 3: [contenteditable="true"] (low confidence -- any contenteditable)
 */
export async function feishuMainWorldPaste(text: string): Promise<boolean> {
  const editor =
    document.querySelector<HTMLElement>('[contenteditable="true"][role="textbox"]') ??
    document.querySelector<HTMLElement>('.message-input [contenteditable="true"]') ??
    document.querySelector<HTMLElement>('[contenteditable="true"]');

  if (!editor) return false;
  editor.focus();

  // Pre-paste cleanup: clear residual text from prior failed dispatch
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  // ClipboardEvent paste with text/plain only (security: no text/html, T-12-05)
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }),
  );

  // Trigger input event to activate send button state machine
  editor.dispatchEvent(new Event('input', { bubbles: true }));

  // Wait for UI to process
  await new Promise<void>((resolve) => setTimeout(resolve, 300));

  // Try clicking send button (up to 3 attempts)
  let sent = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const sendBtn =
      document.querySelector<HTMLButtonElement>('[aria-label*="Send"]') ??
      document.querySelector<HTMLButtonElement>('.send-btn') ??
      document.querySelector<HTMLButtonElement>('button[data-testid*="send"]');
    if (sendBtn) {
      sendBtn.click();
      sent = true;
      break;
    }
    if (attempt < 2) await new Promise<void>((resolve) => setTimeout(resolve, 150));
  }

  // Fallback: synthetic Enter
  if (!sent) {
    const enterProps = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    editor.dispatchEvent(new KeyboardEvent('keydown', enterProps));
    editor.dispatchEvent(new KeyboardEvent('keypress', enterProps));
    editor.dispatchEvent(new KeyboardEvent('keyup', enterProps));
  }

  // Post-send cleanup
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
  }
  return true;
}
