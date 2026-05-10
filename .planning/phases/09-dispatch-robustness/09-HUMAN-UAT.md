---
status: partial
phase: 09-dispatch-robustness
source: [09-VERIFICATION.md]
started: 2026-05-11T00:05:00Z
updated: 2026-05-11T00:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Retry button for retriable dispatch errors
expected: Retry button visible; clicking it starts new dispatch with fresh dispatchId and current form values
result: [pending]

### 2. Selector warning dialog for low-confidence Discord selectors
expected: Accessible dialog with i18n heading/body/cancel/confirm; Cancel returns to SendForm; Confirm sends once
result: [pending]

### 3. SelectorWarningDialog accessibility
expected: Keyboard navigable, screen-reader announces dialog role and labels
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
