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

// Minimal mirror of the MAIN world paste function (post-gap-fix version)
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

  // Gap fix: wait 200ms then dispatch Escape to trigger Discord native clear
  await new Promise<void>((resolve) => st(resolve, 200));
  editor.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  );

  return true;
}

function createEditor(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'textbox');
  el.setAttribute('aria-label', 'Message #general');
  el.focus();
  return el;
}

describe('discordMainWorldPaste (gap fix: Escape after Enter)', () => {
  let editor: HTMLElement;
  let events: { type: string; key?: string; eventType: string }[];

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
    // Stub focus
    vi.spyOn(editor, 'focus').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches Escape keydown after 200ms delay following Enter', async () => {
    let timeoutCb: VoidFn | null = null;
    let timeoutMs = 0;
    const mockSetTimeout = (fn: VoidFn, ms: number) => {
      timeoutCb = fn;
      timeoutMs = ms;
    };

    const result = discordMainWorldPasteMirror('hello', {
      activeElement: editor,
      querySelector: () => null,
      setTimeout: mockSetTimeout,
    });

    // Before the timeout fires: paste + Enter already dispatched, Escape not yet
    expect(events).toEqual([
      { type: 'paste', eventType: 'paste' },
      { type: 'keydown', key: 'Enter', eventType: 'keydown' },
    ]);
    // Escape not dispatched yet
    expect(events.some((e) => e.key === 'Escape')).toBe(false);

    // The timeout was scheduled with 200ms
    expect(timeoutMs).toBe(200);
    expect(timeoutCb).not.toBeNull();

    // Fire the timeout
    await timeoutCb!();

    // Now Escape should be dispatched
    expect(events[2]).toEqual({ type: 'keydown', key: 'Escape', eventType: 'keydown' });

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

  it('dispatches paste, Enter, and Escape on the same editor in order', async () => {
    // Immediately resolve the timeout
    const mockSetTimeout = (fn: VoidFn, _ms: number) => {
      fn();
    };

    await discordMainWorldPasteMirror('hello', {
      activeElement: editor,
      querySelector: () => null,
      setTimeout: mockSetTimeout,
    });

    // Order: paste, Enter, Escape
    expect(events).toEqual([
      { type: 'paste', eventType: 'paste' },
      { type: 'keydown', key: 'Enter', eventType: 'keydown' },
      { type: 'keydown', key: 'Escape', eventType: 'keydown' },
    ]);
  });
});
