# Web2Chat

## What This Is

类似 Notion / Pocket / Obsidian Web Clipper 的 Chrome MV3 浏览器扩展。用户在任意网页点击图标后，扩展抓取页面结构化信息（title / url / description / create_at / content），结合用户预设的提示词（prompt），一键发送到目标 IM 会话或 AI Agent 会话。面向需要把"网上看到的内容"快速沉淀到知识库 / 团队聊天 / Agent 工作流的个人与小团队。

## Core Value

让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话——其余功能可以让步，这条主链路必须稳定可用。

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- v1 hypotheses. Building toward these. -->

- [ ] Chrome MV3 扩展骨架：manifest、popup、background service worker、content script
- [ ] 点击扩展图标弹出 popup，抓取并展示当前页面 `title` / `url` / `description` / `create_at` / `content`
- [ ] popup 提供 `send_to`（IM channel）输入：下拉历史记录、根据填写内容识别 IM 平台并展示对应 icon
- [ ] popup 提供 `prompt` 输入：自动按历史记录提示，与 `send_to` 绑定，切换 `send_to` 时自动切换 prompt
- [ ] 用户点击"确认"后：新开 tab / 唤起本地应用，导航到目标会话并把格式化信息 + prompt 发送到该会话
- [ ] MVP 渠道：OpenClaw Web UI（`http://localhost:18789/chat?session=agent:<agent_name>:<session_name>`）
- [ ] MVP 渠道：Discord Web（`https://discord.com/channels/<server_id>/<channel_id>`）
- [ ] i18n 国际化：至少支持 zh / en，可扩展
- [ ] 全部配置（历史 send_to、prompt、语言、模板）本地存储于 `chrome.storage.local`

### Out of Scope

<!-- 显式排除范围与理由 -->

- Firefox / Safari 适配 — v1 仅 Chromium MV3，避免分裂工程精力
- 云端同步配置 / 用户账户 — 本地存储足够覆盖个人使用，云同步推后
- 自建 IM 后端 / Server-to-Server 发送 — 走"新开 tab + 注入会话"路径，不引入服务器
- 内容 OCR / 图片附件抽取 — v1 只处理文本与基础 metadata，图片与 OCR 推后
- AI 内容总结 / 改写 — 用户自带 prompt 由下游 Agent 处理，扩展本身不调用 LLM

### Deferred (v2 候选)

<!-- 已知未来要做的扩展，但不在 MVP -->

- 其余 IM/协作平台分发：Feishu、Lark、Google Chat、LINE、Microsoft Teams、Nextcloud Talk、Signal、Slack、Telegram、WhatsApp、Zalo、QQ、WeCom
- 历史记录搜索 / 收藏管理界面
- 配置导入导出
- 自定义模板编辑器

## Context

- **领域**：浏览器扩展 / Web Clipper / 多 IM 分发自动化
- **关键技术挑战**：将文本注入第三方 IM Web UI 的会话输入框并触发发送，对每个平台需要一份 content script 适配器；不同平台的 DOM、富文本编辑器（Slate/Lexical/contenteditable）差异大
- **关键参考**：OpenClaw Web UI 是用户自建的 Agent 平台，URL pattern 已知；Discord 使用 React + 自研富文本编辑器
- **本地化**：作者母语 zh_CN，目标用户至少覆盖 zh / en
- **存储**：所有持久化配置仅写入 `chrome.storage.local`（无云端、无后端）

## Constraints

- **Tech stack**：Chrome / Edge / Chromium MV3 (Manifest V3) — 必须基于 service worker，禁用持久化 background page
- **隐私**：扩展只在用户主动点击时抓取当前活动 tab；不上传内容到任何第三方分析服务
- **本地优先**：所有配置 / 历史 / 密钥仅落地在 `chrome.storage.local`，禁止默认上行
- **i18n**：所有 UI 文案必须走 `chrome.i18n` 或同等 i18n 框架，禁止硬编码字符串
- **发送通道**：通过新开/激活 tab + content script 注入目标会话输入框完成发送，不使用平台官方 Bot API（避免 token 管理与服务端依赖）

## Key Decisions

| Decision                                             | Rationale                                                                                | Outcome   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------- |
| Chrome MV3 only（v1）                                | 用户首发只覆盖 Chrome；MV3 是 2025 年 Chromium 主推标准，Firefox/Safari 推后避免分散精力 | — Pending |
| MVP 仅集成 OpenClaw + Discord                        | 这两个平台的 URL pattern 已确定，可优先打通主链路；其余平台沉淀适配模式后批量补齐        | — Pending |
| 通过新开 tab + content script 注入消息（非 Bot API） | 不需要管理服务端 token / OAuth，符合"本地优先"约束，但需要为每个平台维护 DOM 适配器      | — Pending |
| 所有配置 `chrome.storage.local`                      | 隐私优先 + 单设备使用；云同步推到 v2                                                     | — Pending |
| Quality 模型档（GSD agents）                         | 项目核心抽象（适配器架构、i18n 边界）需要更深入的研究与规划                              | — Pending |
| send_to / prompt 绑定 + 历史                         | 让重复任务（如"沉淀到知识库 Agent"）一次配置反复使用，是 Core Value 的关键 UX            | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-04-28 after initialization_
