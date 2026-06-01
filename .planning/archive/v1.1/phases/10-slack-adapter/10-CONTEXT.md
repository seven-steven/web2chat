# Phase 10: Slack 适配器 - Context

**Gathered:** 2026-05-11T15:50:00+08:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 交付完整的 Slack 投递链路：用户在 popup 输入 Slack channel URL 后，扩展自动识别为 Slack 平台，打开/激活目标 tab，通过 MAIN world ClipboardEvent paste 注入 Slack Quill 编辑器并发送格式化网页信息。

本 phase 范围包含：

1. Slack URL 匹配：`https://app.slack.com/client/<workspace>/<channel>`，精确 4 段路径匹配。
2. Slack 登录墙检测：URL 层 + DOM 层分层防护（具体路径和 DOM 标记由 researcher 调研）。
3. Slack Quill 编辑器 DOM 注入：MAIN world ClipboardEvent paste（复用 Phase 8 bridge 模式）。
4. Slack 消息发送确认：具体策略由 researcher 调研后决定（编辑器清空 vs MutationObserver）。
5. Slack 消息格式化：专用 `slack-format.ts`，mrkdwn 语法，mention escape，无 truncation。
6. Slack 平台图标 + `platform_icon_slack` i18n key（en + zh_CN 100% 覆盖）。
7. Slack ToS 警告：复用 Discord ToS 模式。
8. 静态 `host_permissions` 新增 `https://app.slack.com/*`。
9. SPA 处理：`spaNavigationHosts: ['app.slack.com']`。

本 phase 不包含：

- DM / thread view 投递（v1 仅 channel）。
- Phase 11/12 的 Telegram / 飞书-Lark 适配器。
- Bot API / Webhook / server-to-server 发送。
- 放宽 manifest 权限模型；`<all_urls>` 仍只允许出现在 `optional_host_permissions` 中。

**Dependency note:** Phase 10 depends on Phase 9 (投递鲁棒性) — registry timeout、loggedOutPathPatterns、selector confidence、retriable-driven retry 均已落地。

</domain>

<decisions>
## Implementation Decisions

### 消息格式化

- **D-128:** 新建 `shared/adapters/slack-format.ts`，实现 Slack mrkdwn 专用格式化。与 `discord-format.ts` 对称，但不共享实现（mrkdwn 语法差异大：bold 用 `*`、无 blockquote、link 格式不同）。
- **D-129:** 不做字符 truncation。Slack 单条消息限制 40,000 字符，远超实际网页内容长度。`slack-format.ts` 的 `composeSlackMrkdwn()` 不需要 truncation 逻辑。
- **D-130:** 实现 `escapeSlackMentions()`，escape `<!everyone>` / `<!here>` / `<@U123>` / `<@W123>` / `<#C123>` 等 Slack mention 格式，防止意外触发通知。与 Discord 的 `escapeMentions()` 对称。
- **D-131:** 字段排列与 Discord 保持相同结构和顺序：prompt → *title* → url → description → timestamp → content。只替换 markdown 语法（`**` → `*`，`>` blockquote → `_italic_` 或其他 mrkdwn 等价形式）。

### ToS / 安全声明

- **D-132:** Slack 复用 Discord 的 ToS 警告模式。新增 `slack_tos_warning` 和 `slack_tos_details` i18n key（en + zh_CN），popup 在 Slack 平台选中时显示类似的 DOM 注入风险提示。

### URL 匹配范围

- **D-133:** v1 仅匹配 Slack channel URL：`https://app.slack.com/client/<workspace>/<channel>`。精确 4 段路径匹配（pathname split 后至少 4 段，parts[3] 非空）。
- **D-134:** DM（`/client/<ws>/<dm_id>`）和 thread view 不在 v1 范围。未来扩展时只需调整 match 函数的路径验证逻辑。
- **D-135:** `hostMatches` 为 `['https://app.slack.com/*']`，加入静态 `host_permissions`（Slack 是已知公共域名，符合 CLAUDE.md 权限约束）。

### 编辑器注入 + 发送确认

- **D-136:** Slack Quill 编辑器使用 MAIN world ClipboardEvent paste 注入，复用 Phase 8 的 MAIN world bridge 模式。新增 `background/injectors/slack-main-world.ts` 并注册到 `main-world-registry.ts`。
- **D-137:** 消息发送确认策略由 researcher 调研 Slack Quill 发送后 DOM 行为后决定。可能选项：编辑器清空确认（Discord 模式）或 MutationObserver 等待新消息节点。
- **D-138:** Slack 登录检测策略由 researcher 调研后决定。可能选项：URL 路径检测（`loggedOutPathPatterns`）+ DOM probe 分层防护（Discord 模式），或仅 URL 层检测。
- **D-139:** Slack 编辑器选择器策略采用 ARIA-first 三层 fallback（与 Discord 模式一致）。具体选择器由 researcher 在实际 Slack DOM 上验证后确定。

### Claude's Discretion

- `slack-format.ts` 的具体 mrkdwn 语法映射（blockquote 等价形式、link 格式、code block 处理）交给 planner，只要保持 D-131 的字段排列。
- `escapeSlackMentions()` 的具体 escape 手法（零宽空格 vs HTML entity vs 移除触发字符）交给 planner，参考 `discord-format.ts` 的 `escapeMentions()` 模式。
- Slack MAIN world injector 的具体实现（选择器、pre-paste cleanup、post-Enter cleanup）交给 planner，参考 `discord-main-world.ts` 模式。
- `slack-login-detect.ts` 的具体 DOM 标记和检测逻辑交给 researcher + planner。
- ToS 警告文案的具体措辞交给 planner，参考 Discord 的 `discord_tos_warning` / `discord_tos_details`。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目与需求上下文

- `CLAUDE.md` — 项目约束：GSD 工作流、MV3 service worker discipline、adapter 模式、DOM 注入禁止 `innerText=` / `textContent=`、权限模型。
- `.planning/PROJECT.md` — Core Value、v1.1 目标、本地优先/隐私/权限约束、Key Decisions。
- `.planning/REQUIREMENTS.md` §Slack Adapter — SLK-01..SLK-05 是 Phase 10 的锁定需求。
- `.planning/ROADMAP.md` §"Phase 10: Slack 适配器" — Phase goal 与 4 条 success criteria。
- `.planning/STATE.md` §Accumulated Context — v1.1 前置决策与 Phase 8/9 已落地能力。
- `.planning/phases/08-architecture-generalization/08-CONTEXT.md` — D-95..D-110：PlatformId、MAIN world bridge、SPA filter、ErrorCode namespace 决策；Phase 10 必须建立在这些契约上。
- `.planning/phases/09-dispatch-robustness/09-CONTEXT.md` — D-111..D-127：timeout、loggedOutPathPatterns、retriable retry、selector confidence 决策。

### 当前代码直接触点

- `shared/adapters/types.ts` — `AdapterRegistryEntry` 承载 `PlatformId`、`mainWorldInjector`、`spaNavigationHosts`、`loggedOutPathPatterns`、`dispatchTimeoutMs` 等；Phase 10 新增 Slack registry entry。
- `shared/adapters/registry.ts` — adapter registry 单一发现入口；Phase 10 追加 `defineAdapter({ id: 'slack', ... })`。
- `background/main-world-registry.ts` — SW-only MAIN world injector registry；Phase 10 追加 `['slack', slackMainWorldPaste]`。
- `background/injectors/discord-main-world.ts` — Discord MAIN world paste 实现参考；Slack 版本应遵循相同模式。
- `entrypoints/discord.content.ts` — Discord adapter content script 完整实现参考（选择器、登录检测、waitForReady、handleDispatch、发送确认）。
- `shared/adapters/discord-format.ts` — Discord 消息格式化参考（composeDiscordMarkdown、escapeMentions、truncation）；Slack 版本应结构对称。
- `shared/adapters/discord-login-detect.ts` — Discord DOM 层登录检测参考；Slack 可能需要类似模块。
- `shared/adapters/dispatch-policy.ts` — `resolveAdapterTimeouts()`、`isLoggedOutUrlForAdapter()`、`withAdapterResponseTimeout()` 等 pipeline 共享工具。
- `background/dispatch-pipeline.ts` — dispatch state machine；Phase 10 不应需要修改（registry-driven）。
- `entrypoints/background.ts` — SW 入口；Phase 10 不应需要修改（registry-driven）。
- `wxt.config.ts` — manifest 配置；Phase 10 需要在 `host_permissions` 中追加 `'https://app.slack.com/*'`。
- `locales/en.yml` — 英文 locale；Phase 10 追加 `platform_icon_slack`、`slack_tos_warning`、`slack_tos_details` 等 key。
- `locales/zh_CN.yml` — 中文 locale；同上。
- `scripts/verify-manifest.ts` — manifest 权限断言；Phase 10 新增的 `https://app.slack.com/*` 需被验证覆盖。

### 保护性测试

- `tests/unit/dispatch/platform-detector.spec.ts` — registry 顺序、match purity 回归测试；新增 Slack entry 应通过。
- `tests/unit/dispatch/timeout-config.spec.ts` — registry-driven timeout 断言；新增 Slack entry 应继承默认值。
- `tests/unit/dispatch/logged-out-paths.spec.ts` — `loggedOutPathPatterns` helper 测试；Slack 的 patterns 应被覆盖。
- `tests/unit/dispatch/spaFilter.spec.ts` — `buildSpaUrlFilters` 测试；Slack `spaNavigationHosts: ['app.slack.com']` 应被覆盖。
- `tests/unit/dispatch/mainWorldBridge.spec.ts` — MAIN world bridge port routing 测试；Slack port 应被覆盖。
- `tests/unit/adapters/discord-selector.spec.ts` — Discord 三层 selector fixture 测试参考；Slack 需要类似的 fixture + 测试。

### 外部技术参考

- Slack — mrkdwn formatting: https://api.slack.com/reference/surfaces/formatting — Slack 消息格式化语法参考。
- Chrome Extensions — Extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle — MV3 SW idle/request timeout。
- Chrome Extensions — `chrome.scripting`: https://developer.chrome.com/docs/extensions/reference/api/scripting — content script 注入 API。
- Chrome Extensions — Content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts — ISOLATED vs MAIN world。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `shared/adapters/registry.ts` — 已是 registry-driven 平台发现入口；追加 Slack entry 后 popup + SW 自动发现。
- `shared/adapters/types.ts` — `defineAdapter()` helper 和 `AdapterRegistryEntry` 类型；Phase 10 新增 Slack entry 无需改类型。
- `background/main-world-registry.ts` — SW-only MAIN world injector 手动 map；追加 Slack injector 后 bridge 自动路由。
- `background/injectors/discord-main-world.ts` — Discord MAIN world paste 实现模板；Slack 版本可直接参考结构。
- `shared/adapters/discord-format.ts` — Discord 消息格式化模板；Slack `slack-format.ts` 应结构对称（pure function + Snapshot interface + compose + escape）。
- `shared/adapters/dispatch-policy.ts` — `resolveAdapterTimeouts()` 和 `isLoggedOutUrlForAdapter()` 等 pipeline 工具；Slack entry 自动继承默认行为。

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

- `shared/adapters/registry.ts` — 追加 `defineAdapter({ id: 'slack', ... })` 条目。
- `background/main-world-registry.ts` — 追加 `['slack', slackMainWorldPaste]` 到 injectors map。
- `background/injectors/slack-main-world.ts` — 新文件，Slack MAIN world paste 实现。
- `entrypoints/slack.content.ts` — 新文件，Slack adapter content script。
- `shared/adapters/slack-format.ts` — 新文件，Slack mrkdwn 格式化。
- `shared/adapters/slack-login-detect.ts` — 新文件（如果 DOM 层登录检测需要）。
- `wxt.config.ts` — `host_permissions` 追加 `'https://app.slack.com/*'`。
- `locales/en.yml` + `locales/zh_CN.yml` — 追加 Slack 平台 icon tooltip、ToS 警告等 key。
- `scripts/verify-manifest.ts` — 确保新增 host_permissions 被验证覆盖。
- `tests/unit/adapters/` — Slack adapter fixture HTML + selector 测试、format 测试、login-detect 测试。

</code_context>

<specifics>
## Specific Ideas

- Slack mrkdwn 格式化字段排列与 Discord 完全一致，只替换语法（`**bold**` → `*bold*`，`> quote` → `_text_` 或等效）。
- Slack 40K 字符限制远超实际网页内容，不需要 truncation 逻辑。
- Slack ToS 警告复用 Discord 模式，popup 显示类似的 DOM 注入风险提示。
- Slack Quill 编辑器注入策略：MAIN world ClipboardEvent paste（与 Discord Slate 相同的技术原因）。
- Slack channel ID 提取和安全校验参考 Discord 的 `extractChannelId()` 模式。

</specifics>

<deferred>
## Deferred Ideas

- **DM 投递** — Slack DM URL（`/client/<ws>/<dm_id>`）不在 v1 范围，未来扩展时调整 match 函数即可。
- **Thread view 投递** — Slack thread 打开时 URL 行为复杂，推后。
- **Slack Block Kit 格式化** — 使用 Slack Block Kit API 做更丰富的消息布局，属于未来优化。

</deferred>

---

*Phase: 10-Slack 适配器*
*Context gathered: 2026-05-11T15:50:00+08:00*
