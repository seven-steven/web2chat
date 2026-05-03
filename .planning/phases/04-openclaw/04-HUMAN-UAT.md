---
status: partial
phase: 04-openclaw
source: [04-VERIFICATION.md]
started: "2026-05-03T12:20:00.000Z"
updated: "2026-05-03T12:20:00.000Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. Permission grant flow end-to-end
expected: Accept Chrome permission dialog → popup closes → reopen popup → auto-sends dispatch.start → message appears in OpenClaw within 5s
result: [pending]

### 2. Permission deny flow end-to-end
expected: Deny Chrome permission dialog → popup closes → reopen popup → OPENCLAW_PERMISSION_DENIED error banner visible
result: [pending]

### 3. Offline OpenClaw dispatch → error priority on popup reopen
expected: Dispatch to non-running OpenClaw → popup closes → reopen popup → OPENCLAW_OFFLINE shown, NOT EXECUTE_SCRIPT_FAILED
result: [pending]

### 4. E2E spec suite passes against live fixture
expected: pnpm test:e2e -- openclaw → 3 specs pass (dispatch happy-path x2, offline x1, permission grant x1, deny skipped)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
