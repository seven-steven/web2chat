---
phase: 04-openclaw
plan: "06"
subsystem: e2e-tests
tags: [e2e, playwright, popup-lifecycle, openclaw, dispatch]
dependency_graph:
  requires: ["04-05"]
  provides: ["e2e-dispatch-verified", "e2e-offline-verified", "e2e-permission-verified"]
  affects: ["tests/e2e"]
tech_stack:
  added: []
  patterns: ["popup-reopen-pattern", "context.waitForEvent('page')"]
key_files:
  created: []
  modified:
    - tests/e2e/openclaw-dispatch.spec.ts
    - tests/e2e/openclaw-offline.spec.ts
    - tests/e2e/openclaw-permission.spec.ts
decisions:
  - "E2E specs verified already correct at 67f501c — plan 04-05 completed this work"
  - "dispatch.spec.ts uses context.waitForEvent('page') to handle popup-close-after-Confirm"
  - "offline.spec.ts uses popup2 reopen pattern (4 occurrences) to verify OPENCLAW_OFFLINE error"
  - "permission.spec.ts uses same waitForEvent pattern; deny path documented as skipped"
metrics:
  duration: "< 2 minutes"
  completed: "2026-05-03"
  tasks_completed: 1
  tasks_total: 1
requirements: [ADO-05]
---

# Phase 04 Plan 06: E2E Spec Popup-Close Alignment Summary

**One-liner:** E2E specs verified correct for popup-close-after-Confirm lifecycle — dispatch via `context.waitForEvent('page')`, offline via popup2 reopen, permission via target page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Verify E2E specs for popup-close-resilient flow | (no changes needed — already correct at base) | tests/e2e/openclaw-dispatch.spec.ts, tests/e2e/openclaw-offline.spec.ts, tests/e2e/openclaw-permission.spec.ts |

## Verification Results

```
pnpm tsc --noEmit  → 0 errors in E2E spec files (pre-existing happy-dom type error is out of scope)
pnpm test          → 152 passed (21 test files)
pnpm build         → Finished in 700 ms, 364.77 kB total
grep -c "context.waitForEvent" openclaw-dispatch.spec.ts  → 2
grep -c "popup2" openclaw-offline.spec.ts                 → 4
grep -c "context.waitForEvent" openclaw-permission.spec.ts → 1
```

All plan verification criteria met.

## Deviations from Plan

**Finding:** The 3 E2E spec files were already fully updated to the popup-close-resilient pattern at base commit 67f501c (completed as part of plan 04-05 implementation). No code changes were required.

**Specific patterns confirmed:**

- `openclaw-dispatch.spec.ts`: Both tests use `context.waitForEvent('page', { timeout: 10_000 })` to wait for the new OpenClaw tab after Confirm click. No interaction with popup after Confirm. Message verified via `[data-testid="message-bubble"]` on the new tab.

- `openclaw-offline.spec.ts`: After Confirm click, test waits 5s via `articlePage.waitForTimeout(5_000)` for async dispatch chain to complete, then reopens popup (`popup2`) and asserts `[data-testid="error-banner-OPENCLAW_OFFLINE"]` is visible.

- `openclaw-permission.spec.ts`: Grant path tests via `context.waitForEvent('page')` + message-bubble on target page. Deny path documented as `test.skip` with unit test reference.

## Known Stubs

None — no stub patterns in E2E spec files.

## Threat Flags

None — E2E test files have no security surface.

## Self-Check: PASSED

- `.planning/phases/04-openclaw/04-06-SUMMARY.md` created: FOUND
- All 3 E2E spec files exist: FOUND
- `context.waitForEvent` in dispatch spec: 2 occurrences ✓
- `popup2` in offline spec: 4 occurrences ✓
- `context.waitForEvent` in permission spec: 1 occurrence ✓
- Unit tests: 152 passed ✓
- Build: succeeded ✓
