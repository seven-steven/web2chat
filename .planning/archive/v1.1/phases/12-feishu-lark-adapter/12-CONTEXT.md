# Phase 12: 飞书/Lark 适配器 - Context

**Gathered:** 2026-05-16T16:00:00+08:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 交付完整的飞书/Lark 投递链路：用户在 popup 输入 feishu.cn 或 larksuite.com URL 后，扩展自动识别为飞书平台，打开/激活目标 tab，通过 DOM 注入将格式化网页信息投递到飞书/Lark 会话。

这是 v1.1 的第一个**双域名单适配器**场景：feishu.cn（国内版）和 larksuite.com（国际版）共用一个 registry entry（platformId `feishu`），统一处理。

本 phase 范围包含：

1. 飞书/Lark 双域名匹配：feishu.cn + larksuite.com，match 函数同时匹配两个域名。
2. 飞书/Lark 登录墙检测：URL 层（`loggedOutPathPatterns`）+ DOM 层分层防护（具体标记由 researcher 调研）。
3. 飞书/Lark contenteditable 编辑器 DOM 注入：ClipboardEvent paste 或 property-descriptor setter（由 researcher 调研后决定）。
4. 飞书/Lark 消息发送确认：由 researcher 调研后决定（MutationObserver vs 编辑器清空）。
5. 飞书/Lark 消息格式化：新建 `feishu-format.ts`，格式化程度和截断策略由 researcher 在实际飞书 Web 上测试后决定。
6. 飞书/Lark 平台图标 + `platform_icon_feishu` i18n key（en + zh_CN 100% 覆盖）。
7. 飞书/Lark ToS 警告：复用 Discord/Slack/Telegram ToS 模式。
8. 静态 `host_permissions` 新增 `https://*.feishu.cn/*` + `https://*.larksuite.com/*`（通配子域名）。
9. SPA 处理：`spaNavigationHosts` 包含两个域名。

本 phase 不包含：

- 飞书/Lark API / Bot / Webhook 发送。
- 放宽 manifest 权限模型；`<all_urls>` 仍只允许出现在 `optional_host_permissions` 中。
- Phase 10/11 的 Slack / Telegram 适配器改动。

**Dependency note:** Phase 12 depends on Phase 9 (投递鲁棒性) — registry timeout、loggedOutPathPatterns、selector confidence、retriable-driven retry 均已落地。Phase 10 (Slack) 和 Phase 11 (Telegram) 作为最近完成的适配器参考。

</domain>

<decisions>
## Implementation Decisions

### 品牌与图标策略

- **D-154:** 平台名称按域名区分品牌。zh_CN 显示"飞书"，en 显示"Lark"。反映飞书官方品牌策略：国内飞书、海外 Lark。i18n key `platform_icon_feishu` 在两个 locale 中分别使用对应名称。
- **D-155:** 平台图标使用飞书蓝色 logo（与 platformId `feishu` 一致）。飞书和 Lark 共享同一个品牌符号（小鸟），使用蓝色飞书版本。

### host_permissions 双域名

- **D-156:** feishu.cn 和 larksuite.com 都加入静态 host_permissions，与 Discord/Slack/Telegram 模式完全一致。不使用 optional_host_permissions 动态授权。
- **D-157:** 使用通配子域名模式：`https://*.feishu.cn/*` + `https://*.larksuite.com/*`。覆盖所有子域名，确保无论飞书/Lark Web 聊天在裸域名还是子域名上（如 `im.feishu.cn`、`web.larksuite.com`）权限都充足。具体 URL 结构由 researcher 验证后确定精确的 match 函数路径条件。

### 消息格式化与截断

- **D-158:** 新建 `shared/adapters/feishu-format.ts`，实现飞书专用格式化。字段排列与 Discord/Slack/Telegram 保持相同结构和顺序：prompt → title → url → description → timestamp → content，只替换 markdown 语法。
- **D-159:** 格式化程度（纯文本 vs 飞书 Markdown 格式保留）和截断策略（类似 Telegram 4096 限制 vs 类似 Slack 无截断）由 researcher 在实际飞书 Web 编辑器上测试 paste 行为和消息长度限制后决定。

### ToS / 安全声明

- **D-160:** 飞书/Lark 复用 Discord/Slack/Telegram 的 ToS 警告模式。新增 `feishu_tos_warning` 和 `feishu_tos_details` i18n key（en + zh_CN），popup 在飞书平台选中时显示类似的 DOM 注入风险提示。

### 编辑器注入 + 发送确认

- **D-161:** 飞书/Lark 编辑器注入方式由 researcher 调研后决定。可能选项：MAIN world ClipboardEvent paste（与 Slack/Discord 相同）或 ISOLATED world property-descriptor setter（与 OpenClaw 相同）。
- **D-162:** 消息发送确认策略由 researcher 调研飞书/Lark 发送后 DOM 行为后决定。可能选项：MutationObserver 等待新消息节点或编辑器清空确认。
- **D-163:** 飞书/Lark 登录检测策略由 researcher 调研后决定。可能选项：URL 路径检测（`loggedOutPathPatterns`）+ DOM probe 分层防护。
- **D-164:** 飞书/Lark 编辑器选择器策略采用 ARIA-first 三层 fallback（与 Discord/Slack/Telegram 模式一致）。具体选择器由 researcher 在实际飞书 DOM 上验证后确定。

### Claude's Discretion

- `feishu-format.ts` 的具体格式化语法映射由 researcher 调研飞书 Web 编辑器 paste 行为后决定，只要保持 D-158 的字段排列。
- 飞书/Lark MAIN world injector 的具体实现（选择器、pre-paste cleanup、post-send cleanup）交给 planner，参考 `slack-main-world.ts` 或 `telegram-main-world.ts` 模式。
- `feishu-login-detect.ts` 的具体 DOM 标记和检测逻辑交给 researcher + planner。
- ToS 警告文案的具体措辞交给 planner，参考 Discord 的 `discord_tos_warning` / `discord_tos_details`。
- `hostMatches` 条目的精确 glob 模式由 researcher 验证实际飞书 Web 聊天 URL 后确定。
- `spaNavigationHosts` 的精确 hostname 列表由 researcher 验证后确定。
- `loggedOutPathPatterns` 的具体路径由 researcher 验证后确定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目与需求上下文

- `CLAUDE.md` — 项目约束：GSD 工作流、MV3 service worker discipline、adapter 模式、DOM 注入禁止 `innerText=` / `textContent=`、权限模型。
- `.planning/PROJECT.md` — Core Value、v1.1 目标、本地优先/隐私/权限约束、Key Decisions。
- `.planning/REQUIREMENTS.md` §Feishu/Lark Adapter — FSL-01..FSL-05 是 Phase 12 的锁定需求。
- `.planning/ROADMAP.md` §"Phase 12: 飞书/Lark 适配器" — Phase goal 与 4 条 success criteria。
- `.planning/STATE.md` §Accumulated Context — v1.1 前置决策与 Phase 8/9/10/11 已落地能力。

### 先前 Phase 决策

- `.planning/phases/08-architecture-generalization/08-CONTEXT.md` — D-95..D-110：PlatformId、MAIN world bridge、SPA filter、ErrorCode namespace 决策；Phase 12 必须建立在这些契约上。
- `.planning/phases/09-dispatch-robustness/09-CONTEXT.md` — D-111..D-127：timeout、loggedOutPathPatterns、retriable retry、selector confidence 决策。
- `.planning/phases/10-slack-adapter/10-CONTEXT.md` — D-128..D-139：Slack per-platform format、MAIN world paste、发送确认、登录检测、selector 策略；Phase 12 应遵循相同的结构和模式。
- `.planning/phases/11-telegram-adapter/11-CONTEXT.md` — D-140..D-153：Telegram per-platform format、4096 截断、MAIN world paste、发送确认、登录检测；Phase 12 应遵循相同的结构和模式。

### 当前代码直接触点

- `shared/adapters/types.ts` — `AdapterRegistryEntry` 承载 `PlatformId`、`mainWorldInjector`、`spaNavigationHosts`、`loggedOutPathPatterns`、`dispatchTimeoutMs` 等；Phase 12 新增飞书 registry entry。
- `shared/adapters/registry.ts` — adapter registry 单一发现入口；Phase 12 追加 `defineAdapter({ id: 'feishu', ... })`。
- `background/main-world-registry.ts` — SW-only MAIN world injector registry；Phase 12 追加 `['feishu', feishuMainWorldPaste]`。
- `background/injectors/telegram-main-world.ts` — Telegram MAIN world paste 实现参考；飞书版本应遵循相同模式。
- `entrypoints/telegram.content.ts` — Telegram adapter content script 完整实现参考（选择器、登录检测、waitForReady、handleDispatch、发送确认）。
- `shared/adapters/telegram-format.ts` — Telegram 消息格式化参考（composeTelegramMessage + 截断）；飞书版本应结构对称。
- `shared/adapters/telegram-login-detect.ts` — Telegram DOM 层登录检测参考；飞书可能需要类似模块。
- `shared/adapters/dispatch-policy.ts` — `resolveAdapterTimeouts()`、`isLoggedOutUrlForAdapter()`、`withAdapterResponseTimeout()` 等 pipeline 共享工具。
- `background/dispatch-pipeline.ts` — dispatch state machine；Phase 12 不应需要修改（registry-driven）。
- `entrypoints/background.ts` — SW 入口；Phase 12 不应需要修改（registry-driven）。
- `wxt.config.ts` — manifest 配置；Phase 12 需要在 `host_permissions` 中追加 `'https://*.feishu.cn/*'` 和 `'https://*.larksuite.com/*'`。
- `locales/en.yml` — 英文 locale；Phase 12 追加 `platform_icon_feishu`（值为 `Lark`）、`feishu_tos_warning`、`feishu_tos_details` 等 key。
- `locales/zh_CN.yml` — 中文 locale；Phase 12 追加 `platform_icon_feishu`（值为 `飞书`）、`feishu_tos_warning`、`feishu_tos_details` 等 key。
- `scripts/verify-manifest.ts` — manifest 权限断言；Phase 12 新增的两个通配域名需被验证覆盖。

### 保护性测试

- `tests/unit/dispatch/platform-detector.spec.ts` — registry 顺序、match purity 回归测试；新增飞书 entry 应通过。
- `tests/unit/dispatch/timeout-config.spec.ts` — registry-driven timeout 断言；新增飞书 entry 应继承默认值。
- `tests/unit/dispatch/logged-out-paths.spec.ts` — `loggedOutPathPatterns` helper 测试；飞书的 patterns 应被覆盖。
- `tests/unit/dispatch/spaFilter.spec.ts` — `buildSpaUrlFilters` 测试；飞书 `spaNavigationHosts` 应被覆盖。
- `tests/unit/dispatch/mainWorldBridge.spec.ts` — MAIN world bridge port routing 测试；飞书 port 应被覆盖。
- `tests/unit/adapters/telegram-selector.spec.ts` — Telegram 三层 selector fixture 测试参考；飞书需要类似的 fixture + 测试。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `shared/adapters/registry.ts` — 已是 registry-driven 平台发现入口；追加飞书 entry 后 popup + SW 自动发现。
- `shared/adapters/types.ts` — `defineAdapter()` helper 和 `AdapterRegistryEntry` 类型；Phase 12 新增飞书 entry 无需改类型。
- `background/main-world-registry.ts` — SW-only MAIN world injector 手动 map；追加飞书 injector 后 bridge 自动路由。
- `background/injectors/telegram-main-world.ts` — Telegram MAIN world paste 实现模板；飞书版本可直接参考结构。
- `shared/adapters/telegram-format.ts` — Telegram 消息格式化模板；飞书 `feishu-format.ts` 应结构对称（pure function + Snapshot interface + compose + 可选 escape + 可选 truncation）。
- `shared/adapters/dispatch-policy.ts` — `resolveAdapterTimeouts()` 和 `isLoggedOutUrlForAdapter()` 等 pipeline 工具；飞书 entry 自动继承默认行为。
- `entrypoints/telegram.content.ts` — 完整的 adapter content script 模板：选择器三层 fallback、waitForReady 竞速、handleDispatch 状态机、发送确认、rate limit。

### Established Patterns

- Registry match 函数必须保持 pure、无 `chrome.*`（popup 和 SW 都 import）。
- Content script 使用 `defineContentScript({ matches: [], registration: 'runtime' })` + one-shot `ADAPTER_DISPATCH` listener + injection guard flag。
- MAIN world 注入通过 port 连接 SW（`WEB2CHAT_MAIN_WORLD:<platformId>`），SW 执行 `chrome.scripting.executeScript({ world: 'MAIN' })`。
- 登录检测采用 URL 层（`loggedOutPathPatterns`）+ DOM 层（`*-login-detect.ts`）分层防护。
- 编辑器选择器采用 ARIA-first 三层 fallback + 低置信度 warning（tier3 class fragment）。
- 消息格式化为 pure function（无 chrome.* / WXT import），可被 content script 和单元测试共用。
- 所有 UI 字符串走 i18n `t()`；新平台需要 en + zh_CN 100% key 覆盖。
- 新平台 host 域名加静态 `host_permissions`（已知公共域名）而非 optional。
- 双域名适配：一个 registry entry 的 match 函数检查两个 hostname，hostMatches 包含两个 glob 模式，spaNavigationHosts 包含两个 hostname。

### Integration Points

- `shared/adapters/registry.ts` — 追加 `defineAdapter({ id: 'feishu', ... })` 条目，match 函数同时匹配 `feishu.cn` 和 `larksuite.com`。
- `background/main-world-registry.ts` — 追加 `['feishu', feishuMainWorldPaste]` 到 injectors map。
- `background/injectors/feishu-main-world.ts` — 新文件，飞书 MAIN world paste 实现。
- `entrypoints/feishu.content.ts` — 新文件，飞书 adapter content script。
- `shared/adapters/feishu-format.ts` — 新文件，飞书消息格式化 + 可选截断。
- `shared/adapters/feishu-login-detect.ts` — 新文件（如果 DOM 层登录检测需要）。
- `wxt.config.ts` — `host_permissions` 追加 `'https://*.feishu.cn/*'` 和 `'https://*.larksuite.com/*'`。
- `locales/en.yml` + `locales/zh_CN.yml` — 追加飞书平台 icon tooltip（en: `Lark`，zh_CN: `飞书`）、ToS 警告等 key。
- `scripts/verify-manifest.ts` — 确保新增的两个通配域名被验证覆盖。
- `tests/unit/adapters/` — 飞书 adapter fixture HTML + selector 测试、format 测试、login-detect 测试。

</code_context>

<specifics>
## Specific Ideas

- 飞书/Lark 是 ByteDance 的企业协作平台，国内版（feishu.cn）和国际版（larksuite.com）功能基本一致但域名和品牌不同。
- 平台名称区分：zh_CN 显示"飞书"，en 显示"Lark"。这是飞书官方的品牌策略。
- host_permissions 使用通配子域名（`*.feishu.cn/*` + `*.larksuite.com/*`），因为飞书 Web 聊天可能在不同子域名上（需 researcher 验证）。
- 飞书 format 模块应与 `telegram-format.ts` / `slack-format.ts` 结构对称：`composeFeishuMessage()` + 可选 markdown 转换 + 可选截断逻辑。
- REQUIREMENTS 指定 match URL 模式为 `feishu.cn/messenger/*` + `larksuite.com/messenger/*`，但实际飞书 Web 聊天的 URL 路径需 researcher 验证。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-飞书/Lark 适配器*
*Context gathered: 2026-05-16T16:00:00+08:00*
