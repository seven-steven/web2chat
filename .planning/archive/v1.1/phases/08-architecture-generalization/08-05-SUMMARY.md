---
phase: 08-architecture-generalization
plan: 05
subsystem: architecture
tags: [bundle-isolation, sw-discipline, adapter-pattern, chrome-mv3]

# Dependency graph
requires:
  - phase: 08-01..08-04
    provides: adapter registry, dispatch pipeline, popup UI, discord adapter
provides:
  - Popup bundle free of MAIN-world injector code
  - setTimeout-free dispatch pipeline (SW discipline)
  - Exception-safe handleConfirm with real retry behavior
  - Explicit requiresDynamicPermission field on adapter entries
  - All CR/WR/IN code review findings closed
affects: [09-dispatch-robustness, 10-slack-adapter]

# Tech tracking
tech-stack:
  added: []
patterns:
  - "Manual map pattern for SW-only injector registry (not auto-discovery from shared entries)"
  - "requiresDynamicPermission boolean sentinel on AdapterRegistryEntry"
  - "chrome.alarms as sole timeout mechanism in dispatch pipeline"

key-files:
  created: []
  modified:
    - shared/adapters/registry.ts
    - shared/adapters/types.ts
    - background/main-world-registry.ts
    - background/dispatch-pipeline.ts
    - background/injectors/discord-main-world.ts
    - entrypoints/popup/components/SendForm.tsx
    - entrypoints/popup/App.tsx
    - entrypoints/discord.content.ts
    - shared/storage/repos/dispatch.ts
    - tests/unit/dispatch/dispatch-timeout.spec.ts
    - tests/unit/popup/permission-deny.spec.ts

key-decisions:
  - "Manual map in main-world-registry.ts over auto-discovery -- prevents shared/ from ever importing background/"
  - "chrome.alarms as sole timeout (removed Promise.race+setTimeout) -- SW discipline per CLAUDE.md"
  - "requiresDynamicPermission explicit field over hostMatches.length===0 sentinel -- self-documenting"

patterns-established:
  - "SW-only injector wiring: shared registry has no injector references; background/main-world-registry.ts holds direct imports"
  - "Popup bundle isolation: grep popup-*.js for injector keywords must return empty"

requirements-completed: [ARCH-01, ARCH-02, ARCH-03, ARCH-04]

# Metrics
duration: 7min
completed: 2026-05-10
---

# Phase 8 Plan 05: Gap Closure Summary

**Close all Phase 8 verification and code review gaps: popup bundle isolation, SW setTimeout removal, exception-safe SendForm, real retry, and 7 low-risk findings**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-10T05:50:37Z
- **Completed:** 2026-05-10T05:57:41Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Popup production bundle contains zero MAIN-world injector code (DataTransfer, ClipboardEvent, mainWorldInjector references absent from popup chunks)
- Dispatch pipeline fully compliant with SW discipline -- no setTimeout, chrome.alarms as sole timeout
- SendForm.handleConfirm wraps all logic after setSubmitting(true) in single try/catch; retry button actually re-dispatches
- All 10 code review findings closed (CR-01, CR-02, CR-03, WR-01 through WR-05, IN-01, IN-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Popup bundle isolation (CR-01)** - `f65617d` (fix)
2. **Task 2: Critical runtime issues (CR-02, CR-03, WR-01)** - `92002b7` (fix)
3. **Task 3: Low-risk warnings and info findings (WR-02..WR-05, IN-01, IN-02)** - `1e154bf` (fix)

## Files Created/Modified

- `shared/adapters/registry.ts` - Removed background/ import and mainWorldInjector from discord entry
- `shared/adapters/types.ts` - Added requiresDynamicPermission field to AdapterRegistryEntry
- `background/main-world-registry.ts` - Rewritten to manual map pattern with direct import
- `background/dispatch-pipeline.ts` - Removed setTimeout, added exact-URL tab matching, global wildcard replace, requiresDynamicPermission check
- `background/injectors/discord-main-world.ts` - deleteContent -> deleteContentBackward
- `entrypoints/popup/components/SendForm.tsx` - try/catch wrap, real retry, requiresDynamicPermission
- `entrypoints/popup/App.tsx` - requiresDynamicPermission check
- `entrypoints/discord.content.ts` - Always-resolve port disconnect listener
- `shared/storage/repos/dispatch.ts` - Removed dead ACTIVE_KEY constant and guard
- `tests/unit/dispatch/dispatch-timeout.spec.ts` - Rewritten to verify no setTimeout in executable code
- `tests/unit/popup/permission-deny.spec.ts` - Updated to use requiresDynamicPermission

## Decisions Made

- **Manual map over auto-discovery for main-world-registry.ts**: The auto-discovery pattern (iterating adapterRegistry entries for mainWorldInjector) worked but created a latent risk -- anyone adding mainWorldInjector to a shared entry would re-introduce popup contamination. The manual map pattern forces explicit wiring in the SW-only module.
- **chrome.alarms as sole timeout**: The Promise.race+setTimeout pattern violated CLAUDE.md SW discipline. The existing 30s chrome.alarms backstop already covers timeout; sendMessage failures are caught by the catch block with login-redirect detection.
- **requiresDynamicPermission explicit field**: Replaces the implicit `hostMatches.length === 0` sentinel with a self-documenting boolean. Makes the intent clear at each call site.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 8 architecture generalization complete with all verification and review gaps closed
- Ready for Phase 9 (dispatch robustness) with clean popup bundle, SW-discipline-compliant pipeline, and exception-safe UI
- All 265 unit tests pass, TypeScript compiles clean, WXT builds clean

## Self-Check: PASSED

- All 9 modified source files verified present on disk
- All 3 task commit hashes (f65617d, 92002b7, 1e154bf) verified in git log
- 265 unit tests pass, TypeScript compiles clean, WXT builds clean

---
*Phase: 08-architecture-generalization*
*Completed: 2026-05-10*
