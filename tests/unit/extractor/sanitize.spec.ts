// @vitest-environment jsdom
/**
 * Unit tests for DOMPurify + Turndown sanitization in the extractor pipeline.
 *
 * CRITICAL: Must use jsdom — DOMPurify explicitly states happy-dom is unsafe
 * (RESEARCH.md Pitfall 1 / npm dompurify docs).
 *
 * These tests do NOT import extractor.content.ts directly (it uses
 * defineContentScript which is a WXT global not available in jsdom).
 * Instead we test the library combination inline — same logic as extractor.
 */
import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

function extractContent(rawHtml: string): string {
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  const td = new TurndownService();
  td.use(gfm);
  return td.turndown(cleanHtml);
}

describe('DOMPurify + Turndown sanitization (CAP-02, D-20)', () => {
  it('strips <script> tags — no XSS payload in Markdown output', () => {
    const rawHtml = '<p>Hello</p><script>alert(1)</script><p>World</p>';
    const markdown = extractContent(rawHtml);
    expect(markdown).not.toContain('<script>');
    expect(markdown).not.toContain('alert(1)');
    expect(markdown).toContain('Hello');
    expect(markdown).toContain('World');
  });

  it('preserves normal paragraph content', () => {
    const rawHtml = '<p>Normal paragraph with <strong>bold</strong> text.</p>';
    const markdown = extractContent(rawHtml);
    expect(markdown).toContain('Normal paragraph');
    expect(markdown).not.toContain('<script>');
    expect(markdown).not.toContain('<p>');
  });
});
