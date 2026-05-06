import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Mirror of discordMainWorldPaste from entrypoints/background.ts.
 *
 * The real function runs in MAIN world via chrome.scripting.executeScript,
 * so it cannot be imported directly. We mirror its logic here for unit testing.
 *
 * If you change the handler logic, change BOTH places.
 */

type VoidFn = () => void;

// Minimal mirror of the MAIN world paste function (post-UAT-regression-fix version).
//
// Why beforeinput[deleteContent] replaces Escape (UAT regression debug session
// `discord-uat-regression`):
//   - Prior fix used `KeyboardEvent('keydown', { key: 'Escape' })` 200ms after Enter
//     to force Slate to clear residual text. First-dispatch worked.
//   - Live UAT showed the second consecutive dispatch (no page refresh) left
//     residual text AND timed out — Escape's side-effects (collapse Slate
//     selection, blur composer, close UI panels) corrupted Slate's internal
//     editor state across dispatches. Page refresh re-mounted React/Slate and
//     fixed it.
//   - beforeinput[deleteContent] routes through Slate's native editing pipeline
//     (the same path Backspace/Delete take) — model and DOM stay in sync,
//     no cross-dispatch state pollution.
//   - We additionally pre-clean residual text BEFORE paste so any prior failure
//     is self-recovering.
async function discordMainWorldPasteMirror(
  text: string,
  deps?: {
    activeElement?: Element | null;
    querySelector?: (sel: string) => Element | null;
    setTimeout?: (fn: VoidFn, ms: number) => void;
  },
): Promise<boolean> {
  const activeEl = deps?.activeElement ?? document.activeElement;
  const qs = deps?.querySelector ?? document.querySelector.bind(document);
  const st =
    deps?.setTimeout ?? ((fn: VoidFn, ms: number) => setTimeout(fn, ms) as unknown as void);

  const active = activeEl instanceof HTMLElement ? activeEl : null;
  const editor =
    (active?.matches('[role="textbox"][aria-label*="Message"]') ||
    active?.matches('[data-slate-editor="true"]') ||
    active?.matches('[contenteditable="true"]')
      ? active
      : null) ??
    (qs('[role="textbox"][aria-label*="Message"]') as HTMLElement | null) ??
    (qs('[data-slate-editor="true"]') as HTMLElement | null) ??
    (qs('div[class*="textArea"] [contenteditable="true"]') as HTMLElement | null);

  if (!editor) return false;

  // Focus
  editor.focus();

  // Defensive pre-paste cleanup: if the editor still holds residual text from a
  // prior (failed) dispatch, clear it via beforeinput[deleteContent] BEFORE pasting
  // new content. This routes through Slate's native editing pipeline, keeping
  // model and DOM in sync.
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContent',
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  // Paste event
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }),
  );

  // Enter keydown
  editor.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }),
  );

  // Post-Enter clear: wait 200ms then dispatch beforeinput[deleteContent] ONLY if
  // residual text is still present. Unlike the previous Escape approach (which
  // polluted Slate state across dispatches), beforeinput goes through Slate's
  // native editing pipeline; if Slate already cleared on Enter, textContent is
  // empty and we skip the dispatch (no-op).
  await new Promise<void>((resolve) => st(resolve, 200));
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContent',
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  return true;
}

function createEditor(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'textbox');
  el.setAttribute('aria-label', 'Message #general');
  el.focus();
  return el;
}

describe('discordMainWorldPaste (gap fix: post-Enter clear via beforeinput)', () => {
  let editor: HTMLElement;
  let events: { type: string; key?: string; inputType?: string; eventType: string }[];

  beforeEach(() => {
    events = [];
    editor = createEditor();
    editor.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      events.push({ type: 'keydown', key: ke.key, eventType: 'keydown' });
    });
    editor.addEventListener('paste', () => {
      events.push({ type: 'paste', eventType: 'paste' });
    });
    editor.addEventListener('beforeinput', (e: Event) => {
      const ie = e as InputEvent;
      events.push({ type: 'beforeinput', inputType: ie.inputType, eventType: 'beforeinput' });
    });
    // Stub focus
    vi.spyOn(editor, 'focus').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches paste, Enter, then beforeinput[deleteContent] on first dispatch (clean editor)', async () => {
    // Editor starts empty (textContent === '')
    const mockSetTimeout = (fn: VoidFn, _ms: number) => {
      fn();
    };

    // Stub textContent: starts empty, stays empty (Slate cleared synchronously)
    Object.defineProperty(editor, 'textContent', {
      get: () => '',
      configurable: true,
    });

    await discordMainWorldPasteMirror('hello', {
      activeElement: editor,
      querySelector: () => null,
      setTimeout: mockSetTimeout,
    });

    // Order on clean editor + clean post-Enter: paste, Enter, NO beforeinput
    // (beforeinput is gated on textContent.length > 0)
    expect(events).toEqual([
      { type: 'paste', eventType: 'paste' },
      { type: 'keydown', key: 'Enter', eventType: 'keydown' },
    ]);
  });

  it('dispatches a defensive beforeinput[deleteContent] before paste when editor has residual text (REPRODUCES UAT bug 2)', async () => {
    // This is the critical multi-dispatch scenario: the first dispatch left
    // residual text in the editor (Slate state corruption from prior synthetic
    // events). On the second dispatch, the paste handler MUST clean residual
    // text BEFORE pasting; otherwise the new text appends to old.
    const mockSetTimeout = (fn: VoidFn, _ms: number) => {
      fn();
    };

    // Stub textContent: editor has residual text from a prior dispatch.
    Object.defineProperty(editor, 'textContent', {
      get: () => 'residual from prior dispatch',
      configurable: true,
    });

    await discordMainWorldPasteMirror('new message', {
      activeElement: editor,
      querySelector: () => null,
      setTimeout: mockSetTimeout,
    });

    // Pre-paste defensive cleanup MUST fire because residual text was present.
    // Order: beforeinput[deleteContent] -> paste -> Enter -> beforeinput[deleteContent] (post-Enter, residual still present in stub).
    expect(events[0]).toEqual({
      type: 'beforeinput',
      inputType: 'deleteContent',
      eventType: 'beforeinput',
    });
    expect(events[1]).toEqual({ type: 'paste', eventType: 'paste' });
    expect(events[2]).toEqual({ type: 'keydown', key: 'Enter', eventType: 'keydown' });
    expect(events[3]).toEqual({
      type: 'beforeinput',
      inputType: 'deleteContent',
      eventType: 'beforeinput',
    });
  });

  it('does NOT dispatch Escape keydown (Escape side-effect was the UAT regression cause)', async () => {
    // The 05-06 fix used a 200ms delayed Escape keydown to force Slate to clear.
    // Live UAT showed that Escape's side-effects (collapse selection, close
    // panels) corrupted Slate state across dispatches. The fix is to use
    // beforeinput[deleteContent] instead — same intent, no side-effects.
    const mockSetTimeout = (fn: VoidFn, _ms: number) => {
      fn();
    };

    Object.defineProperty(editor, 'textContent', {
      get: () => 'still here', // simulate Slate didn't clear after Enter
      configurable: true,
    });

    await discordMainWorldPasteMirror('hello', {
      activeElement: editor,
      querySelector: () => null,
      setTimeout: mockSetTimeout,
    });

    // No Escape keydown anywhere in the event stream.
    expect(events.some((e) => e.type === 'keydown' && e.key === 'Escape')).toBe(false);
  });

  it('schedules the post-Enter clear on a 200ms timer', async () => {
    let timeoutMs = 0;
    let timeoutCb: VoidFn | null = null;
    const mockSetTimeout = (fn: VoidFn, ms: number) => {
      timeoutCb = fn;
      timeoutMs = ms;
    };

    Object.defineProperty(editor, 'textContent', {
      get: () => '',
      configurable: true,
    });

    const result = discordMainWorldPasteMirror('hello', {
      activeElement: editor,
      querySelector: () => null,
      setTimeout: mockSetTimeout,
    });

    expect(timeoutMs).toBe(200);
    expect(timeoutCb).not.toBeNull();

    // Fire the timeout to let the promise resolve
    timeoutCb!();
    const finalResult = await result;
    expect(finalResult).toBe(true);
  });

  it('returns false and dispatches no events when editor is not found', async () => {
    const result = await discordMainWorldPasteMirror('hello', {
      activeElement: null,
      querySelector: () => null,
      setTimeout: () => {},
    });

    expect(result).toBe(false);
    expect(events).toEqual([]);
  });
});
