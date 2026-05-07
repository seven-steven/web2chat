# Requirements: web2chat

**定义日期：** 2026-04-28
**核心价值：** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话。

## v1 需求 (Requirements)

v1 = MVP，覆盖 OpenClaw Web UI + Discord 两条投递通道。每条 REQ 都对应可观察的用户行为或可断言的工程产物，用于 phase 验收。

### Foundation (扩展骨架)

- [x] **FND-01**: 提供 Chrome MV3 扩展骨架（manifest v3、service worker、popup、可程序化注入的 content script），可通过 `chrome://extensions` 加载并显示工具栏图标 ✓ Validated in Phase 1, Plan 01-1
- [x] **FND-02**: Service worker 仅在顶层同步注册 `chrome.runtime.onMessage` 等事件监听器，不出现 top-level await（防御 SW 生命周期陷阱） ✓ Validated in Phase 1, Plan 01-3
- [x] **FND-03**: popup ↔ service worker ↔ content script 之间使用类型化消息协议（`zod` 校验）封装，跨上下文 RPC 输入/输出有明确 TypeScript 类型 ✓ Validated in Phase 1, Plan 01-3
- [x] **FND-04**: 定义 v1 storage schema 并以 `WxtStorage.defineItem<T>` 等价方式包装；schema 含版本字段，预留 migration 钩子 ✓ Validated in Phase 1, Plan 01-2
- [x] **FND-05**: 仅声明最小静态权限：`activeTab` + `scripting` + `storage` + 静态 `host_permissions: ["https://discord.com/*"]`（仅 v1 已知公共域名）+ `optional_host_permissions: ["<all_urls>"]`（覆盖用户自部署 OpenClaw 与未来 v2 平台的运行时按需授权）；静态 `host_permissions` 中禁止使用 `<all_urls>` ✓ Validated in Phase 1, Plan 01-1
- [x] **FND-06**: i18n 框架（`@wxt-dev/i18n` 或等价方案）在骨架阶段就位，至少注册 `en` + `zh_CN` locale，popup hello-world 文案走 i18n 而非硬编码 ✓ Validated in Phase 1, Plan 01-4

### Capture (页面抓取)

- [x] **CAP-01**: 用户点击扩展图标后，service worker 通过 `chrome.scripting.executeScript` 在当前 active tab 注入 extractor，返回 `ArticleSnapshot` ✓ Validated in Phase 2, Plan 02-02 (capture.run 路由 + ArticleSnapshotSchema) + Plan 02-04 (capture.spec.ts mirror 4 路径) + Plan 02-05 (background/capture-pipeline.ts runCapturePipeline 7 步实现 + entrypoints/background.ts 顶层注册)
- [x] **CAP-02**: extractor 使用 `@mozilla/readability` 在 `document.cloneNode(true)` 上提取主体内容，输出经 `dompurify` 净化后的 HTML/Markdown（用 `turndown`）✓ Validated in Phase 2, Plan 02-03 (impl) + Plan 02-04 (sanitize.spec.ts + markdown-roundtrip.spec.ts)
- [x] **CAP-03**: 抓取结果包含 `title` / `url` / `description` / `create_at` / `content` 五项；`description` 优先取 `<meta name="description">` 或 OG `og:description`，缺省回退 Readability `excerpt` ✓ Validated in Phase 2, Plan 02-02 (ArticleSnapshotSchema 5 字段) + Plan 02-03 (getDescription helper) + Plan 02-04 (description-fallback.spec.ts 4 it())
- [x] **CAP-04**: `create_at` 由扩展生成 ISO-8601 时间戳（用户点击时刻），不依赖网页本身的发布时间 ✓ Validated in Phase 2, Plan 02-02 (z.string().datetime() 严格 ISO-8601 schema) + Plan 02-04 (capture.spec.ts ISO_8601_RE 双断言：frozen Date + 实时 Date.now()) + Plan 02-05 (background/capture-pipeline.ts step 3 `create_at = new Date().toISOString()` by SW)
- [x] **CAP-05**: popup 在打开后第一时间展示 5 个字段的预览（loading/empty/error 三态明确）；用户可手动编辑 `title` / `description` / `content` ✓ Validated in Phase 2, Plan 02-06 (entrypoints/popup/App.tsx 4-state UI: loading skeleton / success 5-field / empty restricted+noContent / error scriptFailed; mount 自动派发 capture.run; 3 个 always-on textarea + 2 个 read-only output; Intl.DateTimeFormat 本地化 create_at; min-w-[360px] min-h-[240px]; 全部文案走 t('capture.*'); pnpm typecheck/test 36/build/lint 全绿)

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
- [ ] **ADO-06**: OpenClaw 适配器不在 manifest 中静态枚举 OpenClaw URL（用户自部署的 origin 不可枚举：可能落在 `http://localhost:18789/*`、`http://<lan-ip>:<port>/*`、`https://<custom-domain>/*` 等任意 origin）；改为通过运行时 `chrome.permissions.request` 在用户配置实例 URL 时按 origin 申请权限
- [ ] **ADO-07**: 用户在 popup / settings 中输入新的 OpenClaw 实例 URL 时，扩展立即调用 `chrome.permissions.request({ origins: [<该 URL 的 origin>] })`；通过则把已授权 origin 持久化进 `chrome.storage.local` 并绑定到该 send_to 历史项；用户拒绝授权时 popup 给出明确状态（"未授权访问 X — 点击重新授权"）并提供重新触发请求的按钮；dispatch 前若发现目标 origin 未在已授权集合中，自动重新触发授权流程

### Adapter: Discord (MVP 通道 2)

- [x] **ADD-01**: 提供 `content/adapters/discord.ts`，实现 `IMAdapter` 接口 ✓ Phase 5, Plan 05-02
- [x] **ADD-02**: `match` 识别 `https://discord.com/channels/<server_id>/<channel_id>` URL pattern 并解析 `server_id` / `channel_id` ✓ Phase 5, Plan 05-01
- [x] **ADD-03**: 注入消息使用合成 `ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })` 路径处理 Slate/Lexical 受控编辑器；不依赖 `textContent =` / `innerText =` ✓ Phase 5, Plan 05-02
- [x] **ADD-04**: `waitForReady` 通过 `chrome.webNavigation.onHistoryStateUpdated` + `MutationObserver` 等待 channel 锚点（如 `[data-list-id="chat-messages-<channelId>"]`）出现后再继续，避免 SPA 路由竞态 ✓ Phase 5, Plan 05-03
- [x] **ADD-05**: 选择器采用 ARIA 优先级（`role="textbox"` + `aria-label`），class-based selector 仅做兜底；选择器全部 5 秒硬超时 ✓ Phase 5, Plan 05-02
- [x] **ADD-06**: 注入失败 / 未登录给出结构化错误并通过 popup 展示 ✓ Phase 5, Plan 05-03
- [x] **ADD-07**: rate-limit 守门：同一 channel 5 秒内拒绝重复 dispatch；提交风险声明（README + popup 注脚），告知用户走 user-account DOM 注入存在 Discord ToS 风险 ✓ Phase 5, Plan 05-02 + 05-03
- [x] **ADD-08**: `host_permissions` 仅包含 `https://discord.com/*` ✓ Phase 5, Plan 05-01
- [x] **ADD-09**: 单元测试基于捕获到的 Discord DOM fixture HTML 验证 selectors + paste injection（不依赖 live Discord） ✓ Phase 5, Plan 05-02

### Storage & Privacy (本地存储 / 隐私)

- [x] **STG-01**: 全部用户数据（send_to 历史、prompt 历史、send_to ↔ prompt 绑定、locale、设置、dispatch 草稿、错误日志）只写入 `chrome.storage.local` 与 `chrome.storage.session`；禁止使用 `localStorage` / 远程存储 ✓ Validated in Phase 1, Plan 01-2
- [x] **STG-02**: storage 写操作集中通过 typed repo 串行化，禁止 popup 与 SW 同时直写造成丢更 ✓ Validated in Phase 1, Plan 01-2
- [ ] **STG-03**: 用户可在设置面板清空全部历史 / 绑定（一键 reset，再次确认对话框）

### i18n (国际化)

- [ ] **I18N-01**: 全部 popup / options / 错误消息文案均通过 i18n 接口产出，`zh_CN` 与 `en` 两份 locale 文件覆盖率 100%
- [ ] **I18N-02**: 用户可在设置面板切换 UI 语言；切换在不重载扩展的前提下立即生效（runtime locale switch）
- [ ] **I18N-03**: ESLint 规则禁止 JSX/TSX 中出现非 i18n 的硬编码用户可见字符串
- [ ] **I18N-04**: `manifest.json` 的 `name` / `description` / `default_title` 通过 `__MSG_*__` 本地化

### Distribution (分发)

- [ ] **DST-01**: 产物可通过 WXT build 打包为 Chrome Web Store 兼容 zip，本地解压加载验证通过
- [x] **DST-02**: 仓库提供 PRIVACY.md（明确：抓取的页面 url / title / description / content / 用户输入的 prompt 仅本地存储，仅在用户主动确认时随新开 tab 一同传递到目标 IM；不向任何第三方上报）；扩展商店描述链接到该文件
- [ ] **DST-03**: `manifest.json` 静态 `host_permissions` 只包含 v1 已知公共域名（`https://discord.com/*`）；`optional_host_permissions: ["<all_urls>"]` 由 v1 即启用，覆盖用户自部署 OpenClaw 任意 origin 与未来 v2 平台的按需授权流程；任何静态 `<all_urls>` 都会触发 Web Store 评审风险
- [x] **DST-04**: 在 README 中提供完整的安装、使用、限制（OpenClaw 需本地运行 / Discord ToS 风险）说明，并附 zh_CN 与 en 两版

## v2 需求 (Requirements)

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

## 不在范围 (Out of Scope)

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

## 追溯表 (Traceability)

> 由 `gsd-roadmapper` 在生成 ROADMAP.md 时回填。每个 v1 REQ-ID 必须映射到恰好一个 phase。

| Requirement | Phase   | Status |
| ----------- | ------- | ------ |
| FND-01      | Phase 1 | ✓ Done (Plan 01-1) |
| FND-02      | Phase 1 | ✓ Done (Plan 01-3) |
| FND-03      | Phase 1 | ✓ Done (Plan 01-3) |
| FND-04      | Phase 1 | ✓ Done (Plan 01-2) |
| FND-05      | Phase 1 | ✓ Done (Plan 01-1) |
| FND-06      | Phase 1 | ✓ Done (Plan 01-4) |
| CAP-01      | Phase 2 | ✓ Done (Plan 02-02 + 02-04 + 02-05) |
| CAP-02      | Phase 2 | ✓ Done (Plan 02-03 + 02-04) |
| CAP-03      | Phase 2 | ✓ Done (Plan 02-02 + 02-03 + 02-04) |
| CAP-04      | Phase 2 | ✓ Done (Plan 02-02 + 02-04 + 02-05) |
| CAP-05      | Phase 2 | ✓ Done (Plan 02-06) |
| DSP-01      | Phase 3 | 待办   |
| DSP-02      | Phase 3 | 待办   |
| DSP-03      | Phase 3 | 待办   |
| DSP-04      | Phase 3 | 待办   |
| DSP-05      | Phase 3 | 待办   |
| DSP-06      | Phase 3 | 待办   |
| DSP-07      | Phase 3 | 待办   |
| DSP-08      | Phase 3 | 待办   |
| DSP-09      | Phase 3 | 待办   |
| DSP-10      | Phase 3 | 待办   |
| ADO-01      | Phase 4 | 待办   |
| ADO-02      | Phase 4 | 待办   |
| ADO-03      | Phase 4 | 待办   |
| ADO-04      | Phase 4 | 待办   |
| ADO-05      | Phase 4 | 待办   |
| ADO-06      | Phase 4 | 待办   |
| ADO-07      | Phase 4 | 待办   |
| ADD-01      | Phase 5 | 完成   |
| ADD-02      | Phase 5 | 完成   |
| ADD-03      | Phase 5 | 完成   |
| ADD-04      | Phase 5 | 完成   |
| ADD-05      | Phase 5 | 完成   |
| ADD-06      | Phase 5 | 完成   |
| ADD-07      | Phase 5 | 完成   |
| ADD-08      | Phase 5 | 完成   |
| ADD-09      | Phase 5 | 完成   |
| STG-01      | Phase 1 | ✓ Done (Plan 01-2) |
| STG-02      | Phase 1 | ✓ Done (Plan 01-2) |
| STG-03      | Phase 3 | 待办   |
| I18N-01     | Phase 6 | 待办   |
| I18N-02     | Phase 6 | 待办   |
| I18N-03     | Phase 6 | 待办   |
| I18N-04     | Phase 6 | 待办   |
| DST-01      | Phase 7 | 待办   |
| DST-02      | Phase 7 | 完成   |
| DST-03      | Phase 7 | 待办   |
| DST-04      | Phase 7 | 完成   |

**覆盖率：**

- v1 需求总数：47
- 已映射到 phase：47 (100%)
- 未映射：0

**按 phase 分布：**

| Phase     | Count  | Requirements                                                                                                             |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Phase 1   | 8      | FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, STG-01, STG-02                                                           |
| Phase 2   | 5      | CAP-01, CAP-02, CAP-03, CAP-04, CAP-05                                                                                   |
| Phase 3   | 11     | DSP-01, DSP-02, DSP-03, DSP-04, DSP-05, DSP-06, DSP-07, DSP-08, DSP-09, DSP-10, STG-03                                   |
| Phase 4   | 7      | ADO-01, ADO-02, ADO-03, ADO-04, ADO-05, ADO-06, ADO-07                                                                   |
| Phase 5   | 9      | ADD-01, ADD-02, ADD-03, ADD-04, ADD-05, ADD-06, ADD-07, ADD-08, ADD-09                                                   |
| Phase 6   | 4      | I18N-01, I18N-02, I18N-03, I18N-04                                                                                       |
| Phase 7   | 4      | DST-01, DST-02, DST-03, DST-04                                                                                           |
| **Total** | **48** | (说明：STG 行计为 3，分布为 Phase 1 ×2 + Phase 3 ×1；按 phase 累加为 48 是因为 STG 跨两个 phase — 唯一 REQ-ID 总数 = 47) |

> 覆盖说明：STG-01、STG-02 落在 Phase 1（任何流水线写入之前必须先有 storage 骨架），STG-03 落在 Phase 3（重置历史的 UI 位于 dispatch 设置面板）。唯一 v1 REQ-ID 总数 = 47；上方按 phase 累加得到 48 仅因为 STG 跨两个 phase — 每条 REQ-ID 实际仅映射到唯一一个 phase。

---

_需求定义日期：2026-04-28_
_最近更新：2026-04-30 — Plan 02-06 完成 CAP-05；Phase 2 capture 需求 5/5 全部 done（Wave 1-5 落地，Wave 6 e2e 待执行）_
