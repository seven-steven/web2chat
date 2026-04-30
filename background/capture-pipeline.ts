/**
 * Capture pipeline — SW-side orchestration (CAP-01..CAP-04, D-15..D-17).
 *
 * Invoked by entrypoints/background.ts via the onMessage('capture.run') handler.
 * Never call chrome.scripting.executeScript from popup — only SW has the
 * scripting permission (CLAUDE.md §架构).
 *
 * Pipeline sequence (D-16, D-17, CAP-04):
 *   1. chrome.tabs.query → get active tab id + url
 *   2. URL scheme precheck → Err('RESTRICTED_URL') if not http/https
 *   3. create_at = new Date().toISOString()  ← by SW, not page (CAP-04)
 *   4. chrome.scripting.executeScript({ files: ['content-scripts/extractor.js'] })
 *   5. Unwrap results[0].result → ExtractorPartial
 *   6. Empty-content check → Err('EXTRACTION_EMPTY')
 *   7. Assemble ArticleSnapshot → ArticleSnapshotSchema.safeParse() → Ok(snapshot)
 *
 * Step 7 calls ArticleSnapshotSchema.safeParse() to validate all 5 fields before
 * returning Ok. This catches any extractor bugs (e.g. missing url field) at the
 * SW layer rather than letting invalid data silently reach the popup.
 * Note: @webext-core/messaging also validates via schemas.output on the RPC
 * boundary, so this is defense-in-depth, not redundant.
 */

import { Ok, Err, type Result, ArticleSnapshotSchema } from '@/shared/messaging';
import type { ArticleSnapshot } from '@/shared/messaging';

/**
 * Fields returned by entrypoints/extractor.content.ts main() via executeScript.
 * Defined here (not imported from extractor.content.ts) so the content-script
 * bundle is not accidentally pulled into the SW bundle by the bundler.
 */
interface ExtractorPartial {
  title: string;
  description: string;
  content: string;
}

export async function runCapturePipeline(): Promise<Result<ArticleSnapshot>> {
  // Step 1: Get the currently active tab
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url) {
    return Err('INTERNAL', 'No active tab found', false);
  }

  // Step 2: URL scheme precheck (D-16)
  // chrome:// / file:// / about: / devtools: etc. → immediate Err, no executeScript
  let scheme: string;
  try {
    scheme = new URL(tab.url).protocol.replace(':', '');
  } catch {
    return Err('INTERNAL', `Malformed tab URL: ${tab.url}`, false);
  }
  if (scheme !== 'http' && scheme !== 'https') {
    return Err('RESTRICTED_URL', tab.url, false);
  }

  // Step 3: create_at is set by SW at click time, not derived from page (CAP-04)
  const create_at = new Date().toISOString();
  const url = tab.url;

  // Step 4: Inject extractor bundle (built from entrypoints/extractor.content.ts)
  // Path 'content-scripts/extractor.js' is the WXT build output path (RESEARCH.md Pattern 1).
  let results: chrome.scripting.InjectionResult[];
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-scripts/extractor.js'],
      world: 'ISOLATED', // default, explicit for clarity
    });
  } catch (err) {
    return Err('EXECUTE_SCRIPT_FAILED', String(err), true);
  }

  // Step 5: Unwrap return value from extractor's main()
  const partial = results[0]?.result as ExtractorPartial | undefined;
  if (!partial) {
    return Err('EXECUTE_SCRIPT_FAILED', 'Extractor returned no result', true);
  }

  // Step 6: Empty content check (D-17)
  // An article with no body is not deliverable, regardless of whether
  // <title> happens to be set — extractor.content.ts falls back to
  // document.title unconditionally, so a non-empty title alone does not
  // imply Readability found a recognisable article.
  if (!partial.content) {
    return Err('EXTRACTION_EMPTY', 'Readability returned empty content', false);
  }

  // Step 7: Assemble and validate full ArticleSnapshot (CAP-03, CAP-04)
  // safeParse keeps validation failures inside the Result channel rather than
  // falling through to wrapHandler's generic catch — the resulting Err is
  // explicitly attributable to snapshot assembly, easing diagnosis.
  const parseResult = ArticleSnapshotSchema.safeParse({
    title: partial.title,
    url,
    description: partial.description,
    create_at,
    content: partial.content,
  });
  if (!parseResult.success) {
    return Err('INTERNAL', `Invalid snapshot: ${parseResult.error.message}`, false);
  }

  return Ok(parseResult.data);
}
