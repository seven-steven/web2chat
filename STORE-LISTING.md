[English](./STORE-LISTING.en.md) | 简体中文

# web2chat — Chrome Web Store Listing

## 简短描述

此字段即 `manifest.json` 的 `description`，已通过 i18n locale 文件设置。当前 zh_CN 值：

```text
一键把当前网页投递到 IM 或 AI Agent 聊天会话
```

（132 字符限制内。来源：`locales/zh_CN.yml` → `extension_description`。）

## 详细描述（纯文本，可直接粘贴到 Developer Dashboard）

```text
web2chat 是一款本地优先的 Chrome MV3 网页剪藏扩展，帮助你把当前网页的结构化信息与自定义 prompt，一键投递到受支持的 IM 或 AI Agent Web 聊天会话。

只需点击工具栏图标，web2chat 会在用户主动操作后抓取当前页面的标题、链接、摘要、抓取时间与可读正文，将内容净化并转换为 Markdown。你可以在弹窗中预览和编辑内容，搭配自定义 prompt，然后发送到已配置的目标会话。

1. 核心流程

1) 抓取
- 点击工具栏图标，提取当前页面内容。
- 内容抽取使用 Readability。
- 内容净化使用 DOMPurify。
- Markdown 转换使用 Turndown。

2) 编辑
- 在弹窗中预览标题、摘要和正文。
- 可在发送前编辑抓取结果。
- 可添加自定义 prompt，作为给下游聊天或 AI Agent 的指令。

3) 投递
- 选择目标会话。
- web2chat 打开或聚焦目标聊天页面。
- 将格式化消息插入目标输入框并发送。

2. 已支持平台

- OpenClaw Web UI
  支持用户自部署的 OpenClaw 实例。配置实例 URL 后，扩展会在运行时请求该具体 origin 的访问权限。

- Discord Web
  支持向 Discord 频道 URL 投递消息。需要用户已在同一浏览器 profile 登录 Discord。

- Slack Web
  支持向 Slack 频道 URL 投递消息。需要用户已在同一浏览器 profile 登录 Slack。

- Telegram Web
  支持向 Telegram Web 聊天 URL 投递消息。需要用户已在同一浏览器 profile 登录 Telegram Web。

3. 核心特性

- 智能页面内容抽取
  提取标题、URL、摘要、抓取时间与正文，并输出干净 Markdown。

- 自定义 prompt
  将网页内容与用户指令组合后发送到目标会话。

- 目标历史记录
  保存常用 send_to 目标，最近使用优先排序。

- Prompt 绑定
  为不同目标会话保存对应 prompt，切换目标时自动带出。

- 草稿恢复
  关闭弹窗后可恢复尚未发送的编辑内容。

- 低置信度确认
  当目标输入框选择器稳定性较低时，发送前要求用户确认。

- 登录和超时错误提示
  目标平台未登录或页面响应超时时，显示可重试的错误提示。

- 双语界面
  支持中文与 English。

- 本地优先隐私模型
  设置与历史仅保存在浏览器本地存储。web2chat 不运营自有后端，不上传剪藏内容，不出售数据，不使用遥测、第三方分析或广告 SDK。

4. 隐私说明

- web2chat 仅在用户主动点击扩展时处理当前活动标签页内容。
- 仅在用户明确确认投递时，才把组合后的消息插入到用户选择的目标聊天网页。
- 抓取内容、prompt、目标历史和设置仅保存在 Chrome 扩展本地存储中。
- web2chat 不运营自有后端，不上传剪藏内容，不出售数据，不使用广告或分析 SDK。

5. 注意事项

- Discord、Slack 与 Telegram 投递通过浏览器页面 DOM 注入完成。
- 这属于用户本地浏览器中的自动化操作，可能受到各平台服务条款限制。
- 请仅在你有权使用的账号、工作区、频道或聊天中使用。
```

## 仪表盘字段参考（手动填写）

### 类别

推荐：效率工具 (Productivity)

### 权限说明

以下为每项权限的使用理由，可填入 Chrome Web Store Developer Dashboard：

```text
activeTab：仅在用户点击扩展后访问当前活动标签页，用于提取页面标题、URL、摘要和可读正文。

scripting：在当前页面运行内容抽取脚本，并在用户选择的目标聊天网页中注入对应平台的发送适配器。

storage：在本地保存用户设置、投递目标历史、prompt 历史、prompt 绑定关系和投递状态。

webNavigation：监听目标聊天网页的 SPA 路由变化和页面加载状态，以便在正确时机注入发送适配器并处理登录或跳转场景。

alarms：管理投递流程的超时计时器，确保投递状态机不会永久挂起。

host permissions：仅覆盖已支持的公共平台域名（Discord、Slack、Telegram），用于识别目标页面状态，并把组合后的消息插入用户选择的聊天页面。

optional host permissions：用于用户配置自部署 OpenClaw 或自定义目标。扩展仅在运行时请求具体 origin 的访问权限，默认不会访问所有网站。
```

### 单一用途描述

```text
web2chat 让用户在主动操作时抓取当前网页的结构化信息，并结合用户自定义 prompt，发送到用户选择的受支持聊天或 AI Agent Web 会话。
```

### 隐私政策 URL

```text
https://github.com/seven-steven/web2chat/blob/main/PRIVACY.md
```

### 官网 / 支持链接

```text
Homepage / Official URL: https://seven-steven.github.io/web2chat/
Support URL: https://github.com/seven-steven/web2chat/issues
```

### 隐私做法标签

Chrome Web Store Developer Dashboard 的“隐私做法”中应声明：

```text
数据类别：Website content；Web browsing activity（仅当前活动标签页 URL，不读取完整浏览历史）；User-provided content（prompt、目标会话 URL、用户编辑内容）。

数据用途：功能性用途；用于将当前网页内容与用户 prompt 组合，并投递到用户选择的目标聊天或 AI Agent 会话。

数据存储：仅本地（chrome.storage.local / chrome.storage.session）。

数据分享：不出售、不转让给数据经纪商、不用于广告、不用于信用评估、不上传到开发者服务器。用户主动发送到第三方聊天平台后的数据处理受目标平台自身政策约束。

远程代码：无。所有可执行 JavaScript 均随扩展包发布。
```
