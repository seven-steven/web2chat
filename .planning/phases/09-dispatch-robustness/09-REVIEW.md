---
phase: 09-dispatch-robustness
reviewed: 2026-05-10T19:10:00Z
depth: deep
files_reviewed: 21
files_reviewed_list:
  - background/dispatch-pipeline.ts
  - entrypoints/discord.content.ts
  - entrypoints/popup/App.tsx
  - entrypoints/popup/components/ErrorBanner.tsx
  - entrypoints/popup/components/SelectorWarningDialog.tsx
  - entrypoints/popup/components/SendForm.tsx
  - locales/en.yml
  - locales/zh_CN.yml
  - shared/adapters/dispatch-policy.ts
  - shared/adapters/registry.ts
  - shared/adapters/types.ts
  - shared/messaging/index.ts
  - shared/messaging/routes/dispatch.ts
  - shared/storage/repos/dispatch.ts
  - tests/unit/adapters/discord-selector.spec.ts
  - tests/unit/dispatch/adapter-response-timeout.spec.ts
  - tests/unit/dispatch/dispatch-timeout.spec.ts
  - tests/unit/dispatch/logged-out-paths.spec.ts
  - tests/unit/dispatch/login-detection.spec.ts
  - tests/unit/dispatch/selector-warning.spec.ts
  - tests/unit/dispatch/timeout-config.spec.ts
  - tests/unit/popup/retry-retriable.spec.tsx
  - tests/unit/popup/selector-warning-dialog.spec.tsx
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-10T19:10:00Z
**Depth:** deep
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Reviewed 21 source and test files for the dispatch robustness phase. The implementation adds adapter response timeouts, login detection heuristics, selector confidence warnings, and retry/retriable UI flows. One race condition in the pipeline was identified where concurrent tab-complete and SPA history events can cause duplicate adapter dispatches. Several other warnings involve test gaps and defensive edge cases.

## Critical Issues

### CR-01: Race condition in `advanceDispatchForTab` -- duplicate adapter injection on concurrent events

**File:** `background/dispatch-pipeline.ts:420-452`
**Issue:** `advanceDispatchForTab` reads `dispatchRepo.listAll()` and filters for `state === 'awaiting_complete'`, then calls `advanceToAdapterInjection` which transitions to `awaiting_adapter`. If `onTabComplete` and `onSpaHistoryStateUpdated` fire in rapid succession for the same tab (both async), each invocation independently reads the record as `awaiting_complete` before the other has written `awaiting_adapter`. This causes:
1. `chrome.scripting.executeScript` runs twice (second call is benign due to the `__web2chat_discord_registered` guard in the content script).
2. `chrome.tabs.sendMessage` runs twice. The registered listener responds to both, causing two `handleDispatch` calls on the same editor. The second call may paste the message text again (after the first already sent and cleared the editor), or hit the rate-limit check.

The root cause is the lack of a compare-and-swap or mutex between reading the record state and writing the new state. `dispatchRepo.set` is a simple `chrome.storage.session.set` with no atomicity guarantee.

**Fix:**
Add an early state check at the beginning of `advanceToAdapterInjection` to re-read and guard against stale state:

```typescript
async function advanceToAdapterInjection(
  record: DispatchRecord,
  scriptFile: string,
  adapterResponseTimeoutMs: number,
): Promise<void> {
  // CAS guard: re-read to ensure record hasn't been advanced by a concurrent call
  const fresh = await dispatchRepo.get(record.dispatchId);
  if (!fresh || fresh.state !== 'awaiting_complete') return;

  const updated: DispatchRecord = {
    ...fresh,
    state: 'awaiting_adapter',
    last_state_at: new Date().toISOString(),
  };
  await dispatchRepo.set(updated);
  // ... rest unchanged
}
```

Alternatively, add a similar guard at the top of `advanceDispatchForTab` after the `listAll()` loop filters candidates -- re-read each record individually before proceeding.

## Warnings

### WR-01: `waitForReady` + `waitForEditor` fallback creates cumulative timeout exceeding documented probe window

**File:** `entrypoints/discord.content.ts:288-301`
**Issue:** When the login-wall probe times out at `LOGIN_WALL_PROBE_MS` (1500ms) without finding either an editor or login wall, the code falls through to `waitForEditor(WAIT_TIMEOUT_MS)` (5000ms). The total worst-case wait is 1500ms + 5000ms = 6500ms before the adapter responds. This is well within the 20s `adapterResponseTimeoutMs` default, but it means the adapter's actual response latency budget is consumed by two sequential waits rather than a single bounded wait. If `LOGIN_WALL_PROBE_MS` is ever increased without adjusting `WAIT_TIMEOUT_MS`, it could approach the response timeout and cause false `TIMEOUT` errors.

**Fix:** Document the cumulative timeout in comments or use `Math.min(remaining, WAIT_TIMEOUT_MS)` for the fallback wait:

```typescript
// Ensure total wait stays within reasonable bounds
const remainingBudget = Math.max(WAIT_TIMEOUT_MS - LOGIN_WALL_PROBE_MS, 1000);
editorMatch = await waitForEditor(remainingBudget);
```

### WR-02: `findPendingSelectorWarning` scans ALL dispatch records in session storage on every popup open

**File:** `entrypoints/popup/App.tsx:459-464`
**Issue:** `findPendingSelectorWarning` calls `dispatchRepo.listAll()` which does `chrome.storage.session.get(null)` -- reading the entire session storage. On popup mount, this is called alongside `getActive()` and `get()` already. Over time, as dispatch records accumulate in session storage (they are never cleaned up after `done`/`error`/`cancelled`), this scan grows linearly. While session storage is cleared on browser restart, a long browser session with many dispatches would see this become increasingly expensive.

**Fix:** Add cleanup of completed/failed/cancelled dispatch records in `succeedDispatch`, `failDispatch`, or `cancelDispatch`. Alternatively, maintain a separate index key for `needs_confirmation` records:

```typescript
async function findPendingSelectorWarning(): Promise<DispatchRecord | null> {
  const activeId = await dispatchRepo.getActive();
  if (activeId) {
    const rec = await dispatchRepo.get(activeId);
    if (rec && isSelectorLowConfidenceRecord(rec)) return rec;
  }
  return null;
}
```

### WR-03: `advanceToAdapterInjection` passes stale `record` to `requireDispatchConfirmation` / `failDispatch` -- `selectorConfirmation` is destructured out from original but warnings are not

**File:** `background/dispatch-pipeline.ts:209-336`
**Issue:** The `record` parameter passed to `advanceToAdapterInjection` is captured at the time `awaiting_complete` was written. When `requireDispatchConfirmation` (line 346-361) or `failDispatch` (line 393-414) destructure `selectorConfirmation` out, they spread from this potentially stale record. If the dispatch was re-dispatched with `selectorConfirmation` (from the popup's confirm flow), the original `startDispatch` creates a fresh record that carries `selectorConfirmation`. But if `advanceDispatchForTab` processes an older `awaiting_complete` record that never had `selectorConfirmation`, the stale spread loses the original payload. This is a minor inconsistency -- the `selectorConfirmation` is destructured out and discarded in `succeedDispatch`/`failDispatch` anyway -- but the pattern is fragile if `DispatchRecord` gains more transient fields.

**Fix:** Re-read the latest record from storage inside `advanceToAdapterInjection` after the `awaiting_adapter` write, before proceeding to adapter response handling. This ensures the record passed downstream is always fresh.

## Info

### IN-01: `isLoggedOutPath` in discord.content.ts duplicates logic from `isLoggedOutUrlForAdapter` in dispatch-policy.ts

**File:** `entrypoints/discord.content.ts:106-108`
**Issue:** The content script has its own `isLoggedOutPath` function that checks for `/`, `/login*`, `/register*` paths. The pipeline has `isLoggedOutUrlForAdapter` using the same patterns from the adapter registry. These two checks cover the same scenarios independently. While defense-in-depth is intentional (content script cannot import the pipeline module), the Discord-specific paths are now hardcoded in three places: `isLoggedOutPath` in the content script, `loggedOutPathPatterns` in the registry, and the `detectLoginWall` DOM probe.

**Fix:** No action required -- the comment in the content script explains this is defense-in-depth. Just noting the duplication for awareness.

### IN-02: `timeout-config.spec.ts` uses raw file system reads to enforce SW discipline

**File:** `tests/unit/dispatch/timeout-config.spec.ts`
**Issue:** The test reads `dispatch-pipeline.ts` and `dispatch-policy.ts` from disk via `fs.readFileSync` and applies regex checks on the source text. This is fragile -- variable renames, formatting changes, or commented-out code could break the assertions without any real regression. The test also strips comments with a naive regex that could mangle string literals containing `//`.

**Fix:** Consider using AST-based analysis or import-based checks instead of raw file reads. Alternatively, add a comment acknowledging the fragility.

### IN-03: `retry-retriable.spec.tsx` mocks `crypto.randomUUID` but does not restore it

**File:** `tests/unit/popup/retry-retriable.spec.tsx:64-66`
**Issue:** `vi.spyOn(crypto, 'randomUUID').mockReturnValue(...)` is called in `beforeEach` but the spy is only cleaned up via `vi.restoreAllMocks()` in `afterEach`. This is correct for vitest, but the `Object.defineProperty` calls for `window.close` and `globalThis.chrome` use `configurable: true` which is fine. No bug here, but the mock for `dispatchRepo` only exports `clearActive`, not `get` or `set`, which means `startDispatch` in the pipeline would fail if it tried to read the dispatch record. Since the test goes through `sendMessage('dispatch.start')` which is mocked, this works -- but the mock surface is incomplete.

**Fix:** No action required -- test is valid for its scope.

### IN-04: `SelectorWarningDialog` adds global `keydown` listener without scoping to popup

**File:** `entrypoints/popup/components/SelectorWarningDialog.tsx:38`
**Issue:** `document.addEventListener('keydown', handleKeyDown)` attaches to the document. In the popup context this is fine (popup has its own document). However, the `handleKeyDown` for Escape calls `props.onCancel()` unconditionally for any Escape keypress on the document, including potential Escape presses in unrelated UI. Since the dialog is modal and covers the entire popup, this is acceptable behavior -- but it would be more robust to check that the dialog is actually visible.

**Fix:** No action required -- the component unmounts the listener when the dialog is dismissed, and the popup context is isolated.

---

_Reviewed: 2026-05-10T19:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
