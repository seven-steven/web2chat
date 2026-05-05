import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load fixture and extract inner content (inside <body>)
const fixtureHtml = readFileSync(
  resolve(__dirname, 'discord.fixture.html'),
  'utf-8',
);
const bodyMatch = fixtureHtml.match(/<body>([\s\S]*)<\/body>/);
const fixtureBody = bodyMatch ? bodyMatch[1].trim() : '';

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
