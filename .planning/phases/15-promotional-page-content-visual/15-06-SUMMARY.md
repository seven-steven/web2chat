---
phase: 15-promotional-page-content-visual
plan: 06
subsystem: marketing-gap-closure
tags:
  - marketing
  - locale-toggle
  - layout-rhythm
  - uat-gap-closure
requires:
  - 15-03
  - 15-05
provides:
  - above-the-fold locale toggle discoverability
  - unified readable width rhythm across all page sections
affects:
  - apps/marketing/src/app.tsx
  - apps/marketing/src/data/site-content.ts
  - apps/marketing/src/i18n/locales/en.json
  - apps/marketing/src/i18n/locales/zh_CN.json
  - tests/unit/marketing/app-sections.spec.tsx
tech-stack:
  added: []
  patterns:
    - Preact hero utility row (no navbar / no sticky chrome)
    - Vitest DOM regression for placement and width contract
key-files:
  created:
    - .planning/phases/15-promotional-page-content-visual/15-06-SUMMARY.md
  modified:
    - apps/marketing/src/app.tsx
    - apps/marketing/src/data/site-content.ts
    - apps/marketing/src/i18n/locales/en.json
    - apps/marketing/src/i18n/locales/zh_CN.json
    - tests/unit/marketing/app-sections.spec.tsx
key-decisions:
  - Locale toggle moved into a hero utility row (right-aligned text-link affordance) instead of a navbar/sticky header, honoring D-02's "no navigation system" constraint.
  - Hero inner container collapsed from max-w-4xl to max-w-3xl so it shares the same readable width rhythm as the seven SectionShell sections, closing the "two competing widths" gap.
  - Footer no longer carries the locale toggle; it now holds a single calm project tagline via a new getFooterTagline getter + footer.tagline locale key (64-key en/zh_CN parity preserved).
  - All public copy stays getter-driven; no hardcoded JSX strings; no shared design token edits; no new dependency.
requirements-completed:
  - MSG-01
  - MSG-03
  - PROOF-03
duration: ~10 min
completed: 2026-06-13
---

# Phase 15 Plan 06: Gap Closure — Above-the-fold Locale Toggle & Unified Width Summary

Closed the remaining Phase 15 subjective layout gap by relocating the locale toggle from a footer-only spot to an above-the-fold hero utility row, and collapsing the hero's inner width so the whole page reads with a single readable width rhythm — without changing the narrative order, CTA semantics, payload proof, or shared design tokens.

## Execution Summary

- **Start:** 2026-06-13T03:00:00Z
- **End:** 2026-06-13T03:07:27Z
- **Tasks:** 1/2 complete (Task 2 is a blocking human-verify checkpoint, pending)
- **Files modified:** 4 source/i18n files + 1 test file

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 RED | `f56d9da` | Added failing hero locale-toggle placement and width-rhythm regression. |
| Task 1 GREEN | `332d069` | Moved locale toggle above the fold into a hero utility row and unified hero width to max-w-3xl. |

## What Changed

### Above-the-fold locale toggle discoverability

- `apps/marketing/src/app.tsx`: the locale toggle is now rendered inside the Hero content block as the first element — a low-noise, right-aligned text-link button inside a `flex justify-end` utility row. It is keyboard-reachable, keeps its 44px min-height and accent focus ring, and preserves the existing "load dictionary first, then flip signal" locale-switch ordering (stale-dictionary regression guard from 15-01/15-03 intact).
- The footer no longer owns the locale toggle. The footer now carries a single calm project tagline line, so locale switching is no longer hidden behind a full page scroll.

### Unified readable width rhythm

- Hero inner container changed from `max-w-4xl` to `max-w-3xl`, matching the `width="3xl"` SectionShell contract used by the other seven sections. The page now reads with one consistent readable width instead of a wider hero band followed by narrower sections.
- The hero's desktop two-column grid (`md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]`), single-column narrative order, payload preview, single primary CTA, and platform chips are all preserved. The top-of-file comment was updated to reflect the new width contract.

### Getter-driven footer copy

- `apps/marketing/src/data/site-content.ts`: added `FooterContent` interface and `getFooterTagline()` getter so the new footer copy stays getter-driven (no hardcoded JSX strings).
- `apps/marketing/src/i18n/locales/en.json` + `zh_CN.json`: added `footer.tagline` key with locale-appropriate copy. en/zh_CN parity holds at 64/64 keys.

## Verification

| Check | Result |
|-------|--------|
| RED regression | `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` failed before implementation — 2 new tests failed (toggle not in hero; hero has no max-w-3xl). |
| Unit regression (GREEN) | `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` passed; full suite 58 files / 503 tests passed. |
| Typecheck | `pnpm typecheck` clean. |
| Lint | `pnpm lint` clean (incl. no-hardcoded-strings rule). |
| Marketing build | `pnpm site:build` succeeded (21 modules, index + zh_CN chunk). |
| Build verify | `pnpm site:verify` → `[verify:build] OK — marketing build output valid`. |
| Marketing i18n parity | en/zh_CN 64/64 keys, parity true. |

## TDD Gate Compliance

- RED gate: `test(15-06)` commit `f56d9da` — 2 of 3 new assertions failed against pre-implementation app.tsx (verified true RED; the third MSG-narrative assertion passed because hero content was unchanged).
- GREEN gate: `feat(15-06)` commit `332d069` — full 503-test suite passes.
- REFACTOR: not needed; GREEN is the minimal layout-refinement form and pre-commit prettier/eslint normalized formatting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking consistency] Hero top-of-file comment referenced retired max-w-4xl contract**
- **Found during:** Task 1 GREEN
- **Issue:** After collapsing the hero width, the file header comment still said "Hero (canvas, max-w-4xl)" — a doc/implementation mismatch introduced directly by this plan's change.
- **Fix:** Updated the comment to "Hero (canvas, max-w-3xl) — locale toggle (above the fold), single h1, primary CTA, payload preview".
- **Files modified:** apps/marketing/src/app.tsx
- **Commit:** `332d069`

**2. [Rule 2 - Missing critical functionality] Footer vacated by toggle removal needed a non-empty, getter-driven close line**
- **Found during:** Task 1 GREEN
- **Issue:** Removing the footer-only locale toggle left the footer empty. The plan allows a footer to remain but requires it not be the sole locale discovery point; an empty footer broke the editorial landing tone and the getter-driven copy contract.
- **Fix:** Added `FooterContent` interface + `getFooterTagline()` getter and a `footer.tagline` locale key (en/zh_CN), rendering a single calm tagline line. No new utility actions, no IA change.
- **Files modified:** apps/marketing/src/data/site-content.ts, en.json, zh_CN.json
- **Commit:** `332d069`

**Total deviations:** 2 handled.
**Impact:** No scope expansion; all planned source files and verification targets remain the same. No new dependency, no shared token edit, no navbar/sticky chrome introduced.

## Human Verification

Task 2 (`checkpoint:human-verify`, gate=blocking) is the closing step of this plan and remains **pending**. All automatable checks above pass; the final subjective taste approval of (1) above-the-fold locale discoverability and (2) unified width rhythm must be performed by a human in `pnpm site:preview`. This plan is not closed until that checkpoint is approved.

## Known Stubs

None — the hero utility row renders the real locale toggle button; the footer renders the real getter-driven tagline. No placeholder/empty-data surfaces.

## Threat Flags

No new security surface. T-15-G4 (hero copy/payload/CTA unchanged) and T-15-G5 (toggle moved into hero utility row with explicit no-navbar/no-anchor-menu/no-sticky-chrome discipline) are both satisfied — only layout and toggle placement changed, all public copy still flows through getters/i18n, no new network/auth/file surface. T-15-SC (no package install) holds: zero new dependency.

## Self-Check

- tests/unit/marketing/app-sections.spec.tsx — FOUND (contains the 15-06 hero locale-toggle describe block)
- apps/marketing/src/app.tsx — FOUND (hero renders `data-testid="locale-toggle"`, `max-w-3xl` hero container, footer tagline)
- Commit `f56d9da` — FOUND
- Commit `332d069` — FOUND

## Self-Check: PASSED
