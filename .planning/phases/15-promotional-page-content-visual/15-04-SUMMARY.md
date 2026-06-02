---
phase: 15-promotional-page-content-visual
plan: 4
subsystem: testing
tags: [marketing, vite, vitest, readme, smoke-verifier]
requires:
  - phase: 15-01
    provides: marketing content data and CTA targets
  - phase: 15-02
    provides: proof metadata labels and mockup components
  - phase: 15-03
    provides: final promotional page composition
provides:
  - final marketing smoke verifier that asserts shipped page claims in built output
  - regression coverage for proof labels, platform truths, and CTA targets
  - stable README installation anchor for the marketing secondary CTA
affects: [phase-15-verification, marketing-release, readme-anchors]
tech-stack:
  added: []
  patterns: [build-output smoke verification, README anchor verification, task-level TDD for verifier hardening]
key-files:
  created: []
  modified:
    - apps/marketing/scripts/verify-build.mjs
    - tests/unit/scripts/marketing-verify-build.spec.ts
    - README.md
key-decisions:
  - "Smoke verification inspects built marketing JS bundles plus index.html because Vite renders page copy into compiled assets rather than raw HTML."
  - "The install CTA keeps the existing README heading and adds an explicit Chinese anchor so the published marketing link stays stable."
patterns-established:
  - "Verifier pattern: keep assertBuildOutput as a pure function and accumulate missing built-output markers into errors."
  - "CTA docs pattern: README install targets should expose explicit anchors when marketing links depend on them."
requirements-completed: [PROOF-03, CTA-02, TRUST-01, TRUST-02]
duration: 21 min
completed: 2026-06-02
---

# Phase 15 Plan 4: Promotional Page Final Verification Summary

**Built-output smoke verification for the marketing landing page, backed by README install-anchor stability and proof/CTA regression coverage.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-06-02T21:13:00+08:00
- **Completed:** 2026-06-02T21:34:00+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Upgraded the marketing verifier from filesystem-only checks to built-output claim checks for hero copy, proof labeling, platform truth, known-risk wording, and CTA targets.
- Added RED/GREEN coverage that reproduces missing final-page smoke markers and locks the built-bundle verification contract.
- Added a stable `#安装` anchor to `README.md` so the marketing install CTA resolves through the existing README verifier.

## Task Commits

Each task was committed atomically:

1. **Task 1: 扩展 marketing build verifier 到最终页面 smoke 断言** - `fd41f83` (test), `a78aaab` (feat), `7e8577a` (fix)
2. **Task 2: 固化 README 安装入口与最终验证命令闭环** - `3204a30` (docs)

## Files Created/Modified
- `apps/marketing/scripts/verify-build.mjs` - Validates built marketing output markers instead of only checking dist existence.
- `tests/unit/scripts/marketing-verify-build.spec.ts` - Covers missing-marker failure paths and successful built-output smoke assertions.
- `README.md` - Adds an explicit installation anchor for the marketing secondary CTA.

## Decisions Made
- Used built bundle text as the smoke-verification source of truth because the final Vite output does not preserve section data attributes in `dist/index.html`.
- Kept `package.json` scripts unchanged because all required Phase 15 verification entry points already existed and were verifiably present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Switched smoke verification from raw HTML markers to built-output markers**
- **Found during:** Task 1 (扩展 marketing build verifier 到最终页面 smoke 断言)
- **Issue:** The first implementation checked raw `dist/index.html` for section/data-label markers, but the actual Vite build emits user-facing content into bundled JS assets, causing `site:verify` to fail against a correct build.
- **Fix:** Updated the verifier to aggregate `index.html` plus built JS assets and assert stable rendered claims/CTA targets instead of source-only attributes.
- **Files modified:** `apps/marketing/scripts/verify-build.mjs`, `tests/unit/scripts/marketing-verify-build.spec.ts`
- **Verification:** `pnpm test -- tests/unit/scripts/marketing-verify-build.spec.ts`, `pnpm site:build`, `pnpm site:verify`
- **Committed in:** `7e8577a`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correction to make the smoke gate validate the real production artifact rather than source-shape assumptions. No scope creep.

## Issues Encountered
- Initial verifier assumptions matched source JSX structure but not Vite production output. Resolved by validating stable built-text markers instead of raw authoring attributes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 15 now has a passing final verification loop covering README anchors, manifest truth, i18n coverage, full tests, site build, and site smoke verification.
- Ready for orchestrator-owned verification and tracking writes without further code changes.

## Verification Results
- `pnpm test -- tests/unit/scripts/marketing-verify-build.spec.ts` — PASS
- `pnpm verify:readme` — PASS
- `pnpm lint` — PASS
- `pnpm typecheck` — PASS
- `pnpm test` — PASS
- `pnpm test:i18n-coverage` — PASS
- `pnpm site:build` — PASS
- `pnpm site:verify` — PASS
- `pnpm verify:manifest` — PASS

## Self-Check: PASSED
- Summary file exists at `.planning/phases/15-promotional-page-content-visual/15-04-SUMMARY.md`
- Commits found: `fd41f83`, `a78aaab`, `7e8577a`, `3204a30`

---
*Phase: 15-promotional-page-content-visual*
*Completed: 2026-06-02*
