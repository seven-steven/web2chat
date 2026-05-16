---
status: partial
phase: 12-feishu-lark-adapter
source: [12-VERIFICATION.md]
started: 2026-05-16T19:00:00+08:00
updated: 2026-05-16T19:00:00+08:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Popup URL Detection + Icon
expected: 在 popup 中粘贴 feishu.cn 或 larksuite.com URL，显示飞书/Lark 图标且平台检测为 feishu
result: [pending]

### 2. Logged-out Dispatch Flow
expected: 未登录飞书时尝试投递，popup 显示 NOT_LOGGED_IN 错误（retriable=true）
result: [pending]

### 3. Full End-to-End Dispatch
expected: 在已登录的飞书聊天中完成投递，消息通过 ClipboardEvent paste 注入，编辑器清空，popup 显示成功
result: [pending]

### 4. Selector Validation on Real Feishu DOM
expected: 三层 selector (tier1/tier2/tier3) 匹配真实飞书 Web 编辑器 DOM（RESEARCH 假设 A7）
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
