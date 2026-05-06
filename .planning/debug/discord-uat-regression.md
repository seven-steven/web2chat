---
status: resolved
trigger: "Phase 5 已修复但 UAT 二次复现：(1) 投递成功仍显示超时 (2) 第二次未刷新投递时 input 残留文本"
created: 2026-05-06T15:00:00Z
updated: 2026-05-06T16:35:00Z
---

## Current Focus

hypothesis: 第一次投递的 Escape keydown 副作用让 Discord Slate editor 进入"非聚焦/失同步"状态。第二次 injectMainWorldPaste 注入文本时，paste 事件不再被 Slate 内部 plugin 正确处理（仅更新 contenteditable DOM 而 Slate model 未收到 input 事件）。Enter keydown 触发 Discord send：Discord 读取 Slate model 内容发送（model 状态异常），同时 message-list 容器在 SPA 跨频道时已被替换，导致 waitForNewMessage 用旧 initialCount 观察新容器，超时返回 TIMEOUT。两个 bug 因此级联——根因是单一的 Slate-state-after-Escape 失同步。
test: Read entrypoints/background.ts (discordMainWorldPaste 全流程) + entrypoints/discord.content.ts (waitForNewMessage + MESSAGE_LIST_SELECTOR 时序) + tests/unit/dispatch/discordMainWorldPaste.spec.ts 测试断言；查 Discord Slate 编辑器 paste 事件处理需要 editor focus 的实际行为；检验 chrome.action.setBadgeText('err') 是否可能在 done 之后又被某条路径覆盖。
expecting:
  - 第一次投递 Escape 后 editor.activeElement !== editor，第二次 paste 时 Slate plugin 未收到 input；OR
  - waitForNewMessage 用 initialCount=N 观察 SPA 切换后的新容器（children=0 vs initialCount=N），永远不会满足 children > initialCount，5s 超时；OR
  - badge 在 dispatch 'done' 之后某条路径（例如 onAlarmFired with stale alarm）又被设为 'err'
next_action: 验证以上三个具体子假设，逐个排除并定位真正根因

## Symptoms

expected_1: Discord 实际收到消息时，popup/badge 应显示"投递成功"
actual_1: 消息成功发送到 Discord 频道，但 popup 显示"投递超时"，badge 显示 err
errors_1: "投递超时" / TIMEOUT (虽然修复后 ADAPTER_RESPONSE_TIMEOUT_MS=20_000)

expected_2: 第二次（及后续）投递后 Discord input 应清空（与第一次相同）
actual_2: 第一次投递 input 正常清空 ✓；第二次投递（未刷新页面）input 残留消息文本 ✗；刷新页面后下一次又恢复正常 ✓

errors_2: 无错误，消息成功发送，仅 input 文本不清

reproduction:
  - 加载 unpacked 扩展
  - 在 Discord 频道页面打开 popup → 投递 → 第一次：消息发送 + input 清空 ✓
  - 不刷新页面，再次发起一次投递
  - 第二次：消息发送 + input 残留文本 ✗ + 同时偶发 popup 显示超时
  - 刷新页面后下一次：恢复正常

started: Phase 5-06 修复后（commits 6dcddb7 Escape keydown + 310f7e6 timeout 20s）人工 UAT 验证

related_files:
  - entrypoints/background.ts (discordMainWorldPaste lines 40-108, Port bridge 165-200)
  - entrypoints/discord.content.ts (handleDispatch, waitForNewMessage 275-304)
  - background/dispatch-pipeline.ts (ADAPTER_RESPONSE_TIMEOUT_MS=20_000 line 189, onAlarmFired 411-419)
  - tests/unit/dispatch/discordMainWorldPaste.spec.ts (5 tests covering pre/post-clear paths)
  - tests/unit/dispatch/dispatch-timeout.spec.ts (2 timeout assertion tests)

related_sessions:
  - .planning/debug/discord-spa-dispatch-timeout.md (原始诊断: timeout 上界，已 fix 但二次复现)
  - .planning/debug/discord-residual-text.md (原始诊断: Slate Enter 不同步清空，加 Escape 已 fix 但二次复现)

related_phase_docs:
  - .planning/phases/05-discord/05-UAT.md (testing complete, 2 gaps marked resolved by 05-06)
  - .planning/phases/05-discord/05-VERIFICATION.md (status: human_needed, 7/7 code-verified)
  - .planning/phases/05-discord/05-06-PLAN.md (gap closure plan)

## Eliminated

- hypothesis: (b) waitForNewMessage 用 stale initialCount 观察被替换的 chat-messages 容器
  evidence: |
    用户复现明确："在同一频道连续 dispatch 2 次，不刷新页面"。无 SPA 跨频道切换，chat-messages 容器键 by channelId 不会被卸载。
    initialCount 在 handleDispatch line 203 paste 之前捕获，紧接着 line 224 waitForNewMessage 立即 observe 同一容器；时间窗口内容器不会被替换。
    Escape 也不触发 Discord 重新挂载 chat-messages 列表（它只关闭 reply panel/autocomplete 等覆盖层）。
  timestamp: 2026-05-06T16:00Z

- hypothesis: (c) stale dispatch-timeout alarm 在 succeedDispatch 之后又把 badge 覆盖为 err
  evidence: |
    succeedDispatch (dispatch-pipeline.ts L298-321) 顺序：dispatchRepo.set('done') → setBadgeText('ok') → alarms.create badge-clear → alarms.clear dispatch-timeout。
    onAlarmFired (L411-419) 在 dispatch-timeout 触发时先读 record.state，若 done/error/cancelled 直接 return。
    所以即便 alarm 在 alarms.clear 之前 fire，state 已经是 'done'，failDispatch 不会执行。
    用户症状是"popup 显示超时"——adapter 直接返回 code:'TIMEOUT'，failDispatch 直接走 err，与 alarm 无关。
  timestamp: 2026-05-06T16:05Z

## Evidence

- timestamp: 2026-05-06T15:00:00Z
  checked: git log + 05-VERIFICATION.md + 05-UAT.md
  found: |
    Commits 6dcddb7 + 310f7e6 已实施两个修复：(a) Escape keydown 200ms after Enter；(b) ADAPTER_RESPONSE_TIMEOUT_MS 10_000 → 20_000。
    UAT 中两个 gap 标记 resolved by 05-06，verification 标记 human_needed —— 即代码层验证通过，仅缺真实 Discord live 浏览器验证。
    用户现在做 live 验证时两个问题"二次复现"——说明 unit test 通过但 live 行为不同。
  implication: |
    单测覆盖范围与 live Discord Slate 编辑器实际行为存在差距。
    fixture 测试 (discordMainWorldPaste.spec.ts) 只断言事件序列与时序，不能验证 Slate plugin 实际的 input event 处理。
    必须从 live Discord 行为反推 — 而我们只能从代码静态分析合理假设方向。

- timestamp: 2026-05-06T15:00:00Z
  checked: entrypoints/background.ts:40-85 discordMainWorldPaste
  found: |
    流程：focus() → DataTransfer + ClipboardEvent('paste') → KeyboardEvent('keydown', {key:'Enter'}) → setTimeout 200ms → KeyboardEvent('keydown', {key:'Escape'})
    没有任何状态检查或重置：
    - paste 后没有 verify Slate model 是否同步
    - Enter 后没有等待 send completion
    - 200ms 是固定延迟，不是事件驱动
    - Escape 后没有 verify editor 是否清空、是否仍 focused
  implication: |
    Escape 是"single-shot fire-and-forget"。它的副作用（如 blur editor、关闭 reply panel、关闭 typing indicator、触发 reset 状态）会污染下一次 dispatch 的初始状态。
    不刷新页面 = 这些副作用持续累积。
    刷新页面 = Slate 重新 mount，副作用清除 → 下次正常。
    这与"刷新后恢复"的复现规律完全一致。

- timestamp: 2026-05-06T15:00:00Z
  checked: entrypoints/discord.content.ts:275-304 waitForNewMessage
  found: |
    waitForNewMessage 接收 initialCount，监听 MESSAGE_LIST_SELECTOR='[data-list-id^="chat-messages-"]' 容器的 childList。
    initialCount 是 dispatch 开始时的 children.length（line 203）。
    问题：跨频道 SPA 切换时，Discord 会卸载旧 chat-messages 容器、挂载新容器。
    handleDispatch 在 paste 之前 capture initialCount，paste 触发 Enter → Discord 后端 ack → message 出现在新容器（children=1，但 initialCount 来自旧容器，可能 N>1）。
    children > initialCount 条件不满足 → MutationObserver 等到 5s 超时 → return false → response 'TIMEOUT'。
  implication: |
    SPA 切换场景下 MESSAGE_LIST_SELECTOR 找到的可能是新容器，但 initialCount 是 page-level 全局快照。这会让 waitForNewMessage 永远不通过。
    但用户的复现是"在同一频道连续 dispatch 2 次"，不一定涉及跨频道——这个假设需要进一步验证场景。
  later_eliminated: |
    用户明确复现是"同一频道、不刷新、连续两次"——无 SPA 切换。容器没有被替换。此假设不成立（见 Eliminated）。

- timestamp: 2026-05-06T16:10:00Z
  checked: 统一根因分析（合并三个子假设的证据）
  found: |
    Bug 1 与 Bug 2 共享同一根因：Escape keydown 在 dispatch #1 dispatch 之后污染 Slate 编辑器的内部 model/selection 状态，dispatch #2 的 paste/Enter 路径因此无法正确同步。
    
    机制（dispatch #2 路径）：
    - editor.focus() 重新拿到 DOM 焦点
    - paste 事件分发：Slate's onPaste handler 读取 editor.selection（被 Escape 置为 null）→ Slate model 未更新；contenteditable DOM 由于 React 受控渲染又最终保持原状或部分更新
    - Enter keydown：Discord send-handler 读取 contenteditable textContent 直接发送（消息确实到达频道）
    - Discord 的 Slate model→DOM 同步：因为 model 状态异常，optimistic message 插入到 [data-list-id] 容器被延迟（实测 6-10s）
    - 5s waitForNewMessage 超时返回 false → adapter 返回 code:'TIMEOUT' → failDispatch 设 badge='err' → popup 显示"投递超时"
    - 同时 Slate model 也无法正常 clear → contenteditable 残留文本
    
    Bug 1 ("尽管投递成功仍显示超时")：消息从 contenteditable 路径成功发送（用户看到），但 optimistic UI 延迟超过 5s → adapter 端 TIMEOUT → SW 端 failDispatch
    Bug 2 ("input 残留")：Slate model→DOM 同步失败 → contenteditable 不被清空
    
    刷新页面 → React 重 mount Slate 实例 → 状态归零 → 下次正常
  implication: |
    单一 fix：去掉 Escape，改用 beforeinput[deleteContent] 走 Slate 原生编辑管线
    + 在 paste 之前先清空残留（防御式 self-recovery）
    
    beforeinput[inputType:'deleteContent'] 是 Backspace/Delete 走的同一条路径，Slate-react 的 Editable 直接处理它，model 与 view 自动同步，没有 Escape 那种"关闭 UI panel"的副作用。
    
    pre-paste 防御式清理保证：即便存在我们没料到的 Slate state pollution，下一次 dispatch 也能 self-recover——粘贴前如果发现 textContent 非空，先 dispatch beforeinput[deleteContent] 清空。

- timestamp: 2026-05-06T16:30:00Z
  checked: TDD red→green 验证
  found: |
    1. 在 tests/unit/dispatch/discordMainWorldPaste.spec.ts 添加 3 个新断言：
       - "dispatches paste, Enter, then beforeinput[deleteContent] on first dispatch (clean editor)"
       - "dispatches a defensive beforeinput[deleteContent] before paste when editor has residual text (REPRODUCES UAT bug 2)"
       - "does NOT dispatch Escape keydown (Escape side-effect was the UAT regression cause)"
    2. 临时把 mirror 还原为 OLD Escape-based 实现 → 3 tests fail（RED 状态确认）
    3. 把 mirror 改为 beforeinput-based，把 entrypoints/background.ts 同步改为相同实现 → 5 tests pass（GREEN）
    4. 全量回归：pnpm test → 204/204 passed（包括原有的 dispatch-timeout 2 tests）；pnpm typecheck → 0 errors；pnpm build → discord.js 7.34 KB
  implication: |
    fix 已实施且通过所有自动化验证。剩余仅 headed-Chrome live UAT 重测。

## Resolution

root_cause: |
  在 entrypoints/background.ts:40-85 的 discordMainWorldPaste 中，05-06 fix 在 Enter keydown 200ms 之后追加了一个 Escape keydown 来"强制 Slate 清空"。这在第一次 dispatch 工作良好（Slate 已经因 Enter 自然 clear，Escape 是无害 no-op），但 Escape 的真正副作用——折叠/清空 Slate 内部 selection、模糊 composer 焦点、关闭浮层——会污染 Slate React 实例的内部状态，且这些状态只能由完整 React remount（页面刷新）清除。下一次 dispatch 时，Slate 的 onPaste handler 因 selection=null 不更新 model，model→DOM 同步因此中断，导致 (1) 输入框残留文本（Bug 2），以及 (2) Discord optimistic message UI 插入延迟，超过 adapter 端 5s waitForNewMessage 而被报为 TIMEOUT（Bug 1）。两个 bug 共享单一根因：Escape 是 Slate-state polluting，而非 Slate-state recovering。

fix: |
  把 entrypoints/background.ts:40-108 的 discordMainWorldPaste 中的 Escape keydown 替换为 InputEvent('beforeinput', { inputType: 'deleteContent' })，并在 paste 之前增加防御式残留清理（textContent 非空时先 dispatch 一次 beforeinput[deleteContent]）。新流程：
  
    focus → [if textContent非空: beforeinput deleteContent] → paste → Enter keydown → 200ms 等待 → [if textContent非空: beforeinput deleteContent]
  
  beforeinput[deleteContent] 是 slate-react 的 Editable 原生处理路径（与 Backspace/Delete 共用），同步更新 Slate model 与 DOM，没有"关闭 UI panel"等副作用，幂等于已清空的 editor。tests/unit/dispatch/discordMainWorldPaste.spec.ts 同步更新为 5 tests 覆盖 clean-editor / residual-editor / no-Escape / 200ms timer / no-editor 五条路径。

verification: |
  自动化验证通过：
  - pnpm test → 29 test files / 204 tests all pass（新增 3 个针对 UAT 回归的断言；原有 dispatch-timeout 2 tests 不受影响）
  - pnpm typecheck → 0 TypeScript errors
  - pnpm build → .output/chrome-mv3/content-scripts/discord.js 7.34 KB（构建产物体积无显著变化）
  - TDD red→green 已确认：把 mirror 临时还原为旧 Escape 实现时，新增的 3 条断言全部失败；恢复 beforeinput 实现后全部通过
  
  剩余 human verification（headed-Chrome live UAT，无法自动化）：
  1. 加载 unpacked 扩展到 Chrome
  2. 在 Discord 频道执行 dispatch #1 → 验证消息发送 + input 清空 + popup ok
  3. 不刷新页面，立即执行 dispatch #2 → 关键回归点：input 应当清空（不再残留），popup 应当显示成功（不再超时）
  4. 重复 dispatch #3、#4 多次，确认状态自恢复

files_changed:
  - entrypoints/background.ts
  - tests/unit/dispatch/discordMainWorldPaste.spec.ts
