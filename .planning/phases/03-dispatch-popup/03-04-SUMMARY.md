---
phase: 03-dispatch-popup
plan: 04
subsystem: [dispatch, state-machine, background, adapters]
tags: [chrome.tabs, chrome.alarms, chrome.action, chrome.scripting, state-machine, adapter-registry, badge, idempotency]

# Dependency graph
requires:
  - phase: 03-dispatch-popup/03-01
    provides: ErrorCode extended to 9 codes, ProtocolMap with 6 new RPC schemas, IMAdapter + AdapterRegistryEntry types, dispatch routes
  - phase: 03-dispatch-popup/03-02
    provides: dispatch/history/binding/popupDraft typed repos with business methods (addSendTo, upsert, clear, etc.)
provides:
  - Adapter registry with mock-platform entry + findAdapter/detectPlatformId pure helpers
  - Dispatch state machine (7 states, D-31) with D-32 idempotency, D-33 SW-restart sweep, D-34 badge tri-state
  - Mock-platform stub adapter with 4 failure-injection hooks
  - History/binding RPC handlers (historyList, historyDelete, bindingUpsert, bindingGet)
  - background.ts top-level wiring: 8 onMessage + tabs.onUpdated + alarms.onAlarm (FND-02 preserved)
  - wrapHandler generalized to accept input-bearing handlers
affects: [03-05-popup-ui, 03-06-options-page, 03-08-e2e, 04-openclaw-adapter, 05-discord-adapter]

# Tech tracking
tech-stack:
  added: []
  patterns: [dispatch-state-machine-per-key-session-writes, adapter-registry-static-descriptor, fast-path-pitfall-5, badge-tri-state-alarm-clear]

key-files:
  created:
    - shared/adapters/registry.ts
    - entrypoints/mock-platform.content.ts
    - background/dispatch-pipeline.ts
    - background/handlers/history.ts
    - background/handlers/binding.ts
    - tests/unit/dispatch/state-machine.spec.ts
    - tests/unit/dispatch/platform-detector.spec.ts
  modified:
    - entrypoints/background.ts

key-decisions:
  - "Adapter registry in shared/ (not background/) so popup + SW both import from single location (D-24, D-26)"
  - "wrapHandler generalized with overload signatures to support input-bearing Phase 3 handlers alongside Phase 1+2 no-arg handlers"
  - "chrome.tabs.TabChangeInfo replaced with chrome.tabs.OnUpdatedInfo (correct @types/chrome type name)"
  - "BindingUpsertInput.mark_dispatched passed conditionally to avoid exactOptionalPropertyTypes violation"

patterns-established:
  - "Dispatch state machine: per-key storage.session writes (dispatch:<id>) prevent race conditions across concurrent dispatches"
  - "Pitfall 5 fast-path: when target tab is already complete, advanceToAdapterInjection runs directly without waiting for onUpdated:complete"
  - "Badge tri-state: loading(ok=#94a3b8) -> ok(#22c55e, 30s alarm clear) -> err(#ef4444, persists until popup mount)"
  - "Adapter failure injection: query string ?fail=<code> triggers structured Err response from mock adapter"

requirements-completed: [DSP-01, DSP-02, DSP-03, DSP-04, DSP-05, DSP-06, DSP-07, DSP-08, DSP-09, STG-03]

# Metrics
duration: 10min
completed: 2026-05-01
---

# Phase 3 Plan 04: Dispatch Pipeline + Adapter Registry + Background Wiring Summary

**SW dispatch state machine (D-31 7-state with D-32 idempotency + D-33 SW-restart sweep), adapter registry with mock-platform stub, history/binding RPC handlers, and full background.ts top-level wiring for 8 RPCs + 2 chrome.* listeners**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-01T11:23:23Z
- **Completed:** 2026-05-01T11:33:45Z
- **Tasks:** 3
- **Files modified:** 8 (7 created + 1 modified)

## Accomplishments

- Adapter registry (`shared/adapters/registry.ts`) with static mock entry, `findAdapter`/`detectPlatformId` pure helpers usable by both popup and SW
- Mock-platform stub adapter with 4 failure-injection hooks via query string and production exclusion via `import.meta.env.DEV` guard
- Full dispatch state machine: 7 states (pending/opening/awaiting_complete/awaiting_adapter/done/error/cancelled), D-32 idempotency via UUID dispatchId, D-33 SW-restart resilience via tabs.onUpdated sweep, Pitfall 5 fast-path for already-complete tabs, Pitfall 3 error classification for executeScript failures
- Badge tri-state (D-34 + DEVIATIONS.md D-34 5s->30s): loading=#94a3b8, ok=#22c55e with 30s alarm clear, err=#ef4444 persists until next popup mount
- History/binding thin RPC handlers wrapping typed repos
- background.ts wiring: 8 onMessage registrations + chrome.tabs.onUpdated + chrome.alarms.onAlarm, all synchronous at SW top level (FND-02 preserved)
- wrapHandler generalized to accept both no-arg (Phase 1+2) and input-bearing (Phase 3) handlers
- 25 unit tests (6 platform-detector + 19 state-machine) all green

## Task Commits

Each task was committed atomically:

1. **Task 1: Adapter registry + mock-platform stub + platformDetector test** - `f6cec83` (feat)
2. **Task 2: Dispatch-pipeline state machine + history/binding RPC handlers + state-machine tests** - `9ea18b2` (feat)
3. **Task 3: Wire 6 RPC handlers + tabs.onUpdated + alarms.onAlarm into background.ts top level** - `76cb542` (feat)

## Files Created/Modified

- `shared/adapters/registry.ts` - Static AdapterRegistryEntry[] with mock entry, findAdapter/detectPlatformId pure helpers
- `entrypoints/mock-platform.content.ts` - Stub adapter with ADAPTER_DISPATCH listener, 4 failure-injection hooks, DEV-only guard
- `background/dispatch-pipeline.ts` - D-31 state machine with startDispatch/cancelDispatch/onTabComplete/onAlarmFired + BADGE_COLORS
- `background/handlers/history.ts` - historyList/historyDelete RPC handlers (thin wrappers)
- `background/handlers/binding.ts` - bindingUpsert/bindingGet RPC handlers (thin wrappers)
- `tests/unit/dispatch/platform-detector.spec.ts` - 6 tests: registry length, match purity, query tolerance, unsupported URL
- `tests/unit/dispatch/state-machine.spec.ts` - 19 tests: all state transitions, idempotency, Pitfall 5 split (5a+5b), badge, alarms, cancel, constants
- `entrypoints/background.ts` - Added Phase 3 imports, generalized wrapHandler, registered 6 RPCs + 2 chrome.* listeners

## Decisions Made

- **`chrome.tabs.TabChangeInfo` -> `chrome.tabs.OnUpdatedInfo`**: The @types/chrome package does not export `TabChangeInfo`; the correct type for the onUpdated callback's second parameter is `OnUpdatedInfo`. This is a documentation discrepancy in the plan, not a design change.
- **Binding handler `exactOptionalPropertyTypes`**: `input.mark_dispatched` is `boolean | undefined` from zod schema but `bindingRepo.upsert` options expect `boolean` (not undefined). Conditionally construct the options object to avoid the type violation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed chrome.tabs type name**
- **Found during:** Task 2 (dispatch-pipeline typecheck)
- **Issue:** `chrome.tabs.TabChangeInfo` does not exist in @types/chrome — the correct type is `chrome.tabs.OnUpdatedInfo`
- **Fix:** Changed parameter type to `chrome.tabs.OnUpdatedInfo`
- **Files modified:** `background/dispatch-pipeline.ts`
- **Verification:** `pnpm typecheck` exits 0
- **Committed in:** `9ea18b2` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes violation in binding handler**
- **Found during:** Task 2 (binding handler typecheck)
- **Issue:** `input.mark_dispatched` is `boolean | undefined` from zod inference but `bindingRepo.upsert` options expect `{ mark_dispatched?: boolean }` — under `exactOptionalPropertyTypes: true`, passing `{ mark_dispatched: undefined }` is a type error
- **Fix:** Conditionally construct options object: only include `mark_dispatched` when explicitly set
- **Files modified:** `background/handlers/binding.ts`
- **Verification:** `pnpm typecheck` exits 0
- **Committed in:** `9ea18b2` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs: type name correction + exactOptionalPropertyTypes compliance)
**Impact on plan:** Both fixes are type-level corrections with no behavioral change. No scope creep.

## Issues Encountered

None beyond the type corrections above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06 (popup UI) can `import { findAdapter, detectPlatformId } from '@/shared/adapters/registry'` for icon display + Confirm enable
- Plan 08 (e2e) can drive `dispatch.start` RPC via popup and observe state writes via `fakeBrowser.storage.session`
- Phase 4 OpenClaw adapter integration = append entry to `shared/adapters/registry.ts` + create `entrypoints/openclaw.content.ts`; this plan's files untouched
- Phase 5 Discord adapter integration = same pattern

## Build Artifact Verification

- `pnpm build` emits `.output/chrome-mv3/content-scripts/mock-platform.js` at the exact path referenced by `scriptFile: 'content-scripts/mock-platform.js'` in `shared/adapters/registry.ts`
- Manifest generation includes all Phase 3 listeners and RPC routes

## Self-Check: PASSED

All 8 key files verified present. All 3 task commits verified in git log (f6cec83, 9ea18b2, 76cb542). Full suite: typecheck clean, lint clean (0 errors, 4 pre-existing warnings), 109 tests pass, build succeeds.

---
*Phase: 03-dispatch-popup*
*Completed: 2026-05-01*
