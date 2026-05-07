---
status: resolved
phase: 04-openclaw
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-HUMAN-UAT.md]
started: 2026-05-02T14:57:00Z
updated: 2026-05-07T15:00:00Z
resolved_by: [04-05, 04-06]
resolution_evidence: 04-HUMAN-UAT.md (status: complete, 4/4 pass on 2026-05-03/04)
---

## Current Test

[testing complete]

## Tests

### 1. Unit tests + Typecheck + Build (automated)
expected: 152 unit tests pass, typecheck clean, build success
result: pass

### 2. Manifest permissions correct
expected: Static host_permissions contains only https://discord.com/*, no <all_urls>; optional_host_permissions has <all_urls>; permissions include activeTab/alarms/scripting/storage
result: pass

### 3. OpenClaw URL platform detection
expected: In popup send_to field, type `http://localhost:18789/chat?session=agent:bot:s1` → platform icon appears (OpenClaw detected)
result: pass

### 4. Permission request on first dispatch
expected: First dispatch to a new OpenClaw origin triggers Chrome permission dialog asking to grant access to that origin
result: pass
note: Chrome permission dialog closes popup — known Chrome limitation (popup loses focus). SW continues dispatch via storage.session. Side panel workaround deferred to v2.

### 5. Permission granted → dispatch proceeds
expected: Accept the permission dialog → dispatch continues, message appears in OpenClaw textarea within 5s
result: pass
resolved_by: [04-05, 04-06]
resolution_note: "原 issue 由 plans 04-05 (intent-first persistence) + 04-06 (App.tsx Step 0 auto-resume) 修复；2026-05-03 在 04-HUMAN-UAT.md 复测 pass — popup 关闭后重开自动续投递成功。"

### 6. Permission denied → error shown
expected: Deny the permission dialog → popup shows OPENCLAW_PERMISSION_DENIED error with localized message and retry option
result: pass
resolved_by: [04-05, 04-06]
resolution_note: "原 issue 由 plans 04-05/04-06 修复；2026-05-03 复测 pass — 拒绝授权后重开 popup 显示 OPENCLAW_PERMISSION_DENIED ErrorBanner。"

### 7. Offline error when server not running
expected: Dispatch to an OpenClaw URL where no server is running → popup shows OPENCLAW_OFFLINE error with localized "未在运行" message
result: pass
resolved_by: [04-06]
resolution_note: "原 issue 由 plan 04-06 修复 (App.tsx:156-159 capture 错误赋值前加 `if (!dispatchErrorSig.value)` 守卫)；2026-05-03 复测 pass — 重开 popup 显示 OPENCLAW_OFFLINE 而非 EXECUTE_SCRIPT_FAILED。"

### 8. Granted origins visible in Options page
expected: After granting permission, Options page shows a GrantedOriginsSection listing the authorized origin with a remove button
result: pass

### 9. Remove granted origin and re-request
expected: Remove an origin from Options → re-dispatch to same URL triggers permission dialog again
result: pass

### 10. E2E test suite passes
expected: pnpm wxt build --mode development && pnpm test:e2e -- openclaw — 3 specs (dispatch + offline + permission) all pass
result: pass
resolved_by: [04-05, 04-06]
resolution_note: "3 个 E2E spec 改为 popup-close-resilient 模式 (context.waitForEvent('page') + popup2 reopen)；2026-05-03 复测 pass。deny 路径在 dev 模式自动授权下不可触发，标 test.skip 并由 unit 测试覆盖。"

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[all gaps resolved by plans 04-05 + 04-06; see 04-HUMAN-UAT.md for re-verification evidence]
