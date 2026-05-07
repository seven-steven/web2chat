[English](./README.en.md) | 简体中文

# web2chat

> 一键抓取网页结构化信息 + 预设 prompt，投递到 IM / AI Agent 聊天会话。Chrome MV3 扩展。

## 简介

web2chat 是一个 Chrome 浏览器扩展，帮助用户快速将当前网页的结构化信息投递到 IM 或 AI Agent 聊天会话。

**核心功能：**

- 点击工具栏图标，自动抓取当前页面元数据（title / url / description / content）
- 内容经 DOMPurify 净化后转换为 Markdown 格式
- 搭配用户自定义 prompt，一键投递到目标聊天会话

**支持平台：** OpenClaw Web UI、Discord

**隐私：** 所有数据仅本地存储于 `chrome.storage.local`，不上传任何服务器。详见 [隐私](#隐私) 章节。

## 设计初衷

web2chat 最初为 [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 模式设计 — 通过常用 IM 工具（Discord、Feishu、Lark、Google Chat、LINE、Microsoft Teams、Nextcloud Talk、Signal、Slack、Telegram、WhatsApp、Zalo、QQ、WeCom）便捷地将网页信息发送给 openclaw、hermes-agent 等承载 llm-wiki 的 AI Agent 平台，沉淀为持久化知识库。在实现过程中，项目演变为通用的网页到聊天投递工具。

## 安装

### 从源码加载（Load Unpacked）

1. 克隆仓库并安装依赖：

   ```bash
   git clone <repo-url>
   cd web2chat
   pnpm install
   ```

2. 构建生产版本：

   ```bash
   pnpm build
   ```

3. 在 Chrome 中加载扩展：
   - 打开 `chrome://extensions`
   - 右上角开启 **开发者模式**
   - 点击 **加载已解压的扩展程序**，选择仓库的 `.output/chrome-mv3/` 目录
4. 工具栏出现 web2chat 图标

### Chrome Web Store

即将上架，敬请期待。

## 使用

1. 点击工具栏 web2chat 图标（或快捷键 `Ctrl+Shift+S` / `Cmd+Shift+S`）
2. Popup 自动抓取当前页面信息并显示预览
3. 可编辑 title、description、content
4. 输入 `send_to` 目标 URL（支持历史下拉 + prompt 绑定）
5. 输入 prompt（可选）
6. 点击确认投递

## 平台说明

### OpenClaw

- URL 格式：`http(s)://<host>:<port>/chat?session=agent:<name>:<session>`
- 要求 OpenClaw 服务在本地或可访问网络中运行
- 首次使用时扩展会请求该 origin 的访问权限
- 在扩展选项页面管理已授权的 origin

### Discord

- URL 格式：`https://discord.com/channels/<server>/<channel>`
- 要求已在同一浏览器 profile 登录 Discord

**ToS 风险声明：** web2chat 通过 DOM 注入向 Discord 发送消息。这属于自动化操作，可能违反 [Discord 服务条款](https://discord.com/terms)。使用此功能即表示您理解并接受由此可能产生的账号风险（包括但不限于临时限制或封禁）。开发者不对因使用本扩展导致的 Discord 账号问题承担责任。

## Limitations

- 仅支持 Chrome / Chromium 浏览器（Firefox / Safari 计划中）
- 仅支持 OpenClaw 和 Discord 两个平台（Telegram / Slack 等计划中）
- 长内容单条消息截断为 2000 字符（多条切分计划中）
- 无失败重试队列（计划中）
- Discord 投递使用 DOM 注入，存在 ToS 风险（详见上方平台说明）

## 开发

**前置条件：** Node.js >= 20.19、pnpm 10.x、Chrome / Chromium

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发模式（HMR）
pnpm build            # 生产构建
pnpm test             # 单元测试
pnpm test:e2e         # E2E 测试（需 headed Chromium）
pnpm typecheck        # 类型检查
pnpm lint             # ESLint
pnpm verify:manifest  # manifest 形态校验
pnpm verify:zip       # zip 结构校验
```

技术栈：WXT 0.20 + Preact + TypeScript + Tailwind v4 + Vitest + Playwright

## 隐私

web2chat 不收集、不上传任何用户数据。所有抓取内容仅存储于本地浏览器，投递时通过浏览器标签页直接传递到目标会话。

详见 [隐私政策](./PRIVACY.zh_CN.md)
