---
phase: 09-dispatch-robustness
plan: 04
subsystem: dispatch
tags: [mv3, discord, selector-confidence, warning-protocol, vitest, tdd]

requires:
  - phase: 09-dispatch-robustness
    provides: registry timeout policy and logged-out URL policy from plans 09-01 and 09-02
provides:
  - dispatch warning schema for SELECTOR_LOW_CONFIDENCE
  - one-shot selectorConfirmation dispatch input contract
  - needs_confirmation dispatch state with persisted warning records
  - Discord selector tier metadata and no-send-before-confirm guard
affects: [phase-09-dispatch-robustness, popup-confirmation-ui, future-adapters]

tech-stack:
  added: []
  patterns:
    - dispatch-specific warning channel separate from ErrorCode
    - two-dispatch selector confirmation model
    - selector tier metadata for content adapters

key-files:
  created:
    - tests/unit/dispatch/selector-warning.spec.ts
  modified:
    - shared/messaging/routes/dispatch.ts
    - shared/messaging/index.ts
    - shared/storage/repos/dispatch.ts
    - background/dispatch-pipeline.ts
    - entrypoints/discord.content.ts
    - tests/unit/adapters/discord-selector.spec.ts

key-decisions:
  - "Kept SELECTOR_LOW_CONFIDENCE as a dispatch warning instead of adding it to ErrorCode."
  - "Used needs_confirmation as the popup-actionable stored state for warning-only adapter responses."
  - "Kept selectorConfirmation one-shot by clearing it from terminal warning/success/error records."

patterns-established:
  - "Adapter warnings are schema-literal validated before storage; invalid warning payloads are ignored."
  - "Discord tier3 class-fragment selector returns a warning before compose/paste/send unless selectorConfirmation is present."

requirements-completed: [DSPT-04]

duration: 9 min
completed: 2026-05-10
---

# Phase 09 Plan 04: Selector Warning Protocol Summary

**Low-confidence Discord selector matches now pause dispatch as SELECTOR_LOW_CONFIDENCE warnings until a one-shot user confirmation is supplied.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-10T10:43:51Z
- **Completed:** 2026-05-10T10:52:25Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added dispatch-specific `SELECTOR_LOW_CONFIDENCE` warning types, `selectorConfirmation`, and `needs_confirmation` state without changing the generic `ErrorCode` namespace.
- Persisted actionable warning records in `chrome.storage.session` and cleared active in-progress semantics so popup UI can later render confirmation.
- Refactored Discord editor matching to report `tier1-aria`, `tier2-data`, and `tier3-class-fragment`; tier3 now returns a warning before compose/paste/send unless the one-shot confirmation flag is present.
- Added TDD coverage proving invalid warning strings are rejected, tier3 does not send before confirmation, and confirmed tier3 dispatch sends exactly once.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Add failing selector warning protocol tests** - `28dceff` (test)
2. **Task 2: GREEN — Implement warning route/storage/pipeline contract** - `32a778a` (feat)
3. **Task 3: GREEN/REFACTOR — Implement Discord selector tier metadata and no-send guard** - `4166390` (feat)

**Plan metadata:** pending at summary creation

## Files Created/Modified

- `tests/unit/dispatch/selector-warning.spec.ts` - Covers dispatch schema validation, warning persistence, active pointer clearing, and adapter payload confirmation forwarding.
- `tests/unit/adapters/discord-selector.spec.ts` - Covers selector tier metadata and no-send-before-confirm behavior.
- `shared/messaging/routes/dispatch.ts` - Adds warning schemas, `selectorConfirmation`, and `needs_confirmation` state.
- `shared/messaging/index.ts` - Re-exports dispatch warning and confirmation contract types/schemas.
- `shared/storage/repos/dispatch.ts` - Adds optional `warnings` and transient `selectorConfirmation` fields to dispatch records.
- `background/dispatch-pipeline.ts` - Passes confirmation to adapters, validates warning responses, persists `needs_confirmation`, and skips success history/binding writes for warning-only responses.
- `entrypoints/discord.content.ts` - Returns selector tier metadata and blocks tier3 class-fragment sends until confirmation.

## Decisions Made

- Followed D-127 by keeping `SELECTOR_LOW_CONFIDENCE` out of `shared/messaging/result.ts` and using dispatch-specific warning types.
- Used explicit `needs_confirmation` state to make popup resume/confirmation behavior observable from storage.
- Stored `selectorConfirmation` only as transient dispatch-record data required to reach the content adapter, then removed it from terminal success/error/warning records.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing local dependencies before test execution**
- **Found during:** Task 1 (RED — Add failing selector warning protocol tests)
- **Issue:** `pnpm test` initially failed because `node_modules` was absent in the isolated worktree (`vitest: command not found`).
- **Fix:** Ran `pnpm install` so Vitest, typecheck, lint, and build commands could execute.
- **Files modified:** none tracked
- **Verification:** RED, GREEN, final test/type/lint/i18n/build commands executed successfully after install.
- **Committed in:** not applicable; no tracked file changes

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to run planned automated verification. No product scope change.

## Issues Encountered

- The first RED commit attempt failed pre-commit typecheck because tests referenced future `warnings` and `selectorConfirmation` fields directly. Adjusted RED tests to use type-safe future-contract casts while preserving failing runtime assertions.
- During Task 2, the package `pnpm test -- tests/unit/dispatch/selector-warning.spec.ts` command still collected the RED Discord selector tests through the WXT/Vitest config. Used a focused `pnpm exec vitest run tests/unit/dispatch/selector-warning.spec.ts` plus `pnpm typecheck` to verify the dispatch contract before committing, then the planned combined command passed after Task 3.

## Verification

- `pnpm test -- tests/unit/adapters/discord-selector.spec.ts tests/unit/dispatch/selector-warning.spec.ts` — failed in RED for missing implementation, then passed after GREEN/REFACTOR.
- `pnpm exec vitest run tests/unit/dispatch/selector-warning.spec.ts && pnpm typecheck` — passed after Task 2 dispatch contract implementation.
- `pnpm test -- tests/unit/adapters/discord-selector.spec.ts tests/unit/dispatch/selector-warning.spec.ts && pnpm typecheck` — passed after Task 3.
- `pnpm test -- tests/unit/adapters/discord-selector.spec.ts tests/unit/dispatch/selector-warning.spec.ts && pnpm typecheck && pnpm lint && pnpm test:i18n-coverage && pnpm build` — passed.
- Acceptance checks: `shared/messaging/result.ts` does not contain `SELECTOR_LOW_CONFIDENCE`; `entrypoints/discord.content.ts` contains no `innerText =` or `textContent =` assignment.

## TDD Gate Compliance

- RED gate: `28dceff` (`test(09-04): add failing tests for selector warning protocol`)
- GREEN gate: `32a778a` (`feat(09-04): add selector warning dispatch contract`)
- GREEN/REFACTOR gate: `4166390` (`feat(09-04): require confirmation for low-confidence Discord selector`)

## Known Stubs

None. Stub-pattern scan found only legitimate optional/null checks and test fixture defaults; no placeholder UI/data source stubs were introduced.

## Threat Flags

None. The new trust-boundary behavior was already covered by the plan threat model T-09-04-01 through T-09-04-04.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for popup confirmation UI wiring to consume `needs_confirmation` records and start a fresh dispatch with `selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' }`. This worktree intentionally did not modify `STATE.md` or `ROADMAP.md`; the orchestrator owns those writes after merge.

## Self-Check: PASSED

- Found `tests/unit/dispatch/selector-warning.spec.ts`
- Found `shared/messaging/routes/dispatch.ts` warning contract
- Found RED commit `28dceff`
- Found GREEN commit `32a778a`
- Found Discord guard commit `4166390`
- Confirmed `STATE.md` and `ROADMAP.md` were not modified

---
*Phase: 09-dispatch-robustness*
*Completed: 2026-05-10*
