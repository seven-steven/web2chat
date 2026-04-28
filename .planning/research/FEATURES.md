# Feature Research

**Domain:** Chrome MV3 Web Clipper 扩展，抓取结构化页面数据 + 用户自定义 prompt 并投递到 IM / AI-Agent 网页聊天会话
**Researched:** 2026-04-28
**Confidence:** HIGH（必备项 (table stakes)、反特性、MVP），MEDIUM（各平台 DOM 可行性 —— 取决于每个平台的编辑器是否在版本间发生变化）

## Feature Landscape

### Table Stakes (Users Expect These)

用户默认存在的功能。缺失这些 = 产品感觉不完整或不可用。

| Feature                                                                             | Why Expected                                                                                                                       | Complexity | Notes                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 点击弹出 popup，预览当前页面元数据（`title` / `url` / `description` / `create_at`） | 由 Notion / Pocket / Obsidian Web Clipper 设定的模式 —— popup 是该品类的通用 UX                                                    | 低         | 在 content script 中读取 OG/Twitter/JSON-LD/`<meta name="description">`；回退链 `og:title → <title>`、`og:description → <meta name="description">`、`article:published_time → 页面加载时间`                 |
| 高质量正文提取（Readability）                                                       | Obsidian、MarkDownload、Joplin、Pocket 都使用 Mozilla Readability —— 没有它，抓取的 `content` 会塞满导航/广告/页脚                 | 低         | `@mozilla/readability` 是事实标准，MIT 协议，完全在客户端运行，约 120KB。与 Firefox Reader View 同款引擎。需要：克隆一份 `document` 到 `iframe` 中喂给 Readability，避免污染当前页面                        |
| `send_to` 输入框，按 URL 模式识别平台并显示匹配图标                                 | 用户必须一眼看出"这个目的地是 Discord / OpenClaw / Telegram"；否则会担心发错地方                                                   | 低         | 简单的 URL 正则注册表映射：`https://discord.com/channels/*` → Discord，`http://localhost:18789/chat?session=*` → OpenClaw 等。每个平台适配器贡献一条记录                                                    |
| `send_to` 历史记录 + 自动补全下拉（MRU + 频率）                                     | 95% 的时间用户都在选择相同的 3–5 个目的地 —— 每次都要输入 URL 是无法接受的                                                         | 低         | Spotlight 风格排序：按前缀的最近使用 + 选择频率混合排名。在聚焦时显示前 5–10 条（零状态）。禁用浏览器自动填充（`autocomplete="off"` + 随机 `id`）以防止双层下拉                                             |
| `send_to` ↔ `prompt` 绑定，自动切换                                                 | 在 PROJECT.md 中列为 MVP；匹配 Save to Notion / Bookmark Assistant 的"保存到 X 并使用模板 Y"的模式                                 | 低         | 存储结构：`{ send_to_url: { prompt: string, lastUsed: ts, useCount: int } }`。切换 `send_to` 时触发 `prompt` 字段替换                                                                                       |
| `prompt` 字段 + 历史自动补全                                                        | 用户会重复使用相同的 prompt（"summarize this"、"save to KB"）；每次都要输入会让价值主张失效                                        | 低         | 与 `send_to` 相同的 MRU 模式。独立的历史表 —— `send_to` 全新时也会暴露                                                                                                                                      |
| i18n（至少 zh / en）                                                                | 作者是 zh_CN；现代扩展通常发布 4+ 个语言（Obsidian Clipper 在 v1.x 增加了 pt-BR、id、ko、zh-Hant）；只支持 zh 或只支持 en 显得狭隘 | 低         | `chrome.i18n` + `_locales/{en,zh_CN}/messages.json`。使用具名占位符（`$URL$`），不要使用位置占位符。UI 模板必须使用 `__MSG_xxx__` 或 `chrome.i18n.getMessage()` —— 不允许硬编码字符串（按 PROJECT.md 约束） |
| 仅本地存储（`chrome.storage.local`）                                                | PROJECT.md 硬性约束；匹配 Obsidian Clipper "100% 隐私，所有抓取内容存于本地"的定位                                                 | 低         | 所有配置 / 历史 / 模板均在 `chrome.storage.local`。不使用 `chrome.storage.sync`，不使用远程端点                                                                                                             |
| 当目标 tab 无法接受注入时优雅失败                                                   | 如果用户的 Discord tab 处于已注销、语音频道或 DM 选择器状态 —— 扩展必须明示，而不是默默失败                                        | 中         | 每个适配器暴露一个 `canDispatch(tab) → {ready: bool, reason: string}` 探测。在 popup 中展示原因并提供重试按钮。常见情况：编辑器未挂载、用户未登录、频道 ID 不匹配                                           |
| 投递确认反馈                                                                        | 用户点击"确认"后，需要在约 2 秒内看到成功/失败 —— Notion 显示 toast，Obsidian 打开已保存笔记等                                     | 低         | 适配器返回 `Result<{messageNode, ts}, Error>`。Popup 在成功时显示 ✓ + 1 秒后自动关闭，失败时显示带重试的错误横幅                                                                                            |
| Manifest V3 service-worker 合规                                                     | Chrome Web Store 已不再接受 MV2（按官方文档）                                                                                      | 中         | `manifest_version: 3`，无持久 background，所有定时器经由 `chrome.alarms`，所有 DOM 工作放在 content scripts。对需要页面上下文访问的编辑器使用 `chrome.scripting.executeScript({world:"MAIN"})`              |
| 打开 popup 的键盘快捷键                                                             | 所有主流 clipper 都暴露此项（Obsidian：可配置；Notion：⌥⇧C）。每天抓取 20+ 次的用户必需                                            | 低         | manifest 中的 `commands` API，使用 `_execute_action` 默认建议键位                                                                                                                                           |

### Differentiators (Competitive Advantage)

让 Web2Chat 与众不同的功能。这些与 Core Value 一致："一键 → 格式化 + prompt → IM/Agent 会话"。

| Feature                                                          | Value Proposition                                                                                                                                                                     | Complexity | Notes                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `send_to` ↔ `prompt` 绑定（同上）—— 但带有**按目的地的消息模板** | 相比 Notion（仅有数据库选择器）和 Obsidian（有按站点模式的模板，但无 IM 投递）的最大差异。允许用户表示"发到 Discord 频道 X，格式化为 `**[{title}]({url})**\n{prompt}\n>>> {summary}`" | 中         | 类似 Obsidian Clipper 的模板引擎，提供 `{{title}}`、`{{url}}`、`{{content}}`、`{{description}}`、`{{date}}`、`{{prompt}}` 变量。内置每个平台的默认模板（Discord 使用 markdown，Slack 使用 mrkdwn，OpenClaw 使用纯文本 + JSON 围栏元数据） |
| 基于检测到的页面类型进行智能 prompt 推荐                         | 食谱页面 → "保存到食谱 Agent"；新闻文章 → "总结并发布"；GitHub 仓库 → "加入开发笔记"。当 Obsidian Clipper 推出"按 URL 模式自动应用模板"时这种感觉很神奇                               | 中         | 通过 Schema.org `@type` + URL 启发式探测页面类型。推荐用户对相同页面类型曾经使用过的 prompt，按频率排序。严格本地 —— 不调用 LLM（按 PROJECT.md 反特性）                                                                                   |
| 多目标分发（一次抓取 → N 个目的地）                              | 没有任何参考 clipper 把这件事做好。对于"把这篇文章同时分享到我的 AI Agent 和团队 Discord"是杀手级                                                                                     | 中         | UI：可勾选的已保存目的地列表。Background 顺序排队 N 次投递（并行分发会有限流和 tab 抖动风险）。用户能看到每个目标的进度                                                                                                                   |
| 投递失败时的队列 + 重试                                          | Web 应用 DOM 很脆弱（Discord 重新渲染 Slate 树、Slack 切换编辑器、Telegram K 与 Z 不一致）。没有重试，体验就是"点击、静默失败、丢失抓取"                                              | 中         | Background service-worker 维护一个 `{clipId, target, attempts}` 队列。指数退避（1s、4s、16s，3 次后进死信队列）。持久化到 `chrome.storage.local`，使 SW 重启不会丢弃抓取                                                                  |
| 页面区域抓取（选区 / 元素拾取器）                                | Pocket "save selection"、Obsidian highlight + clip —— 在 clipping 中是必备项，但在 send-to-chat 领域是**差异化项**，因为没有任何 chat-share 扩展支持                                  | 中         | 两种模式：(a) 用户预先选择则使用 `window.getSelection()`；(b) 类似 React DevTools / Obsidian 高亮器的"拾取元素"覆盖层。区域替换 `content` 字段，整页元数据仍附带                                                                          |
| 原生应用深度链接回退                                             | 当用户偏好 `tg://resolve?domain=foo` 或 `slack://channel?team=T&id=C` 而不是 web 注入。某些 IM（尤其是 Telegram）的 web 鉴权不稳定                                                    | 中         | 每个适配器可选 `deepLink(target)` 返回自定义协议 URL。通过 `chrome.tabs.create({url})` 打开。注意：大多数原生协议无法预填消息体 —— 退化为"打开聊天，手动粘贴"                                                                             |
| 历史批量导出（JSON / Markdown）                                  | "我想要我的数据" —— 隐私优先 clipper 社区的常见诉求。便宜易做且体现信任感                                                                                                             | 低         | 单按钮 → `chrome.storage.local` 形态的 blob 下载，或渲染后的 Markdown（`# {title}\n{url}\n{date}\n\n{content}`）                                                                                                                          |
| 按平台诊断（"为什么没发出去？"）                                 | DOM 注入失败原因不透明（Slate 忽略事件、频道 ID 过期、登录失效）。内置诊断页面显示最近 5 次失败及捕获到的原因可建立巨大用户信任                                                       | 低         | 适配器错误携带 `code`（如 `EDITOR_NOT_FOUND`、`LOGIN_REQUIRED`、`CSP_BLOCKED`）；在"关于 / 状态"popup 标签中展示                                                                                                                          |
| 自托管 / OpenClaw 一等支持                                       | OpenClaw 不是家喻户晓的名字 —— 第一天就成为它的原生 clipper 即可独占该受众。其 URL 模式在 PROJECT.md 中已记录且稳定                                                                   | 低         | 自带默认 OpenClaw 适配器，使用众所周知的端口 `18789` 和可发现的 session URL 模式。其他 clipper 甚至不知道 OpenClaw 存在                                                                                                                   |
| 适配器 SDK / 可插拔平台包                                        | 让用户（或社区）可在不 fork 扩展的情况下添加 `Mattermost`、`RocketChat`、`Element/Matrix`                                                                                             | 高         | 稳定的适配器契约：`{matchUrl(url), canDispatch(tab), dispatch(tab, payload), deepLink?(target)}`。v1.x 候选；非 MVP                                                                                                                       |

### Anti-Features (Commonly Requested, Often Problematic)

看似有用但与 Core Value、隐私立场或 MV3 约束冲突的功能。PROJECT.md 显式排除其中大多数 —— 此表记录*为什么*。

| Feature                                                                              | Why Requested                 | Why Problematic                                                                                                                                                                                                                                                | Alternative                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 配置 / 历史的云同步                                                                  | "我有 3 台机器"               | 增加账户系统 + 后端 + GDPR 风险面；PROJECT.md 硬性排除；用户可通过导出/导入自行实现                                                                                                                                                                            | 手动导出/导入 JSON（如上 v1.x 差异化项之一）。未来 v2 可考虑用户自管 WebDAV / Nextcloud 同步 —— 永远不是我们的云                                                              |
| 在扩展内做 AI 总结                                                                   | "在发送前先总结一下"          | 把扩展拖进 LLM key 管理地狱，引发隐私警示，与下游 Agent 的工作重复（Core Value："用户提供 prompt → 下游 Agent 做 AI 工作"）                                                                                                                                    | 让目的地 Agent（OpenClaw、Claude、ChatGPT）来总结。扩展只投递原始内容 + prompt                                                                                                |
| 服务端机器人账号 / 官方 Bot API                                                      | "可靠，不会因为 DOM 变化而坏" | 需要 token 管理、OAuth 流程、服务端基础设施 → 违反"无后端"约束。WhatsApp、Slack、Teams、Feishu、WeCom 都要求带企业域名绑定凭证的认证 app 注册。WhatsApp 明确禁止使用非官方自动化的账号 —— 但风险针对的是批量/垃圾模式；用户驱动的单条消息 clipper 处于不同范畴 | 坚持使用 content-script 注入 + tab 驱动的 UX。对于注入不可行的平台（WhatsApp 风险巨大、Signal 完全没有 web 客户端），明确标记为不支持，并推荐深度链接"打开聊天，自行粘贴"回退 |
| OCR / 图片内容提取                                                                   | "我想抓取 Twitter 截图"       | OCR 流水线巨大（Tesseract WASM ~10MB），准确率一般，且图片抓取是 v2 问题；PROJECT.md 已排除                                                                                                                                                                    | v2：原样传递图片 URL；下游 Agent 做视觉处理                                                                                                                                   |
| RSS 聚合 / 定时抓取                                                                  | "每小时抓一次首页"            | 这是 feed reader，不是 clipper。范围爆炸性蔓延；与 `chrome.alarms` 配额和"用户主动点击"的隐私立场冲突                                                                                                                                                          | 不在范围内。建议用户使用专用阅读器（Inoreader、Feedbin）                                                                                                                      |
| 群发到大量联系人 / 频道                                                              | "我想广播"                    | 触发 WhatsApp 反垃圾 ML（按 Malwarebytes 2025 关于 131 个被禁扩展的报告）；把整个产品打入"垃圾软件"类别并面临 Chrome Web Store 下架风险                                                                                                                        | 多目标分发是可以的（3–5 个目的地），但显式设置上限并文档化非垃圾意图。不允许 CSV 联系人 UI、不允许定时                                                                        |
| 通过官方 API 进行服务器到服务器发送（Discord webhook、Feishu open API、WeCom robot） | "比 DOM 更可靠"               | 每个平台都需要按用户管理 secret；PROJECT.md 约束是"无 token 管理"。也违背了零配置的简单 UX                                                                                                                                                                     | v1 不做。可作为 v2 选择性的*高级用户*模式，由用户粘贴自己的 webhook URL —— 但永远不是默认                                                                                     |
| Firefox / Safari 移植（v1）                                                          | "我用 Firefox"                | PROJECT.md 明确 v1=仅 Chromium，避免精力分散。2026 年 Chrome 与 Firefox 的 Manifest V3 差异并非微不足道（背景脚本 vs service workers，`scripting.executeScript` 的能力差距）                                                                                   | v2 候选，等 MV3 尘埃落定后。WebExtension API 大体兼容 —— 移植工作量适中，但不是零                                                                                             |

## Feature Dependencies

```
[Click-to-popup]
    ├─requires─> [MV3 service worker + manifest]
    └─requires─> [Content script for DOM read]
                       │
                       ├─requires─> [Readability extraction]
                       └─requires─> [OG/Schema.org/JSON-LD parser]

[send_to input + platform recognition]
    └─requires─> [Platform adapter registry] ── matchUrl()
                       │
                       └─enables──> [Per-platform message templates]
                                          │
                                          └─enables──> [Smart prompt suggestions]

[send_to history MRU]
    ├─requires─> [chrome.storage.local schema]
    └─enables──> [send_to ↔ prompt binding]
                       │
                       └─enables──> [Auto-switch prompt on send_to change]

[Confirm / dispatch]
    ├─requires─> [Adapter.dispatch(tab, payload)]
    │                  │
    │                  ├─requires─> [Tab activation / new tab logic]
    │                  └─requires─> [chrome.scripting.executeScript world:MAIN]
    │
    ├─enables──> [Dispatch confirmation UI]
    └─enables──> [Queue + retry on failure]
                       │
                       └─enables──> [Multi-target fan-out]
                                          │
                                          └─enables──> [Per-target diagnostics]

[i18n]
    └─requires─> [_locales/{en,zh_CN}/messages.json + manifest default_locale]
                       │
                       └─required-by─> [ALL UI text — popup, options, errors, history]

[Page-region clipping]
    ├─enhances──> [content extraction]
    └─requires─> [content script overlay UI for element picker]

[Native app deep-link]
    └─alternative-to──> [Adapter.dispatch via DOM injection]
        (mutually exclusive per dispatch — fall back to deep-link if dispatch unsupported)

[Bulk export]
    └─requires─> [chrome.storage.local schema stable]

[Adapter SDK]
    └─requires─> [Stable Adapter contract] ── frozen after 3+ first-party adapters
```

### Dependency Notes

- **平台识别需要采用注册表模式，而不是硬编码 if/else** —— 在 v2 中加入 Telegram 应该意味着新增一个适配器文件，而不是改 4 处。这一决定对 v2 的 IM 列表（Feishu、Lark、Google Chat、LINE、Teams、Nextcloud Talk、Signal、Slack、Telegram、WhatsApp、Zalo、QQ、WeCom）至关重要。
- **每平台模板依赖于适配器注册表** —— 每个适配器贡献其默认模板；用户覆盖项以适配器 ID 为键存于 `chrome.storage.local`。
- **队列 + 重试必须持久化到存储** —— MV3 中 service worker 在闲置约 30 秒后被终止；内存队列会丢失抓取。使用 `chrome.storage.local` 作为队列后端存储，并通过 `chrome.alarms` 唤醒。
- **多目标分发与限流检测冲突** —— 5 秒内向 5 个 Discord 频道发送会触发 Discord 客户端限流。投递间隔 ≥1.5s。不要发布并行分发。
- **i18n 是基础项** —— 之后再加意味着重写每条 popup 字符串；PROJECT.md 强制要求。从第一天起就纳入 v1.0。
- **content script ↔ service worker 消息传递无处不在必需** —— popup → SW（`chrome.runtime.sendMessage`）、SW → content script（`chrome.tabs.sendMessage`）、content script → MAIN-world 注入（带 origin 校验的 `window.postMessage`）。任何非平凡的投递都需要这三段（已由 Chrome MV3 文档与 Duo Security 消息传递安全建议确认）。

## Per-IM-Platform Feasibility (V2 Roadmap Reality Check)

MVP 目标是 **OpenClaw** + **Discord**，因为它们的 URL 模式稳定且编辑器有充分文档。v2 列表比看起来更难。此表告诉路线图哪些平台便宜、昂贵或不可能。

定义：

- **DOM injection** —— content-script + MAIN-world 注入在消息编辑器中设置文本并触发发送。无 token。
- **Native protocol / deep-link only** —— 打开聊天窗口由用户粘贴；无自动发送。
- **Official API** —— 需要按用户提供 token / webhook / OAuth —— 按 PROJECT.md 显式排除。

| Platform                                        | URL Pattern                                                                           | Editor Tech                                       | Content-Script Injection?              | Complexity     | Notes                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenClaw**                                    | `http://localhost:18789/chat?session=agent:<a>:<s>`                                   | 由作者控制（很可能是 contenteditable / textarea） | **YES** —— 第一方应用，稳定            | **低**         | MVP。我们控制页面，可植入小巧的 postMessage 握手让注入异常可靠                                                                                                                                                                                                                                              |
| **Discord**                                     | `https://discord.com/channels/<server>/<channel>`                                     | Slate (React)                                     | **YES** —— 文档充分                    | **中**         | MVP。Slate 需要从 MAIN world 派发带 `inputType:"insertText"` 的 `InputEvent`；class 名混淆，必须使用 `role="textbox"` / `aria-label="Send Message"` 选择器。属于 self-bot 灰色地带 —— 用户触发的单条消息可被容忍；批量会被封                                                                                |
| **Telegram Web (K + Z)**                        | `https://web.telegram.org/k/#@<peer>` (K) / `/z/#@<peer>` (Z)                         | 自定义 contenteditable（K），与 MTProto 绑定      | **YES** —— 已有 userscripts 验证可用   | **中**         | 两套客户端（K 和 Z），DOM 不同 —— 适配器必须检测当前是哪一个。`.input-message-input` 元素 + InputEvent + Enter keydown 是已确立的模式                                                                                                                                                                       |
| **Slack**                                       | `https://app.slack.com/client/<team>/<channel>`                                       | Quill（按 Slack Markdown Proxy 扩展）             | **YES** —— Slack Markdown Proxy 已证明 | **中**         | 在 MAIN world 中使用 Quill Delta API（`editor.clipboard.dangerouslyPasteHTML` 或 `editor.insertText`）。通过 Enter keydown 发送。注意：之前关于"Slack 使用 Lexical"的假设按当前证据是错的                                                                                                                   |
| **Microsoft Teams**                             | `https://teams.microsoft.com/v2/...` 与 `https://teams.live.com/v2/...`               | Fluent UI 富文本（专有）                          | **YES，但麻烦**                        | **高**         | 编辑器封装严重，频繁重新渲染。Microsoft 官方推荐路径是"Message Extensions"（服务器端应用）—— 按 PROJECT.md 显式反特性。DOM 路径脆弱；预留额外 QA 预算                                                                                                                                                       |
| **Google Chat**                                 | `https://chat.google.com/u/0/#chat/dm/<id>` 或 `/space/<id>`                          | 自定义 contenteditable                            | **MAYBE**                              | **高**         | 重 CSP 与频繁的 DOM 抖动。Google 推荐路径是 Workspace Add-on（服务端）。DOM 注入实际可用（如 Chat Plus 扩展），但经常坏。标记为"尽力而为"                                                                                                                                                                   |
| **Feishu / Lark**                               | `https://www.feishu.cn/messenger/...`（CN） / `https://www.larksuite.com/...`（intl） | 自定义富文本                                      | **MAYBE**                              | **高**         | 没有公开证据表明社区有 DOM 注入扩展；所有文档/SDK 都走官方 Open Platform API。需要逆向。两个 URL host（feishu.cn 与 larksuite.com）但编辑器相同。两个区域都要测试                                                                                                                                           |
| **LINE**                                        | `https://line.me/...`（web 客户端覆盖有限）                                           | —                                                 | **NO**（实际上）                       | —              | LINE 没有功能完整的 web 客户端 —— `line.me` 主要是营销/登录。真实聊天在原生 app 上。退而使用深度链接 `line://msg/text/...`（URL scheme，打开原生 app，无自动发送）                                                                                                                                          |
| **WhatsApp Web**                                | `https://web.whatsapp.com/`                                                           | 类似 Lexical 的自定义编辑器                       | **技术上可以，政治上不行**             | **高（风险）** | DOM 注入可用（文档充分）。但 WhatsApp 在 2025 年的执法行动主动检测扩展的 DOM 变更 —— Malwarebytes/Socket 报告 131 个扩展被封。用户触发的单条发送比批量风险低，但仍会被标记。**建议：仅深度链接（`https://wa.me/<num>?text=<encoded>`）—— 打开聊天并预填文本，由用户手动点击发送。**将该选择记录为反封禁立场 |
| **Zalo**                                        | `https://chat.zalo.me/`                                                               | 自定义 contenteditable                            | **YES**                                | **中**         | 已由 `zlapi` 参考确认；完整自动化存在 cookie/IMEI 握手，但 DOM 注入不需要它也能工作。ToS 警告反对非官方自动化 —— 与 WhatsApp 立场相同，建议优先深度链接（如可用），DOM 注入作为可选项                                                                                                                       |
| **Telegram (native via deep-link)**             | `tg://resolve?domain=<peer>`                                                          | —                                                 | **NO**（原生）                         | **低**         | 无法普遍预填文本 —— 仅 `https://t.me/<peer>?text=<msg>` 对部分链接类型有效。在 Web 失败时作为回退有用                                                                                                                                                                                                       |
| **Signal**                                      | 无（按设计无 web 客户端）                                                             | —                                                 | **不可能**                             | —              | Signal 明确不发布 web 客户端（安全立场 —— 不远程加载 JS）。桌面 Electron 应用对浏览器扩展不可达。**标记为不支持，文档化原因。**建议 `signal://` 深度链接或"复制到剪贴板，粘贴到 Signal Desktop" —— 这是天花板                                                                                               |
| **Nextcloud Talk**                              | `https://<host>/call/<token>`                                                         | 自定义 contenteditable                            | **MAYBE**                              | **中**         | 自托管 → 不同发布版本间 DOM 变化更小。但*官方推荐*路径是 `/ocs/v2.php/apps/spreed/api/v1/chat/{token}` 的 bot/webhook REST API —— 不在范围内。DOM 注入可行；以尽力而为方式发布                                                                                                                              |
| **WeCom (企业微信)**                            | Web 客户端基本停用；用户使用原生 app                                                  | 自定义富文本                                      | **NO**（实际上）                       | —              | Web 客户端已逐步停用，转而采用原生 + iframe 宿主中的 JS-SDK 模型。JS-SDK 仅在已 ICP 备案的可信域名上工作。在 v2 中标记不支持；通过"使用原生 app + 剪贴板"回退记录                                                                                                                                           |
| **QQ**                                          | 无第一方网页聊天客户端（`qzone.qq.com` 仅 feed）                                      | —                                                 | **NO**                                 | —              | 腾讯从未发布过真正的 web QQ 聊天。仅原生。标记不支持                                                                                                                                                                                                                                                        |
| **Mattermost / Rocket.Chat / Element (Matrix)** | 自托管 URL 各异                                                                       | 自定义（各异）                                    | **YES**                                | **中**         | 不在 PROJECT.md v2 列表中，但是天然的社区适配器候选。三者都有充分的 DOM 文档与稳定选择器。延后到社区适配器 SDK（v1.x 差异化项）                                                                                                                                                                             |

### Feasibility Summary

- **已确认可通过 DOM 注入发布（V1 / 早期 V2）：** OpenClaw、Discord、Telegram Web、Slack、Zalo
- **可以但代价高 / 脆弱：** Microsoft Teams、Google Chat、Feishu/Lark、Nextcloud Talk
- **建议仅深度链接（不自动发送）：** WhatsApp Web（封禁风险）、LINE（无 web）、Telegram 原生回退
- **不支持，记录原因：** Signal（无 web 客户端）、WeCom（web 已停用）、QQ（无 web 聊天）
- **对路线图的含义：** v2 应拆分为两层 —— "Tier-A 已确认 DOM"（先做 Telegram + Slack，因为它们用户基数大且自动化模式有文档）与"Tier-B 尽力而为"（Teams、Google Chat、Feishu/Lark —— 顺序排期，不并行，以管理 QA 负担）。

## MVP Definition

### Launch With (v1.0)

最小可行产品 —— 验证 Core Value（一键 → 格式化 + prompt → IM/Agent 会话）所需。

- [ ] **MV3 manifest + service worker + popup + content-script 骨架** —— 一切的基础
- [ ] **点击弹出 popup 并预览元数据**（`title` / `url` / `description` / `create_at` / 通过 Readability 提取的 `content`）—— popup 即产品
- [ ] **`send_to` 输入框**，按 URL 模式识别平台图标（已注册 OpenClaw + Discord）
- [ ] **`send_to` 历史**，带 MRU 自动补全下拉
- [ ] **`prompt` 输入框**，带历史自动补全
- [ ] **`send_to` ↔ `prompt` 绑定**（切换 send_to 时自动切换 prompt）—— Core Value 差异化项
- [ ] **OpenClaw 适配器** —— `http://localhost:18789/chat?session=agent:<a>:<s>` 注入
- [ ] **Discord 适配器** —— `https://discord.com/channels/<g>/<c>` 注入（Slate 编辑器）
- [ ] **确认按钮投递** —— 打开/激活目标 tab，运行适配器，显示成功/错误
- [ ] **优雅失败处理** —— 适配器 `canDispatch` 探测，错误原因在 popup 中展示
- [ ] **i18n：en + zh_CN** —— `chrome.i18n` + `_locales`
- [ ] **所有持久化在 `chrome.storage.local`** —— 带版本号的 schema 以便迁移
- [ ] **键盘快捷键**（默认建议，用户可重新绑定）

### Add After Validation (v1.x)

核心投递可靠后追加的功能。

- [ ] **每平台消息模板**（默认 + 用户覆盖）—— 一旦有 2 个适配器，我们就有真实的模板差异信号
- [ ] **投递失败时的队列 + 重试** —— 触发条件：用户报告任何静默失败
- [ ] **多目标分发（≤5 个目的地）** —— 触发条件：用户请求"发到我的 Agent 和团队 Discord"
- [ ] **页面区域抓取**（选区模式 + 元素拾取器）—— 触发条件：抓取整页噪音过高的新闻文章或长页面
- [ ] **历史批量导出**（JSON / Markdown）—— 实现轻松，建立隐私信任
- [ ] **诊断页面**（"为什么没发出去？"）—— 触发条件：支持问题积累
- [ ] **更多 i18n 语言** —— 至少：ja、ko、pt-BR（Obsidian Clipper 加这些后用户量上升）
- [ ] **按页面类型的智能 prompt 推荐** —— 一旦历史有信号（Schema.org @type → 历史 prompt）
- [ ] **每个适配器的原生深度链接回退** —— 用于 DOM 注入不可靠的平台

### Future Consideration (v2+)

在产品市场契合度建立之前推迟的功能。

- [ ] **Tier-A IM 平台经 DOM 注入：** Telegram Web、Slack、Zalo
- [ ] **Tier-B IM 平台（尽力而为）：** Microsoft Teams、Google Chat、Feishu/Lark、Nextcloud Talk
- [ ] **仅深度链接平台：** WhatsApp Web（深度链接 `https://wa.me/...?text=`）、LINE（`line://...`）
- [ ] **适配器 SDK** 用于社区贡献的平台（Mattermost、Rocket.Chat、Element/Matrix）
- [ ] **自定义模板编辑器 UI**（PROJECT.md 推迟章节）
- [ ] **历史搜索 / 收藏视图**（PROJECT.md 推迟章节）
- [ ] **配置导入/导出**（PROJECT.md 推迟章节）
- [ ] **Firefox / Edge 移植**（在 WebExtension 一致性审计后）
- [ ] **用户管理的 webhook 发送**（针对 Discord webhook、Feishu robot、Nextcloud bot 的可选高级用户模式 —— 仅在用户明确开启并提供自己的 URL 时）

## Feature Prioritization Matrix

| Feature                               | User Value         | Implementation Cost | Priority |
| ------------------------------------- | ------------------ | ------------------- | -------- |
| MV3 骨架 + popup + content script     | 高（基础）         | 中                  | **P1**   |
| 元数据预览（Readability + OG/Schema） | 高                 | 低                  | **P1**   |
| `send_to` 平台识别 + 图标             | 高                 | 低                  | **P1**   |
| `send_to` 历史 + MRU 自动补全         | 高                 | 低                  | **P1**   |
| `prompt` 历史 + 自动补全              | 高                 | 低                  | **P1**   |
| `send_to` ↔ `prompt` 绑定             | 高（Core Value）   | 低                  | **P1**   |
| OpenClaw 适配器                       | 高                 | 低                  | **P1**   |
| Discord 适配器                        | 高                 | 中                  | **P1**   |
| 投递确认 + 错误 UX                    | 高                 | 中                  | **P1**   |
| i18n（en + zh_CN）                    | 高（约束）         | 低                  | **P1**   |
| 仅本地存储                            | 高（约束）         | 低                  | **P1**   |
| 键盘快捷键                            | 中                 | 低                  | **P1**   |
| 每平台消息模板                        | 高                 | 中                  | **P2**   |
| 队列 + 重试                           | 高                 | 中                  | **P2**   |
| 多目标分发                            | 中                 | 中                  | **P2**   |
| 页面区域抓取                          | 中                 | 中                  | **P2**   |
| 历史批量导出                          | 中                 | 低                  | **P2**   |
| 诊断页面                              | 中                 | 低                  | **P2**   |
| 智能 prompt 推荐                      | 中                 | 中                  | **P2**   |
| 原生深度链接回退                      | 中                 | 中                  | **P2**   |
| Telegram Web 适配器                   | 高                 | 中                  | **P2**   |
| Slack 适配器                          | 高                 | 中                  | **P2**   |
| Microsoft Teams 适配器                | 中                 | 高                  | **P3**   |
| Google Chat 适配器                    | 中                 | 高                  | **P3**   |
| Feishu / Lark 适配器                  | 中（CN 市场）      | 高                  | **P3**   |
| 仅 WhatsApp 深度链接                  | 中                 | 低                  | **P3**   |
| 适配器 SDK                            | 低（适配器稳定前） | 高                  | **P3**   |
| 自定义模板编辑器 UI                   | 中                 | 中                  | **P3**   |
| Firefox / Edge 移植                   | 低（v1 受众）      | 中                  | **P3**   |

**Priority key:**

- **P1**：v1 发布必备 —— 由 PROJECT.md MVP 定义
- **P2**：应有，在 v1 稳定并验证后追加（v1.x）
- **P3**：可有可无，未来考虑（v2+）

## Competitor Feature Analysis

| Feature              | Notion Web Clipper           | Obsidian Web Clipper                          | Pocket / Save to Pocket | MarkDownload         | Web2Chat (our plan)                        |
| -------------------- | ---------------------------- | --------------------------------------------- | ----------------------- | -------------------- | ------------------------------------------ |
| Popup 元数据预览     | 极简（仅工作区 + DB 选择器） | 丰富（来自 Readability 的 title/byline/date） | 标签 + 标题预览         | 标题 + Markdown 预览 | **丰富预览 + send_to + prompt —— 面向 IM** |
| 正文提取             | 是（专有）                   | **Mozilla Readability**                       | 是（专有，含图片）      | Mozilla Readability  | **Mozilla Readability**（事实赢家）        |
| 按目的地的自定义模板 | 否                           | **是（按 URL 模式自动应用）**                 | 否                      | 否                   | **是（按平台默认 + 用户覆盖）**            |
| 发送到 IM 的目的地   | 无（仅 Notion DB）           | 无（仅 Obsidian vault）                       | 无（仅 Pocket）         | 剪贴板 / Obsidian    | **多个 IM/Agent 目的地** ← 差异化项        |
| 多目标分发           | 否                           | 否                                            | 否                      | 否                   | **是（≤5）** ← 差异化项                    |
| 云同步               | 是（Notion 账号）            | 否（vault 本地，但 vault 同步可选）           | 是（Pocket 账号）       | 否                   | **否（反特性）**                           |
| AI 总结              | 否                           | 是（Interpreter，可选，自带 key）             | 否                      | 否                   | **否（反特性 —— 下游 Agent 的工作）**      |
| 页面区域抓取         | 是（选区）                   | 是（高亮 + 选区）                             | 是（选区）              | 是（选区）           | v1.x —— 选区模式                           |
| i18n                 | 是（约 15 种语言）           | 是（en/pt-BR/id/ko/zh-Hant 等）               | 是                      | 有限                 | **是（v1.0 提供 en/zh_CN，后续更多）**     |
| 键盘快捷键           | 是                           | 是                                            | 是                      | 是                   | 是                                         |
| 失败诊断             | 有限                         | 有限                                          | 有限                    | 有限                 | **是（按目标诊断）** ← 差异化项            |
| 批量导出             | 否（由 Notion 处理）         | 原生（本身就是 Markdown 文件）                | 是（Pocket 导出）       | 不适用（输出即导出） | **是（JSON / Markdown）** ← v1.x           |

**Web2Chat 的胜出之处：**Send-to-IM 作为主动词。其他每个 clipper 都是"保存到某处"；Web2Chat 是"**投递到一段对话**"。send_to ↔ prompt 绑定就是 UX 护城河 —— 无论是 clipper 还是 share-to-chat 工具，没有竞争对手实现。

**Web2Chat 不会参与的竞争：**云同步（Notion / Pocket 占据该赛道）。AI 总结（Obsidian Clipper 有；我们明确不做）。v1 的跨浏览器（所有人都支持 Firefox/Safari；我们将在 v2 追上）。

## Sources

### Reference Products Analyzed

- [Notion Web Clipper – Chrome Web Store](https://chromewebstore.google.com/detail/notion-web-clipper/knheggckgoiihginacbkhaalnibhilkk)
- [Notion Web Clipper Help](https://www.notion.com/help/web-clipper)
- [Save to Notion (third-party comparison)](https://chromewebstore.google.com/detail/save-to-notion/ldmmifpegigmeammaeckplhnjbbpccmm)
- [Obsidian Web Clipper – obsidianmd/obsidian-clipper](https://github.com/obsidianmd/obsidian-clipper)
- [Obsidian Web Clipper – stephango.com](https://stephango.com/obsidian-web-clipper)
- [Obsidian Web Clipper – obsidian.md/clipper](https://obsidian.md/clipper)
- [Slack Markdown Proxy – Chrome Web Store (proves Slack uses Quill)](https://chromewebstore.google.com/detail/slack-markdown-proxy/llanfnajlpjggcklilogepheehdfdgnd)
- [Slack Markdown Proxy – GitHub](https://github.com/monzou/slack-markdown-proxy)
- [Hackable Slack Client (CSS/JS injection patterns)](https://github.com/bhuga/hackable-slack-client)
- [Telegram Media Downloader (userscript DOM injection reference)](https://deepwiki.com/Neet-Nestor/Telegram-Media-Downloader)
- [zlapi – Zalo Web automation reference](https://github.com/Its-VrxxDev/zlapi)
- [WhatsApp Web Chrome extension reference](https://github.com/bioenable/whatsapp-web-chrome-extension)
- [How to Build a Chrome Extension for WhatsApp Web (Medium)](https://medium.com/swlh/how-to-build-a-chrome-extension-to-spam-on-whatsapp-using-vanilla-javascript-1c00faa6a2f7)
- [Chat Plus for Google Chat – Chrome Web Store](https://chromewebstore.google.com/detail/chat-plus-for-google-chat/njkkenehdklkfdkmonkagaicllmnfcda)

### Platform & Technical Documentation

- [Chrome MV3 content scripts – developer.chrome.com](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome MV3 message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [chrome.scripting API (MAIN world injection)](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [chrome.i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [Chrome MV3 i18n message formats](https://developer.chrome.com/docs/extensions/mv3/i18n-messages/)
- [Inject a Global with Web Extensions in Manifest V3 – David Walsh](https://davidwalsh.name/inject-global-mv3)
- [Discord webhooks (alternative path) – DEV community](https://dev.to/oskarcodes/send-automated-discord-messages-through-webhooks-using-javascript-1p01)
- [Microsoft Teams – platform docs (officially-blessed Message Extensions, anti-feature for us)](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions)
- [Feishu Open Platform – Send Message API (official path, anti-feature)](https://open.feishu.cn/document/server-docs/im-v1/message/create)
- [WeCom Developer Center – message send (official path, anti-feature)](https://developer.work.weixin.qq.com/document/path/90236)
- [Nextcloud Talk Bots & Webhooks (official path, anti-feature)](https://nextcloud-talk.readthedocs.io/en/latest/bots/)
- [Signal Desktop – why no web client (security posture)](https://aboutsignal.com/blog/signal-web/)
- [Signal Desktop – Standalone Signal Desktop blog](https://signal.org/blog/standalone-signal-desktop/)

### Risk & Anti-Pattern Sources

- [Over 100 Chrome extensions break WhatsApp's anti-spam rules (Malwarebytes 2025)](https://www.malwarebytes.com/blog/news/2025/10/over-100-chrome-extensions-break-whatsapps-anti-spam-rules)
- [WhatsApp API vs Unofficial Tools – risk analysis](https://www.bot.space/blog/whatsapp-api-vs-unofficial-tools-a-complete-risk-reward-analysis-for-2025)
- [WhatsApp Help Center – Unauthorized automated/bulk messaging](https://faq.whatsapp.com/5957850900902049)
- [Chrome extension message-passing security – Duo Labs](https://duo.com/labs/tech-notes/message-passing-and-security-considerations-in-chrome-extensions)

### UX Pattern Sources

- [Smart Interface Design Patterns – autocomplete UX](https://smart-interface-design-patterns.com/articles/autocomplete-ux/)
- [Baymard – 9 UX best practices for autocomplete](https://baymard.com/blog/autocomplete-design)
- [UX Patterns for Developers – autocomplete pattern](https://uxpatterns.dev/patterns/forms/autocomplete)

---

_针对以下方向的功能研究：分发到 IM / AI-Agent 网页会话的 Chrome MV3 Web Clipper 扩展_
_Researched: 2026-04-28_
