---
phase: 09-dispatch-robustness
plan: 05
subsystem: ui
tags: [preact, popup, dispatch, selector-warning, i18n, vitest, tdd]

requires:
  - phase: 09-dispatch-robustness
    provides: retriable retry flow from 09-03 and selector warning protocol from 09-04
provides:
  - Accessible low-confidence selector confirmation dialog
  - Popup rendering of needs_confirmation warning records
  - Fresh confirmed dispatch path with one-shot selectorConfirmation flag
  - Locale coverage for selector warning copy
  - Integrated retry and warning UI regression tests
affects: [phase-09-dispatch-robustness, popup-confirmation-ui, future-adapters]

tech-stack:
  added: []
  patterns:
    - Warning confirmation is popup-actionable UI, separate from ErrorBanner failure display
    - One-shot selectorConfirmation is sent only in fresh dispatch.start input
    - InProgressView remains mutually exclusive with warning and error UI

key-files:
  created:
    - entrypoints/popup/components/SelectorWarningDialog.tsx
    - tests/unit/popup/selector-warning-dialog.spec.tsx
  modified:
    - entrypoints/popup/App.tsx
    - entrypoints/popup/components/SendForm.tsx
    - locales/en.yml
    - locales/zh_CN.yml
    - tests/unit/popup/selector-warning-dialog.spec.tsx

key-decisions:
  - "Rendered SELECTOR_LOW_CONFIDENCE as a confirmation dialog instead of an ErrorBanner."
  - "Confirmed warning dispatches are started from current popup form values with a new dispatchId and one-shot selectorConfirmation."
  - "Reopened popup recovery scans session dispatch records for needs_confirmation when the active pointer has been cleared."

patterns-established:
  - "SelectorWarningDialog follows the existing ConfirmDialog focus trap, Escape, overlay cancel, and primary autofocus pattern."
  - "Popup warning state is cleared on cancel without setting dispatchError, preserving no-send semantics."

requirements-completed: [DSPT-04, DSPT-03]

duration: 7min
completed: 2026-05-10
---

# Phase 09 Plan 05: Low-Confidence Selector Confirmation UI Summary

**Popup low-confidence selector warnings now render as accessible pre-send confirmation dialogs and restart dispatch with a fresh one-shot confirmation payload.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-10T10:55:03Z
- **Completed:** 2026-05-10T11:01:52Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added exact UI-SPEC English and zh_CN selector warning locale keys with 100% i18n coverage.
- Added `SelectorWarningDialog` with `role="dialog"`, `aria-modal`, labelled/described content, Escape cancel, overlay cancel, focus trapping, and primary confirm autofocus.
- Wired popup `needs_confirmation` records to render the warning dialog mutually exclusively with `SendForm` and `InProgressView`.
- Implemented confirm/cancel behavior: cancel clears actionable warning without ErrorBanner; confirm starts a fresh dispatch with current form fields and `selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' }`.
- Added regression coverage proving warning UI is distinct from ErrorBanner, in-progress UI hides the warning dialog, and Phase 09 retry tests remain green.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Add popup warning dialog tests and i18n keys** - `a0de8e3` (test)
2. **Task 2: GREEN — Implement SelectorWarningDialog and wire warning state in App** - `dd58d06` (feat)
3. **Task 3: Verify integrated retry + warning UI coverage** - `4d70094` (test)

**Plan metadata:** pending at summary creation

## Files Created/Modified

- `entrypoints/popup/components/SelectorWarningDialog.tsx` - Accessible low-confidence warning confirmation dialog using i18n keys and existing dialog focus behavior.
- `entrypoints/popup/App.tsx` - Mounts `needs_confirmation` warning records, scans session records on reopen, clears warning on cancel, and starts confirmed dispatches with a new dispatchId.
- `entrypoints/popup/components/SendForm.tsx` - Keeps the current-form dispatch builder compatible with optional one-shot selector confirmation input.
- `locales/en.yml` - Adds exact English selector warning copy.
- `locales/zh_CN.yml` - Adds exact zh_CN selector warning copy.
- `tests/unit/popup/selector-warning-dialog.spec.tsx` - Covers dialog accessibility, Escape/overlay cancel, confirm action, non-ErrorBanner rendering, and in-progress mutual exclusion.

## Decisions Made

- Used a popup-local `SelectorWarningDialog` rather than adding a dependency or widening the options `ConfirmDialog` API.
- Kept `SELECTOR_LOW_CONFIDENCE` as warning UI, not an `ErrorCode`; no raw adapter/SW message is rendered.
- Used `dispatchRepo.listAll()` as reopen recovery because Plan 09-04 clears the active pointer when storing `needs_confirmation` records.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing local dependencies before test execution**
- **Found during:** Task 1 (Add popup warning dialog tests and i18n keys)
- **Issue:** `pnpm test` and `pnpm test:i18n-coverage` initially failed because `node_modules` was absent in the isolated worktree.
- **Fix:** Ran `pnpm install` so Vitest, tsx, typecheck, lint, and WXT-generated types were available.
- **Files modified:** none tracked
- **Verification:** All planned test/type/lint/i18n commands passed after install.
- **Committed in:** not applicable; no tracked file changes

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required only to run planned verification; no product scope change.

## Issues Encountered

- The RED dialog test intentionally failed before `SelectorWarningDialog.tsx` existed; i18n coverage also failed until the implementation referenced the new locale keys. Both passed after Task 2.
- TypeScript narrowed the initial `isSelectorLowConfidenceRecord` type predicate too aggressively in `App.tsx`; changing it to a boolean helper preserved the same runtime behavior and passed typecheck.

## Verification

- `pnpm test -- tests/unit/popup/selector-warning-dialog.spec.tsx` — failed in RED, then passed after Task 2.
- `pnpm test:i18n-coverage` — failed in RED because keys were intentionally unreferenced, then passed after Task 2.
- `pnpm test -- tests/unit/popup/selector-warning-dialog.spec.tsx && pnpm typecheck` — PASS after Task 2.
- `pnpm test -- tests/unit/popup/retry-retriable.spec.tsx tests/unit/popup/selector-warning-dialog.spec.tsx && pnpm test:i18n-coverage && pnpm typecheck` — PASS after Task 3.
- `grep -R "selectorConfirmation" -n "entrypoints" "shared" "background" | grep -E "historyRepo|bindingRepo|draftRepo" || true` — PASS; no persistent repo writes found.
- `pnpm test && pnpm typecheck && pnpm lint && pnpm test:i18n-coverage` — PASS, 43 test files / 294 tests.

## TDD Gate Compliance

- RED gate: `a0de8e3` (`test(09-05): add selector warning dialog contract tests`)
- GREEN gate: `dd58d06` (`feat(09-05): wire selector warning confirmation UI`)
- Integration regression gate: `4d70094` (`test(09-05): cover warning and retry UI integration`)

## Known Stubs

None. Stub-pattern scan found only intentional optional/null state handling; no placeholder UI or mock data source was introduced.

## Threat Flags

None. The UI trust boundaries and mitigations were covered by T-09-05-01 through T-09-05-04.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 09 implementation is ready for orchestrator merge and phase-level verification. This worktree intentionally did not modify `STATE.md` or `ROADMAP.md`; the orchestrator owns those writes after merge.

## Self-Check: PASSED

- Found `entrypoints/popup/components/SelectorWarningDialog.tsx`
- Found `tests/unit/popup/selector-warning-dialog.spec.tsx`
- Found `09-05-SUMMARY.md`
- Found commits: `a0de8e3`, `dd58d06`, `4d70094`
- Confirmed `STATE.md` and `ROADMAP.md` were not modified

---
*Phase: 09-dispatch-robustness*
*Completed: 2026-05-10*
