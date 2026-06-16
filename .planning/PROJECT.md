# web2chat

## 这是什么 (What This Is)

类似 Notion / Pocket / Obsidian Web Clipper 的 Chrome MV3 浏览器扩展。用户在任意网页点击图标后，扩展抓取页面结构化信息（title / url / description / create_at / content），结合用户预设的提示词（prompt），一键发送到目标 IM 会话或 AI Agent 会话。面向需要把"网上看到的内容"快速沉淀到知识库 / 团队聊天 / Agent 工作流的个人与小团队。

### 设计初衷 (Design Intent)

web2chat 最初为 llm-wiki 模式（Karpathy 提出：LLM 从摄取的网页来源中渐进式构建持久化知识库，参见 https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f ）而设计。最初目标是通过常用的 IM 工具（Discord、Feishu、Lark、Google Chat、LINE、Microsoft Teams、Nextcloud Talk、Signal、Slack、Telegram、WhatsApp、Zalo、QQ、WeCom）便捷地将网页信息发送给 openclaw、hermes-agent 等承载 llm-wiki 的 AI Agent 平台进行知识沉淀。在实现过程中，项目演变为通用的网页到聊天投递工具，可向任意 IM 或 AI Agent 会话发送结构化信息。

## 核心价值 (Core Value)

让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话——其余功能可以让步，这条主链路必须稳定可用。

## Current Milestone: v1.2 添加 web 宣传页面

**Goal:** 在当前仓库内交付一个可发布的静态 web 宣传页，让首次访问者快速理解 web2chat 的用途、支持平台、核心流程、隐私承诺与安装入口。

**Target features:**
- 静态产品宣传页，清晰说明 web2chat 的核心价值与使用场景
- 支持平台与工作流展示：OpenClaw / Discord / Slack / Telegram，以及“网页 → prompt → 聊天会话”的主链路
- 隐私与本地优先说明：数据本地处理、用户主动发送、无第三方上报
- 安装 / 获取入口：面向 Chrome/Chromium 用户的下载或安装指引
- 仓库内维护，随扩展版本一起演进

## 需求 (Requirements)

### 已验证 (Validated)

- [x] Chrome MV3 扩展骨架：manifest、popup、background service worker、content script — Validated in Phase 1（FND-01..06、STG-01/02）
- [x] i18n 国际化：至少支持 zh_CN / en — Validated in Phase 1（FND-06、@wxt-dev/i18n + en/zh_CN locale 100% 同构）
- [x] 全部配置本地存储于 `chrome.storage.local` — Validated in Phase 1（STG-01/02、`metaItem` typed repo + 版本化 schema + migration 框架）
- [x] 点击扩展图标弹出 popup，抓取并展示当前页面 `title` / `url` / `description` / `create_at` / `content` — Validated in Phase 2（CAP-01..05、Readability + DOMPurify + Turndown 抽取流水线、4-state popup UI、E2E 3/3 + 真实文章 visual UAT 通过）
- [x] popup 提供 `send_to`（IM channel）输入：下拉历史记录、根据填写内容识别 IM 平台并展示对应 icon — Validated in Phase 3（DSP-01..03）
- [x] popup 提供 `prompt` 输入：自动按历史记录提示，与 `send_to` 绑定，切换 `send_to` 时自动切换 prompt — Validated in Phase 3（DSP-04..06、DSP-09）
- [x] 用户点击"确认"后：新开 tab / 唤起本地应用，导航到目标会话并把格式化信息 + prompt 发送到该会话 — Validated in Phase 3（DSP-07..10、STG-03）
- [x] MVP 渠道：OpenClaw Web UI（`http://localhost:18789/chat?session=agent:<agent_name>:<session_name>`）— Validated in Phase 4（ADO-01..07、optional_host_permissions 动态授权）
- [x] MVP 渠道：Discord Web（`https://discord.com/channels/<server_id>/<channel_id>`）— Validated in Phase 5（ADD-01..09、ClipboardEvent 粘贴注入 + MAIN world bridge + ToS 声明）
- [x] 投递超时分层 + 登录检测泛化 + 重试 UI + 选择器置信度 — Validated in Phase 9（DSPT-01..04）
- [x] Slack 适配器（URL 匹配 + 登录检测 + 富文本注入 + 发送确认）— Validated in Phase 10 / 10.1（SLK-01..05）
- [x] Telegram 适配器（Web K URL 匹配 + contenteditable 注入 + 4096-char 截断）— Validated in Phase 11（TG-01..05，live UAT 待补）
- [x] 低置信度确认流收尾修复：`needs_confirmation` 时 popup 保持打开并复用原始 snapshot — Quick task 260517-aa3（da18746）

### 进行中 (Active)

- [ ] v1.2 静态 web 宣传页：仓库内交付可发布页面，展示产品定位、支持平台、核心流程、隐私承诺与安装入口
- [ ] 将 Telegram live UAT / Phase 11-12 Nyquist partial 仅记录为已知风险，不纳入 v1.2 宣传页交付范围

### 不在范围 (Out of Scope)

- Firefox / Safari 适配 — v1 仅 Chromium MV3，避免分裂工程精力
- 云端同步配置 / 用户账户 — 本地存储足够覆盖个人使用，云同步推后
- 自建 IM 后端 / Server-to-Server 发送 — 走"新开 tab + 注入会话"路径，不引入服务器
- 内容 OCR / 图片附件抽取 — v1 只处理文本与基础 metadata，图片与 OCR 推后
- AI 内容总结 / 改写 — 用户自带 prompt 由下游 Agent 处理，扩展本身不调用 LLM
- v1.2 不补 Telegram live UAT / Phase 11-12 Nyquist partial — 仅作为已知风险记录，避免宣传页 milestone 混入扩展可靠性 closeout

### 推迟事项 (Deferred — v2 候选)

- 飞书/Lark 适配器重新评估（Phase 12 因共享 URL blocker dropped，需平台 API、稳定 chat identity 或新的目标定位方案）
- 其余 IM/协作平台分发：Google Chat、LINE、Microsoft Teams、Nextcloud Talk、Signal、WhatsApp、Zalo、QQ、WeCom
- 历史记录搜索 / 收藏管理界面
- 配置导入导出
- 自定义模板编辑器

## 上下文 (Context)

- **领域**：浏览器扩展 / Web Clipper / 多 IM 分发自动化
- **关键技术挑战**：将文本注入第三方 IM Web UI 的会话输入框并触发发送，对每个平台需要一份 content script 适配器；不同平台的 DOM、富文本编辑器（Slate/Lexical/contenteditable）差异大
- **关键参考**：OpenClaw Web UI 是用户自建的 Agent 平台，URL pattern 已知；Discord 使用 React + 自研富文本编辑器
- **本地化**：作者母语 zh_CN，目标用户至少覆盖 zh / en
- **存储**：所有持久化配置仅写入 `chrome.storage.local`（无云端、无后端）
- **已交付 v1.0**：313 commits, 11,399 LOC TypeScript/TSX, 225 单元测试, 7 phases / 41 plans
- **已交付 v1.1**：支持平台扩展到 OpenClaw / Discord / Slack / Telegram；27 plans 收尾，Feishu/Lark 经 UAT 证伪后不进入 shipped scope
- **v1.2 方向**：新增仓库内静态 web 宣传页，用于对外介绍产品、展示支持平台、说明隐私边界并承接安装入口；不改变扩展主链路
- **技术栈**：WXT 0.20.x + Preact 10.29 + @preact/signals + Tailwind v4 + Vitest 3 + Playwright 1.58

## 约束 (Constraints)

- **技术栈**：Chrome / Edge / Chromium MV3 (Manifest V3) — 必须基于 service worker，禁用持久化 background page
- **隐私**：扩展只在用户主动点击时抓取当前活动 tab；不上传内容到任何第三方分析服务
- **本地优先**：所有配置 / 历史 / 密钥仅落地在 `chrome.storage.local`，禁止默认上行
- **i18n**：所有 UI 文案必须走 `chrome.i18n` 或同等 i18n 框架，禁止硬编码字符串
- **发送通道**：通过新开/激活 tab + content script 注入目标会话输入框完成发送，不使用平台官方 Bot API（避免 token 管理与服务端依赖）
- **权限模型**：抓取走 `activeTab`；静态 `host_permissions` 仅声明已知公共平台域名；用户自部署 OpenClaw 与未来平台通过 `optional_host_permissions: ["<all_urls>"]` + 运行时 `chrome.permissions.request` 动态获取具体 origin 权限。静态 `host_permissions` 中禁止 `<all_urls>`

## Current State

**Shipped versions:**
- v1.0 — OpenClaw + Discord MVP
- v1.1 — 多渠道适配：Slack / Telegram + dispatch robustness hardening

**Current shipped platform set:** OpenClaw / Discord / Slack / Telegram

**Known closeout gaps:**
- Telegram 缺真实登录会话 headed UAT 证据
- Feishu/Lark 已正式 dropped，不属于当前 shipped scope

**Phase 16 complete (2026-06-16):** 发布验收与运营基线交付——`verify:claims` 跨源一致性校验器（self-enforcing CI gate）、marketing + claims CI wiring、a11y 收口（WR-08/09/02）、`MAINTENANCE.md` 维护路径 + `CHANGELOG [v1.2]` 诚实 Known Issues。2 项视觉 UAT（G201 glyph 渲染、responsive）待人工确认，已记入 `16-HUMAN-UAT.md`。

## Next Milestone Goals

- v1.2 聚焦“仓库内静态 web 宣传页”，交付可发布的产品介绍入口
- 页面必须覆盖：产品定位、核心流程、支持平台、隐私承诺、安装 / 获取入口
- Telegram live UAT 与 Phase 11-12 Nyquist partial 仅作为已知风险记录，不纳入 v1.2 交付范围

## 关键决策 (Key Decisions)

| 决策 | 理由 | 结果 |
| ---- | ---- | ---- |
| Chrome MV3 only（v1） | 用户首发只覆盖 Chrome；MV3 是 2025 年 Chromium 主推标准，Firefox/Safari 推后避免分散精力 | ✓ 验证：v1 全程 Chrome MV3，无兼容性阻塞 |
| MVP 仅集成 OpenClaw + Discord | 这两个平台的 URL pattern 已确定，可优先打通主链路；其余平台沉淀适配模式后批量补齐 | ✓ 验证：两个适配器均完整交付，`IMAdapter` 接口已被证明可复用 |
| 通过新开 tab + content script 注入消息（非 Bot API） | 不需要管理服务端 token / OAuth，符合"本地优先"约束，但需要为每个平台维护 DOM 适配器 | ✓ 验证：ClipboardEvent 粘贴注入 + property-descriptor setter 在 OpenClaw/Discord 均稳定工作 |
| 所有配置 `chrome.storage.local` | 隐私优先 + 单设备使用；云同步推到 v2 | ✓ 验证：全部 storage 写入走 typed repo，无直接 chrome.storage 调用 |
| Quality 模型档（GSD agents） | 项目核心抽象（适配器架构、i18n 边界）需要更深入的研究与规划 | ✓ 验证：7 phase / 46 plan / 47 req 全部完成 |
| send_to / prompt 绑定 + 历史 | 让重复任务一次配置反复使用，是 Core Value 的关键 UX | ✓ 验证：MRU 历史 + 绑定在 Phase 3 UAT 通过 |
| OpenClaw origin 走 `optional_host_permissions` 动态申请 | 用户自部署的 OpenClaw 落在任意域名 / IP+端口，无法在 manifest 静态枚举 | ✓ 验证：Phase 4 UAT 通过 |
| Registry-driven adapter architecture | 新平台只改适配器层，避免 pipeline / SW 扩散 | ✓ 验证：Slack / Telegram / Feishu 试验都未要求改 SW 主干 |
| Slack redirect host 单独声明可观测权限 | 最小权限面下修复 app.slack.com → slack.com 登录跳转检测 | ✓ 验证：Phase 10.1 regression 关闭 |
| Feishu/Lark 从 shipped scope 移除 | 共享 URL blocker 让 URL-based targeting 不可靠 | ✓ 验证：避免不稳定能力进入 v1.1 |
| v1.2 聚焦仓库内静态宣传页 | 当前 shipped platform set 已具备对外说明价值；宣传页应随扩展代码同仓维护，避免引入独立站点运维 | — Pending |

## 演进 (Evolution)

本文档在 phase 切换与 milestone 边界处更新。

---
*Last updated: 2026-06-16 after completing Phase 16 (release-acceptance-ops-baseline)*
