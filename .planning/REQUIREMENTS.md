# Requirements: Web2Chat

**Defined:** 2026-04-28
**Core Value:** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话。

## v1 Requirements

v1 = MVP，覆盖 OpenClaw Web UI + Discord 两条投递通道。每条 REQ 都对应可观察的用户行为或可断言的工程产物，用于 phase 验收。

### Foundation (扩展骨架)

- [ ] **FND-01**: 提供 Chrome MV3 扩展骨架（manifest v3、service worker、popup、可程序化注入的 content script），可通过 `chrome://extensions` 加载并显示工具栏图标
- [ ] **FND-02**: Service worker 仅在顶层同步注册 `chrome.runtime.onMessage` 等事件监听器，不出现 top-level await（防御 SW 生命周期陷阱）
- [ ] **FND-03**: popup ↔ service worker ↔ content script 之间使用类型化消息协议（`zod` 校验）封装，跨上下文 RPC 输入/输出有明确 TypeScript 类型
- [ ] **FND-04**: 定义 v1 storage schema 并以 `WxtStorage.defineItem<T>` 等价方式包装；schema 含版本字段，预留 migration 钩子
- [ ] **FND-05**: 仅声明最小权限：`activeTab` + `scripting` + `storage` + 显式 per-adapter `host_permissions`；禁止 `<all_urls>`
- [ ] **FND-06**: i18n 框架（`@wxt-dev/i18n` 或等价方案）在骨架阶段就位，至少注册 `en` + `zh_CN` locale，popup hello-world 文案走 i18n 而非硬编码

### Capture (页面抓取)

- [ ] **CAP-01**: 用户点击扩展图标后，service worker 通过 `chrome.scripting.executeScript` 在当前 active tab 注入 extractor，返回 `ArticleSnapshot`
- [ ] **CAP-02**: extractor 使用 `@mozilla/readability` 在 `document.cloneNode(true)` 上提取主体内容，输出经 `dompurify` 净化后的 HTML/Markdown（用 `turndown`）
- [ ] **CAP-03**: 抓取结果包含 `title` / `url` / `description` / `create_at` / `content` 五项；`description` 优先取 `<meta name="description">` 或 OG `og:description`，缺省回退 Readability `excerpt`
- [ ] **CAP-04**: `create_at` 由扩展生成 ISO-8601 时间戳（用户点击时刻），不依赖网页本身的发布时间
- [ ] **CAP-05**: popup 在打开后第一时间展示 5 个字段的预览（loading/empty/error 三态明确）；用户可手动编辑 `title` / `description` / `content`

### Dispatch Core (投递主链路)

- [ ] **DSP-01**: popup 提供 `send_to` 输入框，输入即触发平台识别（OpenClaw / Discord）；识别结果以 IM 平台 icon 在输入框前展示；未识别时显示通用图标
- [ ] **DSP-02**: `send_to` 输入框带历史下拉：从 `chrome.storage.local` 中按 MRU（结合最近使用 + 频次）排序展示候选
- [ ] **DSP-03**: popup 提供 `prompt` 输入框；记录历史并在用户输入时给出自动补全建议
- [ ] **DSP-04**: `send_to` ↔ `prompt` 绑定：每个 `send_to` 历史项关联其上次配套使用的 `prompt`；切换 `send_to` 时 `prompt` 自动切换为该绑定值（用户仍可覆盖）
- [ ] **DSP-05**: 用户点击"确认"后，service worker 通过 `chrome.tabs.create`/`chrome.tabs.update` 打开或激活目标会话页，等待 `tab.onUpdated: complete` 后注入对应 adapter content script
- [ ] **DSP-06**: dispatch 状态写入 `chrome.storage.session`（按 `dispatchId` 索引），SW 重启后能继续完成或上报失败；同 `dispatchId` 的重复请求幂等
- [ ] **DSP-07**: adapter 调用前先跑 `canDispatch` 探针（DOM 就绪 + 未被登录墙拦截）；探针失败时给出结构化错误码（`NOT_LOGGED_IN` / `INPUT_NOT_FOUND` / `TIMEOUT` / `RATE_LIMITED`），popup 展示对应人类可读文案与"重试"按钮
- [ ] **DSP-08**: dispatch 完成后弹窗关闭前给出明确成功/失败反馈；工具栏 action icon 带 dispatch 生命周期 badge（loading / ok / err）
- [ ] **DSP-09**: popup 关闭再打开时能通过 storage-backed draft 恢复未发送的 `send_to` / `prompt` / 编辑过的 `content`
- [ ] **DSP-10**: 注册可重新绑定的快捷键（`commands` API），打开 popup 并自动开始抓取

### Adapter: OpenClaw (MVP 通道 1)

- [ ] **ADO-01**: 提供 `content/adapters/openclaw.ts`，实现统一 `IMAdapter` 接口（`match(url)` / `waitForReady()` / `compose(message)` / `send()`）
- [ ] **ADO-02**: `match` 识别 `http://localhost:18789/chat?session=agent:<agent_name>:<session_name>` URL pattern，并从 query 中解析 `agent_name` + `session_name`
- [ ] **ADO-03**: adapter 通过 React-controlled-input 注入模式（`Object.getOwnPropertyDescriptor(...).set` + 触发冒泡 `input` 事件）写入消息（如 OpenClaw 输入实为 plain `<textarea>`，标准 `value=` + `Event('input')` 即可，但实现统一走前者以一致兼容）
- [ ] **ADO-04**: 完成 `compose` 后 `send` 触发回车提交（`KeyboardEvent('keydown', { key: 'Enter' })` 或对应 send 按钮 click），并通过 MutationObserver 验证消息已出现在会话流中再返回成功
- [ ] **ADO-05**: 配 Playwright E2E 用例：从 popup 触发到目标 OpenClaw 会话收到消息的全链路至少绿一次
- [ ] **ADO-06**: `host_permissions` 仅包含 `http://localhost:18789/*`

### Adapter: Discord (MVP 通道 2)

- [ ] **ADD-01**: 提供 `content/adapters/discord.ts`，实现 `IMAdapter` 接口
- [ ] **ADD-02**: `match` 识别 `https://discord.com/channels/<server_id>/<channel_id>` URL pattern 并解析 `server_id` / `channel_id`
- [ ] **ADD-03**: 注入消息使用合成 `ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })` 路径处理 Slate/Lexical 受控编辑器；不依赖 `textContent =` / `innerText =`
- [ ] **ADD-04**: `waitForReady` 通过 `chrome.webNavigation.onHistoryStateUpdated` + `MutationObserver` 等待 channel 锚点（如 `[data-list-id="chat-messages-<channelId>"]`）出现后再继续，避免 SPA 路由竞态
- [ ] **ADD-05**: 选择器采用 ARIA 优先级（`role="textbox"` + `aria-label`），class-based selector 仅做兜底；选择器全部 5 秒硬超时
- [ ] **ADD-06**: 注入失败 / 未登录给出结构化错误并通过 popup 展示
- [ ] **ADD-07**: rate-limit 守门：同一 channel 5 秒内拒绝重复 dispatch；提交风险声明（README + popup 注脚），告知用户走 user-account DOM 注入存在 Discord ToS 风险
- [ ] **ADD-08**: `host_permissions` 仅包含 `https://discord.com/*`
- [ ] **ADD-09**: 单元测试基于捕获到的 Discord DOM fixture HTML 验证 selectors + paste injection（不依赖 live Discord）

### Storage & Privacy (本地存储 / 隐私)

- [ ] **STG-01**: 全部用户数据（send_to 历史、prompt 历史、send_to ↔ prompt 绑定、locale、设置、dispatch 草稿、错误日志）只写入 `chrome.storage.local` 与 `chrome.storage.session`；禁止使用 `localStorage` / 远程存储
- [ ] **STG-02**: storage 写操作集中通过 typed repo 串行化，禁止 popup 与 SW 同时直写造成丢更
- [ ] **STG-03**: 用户可在设置面板清空全部历史 / 绑定（一键 reset，再次确认对话框）

### i18n (国际化)

- [ ] **I18N-01**: 全部 popup / options / 错误消息文案均通过 i18n 接口产出，`zh_CN` 与 `en` 两份 locale 文件覆盖率 100%
- [ ] **I18N-02**: 用户可在设置面板切换 UI 语言；切换在不重载扩展的前提下立即生效（runtime locale switch）
- [ ] **I18N-03**: ESLint 规则禁止 JSX/TSX 中出现非 i18n 的硬编码用户可见字符串
- [ ] **I18N-04**: `manifest.json` 的 `name` / `description` / `default_title` 通过 `__MSG_*__` 本地化

### Distribution (分发)

- [ ] **DST-01**: 产物可通过 WXT build 打包为 Chrome Web Store 兼容 zip，本地解压加载验证通过
- [ ] **DST-02**: 仓库提供 PRIVACY.md（明确：抓取的页面 url / title / description / content / 用户输入的 prompt 仅本地存储，仅在用户主动确认时随新开 tab 一同传递到目标 IM；不向任何第三方上报）；扩展商店描述链接到该文件
- [ ] **DST-03**: `manifest.json` 含 `optional_host_permissions`，为 v2 平台预留按需授权能力；v1 不在静态 `host_permissions` 中包含未实现的平台
- [ ] **DST-04**: 在 README 中提供完整的安装、使用、限制（OpenClaw 需本地运行 / Discord ToS 风险）说明，并附 zh_CN 与 en 两版

## v2 Requirements

> 已知未来要做但不在 MVP；`/gsd-new-milestone` 推进时再促进。

### Tier-A IM 平台扩展（DOM 注入可行）

- **V2A-01**: Telegram Web 适配器
- **V2A-02**: Slack 适配器（Quill editor，使用 `editor.clipboard.dangerouslyPasteHTML`）
- **V2A-03**: Zalo 适配器

### Tier-B IM 平台扩展（Best-effort，需逐个 spike）

- **V2B-01**: Microsoft Teams 适配器
- **V2B-02**: Google Chat 适配器
- **V2B-03**: Feishu / Lark 适配器
- **V2B-04**: Nextcloud Talk 适配器

### Tier-C 通过 deep-link / 不支持

- **V2C-01**: WhatsApp 通过 `https://wa.me/...?text=` deep-link（不做 DOM 注入，避免反检测风险）
- **V2C-02**: LINE / Signal / WeCom / QQ 列入"不支持及其原因"文档

### v1.x 反馈优化

- **V1X-01**: 失败 dispatch 队列 + 自动重试（`chrome.alarms`）
- **V1X-02**: 多目标 fan-out（顺序，最多 5 个，节流 ≥1.5s）
- **V1X-03**: 自定义 message template（`{{title}}` / `{{url}}` / `{{content}}` / `{{prompt}}` 变量）
- **V1X-04**: 历史导出 / 导入（JSON / Markdown）
- **V1X-05**: 页面区域选择剪藏（element picker）
- **V1X-06**: 智能 prompt 推荐（基于 Schema.org `@type` + URL heuristics）
- **V1X-07**: 诊断面板（结构化错误码可视化）

## Out of Scope

显式排除项，配以原因，避免后续被反复重提。

| Feature                           | Reason                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Firefox / Safari 适配             | v1 仅 Chromium MV3，避免分裂工程精力（v2 之后再评估 WebExtension parity 工作量） |
| 云端同步 / 用户账户               | 本地优先是核心隐私定位，云同步引入后端依赖与数据合规复杂度                       |
| 服务端 Bot API / OAuth token 管理 | 需要后端服务，违反"无后端"约束；DOM 注入路径已能覆盖 MVP                         |
| 扩展内置 LLM 总结 / 改写          | 由下游 Agent 处理；扩展不调用模型也不存储 API key                                |
| OCR / 图片附件抽取                | 与"会话投递"主链路正交，工程量大，留待后续评估                                   |
| RSS / 定时剪藏                    | 不同的产品形态，不属于 Web Clipper 主链路                                        |
| 联系人 CSV 群发                   | 滥用风险高，会触发 Web Store 下架                                                |

## Traceability

> 由 `gsd-roadmapper` 在生成 ROADMAP.md 时回填。每个 v1 REQ-ID 必须映射到恰好一个 phase。

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| FND-01      | TBD   | Pending |
| FND-02      | TBD   | Pending |
| FND-03      | TBD   | Pending |
| FND-04      | TBD   | Pending |
| FND-05      | TBD   | Pending |
| FND-06      | TBD   | Pending |
| CAP-01      | TBD   | Pending |
| CAP-02      | TBD   | Pending |
| CAP-03      | TBD   | Pending |
| CAP-04      | TBD   | Pending |
| CAP-05      | TBD   | Pending |
| DSP-01      | TBD   | Pending |
| DSP-02      | TBD   | Pending |
| DSP-03      | TBD   | Pending |
| DSP-04      | TBD   | Pending |
| DSP-05      | TBD   | Pending |
| DSP-06      | TBD   | Pending |
| DSP-07      | TBD   | Pending |
| DSP-08      | TBD   | Pending |
| DSP-09      | TBD   | Pending |
| DSP-10      | TBD   | Pending |
| ADO-01      | TBD   | Pending |
| ADO-02      | TBD   | Pending |
| ADO-03      | TBD   | Pending |
| ADO-04      | TBD   | Pending |
| ADO-05      | TBD   | Pending |
| ADO-06      | TBD   | Pending |
| ADD-01      | TBD   | Pending |
| ADD-02      | TBD   | Pending |
| ADD-03      | TBD   | Pending |
| ADD-04      | TBD   | Pending |
| ADD-05      | TBD   | Pending |
| ADD-06      | TBD   | Pending |
| ADD-07      | TBD   | Pending |
| ADD-08      | TBD   | Pending |
| ADD-09      | TBD   | Pending |
| STG-01      | TBD   | Pending |
| STG-02      | TBD   | Pending |
| STG-03      | TBD   | Pending |
| I18N-01     | TBD   | Pending |
| I18N-02     | TBD   | Pending |
| I18N-03     | TBD   | Pending |
| I18N-04     | TBD   | Pending |
| DST-01      | TBD   | Pending |
| DST-02      | TBD   | Pending |
| DST-03      | TBD   | Pending |
| DST-04      | TBD   | Pending |

**Coverage:**

- v1 requirements: 46 total
- Mapped to phases: 0 (filled by roadmapper)
- Unmapped: 46 ⚠️ (待 roadmap 阶段映射)

---

_Requirements defined: 2026-04-28_
_Last updated: 2026-04-28 after initial definition_
