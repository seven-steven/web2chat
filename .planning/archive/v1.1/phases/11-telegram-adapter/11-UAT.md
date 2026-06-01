---
status: testing
phase: 11-telegram-adapter
source: [11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-03-SUMMARY.md, 11-04-SUMMARY.md]
started: 2026-05-16T19:00:00+08:00
updated: 2026-05-16T19:00:00+08:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Telegram platform icon in popup
expected: |
  Navigate to web.telegram.org (any page). Open the extension popup. The target selector area should show the Telegram icon (blue paper plane logo) as the detected platform.
awaiting: user response

## Tests

### 1. Telegram Platform Icon in Popup
expected: Navigate to web.telegram.org (any page). Open the extension popup. The target selector area should show the Telegram icon (blue paper plane logo) as the detected platform.
result: [pending]

### 2. Telegram in Combobox Target List
expected: Open popup on any page. In the send_to Combobox, typing "telegram" or clicking the dropdown should show Telegram as an available target platform.
result: [pending]

### 3. ToS Warning for Telegram
expected: Select a Telegram chat URL as the send_to target. The SendForm should display a Telegram-specific ToS warning message below the target selector.
result: [pending]

### 4. End-to-end Dispatch to Telegram Web K
expected: Install/load the extension. Navigate to a Telegram Web K chat (logged in). In another tab, open any webpage. Open popup, capture the page, select the Telegram chat as target, click Send. The formatted message should appear in the Telegram chat editor and auto-send. Popup shows success status.
result: [pending]

### 5. Message Content Format Verification
expected: After dispatch to Telegram, the injected message should contain plain-text in this order: prompt text (if set), page title, URL, description, timestamp, then content. No markdown formatting — plain text only.
result: [pending]

### 6. Login Wall Detection
expected: Open Telegram Web K without being logged in (or in an incognito window). Trigger a send to Telegram. The popup should show a NOT_LOGGED_IN error badge/message, not attempt to inject.
result: [pending]

### 7. Long Content Truncation
expected: Capture a page with very long content (>4096 chars). Send to Telegram. The message should be truncated with a "...[truncated]" suffix, but metadata (prompt, title, URL, description, timestamp) should remain intact at the top.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

[none yet]
