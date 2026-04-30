# CLAUDE.md

> 给 Claude Code 在 Web2Chat 项目工作时的项目级指导。
> 下方的自动生成区段标记允许 `gsd-tools` 做定向更新。

<!-- GSD:project-start source:PROJECT.md -->

## 项目 (Project)

**Web2Chat** — Chrome MV3 web-clipper 扩展。抓取页面结构化元数据（`title` / `url` / `description` / `create_at` / `content`），与用户绑定的 prompt 一起，通过 content script 的 DOM 注入投递到目标 IM 或 AI Agent web 聊天会话中。

**核心价值（Core Value）：** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话——主链路必须稳定可用。

**MVP 范围（v1）：** OpenClaw Web UI（`http://localhost:18789/chat?session=agent:<a>:<s>`）+ Discord（`https://discord.com/channels/<g>/<c>`）。

完整上下文、约束与关键决策见 `.planning/PROJECT.md`。

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## 技术栈 (Technology Stack)

- **框架：** WXT 0.20.x（MV3-first、Vite 原生、类型化 i18n + 存储、内置 Playwright 集成）
- **UI：** Preact 10.29 + `@preact/signals`（≈4 KB 运行时；适合 popup）
- **语言：** TypeScript 5.6+
- **i18n：** `@wxt-dev/i18n` 0.2.5（类型化消息键、manifest 本地化、无需异步初始化）
- **内容抽取：** `@mozilla/readability` 0.6（+ `defuddle` 0.17，覆盖非文章页面）
- **净化：** `dompurify` 3.2
- **HTML→Markdown：** `turndown` 7.2 + `turndown-plugin-gfm`
- **校验：** `zod` 3.24（跨上下文消息载荷）
- **存储：** `WxtStorage.defineItem<T>` 包装 `chrome.storage.local` / `.session`
- **测试：** Vitest 3 + `wxt/testing/fake-browser`（单元）+ Playwright 1.58 `launchPersistentContext + --load-extension`（E2E）
- **样式：** Tailwind v4（如遇 v4 问题回退到 CSS modules）

**不要使用：** Plasmo、`webextension-polyfill`、`i18next`、`<all_urls>`、`localStorage`、`innerText=` / `document.execCommand` 做编辑器注入。

理由与置信度详见 `.planning/research/STACK.md` 与 `.planning/research/SUMMARY.md`。

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## 约定 (Conventions)

**Service worker 纪律：**

- 所有事件监听器必须在模块顶层同步注册。`chrome.runtime.onMessage.addListener(...)` 等之前不要出现 `await`。
- 把 SW 当作无状态：所有状态在 handler 内部从 `chrome.storage.local` / `.session` 读取；不要假设 module-scope 变量在 SW 唤醒后还存在。
- 跨事件调度使用 `chrome.alarms`，不要使用 `setInterval` / `setTimeout`。

**权限：** `manifest.json` 中只声明 `activeTab` + `scripting` + `storage` + 静态 `host_permissions: ["https://discord.com/*"]`（v1 已知公共域名）+ `optional_host_permissions: ["<all_urls>"]`（覆盖用户自部署 OpenClaw 任意 origin 与未来 v2 平台）。**静态 `host_permissions` 中绝不使用 `<all_urls>`**；`<all_urls>` 只允许出现在 `optional_host_permissions` 中。OpenClaw 适配器在用户配置实例 URL 时通过 `chrome.permissions.request({ origins: [<具体 origin>] })` 动态获取该 origin 权限，授权后绑定到 send_to 历史项持久化到 storage。

**适配器模式：** 每个 IM 平台对应 `content/adapters/<platform>.ts` 一个文件，实现共享的 `IMAdapter` 接口（`match` / `waitForReady` / `compose` / `send`）。投递核心绝不硬编码任何平台特定逻辑。

**DOM 注入（React 受控 input）：** 使用 property-descriptor setter 技巧 — `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, text)` 之后再 `el.dispatchEvent(new Event('input', { bubbles: true }))`。集中实现于 `shared/dom-injector.ts`。

**DOM 注入（Slate / Lexical 编辑器，例如 Discord）：** 使用合成 `ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })`。绝不使用 `textContent =` / `innerText =`。

**i18n：** 用户可见的字符串全部走 `t(...)`；manifest 字段使用 `__MSG_*__`。ESLint 拦截 JSX/TSX 中的硬编码字符串。`en` 与 `zh_CN` locale 文件必须达到 100% 键覆盖率。

**存储：** 所有写入走类型化 repo（popup 与 SW 都不要直接调用 `chrome.storage.local.set`）。Schema 含 `version` 字段，迁移代码与 schema 定义放在一起。

**隐私：** 抓取的数据（URL / title / description / content / 用户 prompt）只本地保存，仅在用户主动选择目标 IM 后通过浏览器直接导航传递；绝不上报到任何第三方分析或遥测。

**测试：** 单元测试用 Vitest + `fake-browser`；E2E 用 Playwright 加载 unpacked 扩展。适配器 selector 在已提交的 DOM fixture（`tests/unit/adapters/<platform>.fixture.html`）上验证，而不是 live 站点。

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## 架构 (Architecture)

单 hub 模型 — service worker 作为两条流水线的特权协调者：

1. **抓取流水线（Capture pipeline）：** popup → SW → 在当前 active tab 执行 `chrome.scripting.executeScript(extractor)` → 把 `ArticleSnapshot` 返回 popup。
2. **投递流水线（Dispatch pipeline）：** popup → SW → 打开 / 激活目标 tab → 等待 `tabs.onUpdated: complete`（SPA 路由再加上 `webNavigation.onHistoryStateUpdated`）→ `executeScript(adapter)` → adapter `compose` + `send` → 结果回传 popup。

**分层模块：**

- `shared/` — 纯 TS 类型、`zod` 校验的类型化 messaging、storage repo、`t()` i18n facade
- `background/` — service-worker.ts（仅顶层 listener）、capture-pipeline、dispatch-pipeline、adapter-registry
- `content/extractor.ts` — Readability + DOMPurify + Turndown，运行在 `document.cloneNode(true)` 上
- `content/adapters/<platform>.ts` — 每个 IM 平台一个 bundle；只在投递时程序化注入
- `popup/` — Preact SPA，通过 `onChanged` 从 storage 读取，通过 RPC 调用 SW

**投递状态机：** 载荷 + 状态以 `dispatchId` 为键写入 `chrome.storage.session`，重复确认幂等，可在 SW 重启后续接。

ASCII 图、完整目录布局、以及类型化 `IMAdapter` 接口详见 `.planning/research/ARCHITECTURE.md`。

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## 项目技能 (Project Skills)

未发现项目级技能。可在 `.claude/skills/`、`.agents/skills/`、`.cursor/skills/` 或 `.github/skills/` 下添加技能目录，并在其中放置 `SKILL.md` 索引文件。

<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD 工作流强制 (Workflow Enforcement)

在使用 Edit、Write 等会改文件的工具之前，先通过 GSD 命令进入工作流，确保规划产物与执行上下文同步。

入口命令：

- `/gsd-quick` — 小修复、文档更新、临时任务
- `/gsd-debug` — 排查与修 bug
- `/gsd-execute-phase` — 已规划的 phase 执行
- `/gsd-discuss-phase <N>` 然后 `/gsd-plan-phase <N>` — 进入新的 phase

未经用户明确允许，不要绕开 GSD 工作流直接改仓库。

**当前状态：** v1 milestone，已规划 7 个 phase，可开始 Phase 1（扩展骨架）。实时进度见 `.planning/STATE.md`。

<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## 开发者画像 (Developer Profile)

> 由 `/gsd-profile-user` 于 2026-04-29 生成 | 270 messages / 12 projects
> 本节由 `generate-claude-profile` 管理 — 请勿手动编辑。完整画像见 `.planning/USER-PROFILE.md`。

**Language:** zh-CN (简体中文)
**Communication:** `terse-direct` (HIGH) — 匹配简洁风格，收到任务直接执行，不复述需求。
**Decisions:** `fast-intuitive` (MEDIUM) — 先给推荐方案 + 简短理由，不列长对比表。
**Explanations:** `code-only` (HIGH) + override — 常规任务直接给代码；**关键设计决策和陌生技术栈需要概念性讲解**（用户明确要求）。
**Debugging:** `hypothesis-driven` (MEDIUM) — 先验证开发者的假设，再给修复方案；修复失败时直接给纠正方案，不重复解释问题。
**UX:** `pragmatic` (LOW) — 默认功能优先；开发者给出具体设计方向时精确执行。
**Vendor:** `opinionated` (MEDIUM) — 尊重已选定的工具，不建议替代方案（除非有技术阻塞）。
**Frustrations:** `regression` (MEDIUM) — 改动前验证现有功能不受影响；修复失败立即承认并纠正，不叠加更多变更。不做超出请求范围的改动。
**Learning:** `self-directed` (MEDIUM) — 精准回答，不填充未被要求的背景上下文。

<!-- GSD:profile-end -->

## 用户约束 (User Constraints)

> 以下约束由用户手动添加，优先级高于 GSD 模板默认行为。

- [CRITICAL] 始终使用用户指定的语言沟通和编写文档；默认跟随用户语言，仅在明确要求时切换。
- [CRITICAL] 主动执行所有可自行运行的测试（单元测试、类型检查、lint、构建）；当且仅当真正无法自行执行时（如需要物理显示器的 headed E2E），才请求用户操作。
