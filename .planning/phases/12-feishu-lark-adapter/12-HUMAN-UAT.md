---
status: diagnosed
phase: 12-feishu-lark-adapter
source: [12-VERIFICATION.md]
started: 2026-05-16T19:00:00+08:00
updated: 2026-05-17T11:00:00+08:00
---

## Current Test

[testing complete]

## Tests

### 1. Popup URL Detection + Icon
expected: 在 popup 中粘贴 feishu.cn 或 larksuite.com URL，显示飞书/Lark 图标且平台检测为 feishu
result: issue
reported: "默认图标，没有变成飞书"
severity: major

### 2. Logged-out Dispatch Flow
expected: 未登录飞书时尝试投递，popup 显示 NOT_LOGGED_IN 错误（retriable=true）
result: pass

### 3. Full End-to-End Dispatch
expected: 在已登录的飞书聊天中完成投递，消息通过 ClipboardEvent paste 注入，编辑器清空，popup 显示成功
result: issue
reported: "提示置信度低的输入框，确认发送后输入框写入错误的文本（注入了页面元数据/导航元素而非目标网页内容），发送成功"
severity: major

### 4. Selector Validation on Real Feishu DOM
expected: 三层 selector (tier1/tier2/tier3) 匹配真实飞书 Web 编辑器 DOM（RESEARCH 假设 A7）
result: issue
reported: "tier1/tier2 均未匹配，只有 tier3 通用 contenteditable 命中，触发低置信度警告"
severity: major

## Summary

total: 4
passed: 1
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "粘贴 feishu.cn/larksuite.com URL 后显示飞书/Lark 图标且平台检测为 feishu"
  status: failed
  reason: "User reported: 默认图标，没有变成飞书"
  severity: major
  test: 1
  root_cause: "SendForm.tsx:472 的 iconKeyToVariant() 中 known 数组缺少 'feishu'，findAdapter 正确匹配但变体解析返回 'unsupported'"
  artifacts:
    - path: "entrypoints/popup/components/SendForm.tsx"
      issue: "known 数组只有 ['mock','openclaw','discord','slack','telegram']，缺少 'feishu'"
  missing:
    - "将 'feishu' 添加到 known 数组"
  debug_session: .planning/debug/feishu-icon-not-showing.md

- truth: "消息通过 ClipboardEvent paste 注入正确格式的目标网页内容"
  status: failed
  reason: "User reported: 提示置信度低的输入框，确认发送后输入框写入错误的文本（注入了页面元数据/导航元素而非目标网页内容），发送成功"
  severity: major
  test: 3
  root_cause: "两级 bug：(1) SendForm.tsx:237-238 popup 在 needs_confirmation 状态时仍调用 window.close()；(2) App.tsx:232 confirmSelectorWarning 使用 snapshotSig.value（重新捕获的飞书页面数据）而非 warningRecord.snapshot（原始文章数据）"
  artifacts:
    - path: "entrypoints/popup/components/SendForm.tsx"
      issue: "needs_confirmation 状态下不应调用 window.close()"
    - path: "entrypoints/popup/App.tsx"
      issue: "confirmSelectorWarning 用了 snapshotSig.value 而非 warningRecord.snapshot"
  missing:
    - "needs_confirmation 时保持 popup 打开"
    - "confirmSelectorWarning 使用 warningRecord.snapshot 而非 snapshotSig.value"
  debug_session: .planning/debug/feishu-wrong-content-injected.md

- truth: "每个飞书聊天有唯一 URL，投递管线可根据 URL 定位到具体聊天"
  status: failed
  reason: "User reported: 飞书所有群组都使用同一个 URL https://wqpj2wow47w.feishu.cn/next/messenger，无法根据 URL 定位到具体的聊天"
  severity: blocker
  test: 3
  root_cause: "飞书 SPA 架构限制：所有群聊/私聊共享同一 URL，无路径段/哈希/查询参数区分聊天。影响 page verification (feishu.content.ts:200-208)、rate limit (line 211)、dispatch pipeline tab 定位 (dispatch-pipeline.ts:86-115)"
  artifacts:
    - path: "entrypoints/feishu.content.ts"
      issue: "window.location.href !== payload.send_to 无法区分聊天"
    - path: "background/dispatch-pipeline.ts"
      issue: "openOrActivateTab 无法通过 URL 定位具体聊天 tab"
    - path: ".planning/phases/12-feishu-lark-adapter/12-RESEARCH.md"
      issue: "Q1 标记了聊天路由格式未解决但实现已推进"
  missing:
    - "需要架构决策：跳过 URL 验证 / DOM 提取聊天标题 / AppLink 协议 / 提示用户手动导航"
  debug_session: .planning/debug/feishu-url-not-unique.md

- truth: "tier1 或 tier2 selector 能匹配到飞书编辑器，不需要降级到 tier3"
  status: failed
  reason: "User reported: tier1/tier2 均未匹配，只有 tier3 通用 contenteditable 命中，触发低置信度警告"
  severity: major
  test: 4
  root_cause: "selector 基于未验证的假设 (RESEARCH A7)，真实飞书 DOM 的 contenteditable 元素没有 role=textbox 和 .message-input 父类。fixture HTML 是虚构结构"
  artifacts:
    - path: "entrypoints/feishu.content.ts"
      issue: "findEditor() tier1/tier2 selector 不匹配真实 DOM"
    - path: "background/injectors/feishu-main-world.ts"
      issue: "重复了相同的错误 selector"
    - path: "shared/adapters/feishu-login-detect.ts"
      issue: "guard 条件使用 tier1 selector，可能产生假阳性"
    - path: "tests/unit/adapters/feishu.fixture.html"
      issue: "虚构 DOM 结构，需替换为真实 DevTools 快照"
  missing:
    - "用户需用 DevTools 检查真实飞书编辑器 DOM，确定正确的 selector"
    - "更新 findEditor()、feishu-main-world.ts、feishu-login-detect.ts 和 fixture"
  debug_session: .planning/debug/feishu-selector-mismatch.md
