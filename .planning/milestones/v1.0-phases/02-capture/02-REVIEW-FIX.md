---
phase: 02-capture
fixed_at: 2026-04-30T17:30:00Z
review_path: .planning/phases/02-capture/02-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-04-30T17:30:00Z
**Source review:** `.planning/phases/02-capture/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 8
- Fixed: 8
- Skipped: 0

Final verification: `pnpm typecheck` clean, 42/42 unit tests pass, `pnpm lint` 0 errors (4 pre-existing warnings in `types/turndown-plugin-gfm.d.ts` are tracked by IN-03, out of scope for this iteration).

## Fixed Issues

### CR-01: popup IIFE silently swallows `sendMessage` rejections — UI stuck on loading

**Files modified:** `entrypoints/popup/App.tsx`
**Commit:** `6de98bb`
**Applied fix:** Wrapped the capture-on-mount `sendMessage('capture.run')` call in `try/catch`. On rejection, set `errorSig` to `{ code: 'INTERNAL', message }` so the UI transitions to the error state instead of remaining on the loading skeleton. The cancelled-flag pattern is preserved on both happy and catch paths.

### CR-02: `runCapturePipeline` returns Ok with empty content when Readability fails but `<title>` exists

**Files modified:** `background/capture-pipeline.ts`, `tests/unit/messaging/capture.spec.ts`
**Commit:** `42007a5`
**Applied fix:** Tightened step 6's empty-content guard from `!partial.content && !partial.title` to `!partial.content`. Mirrored the change in the test mirror function. Added a regression unit test (`title='Login Wall'`, `content=''` → `EXTRACTION_EMPTY`) so login walls / unloaded SPAs / search-result pages surface in the popup's empty state instead of a SuccessView with a blank textarea.

### WR-01: `tabs.query({ lastFocusedWindow: true })` is wrong primitive for popup-triggered capture

**Files modified:** `background/capture-pipeline.ts`
**Commit:** `9fd7098`
**Applied fix:** Replaced `lastFocusedWindow: true` with `currentWindow: true`. Added a comment explaining the MV3 rationale. Note: the e2e test choreography (`articlePage.bringToFront()`) is left as-is — the review noted the choreography is a smell that can be cleaned up after validating the new primitive in a real Chrome popup; that validation is out of scope for this fix iteration.

### WR-02: `wrapHandler` `as R` cast bypasses Result-shape guarantee

**Files modified:** `entrypoints/background.ts`
**Commit:** `248367b`
**Applied fix:** Constrained the generic from `<R>` to `<T>` and changed the signature to `(fn: () => Promise<Result<T>>) => () => Promise<Result<T>>`. The catch branch now returns `Err('INTERNAL', message, false)` directly without an unsafe cast. Imported `type Result` from `@/shared/messaging`. The existing single registered handler (`runCapturePipeline`) continues to compile because it already returns `Promise<Result<ArticleSnapshot>>`.

### WR-03: `results[0]?.result as ExtractorPartial` cast lets malformed payloads through

**Files modified:** `background/capture-pipeline.ts`
**Commit:** `7986f0d`
**Applied fix:** Replaced the `interface ExtractorPartial` + unsafe cast with a `z.object({ title, description, content })` schema. The unwrap step now `safeParse`s the extractor result; on failure it returns `Err('EXECUTE_SCRIPT_FAILED', 'Malformed extractor result: ...', true)` — the semantic channel for malformed extractor output — instead of leaking through to a confusing `'Invalid snapshot: ...'` `INTERNAL` error in step 7.

### WR-04: `capture.spec.ts` mirror function diverges from production — no coverage of `safeParse` failure branch

**Files modified:** `tests/unit/messaging/capture.spec.ts`
**Commit:** `fefcf5e`
**Applied fix:** Added a second `describe` block ("runCapturePipeline (direct, WR-04)") that imports the real `runCapturePipeline` and uses `vi.stubGlobal('chrome', ...)` to fake `chrome.tabs.query` and `chrome.scripting.executeScript`. Five new tests cover:
- Malformed extractor result → `EXECUTE_SCRIPT_FAILED` with `/^Malformed extractor result:/` (also pins WR-03)
- Empty extractor result → `EXECUTE_SCRIPT_FAILED`
- safeParse failure of assembled snapshot (forced via stubbing `Date.prototype.toISOString` to return junk) → `INTERNAL` with `/^Invalid snapshot:/`
- `executeScript` rejection → `EXECUTE_SCRIPT_FAILED` retriable=true
- End-to-end `Ok(snapshot)` flow

The mirror function stays for the broader branch matrix; the direct tests detect mirror/implementation drift at test time.

### WR-05: `description` field in ArticleSnapshot is unbounded — Markdown can grow without limit

**Files modified:** `shared/messaging/protocol.ts`
**Commit:** `f3f66d3`
**Applied fix:** Added `.max()` constraints to `ArticleSnapshotSchema`:
- `title`: 500 chars
- `url`: 2048 chars (already has `.url()`)
- `description`: 2000 chars
- `content`: 200_000 chars (~200KB Markdown)

`create_at` keeps only `.datetime()` since it's bounded by the ISO format. Oversize pages now surface as `Err('INTERNAL', 'Invalid snapshot: ...')` — recoverable for the user — instead of a snapshot the popup cannot render.

### WR-06: inconsistent `defineContentScript` global vs. `defineBackground` import

**Files modified:** `entrypoints/extractor.content.ts`
**Commit:** `8e2f40e`
**Applied fix:** Added explicit `import { defineContentScript } from '#imports';` at the top of `extractor.content.ts` to match the convention already used by `entrypoints/background.ts`. Readers can now tell at a glance that `defineContentScript` is WXT-injected, and the build no longer silently couples to WXT's auto-import config.

## Skipped Issues

None — all 8 in-scope findings were fixed.

## Out-of-scope (Info findings, not addressed this iteration)

- **IN-01**: duplicate ErrorCode comment block in `result.ts:14-22`
- **IN-02**: misleading "default, explicit for clarity" comment on `world: 'ISOLATED'`
- **IN-03**: `turndown-plugin-gfm.d.ts` uses `any` (4 lint warnings remain visible)
- **IN-04**: extractor re-creates `TurndownService` on every invocation (optional perf opt)

These are documentation / style nits; safe to defer to a future cleanup pass.

---

_Fixed: 2026-04-30T17:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
