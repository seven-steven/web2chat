---
status: investigating
trigger: "Discord 跨频道 SPA 导航投递成功但 popup 误报投递超时"
created: 2026-05-06T10:00:00Z
updated: 2026-05-06T10:30:00Z
---

## Current Focus

hypothesis: handleDispatch 的 waitForElement(5s) + injectMainWorldPaste(~2s) + waitForNewMessage(5s) = 最长 12s 总耗时，超过 dispatch-pipeline 的 10s ADAPTER_RESPONSE_TIMEOUT_MS。SPA 导航场景下 Discord UI 渲染慢，两个 MutationObserver 等待都接近满时，导致 SW 端 10s 超时先触发，但 content script 继续执行并成功发送消息。
test: 计算 handleDispatch 各阶段耗时的上界与 ADAPTER_RESPONSE_TIMEOUT_MS(10s) 的关系
expecting: SPA 加载场景下 handleDispatch 总耗时 > 10s，确认超时竞态
next_action: 确认根因后输出诊断结果

## Symptoms

expected: 跨频道 SPA 导航投递时，Discord 实际收到消息后，popup 显示"投递成功"
actual: 消息实际成功发送到 Discord 频道，但 popup 显示"投递超时"，插件图标显示错误（err badge）
errors: "投递超时" (ADAPTER_RESPONSE_TIMEOUT 或 EXECUTE_SCRIPT_FAILED)
reproduction: 1. 在 Discord 频道 A 上使用 Web2Chat 投递消息到频道 B（不同频道） 2. Discord SPA 导航到频道 B 3. 消息实际出现在频道 B 4. popup 显示超时错误
started: 跨频道 SPA 导航投递场景发现

## Eliminated

- hypothesis: Port bridge 响应链路断裂
  evidence: Port bridge 有完整的 onMessage + onDisconnect 处理，SW 端 onConnect 处理 executeScript + postMessage，链路完整
  timestamp: 2026-05-06T10:15Z

- hypothesis: chrome.tabs.sendMessage 消息未送达 content script
  evidence: executeScript 是 await 的，sendMessage 在之后调用；用户确认消息实际成功发送，证明 content script 确实收到了消息
  timestamp: 2026-05-06T10:15Z

- hypothesis: SPA pushState 导致 onHistoryStateUpdated 双重注入
  evidence: onTabComplete 检查 record.state !== 'awaiting_complete'，advanceToAdapterInjection 先写 awaiting_adapter 再 executeScript，所以 pushState 事件到达时记录已是 awaiting_adapter，被跳过
  timestamp: 2026-05-06T10:20Z

## Evidence

- timestamp: 2026-05-06T10:01Z
  checked: dispatch-pipeline.ts advanceToAdapterInjection (lines 191-296)
  found: |
    sendMessage 超时逻辑：
    1. executeScript 注入 discord.js 到 tab (ISOLATED world) - line 211-215
    2. chrome.tabs.sendMessage(tabId, { type: 'ADAPTER_DISPATCH', ... }) - line 232-240
    3. 与 10s setTimeout Promise.race - line 241-244
    如果 sendMessage 在 10s 内没有 resolve/reject，走 timeout 分支
  implication: sendMessage 的 10s 超时是 popup 显示"投递超时"的直接来源

- timestamp: 2026-05-06T10:10Z
  checked: discord.content.ts handleDispatch 完整流程 (lines 136-242)
  found: |
    handleDispatch 各阶段及最大耗时：
    1. findEditor() -> waitForElement() -> 最多 WAIT_TIMEOUT_MS=5000ms (line 20, 185)
    2. injectMainWorldPaste() -> Port 连接 + SW executeScript MAIN world -> 约 500-2000ms
    3. waitForNewMessage() -> MutationObserver 确认 -> 最多 WAIT_TIMEOUT_MS=5000ms (line 226)
    总上界: 5s + 2s + 5s = 12s > ADAPTER_RESPONSE_TIMEOUT_MS(10s)
  implication: SPA 导航场景下 Discord UI 渲染慢，waitForElement 和 waitForNewMessage 可能各自消耗接近 5s，加上 paste 耗时，总时长超过 10s SW 超时

- timestamp: 2026-05-06T10:20Z
  checked: background.ts Port bridge (lines 38-165) + discord.content.ts injectMainWorldPaste (lines 104-122)
  found: |
    Port bridge 链路完整：
    - ISOLATED world: chrome.runtime.connect -> port.postMessage({text}) -> port.onMessage resolve
    - SW: onConnect -> port.onMessage -> executeScript({ world: 'MAIN', func: discordMainWorldPaste }) -> port.postMessage({ok}) -> port.disconnect()
    - onDisconnect 有 chrome.runtime.lastError 处理
    但注意：onDisconnect 只在 lastError 存在时 resolve，如果没有 lastError 且没有 onMessage，promise 永不 resolve
  implication: Port bridge 本身逻辑正确，问题不在 Port 层

- timestamp: 2026-05-06T10:25Z
  checked: SPA 加载场景下 chrome.tabs.status 'complete' 时序
  found: |
    chrome.tabs.onUpdated status='complete' 在初始 HTML/CSS/JS 加载完成后触发，但 Discord SPA 的 React 应用
    启动、API 调用获取频道消息、UI 渲染（包括 Slate editor）都是后续异步操作。
    dispatch-pipeline 在 'complete' 后立即注入 content script 并 sendMessage。
    此时 Discord 的 editor 和 message list 很可能尚未渲染。
  implication: 这迫使 waitForElement 和 waitForNewMessage 都需要长时间等待 MutationObserver，累加超过 10s

## Resolution

root_cause:
fix:
verification:
files_changed: []
