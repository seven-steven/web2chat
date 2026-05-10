import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as discordContent from '@/entrypoints/discord.content';

// Load fixture and extract inner content (inside <body>)
const fixtureHtml = readFileSync(resolve(__dirname, 'discord.fixture.html'), 'utf-8');
const bodyMatch = fixtureHtml.match(/<body>([\s\S]*)<\/body>/);
const fixtureBody = bodyMatch?.[1]?.trim() ?? '';
type SelectorTier = 'tier1-aria' | 'tier2-data' | 'tier3-class-fragment';
type EditorMatch = { element: HTMLElement; tier: SelectorTier; lowConfidence: boolean };

function getDiscordTesting() {
  return (
    discordContent as unknown as {
      __testing?: {
        findEditor: () => EditorMatch | null;
        handleDispatch: (payload: {
          dispatchId: string;
          send_to: string;
          prompt: string;
          snapshot: {
            title: string;
            url: string;
            description: string;
            create_at: string;
            content: string;
          };
          selectorConfirmation?: { warning: 'SELECTOR_LOW_CONFIDENCE' };
        }) => Promise<{
          ok: boolean;
          code?: 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'NOT_LOGGED_IN' | 'INTERNAL';
          retriable?: boolean;
          warnings?: Array<{ code: 'SELECTOR_LOW_CONFIDENCE' }>;
        }>;
        setMainWorldPasteForTest: (
          fn: (editor: HTMLElement, text: string) => Promise<boolean>,
        ) => void;
        resetTestOverrides: () => void;
      };
    }
  ).__testing;
}

const dispatchPayload = {
  dispatchId: '00000000-0000-4000-8000-000000000401',
  send_to: 'https://discord.com/channels/123/456',
  prompt: 'remember this',
  snapshot: {
    title: 'Title',
    url: 'https://example.com/',
    description: 'Desc',
    create_at: '2026-05-10T00:00:00.000Z',
    content: 'Body',
  },
};

// Three-tier ARIA-first editor selector (mirrors discord.content.ts logic)
function findEditor(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]') ??
    document.querySelector<HTMLElement>('[data-slate-editor="true"]') ??
    document.querySelector<HTMLElement>('div[class*="textArea"] [contenteditable="true"]')
  );
}

// ClipboardEvent paste injection (mirrors discord.content.ts logic)
function pasteText(editor: HTMLElement, text: string): void {
  editor.focus();
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('Discord selector fallback (ADD-05, D-62)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixtureBody;
  });

  it('tier-1: finds editor via role=textbox + aria-label', () => {
    const editor = findEditor();
    expect(editor).not.toBeNull();
    expect(editor!.getAttribute('role')).toBe('textbox');
    expect(editor!.getAttribute('aria-label')).toContain('Message');
  });

  it('tier-2: falls back to data-slate-editor when aria-label removed', () => {
    const el = document.querySelector('[role="textbox"][aria-label*="Message"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');

    const editor = findEditor();
    expect(editor).not.toBeNull();
    expect(editor!.getAttribute('data-slate-editor')).toBe('true');
  });

  it('tier-3: falls back to class fragment when data-slate-editor removed', () => {
    const el = document.querySelector('[role="textbox"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    el.removeAttribute('data-slate-editor');

    const editor = findEditor();
    expect(editor).not.toBeNull();
    expect(editor!.getAttribute('contenteditable')).toBe('true');
  });

  it('returns null when all selectors fail', () => {
    const el = document.querySelector('[role="textbox"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    el.removeAttribute('data-slate-editor');
    el.removeAttribute('contenteditable');
    // Also remove the class fragment container
    const parent = el.parentElement!;
    parent.className = '';

    const editor = findEditor();
    expect(editor).toBeNull();
  });
});

describe('Discord selector confidence warnings (DSPT-04)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixtureBody;
    (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM?.setURL(
      'https://discord.com/channels/123/456',
    );
    getDiscordTesting()?.resetTestOverrides();
  });

  it('reports tier1-aria metadata without SELECTOR_LOW_CONFIDENCE', () => {
    const testing = getDiscordTesting();
    expect(testing).toBeDefined();
    const match = testing!.findEditor();

    expect(match?.tier).toBe('tier1-aria');
    expect(match?.lowConfidence).toBe(false);
  });

  it('reports tier2-data metadata without SELECTOR_LOW_CONFIDENCE', () => {
    const el = document.querySelector('[role="textbox"][aria-label*="Message"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');

    const testing = getDiscordTesting();
    expect(testing).toBeDefined();
    const match = testing!.findEditor();

    expect(match?.tier).toBe('tier2-data');
    expect(match?.lowConfidence).toBe(false);
  });

  it('bounds the login probe plus fallback editor wait to the editor timeout budget', async () => {
    document.body.innerHTML = '<main></main>';
    (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM?.setURL(
      'https://discord.com/channels/123/456',
    );
    vi.useFakeTimers();
    const testing = getDiscordTesting();
    expect(testing).toBeDefined();

    try {
      let settled = false;
      const resultPromise = testing!.handleDispatch(dispatchPayload).then((result) => {
        settled = true;
        return result;
      });

      await vi.advanceTimersByTimeAsync(4999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      const result = await resultPromise;

      expect(result).toMatchObject({ ok: false, code: 'INPUT_NOT_FOUND', retriable: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns SELECTOR_LOW_CONFIDENCE and does not paste/send for tier3-class-fragment before confirmation', async () => {
    const el = document.querySelector('[role="textbox"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    el.removeAttribute('data-slate-editor');

    const pasteSpy = vi.fn().mockResolvedValue(true);
    const testing = getDiscordTesting();
    expect(testing).toBeDefined();
    testing!.setMainWorldPasteForTest(pasteSpy);

    const match = testing!.findEditor();
    expect(match?.tier).toBe('tier3-class-fragment');
    expect(match?.lowConfidence).toBe(true);

    const result = await testing!.handleDispatch(dispatchPayload);

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([{ code: 'SELECTOR_LOW_CONFIDENCE' }]);
    expect(pasteSpy).not.toHaveBeenCalled();
  });

  it('sends once for tier3-class-fragment with one-shot selectorConfirmation', async () => {
    const el = document.querySelector('[role="textbox"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    el.removeAttribute('data-slate-editor');

    const pasteSpy = vi.fn().mockResolvedValue(true);
    const testing = getDiscordTesting();
    expect(testing).toBeDefined();
    testing!.setMainWorldPasteForTest(pasteSpy);

    const result = await testing!.handleDispatch({
      ...dispatchPayload,
      dispatchId: '00000000-0000-4000-8000-000000000402',
      selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' },
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toBeUndefined();
    expect(pasteSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Discord paste injection (ADD-03, D-63)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixtureBody;
  });

  it('ClipboardEvent paste dispatches and carries text/plain data', () => {
    const editor = findEditor()!;
    let received = '';
    editor.addEventListener('paste', (e: Event) => {
      const ce = e as ClipboardEvent;
      received = ce.clipboardData?.getData('text/plain') ?? '';
    });

    pasteText(editor, 'hello');
    expect(received).toBe('hello');
  });

  it('paste event bubbles to parent', () => {
    const editor = findEditor()!;
    const parent = editor.parentElement!;
    let parentFired = false;
    parent.addEventListener('paste', () => {
      parentFired = true;
    });

    pasteText(editor, 'test');
    expect(parentFired).toBe(true);
  });
});

describe('Discord message list container (ADD-04, D-67)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixtureBody;
  });

  it('chat-messages container found by data-list-id', () => {
    const container = document.querySelector('[data-list-id^="chat-messages-"]');
    expect(container).not.toBeNull();
  });
});
