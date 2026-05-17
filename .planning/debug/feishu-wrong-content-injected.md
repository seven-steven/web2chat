---
status: investigating
trigger: "飞书聊天投递时注入了错误的文本，原始网页是开源日报文章但注入了飞书页面元数据"
created: 2026-05-17T10:30:00+08:00
updated: 2026-05-17T11:00:00+08:00
---

## Current Focus

hypothesis: confirmed — two-stage root cause: (1) SendForm.startDispatch closes popup on Ok even when state is needs_confirmation; (2) confirmSelectorWarning uses snapshotSig.value (new capture) instead of warningRecord.snapshot (original). When popup reopens on a different page, the new capture pollutes the snapshot.
test: traced full data flow from capture through dispatch to adapter injection
expecting: confirmed both bugs
next_action: report ROOT CAUSE FOUND

## Symptoms

expected: composeFeishuMessage 格式化的目标网页内容（title + description + content + prompt）
actual: 注入了飞书页面本身的元数据（"Messenger - Feishu"、feishu.cn URL、"Captured at"）而非被采集网页的内容
errors: 无
reproduction: 采集一个网页，发送到飞书聊天，弹出低置信度 selector 警告后确认，注入错误文本
started: UAT 测试 Test 3

## Eliminated

- hypothesis: capture pipeline 有缓存，导致总是返回旧数据
  evidence: capture-pipeline.ts 每次调用都执行 executeScript，无缓存层
  timestamp: 2026-05-17T10:32Z

- hypothesis: popup stale capture（draft 覆盖新 capture）
  evidence: popup-stale-capture 已修复，当前代码有 URL guard（draftRes.url === captureRes.data.url）
  timestamp: 2026-05-17T10:33Z

- hypothesis: extract extractor 在错误的 tab 上运行（同一 popup session）
  evidence: capture-pipeline 使用 getLastFocused + windowTypes:['normal']，同一 popup session 内 active tab 不变
  timestamp: 2026-05-17T10:35Z

## Evidence

- timestamp: 2026-05-17T10:32Z
  checked: composeFeishuMessage 输出格式
  found: "测试消息，忽略即可。 @Seven Steven" = prompt; "Messenger - Feishu" = snapshot.title; "https://wqpj2wow47w.feishu.cn/next/messenger" = snapshot.url; "Captured at" = timestampLabel + create_at
  implication: snapshot 的 title 和 url 来自飞书页面，不是目标文章

- timestamp: 2026-05-17T10:34Z
  checked: capture-pipeline.ts 数据流
  found: url 字段来自 tab.url (line 69)，title 来自 extractor (extractor 从 DOM 提取)
  implication: capture 在飞书 tab 上执行，不是目标文章 tab

- timestamp: 2026-05-17T10:36Z
  checked: confirmSelectorWarning 函数 (App.tsx lines 231-283)
  found: 使用 snapshotForDispatch = snapshotSig.value 而非 warningRecord.snapshot 构建 dispatch input
  implication: 当 popup 重新打开时，新的 capture 覆盖 snapshotSig，confirmSelectorWarning 使用错误的快照

- timestamp: 2026-05-17T10:38Z
  checked: popup 重新打开时的数据流 (App.tsx mount)
  found: mount 时总是并行执行 capture.run + findPendingSelectorWarning。captureRes.ok 时覆盖 snapshotSig.value
  implication: 重新打开 popup 时，新的 capture（可能在飞书页面上）覆盖 snapshotSig，但 selectorWarningSig 保留了原始记录

- timestamp: 2026-05-17T10:40Z
  checked: DispatchRecord 结构
  found: warningRecord.snapshot 包含第一次 dispatch 的原始快照（目标文章数据），但 confirmSelectorWarning 不使用它
  implication: 修复方向是让 confirmSelectorWarning 使用 warningRecord.snapshot 而非 snapshotSig.value

- timestamp: 2026-05-17T10:55Z
  checked: SendForm.startDispatch (SendForm.tsx:236-238)
  found: 当 dispatch.start 返回 Ok 时无条件调用 window.close()，即使 state 是 'needs_confirmation'（需要用户确认选择器警告）
  implication: popup 在 needs_confirmation 状态时关闭，用户必须重新打开 popup 来确认 selector warning，而重新打开时 capture.run 在新页面上执行

## Resolution

root_cause: |
  Two-stage root cause:
  1. SendForm.startDispatch (entrypoints/popup/components/SendForm.tsx:237-238) calls window.close() when dispatch.start returns Ok, even when the state is 'needs_confirmation'. This causes the popup to close before the user can respond to the SelectorWarningDialog.
  2. confirmSelectorWarning (entrypoints/popup/App.tsx:232) uses snapshotSig.value to build the dispatch snapshot instead of warningRecord.snapshot. When the popup reopens (user clicks icon again), the mount logic runs capture.run which captures the current active tab — which may now be the Feishu tab (opened by the first dispatch). The new capture overwrites snapshotSig.value. When the user confirms the pending selector warning, confirmSelectorWarning uses the wrong (Feishu page) snapshot instead of the original article snapshot stored in warningRecord.snapshot.

  The cascade: (1) popup closes prematurely → (2) user reopens popup on Feishu page → (3) new capture overwrites snapshotSig → (4) confirmSelectorWarning uses wrong snapshot → (5) adapter injects Feishu page metadata instead of article content.

fix: |
  Two fixes needed:
  A. SendForm.startDispatch should not close popup when dispatch state is 'needs_confirmation' — check res.data?.state and keep popup open for selector warning confirmation.
  B. confirmSelectorWarning should use warningRecord.snapshot as the base snapshot instead of snapshotSig.value, ensuring the original captured content is always used regardless of what the new capture returns.
verification: pending
files_changed: []
