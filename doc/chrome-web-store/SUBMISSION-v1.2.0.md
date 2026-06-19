# Chrome Web Store 最新上架材料（v1.2.0）

> 用途：面向当前最新已交付版本（v1.2.0）的 Developer Dashboard 填写材料。整理依据见 [`./MATERIALS-CHECKLIST.md`](./MATERIALS-CHECKLIST.md)。
>
> 当前 shipped platform set：OpenClaw / Discord / Slack / Telegram。

## 0. 本次上架产物索引

### 文案材料

- 中文商品详情：[`../../STORE-LISTING.md`](../../STORE-LISTING.md)
- 英文商品详情：[`../../STORE-LISTING.en.md`](../../STORE-LISTING.en.md)
- 英文隐私政策：[`../../PRIVACY.md`](../../PRIVACY.md)
- 中文隐私政策：[`../../PRIVACY.zh_CN.md`](../../PRIVACY.zh_CN.md)

### 图片材料

生成命令：

```bash
pnpm assets:screenshot
```

输出目录：`.output/store-assets/`

英文：

- `.output/store-assets/screenshot-1-capture.png` — `1280 x 800`
- `.output/store-assets/screenshot-2-send.png` — `1280 x 800`
- `.output/store-assets/screenshot-3-discord.png` — `1280 x 800`
- `.output/store-assets/screenshot-4-settings.png` — `1280 x 800`
- `.output/store-assets/screenshot-5-overview.png` — `1280 x 800`
- `.output/store-assets/promo-small-440x280.png` — `440 x 280`
- `.output/store-assets/promo-large-1400x560.png` — `1400 x 560`

中文：

- `.output/store-assets/screenshot-1-capture-zh.png` — `1280 x 800`
- `.output/store-assets/screenshot-2-send-zh.png` — `1280 x 800`
- `.output/store-assets/screenshot-3-discord-zh.png` — `1280 x 800`
- `.output/store-assets/screenshot-4-settings-zh.png` — `1280 x 800`
- `.output/store-assets/screenshot-5-overview-zh.png` — `1280 x 800`
- `.output/store-assets/promo-small-440x280-zh.png` — `440 x 280`
- `.output/store-assets/promo-large-1400x560-zh.png` — `1400 x 560`

Store icon：

- `.output/chrome-mv3/icon/128.png` — `128 x 128`

### 插件包

生成命令：

```bash
pnpm verify:zip
```

输出：

- `.output/web2chat-1.2.0-chrome.zip`

## 1. 文件包

### 上传文件

```text
.output/web2chat-1.2.0-chrome.zip
```

### Manifest 权限说明

生产版本权限基线以 `wxt.config.ts` 为准：

- `activeTab`
- `alarms`
- `scripting`
- `storage`
- `webNavigation`
- `host_permissions`
  - `https://app.slack.com/*`
  - `https://slack.com/*`
  - `https://discord.com/*`
  - `https://web.telegram.org/*`
- `optional_host_permissions`
  - `<all_urls>`

Dashboard 权限理由可直接使用 [`../../STORE-LISTING.md`](../../STORE-LISTING.md) / [`../../STORE-LISTING.en.md`](../../STORE-LISTING.en.md) 的“权限说明 / Permissions Justification”段落。

## 2. 商品详情 / Store Listing

### 推荐字段

| Dashboard 字段     | English                                                         | 中文                                                                  |
| ------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| Name               | `web2chat`                                                      | `web2chat`                                                            |
| Category           | `Productivity`                                                  | `效率工具 / Productivity`                                             |
| Language           | English                                                         | Chinese (Simplified) / zh_CN                                          |
| Official URL       | `https://seven-steven.github.io/web2chat/`                      | `https://seven-steven.github.io/web2chat/`                            |
| Homepage URL       | `https://seven-steven.github.io/web2chat/`                      | `https://seven-steven.github.io/web2chat/`                            |
| Support URL        | `https://github.com/seven-steven/web2chat/issues`               | `https://github.com/seven-steven/web2chat/issues`                     |
| Privacy Policy URL | `https://github.com/seven-steven/web2chat/blob/main/PRIVACY.md` | `https://github.com/seven-steven/web2chat/blob/main/PRIVACY.zh_CN.md` |
| Mature content     | No                                                              | 否                                                                    |

### 简短描述

英文：

```text
One-click clip-and-send to your favorite IM or AI agent chat.
```

中文：

```text
一键把当前网页投递到 IM 或 AI Agent 聊天会话
```

### 已支持平台声明

只声明以下平台为已支持：

- OpenClaw Web UI
- Discord Web
- Slack Web
- Telegram Web

不要把 Feishu / Lark 写入已支持平台；它们已从 shipped scope 移除。

### 详细描述

Developer Dashboard 不支持 Markdown 渲染；商品详情以以下两个文件为唯一来源，复制其中“详细描述（纯文本，可直接粘贴到 Developer Dashboard）”代码块即可：

- 中文：[`../../STORE-LISTING.md`](../../STORE-LISTING.md)
- 英文：[`../../STORE-LISTING.en.md`](../../STORE-LISTING.en.md)

## 3. 隐私权 / Privacy practices

### Single purpose description

英文：

```text
web2chat lets users capture structured information from the current web page and send it, together with a user-defined prompt, to a supported chat or AI agent web session selected by the user.
```

中文：

```text
web2chat 让用户在主动操作时抓取当前网页的结构化信息，并结合用户自定义 prompt，发送到用户选择的受支持聊天或 AI Agent Web 会话。
```

### Permission justifications

英文：

```text
activeTab: Used only after the user clicks the extension to access the current active tab and extract the page title, URL, description, and readable content.

scripting: Used to run the page extractor in the active tab and inject platform-specific sending adapters into the user-selected target chat page.

storage: Used to store user settings, target history, prompt history, prompt bindings, and dispatch state locally.

webNavigation: Used to observe SPA route changes and page loading state on target chat pages, so the extension can inject the sending adapter at the correct time and handle login or redirect flows.

alarms: Used to manage timeout timers for the dispatch state machine, preventing dispatches from hanging indefinitely.

host permissions: Limited to supported public platform domains (Discord, Slack, and Telegram). Used to detect target page readiness and insert the composed message into user-selected chat pages.

optional host permissions: Used for user-configured self-hosted OpenClaw or custom destinations. The extension requests access only to the specific origin at runtime; it does not get access to all websites by default.
```

中文：

```text
activeTab：仅在用户点击扩展后访问当前活动标签页，用于提取页面标题、URL、摘要和可读正文。

scripting：在当前页面运行内容抽取脚本，并在用户选择的目标聊天网页中注入对应平台的发送适配器。

storage：在本地保存用户设置、投递目标历史、prompt 历史、prompt 绑定关系和投递状态。

webNavigation：监听目标聊天网页的 SPA 路由变化和页面加载状态，以便在正确时机注入发送适配器并处理登录或跳转场景。

alarms：管理投递流程的超时计时器，确保投递状态机不会永久挂起。

host permissions：仅覆盖已支持的公共平台域名（Discord、Slack、Telegram），用于识别目标页面状态，并把组合后的消息插入用户选择的聊天页面。

optional host permissions：用于用户配置自部署 OpenClaw 或自定义目标。扩展仅在运行时请求具体 origin 的访问权限，默认不会访问所有网站。
```

### Data categories

建议在 Privacy practices 中披露：

- Website content：当前网页标题、描述、正文。
- Web browsing activity：当前活动标签页 URL；不读取完整浏览历史。
- User-provided content：prompt、目标会话 URL、用户编辑内容。

不应勾选，除非未来实现改变：

- Personally identifiable information
- Health information
- Financial and payment information
- Authentication information
- Personal communications（web2chat 不读取聊天记录）
- Location

### Data usage / Limited Use

英文：

```text
web2chat uses processed page content only to provide its single purpose: letting the user send the current page information and a user-defined prompt to a selected supported chat or AI agent session. The extension does not sell user data, does not use it for advertising, and does not transfer it to the developer's servers.
```

中文：

```text
web2chat 仅将处理后的页面内容用于提供其单一用途：让用户把当前网页信息和自定义 prompt 发送到所选择的受支持聊天或 AI Agent 会话。扩展不会出售用户数据，不会将数据用于广告，也不会将数据传输到开发者服务器。
```

### Remote code

英文：

```text
No, this extension does not execute remote code. All executable JavaScript is packaged with the extension.
```

中文：

```text
否。此扩展不执行远程代码，所有可执行 JavaScript 均随扩展包一起发布。
```

## 4. 分发 / Distribution

| Dashboard 字段 | English                                                           | 中文                                              |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| Visibility     | Public for production; Unlisted for pre-release validation        | 正式发布选 Public；预发布验证选 Unlisted          |
| Regions        | All regions unless there is a compliance constraint               | 无特殊合规限制时选择 All regions                  |
| Pricing        | Free                                                              | 免费                                              |
| Publish mode   | Delayed publishing is recommended for final review before release | 推荐 Delayed publishing，审核通过后最终核对再发布 |

## 5. 测试说明 / Test instructions

### English

```text
web2chat can be tested without any developer-operated backend.

Core capture flow:
1. Install the extension.
2. Open any readable web page, such as a documentation or blog page.
3. Click the web2chat extension icon.
4. Confirm that the popup displays the page title, URL, description, and readable content.
5. Enter a prompt, for example: "Summarize this page and extract action items."

OpenClaw flow:
1. Run or open an OpenClaw Web UI instance.
2. Configure a target URL in this format:
   http://localhost:18789/chat?session=agent:<agent>:<session>
3. When Chrome asks for optional host permission for that origin, approve it.
4. Click send.
5. Confirm that the captured page content and prompt are inserted into the OpenClaw chat input and sent.

Discord / Slack / Telegram flow:
1. Log in to the corresponding web app in Chrome.
2. Open a test server/channel/workspace/chat.
3. Copy the current channel/chat URL into web2chat as the target.
4. Click send.
5. Confirm that web2chat opens or focuses the target tab and inserts the composed message into the chat input.

Notes:
- The extension only acts after explicit user interaction.
- The extension does not require a web2chat account.
- The extension does not operate a backend service.
- Settings and history are stored locally in Chrome extension storage.
- If a platform is not logged in, the extension should show or surface a login/ready-state error instead of silently sending.
```

### 中文

```text
web2chat 不需要开发者运营的后端即可测试。

核心抓取流程：
1. 安装扩展。
2. 打开任意可读网页，例如文档页或博客文章。
3. 点击 web2chat 扩展图标。
4. 确认弹窗展示页面标题、URL、摘要和可读正文。
5. 输入 prompt，例如：“总结这个页面并提取行动项”。

OpenClaw 流程：
1. 运行或打开一个 OpenClaw Web UI 实例。
2. 配置如下格式的目标 URL：
   http://localhost:18789/chat?session=agent:<agent>:<session>
3. 当 Chrome 请求该 origin 的可选 host 权限时，批准授权。
4. 点击发送。
5. 确认抓取的页面内容和 prompt 被插入 OpenClaw 聊天输入框并发送。

Discord / Slack / Telegram 流程：
1. 在 Chrome 中登录对应 Web 应用。
2. 打开测试 server、channel、workspace 或 chat。
3. 将当前频道或聊天 URL 复制到 web2chat 作为目标。
4. 点击发送。
5. 确认 web2chat 打开或聚焦目标标签页，并将组合后的消息插入聊天输入框。

说明：
- 扩展仅在用户明确操作后执行。
- 扩展不需要 web2chat 账号。
- 扩展不运营自有后端服务。
- 设置和历史保存在 Chrome 扩展本地存储中。
- 如果目标平台未登录，扩展应显示登录或 ready-state 错误，而不是静默发送。
```

## 6. 最终提交前核对

- [ ] 中英文商品详情已准备。
- [ ] 中英文隐私政策已准备。
- [ ] 中英文 Privacy practices / permissions / test instructions 已准备。
- [ ] 中英文 screenshots 和 promo tiles 已生成。
- [ ] Store icon 已准备。
- [ ] `package.json` 版本号为 `1.2.0`。
- [ ] `.output/web2chat-1.2.0-chrome.zip` 已生成。
- [ ] `pnpm verify:claims` 通过。
- [ ] `pnpm verify:readme` 通过。
- [ ] `pnpm verify:zip` 通过。
