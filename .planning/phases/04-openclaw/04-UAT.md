---
status: diagnosed
phase: 04-openclaw
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-05-02T14:57:00Z
updated: 2026-05-02T14:58:00Z
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
result: issue
reported: "chrome 权限弹窗关闭 popup 后重新打开，再次点击投递提示'不支持的平台'（popup 显示 Oc badge 但 dispatch 失败）"
severity: blocker

### 6. Permission denied → error shown
expected: Deny the permission dialog → popup shows OPENCLAW_PERMISSION_DENIED error with localized message and retry option
result: issue
reported: "chrome 权限对话弹窗出现时 popup 消失，拒绝授权后 popup 未出现，用户永远看不到 OPENCLAW_PERMISSION_DENIED 错误"
severity: blocker

### 7. Offline error when server not running
expected: Dispatch to an OpenClaw URL where no server is running → popup shows OPENCLAW_OFFLINE error with localized "未在运行" message
result: issue
reported: "dispatch 跳转到目标页后 popup 关闭。重新打开 popup 时显示 capture 错误（EXECUTE_SCRIPT_FAILED：无法访问页面）而非 dispatch 的 OPENCLAW_OFFLINE 错误"
severity: major

### 8. Granted origins visible in Options page
expected: After granting permission, Options page shows a GrantedOriginsSection listing the authorized origin with a remove button
result: pass

### 9. Remove granted origin and re-request
expected: Remove an origin from Options → re-dispatch to same URL triggers permission dialog again
result: pass

### 10. E2E test suite passes
expected: pnpm wxt build --mode development && pnpm test:e2e -- openclaw — 3 specs (dispatch + offline + permission) all pass
result: issue
reported: "4/5 failed: dispatch happy-path × 2, offline × 1, permission × 1。根因与 Test 5/6/7 相同：dispatch 后 popup 关闭，错误状态无法回传"
severity: major

## Summary

total: 10
passed: 6
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Permission granted → dispatch proceeds, message appears in OpenClaw textarea within 5s"
  status: failed
  reason: "User reported: chrome 权限弹窗关闭 popup 后重新打开，再次点击投递提示'不支持的平台'（popup 显示 Oc badge 但 dispatch 失败）"
  severity: blocker
  test: 5
  root_cause: "chrome.permissions.request 弹窗关闭 popup，handleConfirm 异步流程中断：grantedOriginsRepo.add 和 sendMessage('dispatch.start') 永远不执行。第二次 Confirm 时 grantedOriginsRepo.has() 返回 false（本地镜像未更新），再次触发权限请求导致 popup 再次关闭或行为异常，最终 SW 拿到异常 send_to 返回 PLATFORM_UNSUPPORTED"
  artifacts:
    - path: "entrypoints/popup/components/SendForm.tsx"
      issue: "handleConfirm 中 chrome.permissions.request 关闭 popup，后续代码不执行"
    - path: "entrypoints/popup/components/SendForm.tsx"
      issue: "grantedOriginsRepo.add(targetOrigin) 在 permissions.request 之后，popup 关闭时永远不执行"
  missing:
    - "修复方案：用 chrome.permissions.contains 作为权威源（而非本地镜像 grantedOriginsRepo），或让 SW 端 dispatch-pipeline 完全负责权限检查，popup 端不依赖本地镜像"
    - "确保权限请求后 dispatch 流程能在 popup 重新打开时恢复或由 SW 接管"

- truth: "Permission denied → popup shows OPENCLAW_PERMISSION_DENIED error with localized message and retry option"
  status: failed
  reason: "User reported: chrome 权限对话弹窗出现时 popup 消失，拒绝授权后 popup 未出现，用户永远看不到 OPENCLAW_PERMISSION_DENIED 错误"
  severity: blocker
  test: 6
  root_cause: "同 Test 5 根因：chrome.permissions.request 弹窗关闭 popup，拒绝后 popup 不会自动恢复，ErrorBanner 永远不渲染"
  artifacts:
    - path: "entrypoints/popup/components/SendForm.tsx"
      issue: "OPENCLAW_PERMISSION_DENIED 分支在 permissions.request 之后，popup 已关闭不会执行"
  missing:
    - "同 Test 5 修复方案"

- truth: "Dispatch to offline OpenClaw → popup shows OPENCLAW_OFFLINE error"
  status: failed
  reason: "User reported: dispatch 跳转到目标页后 popup 关闭。重新打开 popup 时显示 capture 错误（EXECUTE_SCRIPT_FAILED）而非 dispatch 的 OPENCLAW_OFFLINE"
  severity: major
  test: 7
  root_cause: "popup 重新打开时优先执行 capture 流程（capture 当前 active tab = Chrome 错误页），capture 失败的错误覆盖了 dispatch 管道在 storage.session 中的错误状态。dispatch OPENCLAW_OFFLINE 状态虽已写入 storage 但 popup 不展示它"
  artifacts:
    - path: "entrypoints/popup/App.tsx"
      issue: "useEffect 中 capture 流程优先于 dispatch 状态恢复，capture 错误覆盖 dispatch 错误"
  missing:
    - "popup 重新打开时应先检查 dispatch 活跃状态，有未完成/失败的 dispatch 时优先展示 dispatch 错误而非执行新 capture"
    - "或 dispatch 错误应通过 badge/通知机制独立于 popup 展示"

- truth: "E2E test suite passes — 3 specs all green"
  status: failed
  reason: "4/5 failed: dispatch happy-path × 2, offline × 1, permission × 1。根因与 Test 5/6/7 相同"
  severity: major
  test: 10
  root_cause: "同 Test 5/6/7 根因"
  artifacts:
    - path: "tests/e2e/openclaw-dispatch.spec.ts"
      issue: "E2E expects popup to show dispatch state after target tab opens, but popup closes"
    - path: "tests/e2e/openclaw-offline.spec.ts"
      issue: "E2E expects OPENCLAW_OFFLINE in popup, but popup closes on dispatch"
    - path: "tests/e2e/openclaw-permission.spec.ts"
      issue: "E2E expects message list visible after dispatch, but adapter injection fails because popup close interrupts flow"
  missing:
    - "同 Test 5 修复方案 — 修复核心 popup 关闭问题后 E2E 应通过"
