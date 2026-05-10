---
phase: 09-dispatch-robustness
verified: 2026-05-11T00:05:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Open popup after a dispatch that triggers TIMEOUT (retriable=true). Verify Retry button appears."
    expected: "Retry button visible; clicking it starts new dispatch with fresh dispatchId and current form values"
    why_human: "Cannot simulate chrome.storage.session + chrome.tabs lifecycle in automated grep"
  - test: "Trigger a tier3 class-fragment selector match on Discord. Verify SelectorWarningDialog appears."
    expected: "Accessible dialog with i18n heading/body/cancel/confirm; Cancel returns to SendForm; Confirm sends once"
    why_human: "Requires Discord DOM with tier3 selectors and full chrome extension runtime"
  - test: "Verify SelectorWarningDialog accessibility: focus trap, Escape cancel, overlay click cancel, primary autofocus"
    expected: "Keyboard navigable, screen-reader announces dialog role and labels"
    why_human: "Accessibility behavior requires manual keyboard/screen-reader testing or headed browser"
---

# Phase 9: Dispatch Robustness Verification Report

**Phase Goal:** 投递链路对网络延迟、DOM 变化、登录状态变化具备分层防护和用户可操作的重试能力
**Verified:** 2026-05-11T00:05:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 每个平台有独立的超时配置（dispatchTimeoutMs / adapterResponseTimeoutMs），pipeline 从 registry 读取而非硬编码 | VERIFIED | `shared/adapters/types.ts:68-70` has optional timeout fields; `shared/adapters/dispatch-policy.ts` exports `DEFAULT_DISPATCH_TIMEOUT_MS=30000`, `DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS=20000`, `resolveAdapterTimeouts()`, `withAdapterResponseTimeout()`; `background/dispatch-pipeline.ts:131` calls `resolveAdapterTimeouts(adapter)`; line 73 derives `DISPATCH_TIMEOUT_MINUTES` from default; line 202 uses `dispatchTimeoutMs / 60_000` for alarm; line 278 wraps sendMessage with `withAdapterResponseTimeout` |
| 2 | 登录检测从 Discord 硬编码泛化为 registry 的 loggedOutPathPatterns，pipeline 层 URL 对比使用此配置 | VERIFIED | `shared/adapters/types.ts:72` has `loggedOutPathPatterns`; `shared/adapters/registry.ts:87` Discord entry has `['/', '/login*', '/register*']`; `shared/adapters/dispatch-policy.ts:48-64` exports `isLoggedOutUrlForAdapter()` with host match + pathname-only comparison; `background/dispatch-pipeline.ts` uses `isLoggedOutUrlForAdapter` in 4 locations (tab complete line 467, SPA advancement same function, sendMessage failure line 309, INPUT_NOT_FOUND remap line 348); no `!adapter.match(actualUrl)` login-remap pattern found |
| 3 | 投递失败时 popup 对 retriable 错误显示"重试"按钮，用户点击后以新 dispatchId 重新发起投递 | VERIFIED | `entrypoints/popup/components/ErrorBanner.tsx:34` uses `retriable && !!onRetry` for retry visibility; no `RETRIABLE_CODES` constant anywhere; `entrypoints/popup/App.tsx:62` error signal preserves `retriable: boolean`; `entrypoints/popup/components/SendForm.tsx:192-207` `buildDispatchInput()` creates fresh `crypto.randomUUID()` dispatchId; `handleRetry()` at line 257-269 clears old error, clears active, calls `startDispatch(buildDispatchInput())`; `tests/unit/popup/retry-retriable.spec.tsx` covers retriable=true shows retry, retriable=false hides retry, fresh dispatchId, current form values |
| 4 | 适配器选择器使用分层置信度，低置信度匹配在 popup 显示警告提示用户确认 | VERIFIED | `entrypoints/discord.content.ts:36-37` defines `SelectorTier = 'tier1-aria' \| 'tier2-data' \| 'tier3-class-fragment'`; `findEditor()` returns `EditorMatch` with tier and `lowConfidence`; lines 324-328: tier3 without confirmation returns warning, no paste/send; `shared/messaging/routes/dispatch.ts:5-16` defines `SELECTOR_LOW_CONFIDENCE` as warning, not ErrorCode; confirmed absent from `shared/messaging/result.ts`; `entrypoints/popup/components/SelectorWarningDialog.tsx` has `role="dialog"`, `aria-modal`, focus trap, Escape/overlay cancel; `entrypoints/popup/App.tsx:336-345` renders warning dialog mutually exclusively; confirm creates new dispatchId with `selectorConfirmation` |

**Score:** 4/4 truths verified

### Deferred Items

No deferred items -- all truths are covered in this phase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shared/adapters/dispatch-policy.ts` | Timeout defaults, resolver, logged-out URL helper, adapter response timeout wrapper | VERIFIED | Contains all 4 exports: `DEFAULT_DISPATCH_TIMEOUT_MS`, `resolveAdapterTimeouts`, `isLoggedOutUrlForAdapter`, `withAdapterResponseTimeout` |
| `shared/adapters/types.ts` | AdapterRegistryEntry timeout + loggedOutPathPatterns fields | VERIFIED | Lines 68-72 have `dispatchTimeoutMs?`, `adapterResponseTimeoutMs?`, `loggedOutPathPatterns?` |
| `shared/adapters/registry.ts` | Discord loggedOutPathPatterns configured | VERIFIED | Line 87: `loggedOutPathPatterns: ['/', '/login*', '/register*']` |
| `background/dispatch-pipeline.ts` | Registry-derived alarm delay, adapter response timeout, isLoggedOutUrlForAdapter, warning handling | VERIFIED | Lines 131, 202, 278, 309, 348, 467 use new policy; lines 320-327 handle adapter warnings; `requireDispatchConfirmation` at line 368 persists `needs_confirmation`; injection lock at line 218 prevents duplicate dispatches |
| `shared/messaging/routes/dispatch.ts` | SELECTOR_LOW_CONFIDENCE warning, selectorConfirmation, needs_confirmation state | VERIFIED | `DispatchWarningCodeSchema`, `DispatchWarningSchema`, `SelectorConfirmationSchema`, `DispatchStateEnum` includes `needs_confirmation` |
| `shared/storage/repos/dispatch.ts` | warnings and selectorConfirmation fields on DispatchRecord | VERIFIED | Lines 39-40: `warnings?: DispatchWarning[]`, `selectorConfirmation?: SelectorConfirmation`; `setPendingSelectorWarning`/`getPendingSelectorWarning`/`clearPendingSelectorWarning` |
| `entrypoints/discord.content.ts` | Selector tier metadata and no-send-before-confirm guard | VERIFIED | `findEditor()` returns tier metadata; lines 324-328 block tier3 send without confirmation; no `innerText=` or `textContent=` |
| `entrypoints/popup/components/ErrorBanner.tsx` | retriable prop controls retry visibility | VERIFIED | Line 34: `showRetry = retriable && !!onRetry`; no `RETRIABLE_CODES` constant |
| `entrypoints/popup/components/SendForm.tsx` | Shared buildDispatchInput for Send and Retry | VERIFIED | Lines 192-207: `buildDispatchInput()` generates fresh UUID and current form values; used by both `handleConfirm` and `handleRetry` |
| `entrypoints/popup/App.tsx` | Warning state rendering, retriable preservation, fresh confirm dispatch | VERIFIED | `selectorWarningSig` for warning state; `confirmSelectorWarning` creates new dispatchId with `selectorConfirmation`; `dispatchErrorSig` preserves `retriable`; `findPendingSelectorWarning` uses dedicated pointer (not listAll) |
| `entrypoints/popup/components/SelectorWarningDialog.tsx` | Accessible confirmation dialog with i18n keys | VERIFIED | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, focus trap, Escape cancel, overlay click cancel, all 4 i18n keys rendered |
| `locales/en.yml` | English selector warning keys | VERIFIED | 4 keys with exact UI-SPEC copy: heading="Confirm target message box", body, cancel="Cancel", confirm="Send once" |
| `locales/zh_CN.yml` | Chinese selector warning keys | VERIFIED | 4 keys with exact UI-SPEC copy: heading="确认目标输入框", body, cancel="取消", confirm="仅本次投递" |
| `tests/unit/dispatch/timeout-config.spec.ts` | Timeout defaults, overrides, minimum guard | VERIFIED | File exists (1910 bytes), 3 tests pass |
| `tests/unit/dispatch/adapter-response-timeout.spec.ts` | Adapter response TIMEOUT retriable=true | VERIFIED | File exists (2412 bytes), 1 test passes |
| `tests/unit/dispatch/logged-out-paths.spec.ts` | Logged-out URL positive/negative tests | VERIFIED | File exists (2891 bytes), 6 tests pass |
| `tests/unit/dispatch/selector-warning.spec.ts` | Warning protocol pipeline tests | VERIFIED | File exists (5509 bytes), tests pass |
| `tests/unit/popup/retry-retriable.spec.tsx` | Popup retry behavior tests | VERIFIED | File exists (6390 bytes), covers retriable true/false, fresh dispatchId, current form values |
| `tests/unit/popup/selector-warning-dialog.spec.tsx` | Dialog a11y/cancel/confirm tests | VERIFIED | File exists (3761 bytes), tests pass |
| `tests/unit/adapters/discord-selector.spec.ts` | Tier metadata and no-send-before-confirm tests | VERIFIED | File exists (9053 bytes), covers tier1/tier2/tier3, no-send before confirm, one-shot confirmation |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `shared/adapters/registry.ts` | `background/dispatch-pipeline.ts` | `findAdapter() -> resolveAdapterTimeouts(adapter)` | WIRED | Pipeline line 131 calls `resolveAdapterTimeouts(adapter)` after `findAdapter(input.send_to)` |
| `background/dispatch-pipeline.ts` | `chrome.alarms.create` | `dispatchTimeoutMs / 60_000` | WIRED | Pipeline line 202: `delayInMinutes: dispatchTimeoutMs / 60_000` |
| `background/dispatch-pipeline.ts` | `chrome.tabs.sendMessage` | `withAdapterResponseTimeout(sendMessagePromise, ms)` | WIRED | Pipeline line 278-290 wraps sendMessage with timeout |
| `shared/adapters/registry.ts` | `shared/adapters/dispatch-policy.ts` | `adapter.loggedOutPathPatterns` | WIRED | `isLoggedOutUrlForAdapter` reads `adapter.loggedOutPathPatterns` from registry entry |
| `background/dispatch-pipeline.ts` | `shared/adapters/dispatch-policy.ts` | `isLoggedOutUrlForAdapter(adapter, actualUrl)` | WIRED | 4 call sites: tab complete (467), sendMessage failure (309), INPUT_NOT_FOUND (348), all through `isLoggedOutUrlForAdapter` |
| `dispatch error Result` | `entrypoints/popup/App.tsx` | `error.retriable preserved in signal/props` | WIRED | `dispatchErrorSig` preserves `{ code, message, retriable }`; passed to ErrorBanner as `retriable` prop |
| `entrypoints/popup/components/SendForm.tsx` | `dispatch.start` | `buildDispatchInput() -> sendMessage('dispatch.start')` | WIRED | `buildDispatchInput` creates fresh UUID; `startDispatch` calls `sendMessage('dispatch.start', input)` |
| `shared/storage/repos/dispatch.ts warning record` | `entrypoints/popup/App.tsx` | `getPendingSelectorWarning -> selectorWarningSig` | WIRED | App line 181 reads pending warning; `isSelectorLowConfidenceRecord` checks state + warnings |
| `SelectorWarningDialog` | `SendForm dispatch.start` | `onConfirm -> fresh dispatch input with selectorConfirmation` | WIRED | App `confirmSelectorWarning` creates new dispatchId with `selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' }` |
| `locales/*.yml` | `SelectorWarningDialog` | `t('selector_low_confidence_*')` | WIRED | Dialog renders all 4 i18n keys: heading, body, cancel, confirm |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `resolveAdapterTimeouts` | `dispatchTimeoutMs`, `adapterResponseTimeoutMs` | `AdapterRegistryEntry` optional fields with defaults | Defaults 30000/20000; override from registry; minimum guard | FLOWING |
| `isLoggedOutUrlForAdapter` | boolean return | Registry `loggedOutPathPatterns` + actual URL | Parses URL, checks host, matches pathname patterns | FLOWING |
| `ErrorBanner` retry button | `showRetry` | `retriable` prop from `dispatchErrorSig` | Derived from `rec.error?.retriable ?? false` in App | FLOWING |
| `SendForm.handleRetry` | `DispatchStartInput` | `buildDispatchInput()` using current form signals | Fresh `crypto.randomUUID()`, current `sendToSig`, `promptSig`, `titleSig`, etc. | FLOWING |
| `SelectorWarningDialog` confirm | `DispatchStartInput` with `selectorConfirmation` | `confirmSelectorWarning()` in App | Fresh dispatchId, `selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' }` | FLOWING |
| Discord tier3 guard | `warnings: [{ code: 'SELECTOR_LOW_CONFIDENCE' }]` | `findEditor()` returning `lowConfidence: true` | Returned instead of sending; stored as `needs_confirmation` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All tests pass | `pnpm test` | 43 files, 297 tests passed | PASS |
| Type check passes | `pnpm typecheck` | No errors | PASS |
| Lint passes | `pnpm lint` | No errors | PASS |
| Build succeeds | `pnpm build` | 424.24 kB total, finished in 579ms | PASS |
| i18n coverage 100% | `pnpm test:i18n-coverage` | 99 keys, 100% coverage both locales | PASS |
| `SELECTOR_LOW_CONFIDENCE` not in ErrorCode | `grep SELECTOR_LOW_CONFIDENCE shared/messaging/result.ts` | No output (absent) | PASS |
| No `!adapter.match(actualUrl)` login remap | `grep '!adapter.match' background/dispatch-pipeline.ts` | No output (absent) | PASS |
| `selectorConfirmation` not in persistent repos | `grep selectorConfirmation shared/storage/repos/history.ts binding.ts popupDraft.ts` | No output (absent) | PASS |
| `RETRIABLE_CODES` removed | `grep RETRIABLE_CODES entrypoints/popup/` | No output (absent) | PASS |
| No banned `innerText=`/`textContent=` in Discord adapter | `grep -n 'innerText\\|textContent\\s*=' entrypoints/discord.content.ts` | No output (absent) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DSPT-01 | 09-01 | 投递超时参数移入 AdapterRegistryEntry，pipeline 从 registry 读取 | SATISFIED | `types.ts` has timeout fields; `dispatch-policy.ts` has resolver; `dispatch-pipeline.ts` reads from registry; tests cover defaults/overrides/minimum guard |
| DSPT-02 | 09-02 | 登录检测从 Discord 硬编码泛化为 loggedOutPathPatterns | SATISFIED | `types.ts` has `loggedOutPathPatterns`; Discord registry has `['/', '/login*', '/register*']`; `isLoggedOutUrlForAdapter` is pathname-only; pipeline uses it everywhere; no `!adapter.match` remap |
| DSPT-03 | 09-03 | Popup 对 retriable 错误显示重试按钮，以新 dispatchId 重新发起 | SATISFIED | `ErrorBanner` retry visibility from `retriable && !!onRetry`; `buildDispatchInput` generates fresh UUID; `handleRetry` clears old state and starts new dispatch |
| DSPT-04 | 09-04, 09-05 | 适配器选择器分层置信度，低置信度警告用户确认 | SATISFIED | Discord has tier1-aria/tier2-data/tier3-class-fragment; tier3 returns warning before send; `SELECTOR_LOW_CONFIDENCE` is warning not ErrorCode; `SelectorWarningDialog` with a11y; `needs_confirmation` state persisted |

No orphaned requirements found -- DSPT-01 through DSPT-04 are all covered by plans in this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected in phase-modified files |

No TODOs, FIXMEs, placeholder implementations, empty returns in rendering paths, hardcoded empty data, or console.log-only handlers found in the 11 production files modified by this phase. The only `return []` is in `parseDispatchWarnings` for non-array input, which is correct guard logic.

### Review Findings Status

The code review (09-REVIEW.md) identified 1 critical and 3 warnings. All are addressed in the codebase:

- **CR-01 (race condition):** Mitigated by `adapterInjectionLocks` Set at pipeline line 218-219. The lock prevents concurrent `advanceToAdapterInjection` calls from processing the same dispatchId. Re-read at line 221 provides CAS guard.
- **WR-01 (cumulative timeout):** Fixed. Discord adapter line 302 uses `Math.max(WAIT_TIMEOUT_MS - LOGIN_WALL_PROBE_MS, 1000)` to bound total wait.
- **WR-02 (listAll scan):** Fixed. `findPendingSelectorWarning` at App line 460-464 uses dedicated `selectorWarningDispatchPointerItem` pointer instead of `listAll()`.
- **WR-03 (stale record):** Mitigated by re-read in `advanceToAdapterInjection` (line 221-222) and transient field destructuring in terminal state handlers.

### Human Verification Required

### 1. Retry button for retriable dispatch errors

**Test:** Trigger a dispatch that results in a TIMEOUT error (retriable=true). Open the popup and observe the ErrorBanner.
**Expected:** A "Retry" button is visible in the error banner. Clicking it clears the old error, starts a new dispatch with a fresh dispatchId using current form values, and transitions to InProgressView.
**Why human:** Cannot simulate the full chrome.storage.session + chrome.tabs + content script lifecycle in automated grep. The code paths are wired correctly but runtime behavior requires the extension running in Chrome.

### 2. Selector warning dialog for low-confidence Discord selectors

**Test:** Trigger a dispatch to Discord where the editor is found via tier3 class-fragment selector. Observe the popup.
**Expected:** SelectorWarningDialog appears (not ErrorBanner) with accessible dialog, i18n heading/body, Cancel and "Send once" buttons. Cancel returns to SendForm without ErrorBanner. Confirm starts a fresh dispatch with `selectorConfirmation`.
**Why human:** Requires Discord DOM with tier3-specific selectors and full extension runtime. The component renders correctly in unit tests but visual layout and DOM interaction require headed browser.

### 3. SelectorWarningDialog accessibility

**Test:** When the warning dialog appears, verify keyboard navigation: Tab cycles through focusable elements, Escape closes the dialog, overlay click closes it, confirm button receives initial focus.
**Expected:** Focus trap works, screen-reader announces dialog role and content, Escape and overlay click trigger cancel.
**Why human:** Focus trap, screen-reader announcements, and keyboard navigation require manual testing or specialized a11y testing tools.

### Gaps Summary

No functional gaps found. All 4 ROADMAP success criteria are implemented with substantive code, proper wiring, and real data flow. Automated verification passes all checks (297 tests, typecheck, lint, i18n coverage, build). Three items require human verification of runtime behavior in the Chrome extension environment.

---

_Verified: 2026-05-11T00:05:00Z_
_Verifier: Claude (gsd-verifier)_
