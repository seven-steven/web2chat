---
status: partial
phase: 6-i18n
source: [06-VERIFICATION.md]
started: "2026-05-07T07:35:00.000Z"
updated: "2026-05-07T07:35:00.000Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. Runtime Language Switch Visual Test
expected: Open Options page, switch language from Auto/English to Chinese and back. All t()-rendered text instantly changes without page/extension reload. Selection persists across close/reopen.
result: [pending]

### 2. Manifest Locale Resolution
expected: Browser language zh_CN → chrome://extensions shows Chinese extension name/description from __MSG_*__ resolution.
result: [pending]

### 3. Popup Language Flash Prevention
expected: Set language to Chinese in Options. Open popup, close, reopen. No brief English flash — Chinese text always on first frame.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
