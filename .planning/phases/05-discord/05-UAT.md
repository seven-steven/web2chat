---
status: resolved
phase: 05-discord
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md]
started: 2026-05-05T12:00:00Z
updated: 2026-05-07T14:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Discord 粘贴注入修复验证（Gap 1: blocker fix）
expected: 使用扩展向 Discord 频道投递消息，Slate 编辑器中应粘贴格式正确的 markdown（标题加粗、URL 可点击、@mention 被零宽空格转义），而非 "¬" 等乱码。粘贴后自动 Enter 发送，消息出现在聊天区。
result: pass
note: "Plan 05-06 Escape keydown (200ms) 修复验证通过（2026-05-07）。消息正常发送，输入框清空。"

### 2. Discord 品牌图标修复验证（Gap 2: cosmetic fix）
expected: 在 popup 输入 Discord 频道 URL 后，平台图标应显示为官方 Discord Clyde logo（可识别的品牌形状，非简化版 generic icon）。
result: pass

### 3. Discord 投递完整流程（原 Test 3，被 Test 1 blocker 阻塞）
expected: 点击发送后，消息完整出现在目标 Discord 频道聊天区域（包含格式化的 title、URL、description、content）。
result: pass

### 4. SPA 路由支持（原 Test 4，被 Test 1 blocker 阻塞）
expected: dispatch pipeline 导航到指定 Discord 频道 URL 时，正确检测 SPA 路由加载完成后执行注入。如果已在频道页面直接投递也应正常工作。
result: pass
note: "Plan 05-06 ADAPTER_RESPONSE_TIMEOUT_MS 20s 修复验证通过（2026-05-07）。跨频道投递成功，popup 显示成功状态。"

### 5. 未登录检测修复验证（Gap 3: major fix）
expected: 未登录 Discord 时投递，应在 ~10s 内返回 NOT_LOGGED_IN 错误，popup 显示明确的登录提示（而非 30s 超时）。
result: pass
note: "Debug session discord-login-detection 修复验证通过（2026-05-07）。新增 detectLoginWall() DOM 探针 + waitForReady() 探测竞速 + INPUT_NOT_FOUND→NOT_LOGGED_IN 映射；E2E discord-login.spec.ts 新增 'adapter detects login wall rendered on channel URL' 用例覆盖 URL 不变时的登录墙场景，2/2 用例通过。"

### 6. 频道安全检查（原 Test 6，被 Test 1 blocker 阻塞）
expected: 投递时 content script 验证当前页面 URL 的 channelId 与目标一致；频道不匹配时拒绝发送。
result: pass

### 7. 速率限制（原 Test 7，被 Test 1 blocker 阻塞）
expected: 同一频道 5 秒内重复发送时，第二次被限制（RATE_LIMITED），5 秒后可再次发送。
result: pass
note: |
  Plan 05-04 自动化 E2E 2026-05-07 实跑通过：
    - tests/e2e/discord-dispatch.spec.ts:85 — `rate limit -- second dispatch within 5s returns RATE_LIMITED` (1.7s)
    - tests/e2e/discord-channel-switch.spec.ts:83 — `sequential dispatches to same channel succeed after rate limit expires` (10.1s)
  代码侧节流逻辑：entrypoints/discord.content.ts:30,87,259-266（RATE_LIMIT_MS=5000，per-channel lastSendTime Map）。
  人工 UI 快速二连点不可行（popup "投递中" 状态阻止），SW 层 chrome.tabs.sendMessage 直发 ADAPTER_DISPATCH 已绕开 UI 节流，覆盖 ROADMAP SC#4。
  命令：`pnpm exec playwright test -g "rate limit"`，2/2 pass (12.7s)。

### 8. Discord ToS 提示重新验证（Gap 4: false negative re-verify）
expected: 选择 Discord 作为目标平台时，SendForm 底部显示 Discord 服务条款提示脚注（i18n 本地化文字）。
result: pass

### 9. 构建产物
expected: pnpm build 成功，manifest.json 包含 webNavigation 权限、discord host_permissions，content-scripts/discord.js 正确生成。
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "同一频道 5 秒内重复发送时，第二次被限制（RATE_LIMITED）；5 秒后可再次发送（ROADMAP SC#4）"
  status: resolved
  resolved_by: "05-04"
  test: 7
  evidence: "2026-05-07 实跑 `pnpm exec playwright test -g 'rate limit'` 2/2 pass (12.7s)"

- truth: "粘贴发送后 Discord 输入框应清空，不残留消息文本"
  status: resolved
  resolved_by: "05-06"
  fix: "discordMainWorldPaste 在 Enter 后 200ms 派发 Escape keydown"
  reason: "User reported: 消息正常发送，但是 discord 输入框会残留消息内容文本"
  severity: minor
  test: 1
  root_cause: "discordMainWorldPaste (background.ts:40-73) 同步派发 paste + Enter 后立即返回，但 Discord Slate 编辑器通过 React 异步批处理清空编辑器。函数返回时编辑器尚未被清空，且无后续清除逻辑。"
  artifacts:
    - path: "entrypoints/background.ts"
      issue: "lines 40-73: discordMainWorldPaste 派发 Enter 后无等待/清除操作"
    - path: "entrypoints/discord.content.ts"
      issue: "lines 104-122: injectMainWorldPaste 成功后无编辑器清除步骤"
  missing:
    - "Enter 后延迟 ~200ms 派发 Escape keydown（Discord 原生清空快捷键）或主动清空编辑器内容"

- truth: "跨频道 SPA 导航投递后，popup 应显示成功而非超时"
  status: resolved
  resolved_by: "05-06"
  fix: "ADAPTER_RESPONSE_TIMEOUT_MS 从 10_000 增至 20_000"
  reason: "User reported: 投递正常，消息成功发送。但 web2chat 插件图标显示 err, popup 提示投递超时。"
  severity: major
  test: 4
  root_cause: "ADAPTER_RESPONSE_TIMEOUT_MS (10s) < waitForElement(5s) + paste(1-2s) + waitForNewMessage(5s) = 11-12s。SPA 导航时 Discord UI 异步渲染导致两个内部等待都接近最大值，总耗时超过 SW 超时，消息实际发送成功但 SW 已报超时。"
  artifacts:
    - path: "background/dispatch-pipeline.ts"
      issue: "line 189: ADAPTER_RESPONSE_TIMEOUT_MS = 10_000 太短，不够覆盖两个 5s 内部等待 + paste 往返"
    - path: "entrypoints/discord.content.ts"
      issue: "line 20: WAIT_TIMEOUT_MS = 5000，handleDispatch 中使用两次（waitForElement + waitForNewMessage）"
  missing:
    - "将 ADAPTER_RESPONSE_TIMEOUT_MS 增至 20-25s，为两个内部 5s 等待 + paste 往返留余量"

- truth: "未登录 Discord 时投递应在 ~3s 内返回 NOT_LOGGED_IN，而非 5s+ INPUT_NOT_FOUND 'Couldn't find the message box'"
  status: resolved
  resolved_by: "debug:discord-login-detection"
  fix: "新增 detectLoginWall() DOM 探针；waitForReady() 用单 MutationObserver 同时监听 editor 与 login wall（1.5s 预算）；pathname guard 拓宽到 /login*+/register*+/；dispatch-pipeline 把 INPUT_NOT_FOUND 重映射为 NOT_LOGGED_IN（当 tab URL 仍在 host 上但已不匹配 adapter.match()）"
  reason: "P3 Phase 5 Test 5 实测：未登录时 Discord 在 /channels/<g>/<c> 路径就地渲染 login UI（不一定 redirect 到 /login），双层 NOT_LOGGED_IN 检测都依赖 URL 信号，URL 不变时全漏过，适配器跑到 5s findEditor timeout 才冒出 INPUT_NOT_FOUND。"
  severity: major
  test: 5
  root_cause: "'Couldn't find the message box / The target page changed' 映射到 INPUT_NOT_FOUND（locales/en.yml），不是 NOT_LOGGED_IN。原 NOT_LOGGED_IN 检测两层（adapter pathname.startsWith('/login') + pipeline host-matches+adapter.match()）都纯靠 URL；当 Discord 把 login 表单渲染在 /channels/<g>/<c> 路径上（URL 未变），两层都通过 → 适配器走到 findEditor 5s 超时 → 'Editor not found'。原 discord-login.spec.ts 只测了 /login 路径分支。"
  artifacts:
    - path: "shared/adapters/discord-login-detect.ts"
      issue: "新增 — DOM 探针 helper，纯 querySelector，无 chrome.* 依赖"
    - path: "entrypoints/discord.content.ts"
      issue: "isLoggedOutPath() 拓宽 + waitForReady() 探测竞速 + 5s 超时后 login wall 二次校验"
    - path: "background/dispatch-pipeline.ts"
      issue: "isOnAdapterHost() helper 抽取 + INPUT_NOT_FOUND→NOT_LOGGED_IN 重映射"
    - path: "tests/e2e/fixtures/discord/login-wall.html"
      issue: "新增 — 模拟 /channels/<id> 路径就地渲染 login 表单的 stub"
    - path: "tests/e2e/discord-login.spec.ts"
      issue: "新增 'adapter detects login wall rendered on channel URL' 用例；修正 chrome.tabs.query URL 与 serve cleanUrls 行为对齐"
    - path: "tests/unit/adapters/discord-login-detect.spec.ts"
      issue: "新增 — 6 个用例覆盖 happy path + 各探针 marker + 边缘场景"
    - path: "tests/unit/dispatch/login-detection.spec.ts"
      issue: "扩展 +4 个用例覆盖 pipeline 重映射"
  missing:
    - "DOM-based login wall 探针（不依赖 URL）"
    - "INPUT_NOT_FOUND 在 host 已不匹配时重映射为 NOT_LOGGED_IN"
    - "E2E 覆盖 login wall 渲染在 channel URL 上的场景"
