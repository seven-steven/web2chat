# Requirements: web2chat v1.1

**Defined:** 2026-05-09
**Core Value:** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话

## v1.1 Requirements

Requirements for v1.1 milestone — multi-channel adapter support + dispatch robustness.

### Architecture (ARCH)

- [x] **ARCH-01**: PlatformId 从硬编码联合类型（`'mock' | 'openclaw' | 'discord'`）改为 branded string type，通过注册表条目的 `id` 字段约束合法值，避免多平台并行开发时的合并冲突
- [x] **ARCH-02**: MAIN world paste 桥接从 Discord 专用（`DISCORD_MAIN_WORLD_PASTE_PORT`）泛化为 per-adapter 路由（基于 `port.name` 前缀匹配），每个适配器提供自己的 `mainWorldInjector` 函数
- [x] **ARCH-03**: SPA 路由检测 filter 从硬编码 `discord.com` 改为从 `adapterRegistry` 动态构建 `webNavigation.onHistoryStateUpdated` filter
- [x] **ARCH-04**: ErrorCode 按平台命名空间组织（通用前缀 + 平台前缀），支持新平台扩展而不影响现有错误处理

### Dispatch Robustness (DSPT)

- [ ] **DSPT-01**: 投递超时参数移入 `AdapterRegistryEntry`（`dispatchTimeoutMs` / `adapterResponseTimeoutMs`），`dispatch-pipeline.ts` 从 registry 读取而非使用硬编码常量
- [ ] **DSPT-02**: 登录检测从 Discord 硬编码泛化为 `AdapterRegistryEntry` 的 `loggedOutPathPatterns` 可选字段，pipeline 层 URL 对比检测使用此配置
- [ ] **DSPT-03**: Popup 投递失败时对 `retriable: true` 的错误显示"重试"按钮，重试复用 `dispatch.start` 路径（新 `dispatchId`，同 payload）
- [ ] **DSPT-04**: 适配器选择器使用分层置信度（tier1 ARIA / tier2 data-attr / tier3 class fragment），低置信度时在响应中附加 `SELECTOR_LOW_CONFIDENCE` 警告并显示给用户

### Slack Adapter (SLK)

- [ ] **SLK-01**: Slack URL 模式匹配（`https://app.slack.com/client/<workspace>/<channel>`），注册表条目含 `hostMatches: ['https://app.slack.com/*']`
- [ ] **SLK-02**: Slack 登录墙检测（URL 层：`/signin` 等；DOM 层：workspace 登录页面元素），`waitForReady` 竞速登录探测
- [ ] **SLK-03**: Slack Quill 编辑器 DOM 注入 — 通过 MAIN world `executeScript` 注入 ClipboardEvent paste（contenteditable div），需 MAIN world 桥接
- [ ] **SLK-04**: Slack 消息发送确认 — Enter keydown 触发发送后 MutationObserver 等待新消息节点出现
- [ ] **SLK-05**: Slack 平台图标 + `platform_icon_slack` i18n key（zh_CN + en 100% 覆盖）

### Telegram Adapter (TG)

- [ ] **TG-01**: Telegram Web K URL 模式匹配（`https://web.telegram.org/a/`），注册表条目含 `hostMatches: ['https://web.telegram.org/*']`
- [ ] **TG-02**: Telegram 登录墙检测（URL 层：登录页面路径；DOM 层：登录表单元素），`waitForReady` 竞速登录探测
- [ ] **TG-03**: Telegram Web K contenteditable 编辑器 DOM 注入 — ClipboardEvent paste 或 property-descriptor setter
- [ ] **TG-04**: Telegram 消息发送确认 — 发送按钮点击或 Enter 触发后 MutationObserver 等待新消息节点
- [ ] **TG-05**: Telegram 平台图标 + `platform_icon_telegram` i18n key（zh_CN + en 100% 覆盖）

### Feishu/Lark Adapter (FSL)

- [ ] **FSL-01**: Feishu/Lark 双域名匹配（`https://feishu.cn/messenger/*` + `https://larksuite.com/messenger/*`），统一 platformId `feishu`
- [ ] **FSL-02**: Feishu/Lark 登录墙检测（URL 层：登录/注册路径；DOM 层：登录表单），`waitForReady` 竞速登录探测
- [ ] **FSL-03**: Feishu/Lark contenteditable 编辑器 DOM 注入 — 数据驱动 ContentEditable，ClipboardEvent paste（首选）或 property-descriptor setter
- [ ] **FSL-04**: Feishu/Lark 消息发送确认 — Enter 或发送按钮触发后 MutationObserver 等待新消息节点
- [ ] **FSL-05**: Feishu/Lark 平台图标 + `platform_icon_feishu` i18n key（zh_CN + en 100% 覆盖）

## Future Requirements (Deferred)

### High-Risk Platforms

- **WhatsApp Web** — DOM 注入技术上可行，但 2025 年 10 月 Meta 已封禁 131 个自动化扩展（~20,905 用户受影响），有永久封号风险。需等待政策变化或探索 deep-link-only 模式
- **Microsoft Teams** — 复杂 SPA + 企业安全策略，DOM 注入困难，需专属调研
- **Google Chat** — Google CSP 限制 + 频繁 A/B 测试，DOM 注入不稳定
- **WeCom 企业微信** — 企业级反自动化检测，高风险

### Not Feasible (No Web Chat UI)

- **Signal** — 无浏览器 Web UI（Desktop 是 Electron 应用，设计上拒绝 Web 端）
- **LINE** — 无标准个人聊天 Web UI（chat.line.biz 仅支持官方账号管理）
- **QQ** — 无稳定 Web 聊天 UI（腾讯已逐步关闭 QQ 网页版聊天功能）

### Other Deferred

- **Nextcloud Talk** — 用户自部署，低复杂度，复用 OpenClaw 模式。推迟到后续 milestone
- **Zalo** — `chat.zalo.me` 有 contenteditable，但未验证，推迟待调研
- **历史记录搜索 / 收藏管理界面**
- **配置导入导出**
- **自定义模板编辑器**

## Out of Scope

| Feature | Reason |
|---------|--------|
| Firefox / Safari 适配 | v1 仅 Chromium MV3，避免分裂工程精力 |
| 云端同步配置 / 用户账户 | 本地存储足够覆盖个人使用，云同步推后 |
| 自建 IM 后端 / Server-to-Server 发送 | 走"新开 tab + 注入会话"路径，不引入服务器 |
| 内容 OCR / 图片附件抽取 | v1 只处理文本与基础 metadata，图片与 OCR 推后 |
| AI 内容总结 / 改写 | 用户自带 prompt 由下游 Agent 处理，扩展本身不调用 LLM |
| Bot API / Webhook 发送 | 需 token 管理 + OAuth + 服务端基础设施，违反"无后端"约束 |
| WhatsApp Web DOM 注入 | 2025 年 10 月 Meta 封禁 131 个自动化扩展，用户有永久封号风险 |

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ARCH-01 | Phase 8 | Complete |
| ARCH-02 | Phase 8 | Complete |
| ARCH-03 | Phase 8 | Complete |
| ARCH-04 | Phase 8 | Complete |
| DSPT-01 | Phase 9 | Pending |
| DSPT-02 | Phase 9 | Pending |
| DSPT-03 | Phase 9 | Pending |
| DSPT-04 | Phase 9 | Pending |
| SLK-01 | Phase 10 | Pending |
| SLK-02 | Phase 10 | Pending |
| SLK-03 | Phase 10 | Pending |
| SLK-04 | Phase 10 | Pending |
| SLK-05 | Phase 10 | Pending |
| TG-01 | Phase 11 | Pending |
| TG-02 | Phase 11 | Pending |
| TG-03 | Phase 11 | Pending |
| TG-04 | Phase 11 | Pending |
| TG-05 | Phase 11 | Pending |
| FSL-01 | Phase 12 | Pending |
| FSL-02 | Phase 12 | Pending |
| FSL-03 | Phase 12 | Pending |
| FSL-04 | Phase 12 | Pending |
| FSL-05 | Phase 12 | Pending |
