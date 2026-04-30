# Roadmap: Web2Chat

## Overview

Web2Chat 是一个 Chrome MV3 扩展，用于抓取结构化的页面元数据 + 内容，并将其与用户自定义的 prompt 一起，通过 content script DOM 注入投递到目标 IM / AI-Agent 聊天会话中。整体路线遵循 foundation-first 原则：先搭建一个正确连线的 MV3 骨架（从第一天起就内置 i18n + 存储 + 类型化消息），独立验证抓取一侧，然后叠加投递核心 + popup UX。两个适配器阶段（OpenClaw — 友好目标，然后 Discord — 最难目标）端到端验证完整链路。i18n 加固 + UX 打磨收拢散落项；分发阶段以 Web Store 就绪的安装包、隐私政策和双语 README 收尾。覆盖率为 7 个 phase 内 47/47 条 v1 需求。

## Phases

**Phase 编号说明：**

- 整数 phase（1–7）：v1.0 已规划的里程碑工作
- 小数 phase（例如 2.1）：保留给执行过程中发现的紧急插入项

- [x] **Phase 1: 扩展骨架 (Foundation)** ✓ Complete (2026-04-29) - 基于 WXT 的 MV3 脚手架，从第一天起就接入类型化消息、存储 schema 与 i18n
- [ ] **Phase 2: 抓取流水线** - 点击进入 popup 的元数据抓取 + Readability 内容抽取与 sanitisation
- [ ] **Phase 3: 投递核心 + Popup UI** - 标签页打开/注入编排、send_to ↔ prompt 绑定、草稿持久化、生命周期 badge
- [ ] **Phase 4: OpenClaw 适配器** - 在友好的本地目标上验证首条端到端投递链路
- [ ] **Phase 5: Discord 适配器** - 兼容 Slate/Lexical 的粘贴注入、SPA 路由处理、ToS 感知的限流器
- [ ] **Phase 6: i18n 加固 + 打磨** - 运行时切换语言、ESLint 禁止硬编码字符串、设置面板、错误信息人性化
- [ ] **Phase 7: 分发上架** - Web Store 就绪的 zip、隐私政策、为 v2 预留的 optional_host_permissions、双语 README

## Phase Details

### Phase 1: 扩展骨架 (Foundation)

**目标 (Goal)**：一个连线正确的 Chrome MV3 扩展，可以在 `chrome://extensions` 中加载，通过 i18n 在 popup 中显示 hello-world 字符串，并通过类型化消息在 service worker ↔ popup 之间往返一次，同时落地一个版本化的存储 schema。
**依赖 (Depends on)**：无（首个 phase）
**Requirements**：FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, STG-01, STG-02
**成功标准**（必须为 TRUE 的条件）：

1. WXT 解包构建可通过 `chrome://extensions → Load unpacked` 加载并显示工具栏 action 图标，manifest 仅声明 `activeTab` + `scripting` + `storage` + 静态 `host_permissions: ["https://discord.com/*"]` + `optional_host_permissions: ["<all_urls>"]`（覆盖用户自部署 OpenClaw 与 v2 平台的运行时按需授权）；评审者可从 `dist/manifest.json` 中确认这一点。
2. 点击 action 图标会打开 popup，显示一个来自 `_locales/en/messages.json` 与 `_locales/zh_CN/messages.json` 的 hello-world 字符串（通过切换浏览器语言并重新加载扩展验证）。
3. popup 通过 `zod` 校验的类型化消息协议成功向 service worker 发起 RPC，并渲染从 `chrome.storage.local` 读回的值（端到端证明 popup ↔ SW ↔ storage 链路）。
4. 通过 `chrome://extensions → Service worker → Stop` 杀掉 service worker 后再次点击图标仍能产生可工作的 RPC（证明监听器在模块顶层注册，没有顶层 await，没有依赖模块级状态）。
5. `vitest` 与 `@playwright/test`（配合 `chromium.launchPersistentContext --load-extension`）跑绿；CI workflow 校验构建产物中没有任何 _静态_ `<all_urls>` 引用（`<all_urls>` 只允许出现在 `optional_host_permissions` 中），popup TSX 中没有任何硬编码的用户可见字符串。

**Plans**：4 plans（4 waves，严格串行 — 每个 wave 依赖前一 wave 的输出）

Plans:

**Wave 1**
- [x] 01-1-scaffold-PLAN.md — WXT 脚手架 + manifest + 工程基础设施（CI / Husky / verify-manifest，FND-01 / FND-05）✓ Plan 01-1 (2026-04-28)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-2-storage-i18n-PLAN.md — 存储 schema + 迁移框架 + i18n facade（en + zh_CN，FND-04 / FND-06 / STG-01 / STG-02）✓ Plan 01-2 (2026-04-29)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-3-messaging-sw-PLAN.md — 类型化消息协议 + Service Worker 顶层 listener（FND-02 / FND-03）✓ Plan 01-3 (2026-04-29)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-4-popup-e2e-PLAN.md — Popup（Preact + Tailwind v4）+ Playwright e2e + 端到端验证（FND-01 / FND-06）✓ Plan 01-4 (2026-04-29)

**Cross-cutting constraints** *(must_haves.truths 跨 ≥ 2 plans 共同遵守)*:

- 静态 `host_permissions === ['https://discord.com/*']`，绝不含 `<all_urls>`；`<all_urls>` 仅出现在 `optional_host_permissions`（Plan 01 manifest + verify 脚本；跨所有 plan 守护，FND-05）
- 任何 storage 写入必须通过 typed repo（`metaItem`），禁直调 `chrome.storage.local.set`（Plan 02 定义 + Plan 03 SW handler / Plan 04 e2e 断言使用，STG-02）
- 用户可见字符串只能走 `t(...)`，popup TSX 不含裸 JSX 文本字面量（Plan 01 ESLint 规则 + Plan 02 i18n facade + Plan 04 popup 遵守，FND-06 + ROADMAP 成功标准 #5）
- `shared/storage/*` 与 `shared/i18n/*` 模块顶层不出现 `chrome.*` 调用（Plan 02 / 03 / 04 共同遵守，FND-02 + PITFALLS §陷阱 4）
- Tailwind v4 from day 1，无 CSS modules fallback（Plan 01 config + Plan 04 popup style，D-10）
- SW 顶层同步注册 listener，listener 注册前不出现任何 `await`（Plan 03 background.ts + 跨 plan 守护，FND-02 + PITFALLS §陷阱 4）

**UI hint**：yes

### Phase 2: 抓取流水线

**目标 (Goal)**：在任意网页上点击 action 图标产生一份 `ArticleSnapshot`（`title`、`url`、`description`、`create_at`、`content`），在 popup 中渲染，并清楚区分 loading / empty / error 状态，用户可以在投递前编辑 `title` / `description` / `content`。
**依赖 (Depends on)**：Phase 1
**Requirements**：CAP-01, CAP-02, CAP-03, CAP-04, CAP-05
**成功标准**（必须为 TRUE 的条件）：

1. 在代表性的文章 URL（例如一个 Wikipedia 或博客文章）上点击 action 图标，popup 在点击后 2s 内显示全部五个字段填充完毕；通过 Playwright 在本地 fixture 页面上验证。
2. 抓取到的 `content` 经 DOMPurify 净化并由 Turndown 转为 Markdown — Vitest 单元测试断言没有 `<script>` 残留，且 Markdown 往返保留标题、代码块和链接。
3. `description` 通过文档化的 fallback 链解析（`<meta name="description">` → `og:description` → Readability `excerpt`）— 三个 Vitest fixture 页面（每个分支一个）证明每条路径。
4. `create_at` 由 SW 在点击时生成，为 ISO-8601 时间戳（不是从页面派生）— 通过对冻结的 `Date.now()` mock 做 snapshot 测试断言。
5. popup 显式渲染 `loading`、`empty`（提取器未返回主要内容）、`error`（executeScript 抛错）状态；用户可以编辑 `title` / `description` / `content`，编辑后的值会出现在下一次投递的 payload 中（由 Playwright 证明）。

**Plans**：7 plans（6 waves）

Plans:

**Wave 1** *(并行)*
- [x] 02-01-PLAN.md — 安装 4 个运行时库 + @types/turndown（CAP-02）
- [x] 02-02-PLAN.md — 扩展 ErrorCode 联合 + ArticleSnapshotSchema + capture.run 路由（CAP-01 / CAP-03 / CAP-04）

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-03-PLAN.md — extractor content script（registration:runtime + Readability + DOMPurify + Turndown，CAP-02 / CAP-03）

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02-04-PLAN.md — 单元测试：extractor 三文件（jsdom）+ capture pipeline 四路径（CAP-01 / CAP-02 / CAP-03 / CAP-04）✓ Plan 02-04 (2026-04-30)

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 02-05-PLAN.md — SW capture-pipeline + background.ts 注册 + locale 键补齐（CAP-01 / CAP-02 / CAP-03 / CAP-04）

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 02-06-PLAN.md — Popup App.tsx 4-state capture UI（CAP-05）

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 02-07-PLAN.md — E2E fixture + capture.spec.ts + playwright webServer（CAP-01 / CAP-05）

**UI hint**：yes

### Phase 3: 投递核心 + Popup UI

**目标 (Goal)**：popup 表单（send_to + prompt + send_to ↔ prompt 绑定 + 历史下拉）驱动一个幂等、对 SW 重启具备韧性的投递流水线，打开/激活目标标签页、等待 `complete`，并准备好交接给具体平台的适配器；生命周期通过工具栏 badge 可见，且在 popup 关闭 + SW 重启后可恢复。
**依赖 (Depends on)**：Phase 1
**Requirements**：DSP-01, DSP-02, DSP-03, DSP-04, DSP-05, DSP-06, DSP-07, DSP-08, DSP-09, DSP-10, STG-03
**成功标准**（必须为 TRUE 的条件）：

1. 在 `send_to` 输入框中输入 URL 时，会在一次按键 debounce 内显示对应的平台图标（OpenClaw / Discord / 通用 fallback）；针对 `platformDetector` 的 Vitest 单元测试覆盖每个适配器正则。
2. `send_to` 历史下拉按 MRU + 频次排序；当用户选择不同的 `send_to` 条目时 `prompt` 自动切换（即绑定）；切换后用户对 `prompt` 的覆盖会被保留到下一条历史记录。Playwright E2E 断言：选择 A → prompt = pa → 选择 B → prompt = pb → 再选 A → prompt = pa。
3. 点击 "Confirm" 生成 UUID 形式的 `dispatchId`，将 payload + 状态（`pending` → `opening` → `awaiting_complete` → `awaiting_adapter`）以 `dispatchId` 为 key 写入 `chrome.storage.session`，并在工具栏 action 图标上以 badge（`...` / `ok` / `err`）展示生命周期进度。在 `opening` 与 `awaiting_complete` 之间杀掉 SW，并通过下一次 `tabs.onUpdated` 事件唤醒它后能从 `storage.session` 中拾取同一个 `dispatchId`（通过 `chrome.runtime.reload` 代理的 Playwright E2E 验证）。
4. 对同一个 `dispatchId` 重复点 Confirm（快速双击、popup 重新打开）拒绝重复注入 — `storage.session` 日志中恰好只记录一次执行；通过 200ms 内连续两次点击的 Playwright 验证。
5. 在编辑过程中关闭并重新打开 popup 时，从一份带 debounce、由 storage 支持的草稿中恢复 `send_to` / `prompt` / 已编辑的 `content`（DSP-09）；结构化错误码（`NOT_LOGGED_IN` / `INPUT_NOT_FOUND` / `TIMEOUT` / `RATE_LIMITED`）会以经过 i18n 本地化的人性化文案携带 `Retry` 按钮回传到 popup（DSP-07/08）；`commands` 快捷键（默认 `Ctrl+Shift+S`，用户可重绑）打开 popup 并触发抓取（DSP-10）；设置面板暴露一个带确认弹窗的 "Reset all history" 操作，可清空 send_to / prompt / 绑定（STG-03）。

**Plans**：TBD
**UI hint**：yes

### Phase 4: OpenClaw 适配器

**目标 (Goal)**：用户在任意页面上点击 action 图标，选择一个带 prompt 的 OpenClaw `http(s)://<host>:<port>/chat?session=agent:<a>:<s>` 目标（host 由用户配置，可能是 localhost、LAN IP 或自定义域名），5s 内一条格式化消息落入正在运行的 OpenClaw 会话中，popup 反映成功状态 — 这是投递链路在友好目标上的首次端到端验证。
**依赖 (Depends on)**：Phase 3
**Requirements**：ADO-01, ADO-02, ADO-03, ADO-04, ADO-05, ADO-06, ADO-07
**成功标准**（必须为 TRUE 的条件）：

1. OpenClaw 适配器不在 manifest 中静态枚举 OpenClaw URL；OpenClaw origin 通过 `optional_host_permissions: ["<all_urls>"]` 配合运行时 `chrome.permissions.request({ origins: [<具体 origin>] })` 动态获取。manifest 校验测试断言静态 `host_permissions` 中**不包含**任何 OpenClaw URL，也不包含 `<all_urls>`。
2. `match()` 识别 OpenClaw URL 模式，并从 query 中解析出 `agent_name` + `session_name` — Vitest 单元测试覆盖合法、畸形和带尾随斜杠的变体（含 `localhost:18789`、`192.168.1.100:8080`、`https://openclaw.example.com` 等多种 origin 形态）。
3. `compose()` 通过 property-descriptor setter + 冒泡 `input` 事件 helper（`shared/dom-injector.ts`）将格式化消息写入 OpenClaw 的 textarea；针对 JSDOM fixture 的 Vitest 测试证明 React 受控的 `<textarea>` 也会接受这条路径（向前兼容）。
4. `send()` 触发 Enter keydown / 发送按钮点击，`MutationObserver` 在 resolve 之前确认新的消息气泡出现在 OpenClaw 的会话流中 — 通过对本地 stub 化 OpenClaw 页面（或在可用时对真实服务器）运行的 Playwright E2E 测试验证；完整链路（popup 确认 → 消息出现在会话中）在测试 fixture 上 5s 内完成。
5. `canDispatch` 探针区分 "OpenClaw 服务未运行"（连接被拒）、"input 未找到"、以及 "origin 未授权"，并以经过 i18n 本地化的人性化文案 surfacing 结构化错误 `OPENCLAW_OFFLINE` / `OPENCLAW_PERMISSION_DENIED`（"OpenClaw 未在 X 上运行 — 请启动后重试" / "扩展未获取访问 X 的权限 — 点击重新授权"）；Playwright 覆盖离线路径与拒绝授权路径。
6. 用户首次输入新的 OpenClaw 实例 URL 时，扩展自动调用 `chrome.permissions.request`；用户授权通过则把已授权 origin 持久化进 `chrome.storage.local` 并绑定到该 send_to 历史项；用户拒绝时 popup 给出可重新触发授权的状态 — Playwright E2E 在两种用户答复（accept / deny）下分别验证。

**Plans**：TBD
**UI hint**：no

### Phase 5: Discord 适配器

**目标 (Goal)**：在用户已在同一浏览器 profile 登录 Discord 的前提下，从任意页面发起的一次投递，通过合成 ClipboardEvent 粘贴注入将一条格式化消息送达指定的 `https://discord.com/channels/<g>/<c>` 频道，并具备限流、登录墙检测和文档化的 ToS 风险声明。
**依赖 (Depends on)**：Phase 3（排序建议：在 Phase 4 敲定 `IMAdapter` 契约之后再执行；除非适配器契约 — `match` / `waitForReady` / `compose` / `send` 以及 `canDispatch` 探针形态 — 完全冻结，否则不要与 Phase 4 并行）
**Requirements**：ADD-01, ADD-02, ADD-03, ADD-04, ADD-05, ADD-06, ADD-07, ADD-08, ADD-09
**成功标准**（必须为 TRUE 的条件）：

1. Discord bundle 的 `host_permissions` 恰好包含 `https://discord.com/*`，`match()` 能从合法 URL 中正确解析 `server_id` + `channel_id`，同时拒绝 `/channels/@me/...` DM 路由和登录跳转。
2. `compose()` 通过合成 `ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })` 注入；针对捕获到的 `tests/unit/adapters/discord.fixture.html` 的 Vitest 单元测试证明优先 ARIA 的选择器（`role="textbox"` + `aria-label`，然后是 `[data-slate-editor="true"]`，最后才是 class 片段）能解析到唯一元素，且粘贴可在一个 `requestAnimationFrame` tick 后存活。
3. `waitForReady` 监听 `chrome.webNavigation.onHistoryStateUpdated`，并在 DOM 中出现频道相关的锚点（例如 `[data-list-id="chat-messages-<channelId>"]`）时 resolve，配合 5s 硬超时返回结构化 `TIMEOUT` 错误；连续向两个不同频道发起的快速投递绝不会跨频道误注入（带频道切换的 Playwright E2E 验证）。
4. 限流守卫会在 5 秒内拒绝向同一 `channel_id` 的第二次投递，错误码为 `RATE_LIMITED` 并附带经 i18n 本地化的人性化文案；popup 上有一条永久性脚注链接到 Discord ToS 风险声明。
5. "未登录" 路径（cookie 已清除）会检测到 `/login?redirect_to=...` 跳转并 surfacing `NOT_LOGGED_IN`，而不是让 popup 卡住；README + popup 脚注都以 zh_CN 与 en 引用 Discord ToS 风险。

**Plans**：TBD
**UI hint**：no

### Phase 6: i18n 加固 + 打磨

**目标 (Goal)**：扩展中所有用户可见字符串都流经类型化的 i18n facade，用户可以在不重新加载扩展的情况下运行时切换语言，manifest 字段做到本地化，并通过 ESLint 规则防止任何未来的硬编码字符串回退项目。
**依赖 (Depends on)**：Phase 1（i18n 框架自 Phase 1 起即已就位；本 phase 审计覆盖率并补齐运行时切换 + lint 强制约束）
**Requirements**：I18N-01, I18N-02, I18N-03, I18N-04
**成功标准**（必须为 TRUE 的条件）：

1. `pnpm test:i18n-coverage`（或等价的 CI 检查）断言 `_locales/zh_CN/messages.json` 和 `_locales/en/messages.json` 定义了代码库中所有 `t()` 调用引用的键 — 两种语言下覆盖率均为 100%，包含来自 Phase 4 + Phase 5 的所有适配器错误信息。
2. 设置面板暴露一个 "Language" 选择器（zh_CN / en）；切换后通过自定义的 locale loader（不依赖 `chrome.i18n` 浏览器锁定语言）在下一次渲染时立刻更新所有 popup 字符串，且选择跨 popup 重新打开和 SW 重启都会持久化在 `chrome.storage.local`。
3. `manifest.json` 的 `name`、`description` 和 `default_title` 使用 `__MSG_*__` 占位符，在 `chrome.management.getSelf()` 与 `chrome://extensions` 列表两种语言下都能正确解析。
4. flat-config 下禁止 JSX/TSX 字符串字面量呈现用户可见文案（CJK + 大写英文启发式）的 ESLint 规则在 CI 中运行，能拦截任何未来的硬编码字符串；通过一个有意添加 `<button>Send</button>` 的 fixture commit 验证 lint 红灯。

**Plans**：TBD
**UI hint**：yes

### Phase 7: 分发上架

**目标 (Goal)**：评审者可以从一个打包好的 zip 安装 Web2Chat，阅读到与实际数据处理一致的隐私政策，看到收窄的静态 `host_permissions`（v2 平台和用户自部署 OpenClaw 走 `optional_host_permissions: ["<all_urls>"]` 运行时按需授权），并按双语 README 完成安装、使用、OpenClaw 设置以及 Discord ToS 注意事项的指引。
**依赖 (Depends on)**：Phase 4、Phase 5、Phase 6
**Requirements**：DST-01, DST-02, DST-03, DST-04
**成功标准**（必须为 TRUE 的条件）：

1. `pnpm build && pnpm zip` 产生一个兼容 Chrome Web Store 的 `.zip`，无论是上传到面板的 "Upload draft"，还是把解压结果通过 `chrome://extensions → Load unpacked` 在本地加载，都能通过 manifest 校验，并且未经修改即可跑通 Phase 4 + Phase 5 的 happy-path Playwright E2E。
2. `PRIVACY.md`（在 repo 中提交并由 README + Web Store listing 描述链接）显式列出抓取的字段（`url` / `title` / `description` / `create_at` / `content` / 用户输入的 `prompt`），声明它们仅存储于 `chrome.storage.local` / `chrome.storage.session`，除用户选择的 IM 通过浏览器直接导航外，不会传输给任何第三方。
3. `manifest.json` 静态 `host_permissions` 仅包含 `https://discord.com/*`（v1 已知公共域名）；`optional_host_permissions` 声明为 `["<all_urls>"]`，覆盖用户自部署的 OpenClaw 任意 origin 与未来 v2 平台的运行时按需授权流程。manifest 校验测试断言静态部分**不包含** `<all_urls>`。
4. repo 根目录的 `README.md` 同时包含 `zh_CN` 和 `en` 章节，覆盖：安装（load unpacked + 未来的 Web Store 链接）、使用（action 图标、popup 表单、send_to 历史）、平台特定说明（OpenClaw 必须在本地运行；来自 Phase 5 的 Discord ToS 注意事项），以及一个 `## Limitations` 章节列出延后到 v2 的平台及其原因；通过 markdown lint 检查验证两种语言的锚点都存在。

**Plans**：TBD
**UI hint**：no

## Progress

**执行顺序：**
Phase 按数字顺序执行：1 → 2 → 3 → 4 → 5 → 6 → 7。Phase 6 仅以 Phase 1 为硬依赖，但 i18n 审计需要 Phase 3 的 UI 表面 + Phase 4–5 的适配器错误信息齐备才能穷尽，因此安排在 Phase 5 之后。理论上只有当 `IMAdapter` 契约在 Phase 3 末冻结时，Phase 4 与 Phase 5 才能并行 — 推荐的顺序保持串行，以便吸收来自 OpenClaw 经验对契约的精化。

| Phase                  | Plans Complete | Status      | Completed |
| ---------------------- | -------------- | ----------- | --------- |
| 1. 扩展骨架            | 4/4            | Complete    | 2026-04-29 |
| 2. 抓取流水线          | 4/7            | In progress | -         |
| 3. 投递核心 + Popup UI | 0/TBD          | Not started | -         |
| 4. OpenClaw 适配器     | 0/TBD          | Not started | -         |
| 5. Discord 适配器      | 0/TBD          | Not started | -         |
| 6. i18n 加固 + 打磨    | 0/TBD          | Not started | -         |
| 7. 分发上架            | 0/TBD          | Not started | -         |

---

_Roadmap created: 2026-04-28_
_Coverage: 47/47 v1 requirements mapped (100%)_
