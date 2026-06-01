---
phase: 09-dispatch-robustness
plan: 02
subsystem: dispatch
tags: [mv3, adapter-registry, login-detection, vitest, tdd]

requires:
  - phase: 09-dispatch-robustness
    provides: registry timeout policy and dispatch-policy helper module from plan 09-01
provides:
  - adapter-owned loggedOutPathPatterns contract
  - pure pathname-only logged-out URL helper
  - dispatch pipeline login remap centralized through one helper
affects: [phase-09-dispatch-robustness, future-adapters, dispatch-pipeline]

tech-stack:
  added: []
  patterns:
    - registry-owned URL login policy
    - pathname-only exact/trailing-star path matching
    - one helper for tab complete, SPA, sendMessage failure, and INPUT_NOT_FOUND remap

key-files:
  created:
    - tests/unit/dispatch/logged-out-paths.spec.ts
  modified:
    - shared/adapters/types.ts
    - shared/adapters/registry.ts
    - shared/adapters/dispatch-policy.ts
    - background/dispatch-pipeline.ts
    - tests/unit/dispatch/login-detection.spec.ts

key-decisions:
  - "Kept URL-layer login remap disabled for OpenClaw and unconfigured platforms."
  - "Used exact pathname match plus trailing '*' prefix semantics without RegExp or URLPattern."
  - "Centralized pipeline URL login remaps through isLoggedOutUrlForAdapter."

patterns-established:
  - "AdapterRegistryEntry may define loggedOutPathPatterns; missing patterns mean no URL-layer login remap."
  - "isLoggedOutUrlForAdapter parses actualUrl, requires adapter host match, and compares only URL.pathname."

requirements-completed: [DSPT-02]

duration: 5 min
completed: 2026-05-10
---

# Phase 09 Plan 02: Logged-Out Path Policy Summary

**Registry-owned logged-out URL detection using pathname patterns, eliminating generic same-host non-match login remaps.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-10T10:36:22Z
- **Completed:** 2026-05-10T10:41:14Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added `loggedOutPathPatterns` to `AdapterRegistryEntry` and configured Discord with `['/', '/login*', '/register*']`.
- Added `pathMatches` and `isLoggedOutUrlForAdapter` to `shared/adapters/dispatch-policy.ts` with pathname-only exact/trailing-star semantics.
- Replaced dispatch pipeline login remap branches with the shared helper across tab complete, SPA advancement, sendMessage failure diagnostics, and `INPUT_NOT_FOUND` remap.
- Added regression tests proving OpenClaw/unconfigured platforms do not perform URL-layer login remap.

## Task Commits

Each TDD gate was handled atomically:

1. **Task 1: RED — Add failing logged-out path tests** - `5d2bd00` (test)
2. **Task 2: GREEN — Implement pathname-only login remap helper and wire pipeline** - `4079526` (feat)
3. **Task 3: REFACTOR — Remove drift-prone login branches** - no code changes needed; verification passed after GREEN

**Plan metadata:** pending at summary creation

_Note: This TDD plan produced the required RED and GREEN commits; REFACTOR was a verified no-op._

## Files Created/Modified

- `shared/adapters/types.ts` - Adds optional `loggedOutPathPatterns` to the adapter registry contract.
- `shared/adapters/registry.ts` - Configures Discord logged-out path patterns and leaves OpenClaw/mock unconfigured.
- `shared/adapters/dispatch-policy.ts` - Exports `pathMatches` and `isLoggedOutUrlForAdapter` alongside existing timeout policy helpers.
- `background/dispatch-pipeline.ts` - Uses `isLoggedOutUrlForAdapter` for all URL-layer login remaps.
- `tests/unit/dispatch/logged-out-paths.spec.ts` - Covers pure helper positive/negative cases and unconfigured platforms.
- `tests/unit/dispatch/login-detection.spec.ts` - Covers tab complete, SPA advancement, `INPUT_NOT_FOUND`, and OpenClaw non-remap behavior.

## Decisions Made

- Followed D-115 by supporting only exact path strings and trailing `*` prefix semantics; no `RegExp` or `URLPattern` introduced.
- Followed D-116/D-117 by removing generic same-host `!adapter.match(actualUrl)` remap behavior.
- Followed D-118 by using `isLoggedOutUrlForAdapter(adapter, actualUrl)` as the single pipeline URL-login policy call pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing local dependencies before test execution**
- **Found during:** Task 1 (RED — Add failing logged-out path tests)
- **Issue:** `pnpm test` failed because `node_modules` was absent in the isolated worktree (`vitest: command not found`).
- **Fix:** Ran `pnpm install` so planned Vitest/typecheck/build commands could execute.
- **Files modified:** none tracked
- **Verification:** RED and subsequent GREEN/REFACTOR/full verification commands executed successfully after install.
- **Committed in:** not applicable; no tracked file changes

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to execute planned automated verification. No product scope change.

## Issues Encountered

- The first RED commit attempt failed the pre-commit typecheck because tests referenced the future `loggedOutPathPatterns` field directly. Adjusted the RED tests to use typecheck-safe future-contract casts while preserving failing runtime assertions for missing policy behavior.

## Verification

- `pnpm test -- tests/unit/dispatch/logged-out-paths.spec.ts tests/unit/dispatch/login-detection.spec.ts` — failed in RED for missing `loggedOutPathPatterns` and helper exports, then passed in GREEN/REFACTOR.
- `pnpm test -- tests/unit/dispatch/logged-out-paths.spec.ts tests/unit/dispatch/login-detection.spec.ts && pnpm typecheck` — passed.
- Acceptance grep: `shared/adapters/types.ts` contains `readonly loggedOutPathPatterns?: readonly string[]`; `shared/adapters/registry.ts` contains Discord `loggedOutPathPatterns: ['/', '/login*', '/register*']`; `background/dispatch-pipeline.ts` contains no executable `!adapter.match(actualUrl)` login-remap condition.
- `pnpm test && pnpm typecheck && pnpm lint && pnpm test:i18n-coverage && pnpm build` — passed.

## TDD Gate Compliance

- RED gate: `5d2bd00` (`test(09-02): add failing tests for logged-out path policy`)
- GREEN gate: `4079526` (`feat(09-02): generalize logged-out URL detection`)
- REFACTOR gate: no code changes needed; verification passed

## Known Stubs

None. Stub-pattern scan found only legitimate null/default test values and an existing `target_tab_id === null` guard.

## Threat Flags

None. The new trust-boundary behavior was already covered by the plan threat model T-09-02-01 through T-09-02-04.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 09 Plan 03+ orchestration review; note this worktree intentionally did not update `STATE.md` or `ROADMAP.md` because the orchestrator owns those writes after merge.

## Self-Check: PASSED

- Found `tests/unit/dispatch/logged-out-paths.spec.ts`
- Found RED commit `5d2bd00`
- Found GREEN commit `4079526`
- Confirmed `STATE.md` and `ROADMAP.md` were not modified

---
*Phase: 09-dispatch-robustness*
*Completed: 2026-05-10*
