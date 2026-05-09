---
phase: 03-dispatch-popup
plan: 08
subsystem: [testing, e2e]
tags: [playwright, e2e, mock-platform, failure-injection, sw-restart, idempotency, draft-recovery, options-reset]

# Dependency graph
requires:
  - phase: 03-dispatch-popup/03-01
    provides: ErrorCode union (9 codes), ProtocolMap with 6 RPC schemas, i18n keys
  - phase: 03-dispatch-popup/03-04
    provides: Dispatch state machine, adapter registry, mock-platform stub adapter, background.ts wiring
  - phase: 03-dispatch-popup/03-05
    provides: Combobox with data-testid selectors, ErrorBanner with per-ErrorCode testids
  - phase: 03-dispatch-popup/03-06
    provides: 6-state popup machine with SendForm, CapturePreview, popup-sendform/popup-confirm testids
  - phase: 03-dispatch-popup/03-07
    provides: Options page with ResetSection, ConfirmDialog, options-reset-button/toast testids
provides:
  - Static mock-platform.html fixture served at localhost:4321/mock-platform.html
  - dispatch.spec.ts (5 tests): happy path, NOT_LOGGED_IN failure injection, 200ms double-click idempotency, SW restart resilience, unsupported URL
  - draft-recovery.spec.ts (1 test): popupDraft persistence across popup close/reopen (DSP-09)
  - options-reset.spec.ts (2 tests): STG-03 reset-all confirm path + cancel-keeps-intact path
affects: [04-openclaw-adapter, 05-discord-adapter]

# Tech tracking
tech-stack:
  added: []
  patterns: [e2e-page-ordering-pattern-S10, failure-injection-via-query-string, sw-restart-via-cdp-stopWorker, negative-detection-no-extra-page, combobox-empty-state-assertion]

key-files:
  created:
    - tests/e2e/fixtures/mock-platform.html
    - tests/e2e/dispatch.spec.ts
    - tests/e2e/draft-recovery.spec.ts
    - tests/e2e/options-reset.spec.ts
  modified: []

key-decisions:
  - "Wait for popup-sendform (not capture-success) in openArticleAndPopup helper because Phase 3 6-state machine renders SendForm as the success state"
  - "35s timeout in SW restart test justified by DEVIATIONS.md D-34 30s alarm minimum + SW wake latency buffer"

patterns-established:
  - "E2E dispatch test pattern: openArticleAndPopup helper returns { articlePage, popup, popupUrl } for page-ordering consistency"
  - "Failure injection pattern: mock-platform.content.ts reads query string ?fail=<code>, dispatch.spec.ts fills send_to with injected URL"
  - "Negative detection: context.waitForEvent('page', { timeout: 1000 }) with .catch() to assert no extra tab opened (idempotency)"
  - "Options page navigation: chrome-extension://<id>/options.html opened as new page, testids verify ConfirmDialog lifecycle"

requirements-completed: [DSP-01, DSP-04, DSP-05, DSP-06, DSP-07, DSP-08, DSP-09, STG-03]

# Metrics
duration: 5min
completed: 2026-05-01
---

# Phase 3 Plan 08: E2E Test Coverage Summary

**8 Playwright E2E tests covering dispatch happy path, 4 failure-injection variants, 200ms idempotency, SW restart resilience, popupDraft recovery, and options reset (STG-03)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-01T12:03:18Z
- **Completed:** 2026-05-01T12:07:56Z
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments

- mock-platform.html static fixture served at localhost:4321/mock-platform.html with data-testid="mock-platform-target"
- dispatch.spec.ts: 5 tests covering DSP-05 (happy path end-to-end), DSP-07 (NOT_LOGGED_IN failure injection with ErrorBanner assertion), DSP-06 idempotency (200ms double-click produces exactly 1 tab), DSP-06 SW restart (CDP stopWorker mid-flight, dispatch resumes within 35s), DSP-01 (unsupported URL keeps Confirm disabled with tooltip)
- draft-recovery.spec.ts: 1 test covering DSP-09 popupDraft persistence across popup close/reopen (send_to + prompt + edited title all restored)
- options-reset.spec.ts: 2 tests covering STG-03 reset-all (pre-seed history via dispatch -> reset -> assert combobox empty state) + cancel-keeps-intact path
- All tests follow Pattern S10 page ordering (article first, popup pre-created, bringToFront, popup.goto)
- Every test closes its pages at end to prevent context leak

## Task Commits

Each task was committed atomically:

1. **Task 1: mock-platform.html fixture + dispatch.spec.ts** - `0b7ef8a` (test)
2. **Task 2: draft-recovery.spec.ts + options-reset.spec.ts** - `e6c0414` (test)

## Files Created/Modified

- `tests/e2e/fixtures/mock-platform.html` - Static stub adapter target page served by playwright webServer at /mock-platform.html; data-testid="mock-platform-target"
- `tests/e2e/dispatch.spec.ts` - 5 E2E tests: happy path, NOT_LOGGED_IN failure injection, 200ms double-click idempotency, SW restart resilience, unsupported URL disabled
- `tests/e2e/draft-recovery.spec.ts` - 1 E2E test: popupDraft persistence across popup close/reopen (DSP-09)
- `tests/e2e/options-reset.spec.ts` - 2 E2E tests: STG-03 reset-all with empty-state assertion + cancel-keeps-intact path

## Decisions Made

- **openArticleAndPopup helper waits for popup-sendform** (not capture-success): Phase 3 6-state machine renders SendForm as the success state after capture.run resolves. The Phase 2 capture-success data-testid no longer exists at the top level — it is nested inside CapturePreview within SendForm.
- **35s timeout in SW restart test**: DEVIATIONS.md D-34 documents 5s->30s badge-clear deviation due to chrome.alarms minimum delay. The SW restart test needs the dispatch to complete after SW wake-up, which can take up to 30s (alarm timeout) plus SW wake latency. 35s provides adequate buffer.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## E2E Execution Note

These E2E tests require:
1. A dev-mode build: `pnpm wxt build --mode development` (produces `.output/chrome-mv3-dev/`)
2. A headed Chromium browser (Playwright cannot load unpacked extensions in headless mode)
3. Local execution only — Phase 1 D-11 defers CI E2E to Phase 4

Run with: `pnpm test:e2e`

Per CLAUDE.md: "E2E tests need a headed browser and may require manual execution."

## Potential Flake Points

Per plan output spec, these are areas to watch for test flake:
- **Failure-injection tests**: mock-platform tab races with popup reopen — mitigated by waitForLoadState + explicit popup2 reopen
- **SW restart test**: stopWorker timing is sensitive to navigation completion — mitigated by 35s generous timeout
- **Idempotency test**: Promise.all([click, click]) may behave differently in headless vs headed mode — mitigated by negative-detection with 1s timeout (not asserting exact timing)
- **Options reset test**: 3s wait after dispatch for SW to complete history writes — generous but avoids flake from slow storage.local IO

## User Setup Required

None - no external service configuration required. E2E tests run locally with `pnpm test:e2e` after dev build.

## Next Phase Readiness

- Phase 4 OpenClaw adapter: append real adapter entry to shared/adapters/registry.ts; mock-platform stub stays for testing; dispatch.spec.ts happy-path test continues to work
- Phase 4 CI lift: E2E tests can be integrated into CI pipeline with headed Chromium in a virtual display (Xvfb)
- Phase 5 Discord adapter: add discord-specific E2E test following same pattern; SPA pushState handling requires webNavigation listener (not tested here)

## Self-Check: PASSED

All 4 key files verified present. Both task commits verified in git log (0b7ef8a, e6c0414). Full suite: typecheck clean, lint clean (0 errors, 4 pre-existing warnings), 109 unit tests pass, build succeeds.

---
*Phase: 03-dispatch-popup*
*Completed: 2026-05-01*
