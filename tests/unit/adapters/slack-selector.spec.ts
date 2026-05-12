import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as slackContent from '@/entrypoints/slack.content';

// Load fixture and extract inner content (inside <body>)
const fixtureHtml = readFileSync(resolve(__dirname, 'slack.fixture.html'), 'utf-8');
const bodyMatch = fixtureHtml.match(/<body>([\s\S]*)<\/body>/);
const fixtureBody = bodyMatch?.[1]?.trim() ?? '';
type SelectorTier = 'tier1-aria' | 'tier2-data' | 'tier3-class-fragment';
type EditorMatch = { element: HTMLElement; tier: SelectorTier; lowConfidence: boolean };

function getSlackTesting() {
  return (
    slackContent as unknown as {
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
  dispatchId: '00000000-0000-4000-8000-000000000501',
  send_to: 'https://app.slack.com/client/workspace123/channel456',
  prompt: 'remember this',
  snapshot: {
    title: 'Title',
    url: 'https://example.com/',
    description: 'Desc',
    create_at: '2026-05-10T00:00:00.000Z',
    content: 'Body',
  },
};

// Three-tier Quill selector (mirrors slack.content.ts logic)
function findEditor(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('.ql-editor[role="textbox"][contenteditable="true"]') ??
    document.querySelector<HTMLElement>('.ql-editor[contenteditable="true"]') ??
    document.querySelector<HTMLElement>('#msg_input [contenteditable="true"]')
  );
}

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

describe('Slack selector fallback (SLK-03)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixtureBody;
  });

  it('tier-1: finds editor via .ql-editor + role=textbox', () => {
    const editor = findEditor();
    expect(editor).not.toBeNull();
    expect(editor!.classList.contains('ql-editor')).toBe(true);
    expect(editor!.getAttribute('role')).toBe('textbox');
  });

  it('tier-2: falls back to .ql-editor + contenteditable when role removed', () => {
    const el = document.querySelector('.ql-editor[role="textbox"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');

    const editor = findEditor();
    expect(editor).not.toBeNull();
    expect(editor!.classList.contains('ql-editor')).toBe(true);
    expect(editor!.getAttribute('contenteditable')).toBe('true');
  });

  it('tier-3: falls back to #msg_input [contenteditable] when ql-editor class removed', () => {
    const el = document.querySelector('.ql-editor')!;
    el.className = '';

    const editor = findEditor();
    expect(editor).not.toBeNull();
    expect(editor!.getAttribute('contenteditable')).toBe('true');
  });

  it('returns null when all selectors fail', () => {
    const el = document.querySelector('#msg_input .ql-editor')!;
    el.className = '';
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    el.removeAttribute('contenteditable');

    const editor = findEditor();
    expect(editor).toBeNull();
  });
});

describe('Slack selector confidence warnings (DSPT-04)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixtureBody;
    (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM?.setURL(
      'https://app.slack.com/client/workspace123/channel456',
    );
    getSlackTesting()?.resetTestOverrides();
  });

  it('reports tier1-aria metadata without SELECTOR_LOW_CONFIDENCE', () => {
    const testing = getSlackTesting();
    expect(testing).toBeDefined();
    const match = testing!.findEditor();

    expect(match?.tier).toBe('tier1-aria');
    expect(match?.lowConfidence).toBe(false);
  });

  it('reports tier2-data metadata without SELECTOR_LOW_CONFIDENCE', () => {
    const el = document.querySelector('.ql-editor[role="textbox"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');

    const testing = getSlackTesting();
    expect(testing).toBeDefined();
    const match = testing!.findEditor();

    expect(match?.tier).toBe('tier2-data');
    expect(match?.lowConfidence).toBe(false);
  });

  it('bounds the login probe plus fallback editor wait to the editor timeout budget', async () => {
    document.body.innerHTML = '<main></main>';
    (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM?.setURL(
      'https://app.slack.com/client/workspace123/channel456',
    );
    vi.useFakeTimers();
    const testing = getSlackTesting();
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
    const el = document.querySelector('.ql-editor')!;
    el.className = '';

    const pasteSpy = vi.fn().mockResolvedValue(true);
    const testing = getSlackTesting();
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
    const el = document.querySelector('.ql-editor')!;
    el.className = '';

    const pasteSpy = vi.fn().mockResolvedValue(true);
    const testing = getSlackTesting();
    expect(testing).toBeDefined();
    testing!.setMainWorldPasteForTest(pasteSpy);

    const result = await testing!.handleDispatch({
      ...dispatchPayload,
      dispatchId: '00000000-0000-4000-8000-000000000502',
      selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' },
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toBeUndefined();
    expect(pasteSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Slack paste injection (SLK-03)', () => {
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

describe('Slack send confirmation (SLK-04)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixtureBody;
    (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM?.setURL(
      'https://app.slack.com/client/workspace123/channel456',
    );
    getSlackTesting()?.resetTestOverrides();
  });

  it('handleDispatch returns ok=true when MAIN world paste succeeds (editor clears)', async () => {
    const pasteSpy = vi.fn().mockImplementation(async (editor: HTMLElement, text: string) => {
      editor.textContent = text;
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise((r) => setTimeout(r, 10));
      editor.textContent = '';
      return true;
    });
    const testing = getSlackTesting();
    testing!.setMainWorldPasteForTest(pasteSpy);

    const result = await testing!.handleDispatch(dispatchPayload);
    expect(result.ok).toBe(true);
    expect(pasteSpy).toHaveBeenCalledTimes(1);
  });

  it('handleDispatch confirms send via editor textContent clear check', async () => {
    const editor = findEditor()!;
    const pasteSpy = vi.fn().mockImplementation(async (el: HTMLElement) => {
      el.textContent = 'injected text';
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      el.textContent = '';
      return true;
    });
    const testing = getSlackTesting();
    testing!.setMainWorldPasteForTest(pasteSpy);

    const result = await testing!.handleDispatch(dispatchPayload);
    expect(result.ok).toBe(true);
    expect(editor.textContent?.trim()).toBe('');
  });
});

describe('Slack login detection (SLK-02)', () => {
  beforeEach(() => {
    getSlackTesting()?.resetTestOverrides();
  });

  it('returns NOT_LOGGED_IN when login wall DOM is detected (email input)', async () => {
    document.body.innerHTML = '<input type="email" name="email" />';
    (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM?.setURL(
      'https://slack.com/check-login',
    );

    const testing = getSlackTesting();
    const result = await testing!.handleDispatch(dispatchPayload);

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_LOGGED_IN');
  });

  it('returns NOT_LOGGED_IN when login wall DOM is detected (signin class)', async () => {
    document.body.innerHTML = '<div class="signin-container">Sign in to Slack</div>';
    (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM?.setURL(
      'https://slack.com/signin',
    );

    const testing = getSlackTesting();
    const result = await testing!.handleDispatch(dispatchPayload);

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_LOGGED_IN');
  });

  it('returns NOT_LOGGED_IN when URL indicates logged-out path', async () => {
    document.body.innerHTML = '<main></main>';
    (window as Window & { happyDOM?: { setURL: (url: string) => void } }).happyDOM?.setURL(
      'https://app.slack.com/check-login',
    );

    const testing = getSlackTesting();
    const result = await testing!.handleDispatch(dispatchPayload);

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_LOGGED_IN');
  });
});
