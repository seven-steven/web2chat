# Phase 9: 投递鲁棒性 - Context

**Gathered:** 2026-05-10T06:14:47Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 交付投递链路鲁棒性加固：让 dispatch pipeline、adapter registry、popup error UI 能够应对网络延迟、DOM 变化、登录状态变化，并给用户提供可操作的重试路径。

本 phase 范围包含：

1. 将投递超时配置迁入 `AdapterRegistryEntry`，支持 `dispatchTimeoutMs` / `adapterResponseTimeoutMs`，pipeline 从 registry 读取而不是硬编码。
2. 将登录 URL 检测从 Discord 特例泛化为 registry 的 `loggedOutPathPatterns`，pipeline 层用统一 helper 做 URL 层登录 remap。
3. Popup 对 `retriable: true` 的 dispatch error 显示可用 Retry，并以新 `dispatchId` 重新发起投递。
4. Adapter selector 支持分层置信度；低置信度 class-fragment fallback 在发送前提示用户确认。

本 phase 不包含：

- Phase 10-12 的 Slack / Telegram / 飞书-Lark 实际 adapter selector、登录路径枚举或发送确认实现。
- 新 IM 平台图标、URL match、权限配置或 i18n platform key。
- Bot API、Webhook、server-to-server 发送、后台自动重试队列。
- 放宽 manifest 权限；静态 `host_permissions` 仍不得包含 `<all_urls>`。

**Dependency note:** Phase 9 depends on Phase 8. Planner should verify Phase 8 gap-closure plan has landed before relying on registry-driven MAIN bridge / SPA filter / ErrorCode aggregation fields.

</domain>

<decisions>
## Implementation Decisions

### 超时策略

- **D-111:** Registry entry 支持 per-platform timeout override，但现有 `mock` / `openclaw` / `discord` 先继承统一默认值：`dispatchTimeoutMs = 30_000`，`adapterResponseTimeoutMs = 20_000`。
- **D-112:** `dispatchTimeoutMs` 必须满足 Chrome alarms 生产约束：小于 `30_000` 的配置应通过构建或单元测试失败暴露，而不是运行时静默取整。
- **D-113:** `adapterResponseTimeoutMs` 继续用 `Promise.race` + `setTimeout` 包裹单次 `chrome.tabs.sendMessage` 等待；它不承担跨 MV3 service worker 生命周期恢复，只有配置值迁入 registry。
- **D-114:** dispatch 总超时和 adapter response 超时对用户统一表现为 `TIMEOUT` + `retriable: true`。内部 diagnostic message 可以区分 timeout 来源；不要为 adapter response 新增用户可见错误码。

### 登录识别

- **D-115:** `loggedOutPathPatterns` 使用简单路径模式（`string[]`），只在 adapter host 内匹配 `URL.pathname`；不要在 Phase 9 引入 RegExp / URLPattern 风格的复杂表达式。
- **D-116:** Phase 9 后，pipeline 不再把“同 host 但 `!adapter.match(actualUrl)`”泛化解释为登录跳转。只有 `actualUrl` 命中 `loggedOutPathPatterns` 才 remap 为 `NOT_LOGGED_IN`。
- **D-117:** 未配置 `loggedOutPathPatterns` 的平台不做 URL 层登录 remap，只保留 adapter 自己返回的错误。OpenClaw / 自部署 URL 不应被 host/path 形态误判为 logged out。
- **D-118:** tabs complete、SPA history update、adapter timeout / `sendMessage` failure、`INPUT_NOT_FOUND` remap 都调用同一个登录 URL 检测 helper，避免多处判断漂移。

### 重试语义

- **D-119:** Retry 使用当前 SendForm 中的 `send_to`、`prompt`、以及用户当前编辑后的 snapshot fields 生成新的 `dispatchId` 并调用 `dispatch.start`。这允许用户修正内容后直接重试。
- **D-120:** Retry 按钮显示条件以 dispatch error 的 `retriable` 为准；ErrorCode 只决定 i18n 文案。不要继续让 hard-coded `RETRIABLE_CODES` 成为最终语义来源。
- **D-121:** 用户点击 Retry 后立即清除当前错误，创建新 active dispatch，显示 `InProgressView`。成功沿用现有关闭 popup 行为；失败回到 SendForm + ErrorBanner。
- **D-122:** Retry 前清掉旧 active/error，再写入新的 active dispatchId。旧失败 record 可留在 `chrome.storage.session` 供诊断，但不得继续驱动 popup UI。

### 低置信度提示

- **D-123:** 低置信度 selector 命中时必须在发送前确认；确认前 adapter 不能执行 send，避免误发到第三方 IM。
- **D-124:** 协议采用“两次 dispatch”模型：adapter 第一次返回 `SELECTOR_LOW_CONFIDENCE` warning 且不发送；popup 展示确认；用户确认后以新 `dispatchId` 和一次性 confirmed flag 重走 `dispatch.start`。
- **D-125:** tier1 ARIA/role 和 tier2 `data-*` selector 正常发送；tier3 class fragment selector 触发 `SELECTOR_LOW_CONFIDENCE`。
- **D-126:** 用户确认低置信度 selector 只对当前一次 dispatch 生效，不保存到历史、binding 或后续 popup session。
- **D-127:** `SELECTOR_LOW_CONFIDENCE` 是 warning，不是 ErrorCode。Dispatch result 需要支持可选 `warnings` 数组或等价 warning channel；ErrorCode 仍用于失败语义。

### Claude's Discretion

- Timeout helper / registry 默认值的具体命名、文件位置、测试拆分交给 planner；但必须保持 D-111..D-114 的行为。
- `loggedOutPathPatterns` 的精确路径匹配语义（精确 vs prefix 标记方式）交给 planner，只要保持简单、可读、可测且仅匹配 pathname。
- Low-confidence confirmation UI 的具体视觉样式、focus 管理和 i18n key 命名交给 UI planner；但必须是发送前确认。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目与需求上下文

- `CLAUDE.md` — 项目约束：GSD 工作流、MV3 service worker discipline、adapter 模式、DOM 注入禁止 `innerText=` / `textContent=`、权限模型。
- `.planning/PROJECT.md` — Core Value、v1.1 目标、本地优先/隐私/权限约束、Key Decisions。
- `.planning/REQUIREMENTS.md` §Dispatch Robustness — DSPT-01..DSPT-04 是 Phase 9 的锁定需求。
- `.planning/ROADMAP.md` §"Phase 9: 投递鲁棒性" — Phase goal 与 4 条 success criteria。
- `.planning/STATE.md` §Accumulated Context — v1.1 前置决策：popup-driven retry、selector confidence、Phase 8 registry 泛化方向。
- `.planning/phases/08-architecture-generalization/08-CONTEXT.md` — D-95..D-110：PlatformId、MAIN world bridge、SPA filter、ErrorCode namespace 决策；Phase 9 必须建立在这些契约上。

### 当前代码直接触点

- `shared/adapters/types.ts` — `AdapterRegistryEntry` 已承载 `PlatformId`、`mainWorldInjector`、`spaNavigationHosts`、`errorCodes`；Phase 9 要扩展 timeout、logged-out path、selector warning 相关契约。
- `shared/adapters/registry.ts` — registry 是 popup + SW 共用平台发现入口；timeout 和 logged-out path defaults/overrides 应从这里驱动。
- `background/dispatch-pipeline.ts` — 当前硬编码 `DISPATCH_TIMEOUT_MINUTES`、`ADAPTER_RESPONSE_TIMEOUT_MS`，并有三处登录 remap 判断；Phase 9 主要改造点。
- `shared/messaging/result.ts` — 当前 `Result` 只有 ok/error；Phase 9 warning channel 需要在 messaging result 或 dispatch output 中表达。
- `shared/messaging/routes/dispatch.ts` — `dispatch.start` input/output schema；low-confidence confirmation 可能需要 confirmed flag 或 warning output。
- `entrypoints/popup/App.tsx` — active dispatch/error mount 行为与 dispatch state listener；Retry 需要切换 active dispatch 并进入 `InProgressView`。
- `entrypoints/popup/components/SendForm.tsx` — Confirm payload 组装、permission flow、ErrorBanner slot；Retry 应复用当前表单 payload。
- `entrypoints/popup/components/ErrorBanner.tsx` — 当前用 `RETRIABLE_CODES` 决定 Retry；Phase 9 要改为由 `retriable` 驱动。

### 保护性测试

- `tests/unit/dispatch/dispatch-timeout.spec.ts` — 当前 20s adapter response timeout 回归测试；应迁移为 registry/default-driven 断言。
- `tests/unit/dispatch/login-detection.spec.ts` — 当前 Discord login remap 回归测试；应更新为 `loggedOutPathPatterns` helper 行为。
- `tests/unit/adapters/discord-selector.spec.ts` — 已有 tier1/tier2/tier3 selector fallback mirror；Phase 9 应把 tier3 低置信度 warning 行为纳入测试。
- `tests/unit/dispatch/mainWorldBridge.spec.ts` / `tests/unit/dispatch/spaFilter.spec.ts` — Phase 8 registry-driven bridge/filter 测试，Phase 9 规划时需确认未被破坏。

### 外部技术参考

- Chrome Extensions — Extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle — MV3 SW idle/request timeout 与持久化状态原则。
- Chrome Extensions — `chrome.alarms`: https://developer.chrome.com/docs/extensions/reference/api/alarms — Chrome 120 起最小 30s alarm、alarm persistence caveats。
- Chrome Extensions — Migrate to a service worker: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers — SW 中长期延迟应使用 alarms 而不是 timers。
- Chrome Extensions — `chrome.webNavigation`: https://developer.chrome.com/docs/extensions/mv2/reference/webNavigation — SPA `onHistoryStateUpdated` 语义参考。
- Chrome Extensions — Match patterns: https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns — host/path permission scoping 参考。
- OWASP — Open Redirect: https://owasp.org/www-community/attacks/open_redirect — URL parsing / allowlist mindset，避免 naive redirect handling。
- Microsoft Learn — Transient Fault Handling: https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults — retry 只用于 transient/retriable failure，避免无界自动重试。
- WebdriverIO — Best Practices / resilient selectors: https://webdriver.io/docs/bestpractices — selector resilience 优先级参考。
- Grafana k6 — Selecting elements: https://grafana.com/docs/k6/latest/using-k6-browser/recommended-practices/selecting-elements/ — ARIA / data-* 优先，class / XPath 脆弱。
- Playwright — Other locators: https://playwright.dev/docs/next/other-locators — test id 与 locator 稳定性参考。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `shared/adapters/registry.ts` / `shared/adapters/types.ts` — 已是 registry-driven 平台契约中心，可直接追加 timeout、logged-out path、selector confidence 元数据。
- `background/dispatch-pipeline.ts` — 已有 dispatch state machine、active record、alarm timeout、adapter response Promise.race、tab URL re-check；Phase 9 应抽小 helper 而不是重写 pipeline。
- `entrypoints/popup/components/SendForm.tsx` — 已集中组装 dispatch payload；Retry 使用当前表单值时应复用这一路径。
- `entrypoints/popup/components/ErrorBanner.tsx` — 已有 retry button slot；Phase 9 主要调整 prop 契约和显示条件。
- `tests/unit/adapters/discord-selector.spec.ts` — 已有三层 selector fixture 测试，可扩展为 confidence return/report 行为。

### Established Patterns

- Registry match 函数必须纯函数、无 `chrome.*`，因为 popup 和 SW 都 import。
- SW 事件 listener 顶层同步注册；跨事件/长延迟兜底使用 `chrome.alarms`，状态落 `chrome.storage.session`。
- Adapter runtime 注入仍走 `chrome.scripting.executeScript({ files })` + `ADAPTER_DISPATCH` message；Phase 9 不应引入平台硬编码分支。
- ErrorCode 新增必须克制；非失败状态优先用 warning channel，不膨胀错误枚举。
- Popup 用户可见字符串必须走 i18n；Retry / low-confidence confirmation 需要 en + zh_CN key 100% 覆盖。

### Integration Points

- `AdapterRegistryEntry`：新增 timeout defaults/overrides、`loggedOutPathPatterns`、selector confidence/warning related metadata 或 adapter output type。
- `dispatch-pipeline.ts`：读取 registry timeout；用统一 helper 检测 logged-out URL；支持 warning result 和 low-confidence confirmation retry path。
- `dispatch.start` schema：可能新增一次性 confirmed flag，用于 low-confidence 用户确认后的第二次 dispatch。
- Popup state：Retry 与 selector confirmation 都需要新 dispatchId，但分别服务于 error recovery 与 warning confirmation。
- Tests：TDD 覆盖 timeout defaults、invalid timeout guard、loggedOutPathPatterns helper、retriable-driven Retry、low-confidence warning pre-send confirmation。

</code_context>

<specifics>
## Specific Ideas

- Timeout 默认值保持当前行为：dispatch 30s，adapter response 20s。
- 登录检测从“host 内不 match”收窄为显式 logged-out path，避免未来平台误判。
- Retry 使用用户当前表单值，而不是旧失败 record 的冻结 payload。
- Low-confidence confirmation 采用 warning + second dispatch，不在 content script 中长时间暂停等待 popup。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 9-投递鲁棒性*
*Context gathered: 2026-05-10T06:14:47Z*
