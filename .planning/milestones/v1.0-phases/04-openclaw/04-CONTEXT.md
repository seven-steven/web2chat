# Phase 4: OpenClaw 适配器 - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 在友好的本地目标（OpenClaw Web UI）上验证首条端到端投递链路：

1. **OpenClaw adapter**：`entrypoints/openclaw.content.ts` 实现 `IMAdapter` 接口（`match`/`waitForReady`/`compose`/`send`/`canDispatch`），注册到 `shared/adapters/registry.ts`
2. **动态 origin 授权**：用户首次向 OpenClaw 实例投递时通过 `chrome.permissions.request` 动态获取该 origin 权限；`grantedOrigins` storage item 持久化已授权 origin；options page 展示已授权列表 + 移除能力
3. **DOM 注入 helper**：`shared/dom-injector.ts` 导出通用 `setInputValue(el, text)` — property-descriptor setter + 冒泡 input 事件（CLAUDE.md 约定路径）
4. **ErrorCode 扩展**：`OPENCLAW_OFFLINE` / `OPENCLAW_PERMISSION_DENIED` 两个新错误码 + 对应 i18n 文案
5. **E2E 验证**：Playwright 覆盖全链路（popup → 消息落入会话）、离线路径、授权拒绝路径

Phase 4 **不包含**：

- Discord 适配器（Phase 5）
- Slate/Lexical ClipboardEvent 注入路径（Phase 5 Discord 专用）
- 运行时 locale 切换（Phase 6）
- ESLint 完整版 hardcoded-string detector（Phase 6）
- PRIVACY.md（Phase 7）
- 失败队列 + 自动重试（v1.x）
- 多目标 fan-out（v1.x）

</domain>

<decisions>
## Implementation Decisions

### 1. 消息格式化 (D-39..D-41)

- **D-39:** **Prompt 在前 + Markdown 格式**。compose() 写入 OpenClaw textarea 的消息格式：先 prompt（用户指令），空行后 snapshot 字段按 title → url → description → content 排列。Markdown 格式（标题用 `##`，url 用链接语法）。理由：与 AI Agent 交互时 prompt 在前更自然——Agent 先读到指令再读到内容。
- **D-40:** **全部 5 字段，内容为空时省略**。compose 的 Markdown 中包含 title / url / description / create_at / content 全部 5 个 snapshot 字段。任何字段内容为空时整行省略（不输出空占位）。create_at 作为元信息行输出（如 `> 采集时间: 2026-05-01T12:00:00Z`）。
- **D-41:** **不截断**。OpenClaw 无字符限制，Phase 4 adapter compose() 直接传全量内容。截断逻辑留给 Phase 5 Discord adapter 层按平台限制（2000 char）实现。

### 2. 权限授权 UX (D-42..D-46)

- **D-42:** **Confirm 时授权**。用户在 popup send_to 输入 OpenClaw URL 后，debounce 800ms 检查该 origin 是否在 `grantedOrigins` 中。未授权时 send_to 输入框旁显示"需要授权"指示器。实际 `chrome.permissions.request` 在用户点击 Confirm 时触发（不在输入时弹出，避免突兀）。
- **D-43:** **ErrorBanner + 重新授权按钮**。用户拒绝授权后，popup 展示 ErrorBanner 组件（复用 Phase 3 已有 ErrorBanner），错误码 `OPENCLAW_PERMISSION_DENIED`，显示"未获取访问 X 的权限"+ "重新授权"按钮。点击重新授权再次触发 `chrome.permissions.request`。Confirm 按钮保持 disabled 直到授权通过。
- **D-44:** **dispatch-pipeline 检查权限**。dispatch-pipeline 在 `startDispatch` 中、`openOrActivateTab` 之前检查 `grantedOrigins.includes(targetOrigin)`。未授权则调用 `chrome.permissions.request`，用户拒绝则返回 `Err('OPENCLAW_PERMISSION_DENIED')`。逻辑在 dispatch-pipeline（SW 端）而非 adapter 内，因为 content script 无法调用 `chrome.permissions` API。
- **D-45:** **独立 grantedOrigins storage item**。`grantedOrigins` 作为 `chrome.storage.local` 的一个 typed item，存 `string[]` 形态。授权成功后 push 新 origin，移除时 filter 掉。同时绑定到对应的 send_to 历史项（HistoryEntry 不需要额外 granted 标记——通过 grantedOrigins 集合查询即可）。
- **D-46:** **Options page 简单列表 + 移除**。Options page 新增"已授权 Origin"区块，展示 grantedOrigins 列表，每项显示 origin + "移除"按钮。移除时调用 `chrome.permissions.remove({ origins: [origin + '/*'] })` 收回 host_permission 并从 grantedOrigins storage 删除。Phase 4 只做这个简单列表。

### 3. DOM 注入策略 (D-47..D-51)

- **D-47:** **CSS selector 优先**。OpenClaw 是用户自控的内部项目，用 CSS selector 定位 textarea（如 `textarea[name="message"]` 或 `#chat-input`）。如果 OpenClaw 前端变动只需更新 selector 字符串。Phase 5 Discord adapter 走 ARIA 优先策略，两个 adapter 选择器策略独立。
- **D-48:** **通用 setInputValue helper**。`shared/dom-injector.ts` 导出 `setInputValue(el: HTMLElement, text: string): void`，内部用 `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, text)` + `el.dispatchEvent(new Event('input', { bubbles: true }))`。OpenClaw adapter 和未来其他 React-controlled-input 平台复用。Discord adapter 不用它（Slate/Lexical 走 ClipboardEvent 路径）。
- **D-49:** **Enter keydown 触发发送**。compose 完成后发送合成 `KeyboardEvent('keydown', { key: 'Enter', bubbles: true })` 触发提交。如果研究阶段发现 OpenClaw 用 Ctrl+Enter，则调整。
- **D-50:** **MutationObserver 确认上屏**。send() 后用 MutationObserver 监听会话流容器，检测新 DOM 节点（消息气泡）添加。匹配成功则 resolve `Ok(void)`。配 5s 超时兜底，超时返回 `Err('TIMEOUT')`。
- **D-51:** **Adapter 内 waitForReady 5s 超时**。waitForReady 在 adapter content script 内实现：用 MutationObserver 等待 textarea 出现，5s 超时返回 `Err('TIMEOUT')`。dispatch-pipeline 在 executeScript 后、发 ADAPTER_DISPATCH 之前不做额外等待——adapter 自己负责 DOM 就绪。

### 4. canDispatch 探针 (D-52..D-53)

- **D-52:** **Adapter 内部实现 canDispatch**。canDispatch 在 adapter content script 内执行。adapter 收到 ADAPTER_DISPATCH 后先跑 canDispatch（检查 textarea 是否存在 + 页面是否可交互）。每个平台自定义"就绪"的语义。"OpenClaw 未运行"的检测不在 canDispatch 内——那属于连接被拒，在 dispatch-pipeline 的 openOrActivateTab 层就会表现为错误页。
- **D-53:** **DOM 检查区分 OPENCLAW_OFFLINE vs INPUT_NOT_FOUND**。OpenClaw 未运行时 chrome.tabs.create 打开目标 URL 会显示浏览器错误页（"连接被拒绝"）。tabs.onUpdated:complete 仍会触发，但 executeScript 注入后 adapter 发现页面不是 OpenClaw UI（textarea 不存在且无 OpenClaw 特征 DOM）→ 返回 `Err('OPENCLAW_OFFLINE')`。textarea 存在但不可交互（如被 modal 遮挡）→ 返回 `Err('INPUT_NOT_FOUND')`。无需额外 fetch 探测。

### Claude's Discretion

下列决策委托给 plan 阶段，由 planner 按 simplicity-first 与已锁定的上下文裁定：

- **OpenClaw textarea 的精确 CSS selector**：研究阶段分析 OpenClaw 前端代码后确定。如果 OpenClaw 用 React 且 textarea 有稳定 id/name 属性，直接用；否则用父容器 + element type 组合 selector。
- **compose Markdown 模板的精确格式**：D-39/D-40 锁定了"prompt 在前 + Markdown + 5 字段空省略"，具体的 Markdown heading level / 分隔符 / create_at 行格式由 plan 决定。
- **OPENCLAW_OFFLINE vs INPUT_NOT_FOUND 的区分逻辑**：D-53 锁定了"adapter 检查 DOM 特征"，具体的 DOM 特征检测条件（如检查 OpenClaw 的 app root / favicon / title pattern）由 plan 决定。
- **grantedOrigins storage item 的 schema version**：是否需要 bump storage schema version 取决于 Phase 3 结束时的 schema 状态。
- **options page 已授权 Origin 区块的精确 UI 布局**：D-46 锁定了"简单列表 + 移除按钮"，具体视觉样式由 plan 决定。
- **E2E fixture 形态**：是本地 stub OpenClaw 页面还是对真实 OpenClaw 服务跑。推荐：本地 stub HTML fixture（与 Phase 3 mock-platform 模式一致）+ 如 OpenClaw 可本地启动则加一个 optional 真实服务 spec。
- **dispatch-pipeline 中 permissions.request 调用的具体位置**：D-44 锁定在 startDispatch 内、openOrActivateTab 前。是否抽独立函数由 plan 决定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目顶层上下文

- `CLAUDE.md` — 已锁定的 SW 纪律、权限模型、DOM 注入路径（property-descriptor setter）、适配器模式约定；Phase 4 DOM 注入必须遵循此处约定
- `.planning/PROJECT.md` — Core Value、约束、Key Decisions 表（含 OpenClaw 动态权限决策、optional_host_permissions 策略）
- `.planning/REQUIREMENTS.md` §"Adapter: OpenClaw (MVP 通道 1)" — Phase 4 对应的 7 条 REQ-ID（ADO-01..07）的可观察验收要求
- `.planning/ROADMAP.md` §"Phase 4: OpenClaw 适配器" — 6 条成功标准的精确措辞

### 先前 Phase 上下文

- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01..D-12 决策（typed messaging、Result/ErrorCode 模型、storage migration 框架）
- `.planning/phases/02-capture/02-CONTEXT.md` — D-13..D-22 决策（ArticleSnapshot shape、capture.run RPC、popup signal 编辑模型）
- `.planning/phases/03-dispatch-popup/03-CONTEXT.md` — D-23..D-38 决策（IMAdapter 接口、adapter-registry、dispatch state machine、popupDraft、ErrorBanner、Combobox）；Phase 3 Deferred → Phase 4 的完整清单

### 已有代码（Phase 4 直接扩展点）

- `shared/adapters/types.ts` — IMAdapter + AdapterRegistryEntry 接口定义
- `shared/adapters/registry.ts` — adapterRegistry 数组 + findAdapter / detectPlatformId 函数；Phase 4 在此 append openclaw entry
- `shared/messaging/result.ts` — ErrorCode 联合；Phase 4 追加 `OPENCLAW_OFFLINE` / `OPENCLAW_PERMISSION_DENIED`
- `background/dispatch-pipeline.ts` — dispatch state machine；Phase 4 在 startDispatch 中加权限检查
- `entrypoints/mock-platform.content.ts` — Phase 3 stub adapter 参考实现
- `entrypoints/popup/components/ErrorBanner.tsx` — Phase 3 错误展示组件，Phase 4 复用
- `entrypoints/options/` — Phase 3 options page（含 ResetSection）；Phase 4 新增已授权 Origin 管理区块
- `shared/storage/items.ts` — Phase 4 新增 `grantedOriginsItem`

### 技术与架构调研

- `.planning/research/ARCHITECTURE.md` §"模式 2：IMAdapter 注册表" + §"模式 3：以编程注入取代静态 content_scripts" — adapter 注册与动态注入模式
- `.planning/research/PITFALLS.md` §陷阱 7（登录墙）、§陷阱 9（Web Store 拒绝 / 过宽权限） — Phase 4 canDispatch 探针 + 动态权限策略的 mitigation 依据

### 外部权威文档

- Chrome MV3 §`chrome.permissions.request` / §`chrome.permissions.remove` / §`chrome.permissions.contains` — 运行时权限 API
- Chrome MV3 §`chrome.scripting.executeScript` — adapter 注入
- WXT 0.20.x §"content scripts" — entrypoint 配置、`registration: 'runtime'`
- MDN `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')` — React controlled input 注入原理
- MDN `MutationObserver` — waitForReady + send 确认

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`shared/adapters/registry.ts`** — Phase 4 在 `adapterRegistry` 数组中 append `{ id: 'openclaw', match, scriptFile, hostMatches, iconKey }` entry。`findAdapter` / `detectPlatformId` 自动发现新 adapter，popup platformDetector + SW dispatch pipeline 无需改动。
- **`shared/adapters/types.ts`** — `IMAdapter` 接口 + `AdapterRegistryEntry` 类型已就位。`PlatformId` union 已包含 `'openclaw'`。
- **`background/dispatch-pipeline.ts`** — dispatch state machine 全流程已实现。Phase 4 仅需在 `startDispatch` 中 `findAdapter` 之后、`openOrActivateTab` 之前插入权限检查逻辑。`advanceToAdapterInjection` + `onTabComplete` + `onAlarmFired` 不动。
- **`entrypoints/mock-platform.content.ts`** — stub adapter 参考实现，展示了 `ADAPTER_DISPATCH` 消息协议和响应格式。Phase 4 openclaw adapter 遵循同一协议。
- **`shared/messaging/result.ts`** — `ErrorCode` union + `Ok`/`Err` helpers。Phase 4 追加两个新码。
- **`shared/storage/items.ts`** — typed storage items。Phase 4 新增 `grantedOriginsItem: WxtStorage.defineItem<string[]>()`。
- **`entrypoints/popup/components/ErrorBanner.tsx`** — 已有错误展示组件。Phase 4 新增 `OPENCLAW_PERMISSION_DENIED` 码的 i18n 文案 + "重新授权"按钮处理。
- **`entrypoints/options/`** — Phase 3 options page 含 ResetSection。Phase 4 新增 `GrantedOriginsSection` 组件。
- **`shared/i18n/`** — en + zh_CN locale 100% 同构。Phase 4 新增 `adapter.openclaw.*` / `error.code.openclaw_offline` / `error.code.openclaw_permission_denied` / `options.origins.*` 命名空间。

### Established Patterns

- **SW 顶层 listener 注册**：如 Phase 4 需要新 RPC 路由（如 `permissions.requestOrigin`），必须在 `defineBackground` 顶层同步注册
- **Result 单一路径**：新错误码走 `Err(code, ...)` + popup 单一 `result.ok` 分支
- **adapter 注册 = 单文件**：新增 adapter = append registry entry + 创建 `entrypoints/<platform>.content.ts`
- **content script 协议**：adapter 注册 one-shot `chrome.runtime.onMessage` listener for `type === 'ADAPTER_DISPATCH'`
- **typed storage repo**：`grantedOrigins` 需通过 `shared/storage/repos/grantedOrigins.ts` 包装业务方法

### Integration Points

- `shared/adapters/registry.ts` — Phase 5 Discord adapter 也 append 到同一 registry
- `shared/dom-injector.ts` — 新文件，Phase 4 创建。Phase 5 不使用（Discord 走 ClipboardEvent）但未来其他 React-controlled-input 平台可复用
- `grantedOriginsItem` — Phase 4 创建，Phase 5 Discord 不需要（Discord 有静态 host_permissions）
- `dispatch-pipeline.ts` — Phase 4 修改 startDispatch 加权限检查。此修改对所有平台生效，但仅 openclaw 需要动态权限
- `ErrorCode` 扩展 — Phase 5 可能追加 Discord 专属错误码

</code_context>

<specifics>
## Specific Ideas

- **compose Markdown 模板示意**：

  ```markdown
  {prompt}

  ## {title}

  {url}

  > {description}

  > 采集时间: {create_at}

  {content}
  ```

  空字段整行省略（不输出空占位行）。

- **adapter 消息协议**（与 mock-platform 一致）：

  ```ts
  // SW → adapter (via chrome.tabs.sendMessage)
  { type: 'ADAPTER_DISPATCH', payload: { dispatchId, send_to, prompt, snapshot } }

  // adapter → SW (via sendResponse)
  { ok: true } | { ok: false, code: ErrorCode, message: string, retriable: boolean }
  ```

- **grantedOrigins repo API**：

  ```ts
  // shared/storage/repos/grantedOrigins.ts
  export async function list(): Promise<string[]>
  export async function add(origin: string): Promise<void>
  export async function remove(origin: string): Promise<void>
  export async function has(origin: string): Promise<boolean>
  ```

- **dispatch-pipeline 权限检查插入点**：

  ```ts
  // startDispatch 中，findAdapter 之后、openOrActivateTab 之前
  const targetOrigin = new URL(input.send_to).origin;
  if (adapter.id === 'openclaw') {
    const granted = await grantedOriginsRepo.has(targetOrigin);
    if (!granted) {
      const ok = await chrome.permissions.request({ origins: [targetOrigin + '/*'] });
      if (!ok) return Err('OPENCLAW_PERMISSION_DENIED', targetOrigin, true);
      await grantedOriginsRepo.add(targetOrigin);
    }
  }
  ```

- **i18n 命名空间**（en + zh_CN 100% 同构）：
  - `error.code.openclaw_offline` — "OpenClaw 未在 {origin} 上运行 — 请启动后重试"
  - `error.code.openclaw_permission_denied` — "未获取访问 {origin} 的权限 — 点击重新授权"
  - `adapter.openclaw.name` — "OpenClaw"
  - `options.origins.title` — "已授权 Origin"
  - `options.origins.remove` — "移除"
  - `options.origins.empty` — "暂无已授权的 Origin"

- **Playwright E2E 策略**：
  - `tests/e2e/openclaw-dispatch.spec.ts` — 本地 stub OpenClaw 页面（HTML fixture with textarea + 消息列表容器）→ popup Confirm → 消息落入 textarea 容器
  - `tests/e2e/openclaw-offline.spec.ts` — 目标 URL 不可达 → popup 展示 OPENCLAW_OFFLINE 错误
  - `tests/e2e/openclaw-permission.spec.ts` — 授权 accept / deny 两种路径

</specifics>

<deferred>
## Deferred Ideas

### 留 Phase 5 (Discord 适配器)

- Slate/Lexical ClipboardEvent 注入路径（`shared/dom-injector.ts` 不覆盖此场景）
- Discord ToS 风险声明
- Markdown escape helper（`@everyone` / `<@id>` 等）
- Discord 2000 字符截断逻辑
- `chrome.webNavigation.onHistoryStateUpdated` 顶层 listener
- discord.fixture.html DOM 抓取与 selector 单元测试

### 留 Phase 6 (i18n 加固)

- 运行时 locale 切换（I18N-02）
- ESLint 完整版 hardcoded-string detector（I18N-03）
- 错误码文案"语气/行动指引"打磨

### 留 Phase 7 (分发)

- PRIVACY.md 列出 dispatch + 权限字段流向
- README 双语章节描述 OpenClaw adapter 使用

### 留 v1.x

- 失败队列 + chrome.alarms 重试
- 多目标 fan-out
- 自定义消息模板 `{{title}}` / `{{url}}` 等变量
- 内容截断策略全局统一（跨平台 adapter 统一截断接口）

</deferred>

---

*Phase: 04-openclaw*
*Context gathered: 2026-05-01*
