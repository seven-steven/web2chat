/**
 * Telegram MAIN world paste injector.
 * Runs in MAIN world context via chrome.scripting.executeScript.
 * Finds Telegram contenteditable editor, dispatches synthetic ClipboardEvent
 * with formatted text, clicks send button.
 *
 * Moved from entrypoints/background.ts pattern in Phase 8 (D-99, D-100).
 * Imported by background/main-world-registry.ts (SW-only, not shared/).
 */
export async function telegramMainWorldPaste(text: string): Promise<boolean> {
  const editor =
    document.querySelector<HTMLElement>('.input-message-input[contenteditable="true"]') ??
    document.querySelector<HTMLElement>('.rows-wrapper [contenteditable="true"]') ??
    document.querySelector<HTMLElement>('.new-message-wrapper [contenteditable="true"]');

  if (!editor) return false;

  editor.focus();

  // Pre-paste cleanup: if the editor still holds residual text from a
  // prior (failed) dispatch, clear it via beforeinput[deleteContent] BEFORE
  // pasting new content.
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
  }

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

  // Wait for send button to appear
  await new Promise<void>((resolve) => setTimeout(resolve, 300));

  // Primary: click send button (retry up to 3 times, 150ms apart)
  let sent = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const sendBtn =
      document.querySelector<HTMLButtonElement>('.btn-send') ??
      document.querySelector<HTMLButtonElement>('.btn-icon.send') ??
      document.querySelector<HTMLButtonElement>('[aria-label*="Send"]');
    if (sendBtn) {
      sendBtn.click();
      sent = true;
      break;
    }
    if (attempt < 2) await new Promise<void>((resolve) => setTimeout(resolve, 150));
  }

  // Fallback: synthetic Enter if button not found/clicked
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
