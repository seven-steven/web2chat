---
status: diagnosed
phase: 05-discord
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md]
started: 2026-05-05T12:00:00Z
updated: 2026-05-05T14:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Discord 消息格式化
expected: 在 Discord 频道文本框中粘贴的 markdown 内容格式正确：标题加粗、URL 可点击、内容按 prompt-first 顺序截断（prompt 完整保留，超长 content 被截断），@mention 被零宽空格转义不会被 Discord 解析为提及。
result: issue
reported: "正常打开 discord 对话页面，输入框填入错误内容 '¬'，未触发发送。popup 显示投递超时。"
severity: blocker

### 2. Discord 适配器频道匹配
expected: 扩展 popup 在 Discord 频道页面（discord.com/channels/<g>/<c>）时自动检测为 Discord 平台，平台图标显示为 Discord Clyde logo；在 DM 页面（discord.com/channels/@me/...）不匹配。
result: issue
reported: "DM URL 正确未匹配，但频道页显示的 Discord icon 不对，需替换为正确图标"
severity: cosmetic

### 3. Discord 投递（Slate 编辑器粘贴注入）
expected: 点击发送后，扩展在目标 Discord 频道的 Slate 编辑器中通过 ClipboardEvent paste 注入格式化文本，模拟 Enter 键发送，消息出现在聊天区域。
result: blocked
blocked_by: prior-phase
reason: "Test 1 blocker - 注入内容错误，同一 bug 阻塞"

### 4. SPA 路由支持（webNavigation）
expected: dispatch pipeline 导航到指定 Discord 频道 URL 时，通过 webNavigation.onHistoryStateUpdated 检测 SPA 路由完成（pushState 不触发 tabs.onUpdated: complete），正确识别页面已就绪后执行注入。
result: blocked
blocked_by: prior-phase
reason: "Test 1 blocker - 注入本身失败，无法验证路由检测。另：测试描述有误，不是'投递到新频道'，而是检测指定 dispatch URL 的 SPA 加载完成。"

### 5. 未登录检测
expected: 用户未登录 Discord（被重定向到 /login 页面）时，dispatch 返回 NOT_LOGGED_IN 错误，popup 显示相应提示。
result: issue
reported: "投递后 popup 显示投递超时，未检测到未登录状态并给出明确提示"
severity: major

### 6. 频道安全检查
expected: 投递时 content script 验证当前页面 URL 的 channelId 与目标一致；频道不匹配时拒绝发送，返回错误。
result: blocked
blocked_by: prior-phase
reason: "Test 1 blocker - 注入失败，无法验证频道校验逻辑"

### 7. 速率限制
expected: 同一频道 5 秒内重复发送时，第二次被限制（RATE_LIMITED），5 秒后可再次发送。
result: blocked
blocked_by: prior-phase
reason: "Test 1 blocker - 投递失败，无法验证速率限制"

### 8. Discord ToS 提示
expected: 选择 Discord 作为目标平台时，SendForm 底部显示 Discord 服务条款提示脚注（i18n 本地化）。
result: issue
reported: "未发现 ToS 提示文字"
severity: major

### 9. 构建产物
expected: pnpm build 成功，manifest.json 包含 webNavigation 权限、discord host_permissions，content-scripts/discord.js 正确生成。
result: pass

## Summary

total: 9
passed: 1
issues: 4
pending: 0
skipped: 0
blocked: 4

## Gaps

- truth: "在 Discord 频道文本框中粘贴的 markdown 内容格式正确：标题加粗、URL 可点击、内容按 prompt-first 顺序截断，@mention 被转义"
  status: failed
  reason: "User reported: 正常打开 discord 对话页面，输入框填入错误内容 '¬'，未触发发送。popup 显示投递超时。"
  severity: blocker
  test: 1
  root_cause: "Discord adapter 在 ISOLATED world 注入，DataTransfer 对象不跨 V8 world 边界。Slate 在 MAIN world 读取 clipboardData.getData() 得到空字符串，产生 '¬' 伪影。"
  artifacts:
    - path: "background/dispatch-pipeline.ts"
      issue: "line 211: world: 'ISOLATED' for adapter executeScript"
    - path: "entrypoints/discord.content.ts"
      issue: "lines 97-108: pasteText() creates DataTransfer in ISOLATED world"
  missing:
    - "Paste 操作必须在 MAIN world 执行：通过 two-phase injection 或 postMessage 桥接"
  debug_session: ".planning/debug/discord-paste-wrong-char.md"

- truth: "平台图标显示为 Discord Clyde logo"
  status: failed
  reason: "User reported: 频道页显示的 Discord icon 不对，需替换为正确图标"
  severity: cosmetic
  test: 2
  root_cause: "PlatformIcon.tsx 使用了简化版 SVG path (M19.27 5.33...)，非官方 Discord Clyde logo"
  artifacts:
    - path: "entrypoints/popup/components/PlatformIcon.tsx"
      issue: "line 112: Discord variant path 是 generic icon pack 的简化版"
  missing:
    - "替换为 Simple Icons 官方 Discord SVG path (M20.317 4.3698...)"
  debug_session: ".planning/debug/discord-icon-wrong.md"

- truth: "未登录 Discord 时 dispatch 返回 NOT_LOGGED_IN 错误，popup 显示登录提示"
  status: failed
  reason: "User reported: 投递后 popup 显示投递超时，未检测到未登录状态并给出明确提示"
  severity: major
  test: 5
  root_cause: "Discord SPA 先返回 200 加载 shell (URL 仍为 /channels/...)，再做客户端 JS redirect 到 /login。onTabComplete 在 redirect 前就检测通过，adapter 注入后被 redirect 销毁导致 sendMessage 挂起直到超时。"
  artifacts:
    - path: "background/dispatch-pipeline.ts"
      issue: "onTabComplete login check only in awaiting_complete state; advanceToAdapterInjection doesn't re-check URL on failure"
    - path: "entrypoints/discord.content.ts"
      issue: "defense-in-depth login check runs before SPA redirect"
  missing:
    - "sendMessage 失败/超时后重新 chrome.tabs.get 检查 URL，若为 /login 则转为 NOT_LOGGED_IN"
    - "sendMessage 加 Promise.race 超时（~10s），不依赖 30s alarm"
  debug_session: ".planning/debug/discord-login-detection.md"

- truth: "选择 Discord 作为目标平台时，SendForm 底部显示 Discord 服务条款提示脚注"
  status: false_negative
  reason: "User reported: 未发现 ToS 提示文字"
  severity: major
  test: 8
  root_cause: "实现完整且正确（SendForm.tsx lines 341-354, i18n keys 存在）。可能是 UAT 时用户使用了旧 build 或 popup 未完全加载。需重新验证。"
  artifacts:
    - path: "entrypoints/popup/components/SendForm.tsx"
      issue: "实现正确 - platformId === 'discord' 条件渲染"
  missing:
    - "重新 UAT 验证：确保 fresh build + 等待 platform detection debounce"
  debug_session: ".planning/debug/discord-tos-missing.md"
