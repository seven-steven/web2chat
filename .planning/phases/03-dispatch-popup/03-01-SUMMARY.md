---
phase: 03-dispatch-popup
plan: 01
subsystem: [messaging, i18n, types]
tags: [zod, rpc, error-codes, adapter-contract, i18n, protocol-split]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: ProtocolMap, Result/ErrorCode model, ArticleSnapshotSchema, messaging infrastructure
  - phase: 02-capture
    provides: capture.run route, ArticleSnapshot type, capture.error_code tests
provides:
  - ErrorCode union extended to 9 members (5 new dispatch-specific codes)
  - ProtocolMap split into 4 route modules (capture/dispatch/history/binding)
  - 6 new RPC zod schemas (dispatch.start, dispatch.cancel, history.list, history.delete, binding.upsert, binding.get)
  - IMAdapter interface + AdapterRegistryEntry type (cross-phase adapter contract)
  - PlatformId union type (mock | openclaw | discord)
  - ~70 new i18n keys in en + zh_CN (dispatch, error_code, history, binding, platform_icon, combobox, options namespaces)
  - dispatch.spec.ts contract test (7 tests covering all 6 new RPC schemas)
affects: [03-02-storage-repos, 03-03-dispatch-pipeline, 03-04-background-wiring, 03-05-popup-ui, 03-06-options-page, 04-openclaw-adapter, 05-discord-adapter]

# Tech tracking
tech-stack:
  added: []
  patterns: [route-module-split, adapter-registry-descriptor, zod-enum-for-state-machine]

key-files:
  created:
    - shared/messaging/routes/capture.ts
    - shared/messaging/routes/dispatch.ts
    - shared/messaging/routes/history.ts
    - shared/messaging/routes/binding.ts
    - shared/adapters/types.ts
    - tests/unit/messaging/dispatch.spec.ts
  modified:
    - shared/messaging/result.ts
    - shared/messaging/protocol.ts
    - shared/messaging/index.ts
    - locales/en.yml
    - locales/zh_CN.yml
    - tests/unit/messaging/errorCode.spec.ts

key-decisions:
  - "D-07 closure: ProtocolMap split into 4 route modules when route count crosses 5 in Phase 3"
  - "D-23..D-26: IMAdapter contract with PlatformId union, optional canDispatch, match/send/compose separation"
  - "ErrorCode retriable flags: NOT_LOGGED_IN/INPUT_NOT_FOUND/TIMEOUT/RATE_LIMITED=true, PLATFORM_UNSUPPORTED=false"

patterns-established:
  - "Route module pattern: each routes/<domain>.ts exports Protocol* interface + *Schemas const + types"
  - "Aggregator pattern: protocol.ts imports from routes/ and spreads schemas into single const"
  - "Adapter descriptor pattern: AdapterRegistryEntry with pure match() function, no chrome.* dependency"

requirements-completed: [DSP-01, DSP-02, DSP-03, DSP-04, DSP-07, DSP-08, STG-03]

# Metrics
duration: 6min
completed: 2026-05-01
---

# Phase 3 Plan 01: Messaging + i18n Foundation Summary

**Extended ErrorCode to 9 codes, split ProtocolMap into 4 route modules with 6 new zod RPC schemas, created cross-phase IMAdapter contract, and added ~70 bilingual i18n keys**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-01T06:27:04Z
- **Completed:** 2026-05-01T06:33:20Z
- **Tasks:** 3
- **Files modified:** 12 (6 created + 6 modified)

## Accomplishments

- ErrorCode union extended from 4 to 9 members — all 5 new codes (NOT_LOGGED_IN, INPUT_NOT_FOUND, TIMEOUT, RATE_LIMITED, PLATFORM_UNSUPPORTED) compile and pass runtime validation tests
- ProtocolMap split from monolithic protocol.ts into 4 route modules (capture/dispatch/history/binding) with aggregator re-export — Phase 1+2 callers compile unchanged
- 6 new RPC schemas with full zod input + output validation for dispatch.start, dispatch.cancel, history.list, history.delete, binding.upsert, binding.get
- IMAdapter interface + AdapterRegistryEntry type ready for Phase 4/5 adapter implementations
- ~70 i18n keys added to both en.yml and zh_CN.yml with 100% structural parity, covering all downstream Plans 05/06/07 consumer namespaces

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ErrorCode union + create IMAdapter contract types** - `8f5c1a6` (feat)
2. **Task 2: Split ProtocolMap into 4 route modules + add 6 new RPC schemas** - `bdb301f` (feat)
3. **Task 3: Add Phase 3 i18n keys to en + zh_CN locales + dispatch contract test** - `e7f7d36` (feat)

## Files Created/Modified

- `shared/messaging/result.ts` - ErrorCode union extended to 9 members
- `shared/messaging/protocol.ts` - Converted to aggregator, re-exports from route modules
- `shared/messaging/index.ts` - Barrel extended with all Phase 3 type + schema re-exports
- `shared/messaging/routes/capture.ts` - ArticleSnapshot + capture.run route extracted
- `shared/messaging/routes/dispatch.ts` - dispatch.start/cancel schemas + DispatchState enum
- `shared/messaging/routes/history.ts` - history.list/delete schemas + HistoryEntry type
- `shared/messaging/routes/binding.ts` - binding.upsert/get schemas + BindingEntry type
- `shared/adapters/types.ts` - IMAdapter interface + AdapterRegistryEntry + PlatformId
- `locales/en.yml` - ~70 new Phase 3 keys appended
- `locales/zh_CN.yml` - ~70 new Phase 3 keys appended (100% parity with en)
- `tests/unit/messaging/errorCode.spec.ts` - 5 new mirror tests (8 total)
- `tests/unit/messaging/dispatch.spec.ts` - 7 contract tests for all 6 new RPC schemas

## Decisions Made

None - followed plan as specified. All schema field names, type shapes, and i18n key names match the plan exactly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing Vitest `jsdom` package resolution warnings (3 unhandled errors in test output) — not caused by our changes, all 44 tests pass. These are out of scope per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (storage repos) can `import type { HistoryEntry, BindingEntry } from '@/shared/messaging'`
- Plan 04 (dispatch-pipeline) can `import { DispatchStartInputSchema, type DispatchState } from '@/shared/messaging'`
- Plan 05 (background.ts wiring) can register handlers against the 6 new route names
- Plans 06 + 07 (popup + options UI) reference all i18n keys via `t('<key>')` — every key is present in both locales

## Self-Check: PASSED

All 13 key files verified present. All 3 task commits verified in git log (8f5c1a6, bdb301f, e7f7d36). Full suite: typecheck clean, lint clean (0 errors), 44 tests pass.

---
*Phase: 03-dispatch-popup*
*Completed: 2026-05-01*
