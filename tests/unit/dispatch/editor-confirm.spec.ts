import { describe, it, expect } from 'vitest';

/**
 * Editor-state confirmation tests for Discord adapter.
 *
 * The previous approach (waitForNewMessage) counted container.children.length
 * to detect new messages. This fails on Discord because:
 *   - Discord uses a virtual list that recycles DOM nodes
 *   - New messages don't increase children count
 *   - MutationObserver on childList never fires
 *
 * Fix: use editor.textContent empty as send-success signal.
 * Discord clears the Slate editor after processing Enter → send.
 * The MAIN world paste already waits 200ms post-Enter before returning,
 * so the editor should be empty by the time injectMainWorldPaste resolves.
 */

describe('editor-state send confirmation', () => {
  function createEditor(textContent: string) {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.setAttribute('role', 'textbox');
    // Mock textContent
    Object.defineProperty(editor, 'textContent', {
      get: () => textContent,
      configurable: true,
    });
    return editor;
  }

  it('detects successful send when editor is cleared', () => {
    const editor = createEditor('');
    const confirmed = (editor.textContent ?? '').trim().length === 0;
    expect(confirmed).toBe(true);
  });

  it('detects failed send when editor still has text', () => {
    const editor = createEditor('residual text');
    const confirmed = (editor.textContent ?? '').trim().length === 0;
    expect(confirmed).toBe(false);
  });

  it('ignores whitespace-only editor (treats as cleared)', () => {
    const editor = createEditor('   \n  ');
    const confirmed = (editor.textContent ?? '').trim().length === 0;
    expect(confirmed).toBe(true);
  });
});
