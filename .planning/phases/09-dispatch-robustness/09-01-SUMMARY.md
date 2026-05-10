---
phase: 09-dispatch-robustness
plan: 01
subsystem: dispatch
tags: [mv3, chrome-alarms, adapter-registry, vitest, tdd]

requires:
  - phase: 08-architecture-generalization
    provides: registry-driven adapter contracts and dispatch pipeline generalization
provides:
  - registry-owned dispatch timeout policy fields
  - pure timeout resolver and scoped adapter response timeout wrapper
  - dispatch pipeline wiring for registry-derived alarm and adapter response timeouts
affects: [phase-09-dispatch-robustness, future-adapters, dispatch-pipeline]

tech-stack:
  added: []
  patterns:
    - registry-owned operational policy
    - scoped Promise.race adapter response timeout
    - chrome.alarms for cross-event dispatch timeout

key-files:
  created:
    - shared/adapters/dispatch-policy.ts
    - tests/unit/dispatch/timeout-config.spec.ts
    - tests/unit/dispatch/adapter-response-timeout.spec.ts
  modified:
    - shared/adapters/types.ts
    - background/dispatch-pipeline.ts
    - tests/unit/dispatch/dispatch-timeout.spec.ts

key-decisions:
  - "Kept dispatch total timeout on chrome.alarms while deriving delay from registry policy."
  - "Isolated the D-113 setTimeout exception inside withAdapterResponseTimeout only."

patterns-established:
  - "AdapterRegistryEntry may define dispatchTimeoutMs and adapterResponseTimeoutMs; defaults live in shared/adapters/dispatch-policy.ts."
  - "Adapter response timeout failures persist TIMEOUT with retriable=true, without adding a new user-visible ErrorCode."

requirements-completed: [DSPT-01]

duration: 6 min
completed: 2026-05-10
---

# Phase 09 Plan 01: Registry Timeout Policy Summary

**Registry-owned dispatch timeout policy with Chrome alarms safety guard and scoped adapter response timeout handling.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-10T06:44:09Z
- **Completed:** 2026-05-10T06:49:59Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added `dispatchTimeoutMs` and `adapterResponseTimeoutMs` to the adapter registry contract, with mock/openclaw/discord inheriting `30000` and `20000` defaults.
- Added `shared/adapters/dispatch-policy.ts` with `DEFAULT_DISPATCH_TIMEOUT_MS`, `DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS`, `resolveAdapterTimeouts`, and `withAdapterResponseTimeout`.
- Updated `background/dispatch-pipeline.ts` to use registry-derived alarm delay and map adapter response timeout to `TIMEOUT` with `retriable: true`.
- Replaced the whole-pipeline `setTimeout` ban with an auditable scoped assertion that permits only `withAdapterResponseTimeout`.

## Task Commits

Each task was handled atomically:

1. **Task 1: RED — Add failing timeout policy tests** - `6e356a4` (test)
2. **Task 2: GREEN — Implement registry timeout policy and pipeline wiring** - `1cb5cf7` (feat)
3. **Task 3: REFACTOR — Keep timeout exception auditable** - no code changes needed; verification passed after GREEN

**Plan metadata:** pending at summary creation

_Note: This TDD plan produced the required RED and GREEN commits; REFACTOR was a verified no-op._

## Files Created/Modified

- `shared/adapters/dispatch-policy.ts` - Defines timeout defaults, resolver guard, timeout error type, and scoped adapter response timeout wrapper.
- `tests/unit/dispatch/timeout-config.spec.ts` - Covers defaults, explicit overrides, and `29999` minimum guard failure.
- `tests/unit/dispatch/adapter-response-timeout.spec.ts` - Covers hung adapter response mapping to `TIMEOUT` and `retriable: true`.
- `shared/adapters/types.ts` - Adds optional registry timeout policy fields.
- `background/dispatch-pipeline.ts` - Reads resolved timeout policy and uses it for alarm delay and adapter response wait.
- `tests/unit/dispatch/dispatch-timeout.spec.ts` - Narrows service-worker timer discipline around the D-113 exception.

## Decisions Made

- Followed D-111..D-114 exactly: timeout policy is registry-owned, current adapters inherit defaults, invalid dispatch timeout fails via resolver/tests, and timeout UX remains `TIMEOUT` + retriable.
- Kept `DISPATCH_TIMEOUT_MINUTES` as a derived compatibility export for existing tests, not as the source of policy.
- Did not modify `shared/adapters/registry.ts`; omitted overrides intentionally preserve defaults for all current adapters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing local dependencies before test execution**
- **Found during:** Task 1 (RED — Add failing timeout policy tests)
- **Issue:** `pnpm test` failed because `node_modules` was absent in the isolated worktree (`vitest: command not found`).
- **Fix:** Ran `pnpm install` so the planned Vitest/typecheck/build commands could execute.
- **Files modified:** none tracked
- **Verification:** RED and subsequent GREEN/REFACTOR verification commands executed successfully after install.
- **Committed in:** not applicable; no tracked file changes

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to execute planned automated verification. No product scope change.

## Issues Encountered

- RED commit initially failed the pre-commit typecheck because tests imported a not-yet-created helper. Added a typecheck-safe stub for `shared/adapters/dispatch-policy.ts` in the RED commit so hooks could run while tests still failed for missing behavior.

## Verification

- `pnpm test -- tests/unit/dispatch/timeout-config.spec.ts tests/unit/dispatch/adapter-response-timeout.spec.ts tests/unit/dispatch/dispatch-timeout.spec.ts` — passed
- `pnpm typecheck` — passed
- `pnpm test && pnpm typecheck && pnpm lint && pnpm test:i18n-coverage` — passed
- `pnpm build` — passed

## TDD Gate Compliance

- RED gate: `6e356a4` (`test(09-01): add failing tests for registry timeout policy`)
- GREEN gate: `1cb5cf7` (`feat(09-01): move dispatch timeouts into registry policy`)
- REFACTOR gate: no code changes needed; verification passed

## Known Stubs

None. Stub-pattern scan found only a legitimate null guard in `background/dispatch-pipeline.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 09 Plan 02 to generalize logged-out URL detection with `loggedOutPathPatterns`.

## Self-Check: PASSED

- Found `shared/adapters/dispatch-policy.ts`
- Found `tests/unit/dispatch/timeout-config.spec.ts`
- Found `tests/unit/dispatch/adapter-response-timeout.spec.ts`
- Found RED commit `6e356a4`
- Found GREEN commit `1cb5cf7`

---
*Phase: 09-dispatch-robustness*
*Completed: 2026-05-10*
