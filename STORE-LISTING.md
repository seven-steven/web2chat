[English](./STORE-LISTING.en.md) | 简体中文

# web2chat — Chrome Web Store Listing

## 简短描述

此字段即 `manifest.json` 的 `description`，已通过 i18n locale 文件设置。当前 zh_CN 值：

> 一键把当前网页投递到 IM 或 AI Agent 聊天会话

（132 字符限制内。来源：`locales/zh_CN.yml` → `extension_description`。）

## 详细描述

web2chat 是一款 Chrome 扩展，为 llm-wiki 知识沉淀、AI Agent 协作和 IM 自动化投递而生。

灵感源自 Karpathy 的 llm-wiki 模式 — 用 LLM 从网页来源渐进式构建持久化知识库。web2chat 让你通过 Discord、Slack、Telegram 等常用 IM 工具，便捷地将网页信息发送给 openclaw、hermes-agent 等 AI Agent 平台，实现一键知识沉淀。

只需一次点击，web2chat 自动抓取当前网页的结构化信息（标题、链接、摘要、正文），转换为干净的 Markdown，搭配你预设的自定义提示词（prompt），一键投递到目标 IM 或 AI Agent 聊天会话。

### 核心流程

1. **抓取** — 点击工具栏图标，自动提取页面内容（Readability + DOMPurify + Turndown）
2. **编辑** — 在弹窗中预览和编辑标题、摘要、正文，添加自定义提示词
3. **投递** — 选择目标会话（OpenClaw / Discord），一键发送格式化消息

### 已支持平台

- **OpenClaw Web UI** — 自部署 AI Agent 平台（承载 llm-wiki / hermes-agent），配置实例 URL 即可使用
- **Discord** — 向频道投递消息，支持频道 URL 直接粘贴

### 核心特性

- 智能页面内容抽取（Readability + DOMPurify + Turndown，输出干净 Markdown）
- 自定义提示词（prompt）与目标会话绑定，切换目标自动切换提示词
- 投递历史记录，最近使用优先排序，快速重复投递
- 草稿恢复，关闭弹窗不丢失编辑内容
- 双语界面（中文 / English）
- 所有数据仅存于本地浏览器，无云服务、无遥测、无第三方分析

### 隐私

web2chat 不上传任何数据到远程服务器。抓取的页面信息和用户设置仅保存在浏览器本地存储（chrome.storage.local / .session）中，投递时通过浏览器标签页直接导航传递到目标会话。

## 仪表盘字段参考 (手动填写)

### 类别

推荐：**效率工具 (Productivity)**

### 权限说明

以下为每项权限的使用理由，填入 CWS 开发者仪表盘：

- **`activeTab`** — 读取当前活动标签页的内容，以提取页面的标题、链接、摘要和正文信息
- **`scripting`** — 向目标页面注入内容脚本，以完成消息到 IM 或 AI Agent 会话的自动投递
- **`storage`** — 存储用户的投递目标历史、提示词绑定关系和扩展设置
- **`webNavigation`** — 监听目标页面的 SPA 路由变化，以在正确的时机注入投递脚本
- **`alarms`** — 管理投递流程的超时计时器，确保投递状态机不会永久挂起
- **`host_permissions (discord.com)`** — 向 Discord 频道页面注入消息投递脚本

### 单一用途描述

> 抓取当前网页的结构化信息并搭配用户自定义 prompt，一键投递到指定的 IM 或 AI Agent 聊天会话中。

### 隐私政策 URL

```
https://github.com/seven-steven/web2chat/blob/main/PRIVACY.md
```

### 隐私做法标签

CWS 仪表盘"隐私做法"标签页中应声明：

- **数据收集**：网页浏览活动（当前标签页 URL）、用户生成内容（标题 / 摘要 / 正文 / 提示词）
- **数据用途**：功能性（编排消息并投递到目标 IM 或 AI Agent 会话）
- **数据存储**：仅本地（chrome.storage.local / .session）
- **数据分享**：无
- **远程代码**：无
