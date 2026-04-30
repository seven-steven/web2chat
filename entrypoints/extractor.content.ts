/**
 * Extractor content script (CAP-02, D-13..D-20).
 *
 * WXT registration: 'runtime' — this script is NOT listed in manifest
 * content_scripts. It is bundled to content-scripts/extractor.js and
 * injected on-demand by the SW via:
 *   chrome.scripting.executeScript({ files: ['content-scripts/extractor.js'] })
 *
 * The return value of main() flows back to the SW through the executeScript
 * result channel (structuredClone, all fields are strings — serialisation safe).
 *
 * Pipeline (D-18, D-20):
 *   document.cloneNode(true) → Readability(clone).parse()
 *     → DOMPurify.sanitize(article.content)   ← must precede Turndown
 *     → TurndownService + gfm                 ← HTML → Markdown
 *
 * Security (D-14, D-20):
 *   - Readability MUST receive a clone — parse() mutates the DOM
 *   - DOMPurify uses default profile — no ALLOWED_TAGS relaxation
 *   - popup never calls innerHTML on the returned Markdown (PITFALLS §安全错误 #1)
 */

import { defineContentScript } from '#imports';
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/** Fields produced by the extractor; SW adds url + create_at to form ArticleSnapshot. */
export interface ExtractorPartial {
  title: string;
  description: string;
  content: string;
}

/**
 * Resolve description via 3-stage fallback (CAP-03, PATTERNS.md Pattern 2):
 *   1. <meta name="description">
 *   2. <meta property="og:description">
 *   3. Readability excerpt
 *
 * Uses the original document (not the clone) as a defensive measure.
 */
export function getDescription(doc: Document, article: ReturnType<Readability['parse']>): string {
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  if (metaDesc) return metaDesc;

  const ogDesc = doc
    .querySelector('meta[property="og:description"]')
    ?.getAttribute('content')
    ?.trim();
  if (ogDesc) return ogDesc;

  return article?.excerpt?.trim() ?? '';
}

export default defineContentScript({
  registration: 'runtime',
  main(): ExtractorPartial {
    // D-14: MUST pass clone — Readability.parse() mutates the DOM tree
    const clone = document.cloneNode(true) as Document;
    const article = new Readability(clone).parse();

    const title = article?.title?.trim() || document.title.trim();

    // D-20: description uses original document (meta may be stripped from clone)
    const description = getDescription(document, article);

    // D-18, D-20: sanitize before Turndown — order is mandatory
    const rawHtml = article?.content ?? '';
    const cleanHtml = DOMPurify.sanitize(rawHtml);

    const td = new TurndownService();
    td.use(gfm);
    const content = td.turndown(cleanHtml);

    return { title, description, content };
  },
});
