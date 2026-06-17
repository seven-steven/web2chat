---
phase: 15-promotional-page-content-visual
plan: 05
subsystem: marketing-gap-closure
tags:
  - marketing
  - cta
  - uat-gap-closure
requires:
  - 15-03
  - 15-04
provides:
  - stable external-link CTA semantics
  - local marketing visual softening
affects:
  - apps/marketing/src/components/cta-button.tsx
  - apps/marketing/src/app.tsx
  - tests/unit/marketing/app-sections.spec.tsx
tech-stack:
  added: []
  patterns:
    - Preact CTA primitive
    - Vitest DOM regression
key-files:
  created:
    - .planning/phases/15-promotional-page-content-visual/15-05-SUMMARY.md
  modified:
    - apps/marketing/src/components/cta-button.tsx
    - apps/marketing/src/app.tsx
    - tests/unit/marketing/app-sections.spec.tsx
key-decisions:
  - CTA reliability is enforced in the shared CtaButton primitive with target/rel/data-testid semantics rather than per-section ad hoc anchors.
  - Visual softening stays local to marketing app class composition; shared design tokens remain unchanged.
requirements-completed:
  - PROOF-03
  - CTA-01
  - CTA-02
duration: 8 min
completed: 2026-06-13
---

# Phase 15 Plan 05: Gap Closure Summary

Closed the remaining Phase 15 UAT gaps by hardening marketing CTA external-link semantics, adding regression coverage for all three CTA instances, and softening local marketing page presentation without changing shared design tokens.

## Execution Summary

- **Start:** 2026-06-13T00:25:00+08:00
- **End:** 2026-06-13T00:33:00+08:00
- **Tasks:** 2/2 complete
- **Files modified:** 3 source/test files

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| RED | `346c07f` | Added failing CTA external-link regression for Hero primary, footer primary, and footer secondary CTAs. |
| GREEN | `6a969e1` | Added explicit CTA external-link semantics and local marketing visual softening. |

## What Changed

### CTA external-link contract

- `apps/marketing/src/components/cta-button.tsx` now renders GitHub CTA anchors with:
  - `target="_blank"`
  - `rel="noopener noreferrer"`
  - optional stable `data-testid`
- `apps/marketing/src/app.tsx` assigns stable hooks:
  - `hero-primary-cta`
  - `footer-primary-cta`
  - `footer-secondary-cta`
- `tests/unit/marketing/app-sections.spec.tsx` asserts href, target, rel, labels, and stable hooks for all three visible CTAs.

### Marketing-local visual softening

- Softened the Hero payload preview surface using local border/ring/shadow composition.
- Softened repeated section cards with local `color-mix(...)` surface and lower-weight borders.
- Softened the bottom CTA band with local border, transparent accent-soft mix, and lighter shadow.
- Did not modify `shared/styles/design-tokens.css`.

## Verification

| Check | Result |
|-------|--------|
| RED regression | `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` failed before implementation because CTA test hooks were missing. |
| Typecheck | `pnpm typecheck` passed. |
| Unit regression | `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` passed: 58 files / 500 tests. |
| Marketing build | `pnpm site:build` passed. |
| Preview smoke | `pnpm site:preview` served `http://localhost:4173/`. |
| Browser CTA semantics | Playwright confirmed all three CTA anchors have expected href, `_blank`, `noopener noreferrer`, and clickable 44px+ boxes. |
| Visual capture | Full-page screenshot captured as `phase15-05-marketing-page.png` for review. |

## Human Verification

Auto-verifiable browser checks passed for link semantics and clickability. Full subjective visual approval remains a human judgment; the implementation intentionally narrowed the visual change to Hero preview, repeated cards, and CTA band per the UAT diagnosis.

## Deviations from Plan

- The initially spawned worktree executor halted at its branch namespace guard because the Agent tool did not create a `worktree-agent-*` branch in this runtime. The orchestrator executed the small 2-task gap-closure plan on the main working tree instead, preserving the same RED→GREEN verification gates.
- `CtaButtonProps.testId` is optional rather than required so existing component-focused tests can continue rendering `CtaButton` directly without synthetic test IDs. Page-level CTA instances still provide stable hooks and are covered by regression tests.

**Total deviations:** 2 handled.  
**Impact:** No scope expansion; all planned source files and verification targets remain the same.

## Self-Check: PASSED

- CTA gap covered: Hero primary, footer primary, and footer secondary links expose stable external-link semantics.
- Visual gap covered locally without shared token edits.
- Automated checks pass.
- Summary created after production commits.

## Next Phase Readiness

Phase 15 is ready for verification rerun and UAT review of the captured visual result.
