// @vitest-environment jsdom
/**
 * Unit tests for HTML → Markdown roundtrip via Turndown + GFM (CAP-02, D-18).
 *
 * Verifies that Readability's structured HTML (headings, code blocks, links)
 * is preserved as recognizable Markdown after the sanitize→turndown pipeline.
 *
 * Uses jsdom because DOMPurify (part of the pipeline) requires it.
 */
import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

function htmlToMarkdown(rawHtml: string): string {
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  // headingStyle: 'atx' → "# Heading" instead of Turndown default setext "Heading\n====="
  // codeBlockStyle: 'fenced' → ```...``` instead of 4-space indent
  // These options are the recognised-as-Markdown form expected by Phase 2 success
  // criteria #2 ("Markdown roundtrip preserves headings, code blocks, links").
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  td.use(gfm);
  return td.turndown(cleanHtml);
}

describe('Markdown roundtrip — structural elements preserved (CAP-02)', () => {
  it('converts <h1> to # heading', () => {
    const md = htmlToMarkdown('<h1>Main Title</h1>');
    expect(md).toMatch(/^# Main Title/m);
  });

  it('converts <h2> to ## heading', () => {
    const md = htmlToMarkdown('<h2>Sub Section</h2>');
    expect(md).toMatch(/^## Sub Section/m);
  });

  it('converts <pre><code> to fenced code block (GFM)', () => {
    const md = htmlToMarkdown('<pre><code class="language-ts">const x = 1;</code></pre>');
    expect(md).toContain('```');
    expect(md).toContain('const x = 1;');
  });

  it('converts <a href> to [text](url) Markdown link', () => {
    const md = htmlToMarkdown('<a href="https://example.com">link text</a>');
    expect(md).toContain('[link text](https://example.com)');
  });
});
