---
phase: 09-dispatch-robustness
plan: 03
subsystem: ui
tags: [preact, popup, dispatch, retry, vitest, tdd]

requires:
  - phase: 08-architecture-generalization
    provides: shared dispatch Result / DispatchRecord error contracts with retriable metadata
provides:
  - Popup retry visibility driven by dispatch error retriable state
  - Fresh retry dispatch path using current SendForm values and new dispatchId
  - Unit coverage for retriable and non-retriable retry behavior
affects: [phase-09-dispatch-robustness, popup, dispatch-ux]

tech-stack:
  added: []
  patterns:
    - Retriable controls popup retry visibility; ErrorCode controls i18n copy only
    - Single SendForm dispatch input builder reused by normal Send and Retry
    - Retry clears old visible error and active pointer before starting fresh dispatch

key-files:
  created:
    - tests/unit/popup/retry-retriable.spec.tsx
  modified:
    - entrypoints/popup/App.tsx
    - entrypoints/popup/components/SendForm.tsx
    - entrypoints/popup/components/ErrorBanner.tsx
    - tests/unit/popup/retry-retriable.spec.tsx

key-decisions:
  - "Retry visibility now follows error.retriable instead of ErrorCode membership."
  - "Retry uses the same current-form dispatch builder as Send, generating a fresh dispatchId each time."

patterns-established:
  - "Popup dispatch errors preserve { code, message, retriable } across immediate and stored failures."
  - "Retry is user-clicked only and clears diagnostic UI state before creating new active dispatch state."

requirements-completed: [DSPT-03]

duration: 7min
completed: 2026-05-10
---

# Phase 09 Plan 03: Retriable Retry Flow Summary

**Popup retry now follows dispatch `retriable` metadata and restarts dispatch from current edited form values with a fresh dispatchId.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-10T06:44:38Z
- **Completed:** 2026-05-10T06:51:09Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added RED tests covering `retriable=true`, `retriable=false`, `TIMEOUT`, fresh `dispatch.start`, `new-dispatch-id`, and edited send_to/prompt/title/description/content values.
- Updated popup error state to preserve `retriable` from immediate `Result` failures and stored `DispatchRecord.error` failures.
- Reworked `ErrorBanner` so retry visibility is exactly controlled by `retriable && !!onRetry`, while i18n copy still comes from ErrorCode-specific keys.
- Extracted `SendForm` dispatch input construction into one builder reused by Send and Retry; Retry clears visible error and old active pointer before starting the fresh dispatch.

## Task Commits

Each TDD step was committed atomically:

1. **Task 1: RED — Add failing retriable retry UI tests** - `621ea51` (test)
2. **Task 2: GREEN — Preserve retriable and rebuild fresh dispatch on retry** - `e5f7141` (feat)
3. **Task 3: REFACTOR — Keep retry flow single-path and copy-safe** - `e43775f` (refactor)

**Plan metadata:** committed separately in the docs commit for this summary.

## Files Created/Modified

- `tests/unit/popup/retry-retriable.spec.tsx` - Unit tests for retriable-driven retry visibility and fresh retry dispatch payloads.
- `entrypoints/popup/App.tsx` - Preserves `retriable` in popup dispatch error state from stored and immediate dispatch failures.
- `entrypoints/popup/components/SendForm.tsx` - Reuses one current-form dispatch input builder for Send and Retry; Retry clears old active/error state before starting.
- `entrypoints/popup/components/ErrorBanner.tsx` - Adds `retriable` prop and removes ErrorCode membership as retry authority.

## Decisions Made

- Retry visibility is controlled by `retriable`; ErrorCode remains only the i18n copy selector.
- Retry creates a new dispatch from current form state rather than replaying the failed record.
- The failed session record remains diagnostic only; popup clears the old active pointer before retrying.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial RED commit was blocked by pre-commit typecheck because the failing test referenced the future prop contract directly. The RED test was adjusted with temporary type-safe test construction so it failed on behavior instead of TypeScript syntax/contract errors, then the implementation made the typed contract real and the refactor removed temporary casts.

## Verification

- `pnpm test -- tests/unit/popup/retry-retriable.spec.tsx` — PASS, 38 files / 268 tests passed in the targeted Vitest invocation.
- `pnpm typecheck` — PASS.

## Known Stubs

None.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for remaining Phase 09 dispatch robustness plans; DSPT-03 retry semantics are implemented and covered by automated tests.

## Self-Check: PASSED

- Found files: `entrypoints/popup/App.tsx`, `entrypoints/popup/components/SendForm.tsx`, `entrypoints/popup/components/ErrorBanner.tsx`, `tests/unit/popup/retry-retriable.spec.tsx`.
- Found commits: `621ea51`, `e5f7141`, `e43775f`.
- Confirmed no STATE.md or ROADMAP.md changes.

---
*Phase: 09-dispatch-robustness*
*Completed: 2026-05-10*
