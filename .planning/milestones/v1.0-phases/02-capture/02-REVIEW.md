---
phase: 02-capture
reviewed: 2026-04-30T09:16:58Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - background/capture-pipeline.ts
  - entrypoints/background.ts
  - entrypoints/extractor.content.ts
  - entrypoints/popup/App.tsx
  - entrypoints/popup/style.css
  - locales/en.yml
  - locales/zh_CN.yml
  - package.json
  - playwright.config.ts
  - shared/messaging/index.ts
  - shared/messaging/protocol.ts
  - shared/messaging/result.ts
  - tests/e2e/capture.spec.ts
  - tests/e2e/fixtures/article.html
  - tests/unit/extractor/description-fallback.spec.ts
  - tests/unit/extractor/markdown-roundtrip.spec.ts
  - tests/unit/extractor/sanitize.spec.ts
  - tests/unit/messaging/capture.spec.ts
  - tests/unit/messaging/errorCode.spec.ts
  - types/turndown-plugin-gfm.d.ts
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-04-30T09:16:58Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 2 capture pipeline (popup → SW → extractor → ArticleSnapshot) is structurally sound: SW listener registration is sync at module top, DOMPurify precedes Turndown (D-20), Readability receives `document.cloneNode(true)` (D-14), all popup copy uses `t()` (FND-06/D-12), and `safeParse` keeps validation failures inside the `Result` channel (D-15). i18n keys are at parity between `en.yml` and `zh_CN.yml`.

However, two BLOCKER bugs sit on the user-visible failure path:

1. **App.tsx loses transport rejections** — `sendMessage` rejections in the popup IIFE are unhandled; the UI sticks on the loading skeleton forever. This breaks the "stuck-loading is impossible" guarantee implied by the 4-state machine and the loading→error transition shown in UI-SPEC.
2. **`runCapturePipeline` Ok-with-empty-content slipthrough** — when Readability returns `null` but `document.title` is non-empty, the pipeline returns Ok with `content: ''`. The popup then renders the success view with a blank content textarea and no error indication. The "EXTRACTION_EMPTY iff `!content && !title`" guard is too lax — the design intent (D-17) is "no recognisable article", which a non-null title with zero content also represents.

Six warnings cover service-worker tab targeting, type-safety holes in `wrapHandler`, an unused `executeScript` empty-result branch, the test-mirror divergence from real implementation, and a few missing-coverage items.

## Critical Issues

### CR-01: popup IIFE silently swallows `sendMessage` rejections — UI stuck on loading

**File:** `entrypoints/popup/App.tsx:44-61`
**Issue:** The capture-on-mount IIFE calls `await sendMessage('capture.run')` with no `try/catch`. `@webext-core/messaging`'s `sendMessage` rejects (throws) when the SW is unreachable, suspended without a wake reason, or returns an unrecognised payload — common transient failures in MV3 (e.g. SW just terminated, racey first-open). When the promise rejects, neither `snapshotSig` nor `errorSig` is updated, so `App` keeps rendering `<LoadingSkeleton />` indefinitely. There is no retry button in the loading state, and the rejection becomes an unhandled promise rejection (visible only in DevTools).

This violates the implicit Phase 2 state-machine contract that loading must always transition to one of {success, empty, error} within finite time. From the user's POV this is indistinguishable from a hang.

**Fix:**
```tsx
useEffect(() => {
  let cancelled = false;
  void (async () => {
    try {
      const result = await sendMessage('capture.run');
      if (cancelled) return;
      if (result.ok) {
        snapshotSig.value = result.data;
        titleSig.value = result.data.title;
        descriptionSig.value = result.data.description;
        contentSig.value = result.data.content;
      } else {
        errorSig.value = { code: result.code, message: result.message };
      }
    } catch (err) {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : String(err);
      errorSig.value = { code: 'INTERNAL', message };
    }
  })();
  return () => { cancelled = true; };
}, []);
```

### CR-02: `runCapturePipeline` returns Ok with empty content when Readability fails but `<title>` exists

**File:** `background/capture-pipeline.ts:80-101` (in conjunction with `entrypoints/extractor.content.ts:64-83`)
**Issue:** Step 6 only reports `EXTRACTION_EMPTY` when **both** `content` AND `title` are empty (line 82). But `extractor.content.ts:69` falls back to `document.title` for the title field unconditionally:
```ts
const title = article?.title?.trim() || document.title.trim();
```
On many pages where Readability cannot extract a meaningful article (login walls, SPAs that haven't loaded their main content, search-result pages), `article` is `null` → `content === ''` but `title` falls back to whatever is in `<title>` (often non-empty). Result: `!partial.content && !partial.title` is `false`, the snapshot validates (zod allows `content: z.string()` of any length, including empty), and the popup renders SuccessView with an empty content textarea. The user sees "everything looks fine" but has nothing to deliver.

`ArticleSnapshotSchema.safeParse` cannot catch this because it allows `content: ""`. Per D-17 the intent is "no recognisable article body" — content emptiness alone should trigger the empty state.

**Fix (capture-pipeline.ts step 6):**
```ts
// Empty content check (D-17): an article with no body is not deliverable,
// regardless of whether <title> happens to be set.
if (!partial.content) {
  return Err('EXTRACTION_EMPTY', 'Readability returned empty content', false);
}
```
Update the unit test in `tests/unit/messaging/capture.spec.ts:124` to match (the case "title=='', content=='' → EXTRACTION_EMPTY" still passes; add a new case "title=='X', content=='' → EXTRACTION_EMPTY"). Alternatively, if the intent really is "title is enough to deliver", document this explicitly and ensure the popup gates the dispatch button on non-empty content.

## Warnings

### WR-01: `tabs.query({ lastFocusedWindow: true })` is wrong primitive for popup-triggered capture

**File:** `background/capture-pipeline.ts:40`
**Issue:** When a user opens the popup, the popup's hosting window becomes (briefly) the focused window in some Chrome versions. `lastFocusedWindow: true` then resolves to the popup's own window, and `active: true` may match the popup tab — exactly the failure path test 3 in `tests/e2e/capture.spec.ts:115-134` exercises (it deliberately captures the popup itself to trigger RESTRICTED_URL). For a real user, this is a regression: instead of capturing the underlying page they were viewing, the pipeline reports RESTRICTED_URL and shows the empty state.

The MV3-canonical primitive for "the tab the user was looking at when they invoked the action" is `chrome.tabs.query({ active: true, currentWindow: true })` from a content/background context where `currentWindow` is bound to the user's normal browsing window. Even better: capture the tab id from `chrome.action.onClicked` if you ever move off `default_popup`.

Today the e2e test at `capture.spec.ts:32` works around this with explicit `articlePage.bringToFront()` + pre-creation choreography (lines 17-27 of that file's docstring describe the contortion). That choreography is a smell — it's making the test pass for the wrong reason. In production users won't do that bringToFront dance.

**Fix:** Replace `lastFocusedWindow: true` with `currentWindow: true`, then validate against a real Chrome popup (not just Playwright's persistent context). Update the e2e tests to drop the bringToFront dance once the primitive is correct.

### WR-02: `wrapHandler` `as R` cast bypasses Result-shape guarantee

**File:** `entrypoints/background.ts:35-45`
**Issue:** `wrapHandler<R>` is generic over any return type `R`, then on the catch branch returns `Err('INTERNAL', message, false) as R`. If a future handler is registered whose return type is something other than `Result<T>` (e.g. a route added without realising the convention), the cast silently produces malformed data at runtime and TypeScript will not flag it. The constraint "every handler resolves to `Result<T>`" lives only in code-review folklore, not in the type system.

**Fix:**
```ts
function wrapHandler<T>(fn: () => Promise<Result<T>>): () => Promise<Result<T>> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[bg] handler threw — converting to Err(INTERNAL):', err);
      return Err('INTERNAL', message, false);
    }
  };
}
```
This forces every wrapped handler to actually return a `Result<T>` and removes the unsafe cast.

### WR-03: `results[0]?.result as ExtractorPartial` cast lets malformed payloads through to safeParse

**File:** `background/capture-pipeline.ts:75-78`
**Issue:** The `as ExtractorPartial | undefined` cast at line 75 unsafely tells TypeScript "this is the right shape". If the extractor crashed mid-execution and returned `{ title: 'X' }` (missing `content` and `description`), the truthiness check at line 76 (`if (!partial)`) passes — `partial` is a non-null object — and we reach the empty-content check at line 82. There, `partial.content` is `undefined`, `!partial.content` is true, but `!partial.title` is false → we fall through to step 7. `ArticleSnapshotSchema.safeParse({title:'X', url, description: undefined, ...})` then fails because `description` is required, and we return `Err('INTERNAL', 'Invalid snapshot: ...')`. That works, but the user gets a confusing INTERNAL error for what is really a malformed extractor result; the `'EXECUTE_SCRIPT_FAILED'` channel exists exactly for this.

**Fix:** Validate the extractor return at the point of unwrap, with a small zod schema or hand-rolled type guard:
```ts
const partialRaw = results[0]?.result;
const partialParse = z.object({
  title: z.string(),
  description: z.string(),
  content: z.string(),
}).safeParse(partialRaw);
if (!partialParse.success) {
  return Err('EXECUTE_SCRIPT_FAILED', `Malformed extractor result: ${partialParse.error.message}`, true);
}
const partial = partialParse.data;
```

### WR-04: `capture.spec.ts` mirror function diverges from production — no coverage of `safeParse` failure branch

**File:** `tests/unit/messaging/capture.spec.ts:40-84`
**Issue:** `capturePipelineCore` is a hand-maintained mirror of `runCapturePipeline`. The mirror skips Step 7's `ArticleSnapshotSchema.safeParse` entirely (line 77 returns `Ok({...})` directly), so:
- The "Invalid snapshot → Err('INTERNAL', 'Invalid snapshot: ...')" branch in `capture-pipeline.ts:97-99` is uncovered by tests.
- Future drift between mirror and real implementation cannot be detected at test time.
- The maintainer-note comment at lines 14-16 acknowledges this is a known footgun.

The original justification ("chrome.scripting needs careful mocking") is weaker than it sounds — `chrome.scripting.executeScript` is straightforward to stub via `vi.stubGlobal('chrome', {...})` or `fakeBrowser` (which is already imported at line 21 but never used).

**Fix:** Add at least one test that exercises `runCapturePipeline` directly with a stubbed `chrome.tabs.query`, `chrome.scripting.executeScript`, asserting the safeParse-failure branch returns `Err('INTERNAL', /^Invalid snapshot:/, false)`. Then the mirror can stay for the broader branch matrix.

### WR-05: `description` field in ArticleSnapshot is unbounded — Markdown can grow without limit

**File:** `shared/messaging/protocol.ts:8-14`, `entrypoints/extractor.content.ts:43-60`
**Issue:** None of `title`, `description`, or `content` have a `.max()` constraint. A page with a multi-megabyte `<meta name="description">` (rare, but possible) or a 50-page article would produce a Markdown payload large enough to (a) hit chrome.scripting.executeScript's structuredClone limits and (b) make the popup's textareas unresponsive. The downstream Phase 3 dispatch pipeline will also have to clamp this — solving it once at the schema layer is cheaper.

**Fix:** Pick conservative caps and add to the schema:
```ts
export const ArticleSnapshotSchema = z.object({
  title:       z.string().max(500),
  url:         z.string().url().max(2048),
  description: z.string().max(2000),
  create_at:   z.string().datetime(),
  content:     z.string().max(200_000), // ~200KB Markdown — still room for very long articles
});
```
The pipeline will then return `Err('INTERNAL', 'Invalid snapshot: ...')` for oversize pages, which is recoverable; today it returns a snapshot the popup cannot meaningfully render.

### WR-06: `inconsistent` `defineContentScript` global vs. `defineBackground` import

**File:** `entrypoints/extractor.content.ts:62` vs `entrypoints/background.ts:1`
**Issue:** `background.ts` explicitly imports `defineBackground` from `#imports` (and the comment at lines 24-26 makes a point of it). `extractor.content.ts` uses `defineContentScript` as a free global with no import — relying on WXT's auto-imports. Both work today on WXT 0.20.25, but the inconsistency makes the codebase harder to audit (readers can't tell at a glance which globals are WXT-injected) and silently couples the build to WXT's auto-import config.

**Fix:** Pick one convention. Recommended: explicit `import { defineContentScript } from '#imports';` at the top of `extractor.content.ts` to match `background.ts`.

## Info

### IN-01: `result.ts` has duplicated/stale ErrorCode comment block

**File:** `shared/messaging/result.ts:14-22`
**Issue:** The phase-by-phase ErrorCode roadmap is documented twice — once at lines 1-12 (as the file-level docstring) and again at lines 14-17 (as inline comments above the type alias). The two listings agree, but the duplication is comment garbage that will rot at the next ErrorCode addition.
**Fix:** Delete lines 14-17; keep only the docstring. The type itself at lines 18-22 is self-documenting.

### IN-02: `world: 'ISOLATED'` comment "default, explicit for clarity" is misleading

**File:** `background/capture-pipeline.ts:68`
**Issue:** `world` defaults to `'ISOLATED'` only on Chrome 95+; explicit-for-clarity is fine, but the comment glosses over the fact that omitting `world` historically picked up the page's MAIN world on some Chrome versions. The rationale is actually defense-in-depth ("don't share globals with the page"), which deserves a one-line note for the next reader.
**Fix:** Replace the `// default, explicit for clarity` comment with `// ISOLATED world — extractor must not see page-script globals (defense in depth)`.

### IN-03: `turndown-plugin-gfm.d.ts` uses `any` for the `service` parameter

**File:** `types/turndown-plugin-gfm.d.ts:1-7`
**Issue:** All four exports type the parameter as `any`, which disables type-checking inside any code that touches a TurndownService instance via these helpers. For a 3rd-party shim that's acceptable, but it would be one-line cheap to type as `import('turndown')` instead.
**Fix:**
```ts
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';
  export function gfm(service: TurndownService): void;
  export function tables(service: TurndownService): void;
  export function strikethrough(service: TurndownService): void;
  export function taskListItems(service: TurndownService): void;
}
```

### IN-04: `extractor.content.ts` re-creates `TurndownService` on every invocation

**File:** `entrypoints/extractor.content.ts:78-80`
**Issue:** Each `executeScript` call constructs a fresh `TurndownService` and re-applies the gfm plugin. For a single-shot capture this is fine; the cost is tens of milliseconds of plugin registration. Worth noting only because the comment block at the top references "performance" implicitly via the 2-second budget. If the budget is ever tightened, this is a cheap optimisation (move construction to module scope).
**Fix (optional):**
```ts
const td = new TurndownService();
td.use(gfm);

export default defineContentScript({
  registration: 'runtime',
  main(): ExtractorPartial {
    // ...
    const content = td.turndown(cleanHtml);
    // ...
  },
});
```
Note: module-scope state is fine here because each `executeScript` injection runs in a fresh isolated world.

---

_Reviewed: 2026-04-30T09:16:58Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
