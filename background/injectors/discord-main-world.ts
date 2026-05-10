/**
 * Discord MAIN world paste injector.
 * Runs in MAIN world context via chrome.scripting.executeScript.
 * Finds Slate editor, dispatches synthetic ClipboardEvent with formatted text.
 *
 * Moved from entrypoints/background.ts in Phase 8 (D-99, D-100).
 * Imported by background/main-world-registry.ts (SW-only, not shared/).
 */
export async function discordMainWorldPaste(text: string): Promise<boolean> {
  const active = document.activeElement;
  const editor =
    (active instanceof HTMLElement &&
    (active.matches('[role="textbox"][aria-label*="Message"]') ||
      active.matches('[data-slate-editor="true"]') ||
      active.matches('[contenteditable="true"]'))
      ? active
      : null) ??
    document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]') ??
    document.querySelector<HTMLElement>('[data-slate-editor="true"]') ??
    document.querySelector<HTMLElement>('div[class*="textArea"] [contenteditable="true"]');

  if (!editor) return false;

  editor.focus();

  // Defensive pre-paste cleanup (UAT regression fix, debug session
  // discord-uat-regression): if the editor still holds residual text from a
  // prior (failed) dispatch, clear it via beforeinput[deleteContent] BEFORE
  // pasting new content. Routes through Slate's native editing pipeline so
  // model and DOM stay in sync; idempotent on already-empty editors.
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
  editor.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }),
  );

  // Post-Enter clear (UAT regression fix, replaces 05-06 Escape-keydown):
  // wait 200ms then dispatch beforeinput[deleteContent] ONLY if residual text
  // is still present. The previous Escape approach polluted Slate's internal
  // editor state across dispatches (collapsed selection, blurred composer);
  // the next dispatch then failed silently. beforeinput[deleteContent] uses
  // the same path Backspace/Delete take, so it doesn't desync Slate.
  // discordMainWorldPaste runs in MAIN world via executeScript which awaits
  // Promise resolution, so this delay does NOT cause Port message ordering
  // issues.
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
