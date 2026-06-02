---
phase: 15-promotional-page-content-visual
plan: 01
subsystem: ui
tags: [marketing, i18n, content, preact, vitest]
requires:
  - phase: 13-information-architecture-copy-sources
    provides: claims matrix, copy guardrails, and supported-platform truth
  - phase: 14-marketing-app-skeleton-build-isolation
    provides: marketing app scaffold and isolated build pipeline
provides:
  - typed marketing content getters for hero, payload, trust, limits, proof metadata, locale toggle, and CTA sections
  - bilingual locale data for the Phase 15 marketing narrative
  - regression coverage for content truth, locale parity, and placeholder removal
affects: [15-02, marketing app rendering, phase-16 verification]
tech-stack:
  added: []
  patterns: [interface-plus-getter marketing data layer, locale parity assertions, source-backed CTA and trust copy]
key-files:
  created: [tests/unit/marketing/site-content.spec.ts]
  modified:
    [
      apps/marketing/src/data/site-content.ts,
      apps/marketing/src/i18n/locales/en.json,
      apps/marketing/src/i18n/locales/zh_CN.json,
      apps/marketing/src/app.tsx,
    ]
key-decisions:
  - "Kept Phase 15 public copy in site-content getters instead of JSX literals so later sections consume one audited source."
  - "Used the repository root and README installation anchor as explicit CTA targets in the data layer for deterministic testing."
  - "Adapted app.tsx to the new HeroContent shape and removed the obsolete nextPhase dependency to keep typecheck green during the intermediate plan stage."
patterns-established:
  - "Marketing content truth lives in typed getters backed by flat locale keys."
  - "Locale parity and placeholder removal are enforced in unit tests before visual assembly work."
requirements-completed: [MSG-01, MSG-02, MSG-03, PROOF-01, CTA-01, CTA-02, TRUST-01, TRUST-02]
duration: 10 min
completed: 2026-06-02
---

# Phase 15 Plan 01: Promotional page content data layer summary

**Typed bilingual marketing content getters for hero, payload proof, trust facts, risk labels, and CTA targets backed by unit and i18n coverage tests**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-02T12:29:00Z
- **Completed:** 2026-06-02T12:39:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Replaced the skeleton-only marketing data model with typed getters covering all planned public content sections.
- Added complete `en` / `zh_CN` marketing locale keys for hero, use cases, payload, platforms, flow, trust, limits, proof metadata, locale toggle, and CTA copy.
- Added regression tests that lock payload field order, shipped platform truth, trust wording boundaries, CTA URLs, locale parity, and removal of `nextPhase.*` placeholders.

## Task Commits

Each task was committed atomically:

1. **Task 1: 先写 site-content RED 测试再实现 marketing content getter 与双语数据** - `e46b014` (test), `c0851d9` (feat)
2. **Task 2: 补跑 i18n coverage 锁住 locale parity** - `4dbf44b` (test)

## Files Created/Modified
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a9553626ff40a7f86/tests/unit/marketing/site-content.spec.ts` - Locks marketing content truth, locale parity, and placeholder removal.
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a9553626ff40a7f86/apps/marketing/src/data/site-content.ts` - Exposes typed getters for all Phase 15 public marketing data.
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a9553626ff40a7f86/apps/marketing/src/i18n/locales/en.json` - Adds complete English marketing copy for the data layer.
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a9553626ff40a7f86/apps/marketing/src/i18n/locales/zh_CN.json` - Adds complete Simplified Chinese marketing copy with key parity.
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a9553626ff40a7f86/apps/marketing/src/app.tsx` - Adjusts the temporary marketing shell to the new getter shapes and removes `getNextPhase()` usage.

## Decisions Made
- Keep `site-content.ts` on the existing `interface + getter + t()` pattern and expand it instead of introducing nested config objects or JSX literals.
- Treat Telegram risk wording, production permission wording, and CTA destinations as testable data-layer truths rather than visual-only copy.
- Remove the obsolete placeholder locale surface from the contract now so later UI plans cannot accidentally render `nextPhase.*` fallback keys.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Linked worktree test dependencies and generated WXT metadata access**
- **Found during:** Task 1 (RED/GREEN verification)
- **Issue:** The isolated worktree lacked accessible `node_modules`, `apps/marketing/node_modules`, and `.wxt` paths, so `pnpm test` could not start and Vitest could not resolve the generated TypeScript base config.
- **Fix:** Temporarily linked the worktree to the main checkout's dependency and `.wxt` directories, ran verification, then removed the temporary links before completion.
- **Files modified:** None tracked
- **Verification:** `pnpm test -- tests/unit/marketing/site-content.spec.ts`, `pnpm typecheck`
- **Committed in:** not committed (environment-only unblock)

**2. [Rule 3 - Blocking] Updated the temporary marketing app shell to match the new content API**
- **Found during:** Task 1 pre-commit typecheck
- **Issue:** `apps/marketing/src/app.tsx` still imported `getNextPhase()` and expected `hero.cta`, which broke typecheck after the data layer was expanded.
- **Fix:** Switched the shell to `getLocaleToggle()`, used `hero.primaryCta`, and removed the obsolete `getNextPhase()` dependency so the codebase remained type-safe.
- **Files modified:** `apps/marketing/src/app.tsx`
- **Verification:** `pnpm typecheck`
- **Committed in:** `c0851d9`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required to complete the planned task safely in the worktree and keep the repository type-safe. No scope creep.

## Issues Encountered
- Pre-commit hooks surfaced a type mismatch from the old marketing placeholder shell after the data API changed; fixing the shell immediately resolved the blocker.
- Worktree-local dependency resolution required temporary symlinks because the isolated checkout did not initially expose generated WXT metadata or package binaries.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The marketing app now has a single audited data source for all public content claims.
- Phase 15-02 can focus on visual section assembly and mockup components without inventing new copy or platform truth.
- No blockers remain for the next plan.

## Self-Check: PASSED
- Verified summary target exists: `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a9553626ff40a7f86/.planning/phases/15-promotional-page-content-visual/15-01-SUMMARY.md`
- Verified task commits exist: `e46b014`, `c0851d9`, `4dbf44b`

---
*Phase: 15-promotional-page-content-visual*
*Completed: 2026-06-02*
