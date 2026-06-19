# Chrome Web Store 上架材料清单

> 用途：作为每次提交 Chrome Web Store Developer Dashboard 前的强制材料清单。必须同时准备中英文上架文案、中英文截图/宣传图、更新插件版本号，并生成可上传 zip 包。
>
> 当前项目事实基线：web2chat 是 Chrome MV3、本地优先的 web clipper；已交付平台为 OpenClaw / Discord / Slack / Telegram；不运行自有后端、不上传遥测、不使用广告 SDK。

## 0. 上架材料整理经验（必须遵守）

本轮整理暴露出的关键经验，后续上架必须先按此执行：

1. **唯一来源优先**
   - [ ] 商品详情文案只维护在 `STORE-LISTING.md` / `STORE-LISTING.en.md`。
   - [ ] 不再创建独立 `store-listing-description*.txt` 等重复文案文件。
   - [ ] `doc/chrome-web-store/SUBMISSION-*.md` 只能引用唯一来源，不复制维护第二份详细描述。
   - [ ] 如需 Dashboard 可复制文本，把纯文本放在 `STORE-LISTING*.md` 的 fenced `text` 区块内。

2. **Dashboard 文案必须是纯文本友好格式**
   - [ ] Chrome Web Store Developer Dashboard 不渲染 Markdown；详细描述不能依赖 `#`、`##`、`**加粗**`、Markdown 表格等格式。
   - [ ] 可使用纯文本编号增强结构，例如 `1. 核心流程`、`1) 抓取`。
   - [ ] 可使用普通短横线 `-` 模拟无序列表，但不要依赖 Markdown 缩进渲染。
   - [ ] 中英文详细描述都必须提供可直接复制的纯文本版本。

3. **图片生成后必须校验真实尺寸**
   - [ ] 不能只相信脚本日志；必须用系统工具确认 PNG 实际尺寸。
   - [ ] macOS 可用：`sips -g pixelWidth -g pixelHeight <file>`。
   - [ ] 本轮曾出现 Playwright 默认 viewport 导致实际输出 `1280 x 720` 的问题；如尺寸不对，先修脚本再重新生成。

4. **打包前清理旧 zip**
   - [ ] `pnpm verify:zip` 要求 `.output/` 下只有一个 `*-chrome.zip`。
   - [ ] 版本号更新后，先删除旧版本 zip，再重新运行 `pnpm verify:zip`。
   - [ ] 最终 zip 文件名必须体现当前版本，例如 `.output/web2chat-1.2.0-chrome.zip`。

5. **版本号必须作为上架动作的一部分**
   - [ ] 上架新版本前先更新 `package.json` 的 `version`。
   - [ ] 运行 `pnpm install --lockfile-only` 同步 lockfile 元数据；若无 diff，也应记录已执行。
   - [ ] 构建后确认 manifest version 与 `package.json` 一致。

6. **最终验证必须覆盖文案、图片、打包**
   - [ ] `pnpm verify:claims`
   - [ ] `pnpm verify:readme`
   - [ ] `pnpm assets:screenshot`
   - [ ] 图片尺寸逐项核对
   - [ ] `pnpm verify:zip`

## 1. 必交材料总览

每次上架至少需要准备以下四类材料：

1. **上架文案描述（中英文）**
   - [ ] 商品详情 / Store Listing：名称、简短描述、详细描述、分类、链接、权限说明。
   - [ ] 隐私权 / Privacy practices：单一用途、数据类别、数据用途、权限理由、远程代码声明、隐私政策 URL。
   - [ ] 分发 / Distribution：可见性、地区、定价、发布方式。
   - [ ] 测试说明 / Test instructions：审核人员可复现的测试步骤。
2. **屏幕截图和宣传图片（中英文）**
   - [ ] 英文 screenshots：1–5 张，`1280 x 800 px`。
   - [ ] 中文 screenshots：1–5 张，`1280 x 800 px`。
   - [ ] 英文 small promo tile：`440 x 280 px`。
   - [ ] 中文 small promo tile：`440 x 280 px`。
   - [ ] 英文 large promo tile：`1400 x 560 px`。
   - [ ] 中文 large promo tile：`1400 x 560 px`。
   - [ ] Store icon：`128 x 128 px`。
3. **插件版本号**
   - [ ] `package.json` 的 `version` 已更新到本次上架版本。
   - [ ] 构建后的 `manifest.json` version 与 `package.json` 一致。
4. **插件打包产物**
   - [ ] 已运行 `pnpm verify:zip`。
   - [ ] `.output/web2chat-<version>-chrome.zip` 已生成并通过校验。

## 2. 文件包（Package）

### 1.1 上传物

- [ ] `.output/web2chat-<version>-chrome.zip`
- [ ] zip 根目录直接包含扩展产物，例如：
  - `manifest.json`
  - background service worker bundle
  - popup bundle
  - content / adapter bundles
  - icons
  - locale files
  - 其他 WXT 构建产物

推荐命令：

```bash
pnpm verify:zip
```

### 1.2 Manifest 核对

- [ ] `manifest_version: 3`
- [ ] `name`
- [ ] `version` 与 `package.json` 一致
- [ ] `description`
- [ ] `action`
- [ ] `background.service_worker`
- [ ] `icons`
- [ ] `permissions`
- [ ] `host_permissions`
- [ ] `optional_host_permissions`
- [ ] `default_locale`（如使用 i18n）

### 1.3 权限基线说明

web2chat 的权限说明应围绕“用户主动操作 + 最小权限 + 本地优先”：

- `activeTab`：仅在用户点击扩展后访问当前活动标签页，用于抓取网页标题、URL、描述和可读正文。
- `scripting`：用于在当前页面执行内容抽取脚本，并在用户选择的聊天网页中注入对应平台发送适配器。
- `storage`：用于在本地保存用户设置、目标会话历史、prompt 历史和发送状态。
- `webNavigation`：用于监听目标聊天网页的加载与 SPA 路由变化，使投递流程能在正确时机继续。
- `alarms`：用于投递流程超时控制，避免状态机永久挂起。
- 静态 `host_permissions`：仅覆盖已支持公共平台域名，例如 Discord / Slack / Telegram，用于在用户选择的目标聊天页插入待发送内容。
- `optional_host_permissions: ["<all_urls>"]`：仅作为可选权限。默认不会访问所有网站；当用户配置自部署 OpenClaw 或自定义目标 URL 时，运行时只请求该具体 origin。

### 1.4 高风险禁止项

- [ ] 不把 `<all_urls>` 放入静态 `host_permissions`。
- [ ] 不加载远程 JS。
- [ ] 不用远程 CDN 脚本。
- [ ] 不执行下载代码。
- [ ] 不提交未使用权限。
- [ ] 不以“未来功能”为理由提前申请权限。

## 3. 商品详情（Store Listing）

正式文案入口：

- 中文：[`../../STORE-LISTING.md`](../../STORE-LISTING.md)
- 英文：[`../../STORE-LISTING.en.md`](../../STORE-LISTING.en.md)

> 每次上架必须同时更新中文和英文版本。若功能、平台、权限或隐私描述变化，两份文档必须同步变化。

### 2.1 基础字段

#### 扩展名称

- [ ] 建议：`web2chat`
- [ ] 或：`web2chat - Web Clipper to Chat`

注意：

- 不堆关键词。
- 不冒充 Discord / Slack / Telegram / Chrome 官方产品。
- 不在标题里承诺尚未支持的平台。

#### 简短描述 / Summary

- [ ] 英文不超过 Chrome Web Store 字数限制。
- [ ] 与 `manifest.json` / locale 中的 description 保持一致。
- [ ] 中文与英文语义一致。

当前建议：

```text
EN: One-click clip-and-send to your favorite IM or AI agent chat.
ZH: 一键把当前网页投递到 IM 或 AI Agent 聊天会话
```

#### 详细描述 / Detailed description

中英文都必须覆盖：

- [ ] web2chat 是什么。
- [ ] Capture → Edit/Prompt → Deliver 主流程。
- [ ] 当前已支持平台：OpenClaw / Discord / Slack / Telegram。
- [ ] 本地优先：配置与历史保存在 Chrome 本地存储。
- [ ] 无自有后端、无遥测、无广告。
- [ ] 用户主动点击和确认后才处理/发送内容。
- [ ] Discord / Slack / Telegram DOM 注入属于本地浏览器自动化，使用时需遵守目标平台条款。

不要写：

- [ ] 不写 Feishu / Lark 为已支持。
- [ ] 不写“支持所有 IM / 所有聊天工具”。
- [ ] 不写未实现的 v2 候选方向。

#### 分类 / Category

- [ ] 推荐：`Productivity`
- [ ] 备选：Developer Tools（仅当 Dashboard 分类更贴近实际时）

#### 语言 / Language

- [ ] English
- [ ] Chinese (Simplified) / zh_CN（如启用本地化 listing）
- [ ] 多语言版本的功能描述保持一致。

### 2.2 图片与媒体

模板入口：[`./assets/templates/`](./assets/templates/)

生成命令：

```bash
pnpm assets:screenshot
```

生成输出：`.output/store-assets/`

#### Store icon

- [ ] `128 x 128 px`
- [ ] 来源：`.output/chrome-mv3/icon/128.png`
- [ ] 不使用第三方平台官方 logo 造成误导。

#### Screenshots

英文：

- [ ] `.output/store-assets/screenshot-1-capture.png` — `1280 x 800 px`
- [ ] `.output/store-assets/screenshot-2-send.png` — `1280 x 800 px`
- [ ] `.output/store-assets/screenshot-3-discord.png` — `1280 x 800 px`
- [ ] `.output/store-assets/screenshot-4-settings.png` — `1280 x 800 px`
- [ ] `.output/store-assets/screenshot-5-overview.png` — `1280 x 800 px`

中文：

- [ ] `.output/store-assets/screenshot-1-capture-zh.png` — `1280 x 800 px`
- [ ] `.output/store-assets/screenshot-2-send-zh.png` — `1280 x 800 px`
- [ ] `.output/store-assets/screenshot-3-discord-zh.png` — `1280 x 800 px`
- [ ] `.output/store-assets/screenshot-4-settings-zh.png` — `1280 x 800 px`
- [ ] `.output/store-assets/screenshot-5-overview-zh.png` — `1280 x 800 px`

截图要求：

- [ ] 不出现真实私人聊天内容。
- [ ] 不出现真实 token / cookie / email / 私有服务器。
- [ ] 如展示 Discord / Slack / Telegram，使用测试 workspace / 测试频道。
- [ ] 截图内容与当前版本实际 UI 一致。
- [ ] 中英文截图语义一致。

#### Small promo tile

- [ ] 英文：`.output/store-assets/promo-small-440x280.png` — `440 x 280 px`
- [ ] 中文：`.output/store-assets/promo-small-440x280-zh.png` — `440 x 280 px`

#### Large promo tile

- [ ] 英文：`.output/store-assets/promo-large-1400x560.png` — `1400 x 560 px`
- [ ] 中文：`.output/store-assets/promo-large-1400x560-zh.png` — `1400 x 560 px`

#### Promo video

- [ ] YouTube URL，可选。

### 2.3 链接

- [ ] Official URL：项目官网 / GitHub Pages 宣传页。
- [ ] Homepage URL：项目官网或 GitHub repo。
- [ ] Support URL：建议使用 GitHub Issues 或专门 support 页面。
- [ ] Privacy Policy URL：公开隐私政策页面。

### 2.4 内容分级

- [ ] Mature content：通常选择 No。

### 2.5 Listing 合规核对

- [ ] 描述不为空。
- [ ] 截图不缺失。
- [ ] 描述、截图、分类与实际功能一致。
- [ ] 不关键词堆砌。
- [ ] 不冒充第三方平台官方产品。
- [ ] 不使用匿名/未署名用户评价。
- [ ] 不写尚未实现功能。

## 4. 隐私权（Privacy practices）

正式隐私政策入口：

- 英文：[`../../PRIVACY.md`](../../PRIVACY.md)
- 中文：[`../../PRIVACY.zh_CN.md`](../../PRIVACY.zh_CN.md)

> 每次上架必须同步检查英文隐私政策和中文隐私政策。

### 3.1 Single purpose description

英文：

```text
web2chat lets users capture structured information from the current web page and send it, together with a user-defined prompt, to a supported chat or AI agent web session selected by the user.
```

中文：

```text
web2chat 让用户在主动操作时抓取当前网页的结构化信息，并结合用户自定义 prompt，发送到用户选择的受支持聊天或 AI Agent Web 会话。
```

### 3.2 权限理由

可直接用于 Dashboard 的英文说明：

```text
activeTab: Used only after the user clicks the extension to access the currently active tab and extract the page title, URL, description, and readable content for the user's clipping workflow.

scripting: Used to run the page extractor in the active tab and to inject platform-specific sending adapters into the user-selected supported chat web page.

storage: Used to store user settings, target session history, prompt history, prompt bindings, and dispatch state locally in chrome.storage.local/session.

webNavigation: Used to observe loading and SPA route changes on supported target pages, so the dispatch flow can continue at the correct time.

alarms: Used to manage timeout timers for dispatch workflows and prevent dispatches from hanging indefinitely.

host permissions: Required to detect and interact with supported web chat pages selected by the user, so the extension can insert the captured content into the compose box and send it.

optional host permissions: Used only as optional permissions. web2chat does not get access to all sites by default. When a user configures a self-hosted OpenClaw or custom target URL, the extension requests permission for that specific origin at runtime.
```

### 3.3 远程代码声明

- [ ] 如当前实现符合，应填写 No。

```text
No, this extension does not execute remote code. All executable JavaScript is packaged with the extension.
```

### 3.4 用户数据类别披露

建议保守披露：

- [ ] Website content：当前网页标题、描述、正文。
- [ ] Web browsing activity / current page URL：当前活动 tab 的 URL；不读取完整浏览历史。
- [ ] User-provided content：用户 prompt、目标会话 URL、用户编辑内容。

通常不应勾选，除非实现确实处理：

- [ ] Personally identifiable information
- [ ] Health information
- [ ] Financial and payment information
- [ ] Authentication information
- [ ] Personal communications（web2chat 不应读取聊天记录）
- [ ] Location

### 3.5 数据使用声明

必须表达：

- [ ] 仅用于提供 single purpose。
- [ ] 不出售用户数据。
- [ ] 不用于广告。
- [ ] 不用于信用评估。
- [ ] 不转让给数据经纪商。
- [ ] 不上传到开发者服务器。
- [ ] 用户主动发送到 Discord / Slack / Telegram / OpenClaw 后，数据处理受目标服务自身政策约束。

建议英文：

```text
web2chat uses processed page content only to provide its single purpose: letting the user send the current page information and a user-defined prompt to a selected supported chat or AI agent session. The extension does not sell user data, does not use it for advertising, and does not transfer it to the developer's servers.
```

### 3.6 隐私政策内容核对

隐私政策至少覆盖：

- [ ] web2chat 是什么。
- [ ] 处理哪些数据：URL / title / description / content / prompt / target URL / local history / dispatch state。
- [ ] 何时处理：用户点击扩展、确认发送、配置目标。
- [ ] 保存位置：`chrome.storage.local` / `chrome.storage.session`。
- [ ] 无自有后端、无遥测、无广告。
- [ ] 第三方目标：用户主动发送到目标聊天服务后，受目标服务政策约束。
- [ ] 数据删除方式：清除扩展数据、撤销权限、卸载扩展。
- [ ] 联系方式 / support URL。
- [ ] Chrome Web Store User Data Policy / Limited Use 承诺。

## 5. 分发（Distribution）

中英文材料都应记录以下决策：

| 字段         | 推荐值                                                |
| ------------ | ----------------------------------------------------- |
| Visibility   | Public（正式发布）；Unlisted（预发布验证）            |
| Regions      | All regions，除非另有合规限制                         |
| Pricing      | Free                                                  |
| Publish mode | Delayed publishing 推荐，用于审核通过后最终核对再发布 |

## 6. 测试说明（Test instructions）

中英文测试说明必须覆盖：

- [ ] Core capture flow。
- [ ] OpenClaw flow。
- [ ] Discord / Slack / Telegram flow。
- [ ] 无 web2chat 账号、无自有后端、本地存储。
- [ ] 未登录或目标页面不可用时应显示错误而不是静默发送。

正式可粘贴文本放在当前版本提交材料文档中：[`./SUBMISSION-v1.2.0.md`](./SUBMISSION-v1.2.0.md)。

## 7. 最容易被拒的点

| 风险             | web2chat 对策                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 权限过大         | 静态 host permissions 只放已支持平台；`<all_urls>` 只放 optional，并说明运行时具体 origin 授权 |
| 隐私披露不足     | 明确披露 website content / current URL / prompt / local history / dispatch state               |
| 描述与功能不一致 | Listing 只写当前已支持平台，不写 Feishu/Lark 和未来平台                                        |
| 远程代码         | 所有 JS 随扩展打包，不用 CDN / remote import                                                   |
| 误导性品牌使用   | 不冒充 Discord / Slack / Telegram 官方扩展                                                     |
| 测试不可复现     | 提供测试步骤、测试频道/账号或清晰说明                                                          |
| 功能空壳         | 截图和测试说明展示完整 capture → compose → send 主链路                                         |
| 数据用途不清     | 强调 local-first、无后端、无遥测、用户主动发送                                                 |

## 8. 官方参考

- [Chrome Web Store — Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Chrome Web Store Dashboard — Store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Chrome Web Store Dashboard — Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome Web Store Dashboard — Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Chrome Web Store Program Policies — Listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)
- [Chrome Web Store Program Policies — Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Chrome Web Store Program Policies — Permissions](https://developer.chrome.com/docs/webstore/program-policies/permissions)
- [Chrome Web Store — Review process](https://developer.chrome.com/docs/webstore/review-process/)
