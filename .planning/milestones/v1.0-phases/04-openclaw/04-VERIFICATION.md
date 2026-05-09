---
phase: 04-openclaw
verified: 2026-05-03T04:30:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Permission grant flow end-to-end"
    expected: "Accept Chrome permission dialog → popup closes → reopen popup → auto-sends dispatch.start → message appears in OpenClaw within 5s"
    why_human: "Requires headed browser with real Chrome permission dialog; dev mode auto-grants without dialog so the popup-close-on-permission path cannot be exercised in CI"
  - test: "Permission deny flow end-to-end"
    expected: "Deny Chrome permission dialog → popup closes → reopen popup → OPENCLAW_PERMISSION_DENIED error banner visible"
    why_human: "Dev mode auto-grants all permissions; deny path cannot be triggered programmatically (test.skip documented in openclaw-permission.spec.ts)"
  - test: "Offline OpenClaw dispatch → error priority on popup reopen"
    expected: "Dispatch to non-running OpenClaw → popup closes → reopen popup → OPENCLAW_OFFLINE shown, NOT EXECUTE_SCRIPT_FAILED"
    why_human: "Full E2E spec (openclaw-offline.spec.ts) requires headed browser + OpenClaw fixture server; offline path depends on real adapter injection timing"
  - test: "E2E spec suite passes against live fixture"
    expected: "pnpm test:e2e -- openclaw → 3 specs pass (dispatch happy-path x2, offline x1, permission grant x1, deny skipped)"
    why_human: "E2E specs require headed Chromium + loaded unpacked extension + local OpenClaw server at localhost:18789"
---

# Phase 4: OpenClaw Gap Closure Verification Report

**Phase Goal:** Fix 4 UAT gaps from popup closing during chrome.permissions.request / chrome.tabs.create dispatch.
**Verified:** 2026-05-03T04:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification (gap closure plans 04-05 and 04-06)

## Goal Achievement

The 4 UAT gaps targeted by plans 04-05 and 04-06 are:

- Test 5: Permission granted → dispatch proceeds (blocker)
- Test 6: Permission denied → OPENCLAW_PERMISSION_DENIED shown (blocker)
- Test 7: Offline dispatch → OPENCLAW_OFFLINE shown, not EXECUTE_SCRIPT_FAILED (major)
- Test 10: E2E spec suite passes (major)

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Permission granted → dispatch starts automatically on popup reopen (or immediately if popup survives) | VERIFIED | `App.tsx:68-112` — Step 0 loads `pendingIntent`, checks `chrome.permissions.contains`, auto-sends `dispatch.start` on grant, clears pending intent |
| 2 | Permission denied → popup reopens showing OPENCLAW_PERMISSION_DENIED error banner | VERIFIED | `App.tsx:104-110` — `!nowGranted` branch sets `dispatchErrorSig.value = { code: 'OPENCLAW_PERMISSION_DENIED' }` after clearing pending intent |
| 3 | Dispatch to offline OpenClaw → popup reopens showing OPENCLAW_OFFLINE, not EXECUTE_SCRIPT_FAILED | VERIFIED | `App.tsx:156-159` — capture error assignment guarded by `if (!dispatchErrorSig.value)`, preventing capture error from overriding dispatch error |
| 4 | Dispatch with already-granted permission → same as non-dynamic-adapter flow, no popup close | VERIFIED | `SendForm.tsx:207-210` — `chrome.permissions.contains` checked first; if `alreadyGranted`, skips `savePendingDispatch` + `permissions.request` entirely |
| 5 | E2E dispatch happy-path spec passes — popup Confirm → OpenClaw page opens → message appears | VERIFIED (code) | `openclaw-dispatch.spec.ts:57-74` — uses `context.waitForEvent('page')` pattern; syntactically valid, typecheck passes |
| 6 | E2E offline spec passes — dispatch to non-OpenClaw page → popup reopens with OPENCLAW_OFFLINE | VERIFIED (code) | `openclaw-offline.spec.ts:47-60` — `popup2` reopen pattern (5 occurrences), asserts `error-banner-OPENCLAW_OFFLINE` |
| 7 | E2E permission spec passes — grant path verified via auto-resume on popup reopen | VERIFIED (code) | `openclaw-permission.spec.ts:44-54` — `context.waitForEvent('page')` + message-list assertion; deny path documented as `test.skip` with unit test reference |

**Score:** 7/7 truths verified (automated code checks); 4 truths require human E2E execution

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shared/storage/items.ts` | pendingDispatchItem for DispatchStartInput persistence | VERIFIED | Lines 124-130: `storage.defineItem<DispatchStartInput \| null>('local:pendingDispatch', { fallback: null })` |
| `shared/storage/repos/popupDraft.ts` | savePendingDispatch / loadPendingDispatch / clearPendingDispatch | VERIFIED | Lines 49-58: all three methods present, wired to `pendingDispatchItem` |
| `shared/storage/repos/grantedOrigins.ts` | has() queries chrome.permissions.contains as authoritative source | VERIFIED | Lines 25-35: `chrome.permissions.contains` called first, local mirror fallback in try/catch |
| `entrypoints/popup/components/SendForm.tsx` | handleConfirm saves dispatch intent before chrome.permissions.request | VERIFIED | Lines 211-215: `draftRepo.savePendingDispatch(input)` called before `chrome.permissions.request` |
| `entrypoints/popup/App.tsx` | Mount checks for pending dispatch and auto-resumes or shows error | VERIFIED | Lines 67-112: Step 0 present before Step 1, full grant/deny branches implemented |
| `tests/e2e/openclaw-dispatch.spec.ts` | Updated E2E spec matching new popup lifecycle | VERIFIED | 2x `context.waitForEvent('page')` — popup-close-resilient pattern |
| `tests/e2e/openclaw-offline.spec.ts` | Updated offline spec expecting dispatch error on popup reopen | VERIFIED | 5x `popup2` — reopen pattern present |
| `tests/e2e/openclaw-permission.spec.ts` | Updated permission spec with popup-reopen pattern | VERIFIED | 1x `context.waitForEvent('page')` + `test.skip` for deny path |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `SendForm.tsx` | `shared/storage/repos/popupDraft.ts` | `pendingDispatch.save` before `chrome.permissions.request` | WIRED | `draftRepo.savePendingDispatch(input)` at line 212 before `permissions.request` at line 213 |
| `App.tsx` | `shared/storage/repos/popupDraft.ts` | `pendingDispatch.load` on mount | WIRED | `draftRepo.loadPendingDispatch()` at line 68 (Step 0 of mount) |
| `App.tsx` | `shared/storage/repos/dispatch.ts` | `getActive` to recover dispatch error state | WIRED | `dispatchRepo.getActive()` at line 115 (Step 1) |
| `popupDraft.ts` | `shared/storage/items.ts` | `pendingDispatchItem` | WIRED | Import at line 16: `pendingDispatchItem` imported from items |
| `grantedOrigins.ts` | `chrome.permissions` API | `chrome.permissions.contains` in `has()` | WIRED | Lines 27-31: authoritative check + try/catch fallback for test env |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `App.tsx` (Step 0 resume) | `pendingIntent` | `pendingDispatchItem` via `loadPendingDispatch()` | Yes — reads from `storage.local` | FLOWING |
| `App.tsx` (dispatch error guard) | `dispatchErrorSig.value` | `dispatchRepo.get(activeId)` from `storage.session` | Yes — real dispatch record | FLOWING |
| `SendForm.tsx` (intent save) | `input` (DispatchStartInput) | Composed from `props.sendTo`, `props.snapshot`, etc. | Yes — real user input + capture snapshot | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| pendingDispatchItem exists in storage items | `grep -c "pendingDispatchItem" shared/storage/items.ts` | 1 | PASS |
| chrome.permissions.contains in grantedOrigins.has() | `grep -c "chrome.permissions.contains" shared/storage/repos/grantedOrigins.ts` | 2 | PASS |
| savePendingDispatch called before permissions.request | `grep -c "savePendingDispatch" entrypoints/popup/components/SendForm.tsx` | 1 (line 212, before line 213 permissions.request) | PASS |
| loadPendingDispatch called on App mount | `grep -c "loadPendingDispatch" entrypoints/popup/App.tsx` | 1 (Step 0 at line 68) | PASS |
| 152 unit tests pass | `pnpm test` | 152 passed (21 test files) | PASS |
| TypeScript typecheck clean | `pnpm tsc --noEmit` | 0 errors | PASS |
| Build succeeds | `pnpm build` | 364.77 kB, finished in ~520ms | PASS |
| dispatch spec uses context.waitForEvent | `grep -c "context.waitForEvent" openclaw-dispatch.spec.ts` | 2 | PASS |
| offline spec reopens popup (popup2 pattern) | `grep -c "popup2" openclaw-offline.spec.ts` | 5 | PASS |
| permission spec uses waitForEvent | `grep -c "context.waitForEvent" openclaw-permission.spec.ts` | 1 | PASS |
| Capture error does NOT override dispatch error | line 157 of App.tsx: `if (!dispatchErrorSig.value)` guards errorSig assignment | guard present | PASS |
| pendingDispatch stored in local (not session) | `grep "local:pendingDispatch" shared/storage/items.ts` | confirmed `local:` prefix | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ADO-05 | 04-05, 04-06 | E2E tests: popup Confirm → message in OpenClaw | SATISFIED (pending human E2E run) | 3 E2E specs updated with popup-close-resilient pattern; unit tests pass; build clean |
| ADO-06 | 04-05 | OpenClaw adapter does not enumerate URLs statically; uses chrome.permissions.request | SATISFIED | Verified in prior plans; gap closure does not regress this — `SendForm.tsx` still calls `chrome.permissions.request` for dynamic adapters |
| ADO-07 | 04-05 | Permission flow: request on new URL, persist on grant, error on deny | SATISFIED | `pendingDispatch` intent persisted before request; grant path auto-resumes dispatch; deny path shows `OPENCLAW_PERMISSION_DENIED`; retry is available (user can re-click Confirm) |

**Requirement scope note:** Plans 04-05 and 04-06 claim ADO-05, ADO-06, ADO-07. REQUIREMENTS.md shows ADO-01 through ADO-07 are all Phase 4 requirements. ADO-01 through ADO-04 were addressed in plans 04-01 through 04-03 and are not in scope for gap closure verification. The three IDs claimed by these gap plans are fully accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SendForm.tsx` | 287, 303 | `placeholder=` attribute | Info | HTML input placeholders — not a stub; these are `t()` i18n calls for UI placeholder text |

No blockers or warnings. All `placeholder` matches are legitimate UI placeholder attributes backed by i18n keys (`t('combobox_send_to_placeholder')`, `t('combobox_prompt_placeholder')`), not stub indicators.

### Human Verification Required

#### 1. Permission Grant Flow (UAT Test 5)

**Test:** On a real headed Chromium with unpacked extension loaded, open popup on an article page. Enter a new OpenClaw URL (one not previously granted). Click Confirm. When the Chrome permission dialog appears, click Accept.
**Expected:** Permission dialog closes popup. Reopen popup. Step 0 detects `pendingIntent` + `nowGranted=true` → auto-sends `dispatch.start` → `InProgressView` appears → dispatch completes → message in OpenClaw within 5s. No "platform unsupported" error.
**Why human:** Dev mode auto-grants permissions without showing a dialog, so the popup-close-on-permission path cannot be exercised without a real Chrome profile.

#### 2. Permission Deny Flow (UAT Test 6)

**Test:** Same setup as Test 5. When the Chrome permission dialog appears, click Deny.
**Expected:** Permission dialog closes popup. Reopen popup. Step 0 detects `pendingIntent` + `nowGranted=false` → `OPENCLAW_PERMISSION_DENIED` error banner visible.
**Why human:** Dev mode auto-grants; deny path is `test.skip` in E2E specs (intentional limitation documented in `openclaw-permission.spec.ts`).

#### 3. Offline Error Priority (UAT Test 7)

**Test:** Run `pnpm test:e2e -- openclaw-offline` with headed Playwright (OpenClaw fixture server running but target URL pointing to a non-OpenClaw page). Observe that after dispatch completes and popup is reopened, `OPENCLAW_OFFLINE` banner is shown (not `EXECUTE_SCRIPT_FAILED`).
**Expected:** `error-banner-OPENCLAW_OFFLINE` visible in reopened popup within 15s.
**Why human:** Requires headed browser + timing-sensitive adapter injection chain that cannot be reliably verified without running the actual E2E.

#### 4. Full E2E Suite (UAT Test 10)

**Test:** `pnpm wxt build --mode development && pnpm test:e2e -- openclaw`
**Expected:** All 3 specs pass (dispatch happy-path ×2, offline ×1, permission grant ×1; deny path skipped).
**Why human:** E2E requires headed Chromium + loaded unpacked extension + OpenClaw server at localhost:18789.

### Gaps Summary

No automated gaps found. All 7 must-have truths are verified at the code level:

- `pendingDispatchItem` storage item exists and is wired correctly
- `savePendingDispatch` / `loadPendingDispatch` / `clearPendingDispatch` implemented and wired
- `grantedOriginsRepo.has()` uses `chrome.permissions.contains` as authoritative source (infinite loop eliminated)
- `SendForm.handleConfirm` saves intent before `chrome.permissions.request` (intent-first pattern)
- `App.tsx` Step 0 checks `pendingDispatch` on mount with full grant/deny branches
- Capture error does NOT override dispatch error (`if (!dispatchErrorSig.value)` guard at line 157)
- All 3 E2E specs use popup-close-resilient patterns (`context.waitForEvent('page')` + `popup2` reopen)

The 4 human verification items cannot be resolved programmatically. They require a headed browser execution to confirm the runtime behavior of the complete permission dialog → popup close → reopen → auto-resume flow.

---

_Verified: 2026-05-03T04:30:00Z_
_Verifier: Claude (gsd-verifier)_
