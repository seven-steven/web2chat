# Feature Landscape -- v1.1 多渠道适配 + 投递鲁棒性

**领域:** Chrome MV3 Web Clipper 扩展，抓取结构化页面数据 + 用户自定义 prompt 并投递到 IM / AI-Agent 网页聊天会话
**Researched:** 2026-05-09（v1.1 增量更新；v1.0 基线研究于 2026-04-28）
**Confidence:** HIGH（table stakes / anti-features / MVP），MEDIUM（per-platform DOM feasibility -- 取决于各平台编辑器是否在版本间发生变更）

> 本文档是 v1.0 FEATURES.md 的增量更新。v1.0 的 feature landscape（table stakes、differentiators、anti-features、feature dependencies、competitor analysis）仍然有效且不再重复。本文聚焦 v1.1 milestone 两大焦点：
> 1. 新增 IM 平台适配器的可行性评估与优先级排序
> 2. 投递链路鲁棒性提升的 feature 分解

---

## Table Stakes for v1.1 (Users Expect These)

v1.0 已交付的 table stakes 不再列出。以下为 v1.1 新增的必备功能。

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 新增 IM 平台适配器（至少 2 个） | v1.0 仅覆盖 OpenClaw + Discord；PROJECT.md v1.1 目标明确列出"新增 IM 平台适配器" | 中-高 | 每个适配器 = 新 content script + 注册表条目 + fixture + 测试。但适配器模式已验证，每个新增适配器成本递减 |
| 投递重试（popup 端） | 用户遇到网络延迟或 SPA 加载慢时投递失败，需要明确的重试路径而非重新操作 | 低 | popup 显示错误横幅 + "重试"按钮。复用 `dispatch.start` 路径，新 `dispatchId`，同 payload |
| 适配器选择器运行时健康检查 | IM 厂商频繁更新 DOM；静态 fixture 无法捕获线上变化 | 低 | 适配器 `findEditor()` 返回 `{ el, confidence }` 三级（ARIA > data-attr > class fragment）。`low` 时返回警告但不阻断 |
| SPA 路由检测泛化 | v1.0 硬编码 `discord.com` 的 `webNavigation` filter；每新增一个 SPA 平台都需要改 SW | 低 | 从 `adapterRegistry` 动态构建 filter；`isSpa` 标记决定哪些平台需要 SPA 检测 |
| 投递超时按平台分层 | Discord 冷启动 ~15s，OpenClaw <2s；统一 30s 对快速平台浪费，对复杂 SPA 可能不够 | 低 | `dispatchTimeoutMs` / `adapterResponseTimeoutMs` 移入 `AdapterRegistryEntry` |
| 登录检测泛化 | v1.0 的登录检测分散在 Discord 特定代码中；新平台需要同样的检测能力 | 低 | `loggedOutPathPatterns: RegExp[]` 加入注册表条目。DOM 层面的登录墙检测仍留在各适配器 |
| MAIN world 桥接泛化 | Discord 专用的 `DISCORD_MAIN_WORLD_PASTE_PORT` 硬编码无法复用 | 中 | 基于 `port.name` 前缀路由到平台特定的 `mainWorldInjector`。SW 负责调度，不硬编码平台 DOM 逻辑 |
| 平台图标（新增平台） | popup 通过 `iconKey` 显示平台图标；新平台必须有对应图标 | 低 | SVG 或 PNG，放入 `public/icon/` |

## Differentiators for v1.1

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| PlatformId branded type | 消除多平台并行开发时的合并冲突 | 低 | `string & { __brand }` + 注册表 `asPlatformId()` 工厂。失去 switch 穷举检查，通过 `Set<PlatformId>` 唯一性约束补偿 |
| 选择器低置信度警告 | 用户在线上遇到 fallback selector 时得到提示而非静默失败 | 低 | 适配器响应附加 `warning: 'SELECTOR_LOW_CONFIDENCE'`；popup 显示非阻断提示 |
| 适配器开发模板标准化 | 降低社区贡献或批量添加新平台的门槛 | 低 | 基于 Discord/OpenClaw 已验证模式的模板：全局守卫 -> onMessage -> handleDispatch 流程 |

## Anti-Features for v1.1

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 在 dispatch-pipeline 中为新平台添加 if/else 分支 | pipeline 是平台无关的协调器；平台特定逻辑属于 content script 适配器 | 通过 `AdapterRegistryEntry` 的声明式字段（`dispatchTimeoutMs`、`isSpa`、`loggedOutPathPatterns`）驱动差异化行为 |
| 为每个新平台添加独立的 `webNavigation.onHistoryStateUpdated` listener | 违反适配器模式；新平台需要改动 SW 入口；无法按平台独立测试 | 从注册表动态构建 filter |
| 在新适配器中复制 Discord 的 MAIN world paste 逻辑 | 代码重复；port 协议不一致；修复一个平台不会自动修复其他平台 | 使用泛化的 MAIN world 桥接，每个适配器只提供自己的 `mainWorldInjector` 函数 |
| WhatsApp DOM 注入 | WhatsApp 在 2025 年 10 月的执法行动主动检测 DOM 变更（131 个扩展被封，~20,905 用户受影响），Forbes/Malwarebytes 广泛报道。用户触发单条发送仍有永久封号风险 | WhatsApp 仅支持深度链接（`https://wa.me/<num>?text=<encoded>`）-- 打开聊天并预填文本，由用户手动点击发送 |
| Signal DOM 注入 | Signal 明确不发布 web 客户端（安全立场）；桌面 Electron 应用对浏览器扩展不可达 | 标记为不支持，文档化原因。建议 `signal://` 深度链接或"复制到剪贴板"回退 |
| WeCom DOM 注入 | Web 客户端已逐步停用，转向原生 + JS-SDK 模型（仅 ICP 备案域名可用） | 标记为不支持；通过"使用原生 app + 剪贴板"回退记录 |
| QQ DOM 注入 | 腾讯从未发布过真正的 web QQ 聊天客户端 | 标记为不支持 |
| LINE DOM 注入 | LINE 没有功能完整的 web 客户端；`line.me` 主要是营销/登录 | 仅深度链接 `line://msg/text/...`（打开原生 app，无自动发送） |
| 批量/定时/广播发送 | 触发 IM 平台反垃圾检测；Chrome Web Store 下架风险；违反 PROJECT.md "用户主动点击" 隐私立场 | 单次点击单条消息；多目标分发上限 5 个且间隔 >=1.5s |

---

## Per-IM-Platform Feasibility Assessment (v1.1 决策依据)

每个候选平台的 DOM 注入可行性评估。v1.0 已交付 OpenClaw + Discord，此处聚焦剩余 13 个候选平台。

### Tier-A: FEASIBLE -- 推荐 v1.1 实施

已验证 DOM 注入可行，编辑器结构已知，社区有成功案例。

| Platform | URL Pattern | Editor Tech | Injection Method | Confidence | Evidence |
|----------|-------------|-------------|------------------|------------|----------|
| **Slack** | `https://app.slack.com/client/<team>/<channel>` | Quill（由 Slack Markdown Proxy 扩展源码确认） | MAIN world: `editor.clipboard.dangerouslyPasteHTML()` 或 `editor.insertText()`；或 ClipboardEvent paste | HIGH | [Slack Markdown Proxy](https://github.com/monzou/slack-markdown-proxy) 扩展在 Chrome Web Store 上线，直接操作 Quill Delta API。[Hackable Slack Client](https://github.com/bhuga/hackable-slack-client) 展示了 CSS/JS 注入模式 |
| **Telegram Web Z** | `https://web.telegram.org/a/` | 自定义 contenteditable（Teact 框架，[开源](https://github.com/TelegramOrg/Telegram-web-z)） | InputEvent `insertText` + Enter keydown；选择器 `.input-message-input` | HIGH | 源码公开（GPL v3），选择器可从源码确认。[Telegram Media Downloader](https://deepwiki.com/Neet-Nestor/Telegram-Media-Downloader) userscript 验证了 DOM 操作可行性 |
| **Zalo** | `https://chat.zalo.me/` | 自定义 contenteditable | InputEvent / ClipboardEvent paste | MEDIUM-HIGH | [zlapi](https://github.com/Its-VrxxDev/zlapi) 非官方 Python 库证明 DOM 自动化可行。[Zalo Hidden Chat Recover](https://chromewebstore.google.com/detail/zalo-hidden-chat-recover/mlpfmalbglceniiglgnoafllbemndoin) 和 [Zalo Tool](https://chromewebstore.google.com/detail/zalo-tool/gfbeladbhagkflpeihlkmledildhfhgk) Chrome 扩展在 Web Store 上线。ToS 警告非官方自动化 -- 与 Discord 立场相同 |

### Tier-B: FEASIBLE but FRAGILE -- 谨慎实施

DOM 注入技术上可行但脆弱：编辑器封装重、DOM 频繁抖动、或官方推荐服务端路径。

| Platform | URL Pattern | Editor Tech | Injection Method | Confidence | Risk Factors |
|----------|-------------|-------------|------------------|------------|--------------|
| **Microsoft Teams** | `https://teams.microsoft.com/l/message/...` 或 `https://teams.live.com/v2/...` | 自定义富文本 contenteditable（封装严重） | `document.execCommand('insertText')` 或 InputEvent；需 MAIN world | MEDIUM | [Stack Overflow 证实](https://stackoverflow.com/questions/77391625/send-message-in-ms-teams-chat-in-browser-with-javascript) contenteditable 注入可行，但编辑器封装重，频繁重新渲染。Microsoft 官方推荐"Message Extensions"（服务端 app）-- 按 PROJECT.md 反特性。选择器维护成本高 |
| **Google Chat** | `https://chat.google.com/u/0/#chat/dm/<id>` 或 `/space/<id>` | 自定义 contenteditable | ClipboardEvent paste 或 InputEvent | MEDIUM | 重 CSP 与频繁 DOM 抖动。[Chat Plus 扩展](https://chromewebstore.google.com/detail/chat-plus-for-google-chat/njkkenehdklkfdkmonkagaicllmnfcda) 证明 DOM 操作可行但经常坏。Google 推荐路径是 Workspace Add-on（服务端）|
| **Feishu** | `https://www.feishu.cn/messenger/...` | 自定义富文本 | ClipboardEvent paste（推测） | LOW-MEDIUM | 无公开社区 DOM 注入扩展证据；所有文档/SDK 走官方 Open Platform API。需要逆向。仅中国大陆 |
| **Lark** | `https://www.larksuite.com/...` | 自定义富文本（与 Feishu 同源） | 同 Feishu | LOW-MEDIUM | Feishu 的国际版；编辑器相同但 URL host 不同。两个区域都需要独立测试 |
| **Nextcloud Talk** | `https://<host>/call/<token>` 或 `/apps/spreed/...` | Vue.js contenteditable | InputEvent + Enter keydown | MEDIUM | [开源](https://github.com/nextcloud/spreed)（AGPL），选择器可从源码确认。自托管 -> 版本碎片化。官方推荐 bot/webhook REST API -- 但 DOM 注入同样可行 |

### Tier-C: NOT FEASIBLE -- 明确不支持

| Platform | Why Not Feasible | Evidence | Alternative |
|----------|------------------|----------|-------------|
| **WhatsApp Web** | 封号风险极高。2025 年 10 月 [131 个 Chrome 扩展被标记](https://www.malwarebytes.com/blog/news/2025/10/over-100-chrome-extensions-break-whatsapps-anti-spam-rules)劫持 WhatsApp Web，~20,905 用户受影响。[Forbes](https://www.forbes.com/sites/zakdoffman/2025/10/21/if-you-use-whatsapp-delete-every-chrome-extension-on-this-list/) 广泛报道。WhatsApp [主动检测](https://thehackernews.com/2025/10/131-chrome-extensions-caught-hijacking.html) DOM 变更并永久封号 | 技术上可行（React contenteditable），但政治/法律风险不可接受 | 深度链接 `https://wa.me/<num>?text=<encoded>` -- 打开聊天并预填文本，用户手动发送 |
| **Signal** | [明确不提供 web 客户端](https://aboutsignal.com/blog/signal-web/)（安全立场：E2E 加密需要本地端点）。桌面 Electron 应用对浏览器扩展不可达。[GitHub Issue #4466](https://github.com/signalapp/Signal-Desktop/issues/4466) 社区请求被拒 | 设计决策，不是技术限制 | 标记不支持。建议 `signal://` 深度链接或"复制到剪贴板，粘贴到 Signal Desktop" |
| **WeCom** | Web 客户端已逐步停用，转向原生 + JS-SDK 模型。JS-SDK 仅在 ICP 备案域名可用 | 产品方向性弃用 | 标记不支持。通过"使用原生 app + 剪贴板"回退 |
| **QQ** | 腾讯从未发布过真正的 web QQ 聊天客户端；`qzone.qq.com` 仅 feed | 无注入目标 | 标记不支持 |
| **LINE** | [没有功能完整的 web 客户端](https://line.me/)；真实聊天在原生 app 上 | 无注入目标 | 深度链接 `line://msg/text/...`（打开原生 app，无自动发送） |

### Feasibility Summary

```
v1.1 推荐（Tier-A，已验证 DOM 注入）:
  Slack          -- Quill 编辑器，社区扩展已证明
  Telegram Web Z -- 开源 Teact 框架，选择器可审查
  Zalo           -- 非官方 API + Chrome 扩展已存在

v1.1 可选 / v2 候选（Tier-B，脆弱但可行）:
  Microsoft Teams  -- 封装重，维护成本高
  Google Chat      -- DOM 抖动频繁
  Nextcloud Talk   -- 开源但版本碎片化
  Feishu / Lark    -- 无社区验证，需逆向

明确不支持（Tier-C）:
  WhatsApp Web -- 封号风险不可接受（2025 执法行动证据）
  Signal       -- 无 web 客户端（设计决策）
  WeCom        -- web 已停用
  QQ           -- 无 web 聊天
  LINE         -- 无功能完整的 web 客户端
```

---

## Dispatch Robustness Features (投递鲁棒性)

v1.0 的投递链路已通过 225 个单元测试 + 7 个 E2E 测试验证，但存在已知脆弱点。v1.1 的鲁棒性提升分解如下。

### Feature: 投递重试（popup 端）

| Aspect | Detail |
|--------|--------|
| **What** | popup 在 dispatch 失败且 `retriable === true` 时显示"重试"按钮 |
| **Why** | SW 不自动重试（MV3 生命周期不可靠 + ToS 风险）；用户应看到失败原因并决定是否重试 |
| **How** | 从 `dispatch:<id>` record 读取 snapshot + send_to + prompt -> 生成新 UUID -> `dispatch.start` |
| **Complexity** | LOW -- 复用完全相同的 `dispatch.start` 路径，幂等性由新 `dispatchId` 保证 |
| **Dependencies** | `dispatch-pipeline.ts` 不需要改动；纯 popup UI 层新增 |

### Feature: SPA 路由检测泛化

| Aspect | Detail |
|--------|--------|
| **What** | 从 `adapterRegistry` 动态构建 `webNavigation.onHistoryStateUpdated` filter |
| **Why** | v1.0 硬编码 `discord.com` filter；每新增一个 SPA 平台都需要改 `background.ts` |
| **How** | `buildSpaHostFilters()` 在模块顶层从注册表构建 filter；`isSpa: true` 标记决定哪些平台需要 SPA 检测 |
| **Complexity** | LOW -- 纯数据驱动的重构 |
| **Dependencies** | 依赖 `AdapterRegistryEntry.isSpa` 字段新增 |

### Feature: 投递超时按平台分层

| Aspect | Detail |
|--------|--------|
| **What** | `dispatchTimeoutMs` / `adapterResponseTimeoutMs` 移入 `AdapterRegistryEntry` |
| **Why** | Discord 冷启动 ~15s vs OpenClaw <2s；统一 30s 对快速平台白白等待 |
| **How** | `dispatch-pipeline.ts` 从 adapter entry 读取超时值；保留默认 30s / 20s |
| **Complexity** | LOW |
| **Dependencies** | `AdapterRegistryEntry` 类型扩展 |

### Feature: 登录检测泛化

| Aspect | Detail |
|--------|--------|
| **What** | `loggedOutPathPatterns: RegExp[]` 加入注册表条目；pipeline 统一检查 |
| **Why** | v1.0 的登录检测分散在 Discord 特定代码中（pipeline URL 对比 + content script DOM 探测） |
| **How** | pipeline 层用 `adapter.loggedOutPathPatterns?.some(p => p.test(pathname))` 替代 Discord 硬编码 |
| **Complexity** | LOW |
| **Dependencies** | `AdapterRegistryEntry` 类型扩展 |

### Feature: 适配器选择器运行时健康检查

| Aspect | Detail |
|--------|--------|
| **What** | `findEditor()` 返回 `{ el, confidence: 'high' | 'medium' | 'low' }` |
| **Why** | IM 厂商频繁更新 DOM；静态 fixture 无法捕获线上变化 |
| **How** | 三级选择器：ARIA/data-attr（high）> data-*（medium）> class fragment（low）。`low` 时附加 `warning` 字段 |
| **Complexity** | LOW |
| **Dependencies** | `AdapterDispatchResponse` 类型扩展（可选 `warning` 字段） |

### Feature: MAIN world 桥接泛化

| Aspect | Detail |
|--------|--------|
| **What** | Discord 专用的 `DISCORD_MAIN_WORLD_PASTE_PORT` 泛化为基于 `port.name` 前缀的路由 |
| **Why** | Slack（Quill）、Telegram 等平台也需要 MAIN world 注入；每个平台复制 Discord 逻辑不可接受 |
| **How** | `port.name` 格式 `WEB2CHAT_MAIN_WORLD_INJECT:<platformId>`；每个适配器提供自己的 `mainWorldInjector` 函数 |
| **Complexity** | MEDIUM -- 涉及 `background.ts` 核心入口变更 |
| **Dependencies** | `AdapterRegistryEntry` 可能需要新增 `mainWorldInjector` 字段 |

---

## Feature Dependencies (v1.1 增量)

```
[Architecture generalization -- Phase A]
    ├─ PlatformId branded type (shared/adapters/types.ts)
    │     └─enables─> 新适配器并行开发无合并冲突
    ├─ AdapterRegistryEntry 扩展字段 (shared/adapters/types.ts)
    │     ├─ dispatchTimeoutMs / adapterResponseTimeoutMs
    │     ├─ isSpa: boolean
    │     └─ loggedOutPathPatterns: RegExp[]
    ├─ MAIN world bridge generalization (entrypoints/background.ts)
    │     └─requires─> port.name prefix routing
    └─ ErrorCode expansion (shared/messaging/result.ts)

[Dispatch robustness -- Phase B]
    ├─depends on─> [Phase A: AdapterRegistryEntry extensions]
    ├─ SPA route detection generalization
    │     └─requires─> isSpa field + buildSpaHostFilters()
    ├─ Per-platform timeouts
    │     └─requires─> dispatchTimeoutMs / adapterResponseTimeoutMs
    └─ Login detection generalization
          └─requires─> loggedOutPathPatterns

[First new adapter -- Phase C]
    ├─depends on─> [Phase B: dispatch robustness complete]
    ├─ New adapter content script (entrypoints/<platform>.content.ts)
    ├─ New format helper (shared/adapters/<platform>-format.ts)
    ├─ New fixture + tests
    ├─ Registry entry (shared/adapters/registry.ts)
    ├─ host_permissions update (wxt.config.ts)
    └─ i18n keys + icon

[Popup retry UI -- Phase D]
    ├─depends on─> [Phase A] (can parallel with Phase C)
    ├─ Error banner with retry button
    └─ Reads snapshot from dispatch:<id> -> new UUID -> dispatch.start

[Subsequent adapters -- Phase E+]
    └─each─> Same template as Phase C, reduced scope
```

---

## MVP Recommendation for v1.1

### v1.1 应交付（按优先级排序）

1. **架构泛化（Phase A）** -- PlatformId branded type + AdapterRegistryEntry 扩展 + MAIN world 桥接泛化 + ErrorCode 扩展
2. **投递鲁棒性（Phase B）** -- SPA 路由检测泛化 + 超时分层 + 登录检测泛化
3. **Slack 适配器（Phase C-1）** -- Tier-A，Quill 编辑器，社区验证充分，用户基数大
4. **Telegram Web Z 适配器（Phase C-2）** -- Tier-A，开源 Teact 框架，选择器可审查
5. **popup 重试 UI（Phase D）** -- 与 Phase C 可并行
6. **选择器健康检查** -- 随第一个新适配器一起实现

### v1.1 可选 / 推迟到 v2

- **Zalo 适配器** -- Tier-A 但用户基数较小（越南市场为主），可在 v1.1 后期或 v2 实施
- **Nextcloud Talk 适配器** -- Tier-B 但开源 + 自托管场景与 web2chat 的 llm-wiki 理念高度契合
- **Microsoft Teams 适配器** -- Tier-B，维护成本高，等待用户需求信号
- **Google Chat 适配器** -- Tier-B，DOM 抖动频繁，等待用户需求信号
- **Feishu / Lark 适配器** -- Tier-B，无社区验证，需逆向，高风险

### 明确不在 v1.1 范围

- WhatsApp Web（封号风险）
- Signal（无 web 客户端）
- WeCom / QQ / LINE（无可用 web 聊天）
- 云同步 / AI 总结 / 服务端 Bot API（PROJECT.md 永久排除）
- Firefox / Safari 适配（PROJECT.md v2 候选）

---

## Feature Prioritization Matrix (v1.1)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 架构泛化（Phase A） | 高（所有后续适配器的基础） | 中 | **P1** |
| 投递鲁棒性（Phase B） | 高（投递可靠性） | 中 | **P1** |
| Slack 适配器 | 高（用户基数大） | 中 | **P1** |
| Telegram Web Z 适配器 | 高（开源 + llm-wiki 受众） | 中 | **P1** |
| popup 重试 UI | 高（用户体验） | 低 | **P1** |
| 选择器健康检查 | 中（线上防护） | 低 | **P2** |
| Zalo 适配器 | 中（区域市场） | 中 | **P2** |
| Nextcloud Talk 适配器 | 中（自托管场景） | 中 | **P2** |
| Microsoft Teams 适配器 | 中（企业用户） | 高 | **P3** |
| Google Chat 适配器 | 中（Google 生态） | 高 | **P3** |
| Feishu / Lark 适配器 | 低-M（中国市场） | 高 | **P3** |

**Priority key:**
- **P1**: v1.1 必备 -- 架构基础 + Tier-A 适配器 + 重试
- **P2**: v1.1 可选 -- 第二批适配器 + 线上防护
- **P3**: v2 候选 -- 高成本/高风险适配器

---

## Sources

### v1.0 Sources (仍然有效)
- See v1.0 FEATURES.md for complete source list

### v1.1 新增 Sources

**Slack:**
- [Slack Markdown Proxy -- Chrome Web Store](https://chromewebstore.google.com/detail/slack-markdown-proxy/llanfnajlpjggcklilogepheehdfdgnd) -- proves Slack uses Quill editor
- [Slack Markdown Proxy -- GitHub](https://github.com/monzou/slack-markdown-proxy) -- open source, Quill API usage confirmed
- [Hackable Slack Client -- GitHub](https://github.com/bhuga/hackable-slack-client) -- CSS/JS injection patterns
- [Quill editor GitHub issues #1720, #1640](https://github.com/slab/quill/issues/1720) -- contenteditable embed handling

**Telegram Web Z:**
- [Telegram Web Z -- GitHub (official)](https://github.com/TelegramOrg/Telegram-web-z) -- open source (GPL v3), Teact framework
- [Telegram Media Downloader -- userscript reference](https://deepwiki.com/Neet-Nestor/Telegram-Media-Downloader) -- DOM manipulation patterns verified

**Zalo:**
- [zlapi -- GitHub](https://github.com/Its-VrxxDev/zlapi) -- unofficial Python library, proves DOM automation viable
- [Zalo Hidden Chat Recover -- Chrome Web Store](https://chromewebstore.google.com/detail/zalo-hidden-chat-recover/mlpfmalbglceniiglgnoafllbemndoin) -- Chrome extension DOM manipulation
- [Zalo Tool -- Chrome Web Store](https://chromewebstore.google.com/detail/zalo-tool/gfbeladbhagkflpeihlkmledildhfhgk) -- multi-account DOM + cookie management

**Microsoft Teams:**
- [Stack Overflow: Send message in MS Teams chat in-browser](https://stackoverflow.com/questions/77391625/send-message-in-ms-teams-chat-in-browser-with-javascript) -- confirms contenteditable injection works
- [Microsoft Teams Message Extensions -- official docs](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions) -- server-side alternative (anti-feature for us)

**Google Chat:**
- [Chat Plus for Google Chat -- Chrome Web Store](https://chromewebstore.google.com/detail/chat-plus-for-google-chat/njkkenehdklkfdkmonkagaicllmnfcda) -- proves DOM manipulation works but fragile
- [Google Chat Add-ons -- official docs](https://developers.google.com/workspace/add-ons/chat) -- server-side alternative

**WhatsApp (anti-feature evidence):**
- [131 Chrome Extensions Caught Hijacking WhatsApp Web -- The Hacker News (Oct 2025)](https://thehackernews.com/2025/10/131-chrome-extensions-caught-hijacking.html)
- [100+ Chrome Extensions Break WhatsApp's Anti-Spam Rules -- Malwarebytes (Oct 2025)](https://www.malwarebytes.com/blog/news/2025/10/over-100-chrome-extensions-break-whatsapps-anti-spam-rules)
- [Forbes: Delete Abusive Chrome Extensions (Oct 2025)](https://www.forbes.com/sites/zakdoffman/2025/10/21/if-you-use-whatsapp-delete-every-chrome-extension-on-this-list/)

**Signal (anti-feature evidence):**
- [Why Signal has no web client -- aboutsignal.com](https://aboutsignal.com/blog/signal-web/)
- [Signal Desktop -- no web version -- GitHub Issue #4466](https://github.com/signalapp/Signal-Desktop/issues/4466)

**Rich text editor landscape:**
- [Which Rich Text Editor Framework Should You Choose in 2025? -- Liveblocks](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025)

---

_Feature research for: Chrome MV3 Web Clipper extension v1.1 -- multi-channel adapter support + dispatch robustness_
_Incremental update over v1.0 baseline (2026-04-28)_
_Researched: 2026-05-09_
