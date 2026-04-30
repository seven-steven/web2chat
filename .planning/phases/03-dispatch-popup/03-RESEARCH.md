# Phase 3: 投递核心 + Popup UI - Research

**Researched:** 2026-04-30
**Domain:** Chrome MV3 dispatch pipeline + popup combobox UI + SW-restart resilient state machine
**Confidence:** HIGH (Chrome MV3 API 行为 + WXT 0.20.x 已通过 Phase 1/2 验证 + ARIA 1.2 combobox 来自 W3C / MDN authoritative 来源)

## Summary

Phase 3 把 Phase 1（typed messaging + Result/ErrorCode + storage migration）与 Phase 2（capture pipeline + popup signal 编辑模型）的两条骨架接合成一条可双向工作的主链路 — popup 既是 capture 的预览屏，也是 dispatch 的发起屏；SW 在 capture-pipeline.ts 之外平行新增 dispatch-pipeline.ts + adapter-registry.ts，并在 `defineBackground` 顶层增设两个新 listener（`chrome.tabs.onUpdated` + `chrome.alarms.onAlarm`），把 dispatch 状态机从模块级闭包搬到 `chrome.storage.session` 让其对 SW 重启幂等。Phase 3 不交付真实 IM 适配器（Phase 4/5）— mock-platform stub adapter 让端到端 e2e 在 Phase 3 收尾时即可断言。

研究焦点是 **CONTEXT.md 已锁定 16 个 D-23..D-38 决策但未量化的 8 个边界**：(a) tabs.onUpdated `complete` 唤醒语义与 frameId 过滤；(b) chrome.alarms 的最小粒度（30 秒，不是 60 秒，不是 5 秒）— 直接影响 D-34 badge-clear 5 秒过期的实现路径；(c) executeScript 错误表面 — 哪些归 `EXECUTE_SCRIPT_FAILED`，哪些归 `INPUT_NOT_FOUND`；(d) chrome.tabs.create vs update 决策树（同 origin 不同 hash / 不同 query）；(e) commands API 的 mac 默认转换；(f) chrome.action.setBadgeText global vs per-tab 与多并发 dispatch 的兼容性；(g) chrome.permissions.request 的 user-gesture 强约束 — Phase 4 hand-off 必须在 popup click 路径，不能下放给 SW；(h) WXT 0.20.x options page entrypoint 实际生成的是 `options_ui` 而非 `options_page`。

**Primary recommendation:** Phase 3 实现 = 11 个 task，按 4 个 wave 推进：(W0) 测试基建 & schema + ErrorCode 扩展；(W1) typed-repo 业务方法层 + adapter-registry stub；(W2) dispatch-pipeline state machine + tabs.onUpdated + alarms 顶层 listener；(W3) popup combobox UI + dispatch confirm + draft 恢复；(W4) options page + commands API + verify-manifest 扩展 + e2e 覆盖。**关键约束**：D-34 的 5 秒 badge-clear 只能用 `chrome.alarms.create({ delayInMinutes: 0.5 })` = **30 秒**最低粒度（unpacked 模式可低，production 必被 clamp），需要把决策从"5 秒后清绿"改为"30 秒后清绿"或者"用 setTimeout 但接受 SW 中途死亡的失效"— 见 §"Common Pitfalls" Pitfall 1。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| send_to / prompt 输入与历史下拉 UI | Popup (Preact) | — | popup 是用户唯一的输入面；signal 模型与 Phase 2 一致 |
| Platform detection (URL → adapterId) | Shared (pure fn) | Popup + SW 共用 | adapter-registry.match() 同时被 popup（icon 显示 + Confirm enable）与 SW（路由 adapter）调用；纯函数无 chrome.* 依赖 |
| send_to ↔ prompt binding 持久化 | Popup → SW RPC → typed-repo | Storage (local) | popup idle 800ms debounce 触发 `binding.upsert` RPC；SW 单写者保持 storage 一致性 |
| History 排序 + 去重 + cap | typed-repo (shared/storage/repos/) | SW 调用方 | 业务规则集中（D-50 closure），popup 与 SW 不重复实现；公式 `score = exp(-Δt/τ) + 0.3·log(count+1)` 在 repo 内 |
| dispatch 状态机推进 | Background SW (dispatch-pipeline.ts) | storage.session | SW 是唯一特权调用方；状态写 `chrome.storage.session` 让 SW 重启幂等可恢复 |
| tab open/activate + waitForComplete | Background SW | chrome.tabs.* APIs | 唯一能调用 chrome.tabs.* 的上下文；listener 必须顶层注册 |
| executeScript 注入 adapter bundle | Background SW | chrome.scripting.* | adapter 文件路径来自 registry descriptor；adapter 在 ISOLATED world 自注册 one-shot listener |
| Adapter `compose` + `send` (Phase 3 stub) | Content script (target tab) | DOM | mock-platform.ts 在 stub 中 `console.log` + Ok(void)，Phase 4/5 替换为真实实现 |
| 工具栏 badge 三态 | Background SW (chrome.action) | — | global badge（无 tabId）— 与多并发 dispatch 聚合天然契合 |
| popupDraft 持久化 | Popup → typed-repo | storage.local | 800ms debounce；popup signal 与 storage 双向；mount 时一次读取 |
| 快捷键 → 打开 popup | Manifest commands._execute_action | Chrome 内置 | `_execute_action` 由 Chrome 直接处理（不派发 onCommand），打开 popup = 触发 mount = 自动 capture.run（Phase 2 D-15 复用） |
| Options page (Reset history + 二次确认) | entrypoints/options/ (Preact) | typed-repo | 独立 entrypoint，`chrome.runtime.openOptionsPage()` 触发；Phase 4/6 在此扩展 |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Adapter 契约 + Phase 3 停手位置 (D-23..D-26)
- **D-23:** **Phase 3 交付 `mock-platform.ts` stub adapter** — `compose()` 写 `console.log`，`send()` 返回 fake success Result。Phase 3 e2e 走通 popup → SW → adapter 全链路；Phase 4 落地 OpenClaw 时直接 register 真实 adapter 替换 stub。
- **D-24:** **PlatformDetector = adapter-registry.match() 代查表驱动**。`adapter-registry.ts` 列出 `IMAdapter` 的静态 descriptor `{ id, match(url): boolean, scriptFile, hostMatches }`；`platformDetector(url)` 循环 registry 调 `match()`，返回首个命中的 adapter id。新增平台只改一文件；popup debounce（一次按键内）触发本同步函数。
- **D-25:** **send_to URL 未匹配任何已注册 adapter 时**：Confirm 按钮 `disabled` + 灰色通用 icon + tooltip 文案 "Unsupported platform"。
- **D-26:** **registry 形态 = static descriptor + dynamic injection**。registry 内部不 import adapter 模块；SW 选中 adapter 后 `chrome.scripting.executeScript({ files: [adapter.scriptFile] })` 动态注入。

#### send_to ↔ prompt 绑定 + 历史排序 (D-27..D-30)
- **D-27:** **Soft overwrite 切换语义**。用户从 send_to history 选中条目时：如果当前 `prompt` 未被用户 dirty（值仍等于上次从 storage 读出的值），覆盖为绑定值；如果已 dirty（用户修改过），保留用户输入并 surface 一个不显眼的 "Use bound prompt for X" 链接。
- **D-28:** **绑定持久化策略 = idle debounce upsert (800ms)**。用户在 prompt 输入框 idle 800ms 后，自动 `repo.binding.upsert({ send_to, prompt, last_dispatched_at })` 到 `chrome.storage.local`。
- **D-29:** **历史排序 = Hybrid `score = exp(-Δt/τ) + 0.3·log(count+1)`，τ=7天，取前 N=8 项展示**。同样公式适用于 prompt 历史。
- **D-30:** **历史下拉 UI = `<input>` + 自定义 ARIA combobox listbox**。focus 或 typing 时下拉出现，带过滤匹配、键盘导航（↑/↓/Enter/Esc）、ARIA `combobox` + `listbox` + `aria-activedescendant` 结构；list item 内含平台 icon + 文本 + "delete this entry" 按钮。

#### Dispatch state machine + SW 重启韧性 (D-31..D-34)
- **D-31:** **状态机 = `pending` → `opening` → `awaiting_complete` → `awaiting_adapter` → `done | error | cancelled`**。
- **D-32:** **幂等键 = popup 生成的 UUID dispatchId**。popup 在点击 Confirm 的同步路径中 `crypto.randomUUID()`；SW 进入 handler 第一步：`chrome.storage.session.get(['dispatch:'+id])` 检查；存在 → 返回当前状态、不重启动；不存在 → 写 pending 并继续。
- **D-33:** **SW 重启唤醒入口 = `chrome.tabs.onUpdated:complete` 顶层 listener**。每个 dispatch 进入 `opening` 时同时设 `chrome.alarms.create('dispatch-timeout:'+id, { delayInMinutes: 0.5 })` 作为兜底超时 → 推进 `error: TIMEOUT`。
- **D-34:** **Badge 三态过期策略**：loading=`...`(灰色 #94a3b8)；ok=`ok`(绿色 #22c55e)，5 秒后自清；err=`err`(红色 #ef4444)，不自清，保留至下次 popup 打开。

#### Draft 恢复 + 设置 / 快捷键 (D-35..D-38)
- **D-35:** **`popupDraft` 单 storage.local item**。schema = `{ schemaVersion, send_to, prompt, title, description, content, dispatch_id_hint?, updated_at }`。用户输入走 800ms debounce 写回。
- **D-36:** **dispatch=done 后立即清 popupDraft**；`error / cancelled` 不清（让用户重试）。
- **D-37:** **独立 `entrypoints/options/` options page**（WXT 标准 entrypoint），通过 `chrome.runtime.openOptionsPage()` 打开。Phase 3 在此交付 STG-03 "Reset all history" 按钮 + 二次确认 dialog。popup 右上角加齿轮 icon 触发 `openOptionsPage()`。
- **D-38:** **默认快捷键 = Ctrl+Shift+S**。用户冲突时在 `chrome://extensions/shortcuts` 重绑（Chrome 原生 UI）。

### Claude's Discretion

- **`ErrorCode` 联合扩展**：Phase 3 追加 `'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'PLATFORM_UNSUPPORTED'`（最后一个对应 D-25 的 disabled 但仍需结构化错误码）+ stub adapter 用 `'INTERNAL'` 即可。
- **`ProtocolMap` 拆分时机**：Phase 1 D-07 锁定"路由 > 5 触发拆分"。Phase 3 新增路由约 5–6 条（`dispatch.start`, `dispatch.cancel`, `history.list`, `history.delete`, `binding.upsert`, `binding.get`），首次触发拆分 → `shared/messaging/routes/{capture,dispatch,history,binding}.ts`，由 `protocol.ts` 聚合 import。
- **typed-repo 业务方法层**：推荐包装。文件位置 `shared/storage/repos/{history,binding,popupDraft,dispatch}.ts`。
- **popup 关闭时机**：dispatch.start RPC resolve 后 popup 立刻 `window.close()`，让用户通过 badge 看进度。popup mount 时若有进行中 dispatch，渲染"投递进行中"占位 UI（带 cancel 按钮）。
- **历史下拉显示数量 N=8 + "更多..."**：超过 8 项时 listbox 末尾插入"View all..."项跳到 options page 的"History" tab。Phase 3 不实现 options page History tab，只插占位项。
- **stub adapter 失败注入路径**：mock-platform.ts 提供 query string 触发"模拟失败"的 e2e hook（如 send_to 形如 `mock://fail-not-logged-in` → adapter return Err NOT_LOGGED_IN）。
- **dispatch 探针 `canDispatch`**：Phase 3 stub adapter 始终返回 ok；Phase 3 在 IMAdapter 接口里把 `canDispatch?: () => Promise<Result<void>>` 标为 optional。

### Deferred Ideas (OUT OF SCOPE)

#### 留 Phase 4 (OpenClaw 适配器)
- 真实 OpenClaw `IMAdapter` 实现 (`compose` / `send` / `canDispatch`)
- `chrome.permissions.request` 运行时 origin 申请流程 (ADO-07)
- `grantedOrigins` storage item + `permissions.requestOrigin` RPC 路由
- options page 增加"已授权 origin 管理"tab
- React-controlled-input property-descriptor setter helper (`shared/dom-injector.ts`)
- OpenClaw 服务未运行检测 → `OPENCLAW_OFFLINE` ErrorCode
- Playwright e2e CI 接入（Phase 1 D-11 deferral 在 Phase 4 closure）

#### 留 Phase 5 (Discord 适配器)
- 真实 Discord `IMAdapter` 实现 (Slate/Lexical paste injection、ARIA 优先 selector、SPA route handling、5s 硬超时)
- `chrome.webNavigation.onHistoryStateUpdated` 顶层 listener 注册
- Discord ToS 风险声明（README + popup 永久脚注）
- Markdown escape helper

#### 留 Phase 6 (i18n 加固)
- 运行时 locale 切换 (I18N-02) — options page tab 加 locale switcher
- ESLint 完整版 hardcoded-string detector (I18N-03)
- popup 错误码人类可读文案的"语气 / 行动指引"打磨（Phase 3 落 baseline，Phase 6 polish）
- 首次运行引导 / 快捷键冲突检查

#### 留 Phase 7 (分发)
- PRIVACY.md 列出 dispatch 阶段的字段流向 (DST-02)
- README 双语章节描述 send_to / prompt / 历史 / 绑定的语义 (DST-04)

#### 留 v1.x
- 失败队列 + chrome.alarms 重试 (V1X-01)
- 多目标 fan-out (V1X-02)
- 自定义消息模板 (V1X-03)
- 历史排序公式参数调优（τ / freq weight / N）

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSP-01 | popup 提供 `send_to` 输入框，输入即触发平台识别（OpenClaw / Discord）；识别结果以 IM 平台 icon 在输入框前展示；未识别时显示通用图标 | adapter-registry.match() 同步代查表（D-24）；popup 200ms debounce；mock-platform 在 Phase 3 即被 detector 命中 |
| DSP-02 | `send_to` 输入框带历史下拉：从 `chrome.storage.local` 中按 MRU（结合最近使用 + 频次）排序展示候选 | typed-repo `shared/storage/repos/history.ts`；公式 `score = exp(-Δt/τ) + 0.3·log(count+1)`（D-29）；ARIA 1.2 combobox 模式（D-30） |
| DSP-03 | popup 提供 `prompt` 输入框；记录历史并在用户输入时给出自动补全建议 | 同上 history repo + combobox 复用 |
| DSP-04 | `send_to` ↔ `prompt` 绑定：每个 `send_to` 历史项关联其上次配套使用的 `prompt`；切换 `send_to` 时 `prompt` 自动切换为该绑定值（用户仍可覆盖） | typed-repo `shared/storage/repos/binding.ts` + Soft overwrite（D-27）+ idle debounce upsert（D-28） |
| DSP-05 | 用户点击"确认"后，service worker 通过 `chrome.tabs.create`/`chrome.tabs.update` 打开或激活目标会话页，等待 `tab.onUpdated: complete` 后注入对应 adapter content script | dispatch-pipeline.ts state machine + chrome.tabs.onUpdated 顶层 listener（D-33） |
| DSP-06 | dispatch 状态写入 `chrome.storage.session`（按 `dispatchId` 索引），SW 重启后能继续完成或上报失败；同 `dispatchId` 的重复请求幂等 | DispatchRecord 形态 + popup 生成 UUID dispatchId（D-32）+ SW 重启入口 = tabs.onUpdated:complete（D-33） |
| DSP-07 | adapter 调用前先跑 `canDispatch` 探针（DOM 就绪 + 未被登录墙拦截）；探针失败时给出结构化错误码（`NOT_LOGGED_IN` / `INPUT_NOT_FOUND` / `TIMEOUT` / `RATE_LIMITED`），popup 展示对应人类可读文案与"重试"按钮 | ErrorCode 联合扩展 5 个新码 + i18n `error.code.*` 命名空间 + Phase 3 stub adapter 不实现 canDispatch（接口 optional） |
| DSP-08 | dispatch 完成后弹窗关闭前给出明确成功/失败反馈；工具栏 action icon 带 dispatch 生命周期 badge（loading / ok / err） | chrome.action.setBadgeText 全局 badge（无 tabId）+ 三态过期策略（D-34）+ chrome.alarms 兜底超时（D-33） |
| DSP-09 | popup 关闭再打开时能通过 storage-backed draft 恢复未发送的 `send_to` / `prompt` / 编辑过的 `content` | 单 popupDraft storage.local item + 800ms debounce（D-35）+ dispatch=done 后清（D-36） |
| DSP-10 | 注册可重新绑定的快捷键（`commands` API），打开 popup 并自动开始抓取 | manifest `commands._execute_action.suggested_key.default = 'Ctrl+Shift+S'`（D-38）+ 复用 Phase 2 D-15 popup mount 自动 capture.run |
| STG-03 | 用户可在设置面板清空全部历史 / 绑定（一键 reset，再次确认对话框） | entrypoints/options/ + Reset 按钮 + 二次确认 dialog（D-37）+ typed-repo `repo.history.resetAll()` / `repo.binding.resetAll()` |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

下列 CLAUDE.md 硬约束在 Phase 3 plan / executor 中**必须遵守**：

- **SW 顶层 listener**：`onMessage('dispatch.start', ...)` / `onMessage('dispatch.cancel', ...)` / `onMessage('history.list', ...)` / `onMessage('history.delete', ...)` / `onMessage('binding.upsert', ...)` / `onMessage('binding.get', ...)` 与 `chrome.tabs.onUpdated.addListener(...)` 与 `chrome.alarms.onAlarm.addListener(...)` **全部** 必须在 `defineBackground` 顶层闭包同步路径，注册前**绝无** `await`（FND-02 + PITFALLS §陷阱 4）
- **module-scope 视为不存在**：所有状态从 `chrome.storage.local` / `.session` 读；SW 唤醒后 module-level 变量必须当作未初始化
- **跨事件调度只用 `chrome.alarms`，不用 `setInterval`/`setTimeout`** — Phase 3 dispatch-timeout（D-33）与 badge-clear（D-34）都是 alarms。**例外**：popup 内的 800ms debounce 走 `setTimeout`（popup 上下文不受 SW 终止影响，window.close 时 setTimeout 也会被清）
- **静态 `host_permissions` 中绝不出现 `<all_urls>`**：Phase 3 不修改 manifest 静态权限（dispatch.create/update target tab 在 dev mode 通过 `<all_urls>` + dev-only `tabs` 权限走，production 通过 `optional_host_permissions` + Phase 4 ADO-07 运行时申请）
- **DOM 注入**：Phase 3 stub adapter `console.log` 即可，不触碰 DOM；IMAdapter 接口必须能容纳 React 受控 input setter 与 Slate/Lexical ClipboardEvent 路径（Phase 4/5 落地）
- **i18n**：用户可见字符串全走 `t(...)`；Phase 3 新增 `dispatch.*` / `options.*` / `history.*` / `binding.*` / `error.code.*` / `platform.icon.*` 命名空间；en + zh_CN 100% 同构
- **storage 写入唯一通过 typed repo**：popup 不直接调 `chrome.storage.local.set`；Phase 3 新增 `shared/storage/repos/{history,binding,popupDraft,dispatch}.ts` 业务方法层
- **隐私**：dispatch payload（snapshot + prompt）只本地保存 + 浏览器直接导航传递；不上报到任何第三方分析或遥测
- **单元测试用 Vitest + `fake-browser`**：Phase 3 dispatch state machine / repos / messaging mirror 都走单元；E2E 用 Playwright `launchPersistentContext` 加载 unpacked 扩展，复用 Phase 1 已落地的 CDP `ServiceWorker.stopWorker` fixture（fixtures.ts 已就位）
- **用户语言 zh-CN**：本 RESEARCH.md 主体使用简体中文；引用代码 / API 名 / 文件路径保留英文；en locale 文件可以用英文文案，但 plan 阶段对话与解释走中文

## Standard Stack

### Core (Phase 3 沿用 Phase 1+2，无新依赖)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `wxt` | `^0.20.25` | extension framework + manifest 生成 + entrypoints | Phase 1 已锁定；Phase 3 新增 `entrypoints/options/index.html` + `entrypoints/options/main.tsx` 自动产出 `options_ui.page` 字段 [VERIFIED: WXT docs §entrypoints + GitHub discussion #1330] |
| `preact` | `^10.29.1` | popup + options page 渲染 | Phase 1 锁定；Phase 3 popup 在 Phase 2 4-state 屏之上演化为 SendForm |
| `@preact/signals` | `^2.0.0` | popup 状态（snapshotSig / titleSig / sendToSig / promptSig / dispatchInFlightSig） | Phase 2 已落地的 module-level signal 模式直接扩展 |
| `@webext-core/messaging` | `^2.0.0` | 类型化 RPC | Phase 1 已锁定；Phase 3 新增 6 个路由触发 D-07 拆分阈值 |
| `@wxt-dev/i18n` | `^0.2.5` | popup + options page 文案 | Phase 1 已锁定；Phase 3 新增 6 个命名空间 |
| `zod` | `^3.24.0` | RPC 入参 / 出参校验 + storage schema 校验 | Phase 1 已锁定；Phase 3 新增 6 个 schema |
| `tailwindcss` | `^4.0.0` | popup + options page 样式 | Phase 1+2 已落地；Phase 3 沿用 utility-first |

**版本验证（已通过 npm view 确认 2026-04-30）：**
- `wxt`: 0.20.25 [VERIFIED: npm view wxt version → 0.20.25]
- `@wxt-dev/i18n`: 0.2.5 [VERIFIED: npm view @wxt-dev/i18n version → 0.2.5]
- `@types/chrome`: 0.1.40（含 chrome.alarms / chrome.tabs.onUpdated / chrome.action 等所有 API 的最新类型）[VERIFIED: npm view @types/chrome version]

### Supporting (Phase 3 不引入新依赖)

| Library | 评估 | 决议 |
|---------|------|------|
| `downshift` ^9.x | 通用 ARIA 1.2 combobox 库（~14 KB UMD），原生 Preact 兼容 [CITED: kentcdodds.com/blog/introducing-downshift-for-react] | **不引入**。CONTEXT.md D-30 推荐 ~100 行 Preact 自定义实现；Phase 3 popup 360px × ~400px 容器 + 单一 combobox 复用模式（send_to + prompt 同实现）不需要库的灵活性。simplicity-first。如 plan 阶段发现 ~100 行不够，再评估 |
| `@react-aria/listbox` | Adobe React Aria — ARIA 1.2 完整实现 | **不引入**。React 体积过大；Preact-compat 不友好 |
| `clsx` | conditional className helper | **不引入**。Phase 1+2 没引；Phase 3 popup combobox 条件 class 用模板字符串 + 三元够用 |
| `nanoid` / 自实现 UUID | dispatchId 生成 | **不引入**。`crypto.randomUUID()` Chrome 92+ 原生支持，service worker 与 popup 都是 secure context（chrome-extension:// origin），无需 polyfill [VERIFIED: developer.chrome.com + WICG/uuid #23] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 自定义 ARIA combobox（D-30 锁定） | downshift v9 | 库省自实现键盘导航 / aria-activedescendant 同步代码（~50 行）但增加 ~14 KB；Phase 3 popup bundle 已含 Preact + Phase 2 编辑 UI，自定义实现可控；如 Phase 6 a11y 加固阶段发现自定义实现键盘导航 bug 多，再切库 |
| 单 popupDraft item（D-35 锁定） | 三独立 item（sendToDraft / promptDraft / captureDraft） | 单 item = IO 单点 + reset 简单（`removeValue()`）+ 与 Phase 2 D-22 deferral 一致；三独立 item 写入次数 ×3 + 中间不一致风险 |
| chrome.alarms badge-clear（D-34） | popup 内 setTimeout | popup 关闭后 setTimeout 即被清 — 唯一可行方案是 SW alarms；但最小粒度 30s 与 D-34 的"5 秒后自清"不兼容 — 需在 plan 阶段把 D-34 改为 30s 后自清，或接受 SW 唤醒后才清 [VERIFIED: developer.chrome.com/docs/extensions/reference/api/alarms — 30 秒最低粒度] |

**Installation:** Phase 3 不需要 `pnpm add` 任何新依赖；plan 阶段直接生成代码，所有 import 走已就位的依赖。

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       USER SURFACES (Phase 3 新增)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐                       ┌─────────────────────┐     │
│  │ entrypoints/     │                       │ entrypoints/        │     │
│  │  popup/          │                       │  options/  (新增)   │     │
│  │  ├─ App.tsx      │                       │  ├─ App.tsx         │     │
│  │  │  - SendForm   │                       │  └─ ResetSection    │     │
│  │  │  - Combobox×2 │                       │     (STG-03)        │     │
│  │  │  - Confirm    │                       └─────────────────────┘     │
│  │  │  - InProgress │                                                   │
│  │  │     占位 UI   │                                                   │
│  │  │  - Cancel btn │                                                   │
│  └──────────────────┘                                                   │
│           │                                                             │
│           │ sendMessage('dispatch.start', { dispatchId, payload })      │
│           │ sendMessage('history.list' | 'binding.upsert' | ...)        │
│           ▼                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                        SERVICE WORKER (privileged)                      │
│                                                                         │
│  entrypoints/background.ts (defineBackground 顶层闭包同步路径)          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  顶层 listener 注册（FND-02 不可破）：                           │  │
│   │  ├─ onMessage('meta.bumpHello')        ← Phase 1                 │  │
│   │  ├─ onMessage('capture.run')           ← Phase 2                 │  │
│   │  ├─ onMessage('dispatch.start')        ← Phase 3 ★              │  │
│   │  ├─ onMessage('dispatch.cancel')       ← Phase 3 ★              │  │
│   │  ├─ onMessage('history.list')          ← Phase 3 ★              │  │
│   │  ├─ onMessage('history.delete')        ← Phase 3 ★              │  │
│   │  ├─ onMessage('binding.upsert')        ← Phase 3 ★              │  │
│   │  ├─ onMessage('binding.get')           ← Phase 3 ★              │  │
│   │  ├─ chrome.tabs.onUpdated              ← Phase 3 ★ (D-33)       │  │
│   │  └─ chrome.alarms.onAlarm              ← Phase 3 ★ (D-33+D-34)  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                  │                                                      │
│                  ▼                                                      │
│   background/dispatch-pipeline.ts (Phase 3 ★)                           │
│    state machine: pending → opening → awaiting_complete                 │
│                  → awaiting_adapter → done | error | cancelled          │
│                  │                                                      │
│                  ▼ (executeScript 注入 adapter)                         │
│   background/adapter-registry.ts (Phase 3 ★)                            │
│    AdapterRegistryEntry[] — { id, match(url), scriptFile, hostMatches } │
│                  │                                                      │
│                  ▼                                                      │
│   shared/storage/repos/{history,binding,popupDraft,dispatch}.ts         │
│    业务方法层（D-50 closure）: add/upsert/score/cap/resetAll            │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                    CONTENT SCRIPTS (per-tab, ephemeral)                 │
│                                                                         │
│  entrypoints/extractor.content.ts            ← Phase 2 (capture)        │
│  entrypoints/mock-platform.content.ts        ← Phase 3 ★ (stub adapter) │
│   - registers one-shot tabs.sendMessage listener for type:'ADAPTER_DISPATCH' │
│   - parses send_to URL query (e.g. mock://fail-not-logged-in)           │
│   - returns Result<void, ErrorCode>                                     │
│   (Phase 4: openclaw.content.ts；Phase 5: discord.content.ts)           │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                     BROWSER-PROVIDED STORES                             │
│  chrome.storage.local — popupDraft / sendToHistory / promptHistory      │
│                          / bindings / metaItem (Phase 1)                │
│  chrome.storage.session — dispatch:<dispatchId> records (D-31)          │
│                          + dispatch:active 软指针                       │
│  chrome.alarms — dispatch-timeout:<id> + badge-clear:<id>               │
│  chrome.action — global badge text + color                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (Phase 3 增量)

```
entrypoints/
├── background.ts                    [MODIFY] 新增 6 个 onMessage + 2 个 顶层 listener
├── popup/                           [MODIFY]
│   ├── App.tsx                      演化为 SendForm + InProgressView 双模式
│   ├── components/                  [NEW]
│   │   ├── SendForm.tsx
│   │   ├── Combobox.tsx             ARIA 1.2 编辑型 combobox
│   │   ├── PlatformIcon.tsx
│   │   └── InProgressView.tsx
│   ├── main.tsx
│   └── style.css
├── extractor.content.ts             [unchanged] Phase 2
├── mock-platform.content.ts         [NEW] stub adapter (D-23)
└── options/                         [NEW] (D-37)
    ├── index.html
    ├── main.tsx
    ├── App.tsx                      ResetSection + ConfirmDialog
    └── style.css

background/                          [MODIFY]
├── capture-pipeline.ts              [unchanged] Phase 2
├── dispatch-pipeline.ts             [NEW] state machine（D-31）
└── adapter-registry.ts              [NEW] static descriptor 表（D-24+D-26）

shared/
├── messaging/
│   ├── index.ts                     [MODIFY] 重新 barrel
│   ├── result.ts                    [MODIFY] +5 ErrorCode
│   ├── protocol.ts                  [MODIFY] aggregator
│   └── routes/                      [NEW] D-07 路由拆分
│       ├── capture.ts
│       ├── dispatch.ts
│       ├── history.ts
│       └── binding.ts
├── storage/
│   ├── items.ts                     [MODIFY] 新增 5 个 defineItem
│   ├── migrate.ts                   [unchanged] schema v1（无字段变更）
│   ├── index.ts                     [MODIFY] 重新 barrel
│   └── repos/                       [NEW] (D-50 closure)
│       ├── history.ts
│       ├── binding.ts
│       ├── popupDraft.ts
│       └── dispatch.ts
├── adapters/                        [NEW]
│   └── types.ts                     IMAdapter 接口 + AdapterRegistryEntry
└── i18n/                            [unchanged] facade

scripts/
└── verify-manifest.ts               [MODIFY] +commands._execute_action 断言
                                              +options_ui 字段断言

locales/
├── en.yml                           [MODIFY] +dispatch.* / options.* / history.* / binding.* / error.code.* / platform.icon.*
└── zh_CN.yml                        [MODIFY] 同上 100% 同构

tests/
├── unit/
│   ├── dispatch/                    [NEW]
│   │   ├── state-machine.spec.ts    11 步推进 + 双击同 dispatchId 幂等 + SW restart 续接
│   │   └── platform-detector.spec.ts adapter-registry.match() 正反例
│   ├── repos/                       [NEW]
│   │   ├── history.spec.ts          score 公式 + cap 50 + 去重 + resetAll
│   │   ├── binding.spec.ts          upsert + dirty flag + resetAll
│   │   └── popupDraft.spec.ts       set/get/remove + schema validation
│   └── messaging/
│       └── dispatch.spec.ts         [NEW] capture.spec mirror 模式
└── e2e/
    ├── fixtures.ts                  [unchanged] CDP stopWorker 已就位
    ├── fixtures/                    [MODIFY] +mock-platform.html stub 目标页面
    ├── dispatch.spec.ts             [NEW] Confirm → mock 收到注入 → badge ok 30s → 重开 popup 看到 done；含 200ms 双击幂等；含 SW restart 续接
    ├── draft-recovery.spec.ts       [NEW] popup 编辑 → 关闭 → 重开恢复
    └── options-reset.spec.ts        [NEW] STG-03 reset + 二次确认
```

### Pattern 1: SW 顶层 listener 注册（Phase 1 沿用，Phase 3 扩展）

**What:** SW 内所有 `chrome.*.on*.addListener` + `onMessage` 都在 `defineBackground` 顶层闭包同步路径上注册。
**When to use:** 始终。MV3 SW 重启后会重新执行 entrypoint 顶层；如果 listener 在 `await` 之后注册，重启后会丢失。
**Example:**
```ts
// entrypoints/background.ts (Phase 3 完整形态)
import { defineBackground } from '#imports';
import { onMessage } from '@/shared/messaging';
import { runCapturePipeline } from '@/background/capture-pipeline';
import {
  startDispatch, cancelDispatch, onTabComplete, onAlarmFired,
} from '@/background/dispatch-pipeline';
import { historyList, historyDelete, bindingUpsert, bindingGet } from '@/shared/storage/repos';

// Source: Phase 1+2 已落地形态 + CONTEXT.md D-31..D-34
export default defineBackground(() => {
  // ─── Phase 1+2 listener (unchanged) ─────────────────────────────────
  onMessage('meta.bumpHello', wrapHandler(/* ... */));
  onMessage('capture.run', wrapHandler(runCapturePipeline));

  // ─── Phase 3: dispatch RPCs ─────────────────────────────────────────
  onMessage('dispatch.start', wrapHandler(startDispatch));
  onMessage('dispatch.cancel', wrapHandler(cancelDispatch));

  // ─── Phase 3: history + binding RPCs ────────────────────────────────
  onMessage('history.list', wrapHandler(historyList));
  onMessage('history.delete', wrapHandler(historyDelete));
  onMessage('binding.upsert', wrapHandler(bindingUpsert));
  onMessage('binding.get', wrapHandler(bindingGet));

  // ─── Phase 3: SW wake-up entries (D-33) ─────────────────────────────
  // BOTH listeners must be registered top-level. tabs.onUpdated wakes the
  // SW after a navigation; alarms.onAlarm wakes it for timeouts + badge clears.
  chrome.tabs.onUpdated.addListener(onTabComplete);
  chrome.alarms.onAlarm.addListener(onAlarmFired);
});
```
**Source:** [Chrome MV3 Service Worker Events](https://developer.chrome.com/docs/extensions/mv3/service_workers/events) + Phase 1 落地的 entrypoints/background.ts

### Pattern 2: dispatch state machine — storage.session 作为唯一真值

**What:** dispatch 状态以 `dispatch:<dispatchId>` 为 key 写 `chrome.storage.session`；SW 重启后 `tabs.onUpdated` listener 通过遍历 session keys 找到 `state === 'awaiting_complete' && target_tab_id === tabId` 的记录续接。
**When to use:** 任何跨多个异步事件、SW 可能在中途死亡的状态机。
**Why decompose keys (race-condition mitigation):** chrome.storage 不支持事务 — 多并发 dispatch 写同一 collection 会丢更。每条 dispatch 一个 key（不写 `dispatches: { [id]: record }` 大对象）规避 read-modify-write 竞态 [VERIFIED: PITFALLS §"性能陷阱" + WebSearch concurrent storage update]。
**Example:**
```ts
// background/dispatch-pipeline.ts (核心骨架)
import { Ok, Err, type Result } from '@/shared/messaging';
import type { ArticleSnapshot } from '@/shared/messaging';
import { adapterRegistry } from './adapter-registry';

export interface DispatchRecord {
  schemaVersion: 1;
  dispatchId: string;
  state: 'pending' | 'opening' | 'awaiting_complete' | 'awaiting_adapter'
       | 'done' | 'error' | 'cancelled';
  target_tab_id: number | null;
  send_to: string;
  prompt: string;
  snapshot: ArticleSnapshot;
  platform_id: string;
  started_at: string;       // ISO-8601
  last_state_at: string;    // ISO-8601
  error?: { code: ErrorCode; message: string; retriable: boolean };
}

const dispatchKey = (id: string) => `dispatch:${id}`;

export async function startDispatch(payload: {
  dispatchId: string;
  send_to: string;
  prompt: string;
  snapshot: ArticleSnapshot;
}): Promise<Result<{ dispatchId: string; state: DispatchRecord['state'] }>> {
  // Step 1: idempotency check (D-32)
  const existing = await chrome.storage.session.get(dispatchKey(payload.dispatchId));
  if (existing[dispatchKey(payload.dispatchId)]) {
    const rec = existing[dispatchKey(payload.dispatchId)] as DispatchRecord;
    return Ok({ dispatchId: rec.dispatchId, state: rec.state });
  }

  // Step 2: platform detection (D-24)
  const adapter = adapterRegistry.find(a => a.match(payload.send_to));
  if (!adapter) {
    return Err('PLATFORM_UNSUPPORTED', payload.send_to, false);
  }

  // Step 3: write 'pending' record (single-key write, no race)
  const now = new Date().toISOString();
  const rec: DispatchRecord = {
    schemaVersion: 1,
    dispatchId: payload.dispatchId,
    state: 'pending',
    target_tab_id: null,
    send_to: payload.send_to,
    prompt: payload.prompt,
    snapshot: payload.snapshot,
    platform_id: adapter.id,
    started_at: now,
    last_state_at: now,
  };
  await chrome.storage.session.set({ [dispatchKey(payload.dispatchId)]: rec });
  await chrome.storage.session.set({ 'dispatch:active': payload.dispatchId });

  // Step 4: open or activate target tab (Pattern 3)
  const tabId = await openOrActivateTab(payload.send_to);
  rec.target_tab_id = tabId;
  rec.state = 'awaiting_complete';
  rec.last_state_at = new Date().toISOString();
  await chrome.storage.session.set({ [dispatchKey(payload.dispatchId)]: rec });

  // Step 5: schedule timeout safety net (D-33)
  await chrome.alarms.create(`dispatch-timeout:${payload.dispatchId}`, {
    delayInMinutes: 0.5,  // 30 seconds — minimum supported in production
  });

  // Step 6: set loading badge (Pattern 4)
  await chrome.action.setBadgeText({ text: '...' });
  await chrome.action.setBadgeBackgroundColor({ color: '#94a3b8' });

  return Ok({ dispatchId: payload.dispatchId, state: 'awaiting_complete' });
}

// SW wake-up entry — must be referenced from defineBackground top-level
export async function onTabComplete(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  _tab: chrome.tabs.Tab,
): Promise<void> {
  if (changeInfo.status !== 'complete') return;
  // tabs.onUpdated does NOT fire for SPA pushState — that's Phase 5
  // (webNavigation.onHistoryStateUpdated). Phase 3 mock-platform navigates
  // to a static page so 'complete' is sufficient.

  // Iterate dispatch records (no fragmented dispatches collection — each
  // record is a separate key, so this is a sweep)
  const all = await chrome.storage.session.get(null);
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith('dispatch:') || key === 'dispatch:active') continue;
    const rec = value as DispatchRecord;
    if (rec.state !== 'awaiting_complete' || rec.target_tab_id !== tabId) continue;
    // Found a match — advance to awaiting_adapter and inject adapter
    await advanceToAdapterInjection(rec);
  }
}
```
**Source:** PITFALLS §陷阱 3 + Phase 1 D-06 Result 模型 + WebSearch race-condition mitigation pattern

### Pattern 3: chrome.tabs.create vs update 决策树（Phase 3 stub 与 Phase 4/5 共用）

**What:** dispatch 时优先复用已开的同 origin tab，失败再 create。
**When to use:** 任何 dispatch 路径。即便 Phase 3 stub adapter 也走 mock://... → mock-platform tab，遵守同决策树让 Phase 4/5 替换 adapter 时无需改 dispatch-pipeline。
**Decision tree（基于 chrome.tabs.query 行为 [VERIFIED: developer.chrome.com/docs/extensions/reference/api/tabs]）：**

```
input: send_to URL (canonical, e.g. 'https://discord.com/channels/123/456')
  ↓
parse origin + pathname  →  query = { url: `${origin}${pathname}*` }
  ↓
chrome.tabs.query(query)
  ↓
results.length === 0
  ├─→ chrome.tabs.create({ url, active: true })
  │   wait for tabs.onUpdated:complete + frameId === 0 (top-level only)
  │   return tab.id
results.length > 0
  ├─→ pick first match (typically only one);
  │   if tab.url !== send_to (hash/query differs):
  │     chrome.tabs.update(tab.id, { url: send_to, active: true })
  │     wait for tabs.onUpdated:complete (URL change triggers it)
  │   else (exact match):
  │     chrome.tabs.update(tab.id, { active: true })
  │     IMPORTANT: 'complete' may NOT fire if tab was already loaded.
  │     需要 fallback：检查 tab.status === 'complete' 立即推进；
  │     否则等待 tabs.onUpdated 或 alarms timeout 兜底
  ├─→ chrome.windows.update(tab.windowId, { focused: true })
  │   ('active: true' 只激活 tab 在它的 window 内，不把 window 拉前台)
  └─→ return tab.id
```

**SPA caveat（Phase 3 stub 不触发，Phase 5 Discord 必须处理）：** chrome.tabs.query 不匹配 URL fragment（`#/route`），且 SPA pushState 不触发 tabs.onUpdated. Phase 5 用 `chrome.webNavigation.onHistoryStateUpdated` 补齐 [VERIFIED: WebSearch tabs.query results — fragment identifiers not matched]。Phase 3 stub adapter 用静态页面（mock-platform.html），fragment 与 SPA 都不会出现。

**frameId 过滤：** `chrome.tabs.onUpdated` 不在 changeInfo 上提供 frameId — 它只为顶层 navigation 触发 status；iframe 不会污染 [CITED: developer.chrome.com/docs/extensions/reference/api/tabs]。SW listener 不需要额外 `frameId === 0` 过滤。

**Source:** [Chrome tabs.query MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/query) + [Chrome 79 Tab.url change announcement](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/5zu_PT0arls)

### Pattern 4: chrome.action.setBadgeText 全局 badge（D-34 三态过期）

**What:** dispatch 流水线整体只用 **global badge**（不传 tabId）— Web2Chat 的 dispatch 是单用户单源的瞬态动作，不绑定特定 tab。
**Why global vs per-tab:**
- Global badge：单一全局值，多并发 dispatch 时最后写覆盖前一个（D-34 隐含此语义 — Phase 3 单 dispatch 主流程，不发明聚合）
- Per-tab badge：绑定 source tab（=用户当前查看的源页）会让 badge 在用户切 tab 时消失，不符合 D-34 "保留至下次 popup 打开" 的语义；绑定 target tab（dispatch 目标 IM tab）会在 IM 关闭时丢失
- Global badge 在 SW 重启后保留（Chrome 内部持久化）— 与 D-34 err 三态"不自清"自然兼容 [VERIFIED: chrome.action setBadgeText docs]

**何时清：**
- Loading → ok：alarm `badge-clear:<id>` 在 ok 写入后 schedule，触发时 `setBadgeText({ text: '' })`
- Loading → err：直接覆盖为 err，不 schedule clear
- Popup mount → 任何 err badge：popup mount handler 调 `chrome.action.setBadgeText({ text: '' })`（D-34 "保留至下次 popup 打开"）

**关键约束（D-34 兼容性）：** chrome.alarms 最低粒度 = 30 秒（unpacked 模式可低，production 强制 clamp）[VERIFIED: developer.chrome.com/docs/extensions/reference/api/alarms]。**D-34 "5 秒后自清"无法用 alarms 实现** — Phase 3 plan 阶段必须裁定其中一条：
- (A) 修订 D-34 → "30 秒后自清"（最小化偏差，建议方案）
- (B) 维持 5 秒，SW 端用 `setTimeout` — SW 在 30 秒空闲后 idle 出，setTimeout 可能未执行；接受 ok badge 偶尔延迟到 SW 唤醒才清
- (C) 维持 5 秒，由下次 popup mount 同时清 ok badge — 等价于 err 行为，简化但失去"5 秒自动反馈"语义

**Recommendation:** 走 (A)。30 秒在 PM 视角等价于"短期闪绿"，工程成本最低，且 ok 通常用户已切换关注点。把 D-34 的 5 秒改为 30 秒应当作 Phase 3 plan 阶段的第一个 deviation 记录在 03-DEVIATIONS.md（无新决策需要 user 介入）。

**Source:** [chrome.action API](https://developer.chrome.com/docs/extensions/reference/api/action) + [chrome.alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)

### Pattern 5: ARIA 1.2 Editable Combobox with List Autocomplete（D-30 自定义实现）

**What:** `<input role="combobox">` + `<ul role="listbox">` siblings；DOM focus 永远停在 input；listbox 内 "active option" 通过 `aria-activedescendant` 表达。
**When to use:** Phase 3 popup send_to + prompt 两个输入字段共用同一 `Combobox.tsx` 组件。
**Required ARIA attributes（按 ARIA 1.2 规范）[CITED: w3c/aria-practices + MDN ARIA combobox role]:**

```tsx
// entrypoints/popup/components/Combobox.tsx — 骨架（plan 阶段细化）
// Source: https://bocoup.github.io/aria-practices/examples/combobox/combobox-autocomplete-list.html
//         + https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/combobox_role
interface ComboboxProps {
  id: string;                 // input id
  label: string;              // accessible name (visible label)
  value: string;
  onChange: (v: string) => void;
  options: Array<{ key: string; label: string; iconKey?: string }>;
  onSelect: (key: string) => void;
  onDelete?: (key: string) => void;
  placeholder?: string;
}

export function Combobox(props: ComboboxProps) {
  const listboxId = `${props.id}-listbox`;
  const expanded = signal(false);
  const activeIdx = signal(-1);  // -1 means no active option
  const filtered = computed(() => filterOptions(props.options, props.value));

  return (
    <div class="relative">
      <label for={props.id} class="...">{props.label}</label>
      <input
        id={props.id}
        type="text"
        role="combobox"
        aria-expanded={expanded.value}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIdx.value >= 0 ? `${listboxId}-opt-${activeIdx.value}` : undefined
        }
        value={props.value}
        onInput={(e) => props.onChange(e.currentTarget.value)}
        onFocus={() => { expanded.value = true; }}
        onBlur={() => { /* defer with setTimeout 0 to allow option click */ }}
        onKeyDown={handleKeyDown}  // ↑/↓/Enter/Esc/Tab
      />
      {expanded.value && filtered.value.length > 0 && (
        <ul id={listboxId} role="listbox" aria-label={props.label}>
          {filtered.value.map((opt, i) => (
            <li
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx.value}
              onMouseDown={(e) => { e.preventDefault(); props.onSelect(opt.key); }}
            >
              {/* platform icon + label + delete button */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Keyboard model（CONTEXT.md "Claude's Discretion" 已锁定）：**
- ↑/↓：activeIdx 在 listbox 中循环（-1 → 0 → 1 → ... → length-1 → -1 ↻）
- Enter：activeIdx >= 0 时选中该选项并填入 input；否则提交当前输入值
- Esc：关闭 listbox（expanded=false），保留 input 当前值
- Tab：关闭 listbox，走原生焦点循环（不拦截）

**Playwright 断言模式（Phase 3 e2e）：**
```ts
// Source: https://playwright.dev/docs/locators#locate-by-role
await popup.getByRole('combobox', { name: 'Send to' }).fill('htt');
await expect(popup.getByRole('option')).toHaveCount(2);  // matched 2 history items
await popup.getByRole('combobox', { name: 'Send to' }).press('ArrowDown');
await popup.getByRole('combobox', { name: 'Send to' }).press('Enter');
```

**Source:** [W3C ARIA 1.2 Combobox With List Autocomplete](https://bocoup.github.io/aria-practices/examples/combobox/combobox-autocomplete-list.html) + [MDN ARIA combobox role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/combobox_role)

### Pattern 6: typed-repo 业务方法层（D-50 closure）

**What:** popup 与 SW 都不直接调 `chrome.storage.local.set`；统一走 `repo.history.add(value)` / `repo.binding.upsert(send_to, prompt)` / `repo.popupDraft.update(patch)` 这类业务方法。
**Example:**
```ts
// shared/storage/repos/history.ts — 骨架
import { sendToHistoryItem } from '@/shared/storage/items';

export interface HistoryEntry {
  value: string;
  last_used_at: string;  // ISO-8601
  use_count: number;
}

const TAU_MS = 7 * 24 * 3600 * 1000;     // 7 days
const FREQ_WEIGHT = 0.3;
const CAP = 50;
const TOP_N = 8;

export function score(entry: HistoryEntry, now: number): number {
  const age = now - new Date(entry.last_used_at).getTime();
  return Math.exp(-age / TAU_MS) + FREQ_WEIGHT * Math.log(entry.use_count + 1);
}

export async function add(value: string): Promise<void> {
  const all = await sendToHistoryItem.getValue();
  const idx = all.findIndex(e => e.value === value);
  const now = new Date().toISOString();
  if (idx >= 0) {
    // dedupe: bump use_count + last_used_at
    all[idx] = { ...all[idx], last_used_at: now, use_count: all[idx].use_count + 1 };
  } else {
    all.push({ value, last_used_at: now, use_count: 1 });
  }
  // cap by score (drop lowest-score entries until <= CAP)
  if (all.length > CAP) {
    const nowMs = Date.now();
    all.sort((a, b) => score(b, nowMs) - score(a, nowMs));
    all.length = CAP;
  }
  await sendToHistoryItem.setValue(all);
}

export async function topN(): Promise<HistoryEntry[]> {
  const all = await sendToHistoryItem.getValue();
  const nowMs = Date.now();
  return [...all].sort((a, b) => score(b, nowMs) - score(a, nowMs)).slice(0, TOP_N);
}

export async function remove(value: string): Promise<void> {
  const all = await sendToHistoryItem.getValue();
  await sendToHistoryItem.setValue(all.filter(e => e.value !== value));
}

export async function resetAll(): Promise<void> {
  await sendToHistoryItem.setValue([]);
}
```
**Source:** Phase 1 storage.defineItem<T> + D-29/D-50 closure + WebSearch concurrent storage update mitigation

### Anti-Patterns to Avoid

- **直接 chrome.storage 写入** — popup 与 SW 都必须走 typed repo（CLAUDE.md 约束）
- **dispatch 状态用大对象 `{ [id]: record }`** — 多并发 dispatch 在 read-modify-write 时丢更；用 `dispatch:<id>` per-record key
- **module-scope 缓存 dispatchActiveId** — SW 重启即丢；popup 内可以（popup 关闭时本就该清）
- **chrome.tabs.create({ active: false })** — Phase 3 stub adapter 不触发 PITFALLS §"集成坑" `active: false` 风险，Phase 4 OpenClaw / Phase 5 Discord 同样需要 active true
- **manifest 静态 `host_permissions: ["<all_urls>"]`** — verify-manifest 已硬拦
- **i18n 文案中嵌入 HTML** — Phase 2 已落地"三段式拆分（before/icon/after）"，Phase 3 dispatch / error 文案沿用同模式
- **alarms minimum delay < 30s** — production 会被静默 clamp + 抛 console warning；Phase 3 不假设 sub-30s 精度（D-34 5s 与此约束冲突，见 Pattern 4）
- **popup 内 setTimeout / setInterval 处理 dispatch 进度** — popup 关闭后 setTimeout 即被清；进度反馈通过 badge + storage.onChanged 拉模式
- **chrome.permissions.request 从 SW 调用** — user gesture 跨 RPC 失效；Phase 4 hand-off 必须在 popup click 路径（Phase 3 不涉及，但 IMAdapter 接口契约要为之留口）

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID 生成 | 自实现 v4 generator (`Math.random` + bitops) | `crypto.randomUUID()` | Chrome 92+ 原生，SW + popup 都是 secure context [VERIFIED: WICG/uuid] |
| dispatch 超时 | `setTimeout` + module-scope timer map | `chrome.alarms.create({ delayInMinutes })` | SW 中途死亡 setTimeout 即丢；alarms 跨 SW 重启可靠 |
| ARIA combobox 键盘导航 | scratch 实现（焦点 + role 全自管） | 100 行参考 W3C ARIA 1.2 reference 实现 | D-30 锁 ~100 行；如键盘 bug 多再切 downshift |
| storage migration 框架 | per-call schema check | Phase 1 已落地的 `shared/storage/migrate.ts`（WXT `defineItem<T>` 内置） | Phase 1 已实现，Phase 3 不动 schemaVersion 字段（v1 内部新增 item 不需迁移） |
| RPC 类型化 | 手写 chrome.runtime.sendMessage 包装 | Phase 1 已落地的 `@webext-core/messaging` + `defineExtensionMessaging<ProtocolMap>()` | Phase 1 D-05 已锁定 |
| Result 错误码模型 | per-handler ad-hoc error shape | Phase 1 已落地的 `Result<T, ErrorCode>` + `wrapHandler` | Phase 1 D-06 已锁定 |
| 历史排序公式 | 简单 LRU | D-29 hybrid score `exp(-Δt/τ) + 0.3·log(count+1)` | CONTEXT.md 已锁；公式参数登记在 V1X-* deferred |
| popup 中 dispatch 进度反馈 | `chrome.runtime.connect` long-lived port | popup mount → `chrome.storage.onChanged` 监听 + `dispatch:active` storage.session 软指针 | popup 关闭即销毁，long-lived port 在 popup 关闭后无意义；storage 拉模式简单可靠 |

**Key insight:** Phase 1+2 已建立的 `shared/messaging` + `shared/storage` + `shared/i18n` 三大基础设施在 Phase 3 不需要扩展核心机制 — 只新增 routes/repos/items 数据。Phase 3 真正的工程力气都用在 dispatch state machine + popup combobox 这两块新代码上。

## Common Pitfalls

### Pitfall 1: chrome.alarms 最小粒度 = 30 秒（D-34 5 秒不可达）

**What goes wrong:** 按 D-34 字面写 `chrome.alarms.create('badge-clear:'+id, { delayInMinutes: 5/60 })`（= 5 秒）— production 模式下 Chrome 静默 clamp 到 30 秒并抛 console warning："Alarm delayInMinutes is less than minimum of 0.5"；unpacked dev 模式正常 5 秒触发，导致开发者本地"看起来工作"。
**Why it happens:** Chrome 自 v120 起 alarms 最低粒度从 1 分钟降到 30 秒（更早是 5 分钟）；为防止 alarms 滥用拖累系统，sub-30s 在 production 一律 clamp。
**How to avoid:**
1. **Plan 阶段裁决 D-34 偏差**：把 5 秒改为 30 秒（建议 Pattern 4 方案 A）；或维持 5 秒但接受"5 秒后未必清，下次 popup mount / SW 唤醒时清"
2. verify-manifest 不需要新断言（manifest 不带 alarms 配置）
3. 文档化在 03-DEVIATIONS.md：D-34 5s → 30s 是 production constraint，dev 模式不受影响
**Warning signs:**
- 本地 unpacked dev 模式下 ok badge 5 秒清，CI / production 不清
- chrome://serviceworker-internals/ console 出现 "Alarm delayInMinutes is less than minimum of 0.5" 警告
**Source:** [Google Groups: 5-min minimum (historical)](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/0XgFNSy37_Y) + [chrome.alarms docs](https://developer.chrome.com/docs/extensions/reference/api/alarms)

### Pitfall 2: tabs.onUpdated 不会为 SPA pushState 触发 'complete'

**What goes wrong:** 用户已开 Discord tab（不同频道），dispatch 想切到 `discord.com/channels/A/B`。Chrome 通过 React Router pushState 切路由 — `tabs.onUpdated` 不触发 status='complete'（只有顶层 navigation 才触发）；dispatch state 永远卡在 `awaiting_complete`，直到 30 秒 alarm 超时报 TIMEOUT。
**Why it happens:** `chrome.tabs.onUpdated` 只在顶层 document load 触发；history.pushState 不构成 document load。
**How to avoid (Phase 3 范围)：**
1. Phase 3 stub adapter `mock-platform.html` 是静态页面 — pushState 不会出现，问题暂不暴露
2. Phase 3 仍需走 D-31 状态机 + 30s alarm 超时（即 dispatch-pipeline.ts 的设计在 Phase 4/5 才完整 mitigation 该陷阱，Phase 3 提前留接口给 webNavigation listener）
3. **Phase 5 落地真实修复**：`chrome.webNavigation.onHistoryStateUpdated` 顶层 listener 注册（已在 03-CONTEXT.md `<deferred>` 列）
**Warning signs:**
- 同 origin 不同 path/hash 切换时 dispatch 永远 30s 后 TIMEOUT
- 静态页面（Phase 3 stub）切换正常，SPA 站点不正常
**Source:** [WebSearch: chrome.tabs.onUpdated MV3 SPA pushState](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/MesMv9ugQIQ) + ARCHITECTURE.md §"模式 3"

### Pitfall 3: chrome.scripting.executeScript 错误归类不清晰

**What goes wrong:** executeScript 的错误归类对应不到 ErrorCode：(a) tab 还在加载 → `Frame with ID 0 was removed`（罕见但有）；(b) tab URL 变成 `chrome://newtab` 中途 → "Cannot access contents of url"；(c) host_permissions 不匹配 → "Extension manifest must request permission to access the respective host"；(d) target frame detached → "No frame with ID X in tab Y"；(e) tab.discarded === true → "Frame with ID 0 was removed"
**How to avoid (Phase 3 ErrorCode mapping):**

| executeScript 失败模式 | Phase 3 ErrorCode | retriable |
|------------------------|-------------------|-----------|
| Cannot access contents of url (chrome://) | `INPUT_NOT_FOUND`（adapter 未触发） | false |
| Extension manifest must request permission | `INPUT_NOT_FOUND`（host 未授权 — Phase 4 ADO-07 才有真实场景） | false |
| Frame removed / No frame with ID | `EXECUTE_SCRIPT_FAILED` | true |
| executeScript resolves with `[{ result: undefined }]` | `EXECUTE_SCRIPT_FAILED`（adapter main() 异常或 return undefined） | true |
| Network 加载超时未 complete | `TIMEOUT`（由 30s alarm 兜底） | true |
| adapter `compose`/`send` 内部抛错 | adapter 内部 catch → `Err('INPUT_NOT_FOUND' or 'NOT_LOGGED_IN', ...)` | varies |

**Phase 3 实现细节：** `dispatch-pipeline.ts` 用 try/catch 包 `chrome.scripting.executeScript`：
```ts
try {
  await chrome.scripting.executeScript({ target: { tabId }, files: [adapter.scriptFile] });
} catch (err) {
  const msg = String(err);
  if (/Cannot access|manifest must request permission/.test(msg)) {
    return Err('INPUT_NOT_FOUND', msg, false);
  }
  return Err('EXECUTE_SCRIPT_FAILED', msg, true);  // frame detached / network errors
}
```

**Warning signs:**
- popup 显示泛用 "Capture failed" 文案而 console 显示精确的 host_permissions 错误 — i18n 文案与 ErrorCode 不对齐
- e2e 测试中跳过失败注入路径覆盖 → 真实用户遇到时无可操作建议
**Source:** [WebSearch chrome.scripting.executeScript MV3 errors](https://discourse.mozilla.org/t/mv3-browser-scripting-executescript-throws-missing-host-permission-for-the-tab/111555)

### Pitfall 4: chrome.permissions.request 在 SW 中失效（Phase 4 hand-off 必须 popup-side）

**What goes wrong:** Phase 3 IMAdapter 接口设计若把 "首次发现 send_to origin 未授权 → 申请权限" 放在 SW dispatch-pipeline.ts 内，运行时报 "This function must be called during a user gesture"。
**Why it happens:** chrome.permissions.request 必须在 user gesture 同步路径。SW 没有 user gesture 概念；popup click handler 是合法路径，但跨 sendMessage 之后 gesture token 已被消耗。
**How to avoid (Phase 3 IMAdapter 接口契约):**
1. IMAdapter 接口里**不放** `requestPermissions()` 方法 — Phase 4 OpenClaw adapter 在 popup-side 处理（用户点 send_to 输入框完成 → popup 自己探测 send_to origin 未授权 → 弹 click-to-grant 按钮 → 按钮 onClick 同步路径调 chrome.permissions.request）
2. dispatch-pipeline.ts 在 RPC entry 处仅做 "已授权 origin set" 读取（grantedOrigins storage item，Phase 4 加），未授权 → `Err('OPENCLAW_PERMISSION_DENIED', ...)` Phase 4 ErrorCode；popup 拿到 err → 继续走"重新点 grant 按钮"路径
3. Phase 3 stub adapter 不涉及（mock-platform 是 chrome-extension:// 内部 origin，无需运行时申请）
**Warning signs:** Phase 4 真实 OpenClaw 集成时 grant 按钮 "无效"或抛 console error
**Source:** [WebSearch: chrome.permissions.request user gesture MV3](https://www.extension.ninja/blog/post/solved-this-function-must-be-called-during-a-user-gesture/) + Chrome MV3 permissions docs

### Pitfall 5: chrome.tabs.update 同 URL tab 不触发 'complete'

**What goes wrong:** dispatch 的目标 tab 已开且**完全相同 URL**（hash + query 都同），调用 `chrome.tabs.update(tabId, { active: true })` 不发起 navigation — `tabs.onUpdated:complete` 不触发；dispatch state 卡在 awaiting_complete 直到 30s timeout。
**How to avoid:** `dispatch-pipeline.ts` 的 `openOrActivateTab` 在 update 后立即检查 `tab.status === 'complete'` 并直接推进，不依赖 onUpdated event：
```ts
async function openOrActivateTab(targetUrl: string): Promise<number> {
  const url = canonicalize(targetUrl);  // strip fragment for query
  const matches = await chrome.tabs.query({ url: url + '*' });
  if (matches.length === 0) {
    const created = await chrome.tabs.create({ url: targetUrl, active: true });
    return created.id!;  // wait for tabs.onUpdated:complete
  }
  const existing = matches[0];
  if (existing.url !== targetUrl) {
    // hash/query differ → real navigation
    await chrome.tabs.update(existing.id!, { url: targetUrl, active: true });
    // wait for tabs.onUpdated:complete
  } else {
    // exact match → just activate
    await chrome.tabs.update(existing.id!, { active: true });
    if (existing.status === 'complete') {
      // emit synthetic complete signal — dispatch-pipeline schedules
      // executeScript directly without waiting for onUpdated
      await advanceToAdapterInjection(/* ... */);
    }
    // else fall through to onUpdated wait + alarm timeout safety net
  }
  await chrome.windows.update(existing.windowId!, { focused: true });
  return existing.id!;
}
```
**Warning signs:** 同 URL 重复 dispatch 卡在 awaiting_complete；测试用例不覆盖此路径时不暴露
**Source:** [WebSearch chrome.tabs.query/update existing tab](https://developer.chrome.com/docs/extensions/reference/api/tabs)

### Pitfall 6: storage.session 配额 + 多并发 dispatch race condition

**What goes wrong:** D-31 状态机用 `dispatch:<id>` per-record key 已规避 read-modify-write 竞态；但若把所有 dispatch 写到同一 `dispatches` collection 对象，多并发会丢更（用户 200ms 内点两次同 dispatchId 不算"并发"，那是 D-32 idempotency 处理；多 dispatchId 平行才是 race scenario，Phase 3 stub 不构造但 Phase 4/5 V1X-02 fan-out 必须考虑）。
**How to avoid:** 严格按 Pattern 2 的 per-record key 模式；dispatch:active 软指针单写者只在 popup `dispatch.start` 路径写。
**Quota:** chrome.storage.session 上限 ~10 MB（Chrome 112+，从 1 MB 提升）— Phase 3 单 dispatchRecord ~5 KB（snapshot.content cap 200 KB），峰值并发 ~50 个不会超限。
**Warning signs:** 极不易暴露 — Phase 4 fan-out（V1X-02）真实出现时再加 fuzzing 测试
**Source:** [WebSearch chrome.storage.session quota race](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/y5hxPcavRfU)

### Pitfall 7: WXT options entrypoint 生成 options_ui 而非 options_page

**What goes wrong:** verify-manifest 期望 `manifest.options_page === 'options.html'`，但 WXT 0.20.x 默认产出的是 `manifest.options_ui = { page: 'options.html', open_in_tab: false }`。
**Why it happens:** WXT 0.20.x 的 UserManifest 类型显式 omit `options_page`；自动从 entrypoints/options/ 生成的是 options_ui（MV3 推荐字段）[CITED: WXT GitHub discussion #1330]。
**How to avoid:**
1. verify-manifest.ts 断言改为 `manifest.options_ui?.page === 'options.html'`（不是 options_page）
2. 如果 plan 阶段决定 options 一定要"在 tab 中打开"（不是 popup-style 嵌入），通过 HTML meta 标签：`<meta name="manifest.open_in_tab" content="true" />` 在 options/index.html 中
3. `chrome.runtime.openOptionsPage()` 对 options_ui 与 options_page 两种字段都 work（API 自动选）— Phase 3 popup 齿轮 icon 调用此 API 不会出问题
**Warning signs:** verify-manifest fail 在 WXT 0.20.x build 后第一次跑；plan 阶段未读到这条 → 推到 executor 才发现
**Source:** [WXT GitHub Discussion #1330: Configuring Page Settings Based on Build Mode](https://github.com/wxt-dev/wxt/discussions/1330)

### Pitfall 8: commands._execute_action 在 chrome://extensions/shortcuts 显示但不生效

**What goes wrong:** manifest 写 `commands._execute_action.suggested_key.default = 'Ctrl+Shift+S'`，安装后 chrome://extensions/shortcuts 显示该绑定但按键无反应；用户必须手动点编辑铅笔重设同一组合才生效（[已知 Chrome bug](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/eKcVRVOQ4GU)）。
**Why it happens:** Chrome 长期未修复 issue；尤其在已存在同绑定的扩展时（系统级冲突），新装的扩展 suggested_key 被默认 disable。
**How to avoid:**
1. README 在 D-38 commands 章节加备忘："如果 Ctrl+Shift+S 未生效，访问 chrome://extensions/shortcuts 检查 Web2Chat 条目"
2. Phase 3 e2e 不断言快捷键 — Playwright 不能模拟系统级快捷键；改测 manifest 字段（verify-manifest）
3. mac 默认转换：Chrome 自动把 default 中的 `Ctrl` 转为 `Command` — 不需要显式 `mac: 'Command+Shift+S'`，但显式更明确（建议显式）
**manifest 字段精确写法：**
```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "__MSG_command_open_popup__"
    }
  }
}
```
**有效 platform keys:** `default`, `mac`, `linux`, `windows`, `chromeos` [VERIFIED: developer.chrome.com/docs/extensions/reference/api/commands]
**Warning signs:** Plan 阶段成功标准 #5 "默认快捷键打开 popup 自动开始抓取" 在自动 e2e 不可断言；只能 README 手测脚本
**Source:** [chrome.commands API](https://developer.chrome.com/docs/extensions/reference/api/commands) + [Google Groups: Default activate shortcut bug](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/eKcVRVOQ4GU)

### Pitfall 9: popup 关闭时机与 dispatch.start RPC race

**What goes wrong:** popup 在 sendMessage('dispatch.start', ...) 立即调 `window.close()` — RPC promise 还没 resolve 就关，`@webext-core/messaging` 的 response handler 收到 disconnect 抛 "Could not establish connection. Receiving end does not exist."
**How to avoid:**
- Option A: `await sendMessage(...)` 后再 `window.close()`（CONTEXT.md "Claude's Discretion" 推荐路径）— RPC 在 SW 端是 fire-and-forget 即可（SW 写 storage.session.pending → return；SW 后续推进与 popup 无关），popup 拿到 Ok({ dispatchId, state: 'pending' }) 即可关
- Option B: popup 不 await 直接 close — sendMessage 在 background 仍执行（chrome.runtime 消息 once-shot 不依赖 sender 仍存在）；但避免 disconnect 警告噪声推荐 A
- 推荐 A；plan 阶段确认
**Warning signs:** popup 关闭后 chrome://serviceworker-internals 看到 "disconnect" 警告堆积
**Source:** [PITFALLS §陷阱 3 + popup 关闭时机段]

### Pitfall 10: i18n 文案中嵌入 send_to URL（XSS 等价风险）

**What goes wrong:** Plan 阶段写 `t('binding.useBoundFor', { send_to })` — locale 文件 `'Use bound prompt for $1'` + popup 通过 `<p>{...}</p>` 渲染。`send_to` 来自用户输入历史 — 用户可能粘 `<script>alert(1)</script>`（不会执行因 Preact 渲染为文本节点，但若未来切到 `dangerouslySetInnerHTML` 即出 XSS）。
**How to avoid:**
1. Phase 3 popup 沿用 Phase 2 已落地的"三段式拆分"模式：所有用户字符串拼接走 JSX `<>{before}<span>{userValue}</span>{after}</>` — 永远不进 i18n placeholder
2. ESLint 已有 JSX hardcoded-string lint（Phase 1 D-12），Phase 6 完整 detector 加固
**Warning signs:** YAML locale 文件出现 `$1`/`$2` placeholder 用于用户输入；plan-checker 阶段抓
**Source:** Phase 2 D-22 + PITFALLS §11 + 安全错误第 1 行

## Runtime State Inventory

> N/A — Phase 3 是 greenfield 新代码，不涉及 rename/refactor/migration。Phase 1+2 已落地的 storage schemaVersion 在 Phase 3 不动（v1 内部新增 item 不需要 migration）。

## Code Examples

### dispatch.start RPC 入口（Phase 3 ★）

```ts
// Source: CONTEXT.md D-31 + D-32 + Pattern 2
// shared/messaging/routes/dispatch.ts (after D-07 split)
import { z } from 'zod';
import { ArticleSnapshotSchema, type Result } from '@/shared/messaging';

export const DispatchStartInputSchema = z.object({
  dispatchId: z.string().uuid(),
  send_to: z.string().url().max(2048),
  prompt: z.string().max(10_000),
  snapshot: ArticleSnapshotSchema,
});
export type DispatchStartInput = z.infer<typeof DispatchStartInputSchema>;

export const DispatchStartOutputSchema = z.object({
  dispatchId: z.string(),
  state: z.enum(['pending', 'opening', 'awaiting_complete', 'awaiting_adapter',
                 'done', 'error', 'cancelled']),
});
export type DispatchStartOutput = z.infer<typeof DispatchStartOutputSchema>;
```

### popup confirm 同步路径（D-32 dispatchId 生成）

```tsx
// Source: CONTEXT.md D-32 + crypto.randomUUID Chrome 92+ native
// entrypoints/popup/components/ConfirmButton.tsx
function ConfirmButton({ snapshot, sendTo, prompt }: Props) {
  return (
    <button
      type="button"
      onClick={async () => {
        const dispatchId = crypto.randomUUID();  // sync — gesture preserved
        const result = await sendMessage('dispatch.start', {
          dispatchId, send_to: sendTo, prompt, snapshot,
        });
        if (result.ok) {
          // popup closes → user sees badge progress
          window.close();
        } else {
          // surface error in popup before closing
          dispatchErrorSig.value = { code: result.code, message: result.message };
        }
      }}
    >
      {t('dispatch_confirm_label')}
    </button>
  );
}
```

### options page reset (STG-03)

```tsx
// Source: CONTEXT.md D-37 + repo.history/binding.resetAll
// entrypoints/options/App.tsx
import { sendMessage } from '@/shared/messaging';

function ResetSection() {
  const showConfirm = signal(false);
  return (
    <section class="...">
      <h2>{t('options_reset_heading')}</h2>
      <p>{t('options_reset_explainer')}</p>
      <button type="button" onClick={() => { showConfirm.value = true; }}>
        {t('options_reset_button')}
      </button>
      {showConfirm.value && (
        <ConfirmDialog
          title={t('options_reset_confirm_title')}
          body={t('options_reset_confirm_body')}
          onCancel={() => { showConfirm.value = false; }}
          onConfirm={async () => {
            await sendMessage('history.delete', { all: true });
            await sendMessage('binding.upsert', { resetAll: true });
            // (or dedicated history.resetAll / binding.resetAll routes —
            //  plan stage decides; D-50 closure recommends single 'all' flag)
            showConfirm.value = false;
          }}
        />
      )}
    </section>
  );
}
```

### mock-platform stub adapter (D-23)

```ts
// Source: CONTEXT.md D-23 + "stub adapter 失败注入路径"
// entrypoints/mock-platform.content.ts
import { defineContentScript } from '#imports';

export default defineContentScript({
  matches: [],            // runtime-only injection (D-26)
  registration: 'runtime',
  main(ctx) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type !== 'ADAPTER_DISPATCH') return;
      const { send_to, prompt } = msg.payload;

      // Failure-injection hooks for e2e (D-23)
      if (send_to.includes('fail-not-logged-in')) {
        sendResponse({ ok: false, code: 'NOT_LOGGED_IN', message: 'mock', retriable: false });
        return true;
      }
      if (send_to.includes('fail-input-not-found')) {
        sendResponse({ ok: false, code: 'INPUT_NOT_FOUND', message: 'mock', retriable: true });
        return true;
      }
      // ... fail-timeout, fail-rate-limited

      // Success path
      console.log('[mock-platform] compose', { send_to, prompt });
      console.log('[mock-platform] send (mocked)');
      sendResponse({ ok: true, data: undefined });
      return true;
    });
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chrome.alarms` 1 分钟最低 | 30 秒最低 | Chrome 120 (2024 末) | D-34 5 秒仍不可达；30 秒可达 |
| MV2 background page persistent | MV3 service worker (event-driven) | Chrome 88+ (2021)，Phase 1 已完整落地 | dispatch state 必须 storage-backed |
| `chrome.storage.session` 1 MB 配额 | 10 MB | Chrome 112 (2023) | dispatch 多并发 + snapshot 200 KB cap 不超限 |
| `chrome.commands._execute_browser_action` (MV2) | `_execute_action` (MV3) | MV3 强制 | manifest 字段名变 |
| WXT options 通过 wxt.config.ts manifest.options_ui | WXT 0.20.x options 必须用 build:manifestGenerated hook 或自动 entrypoints/options/ | WXT 0.20 重写 | verify-manifest 断言 options_ui，不是 options_page |
| crypto.randomUUID secure context only（HTTP 不可用） | chrome-extension:// 是 secure context | Chrome 92+ | popup 与 SW 都直接用，无需 polyfill |

**Deprecated / outdated:**
- `chrome.tabs.executeScript`（MV2）→ `chrome.scripting.executeScript`（MV3）— Phase 1+2 已用对
- `webextension-polyfill`（npm package）→ `@wxt-dev/browser`（WXT 0.20.x 内置）— Phase 1 已对齐
- `localStorage` in popup → `chrome.storage.local` 唯一路径 — Phase 1 D-01 已锁
- `chrome.runtime.connect` long-lived port for popup progress → storage.onChanged 拉模式 — CONTEXT.md "Claude's Discretion" 隐含

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 3 popup combobox 自定义实现 ~100 行可达成 D-30 全部要求（键盘导航、过滤、ARIA）| Standard Stack §Alternatives + Pattern 5 | 实际 ~200 行 → plan 阶段裁定切到 downshift 或扩大 simplicity-first 边界 |
| A2 | Phase 3 e2e fixture 用静态 mock-platform.html（serve 在 localhost:4321）即可端到端验证 dispatch 流水线，不需要真实 SPA | Pitfall 2 + Pattern 3 | 静态页面不暴露 SPA pushState 陷阱；Phase 5 才会发现真实 mitigation 缺口（已 deferred） |
| A3 | D-34 "5 秒后自清"在 plan 阶段裁定为 30 秒（Pattern 4 方案 A） | Pitfall 1 + Pattern 4 | user 可能希望维持 5 秒；plan / discuss 阶段需 surface 这个偏差 |
| A4 | Phase 3 中"所有 history.* / binding.* 路由都从 popup 调用，SW 不主动调"（除 dispatch=done 后 SW 自动 `repo.history.add` + `repo.binding.upsert`） | Pattern 6 + Code Examples | popup 与 SW 都写 history/binding 时 read-modify-write race；mitigation = SW 单写者 + popup 通过 RPC 写入 |
| A5 | mock-platform.html stub 不需要 manifest 静态 host_permissions（chrome-extension:// + localhost 通过 dev-mode `<all_urls>` 覆盖） | Code Examples + verify-manifest | 如果 production e2e 需要 stub adapter 测试，host_permissions 需调整 — 但 CONTEXT.md 明示 stub adapter 仅 Phase 3，Phase 4 即被替换，不进 store 提交 |
| A6 | typed-repo `repo.history.resetAll()` / `repo.binding.resetAll()` 实现简单（`item.setValue([])` / `setValue({})`），不需要事务保证 | Pattern 6 + STG-03 | reset 操作罕见（仅 options page 用户主动触发），即便部分写入也只是用户重做 |
| A7 | Phase 3 e2e Playwright 不能可靠断言 commands.\_execute\_action 快捷键触发（系统级快捷键仿真不稳） | Pitfall 8 | Phase 3 success criterion #5 部分项需依赖 README 手测脚本；plan 阶段记录 |

**Total assumptions:** 7 — 都属"实现细节级"假设，CONTEXT.md 16 个决策不被颠覆。Plan-checker / discuss-phase 应在 plan 阶段进入前确认 A3（D-34 30s deviation）让 user 知晓。

## Open Questions

1. **D-34 5 秒 → 30 秒偏差：plan 阶段如何 surface 给 user？**
   - 已知：chrome.alarms 最低粒度 = 30 秒（production），D-34 字面 5 秒不可达
   - 不清楚：user 是否会在意 ok badge 多停留 25 秒
   - 推荐：plan 阶段在 03-PLAN.md 顶部 deviations 节明确"D-34 ok 自清从 5s 调整为 30s（Chrome alarms minimum delay 限制）"，供 plan-checker 与 user-confirm-plan 阶段一次性 acknowledge

2. **stub adapter `mock://` URL scheme 还是 `http://localhost:4321/mock?xxx` URL？**
   - CONTEXT.md "stub adapter 失败注入路径" 例子是 `mock://fail-not-logged-in` — 但 `mock:` 不是合法浏览器 URL scheme，chrome.tabs.create 会抛错
   - 推荐：mock-platform fixture 服务在 localhost:4321/mock-platform.html，failure injection 走 query string `?fail=not-logged-in`；adapter-registry 的 `match()` 用 `host === 'localhost' && pathname === '/mock-platform.html'`
   - plan 阶段确认

3. **Phase 3 e2e SW restart 续接的精确编排**
   - 已知：fixtures.ts 有 reloadExtension（CDP `ServiceWorker.stopWorker`）
   - 不清楚：dispatch 进入 awaiting_complete 后 stop SW，重新点 popup wakeup → tabs.onUpdated 是否会立即触发？或需要再次 chrome.tabs.update 触发？
   - 推荐：e2e 走"opening → 立即 stopWorker → 让 mock-platform.html 完成加载 → tabs.onUpdated 自然触发新 SW 唤醒 → 续接 awaiting_adapter"。如果 stopWorker 后 navigation 已完成（tab 已 complete 但事件被 SW 死亡时丢失），则需要 fixture 模拟"重启后扫描 storage.session" — 这正是 D-33 设计的核心 mitigation

4. **dispatch_id_hint? in popupDraft schema (D-35) 含义？**
   - CONTEXT.md D-35 schema 写 `dispatch_id_hint?: ...` 但未说明用途
   - 推测：popup 关闭时若有 in-flight dispatch，把 dispatchId 写入 popupDraft 作为 hint；popup 重开时优先尝试加载该 dispatchId 状态而不是从空白开始
   - Plan 阶段确认 — 如果不需要可删字段简化

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Chrome 120+ | chrome.alarms 30 秒最低粒度 | ✓ (assumed dev environment) | — | unpacked dev 模式无 clamp，production user 必须在 Chrome 120+ |
| Chrome 92+ | crypto.randomUUID native | ✓ (Chrome 120 implies 92+) | — | crypto.getRandomValues + 手实现 v4 — 不需要 |
| pnpm 10.33.2 | 项目锁定 | ✓ | 10.33.2 | — |
| Node 20.19+ | WXT 0.20.x 兼容 | ✓ | engines.node | — |
| Playwright Chromium 1217+ | E2E launchPersistentContext --load-extension | ✓ Phase 1 已下载 | 1.59 | — |

**Missing dependencies with no fallback:** 无 — 所有依赖已就位（Phase 1+2 落地）。

**Missing dependencies with fallback:** 无。

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (单元) + Playwright 1.59 (E2E) |
| Config file | vitest.config.ts + playwright.config.ts (Phase 1+2 已就位) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test && pnpm verify:manifest` |
| E2E command | `pnpm test:e2e` (本地手测，CI Phase 4 接入) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSP-01 | send_to 输入 → debounce 200ms → platform icon 显示 / 未识别 → 通用 icon | unit | `pnpm test tests/unit/dispatch/platform-detector.spec.ts` | ❌ Wave 0 |
| DSP-01 | popup 渲染 platform icon | e2e | `pnpm test:e2e -- dispatch.spec.ts` | ❌ Wave 0 |
| DSP-02 | history dropdown 按 score 排序 | unit | `pnpm test tests/unit/repos/history.spec.ts` | ❌ Wave 0 |
| DSP-03 | prompt 历史复用 + 自动补全 | unit | `pnpm test tests/unit/repos/history.spec.ts` (同 repo) | ❌ Wave 0 |
| DSP-04 | binding upsert + Soft overwrite + dirty flag | unit | `pnpm test tests/unit/repos/binding.spec.ts` | ❌ Wave 0 |
| DSP-04 | popup 切换 send_to → prompt 自动切换 | e2e | `pnpm test:e2e -- dispatch.spec.ts` (binding 部分) | ❌ Wave 0 |
| DSP-05 | tabs.create/update + waitForComplete + executeScript | unit | `pnpm test tests/unit/dispatch/state-machine.spec.ts` | ❌ Wave 0 |
| DSP-05 | 端到端：popup → SW → mock-platform 收到 ADAPTER_DISPATCH | e2e | `pnpm test:e2e -- dispatch.spec.ts` | ❌ Wave 0 |
| DSP-06 | 同 dispatchId 重复请求幂等 | unit | `pnpm test tests/unit/dispatch/state-machine.spec.ts` (idempotency 用例) | ❌ Wave 0 |
| DSP-06 | SW restart 后续接 awaiting_complete | e2e | `pnpm test:e2e -- dispatch.spec.ts` (CDP stopWorker 用例) | ❌ Wave 0 |
| DSP-06 | 200ms 双击产生 1 个 dispatch | e2e | `pnpm test:e2e -- dispatch.spec.ts` (双击用例) | ❌ Wave 0 |
| DSP-07 | 5 个新 ErrorCode 各自 popup 渲染对应文案 | unit + e2e | unit: capture-style ErrorView 渲染断言；e2e: mock://?fail=not-logged-in 端到端 | ❌ Wave 0 |
| DSP-08 | badge 三态 loading/ok/err | unit | `pnpm test tests/unit/dispatch/state-machine.spec.ts` (badge 调用断言) | ❌ Wave 0 |
| DSP-08 | badge 自清 30s（A3 deviation） | e2e | `pnpm test:e2e -- dispatch.spec.ts` (alarm 触发断言；可用 fakeBrowser.alarms.onAlarm.trigger 单元化) | ❌ Wave 0 |
| DSP-09 | popup 编辑 → 关闭 → 重开恢复 send_to/prompt/title/description/content | e2e | `pnpm test:e2e -- draft-recovery.spec.ts` | ❌ Wave 0 |
| DSP-09 | dispatch=done 后 popupDraft 清 | unit | `pnpm test tests/unit/repos/popupDraft.spec.ts` (cleanup 用例) | ❌ Wave 0 |
| DSP-10 | manifest commands._execute_action 字段正确 | manifest | `pnpm verify:manifest` | ✓（脚本存在，需扩展断言） |
| DSP-10 | 快捷键打开 popup 并自动 capture.run | manual | README 手测脚本 | ✓（README 存在） |
| STG-03 | options page reset history 二次确认 + repo.resetAll | e2e | `pnpm test:e2e -- options-reset.spec.ts` | ❌ Wave 0 |
| STG-03 | typed-repo resetAll 实现 | unit | `pnpm test tests/unit/repos/{history,binding}.spec.ts` | ❌ Wave 0 |

**Sampling Rate:**
- **Per task commit:** `pnpm typecheck && pnpm lint && pnpm test`（< 30s 单元 + 类型 + lint）
- **Per wave merge:** `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest`
- **Phase gate:** 上述 + `pnpm test:e2e` 全绿（人工 gate，CI 接入推到 Phase 4）

**Wave 0 Gaps:**

- [ ] `tests/unit/dispatch/state-machine.spec.ts` — 覆盖 DSP-05/06/08 状态机推进
- [ ] `tests/unit/dispatch/platform-detector.spec.ts` — 覆盖 DSP-01 adapter-registry.match
- [ ] `tests/unit/repos/history.spec.ts` — 覆盖 DSP-02/03 + STG-03 history 部分
- [ ] `tests/unit/repos/binding.spec.ts` — 覆盖 DSP-04 + STG-03 binding 部分
- [ ] `tests/unit/repos/popupDraft.spec.ts` — 覆盖 DSP-09 持久化 + cleanup
- [ ] `tests/unit/messaging/dispatch.spec.ts` — capture.spec.ts mirror 模式
- [ ] `tests/e2e/fixtures/mock-platform.html` — stub 目标页面（含 query string failure injection 解析）
- [ ] `tests/e2e/dispatch.spec.ts` — 覆盖 DSP-05/06/07/08 端到端
- [ ] `tests/e2e/draft-recovery.spec.ts` — 覆盖 DSP-09
- [ ] `tests/e2e/options-reset.spec.ts` — 覆盖 STG-03
- [ ] `scripts/verify-manifest.ts` 扩展 — 新增 `commands._execute_action.suggested_key.default === 'Ctrl+Shift+S'` + `options_ui.page === 'options.html'` 断言
- [ ] 框架 install: 已就位（Phase 1 落地），无新依赖

## Security Domain

> Phase 3 引入 dispatch payload（snapshot + prompt + URL）的 popup → SW → content-script 跨上下文传递路径，且新增独立 options page。security_enforcement: true (ASVS Level 1, block on high) 已 enable。

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | 扩展无服务端账户体系；Phase 4 OpenClaw / Phase 5 Discord 走 user 已登录的 web session |
| V3 Session Management | no | 同上 |
| V4 Access Control | yes | popup ↔ SW ↔ content-script 单一信任域；externally_connectable 不开 |
| V5 Input Validation | yes | zod schema 在 RPC 边界校验所有 input；dispatch payload 来自用户输入（send_to URL / prompt / 编辑过的 snapshot） |
| V6 Cryptography | yes | crypto.randomUUID()（Chrome native）— 不手实现 |
| V7 Error Handling and Logging | yes | popup error 文案不渲染底层 message（Phase 2 落地 T-02-06-03）；SW console.error 仅 dev |
| V8 Data Protection | yes | popupDraft / history / binding 所有用户数据只在 chrome.storage.local；CLAUDE.md "隐私" 约束 |
| V11 Business Logic | yes | dispatchId 幂等防双发（D-32） |
| V13 API Configuration | yes | manifest 静态 host_permissions 不含 `<all_urls>`；commands 字段限定 _execute_action |
| V14 Configuration | yes | manifest 字段由 verify-manifest 锁定；options_ui open_in_tab 不开放敏感行为 |

### Known Threat Patterns for {Chrome MV3 Web Clipper + DOM injection}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 用户输入未校验进入 dispatch payload | T | RPC 边界 zod schema：`DispatchStartInputSchema` 校验 dispatchId UUID 格式 + send_to URL 格式 + prompt 长度 + snapshot ArticleSnapshotSchema |
| popup 渲染 send_to URL 触发 XSS（hypothetical） | T | Phase 2 已落地"i18n placeholder 不嵌入用户字符串"模式；Phase 3 inline accent span / `<span>{userValue}</span>` 走 Preact 文本节点 |
| 跨扩展消息伪造 dispatch.start | S | sender.id 校验（@webext-core/messaging 默认接受 same-extension only；不开 externally_connectable） |
| dispatch ID 可猜测 → 替他人 dispatch | T | crypto.randomUUID v4 加密强度足够；不暴露在外部 surface |
| stub adapter 失败注入 hook 留到 production → 用户能制造 fake error | I | mock-platform.content.ts 仅在 dev mode bundle（plan 阶段确认 production build 不含该 entrypoint，或 mock-platform 本身使用一个 production 不会到达的 host） |
| popupDraft 含敏感 prompt 被其他持 debugger 的扩展读 | I | PITFALLS §"安全错误" 第 3 行 — 已知风险，由 PRIVACY.md（Phase 7）披露；Phase 3 不增加新风险 |
| chrome.permissions.request 被欺骗 grant `<all_urls>` | E | Phase 4 才用；Phase 3 不涉及。verify-manifest 硬拦静态 `<all_urls>` 是边界控制 |
| storage 数据 quota 攻击（恶意页面让用户连续 capture 大文章） | D | snapshot.content cap 200 KB（Phase 2 已落地）；history cap 50（Phase 3 D-29） |
| dispatch 中途 SW 死掉数据丢失 | D | storage.session 持久化 + tabs.onUpdated 续接 + alarm 兜底（D-33） |

**Phase 3 specific security tasks:**
1. RPC input schema 在 `shared/messaging/routes/dispatch.ts` + `routes/history.ts` + `routes/binding.ts` 全部用 zod safeParse（不抛 — 走 Result.err `INTERNAL` 或专属码）
2. mock-platform.content.ts 在 wxt.config.ts 中条件配置：`include: ['development', 'test']`（如 WXT 支持），或在 entrypoint 头部 `if (!import.meta.env.DEV) return;` early-exit
3. options page 的 reset 二次确认 dialog 避免误操作（D-37）
4. 不引入任何 `eval` / `new Function` / 远程代码（CSP 默认即拦）

## Sources

### Primary (HIGH confidence)
- [Chrome MV3 Service Worker Events](https://developer.chrome.com/docs/extensions/mv3/service_workers/events) — 顶层 listener 注册 + SW 生命周期
- [chrome.alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms) — 30 秒最低粒度（unpacked vs production）
- [chrome.tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) — onUpdated 'complete' 语义 + tabs.query URL fragment 不匹配
- [chrome.scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) — executeScript 错误归类
- [chrome.action API](https://developer.chrome.com/docs/extensions/reference/api/action) — global vs per-tab badge 行为
- [chrome.commands API](https://developer.chrome.com/docs/extensions/reference/api/commands) — `_execute_action` + suggested_key 平台 key
- [chrome.permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) — user gesture 强约束
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) — session 10 MB 配额 + 无事务
- [W3C ARIA 1.2 Combobox With List Autocomplete](https://bocoup.github.io/aria-practices/examples/combobox/combobox-autocomplete-list.html) — 规范实现样板
- [MDN ARIA combobox role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/combobox_role) — 必需 attribute 集合
- [WXT Unit Testing](https://wxt.dev/guide/essentials/unit-testing) — fake-browser + fakeBrowser.alarms/tabs.onUpdated trigger 模式
- [WXT Entrypoints](https://wxt.dev/guide/essentials/entrypoints.html) — options entrypoint 自动产出 options_ui

### Secondary (MEDIUM confidence)
- [WXT GitHub Discussion #1330](https://github.com/wxt-dev/wxt/discussions/1330) — options_ui vs options_page 差异 + build:manifestGenerated hook 模式
- [Google Groups: Chrome Extensions — chrome.tabs.onUpdated MV3 SPA pushState](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/MesMv9ugQIQ) — SPA 不触发 onUpdated 已知问题
- [Google Groups: Default activate shortcut bug](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/eKcVRVOQ4GU) — Chrome _execute_action suggested_key 已知 bug
- [extension.ninja: This function must be called during a user gesture](https://www.extension.ninja/blog/post/solved-this-function-must-be-called-during-a-user-gesture/) — chrome.permissions.request gesture 失败模式
- [Mozilla Discourse: MV3 browser.scripting.executeScript Missing host permission](https://discourse.mozilla.org/t/mv3-browser-scripting-executescript-throws-missing-host-permission-for-the-tab/111555) — executeScript 错误情况
- [downshift README](https://github.com/downshift-js/downshift) — combobox 库 size + Preact 兼容（仅作 alternative 评估，未采用）

### Tertiary (LOW confidence — informational only)
- [Kent C. Dodds: Introducing downshift](https://kentcdodds.com/blog/introducing-downshift-for-react) — bundle size 数据
- [WICG/uuid Issue #23](https://github.com/WICG/uuid/issues/23) — secure context 要求

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — Phase 3 不引入新依赖，所有库 Phase 1+2 已 verify
- Architecture: **HIGH** — Pattern 1-6 与 Phase 1+2 已落地约束完全一致；CONTEXT.md 16 个决策覆盖所有 gray area
- Pitfalls: **HIGH** — 所有 10 个 pitfall 来自 Chrome 官方 docs / PITFALLS.md / WebSearch 多源交叉验证
- Validation Architecture: **HIGH** — Phase 1+2 testing infra 已就位，Phase 3 只增量加 spec 文件
- Security: **MEDIUM-HIGH** — ASVS V5 / V8 / V11 已有标准 mitigation；mock-platform production 排除是 plan 阶段需 确认细节

**Research date:** 2026-04-30
**Valid until:** 2026-05-30（30 天 — Chrome MV3 API + WXT 0.20.x 都属于稳定阶段；如 WXT 升级到 0.21+ 或 Chrome 124+ 落地新 alarms 行为，重新核验）
