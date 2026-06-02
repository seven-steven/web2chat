---
phase: 15-promotional-page-content-visual
plan: 2
subsystem: ui
tags: [marketing, preact, tailwind, vitest, accessibility]
requires:
  - phase: 15-01
    provides: marketing site-content data layer and locale copy contract
provides:
  - reusable marketing section shell and CTA button primitives
  - proof mockup components with explicit mockup metadata labels
  - fixed-order three-step flow component and regression coverage
affects: [15-03, marketing-page-assembly, proof-modules]
tech-stack:
  added: []
  patterns: [typed marketing component props, explicit proof metadata labels, fixed-order stepper]
key-files:
  created:
    - apps/marketing/src/components/section-shell.tsx
    - apps/marketing/src/components/cta-button.tsx
    - apps/marketing/src/components/proof/asset-label.tsx
    - apps/marketing/src/components/proof/popup-mockup.tsx
    - apps/marketing/src/components/proof/target-mockup.tsx
    - apps/marketing/src/components/flow/stepper.tsx
    - tests/unit/marketing/proof-labels.spec.tsx
  modified: []
key-decisions:
  - "Proof metadata labels stay explicit props so mockup/source/status/version wording can remain source-backed and app-level i18n controlled."
  - "Stepper semantics are fixed to capture → choose target → send to chat, with layout changing only through utility classes."
  - "CTAButton exposes one shared visual contract for hero and footer CTAs while keeping link semantics."
patterns-established:
  - "Marketing proof components accept structured data props from site-content instead of fetching content themselves."
  - "Proof surfaces must render a visible mockup badge plus source/status/version metadata row."
requirements-completed: [PROOF-02, PROOF-03, CTA-01, CTA-02]
duration: 128 min
completed: 2026-06-02
---

# Phase 15 Plan 2: 宣传页共享展示组件 Summary

**Reusable marketing proof primitives with explicit mockup metadata, fixed-order flow stepper, and shared CTA styling for hero/footer assembly**

## Performance

- **Duration:** 128 min
- **Started:** 2026-06-02T10:49:00Z
- **Completed:** 2026-06-02T12:57:37Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added reusable `SectionShell` and `CTAButton` primitives for the promotional page section and CTA contract.
- Built popup/target proof mockups plus `AssetLabel` so every proof surface visibly declares `mockup` and `source/status/version` metadata.
- Added a fixed-order `Stepper` and regression tests covering CTA variants, proof labels, and payload field ordering.

## Task Commits

Each task was committed atomically:

1. **Task 1: 先写 proof-labels RED 测试再实现共享组件与 proof mockup** - `4bb87ee` (test)
2. **Task 1: 先写 proof-labels RED 测试再实现共享组件与 proof mockup** - `b509725` (feat)
3. **Task 2: 补跑 typecheck 锁住新组件接口** - `4656129` (refactor)

## Files Created/Modified
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a19465b23463f1211/apps/marketing/src/components/section-shell.tsx` - lightweight section band wrapper with width/tone/title props
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a19465b23463f1211/apps/marketing/src/components/cta-button.tsx` - shared primary/secondary CTA link styling contract
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a19465b23463f1211/apps/marketing/src/components/proof/asset-label.tsx` - visible mockup badge plus source/status/version metadata row
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a19465b23463f1211/apps/marketing/src/components/proof/popup-mockup.tsx` - structured payload proof mockup with fixed field ordering hooks
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a19465b23463f1211/apps/marketing/src/components/proof/target-mockup.tsx` - target chat proof surface with delivery-state framing
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a19465b23463f1211/apps/marketing/src/components/flow/stepper.tsx` - fixed three-step flow component with responsive layout classes
- `/Users/seven/data/coding/projects/seven/web2chat/.claude/worktrees/agent-a19465b23463f1211/tests/unit/marketing/proof-labels.spec.tsx` - regression coverage for proof primitives and CTA contract

## Decisions Made
- Proof metadata labels were pushed into props rather than hardcoded into components so later app assembly can keep wording i18n-safe and source-backed.
- `CTAButton` was kept as an anchor-based primitive with shared focus ring and minimum height, matching the plan’s hero/footer reuse goal without introducing runtime state.
- The stepper sorts by the approved key order instead of trusting caller order, satisfying the threat-model mitigation for step tampering.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed workspace dependencies inside the worktree**
- **Found during:** Task 1 (RED verification)
- **Issue:** `pnpm test -- tests/unit/marketing/proof-labels.spec.tsx` failed because `vitest` was unavailable and the worktree had no `node_modules`.
- **Fix:** Ran `pnpm install --frozen-lockfile` in the worktree, then resumed the TDD cycle.
- **Files modified:** none tracked
- **Verification:** `pnpm test -- tests/unit/marketing/proof-labels.spec.tsx`, `pnpm typecheck`
- **Committed in:** none (environment-only fix)

**2. [Rule 1 - Bug] Fixed stepper key typing before the RED commit hook**
- **Found during:** Task 1 (RED commit attempt)
- **Issue:** pre-commit `pnpm typecheck` failed because `Map.get` inferred overly narrow key types for `FlowStep.key`.
- **Fix:** Added an explicit `StepKey` union and fallback ordering for unknown keys.
- **Files modified:** `apps/marketing/src/components/flow/stepper.tsx`
- **Verification:** `pnpm test -- tests/unit/marketing/proof-labels.spec.tsx`, `pnpm typecheck`
- **Committed in:** `b509725`

**3. [Rule 2 - Missing Critical] Removed hardcoded user-facing strings from shared proof components**
- **Found during:** Task 1 / Task 2 commit hooks
- **Issue:** hardcoded labels in tests/components violated the project i18n enforcement and would have leaked non-localized copy into reusable UI primitives.
- **Fix:** Moved source/status/version/helper labels into component props and updated tests to pass them explicitly.
- **Files modified:** `apps/marketing/src/components/proof/asset-label.tsx`, `apps/marketing/src/components/proof/popup-mockup.tsx`, `apps/marketing/src/components/proof/target-mockup.tsx`, `tests/unit/marketing/proof-labels.spec.tsx`
- **Verification:** `pnpm test -- tests/unit/marketing/proof-labels.spec.tsx`, `pnpm typecheck`
- **Committed in:** `b509725`, `4656129`

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical)
**Impact on plan:** All fixes were required to satisfy repo-wide test/type/i18n gates. No scope creep beyond the planned component layer.

## Issues Encountered
- Pre-commit hooks surfaced type and i18n enforcement issues earlier than manual review; both were resolved within the planned component/test files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `app.tsx` can now assemble the eight required marketing sections from stable section/CTA/proof/flow primitives.
- The next plan should wire locale-backed labels into these components and replace the current app skeleton.

## Self-Check: PASSED
- Summary file exists.
- Commits `4bb87ee`, `b509725`, and `4656129` exist in git history.
- No known stubs were found in the created marketing component files.
- No new threat flags beyond the planned proof/CTA/stepper surface were introduced.

---
*Phase: 15-promotional-page-content-visual*
*Completed: 2026-06-02*
