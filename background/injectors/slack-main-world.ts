/**
 * Slack MAIN world paste injector.
 * Runs in MAIN world context via chrome.scripting.executeScript.
 * Finds Quill editor, dispatches synthetic ClipboardEvent with formatted text.
 *
 * Moved from entrypoints/background.ts in Phase 8 (D-99, D-100).
 * Imported by background/main-world-registry.ts (SW-only, not shared/).
 */
export async function slackMainWorldPaste(text: string): Promise<boolean> {
  const active = document.activeElement;
  const editor =
    (active instanceof HTMLElement &&
    (active.matches('.ql-editor[role="textbox"]') ||
      active.matches('.ql-editor[contenteditable="true"]') ||
      active.matches('[contenteditable="true"]'))
      ? active
      : null) ??
    document.querySelector<HTMLElement>('.ql-editor[role="textbox"]') ??
    document.querySelector<HTMLElement>('.ql-editor[contenteditable="true"]') ??
    document.querySelector<HTMLElement>('#msg_input [contenteditable="true"]');

  if (!editor) return false;

  editor.focus();

  // Defensive pre-paste cleanup: if the editor still holds residual text from a
  // prior (failed) dispatch, clear it via beforeinput[deleteContent] BEFORE
  // pasting new content.
  // NOTE: This dispatches a synthetic InputEvent and immediately checks textContent.
  // Quill processes the event asynchronously via its own handler, so the textContent
  // check below is a best-effort race. In practice, the 200ms setTimeout (line 58)
  // gives Quill time to reconcile. Deterministic clearing (editor.textContent = '')
  // would break Quill's internal state, so synthetic events are the safe approach.
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

  // Dispatch Enter immediately after paste (same-frame, matching Discord pattern).
  // Quill processes paste synchronously; a delayed Enter may miss Quill's event context.
  // Dispatch both keydown and keypress for maximum Quill compatibility.
  const enterOpts: KeyboardEventInit = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    charCode: 13,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  editor.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
  editor.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
  editor.dispatchEvent(new KeyboardEvent('keyup', enterOpts));

  // Post-Enter clear: wait 200ms then dispatch beforeinput[deleteContent] ONLY
  // if residual text is still present.
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
