---
phase: 14-marketing-app-skeleton-build-isolation
plan: 3
subsystem: testing
tags: [vitest, tdd, build-verification, import-isolation, smoke-test]

# Dependency graph
requires:
  - phase: 14-02
    provides: marketing app skeleton with build pipeline and verify:build script stub
provides:
  - Unit-testable marketing build smoke verifier (assertBuildOutput)
  - BUILD-03 import-isolation regression test for marketing source
  - Root site:verify and app verify:build commands fully wired
affects: [14-04, phase-16-release-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "assertBuildOutput(distDir, errors) pure assertion pattern mirroring verify-manifest.ts"
    - "Source-scan isolation test pattern scanning import statements for forbidden tokens"

key-files:
  created:
    - tests/unit/scripts/marketing-verify-build.spec.ts
    - tests/unit/scripts/marketing-isolation.spec.ts
  modified:
    - apps/marketing/scripts/verify-build.mjs

key-decisions:
  - "Verifier exports assertBuildOutput for unit testing rather than being CLI-only"
  - "Isolation test uses globSync + readFileSync scan rather than ESLint import restriction"
  - "Isolation guard allows /shared/styles/ CSS and /public/icon/ assets as permitted cross-boundary references"

patterns-established:
  - "Marketing build verification: assertBuildOutput(distDir, errors) pure function + CLI guard"
  - "BUILD-03 isolation: source-scan pattern checking for forbidden import tokens"

requirements-completed: [BUILD-01, BUILD-02, BUILD-03]

# Metrics
duration: 4min
completed: 2026-06-02
---

# Phase 14 Plan 3: Marketing Build Verification & Isolation Tests Summary

**TDD-covered marketing build smoke verifier with BUILD-03 import-isolation regression guard, wired to app verify:build and root site:verify commands**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-02T00:28:42Z
- **Completed:** 2026-06-02T00:32:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Marketing build verifier checks D-13 invariants: dist/ exists, non-empty, and index.html present
- BUILD-03 import-isolation regression test scans marketing source for forbidden extension runtime imports (background/, content/adapters/, messaging, permissions, storage, service-worker)
- All 451 unit tests pass (55 files) with zero regressions
- End-to-end flow validated: `pnpm site:build && pnpm site:verify` exits 0

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1: Write failing tests** - `27d6fcc` (test) - RED phase
2. **Task 2: Implement verifier** - `00e6ec5` (feat) - GREEN phase

_Note: TDD tasks follow test (RED) then feat (GREEN) commit sequence._

## TDD Gate Compliance

- RED gate: `27d6fcc` test(14-03) commit exists with 4 failing verify-build tests
- GREEN gate: `00e6ec5` feat(14-03) commit exists with all tests passing
- No REFACTOR gate needed (implementation is minimal and clean)

## Files Created/Modified
- `tests/unit/scripts/marketing-verify-build.spec.ts` - 4 tests for assertBuildOutput (missing dist, empty dist, missing index.html, valid output)
- `tests/unit/scripts/marketing-isolation.spec.ts` - 4 tests for BUILD-03 import boundary (source scan, forbidden tokens, allowed tokens, coverage completeness)
- `apps/marketing/scripts/verify-build.mjs` - Rewritten with exported assertBuildOutput pure function and CLI entrypoint

## Decisions Made
- Verifier exports `assertBuildOutput(distDir, errors)` as a pure function for unit testing, matching the pattern from `scripts/verify-manifest.ts`
- Isolation test uses source-file scanning with globSync + readFileSync rather than ESLint import restrictions (simpler, no extra tooling dependency)
- Dynamic import in tests uses `@ts-expect-error` for the `.mjs` module to pass typecheck while keeping runtime resolution

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial test file used `@/../apps/marketing/...` path alias which failed Vite module resolution; switched to relative `../../../apps/marketing/...` path
- `globSync` with `absolute: true` option did not return absolute paths on Node 22; manually mapped with `resolve(marketingSrc, f)`
- Pre-commit typecheck hook rejected dynamic import of `.mjs` module; resolved with `@ts-expect-error` annotation

## Next Phase Readiness
- Marketing app has dedicated smoke verifier and BUILD-03 isolation guard
- Phase 15 (page content and visuals) can proceed with confidence that build pipeline is verified
- Phase 16 (release validation) can extend verification with Playwright E2E per D-15

## Self-Check: PASSED

- All 3 key files verified present
- Both TDD gate commits verified in git log (27d6fcc RED, 00e6ec5 GREEN)

---
*Phase: 14-marketing-app-skeleton-build-isolation*
*Completed: 2026-06-02*
