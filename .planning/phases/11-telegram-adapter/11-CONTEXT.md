# Phase 11: Telegram 适配器 - Context

**Gathered:** 2026-05-16T10:00:00+08:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 交付完整的 Telegram Web K 投递链路：用户在 popup 输入 Telegram Web K URL 后，扩展自动识别为 Telegram 平台，打开/激活目标 tab，通过 DOM 注入将格式化网页信息投递到 Telegram 会话。

本 phase 范围包含：

1. Telegram Web K URL 匹配：`https://web.telegram.org/a/`，注册表条目含 `hostMatches: ['https://web.telegram.org/*']`。
2. Telegram 登录墙检测：URL 层（`loggedOutPathPatterns`）+ DOM 层分层防护（具体标记由 researcher 调研）。
3. Telegram Web K contenteditable 编辑器 DOM 注入：ClipboardEvent paste 或 property-descriptor setter（由 researcher 调研后决定）。
4. Telegram 消息发送确认：由 researcher 调研后决定（MutationObserver vs 编辑器清空）。
5. Telegram 消息格式化：新建 `telegram-format.ts`，格式化程度由 researcher 在实际 Telegram Web K 上测试后决定。
6. 消息截断：4096 字符硬限制，metadata 优先 + 正文截断 + 标记。
7. Telegram 平台图标 + `platform_icon_telegram` i18n key（en + zh_CN 100% 覆盖）。
8. Telegram ToS 警告：复用 Discord/Slack ToS 模式。
9. 静态 `host_permissions` 新增 `https://web.telegram.org/*`。
10. SPA 处理：`spaNavigationHosts: ['web.telegram.org']`。

本 phase 不包含：

- Telegram Web Z (`/z/`) 或根路径 (`/`) 投递 — v1 仅 Web K (`/a/`)。
- Phase 12 的飞书/Lark 适配器。
- Bot API / Telegram Bot API 发送。
- 放宽 manifest 权限模型；`<all_urls>` 仍只允许出现在 `optional_host_permissions` 中。

**Dependency note:** Phase 11 depends on Phase 9 (投递鲁棒性) — registry timeout、loggedOutPathPatterns、selector confidence、retriable-driven retry 均已落地。Phase 10 (Slack) 作为最近完成的适配器参考。

</domain>

<decisions>
## Implementation Decisions

### 消息格式化

- **D-140:** 新建 `shared/adapters/telegram-format.ts`，实现 Telegram 专用格式化。与 `discord-format.ts` / `slack-format.ts` 对称。
- **D-141:** 格式化程度（纯文本 vs Telegram Markdown 格式保留）由 researcher 在实际 Telegram Web K 编辑器上测试 paste 行为后决定。如果 paste 处理器能保留格式，则实现 Telegram Markdown 转换；否则发纯文本。
- **D-142:** 字段排列与 Discord/Slack 保持相同结构和顺序：prompt → title → url → description → timestamp → content。只替换 markdown 语法。

### 消息截断

- **D-143:** Telegram 单条消息 4096 字符硬限制，截断策略为 metadata 优先：先保留 prompt + title + url + description + timestamp，剩余空间给 content，最后追加 `...[truncated]` 标记。
- **D-144:** 截断发生在格式化之后（先转换 markdown，再在最终文本上截断），确保截断位置不会破坏格式标记。
- **D-145:** 如果 metadata 本身就超过 4096 字符（极端情况），content 完全省略，metadata 按上述优先级保留到 4096 字符处截断。

### ToS / 安全声明

- **D-146:** Telegram 复用 Discord/Slack 的 ToS 警告模式。新增 `telegram_tos_warning` 和 `telegram_tos_details` i18n key（en + zh_CN），popup 在 Telegram 平台选中时显示类似的 DOM 注入风险提示。

### URL 匹配范围

- **D-147:** v1 仅匹配 Telegram Web K URL：`https://web.telegram.org/a/`。match 函数验证 pathname 以 `/a/` 开头。
- **D-148:** Telegram Web Z (`/z/`) 和根路径 (`/`) 不在 v1 范围。未来扩展时只需调整 match 函数的路径验证逻辑。
- **D-149:** `hostMatches` 为 `['https://web.telegram.org/*']`，加入静态 `host_permissions`（Telegram 是已知公共域名，符合 CLAUDE.md 权限约束）。

### 编辑器注入 + 发送确认

- **D-150:** Telegram Web K 编辑器注入方式由 researcher 调研后决定。可能选项：MAIN world ClipboardEvent paste（与 Slack 相同）或 ISOLATED world property-descriptor setter（与 OpenClaw 相同）。
- **D-151:** 消息发送确认策略由 researcher 调研 Telegram Web K 发送后 DOM 行为后决定。可能选项：MutationObserver 等待新消息节点或编辑器清空确认。
- **D-152:** Telegram 登录检测策略由 researcher 调研后决定。可能选项：URL 路径检测（`loggedOutPathPatterns`）+ DOM probe 分层防护。
- **D-153:** Telegram 编辑器选择器策略采用 ARIA-first 三层 fallback（与 Discord/Slack 模式一致）。具体选择器由 researcher 在实际 Telegram DOM 上验证后确定。

### Claude's Discretion

- `telegram-format.ts` 的具体格式化语法映射由 researcher 调研 Telegram Web K paste 行为后决定，只要保持 D-142 的字段排列。
- Telegram MAIN world injector 的具体实现（选择器、pre-paste cleanup、post-send cleanup）交给 planner，参考 `slack-main-world.ts` 或 `discord-main-world.ts` 模式。
- `telegram-login-detect.ts` 的具体 DOM 标记和检测逻辑交给 researcher + planner。
- ToS 警告文案的具体措辞交给 planner，参考 Discord 的 `discord_tos_warning` / `discord_tos_details`。
- 4096 字符截断的具体实现细节（截断标记 i18n key、截断位置是否避免断 UTF-8 等）交给 planner。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目与需求上下文

- `CLAUDE.md` — 项目约束：GSD 工作流、MV3 service worker discipline、adapter 模式、DOM 注入禁止 `innerText=` / `textContent=`、权限模型。
- `.planning/PROJECT.md` — Core Value、v1.1 目标、本地优先/隐私/权限约束、Key Decisions。
- `.planning/REQUIREMENTS.md` §Telegram Adapter — TG-01..TG-05 是 Phase 11 的锁定需求。
- `.planning/ROADMAP.md` §"Phase 11: Telegram 适配器" — Phase goal 与 4 条 success criteria。
- `.planning/STATE.md` §Accumulated Context — v1.1 前置决策与 Phase 8/9/10 已落地能力。

### 先前 Phase 决策

- `.planning/phases/08-architecture-generalization/08-CONTEXT.md` — D-95..D-110：PlatformId、MAIN world bridge、SPA filter、ErrorCode namespace 决策；Phase 11 必须建立在这些契约上。
- `.planning/phases/09-dispatch-robustness/09-CONTEXT.md` — D-111..D-127：timeout、loggedOutPathPatterns、retriable retry、selector confidence 决策。
- `.planning/phases/10-slack-adapter/10-CONTEXT.md` — D-128..D-139：Slack per-platform format、MAIN world paste、发送确认、登录检测、selector 策略；Phase 11 应遵循相同的结构和模式。

### 当前代码直接触点

- `shared/adapters/types.ts` — `AdapterRegistryEntry` 承载 `PlatformId`、`mainWorldInjector`、`spaNavigationHosts`、`loggedOutPathPatterns`、`dispatchTimeoutMs` 等；Phase 11 新增 Telegram registry entry。
- `shared/adapters/registry.ts` — adapter registry 单一发现入口；Phase 11 追加 `defineAdapter({ id: 'telegram', ... })`。
- `background/main-world-registry.ts` — SW-only MAIN world injector registry；Phase 11 追加 `['telegram', telegramMainWorldPaste]`。
- `background/injectors/slack-main-world.ts` — Slack MAIN world paste 实现参考；Telegram 版本应遵循相同模式。
- `entrypoints/slack.content.ts` — Slack adapter content script 完整实现参考（选择器、登录检测、waitForReady、handleDispatch、发送确认）。
- `shared/adapters/slack-format.ts` — Slack 消息格式化参考（composeSlackMrkdwn、escapeSlackMentions、truncation）；Telegram 版本应结构对称。
- `shared/adapters/slack-login-detect.ts` — Slack DOM 层登录检测参考；Telegram 可能需要类似模块。
- `shared/adapters/dispatch-policy.ts` — `resolveAdapterTimeouts()`、`isLoggedOutUrlForAdapter()`、`withAdapterResponseTimeout()` 等 pipeline 共享工具。
- `background/dispatch-pipeline.ts` — dispatch state machine；Phase 11 不应需要修改（registry-driven）。
- `entrypoints/background.ts` — SW 入口；Phase 11 不应需要修改（registry-driven）。
- `wxt.config.ts` — manifest 配置；Phase 11 需要在 `host_permissions` 中追加 `'https://web.telegram.org/*'`。
- `locales/en.yml` — 英文 locale；Phase 11 追加 `platform_icon_telegram`、`telegram_tos_warning`、`telegram_tos_details`、`telegram_timestamp_label` 等 key。
- `locales/zh_CN.yml` — 中文 locale；同上。
- `scripts/verify-manifest.ts` — manifest 权限断言；Phase 11 新增的 `https://web.telegram.org/*` 需被验证覆盖。

### 保护性测试

- `tests/unit/dispatch/platform-detector.spec.ts` — registry 顺序、match purity 回归测试；新增 Telegram entry 应通过。
- `tests/unit/dispatch/timeout-config.spec.ts` — registry-driven timeout 断言；新增 Telegram entry 应继承默认值。
- `tests/unit/dispatch/logged-out-paths.spec.ts` — `loggedOutPathPatterns` helper 测试；Telegram 的 patterns 应被覆盖。
- `tests/unit/dispatch/spaFilter.spec.ts` — `buildSpaUrlFilters` 测试；Telegram `spaNavigationHosts: ['web.telegram.org']` 应被覆盖。
- `tests/unit/dispatch/mainWorldBridge.spec.ts` — MAIN world bridge port routing 测试；Telegram port 应被覆盖。
- `tests/unit/adapters/slack-selector.spec.ts` — Slack 三层 selector fixture 测试参考；Telegram 需要类似的 fixture + 测试。

### 外部技术参考

- Telegram — Markdown formatting: https://core.telegram.org/bots/api#markdown-style — Telegram Markdown 语法参考（Bot API 文档中的格式说明）。
- Chrome Extensions — `chrome.scripting`: https://developer.chrome.com/docs/extensions/reference/api/scripting — content script 注入 API。
- Chrome Extensions — Content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts — ISOLATED vs MAIN world。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `shared/adapters/registry.ts` — 已是 registry-driven 平台发现入口；追加 Telegram entry 后 popup + SW 自动发现。
- `shared/adapters/types.ts` — `defineAdapter()` helper 和 `AdapterRegistryEntry` 类型；Phase 11 新增 Telegram entry 无需改类型。
- `background/main-world-registry.ts` — SW-only MAIN world injector 手动 map；追加 Telegram injector 后 bridge 自动路由。
- `background/injectors/slack-main-world.ts` — Slack MAIN world paste 实现模板；Telegram 版本可直接参考结构。
- `shared/adapters/slack-format.ts` — Slack 消息格式化模板；Telegram `telegram-format.ts` 应结构对称（pure function + Snapshot interface + compose + escape + truncation）。
- `shared/adapters/dispatch-policy.ts` — `resolveAdapterTimeouts()` 和 `isLoggedOutUrlForAdapter()` 等 pipeline 工具；Telegram entry 自动继承默认行为。
- `entrypoints/slack.content.ts` — 完整的 adapter content script 模板：选择器三层 fallback、waitForReady 竞速、handleDispatch 状态机、发送确认、rate limit。

### Established Patterns

- Registry match 函数必须保持 pure、无 `chrome.*`（popup 和 SW 都 import）。
- Content script 使用 `defineContentScript({ matches: [], registration: 'runtime' })` + one-shot `ADAPTER_DISPATCH` listener + injection guard flag。
- MAIN world 注入通过 port 连接 SW（`WEB2CHAT_MAIN_WORLD:<platformId>`），SW 执行 `chrome.scripting.executeScript({ world: 'MAIN' })`。
- 登录检测采用 URL 层（`loggedOutPathPatterns`）+ DOM 层（`*-login-detect.ts`）分层防护。
- 编辑器选择器采用 ARIA-first 三层 fallback + 低置信度 warning（tier3 class fragment）。
- 消息格式化为 pure function（无 chrome.* / WXT import），可被 content script 和单元测试共用。
- 所有 UI 字符串走 i18n `t()`；新平台需要 en + zh_CN 100% key 覆盖。
- 新平台 host 域名加静态 `host_permissions`（已知公共域名）而非 optional。

### Integration Points

- `shared/adapters/registry.ts` — 追加 `defineAdapter({ id: 'telegram', ... })` 条目。
- `background/main-world-registry.ts` — 追加 `['telegram', telegramMainWorldPaste]` 到 injectors map。
- `background/injectors/telegram-main-world.ts` — 新文件，Telegram MAIN world paste 实现。
- `entrypoints/telegram.content.ts` — 新文件，Telegram adapter content script。
- `shared/adapters/telegram-format.ts` — 新文件，Telegram 消息格式化 + 截断。
- `shared/adapters/telegram-login-detect.ts` — 新文件（如果 DOM 层登录检测需要）。
- `wxt.config.ts` — `host_permissions` 追加 `'https://web.telegram.org/*'`。
- `locales/en.yml` + `locales/zh_CN.yml` — 追加 Telegram 平台 icon tooltip、ToS 警告、timestamp label 等 key。
- `scripts/verify-manifest.ts` — 确保新增 host_permissions 被验证覆盖。
- `tests/unit/adapters/` — Telegram adapter fixture HTML + selector 测试、format 测试、login-detect 测试。

</code_context>

<specifics>
## Specific Ideas

- Telegram 4096 字符限制比 Slack 严格 10 倍，必须实现截断（与 Slack 不同）。
- 截断策略为 metadata 优先：先保留 prompt + title + url + description + timestamp，剩余空间给 content。
- Telegram Web K 是 Telegram 官方开发的 Web 客户端（路径 `/a/`），与第三方开发的 Web Z（路径 `/z/`，Svelte 框架）是不同的应用。
- Telegram format 模块应与 `slack-format.ts` 结构对称：`composeTelegramMessage()` + 可选 markdown 转换 + 截断逻辑。
- Telegram channel ID 提取和安全校验参考 Slack 的 `extractChannelId()` 模式。

</specifics>

<deferred>
## Deferred Ideas

- **Telegram Web Z 投递** — `/z/` 路径的 Svelte 版本不在 v1 范围，未来扩展时调整 match 函数即可。
- **Telegram 根路径投递** — `web.telegram.org/` 根路径路由行为复杂（可能重定向到 `/a/` 或 `/z/`），推后。
- **Telegram 消息分割** — 超长内容分割为多条消息发送，属于未来优化。

</deferred>

---

*Phase: 11-Telegram 适配器*
*Context gathered: 2026-05-16T10:00:00+08:00*
