// @vitest-environment jsdom
/**
 * Unit tests for getDescription() in entrypoints/extractor.content.ts (CAP-03).
 *
 * Uses jsdom environment (not the project default happy-dom) because:
 *   - getDescription queries real DOM meta elements
 *   - DOMPurify (used in sibling tests) requires jsdom for security correctness
 *
 * Mirror pattern: getDescription is exported from extractor.content.ts for
 * testability — the export is test-only, not consumed by any other module.
 */
import { describe, it, expect } from 'vitest';
import { getDescription } from '@/entrypoints/extractor.content';

function makeDoc(headHtml: string): Document {
  const doc = document.implementation.createHTMLDocument('test');
  doc.head.innerHTML = headHtml;
  return doc;
}

describe('getDescription — fallback chain (CAP-03)', () => {
  it('returns meta[name="description"] when present', () => {
    const doc = makeDoc('<meta name="description" content="  primary desc  ">');
    expect(getDescription(doc, null)).toBe('primary desc');
  });

  it('falls back to og:description when meta name=description is absent', () => {
    const doc = makeDoc('<meta property="og:description" content="og-value">');
    expect(getDescription(doc, null)).toBe('og-value');
  });

  it('falls back to Readability excerpt when both meta tags absent', () => {
    const doc = makeDoc('');
    const fakeArticle = { excerpt: '  readability-excerpt  ' } as Parameters<
      typeof getDescription
    >[1];
    expect(getDescription(doc, fakeArticle)).toBe('readability-excerpt');
  });

  it('returns empty string when all sources absent', () => {
    const doc = makeDoc('');
    expect(getDescription(doc, null)).toBe('');
  });
});
