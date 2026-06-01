# Phase 8: 架构泛化 - Context

**Gathered:** 2026-05-09T14:54:24.969Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 交付 v1.1 多平台并行开发的架构基础，目标是让后续 Slack / Telegram / 飞书-Lark adapter 能通过 registry + adapter 文件接入，而不再修改 dispatch pipeline 或 service worker 入口中的平台特定逻辑。

本 phase 范围包含：

1. `PlatformId` 从硬编码 literal union 改为 branded string type，并让 registry 成为 branded id 的来源。
2. MAIN world paste bridge 从 Discord 专用 port + function 泛化为 registry 路由到 per-adapter `mainWorldInjector`。
3. SPA history route filter 从 Discord 硬编码 filter 改为 adapter registry 显式 opt-in 动态构建。
4. `ErrorCode` 从单一联合类型重组为通用码 + 平台码的 namespace 模型，并支持从 registry 聚合平台错误码。

本 phase 不包含：

- Phase 9 的超时配置、登录检测泛化、重试 UI、选择器置信度。
- Phase 10-12 的 Slack / Telegram / 飞书-Lark DOM selector、消息格式化、实际投递实现。
- Bot API、Webhook、server-to-server 发送或任何后端能力。
- 权限模型放宽；静态 `host_permissions` 仍不得包含 `<all_urls>`。

</domain>

<decisions>
## Implementation Decisions

### PlatformId 边界

- **D-95:** 保留 `mock` 作为 registry 中的正式平台条目。它继续支撑现有 localhost fixture、E2E 和平台检测测试，不拆成 test-only registry。
- **D-96:** `PlatformId` 使用 branded string type，且 `DispatchRecord.platform_id` 也改为 branded `PlatformId`，不是 raw string。
- **D-97:** Branded `PlatformId` 只能由 registry 构造路径产生。推荐通过 `definePlatformId()` / `defineAdapter()` 一类 helper 创建，避免在调用点散落 raw `as PlatformId` cast。
- **D-98:** 平台展示 metadata（如 `iconKey`、display label 所需 key、未来 UI 可消费字段）继续由 `AdapterRegistryEntry` 承载，不在 popup 另建平台 mapping。

### MAIN world 桥接契约

- **D-99:** MAIN world 注入逻辑采用 per-adapter `mainWorldInjector`，不抽通用 paste/enter DSL。Slack / Telegram / 飞书的编辑器差异由各自 injector 内部处理。
- **D-100:** `mainWorldInjector` 挂在 registry entry 上。新增平台应只需要新增 adapter 文件 + registry entry，不需要修改 SW 入口或 dispatch pipeline 的平台分支。
- **D-101:** Port 命名采用统一前缀 + platform id：`WEB2CHAT_MAIN_WORLD:<platformId>`。SW 解析 `platformId` 后从 registry 找对应 injector。
- **D-102:** MAIN bridge payload 固定为 `{ text }`。selector、清理、paste、Enter/按钮点击等平台差异封装在平台 injector 内；bridge 不定义命令协议，也不允许 per-adapter 任意 payload。

### SPA filter 来源

- **D-103:** SPA history route 监听使用显式 opt-in 字段，不从 `hostMatches` 自动推导，也不监听所有平台后在 callback 内过滤。
- **D-104:** Registry 字段表达为精确 host 列表（例如 `spaNavigationHosts: ['discord.com']`），由 builder 生成 Chrome `webNavigation` filter。不要把 Chrome `events.UrlFilter[]` 原生结构直接暴露到 registry entry。
- **D-105:** SPA hosts 默认只匹配精确 host；不自动包含子域。需要子域时未来可显式扩展字段，但 Phase 8 默认保持最窄唤醒面。
- **D-106:** `onHistoryStateUpdated` 事件走专用 handler（例如 `onSpaHistoryStateUpdated`），不直接复用 `onTabComplete` 入口。专用 handler 可以共享底层状态推进 helper，但语义上应区分普通 tab complete 与 SPA history update。

### ErrorCode 命名空间

- **D-107:** ErrorCode 采用混合模型：保留通用语义码（如 `NOT_LOGGED_IN` / `TIMEOUT` / `INPUT_NOT_FOUND`），只有平台特有且用户可见处理或重试语义不同的原因才新增平台专属码（如现有 `OPENCLAW_PERMISSION_DENIED`）。
- **D-108:** “通用前缀 + 平台前缀”落在 TypeScript 类型分组/namespace 上，不强制把现有通用字符串值改成 `COMMON_*`。现有 `TIMEOUT` 等字符串值保持稳定，避免大范围 ErrorBanner/i18n/test 迁移。
- **D-109:** 平台专属 ErrorCode 严格新增：只有无法用通用码表达，且 UI/重试/诊断语义确实不同，才允许新增 `PLATFORM_*` 码。平台差异不能随意膨胀成一套完整平台错误枚举。
- **D-110:** ErrorCode 的类型与运行时校验从 registry/adapter 声明聚合。Planner 需要设计无循环依赖的聚合方式：通用码可作为 shared base，平台码由 adapter registry entry 或相邻平台声明以 `as const` 暴露，再组合出 `ErrorCode` / `isErrorCode`。

### Claude's Discretion

下列细节交给 researcher/planner 按最小改动和现有代码约束决定：

- `Brand<T, Name>`、`definePlatformId()`、`defineAdapter()` 的具体命名与文件位置。
- `AdapterRegistryEntry` 新字段的精确名称（如 `mainWorldInjector`、`spaNavigationHosts`、`errorCodes`）。
- `onSpaHistoryStateUpdated` 是否共享 `onTabComplete` 的内部 helper，以及 helper 如何命名。
- Registry 挂载 `mainWorldInjector` 时如何避免 popup bundle 引入不必要 MAIN world 代码；只要保持“新增平台不改 SW/pipeline 平台逻辑”的目标即可。
- ErrorCode registry 聚合的具体类型技巧；优先保持可读、可测试，不为类型体操牺牲简洁性。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目顶层上下文

- `CLAUDE.md` — 项目约束：SW 顶层 listener、adapter 模式、DOM 注入禁用 `innerText=` / `textContent=`、权限模型、GSD 工作流。
- `.planning/PROJECT.md` — Core Value、v1.1 目标、隐私/本地优先/权限约束、Key Decisions。
- `.planning/REQUIREMENTS.md` §Architecture — ARCH-01..ARCH-04 是 Phase 8 的锁定需求。
- `.planning/ROADMAP.md` §"Phase 8: 架构泛化" — Phase 8 goal 与 4 条 success criteria。
- `.planning/STATE.md` §Accumulated Context — v1.1 前置决策：branded PlatformId、MAIN world 桥接泛化、popup-driven retry、selector confidence。

### 先前 Phase 决策

- `.planning/milestones/v1.0-phases/05-discord/05-CONTEXT.md` — D-62..D-70：Discord ClipboardEvent/MAIN world/SPA route/login remap 的来源决策。
- `.planning/milestones/v1.0-phases/06-i18n/06-CONTEXT.md` — D-73..D-82：i18n 和 typed UI 文案基础，ErrorBanner/i18n 变更需保持 locale 覆盖。
- `.planning/milestones/v1.0-phases/07-distribution/07-CONTEXT.md` — D-87..D-94：权限与隐私声明边界，manifest 权限验证不能被架构泛化放宽。

### 当前代码直接触点

- `shared/adapters/types.ts` — 当前 `PlatformId = 'mock' | 'openclaw' | 'discord'` literal union；`AdapterRegistryEntry` 需要扩展。
- `shared/adapters/registry.ts` — adapter registry 单一发现入口；后续新增字段应从这里驱动 popup/SW/pipeline。
- `shared/storage/repos/dispatch.ts` — `DispatchRecord.platform_id` 当前是 `string`，Phase 8 要改为 branded `PlatformId`。
- `entrypoints/background.ts` — 当前 Discord 专用 `DISCORD_MAIN_WORLD_PASTE_PORT`、`discordMainWorldPaste()` 与硬编码 SPA filter 所在位置。
- `entrypoints/discord.content.ts` — 当前 Discord content script 通过 port 请求 SW 执行 MAIN world paste。
- `background/dispatch-pipeline.ts` — dispatch state machine、adapter injection、login remap、`ADAPTER_RESPONSE_TIMEOUT_MS`；Phase 8 不能引入平台硬编码。
- `shared/messaging/result.ts` — 当前 `ErrorCode` 单一 union；Phase 8 要重组 namespace/聚合模型。
- `scripts/verify-manifest.ts` — manifest 权限断言；架构泛化不得引入 `<all_urls>` 静态 host permission。

### 保护性测试

- `tests/unit/dispatch/platform-detector.spec.ts` — registry 顺序、`mock`/Discord detection、match purity。
- `tests/unit/dispatch/discordMainWorldPaste.spec.ts` — MAIN world paste 行为 mirror；改 bridge 时必须保持回归保护。
- `tests/unit/dispatch/login-detection.spec.ts` — Discord login redirect / INPUT_NOT_FOUND remap 行为。
- `tests/unit/messaging/errorCode.spec.ts` — ErrorCode compile-time + runtime smoke tests；Phase 8 要更新为 namespace/registry 聚合覆盖。

### 外部技术参考

- TypeScript Handbook — Type Compatibility: https://www.typescriptlang.org/docs/handbook/type-compatibility
- TypeScript Playground — Nominal Typing example: https://www.typescriptlang.org/play/typescript/language-extensions/nominal-typing.ts.html
- Chrome Extensions — Content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome Extensions — `chrome.scripting`: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Chrome Extensions — Message passing: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- Chrome Extensions — `chrome.webNavigation`: https://developer.chrome.com/docs/extensions/reference/api/webNavigation
- Chrome Extensions — `events.UrlFilter`: https://developer.chrome.com/docs/extensions/reference/api/events
- TypeScript Handbook — Narrowing / discriminated unions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript Handbook — Unions and intersections: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `shared/adapters/registry.ts` — 已是 popup + SW 共用的平台发现入口，可扩展为架构 metadata source。
- `shared/adapters/types.ts` — `IMAdapter` / `AdapterRegistryEntry` 类型位置适合承载 branded `PlatformId` 与 registry entry 新字段。
- `background/dispatch-pipeline.ts` — 已通过 `findAdapter()` 注入 adapter script；目标是继续让 pipeline 只依赖 registry，不认识具体平台。
- `entrypoints/background.ts` — 当前硬编码点清晰：Discord port、MAIN injector、SPA filter；Phase 8 的主要迁移目标。
- `entrypoints/discord.content.ts` — 可作为第一个 per-adapter MAIN bridge consumer 的参考实现。
- `shared/messaging/result.ts` — ErrorCode 类型和 `Err()` helper 可保留 API 形态，只重组 code 定义来源。
- `shared/storage/repos/dispatch.ts` — session record per-key 写入模式不变，只调整 `platform_id` 类型。

### Established Patterns

- Registry match 函数必须保持 pure、无 `chrome.*`，因为 popup 和 SW 都会 import。
- Content script runtime 注入采用 `defineContentScript({ matches: [], registration: 'runtime' })` + one-shot `ADAPTER_DISPATCH` listener。
- SW listener 必须在 `defineBackground` 顶层同步注册；SPA listener builder 也要满足此约束。
- 对 Slate/Lexical 编辑器只使用 synthetic `ClipboardEvent` / `DataTransfer` 路径，不直接写 DOM text。
- public platform host 可放静态 `host_permissions`，OpenClaw/自部署 origin 走 optional permission + runtime request。

### Integration Points

- `shared/adapters/types.ts` / `registry.ts` — 新增 branded id helper、registry entry 字段、error code declarations。
- `entrypoints/background.ts` — 用 registry 驱动 MAIN bridge port routing 和 SPA listener filter，删除 Discord 专用常量/函数硬编码。
- `entrypoints/discord.content.ts` — 改用统一 port prefix + `{ text }` payload，Discord injector 迁入 registry 可引用位置。
- `background/dispatch-pipeline.ts` — 新增/复用专用 SPA handler 所需的状态推进 helper；不能新增平台 if/switch。
- `tests/unit/dispatch/*` — 更新现有 tests，并新增 registry-driven MAIN bridge / SPA filter / ErrorCode aggregation 单元测试。

</code_context>

<specifics>
## Specific Ideas

- MAIN bridge port 格式锁定为 `WEB2CHAT_MAIN_WORLD:<platformId>`。
- SPA opt-in 字段语义锁定为“精确 hosts”，例如 `spaNavigationHosts: ['discord.com']`。
- ErrorCode 字符串保持现有通用码稳定，不做 `COMMON_*` 大迁移；namespace 主要体现在类型组织和 registry 聚合。
- `mock` 保持 registry 平台，不能因 branded PlatformId 改造破坏现有 fixture/test 流程。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 8-架构泛化*
*Context gathered: 2026-05-09T14:54:24.969Z*
