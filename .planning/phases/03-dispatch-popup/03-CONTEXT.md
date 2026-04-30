# Phase 3: 投递核心 + Popup UI - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 交付**投递这一半**的核心价值与对应的 popup 表单：

1. **popup 表单**：`send_to` 输入 + 平台 icon (DSP-01) + 历史下拉 (DSP-02)；`prompt` 输入 + 历史 (DSP-03)；`send_to` ↔ `prompt` 绑定与自动切换 (DSP-04)
2. **投递流水线** (background)：`dispatch-pipeline.ts` + `adapter-registry.ts`，`chrome.tabs.create/update` → 等待 `tabs.onUpdated:complete` → adapter `executeScript` 注入；状态机以 `dispatchId` 为键写 `chrome.storage.session`，对 SW 重启幂等且可续 (DSP-05/06)
3. **错误模型与生命周期**：`canDispatch` 探针 + 4 个新 ErrorCode（`NOT_LOGGED_IN`/`INPUT_NOT_FOUND`/`TIMEOUT`/`RATE_LIMITED`）+ popup retry + i18n 文案 (DSP-07/08)；工具栏 badge 三态 (DSP-08)
4. **草稿恢复与快捷键**：`popupDraft` storage.local item，跨 popup 关闭恢复 send_to / prompt / 编辑过的 capture 字段 (DSP-09)；`commands` API 注册可重绑快捷键 (DSP-10)
5. **设置面板** (`entrypoints/options/`)：含"Reset all history"按钮 + 二次确认弹窗 (STG-03)
6. **adapter 接缝就位**：`IMAdapter` TypeScript 接口 + `mock-platform.ts` stub adapter（让 dispatch e2e 端到端跑通），Phase 4/5 落地真实 OpenClaw / Discord adapter 时只需 register 即可

Phase 3 **不包含**：

- 真实的 OpenClaw / Discord 适配器（Phase 4/5）
- 任何具体平台的 DOM 选择器、`compose`/`send` 实现（adapter 文件存在但只是 stub）
- `optional_host_permissions` 运行时授权流程（ADO-07，Phase 4）
- 运行时 locale 切换（I18N-02，Phase 6）
- ESLint 完整版 hardcoded-string detector（I18N-03，Phase 6）
- PRIVACY.md（DST-02，Phase 7）
- 失败队列 + 自动重试（V1X-01，v1.x）
- 多目标 fan-out（V1X-02，v1.x）

</domain>

<decisions>
## Implementation Decisions

### 1. Adapter 契约 + Phase 3 停手位置 (D-23..D-26)

- **D-23:** **Phase 3 交付 `mock-platform.ts` stub adapter** — `compose()` 写 `console.log`，`send()` 返回 fake success Result。Phase 3 e2e 走通 popup → SW → adapter 全链路；Phase 4 落地 OpenClaw 时直接 register 真实 adapter 替换 stub。理由：simplicity first；让 Phase 3 success criteria #3/#4 可被 Playwright 端到端断言，而非"awaiting_adapter 状态截止"占位实现。
- **D-24:** **PlatformDetector = adapter-registry.match() 代查表驱动**。`adapter-registry.ts` 列出 `IMAdapter` 的静态 descriptor `{ id, match(url): boolean, scriptFile, hostMatches }`；`platformDetector(url)` 循环 registry 调 `match()`，返回首个命中的 adapter id。新增平台只改一文件；popup debounce（一次按键内）触发本同步函数。理由：(a) SUMMARY.md 明示"adapter 注册表而非硬编码 if/else"；(b) Phase 3 stub 也能被 detector 命中；(c) Phase 4/5 加 adapter 时 detector 自动可见。
- **D-25:** **send_to URL 未匹配任何已注册 adapter 时**：Confirm 按钮 `disabled` + 灰色通用 icon + tooltip 文案 "Unsupported platform"。理由：v1 范围明示 OpenClaw + Discord 二者（PROJECT.md），其余平台是 v2。让 popup UI 显式说"这不是我们支持的"比静默失败 / fallback 原生导航更合 UX 边界。
- **D-26:** **registry 形态 = static descriptor + dynamic injection**。registry 内部不 import adapter 模块；SW 选中 adapter 后 `chrome.scripting.executeScript({ files: [adapter.scriptFile] })` 动态注入。理由：(a) adapter bundle 不进 SW bundle（与 Phase 2 extractor 模式一致）；(b) SW bundle 大小可控；(c) Phase 5 Discord adapter 的 ARIA selector / paste injection 代码不被拉进 SW。

### 2. send_to ↔ prompt 绑定 + 历史排序 (D-27..D-30)

- **D-27:** **Soft overwrite 切换语义**。用户从 send_to history 选中条目时：如果当前 `prompt` 未被用户 dirty（值仍等于上次从 storage 读出的值），覆盖为绑定值；如果已 dirty（用户修改过），保留用户输入并 surface 一个不显眼的 "Use bound prompt for X" 链接。理由：用户的输入永远不被静默覆盖；roadmap SC #2 的三步切换场景（A→pa, B→pb, 再 A→pa）在 dirty 都为 false 时自然成立。
- **D-28:** **绑定持久化策略 = idle debounce upsert (800ms)**。用户在 prompt 输入框 idle 800ms 后，自动 `repo.binding.upsert({ send_to, prompt, last_dispatched_at })` 到 `chrome.storage.local`。理由：roadmap SC #2 三步切换场景要求"选 A → prompt = pa → 选 B → prompt = pb → 再选 A → prompt = pa"在三次面表层动作中都能读出 binding —— 等到 dispatch 才落库会让 e2e 跑不通；idle 800ms 足够过滤掉中途敲键。tentative-permanent 双档复杂度太高被驳回。
- **D-29:** **历史排序 = Hybrid `score = exp(-Δt/τ) + 0.3·log(count+1)`，τ=7天，取前 N=8 项展示**。同样公式适用于 prompt 历史。理由：(a) 最近使用优先（recency 项）；(b) 高频项不被偶发低频项搅乱（freq 项 log 平滑）；(c) 与 SUMMARY.md "MRU + 频次混合"明示一致。参数 τ / freq weight / N 可在 v1.x 再调（V1X-* 已登记），v1 默认上述即可。
- **D-30:** **历史下拉 UI = `<input>` + 自定义 ARIA combobox listbox**。focus 或 typing 时下拉出现，带过滤匹配、键盘导航（↑/↓/Enter/Esc）、ARIA `combobox` + `listbox` + `aria-activedescendant` 结构；list item 内含平台 icon + 文本 + "delete this entry" 按钮。理由：原生 `<datalist>` 不能插入 icon / 删除按钮，与 Phase 6 i18n 加固时的 a11y 审计目标也不友好；自定义实现 ~100 行 Preact，但 Playwright 可靠测试。combobox 模式适用于 send_to 与 prompt 两个字段。

### 3. Dispatch state machine + SW 重启韧性 (D-31..D-34)

- **D-31:** **状态机 = `pending` → `opening` → `awaiting_complete` → `awaiting_adapter` → `done | error | cancelled`**。`opening` = `tabs.create/update` 已发出但导航未 complete；`awaiting_complete` = 已订阅 `tabs.onUpdated:complete` 等待中；`awaiting_adapter` = `executeScript` 已下发、adapter 未返回。每个状态以 `{ state, dispatchId, target_tab_id, send_to, prompt, snapshot, started_at, last_state_at }` 形态写 `chrome.storage.session`。Phase 3 由 stub adapter 把 `awaiting_adapter` 推进到 `done`。
- **D-32:** **幂等键 = popup 生成的 UUID dispatchId**。popup 在点击 Confirm 的同步路径中 `crypto.randomUUID()`，作为 `dispatch.start({ dispatchId, payload })` RPC 的一部分送 SW；SW 进入 handler 第一步：`chrome.storage.session.get(['dispatch:'+id])` 检查；存在 → 返回当前状态、不重启动；不存在 → 写 pending 并继续。popup 内 module-level signal 持有 `activeDispatchId` 给快速双击 / popup 重开复用同一 id。理由：roadmap SC #4 "200ms 内连续两次点击"被自然过滤；hash 派生 id 太严会拦截用户有意重发，被驳回。
- **D-33:** **SW 重启唤醒入口 = `chrome.tabs.onUpdated:complete` 顶层 listener**。SW `defineBackground` 闭包顶层（与 `capture.run` 注册同步路径）注册 `chrome.tabs.onUpdated.addListener`，在 listener 中：`status === 'complete'` 时遍历 `chrome.storage.session` 查找 `state === 'awaiting_complete' && target_tab_id === tabId` 的 dispatch，命中则推进 `awaiting_adapter` 并 `executeScript` 注入 adapter。理由：tabs.onUpdated 是 Chrome 保证唤醒 SW 的事件；与 Phase 1 顶层 listener 模式一致；不依赖 chrome.alarms 30s 超时。**附加**：每个 dispatch 进入 `opening` 时同时设 `chrome.alarms.create('dispatch-timeout:'+id, { delayInMinutes: 0.5 })` 作为兜底超时 → 推进 `error: TIMEOUT`。
- **D-34:** **Badge 三态过期策略**：
  - `loading` = `...` (灰色) — 任意 dispatch 在 `pending|opening|awaiting_complete|awaiting_adapter` 状态时显示
  - `ok` = `ok` (绿色) — dispatch 进入 `done` 时设置；通过 `chrome.alarms.create('badge-clear:'+id, { delayInMinutes: 5/60 })` 5 秒后自清
  - `err` = `err` (红色) — dispatch 进入 `error` 时设置；**不**自清，保留至下次 popup 打开（popup mount 时 `chrome.action.setBadgeText('')`），让用户能看到上次失败提示
  - 设置 / 读取通过 `chrome.action.setBadgeText` + `setBadgeBackgroundColor`；`badgeColors = { loading: '#94a3b8', ok: '#22c55e', err: '#ef4444' }`（slate-400 / green-500 / red-500，与 Tailwind 调色板一致）

### 4. Draft 恢复 + 设置 / 快捷键 (D-35..D-38)

- **D-35:** **`popupDraft` 单 storage.local item**。schema = `{ schemaVersion, send_to, prompt, title, description, content, dispatch_id_hint?, updated_at }`。popup mount 时一次读取 + 初始化 4 个 signal（titleSig / descriptionSig / contentSig 已在 Phase 2 存在，新增 sendToSig / promptSig）；用户输入走 800ms debounce 写回。理由：(a) 一条记录走完整 popup 状态；(b) reset 简单 (`popupDraft.removeValue()` 单调用)；(c) 与 Phase 1 typed item / WXT `defineItem<T>` 模式一致。三 item 拆分被驳回（IO 三倍 + 中间不一致风险）；storage.session 形态被驳回（DSP-09 要求"popup 重新打开"恢复，包含跨进程重启）。
- **D-36:** **dispatch=done 后立即清 popupDraft**；`error / cancelled` 不清（让用户重试）。理由：与"发送成功 = 该话题结束"用户预期一致；roadmap SC #5 "popup 重新打开时能恢复未发送的"语义中 done 状态不在"未发送"集合内。带 TTL 的方案（如 24h 后清）被驳回（额外复杂度，且 history dropdown 已能让用户重选历史项）。
- **D-37:** **独立 `entrypoints/options/` options page**（WXT 标准 entrypoint），通过 `chrome.runtime.openOptionsPage()` 打开。Phase 3 在此交付 STG-03 "Reset all history" 按钮 + 二次确认 dialog。理由：(a) 独立 URL 可被深链接、书签；(b) 不挤占 popup 360×240 空间；(c) Phase 4 (grantedOrigins 管理) + Phase 6 (i18n switcher) 都会在此扩展。popup 右上角加齿轮 icon 触发 `openOptionsPage()`。
- **D-38:** **默认快捷键 = Ctrl+Shift+S**。`manifest.json` `commands` 字段注册：`commands: { _execute_action: { suggested_key: { default: 'Ctrl+Shift+S' } } }`。用户冲突时在 `chrome://extensions/shortcuts` 重绑（Chrome 原生 UI）。理由：roadmap SC #5 明文写"默认 `Ctrl+Shift+S`"；不加 onboarding 流程（额外路径，simplicity-first）。

### Claude's Discretion

下列决策委托给 plan 阶段，由 planner 按 simplicity-first 与已锁定的上下文裁定：

- **`ErrorCode` 联合扩展**：Phase 3 追加 `'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'PLATFORM_UNSUPPORTED'`（最后一个对应 D-25 的 disabled 但仍需结构化错误码）+ stub adapter 用 `'INTERNAL'` 即可；具体每条 i18n 文案 key 由 plan 阶段定。
- **`ProtocolMap` 拆分时机**：Phase 1 D-07 锁定"路由 > 5 触发拆分"。Phase 3 新增路由约 5–6 条（`dispatch.start`, `dispatch.cancel`, `history.list`, `history.delete`, `binding.upsert`, `binding.get`），首次触发拆分 → `shared/messaging/routes/{capture,dispatch,history,binding}.ts`，由 `protocol.ts` 聚合 import。
- **typed-repo 业务方法层**：Phase 1 D-50 把"是否包装到 `repo.history.add(send_to)` / `repo.binding.upsert(send_to, prompt)`"deferred 到 Phase 3。推荐：包装。理由：业务规则（去重、score 计算、cap 上限 ≤ 50 项、最久项裁切）需要集中在一处，不可由 popup / SW 各自重复实现。文件位置 `shared/storage/repos/{history,binding,popupDraft}.ts`。
- **popup 关闭时机**：dispatch.start RPC resolve 后 popup 立刻 `window.close()`，让用户通过 badge 看进度（不阻塞 popup）。理由：popup 是 chrome.action 弹层，"挂着等结果"违反 popup 的瞬态语义；用户重新点 action 图标就能再看进度（popup mount 时读 `dispatch:active`）。
- **popup mount 时若有进行中 dispatch**：popup 检测 `chrome.storage.session.get(['dispatch:active'])`，若存在 `state ∉ {done, error, cancelled}` 的记录，popup 渲染"投递进行中"占位 UI（带 cancel 按钮）；用户取消则 dispatch.cancel RPC。
- **combobox 键盘导航细节**：↑/↓ 在 listbox 中循环，Enter 选中并填入 input，Esc 关闭 listbox 保留 input 当前值，Tab 关闭 listbox 走原生焦点循环。具体 ARIA 属性命名（`aria-expanded`、`aria-activedescendant`、`aria-autocomplete="list"`）由 plan 决定，UI-SPEC.md 内补齐。
- **历史下拉显示数量 N=8 + "更多..."**：D-29 取 N=8。超过 8 项时 listbox 末尾插入"View all..."项跳到 options page 的"History" tab。Phase 3 不实现 options page History tab，只插占位项。
- **stub adapter 失败注入路径**：mock-platform.ts 是否提供 query string 触发"模拟失败"的 e2e hook（如 send_to 形如 `mock://fail-not-logged-in` → adapter return Err NOT_LOGGED_IN）。推荐：是；让 Phase 3 e2e 可断言 popup 错误三态对每个 ErrorCode 渲染正确文案。
- **dispatch 探针 `canDispatch`**：Phase 3 stub adapter 始终返回 ok；真实探针逻辑（DOM 就绪 + 登录墙检测）在 Phase 4/5 各自 adapter 内实现。Phase 3 在 IMAdapter 接口里把 `canDispatch?: () => Promise<Result<void>>` 标为 optional，stub 不实现。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目顶层上下文

- `CLAUDE.md` — 已锁定的 SW 纪律、权限模型、DOM 注入路径、i18n 与存储约定；下游 planner 必须把"约定 (Conventions)"视为硬约束（特别是 React 受控 input 的 property-descriptor setter 与 Slate/Lexical 的合成 ClipboardEvent 路径，Phase 3 stub adapter 不需要这些但 IMAdapter 契约必须能容纳）
- `.planning/PROJECT.md` — Core Value、约束、Key Decisions 表（含 OpenClaw 动态权限决策 — Phase 4 才落地，但 IMAdapter 契约要为之留口）
- `.planning/REQUIREMENTS.md` §"Dispatch Core (投递主链路)" — Phase 3 对应的 11 条 REQ-ID（DSP-01..10 + STG-03）的可观察验收要求
- `.planning/ROADMAP.md` §"Phase 3: 投递核心 + Popup UI" — 5 条成功标准的精确措辞（debounce 内出 icon / 三步绑定切换 / SW 重启续接 / 200ms 双击幂等 / draft 恢复 + 错误码 i18n + 快捷键 + STG-03 reset）
- `.planning/STATE.md` — 当前进度与会话连续性
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 的 D-01..D-12 决策（typed messaging、Result/ErrorCode 模型、storage migration 框架、popup mount-trigger 模式、Tailwind v4 from day 1、CI baseline）
- `.planning/phases/02-capture/02-CONTEXT.md` — Phase 2 的 D-13..D-22 决策（ArticleSnapshot shape、capture.run RPC、popup signal 编辑模型、D-22 把 articleSnapshotDraft 推到 Phase 3）

### 技术与架构调研

- `.planning/research/SUMMARY.md` §"阶段 3：投递核心 + Popup UI" — 总览交付物、UX moat 描述（"send_to ↔ prompt 绑定—切换目标时自动切换关联 prompt—没有任何竞品实现了这一点"）
- `.planning/research/STACK.md` §"配套库" — `zod`（消息 schema 校验）、`@preact/signals`（响应式状态用法）、`@webext-core/messaging`（已就位）
- `.planning/research/ARCHITECTURE.md` §"Dispatch 数据流" + §"模式 2：IMAdapter 注册表" + §"模式 3：以编程注入取代静态 content_scripts" — dispatch RPC 形态、adapter-registry 形态、`chrome.scripting.executeScript` 动态注入模式（Phase 3 stub adapter 沿用）
- `.planning/research/PITFALLS.md` 重点段：
  - §陷阱 3（SW 中途死亡） — Phase 3 的 dispatch state machine + storage.session 持久化 + tabs.onUpdated 顶层 listener 路径正是这个陷阱的核心 mitigation
  - §陷阱 7（登录墙） — Phase 3 stub adapter 不触碰，但 IMAdapter 接口里 `canDispatch?` 探针留给 Phase 4/5
  - §陷阱 8（重复发送） — Phase 3 dispatchId 幂等 + storage.session 检查
  - §陷阱 10（popup 状态丢失） — Phase 3 popupDraft storage.local item + 800ms debounce 是这个陷阱的 mitigation
  - §"集成坑" 行 "popup 关闭时机" — popup 立即关闭让用户走 badge 反馈
  - §"安全错误" 第 1 行 — Phase 3 popup 的所有用户输入（send_to / prompt / 编辑过的 title/description/content）都不渲染 HTML，textarea / output 文本节点而已
- `.planning/research/FEATURES.md` — Phase 4/5 adapter 入口契约（影响 IMAdapter 接口签名 — `match` / `waitForReady` / `compose` / `send` / 可选 `canDispatch`）

### 外部权威文档

- WXT 0.20.x §"entrypoints/options" §"manifest.commands" §"webNavigation" — options page 标准 entrypoint、commands API 配置、SPA 路由感知（Phase 5 用，但 Phase 3 IMAdapter 契约要留口）
- Chrome MV3 §`chrome.tabs.create/update/query` §`chrome.tabs.onUpdated` §`chrome.scripting.executeScript` §`chrome.storage.session/local` §`chrome.alarms` §`chrome.action.setBadgeText` §`commands` §`chrome.runtime.openOptionsPage` — Phase 3 全部 SW API 都从这里来
- `@preact/signals` 文档 — module-level signal vs component-level useState 选择（Phase 3 popup 编辑值与 dispatch 状态都走 signal 模式，与 Phase 2 一致）
- ARIA 1.2 Combobox + Listbox pattern — D-30 的 a11y 模板
- `crypto.randomUUID()` MDN — D-32 的 dispatchId 生成 API（Chrome 92+ 原生支持，无 polyfill）

### Phase 3 不需要 / 不会读的外部 spec

- 各 IM 平台 DOM contract（OpenClaw / Discord 选择器） — Phase 4 / 5 才需要；Phase 3 stub adapter 不依赖
- `chrome.permissions.request` API — Phase 4 OpenClaw ADO-07 才用；Phase 3 stub adapter 不申请额外 origin
- React-controlled-input 的 property-descriptor setter / Slate/Lexical 的 ClipboardEvent 路径 — Phase 4 / 5 落地

</canonical_refs>

<code_context>
## Existing Code Insights

仓库已落地 Phase 1 + Phase 2 骨架与抓取流水线，Phase 3 在多个明确扩展点上叠加。

### Reusable Assets

- **`shared/messaging/protocol.ts`** — `ProtocolMap` interface + `schemas` const + `defineExtensionMessaging<ProtocolMap>()` exports + Phase 2 已加 `capture.run` + `ArticleSnapshotSchema`。Phase 3 触发 D-07 拆分阈值（路由 > 5）：拆分到 `shared/messaging/routes/{capture,dispatch,history,binding}.ts`，由 `protocol.ts` 聚合 import + 重导出。
- **`shared/messaging/result.ts`** — `ErrorCode` 联合 + `Result<T, E>` + `Ok` / `Err` helpers。Phase 3 在此扩展 5 个新码 (`NOT_LOGGED_IN`, `INPUT_NOT_FOUND`, `TIMEOUT`, `RATE_LIMITED`, `PLATFORM_UNSUPPORTED`)；helper 不动。文件头注释里已为 Phase 3 留白。
- **`shared/messaging/index.ts`** — barrel；Phase 3 加新类型导出（`DispatchPayload`, `DispatchState`, `DispatchRecord`, `HistoryEntry`, `BindingEntry`, `IMAdapter`, `AdapterRegistryEntry`, `PopupDraft`）。
- **`shared/storage/items.ts` + `migrate.ts`** — Phase 1 仅 `metaItem`。Phase 3 新增多个 storage items：`sendToHistoryItem`, `promptHistoryItem`, `bindingsItem`, `popupDraftItem`（local）+ `dispatchActiveItem`（session）。`shared/storage/repos/{history,binding,popupDraft,dispatch}.ts` 业务包装层（D-50 deferral closure）。
- **`shared/i18n/`**（已就位） — Phase 3 popup + options page 全部文案走 `t('dispatch.*')` / `t('options.*')` / `t('history.*')` / `t('binding.*')` 命名空间；en + zh_CN locale 100% 同构（CI 检查从 Phase 1 即在）。
- **`entrypoints/background.ts`** — `defineBackground` 闭包顶层 `onMessage('meta.bumpHello', ...)` + `onMessage('capture.run', ...)`。Phase 3 在同一闭包内顶层追加：`onMessage('dispatch.start', ...)`, `onMessage('dispatch.cancel', ...)`, `onMessage('history.list', ...)`, `onMessage('history.delete', ...)`, `onMessage('binding.upsert', ...)`, `onMessage('binding.get', ...)`；以及 `chrome.tabs.onUpdated.addListener(...)` 与 `chrome.alarms.onAlarm.addListener(...)` —— **全部顶层同步路径**（FND-02 不可破）。业务核心抽到 `background/dispatch-pipeline.ts` + `background/adapter-registry.ts`。
- **`entrypoints/popup/App.tsx`** — Phase 2 的 4-state capture UI。Phase 3 演化为 SendForm 屏：在 capture preview 之上加 send_to / prompt 输入与历史下拉、Confirm 按钮、dispatch 进行中占位 UI、cancel 按钮。**保留** Phase 2 的 capture-success 编辑区域作为 SendForm 的"snapshot preview"子区。
- **`entrypoints/extractor.content.ts`** — Phase 2 抓取 content script。Phase 3 不动。
- **`background/capture-pipeline.ts`** — Phase 2 抓取流水线编排。Phase 3 不动；新增 `background/dispatch-pipeline.ts` 与 `background/adapter-registry.ts` 平行。
- **`scripts/verify-manifest.ts`** — 已断言静态 `host_permissions === ["https://discord.com/*"]` + `optional_host_permissions === ["<all_urls>"]`。Phase 3 manifest 新增 `commands` 字段 + `entrypoints/options/` 自动生成 `options_page` 字段；scripts 增加断言：(a) `commands._execute_action.suggested_key.default === 'Ctrl+Shift+S'`；(b) `options_page` 字段存在且非空。
- **`tests/unit/`**（已 9 files / 36 tests，Phase 2 测试已落地） — Phase 3 加：
  - `tests/unit/dispatch/state-machine.spec.ts` — 状态机推进 + storage.session 幂等
  - `tests/unit/dispatch/platform-detector.spec.ts` — adapter-registry.match() 代查表
  - `tests/unit/repos/history.spec.ts` — history 排序公式 + cap 50 + 去重
  - `tests/unit/repos/binding.spec.ts` — binding upsert / dirty flag
  - `tests/unit/messaging/dispatch.spec.ts` — RPC mirror（与 capture.spec.ts 同模式）
- **`tests/e2e/`**（Phase 1 已 3 specs + Phase 2 已 capture.spec.ts） — Phase 3 加：
  - `tests/e2e/dispatch.spec.ts` — Confirm → mock-platform 收到注入 → badge ok 5s → popup 重开看到 done 历史；含双击 200ms 幂等断言；含 SW restart（Phase 1 已落地的 CDP `ServiceWorker.stopWorker` fixture）后 dispatch 仍续接断言
  - `tests/e2e/draft-recovery.spec.ts` — popup 编辑 send_to/prompt → 关闭 → 重开恢复
  - `tests/e2e/options-reset.spec.ts` — STG-03 reset all history + 二次确认

### Established Patterns（来自 Phase 1 + Phase 2，必须遵守）

- **SW 顶层 listener 注册**：`onMessage('dispatch.start', wrapHandler(...))` / `tabs.onUpdated.addListener(...)` / `chrome.alarms.onAlarm.addListener(...)` 必须出现在 `defineBackground` 顶层闭包同步路径（FND-02）
- **`wrapHandler` 单类参签名**：`<T>(fn: () => Promise<Result<T>>) => () => Promise<Result<T>>` — 不重构
- **Result 单一路径**：业务"未识别平台 / 登录墙 / 超时"等都走 `Err(code, ...)`，popup 单一 `result.ok` 分支
- **i18n key 命名**：新文案命名空间 `dispatch.*` / `options.*` / `history.*` / `binding.*` / `error.code.*`
- **storage 写入唯一通过 typed repo**：Phase 3 新增 `repo.history.add(send_to)` / `repo.binding.upsert(send_to, prompt)` 业务方法层（D-50 closure）
- **popup mount 自动派发**：Phase 3 popup mount 仍自动 `capture.run`（Phase 2 D-15）；新增"如果 storage.session 有进行中 dispatch 则渲染 in-progress UI"的并行检查
- **popup signal 编辑模型**：Phase 2 的 `titleSig` / `descriptionSig` / `contentSig` 三个 signal 保留；Phase 3 新增 `sendToSig` / `promptSig` / `dispatchInFlightSig` 同模式

### Integration Points

Phase 3 创建的接口 / 数据结构会被以下 phase 直接消费：

- `IMAdapter` 接口 + `adapter-registry.ts` — Phase 4 OpenClaw adapter 与 Phase 5 Discord adapter 各自实现接口、注册到 registry
- `dispatch-pipeline.ts` 的 stage 推进点 (`opening` / `awaiting_complete` / `awaiting_adapter`) — Phase 4/5 adapter 在 `awaiting_adapter` 阶段被注入并需要 `Ok(void) | Err(...)` 返回
- `ErrorCode` 联合扩展 — Phase 4 ADO-05 加 `'OPENCLAW_OFFLINE' | 'OPENCLAW_PERMISSION_DENIED'`
- `repo.history.add` / `repo.binding.upsert` — Phase 4/5 adapter 不直接调；popup → SW dispatch handler → repo 走完整路径
- `entrypoints/options/` page — Phase 4 加 grantedOrigins 管理 tab；Phase 6 加 i18n locale switcher tab
- `popupDraft` schema — 任何后续修改 popup 表单字段的 phase 都必须在 `shared/storage/migrate.ts` 加 v2 → v3 migration

</code_context>

<specifics>
## Specific Ideas

- **`IMAdapter` 接口骨架**（`shared/messaging/types.ts` 或 `shared/adapters/types.ts`）：

  ```ts
  export interface IMAdapter {
    readonly id: PlatformId;          // 'mock' | 'openclaw' | 'discord' (v1)
    match(url: string): boolean;
    waitForReady?(timeoutMs?: number): Promise<Result<void, 'TIMEOUT'>>;
    compose(message: string): Promise<Result<void, 'INPUT_NOT_FOUND'>>;
    send(): Promise<Result<void, 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'RATE_LIMITED'>>;
    canDispatch?(): Promise<Result<void, ErrorCode>>;
  }

  export interface AdapterRegistryEntry {
    id: PlatformId;
    match(url: string): boolean;        // popup 与 SW 都用，纯函数无 chrome.* 依赖
    scriptFile: string;                  // 'content-scripts/adapters/mock.js' etc.
    hostMatches: string[];               // 用于 verify-manifest 校验对齐
    iconKey: string;                     // 'platform.icon.mock' i18n key
  }
  ```

- **`DispatchRecord` 状态机骨架**（`chrome.storage.session` 内 keyed by `dispatch:<dispatchId>`，外加 `dispatch:active` 软指针指向当前 in-flight dispatchId）：

  ```ts
  export interface DispatchRecord {
    schemaVersion: 1;
    dispatchId: string;                  // UUID by popup
    state: 'pending' | 'opening' | 'awaiting_complete' | 'awaiting_adapter' | 'done' | 'error' | 'cancelled';
    target_tab_id: number | null;        // null until tabs.create resolves
    send_to: string;
    prompt: string;
    snapshot: ArticleSnapshot;
    platform_id: PlatformId;
    started_at: string;                  // ISO-8601
    last_state_at: string;               // ISO-8601
    error?: { code: ErrorCode; message: string; retriable: boolean };
  }
  ```

- **`HistoryEntry` + `BindingEntry`**（`chrome.storage.local` 内）：

  ```ts
  export interface HistoryEntry {
    value: string;          // send_to URL or prompt text
    last_used_at: string;   // ISO-8601
    use_count: number;
  }

  export interface BindingEntry {
    send_to: string;
    prompt: string;
    last_dispatched_at: string;  // null 直到首次 dispatch；idle upsert 时是 'never-dispatched-marker'
  }
  ```

  `repo.history.score(entry, now)` = `Math.exp(-(now - last_used_at)/τ) + 0.3 * Math.log(use_count + 1)`，τ = 7 * 24 * 3600 * 1000 ms。

- **dispatch 时序**（与 D-31..D-33 一致）：

  ```
  popup mount
    → 检查 dispatch:active → 若 in-flight 则渲染 InProgressView + Cancel 按钮
    → 若 no in-flight 渲染 CapturePreview + SendForm

  user types send_to
    → debounce 200ms → platformDetector(url) → 平台 icon 显示 / disable Confirm

  user clicks Confirm
    → popup: dispatchId = crypto.randomUUID()
    → popup: dispatchInFlightSig.value = dispatchId
    → popup: sendMessage('dispatch.start', { dispatchId, payload })
    → popup: window.close()
    → SW handler:
        1. storage.session.get(['dispatch:'+id]) — 已存在? 返回当前状态
        2. 写入 DispatchRecord state='pending'
        3. registry = await import('@/background/adapter-registry').default
        4. adapter = registry.find(a => a.match(send_to)) → ! → Err('PLATFORM_UNSUPPORTED')
        5. 写 state='opening'，chrome.tabs.create 或 update（已开则 activate）
        6. 写 state='awaiting_complete', target_tab_id=tabId
        7. chrome.alarms.create('dispatch-timeout:'+id, { delayInMinutes: 0.5 })
        8. RPC return Ok(dispatchId)  ← popup 已关，仅作 e2e 断言

    onUpdated:complete + tabId 命中
        9. 推进 state='awaiting_adapter'
       10. chrome.scripting.executeScript({ target:{tabId}, files:[adapter.scriptFile] })
       11. tabs.sendMessage(tabId, { type: 'ADAPTER_DISPATCH', payload }) → adapter compose+send → Result
       12. 写 state='done' | state='error'，chrome.action.setBadgeText('ok'|'err')
       13. dispatch=done → repo.binding.upsert + repo.history.add
       14. dispatch=done → chrome.storage.local.remove('popupDraft')
       15. dispatch=done → chrome.alarms.create('badge-clear:'+id, { delayInMinutes: 5/60 })

    onAlarm 'badge-clear:*' → setBadgeText('')
    onAlarm 'dispatch-timeout:*' → if state ∈ pending|opening|awaiting_complete|awaiting_adapter → 推进 error: TIMEOUT
  ```

- **测试 fixture / e2e 编排**：
  - `tests/unit/repos/history.spec.ts` — score 单调性 / cap 50 / 同 send_to 去重更新 use_count
  - `tests/unit/repos/binding.spec.ts` — upsert 不复制条目 / dirty 标记不会破坏读路径
  - `tests/unit/dispatch/state-machine.spec.ts` — 11 步推进每步状态正确 / 双击同 dispatchId 第二次返回当前状态不重启动 / SW restart 后 onUpdated:complete 能续接
  - `tests/unit/dispatch/platform-detector.spec.ts` — registry 内 mock + openclaw + discord match() 正反例
  - `tests/e2e/dispatch.spec.ts` — Phase 3 stub adapter 端到端，外加 `mock://fail-not-logged-in` 触发 NOT_LOGGED_IN 错误三态
  - `tests/e2e/draft-recovery.spec.ts` — popup 编辑 send_to → 关闭 popup → tabs.onUpdated 不发生 → 重开 popup → 字段恢复
  - `tests/e2e/options-reset.spec.ts` — options page 加载 → 点 Reset → 二次确认 → 历史清空 → popup 重开 history dropdown 为空

- **i18n 命名空间总表**（en + zh_CN 100% 同构）：
  - `dispatch.*` — confirm 按钮、in-progress 状态、cancel 按钮、success / failure 文案
  - `error.code.*` — 5 个新 ErrorCode 的人类可读文案 + 重试提示
  - `history.*` — 历史下拉占位、空态、删除条目确认
  - `binding.*` — "Use bound prompt for X" 链接文案
  - `platform.icon.*` — 各平台 icon 的 alt 文本（mock / openclaw / discord）
  - `options.*` — options page 全部文案，含 STG-03 reset 二次确认 dialog

- **manifest 校验脚本扩展**（`scripts/verify-manifest.ts`）：
  - 现有断言不变（D-26 静态 host_permissions / optional_host_permissions / permissions 三件套）
  - 新增：`commands._execute_action.suggested_key.default === 'Ctrl+Shift+S'`
  - 新增：`options_page` 字段存在且为非空字符串（WXT 自动从 entrypoints/options/ 生成）
  - 新增：`web_accessible_resources` 数组中 stub adapter bundle path 暴露范围最小化（如有暴露则 hostMatches 必须为已声明的 host_permissions 子集）

</specifics>

<deferred>
## Deferred Ideas

讨论中提到但**不在 Phase 3** 落地的项，按目标 phase 分组：

### 留 Phase 4 (OpenClaw 适配器)

- 真实 OpenClaw `IMAdapter` 实现 (`compose` / `send` / `canDispatch`) — Phase 3 stub 占位
- `chrome.permissions.request` 运行时 origin 申请流程 (ADO-07)
- `grantedOrigins` storage item + `permissions.requestOrigin` RPC 路由
- options page 增加"已授权 origin 管理"tab
- React-controlled-input property-descriptor setter helper (`shared/dom-injector.ts`)
- OpenClaw 服务未运行检测 → `OPENCLAW_OFFLINE` ErrorCode
- Playwright e2e CI 接入（Phase 1 D-11 deferral 在 Phase 4 closure，stub adapter 的 e2e 在 Phase 3 仅本地跑）

### 留 Phase 5 (Discord 适配器)

- 真实 Discord `IMAdapter` 实现 (Slate/Lexical paste injection、ARIA 优先 selector、SPA route handling、5s 硬超时)
- `chrome.webNavigation.onHistoryStateUpdated` 顶层 listener 注册（与 `chrome.tabs.onUpdated` 一并用于 SPA 频道切换）
- Discord ToS 风险声明（README + popup 永久脚注）
- Markdown escape helper (`shared/escape/{discord,openclaw}.ts`) — 处理 `@everyone` / `<@id>` / 反斜杠等
- discord.fixture.html DOM 抓取与 selector 单元测试

### 留 Phase 6 (i18n 加固)

- 运行时 locale 切换 (I18N-02) — options page tab 加 locale switcher，Phase 3 popup 文案仍跟 chrome.i18n 浏览器 UI 语言
- ESLint 完整版 hardcoded-string detector (I18N-03) — Phase 3 仍在 Phase 1 的轻量 JSX literal 拦截层运行
- popup 错误码人类可读文案的"语气 / 行动指引"打磨（Phase 3 落 baseline，Phase 6 polish）
- 首次运行引导 / 快捷键冲突检查（Phase 6 nice-to-have，与 D-38 onboarding 驳回的方案一致）

### 留 Phase 7 (分发)

- PRIVACY.md 列出 dispatch 阶段的字段流向 (DST-02)
- README 双语章节描述 send_to / prompt / 历史 / 绑定的语义 (DST-04)

### 留 v1.x（已在 REQUIREMENTS V1X-* 中登记）

- 失败队列 + chrome.alarms 重试 (V1X-01) — Phase 3 仅做 5s 自清 ok / 留 err 至下次 popup
- 多目标 fan-out (V1X-02)
- 自定义消息模板 + `{{title}}` / `{{url}}` / `{{content}}` / `{{prompt}}` 变量 (V1X-03) — Phase 3 dispatch payload 暂不模板化（adapter 端自由组合）
- 历史排序公式参数调优（τ / freq weight / N）

### 已驳回的方案（不进 deferred，仅记录）

- "Phase 3 dispatch pipeline 在 awaiting_adapter 状态截止打住，不交付 stub adapter" — D-23 选 stub；让 Phase 3 e2e 端到端可断言
- "popup 独立 PlatformDetector regex 表与 adapter.match() 并存" — D-24 选单一来源；杜绝两表不同步
- "send_to 未识别仍允许 Confirm + fallback 原生 tab 导航" — D-25 选 disable；与 v1 范围明示一致
- "popup 内嵌 settings 抽屉 / 不交付独立 options page" — D-37 选独立 page；popup 360px 空间不够
- "tentative + permanent binding 两档 storage" — D-28 选 idle debounce upsert 单档；额外复杂度无必要收益
- "组合哈希 dispatchId（send_to + content hash + window）" — D-32 选 popup UUID；避免拦截用户有意重发
- "badge 三态 5s 统一过期" / "popup 打开时才清" — D-34 选差异化策略；err 留至下次 popup 让用户感知失败
- "三个独立 draft items（sendTo/prompt/captureEdit）" — D-35 选单 popupDraft；避免三处 IO 不一致
- "popupDraft 写 storage.session" — D-35 选 storage.local；DSP-09 跨进程恢复
- "Alt+Shift+S 替代 Ctrl+Shift+S 避免 OS 冲突" — D-38 选 roadmap 明文 Ctrl+Shift+S；用户冲突时 chrome://extensions/shortcuts 重绑

</deferred>

---

*Phase: 3-dispatch-popup*
*Context gathered: 2026-04-30*
