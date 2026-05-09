# Phase 2: 抓取流水线 (Capture Pipeline) - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 交付**抓取这一半**的核心价值：用户点击 action 图标 → popup 自动让 SW 在当前 active tab 注入 extractor → 返回结构化的 `ArticleSnapshot`（`title` / `url` / `description` / `create_at` / `content`） → popup 在 2s 内渲染五个字段，并支持用户编辑 `title` / `description` / `content`，三态分离 loading / empty / error。

Phase 2 **包含**：

1. `content/extractor.ts` 独立 bundle —— 在 active tab 上跑 `Readability(document.cloneNode(true)).parse()` → DOMPurify 净化 → Turndown + GFM 转 Markdown
2. `background/capture-pipeline.ts` —— SW 端编排：URL scheme 预检 → `chrome.scripting.executeScript({ files: ['content/extractor.js'] })` → `tabs.sendMessage` 回包 → 校验 → 返回 popup
3. `shared/messaging/protocol.ts` 新增 `capture.run` 路由 + `ArticleSnapshot` zod schema；`shared/messaging/result.ts` 的 `ErrorCode` 联合扩展三个 capture 专属码
4. popup 在 mount 时自动派发 `capture.run` RPC（与 Phase 1 helloCount mount-trigger 模式一致），渲染 loading / empty / error 三态 + always-on textarea 编辑 UI（编辑值仅活在 Preact signals 内）
5. Vitest 单元覆盖：description fallback 三分支、create_at ISO-8601 by SW、Markdown sanitization 不留 `<script>`、Markdown 往返保留标题/代码块/链接
6. Playwright e2e：本地 fixture 文章页 → popup 2s 内填满五字段；以及受限 URL（chrome://newtab）→ popup 渲染 error 三态

Phase 2 **不**包含：

- `articleSnapshotDraft` storage item 写入（推到 Phase 3 dispatch flow，与 send_to / prompt 草稿一并落 storage —— 见 `<deferred>`）
- Defuddle / 非文章页面（Reddit / YouTube / HN / GitHub）覆盖（v1.x 优化）
- `content` 长度上限 / 截断（Phase 3 按 dispatch payload + IM 平台限制再裁）
- `chrome.alarms` / 后台周期任务（与抓取无关）
- Discord mention escape / Markdown 关键字 escape（Phase 5 Discord 适配器层处理）
- 任何 dispatch / `chrome.tabs.create` / `chrome.tabs.update` 路径（Phase 3）
- 运行时 locale 切换（Phase 6 / I18N-02）

</domain>

<decisions>
## Implementation Decisions

### 1. Extractor 组合 (D-13)

- **D-13:** **Readability-only**。`@mozilla/readability@^0.6` 单一抽取器；不引入 `defuddle`。理由：(a) CAP-02 唯一点名 `@mozilla/readability`；(b) Roadmap 成功标准 #1 验证目标是 Wikipedia / blog 文章页；(c) Defuddle 覆盖的非文章页（Reddit / YouTube / HN / GitHub）属于 v1.x 优化，不在 MVP 阻塞链路；(d) 双跑 = 多一份 fixture + 一个分派阈值决策，违反 simplicity-first。Defuddle 集成留 v1.x（见 `<deferred>`）。
- **D-14:** Readability 必须传 `document.cloneNode(true)` —— 否则 `parse()` 会改写 live DOM，污染用户当前页面。这是已锁定的硬约束（PROJECT.md / STACK.md / PITFALLS §安全错误第 1 条 一致要求）。

### 2. 捕获触发与受限 URL (D-15..D-17)

- **D-15:** **popup mount 自动 trigger**。popup 一挂载就向 SW 发 `capture.run` RPC，无显式 Capture 按钮。理由：(a) Roadmap 成功标准 #1 "popup 在点击后 2s 内显示全部五个字段填充完毕" 直接暗指自动；(b) 与 Phase 1 helloCount 在 popup mount 上自动 +1 的模式语义一致 —— "点击 action = popup 重 mount = 一次新动作"；(c) 不留 button-click hover 给用户增加心智负担。重抓 = 关闭 popup 再点击 action 图标重开。
- **D-16:** **URL scheme 预检在 SW handler 入口**。`capture-pipeline` 第一步 `tabs.query({ active: true, lastFocusedWindow: true })` 拿到 active tab URL 后，校验 scheme ∈ `{http, https}`；命中 `chrome:`、`chrome-extension:`、`file:`、`about:`、`devtools:`、`view-source:` 等任意一种立刻返回 `Err('RESTRICTED_URL', t-key, retriable=false)`，不进 `executeScript`。理由：直接 `executeScript` 在受限页面会抛 `Cannot access contents of url ...`，错误文案泛化、不可用于 i18n；预检让 popup 能给精准的 error 三态文案（"无法在内置页面上抓取"），而不是把 chrome://newtab 与"页面 JS 抛错"归到同一桶。
- **D-17:** **三个新 ErrorCode**：`RESTRICTED_URL`（受限 URL，不重试）、`EXTRACTION_EMPTY`（Readability `parse()` 返回 null 或 content 为空，**走 popup 的 empty 三态**而非 error 三态，仍是 `Result.err` 形态以保持 popup 单一分支语义）、`EXECUTE_SCRIPT_FAILED`（`chrome.scripting.executeScript` 抛错，retriable=true）。`shared/messaging/result.ts` 的 `ErrorCode` 联合从 `'INTERNAL'` 扩展为 `'INTERNAL' | 'RESTRICTED_URL' | 'EXTRACTION_EMPTY' | 'EXECUTE_SCRIPT_FAILED'`。文件头注释里 Phase 3 / Phase 4 / Phase 5 留白的扩展计划保持不变。

### 3. 内容形态与上限 (D-18..D-20)

- **D-18:** **`ArticleSnapshot.content: string` 单字段，存 Markdown**。流水线：Readability `parse()` → 拿 `articleNode` HTML → DOMPurify (默认 profile，不放宽) → Turndown 7.2 + `turndown-plugin-gfm`（表格、删除线、fenced code、task list） → Markdown string。**不**同时保留 sanitized HTML —— 要 HTML 预览到 Phase 6 / 后续 if-needed 再加。
- **D-19:** **Phase 2 不加 content 长度上限**。理由：(a) `chrome.storage.local` 单 item 配额约 10 MB，单篇 Markdown 文章常 < 100 KB，cap 在 Phase 2 是过度设计；(b) Phase 3 dispatch 按 IM 平台具体限制（Discord 单消息 2000 字符 / OpenClaw 不限）裁更精准；(c) Phase 2 的 snapshot 仅活在 popup signals 与一次 RPC payload，没有写入 storage，配额根本不构成风险。**例外**：Phase 3 必须在 dispatch 前实施裁切，并保留 `truncated: boolean` 元字段 —— 留作 Phase 3 的输入约束（见 `<deferred>`）。
- **D-20:** **DOMPurify 用默认 profile**。不放宽 `ALLOWED_TAGS`/`ALLOWED_ATTR`，不开 `KEEP_CONTENT`。理由：popup **绝不**渲染 HTML（只渲染 Markdown 经 Preact 文本节点），XSS 攻击面 = 0；DOMPurify 保留的 HTML 子集足够 Turndown 还原标题、列表、链接、代码、表格。**不**自定义 hooks；如未来出现 IM 平台需要嵌入 `<details>` / `<sup>` 等小众 tag 才放宽。

### 4. 编辑 UX + draft 持久化 (D-21..D-22)

- **D-21:** **always-on `<textarea>` 编辑**。`title` / `description` / `content` 三个字段在 popup 抓取成功后立即以 `<textarea>` 形式渲染（`title` 用单行高度的 textarea 而非 `<input>`，统一用 textarea-style focus / autosize 行为）。无 click-to-edit gate 模式。理由：simplicity first；用户对自己每次主动打开 popup 的动作负责，不需要"防误改"二级确认。
- **D-22:** **Phase 2 不落 draft storage**。所有编辑值仅活在 popup 的 Preact signals（`titleSig`, `descriptionSig`, `contentSig`），popup 关闭即清空。`articleSnapshotDraft` storage item / `chrome.storage.session` schema / debounce 写入路径**完整推到 Phase 3**，与 send_to / prompt / dispatch draft 一并设计 —— Phase 3 的 dispatch 流程才是真正需要"编辑后值跨 popup 关闭存活、最终随 dispatch payload 出发"的语义边界。Phase 1 把 `articleSnapshotDraft` 列入 deferred 时虽指向 Phase 2，但 Phase 2 单独存在时 draft 没有落地理由。该 deferral 文档在 `<deferred>`。

### Claude's Discretion

下列决策在讨论中明确委托给 plan 阶段，由 planner 按 simplicity-first 与已锁定的上下文裁定：

- **`ArticleSnapshot` zod schema 的精确字段约束**：`title` / `description` 是否允许空字符串（推荐：允许空串、但 nullable 由 Result.err(EXTRACTION_EMPTY) 承担）；`url` 是否做 `z.string().url()` 严格校验（推荐：是）；`create_at` 的格式（推荐：`z.string().datetime()` 严格 ISO-8601）。
- **description fallback 链的实现位置**：在 `content/extractor.ts` 内部实现 `meta[name="description"]` → `meta[property="og:description"]` → Readability `excerpt` 三段查询（三段都 trim、去空白），还是拆出 helper。推荐：单文件内顺序 try。
- **extractor 注入 world**：`ISOLATED`（默认）vs `MAIN`。Readability 只读 DOM 不依赖页面 JS state，推荐 `ISOLATED`（与 ARCHITECTURE.md 模式 3 一致）。
- **测试 fixture 形态**：本地 HTML fixture（`tests/e2e/fixtures/article.html` 类似 Wikipedia / blog post 结构）vs 抓取的 `data:text/html,...` URL。推荐：本地 HTML 文件 + Playwright `page.setContent` 或 file:// + `--allow-file-access-from-files`，前者更稳。
- **空白/换行规范化**：从 Turndown 输出再做一道 trim 与 `\n\n+` collapse vs 信任 Turndown 默认。推荐：信任默认，发现具体问题再加。
- **popup 三态视觉细节**：loading 用 skeleton 还是 spinner、empty 文案精确措辞、error 文案是否带 retry 按钮。推荐：loading 用 skeleton；empty / error 都给 i18n 文案 + 都带 "重试" 按钮（即关闭 popup 重开，无独立按钮）。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目顶层上下文

- `CLAUDE.md` — 已锁定的 SW 纪律、权限模型、DOM 注入路径、i18n 与存储约定；下游 planner 必须把这里的所有"约定 (Conventions)"视为硬约束
- `.planning/PROJECT.md` — Core Value、约束、Key Decisions 表（含权限模型决策）
- `.planning/REQUIREMENTS.md` §"Capture (页面抓取)" — Phase 2 对应的 5 条 REQ-ID（CAP-01..05）的可观察验收要求
- `.planning/ROADMAP.md` §"Phase 2: 抓取流水线" — 5 条成功标准的精确措辞（2s 内填满、Markdown 往返、description fallback 三分支、create_at ISO-8601 by SW、loading/empty/error 三态 + 编辑可见）
- `.planning/STATE.md` — 当前进度与会话连续性
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 的 D-01..D-12 决策（typed messaging、Result/ErrorCode 模型、storage migration 框架、popup 自动 mount-trigger 模式、Tailwind v4 from day 1、CI baseline）

### 技术与架构调研

- `.planning/research/SUMMARY.md` §"阶段 2：抓取流水线 (Capture Pipeline)" — 总览交付物 + 使用的库
- `.planning/research/STACK.md` §"配套库" — Readability 0.6 / DOMPurify 3.2 / Turndown 7.2 + GFM 的精确版本与用法约束（cloneNode(true) / DOMPurify 必须前置 / GFM 表格支持）
- `.planning/research/ARCHITECTURE.md` §"Capture 数据流" + §"模式 3：以编程注入取代静态 `content_scripts`" — 抓取 RPC 形态、extractor 独立 bundle 模式
- `.planning/research/PITFALLS.md` 重点段：
  - §陷阱 11（i18n） — popup HTML body 不支持 `__MSG_*__`，所有三态文案与编辑字段 label 走 `t(...)` JS 替换
  - §"集成坑" 行 "页面元数据 description" — fallback 链对 SPA 客户端渲染 meta 的限制（Phase 2 验证页是静态文章，但 fallback 链本身要正确）
  - §"集成坑" 行 "页面 content 抓取" — 修剪空白、规范化换行
  - §"安全错误" 第 1 行 — 抓取内容当纯文本处理；popup 绝不 innerHTML 渲染
  - §"性能陷阱" 第 5 行 — "内容大小上限"（Phase 2 决定不加，Phase 3 落地）
  - §"看似完成但其实没"清单：抓取流水线 description fallback / content 大小上限 两项
- `.planning/research/FEATURES.md` — Phase 3 / Phase 4 / Phase 5 的 dispatch 入口契约（影响 Phase 2 `ArticleSnapshot` 字段不能少给）

### 外部权威文档

- WXT 0.20.x §"content scripts" §"messaging" §"testing" — extractor 独立 bundle 配置、`chrome.scripting.executeScript({ files })` 用法、Vitest plugin
- `@mozilla/readability` 文档 — `parse()` 返回结构（`title`、`content` HTML、`textContent`、`excerpt`、`byline`、`siteName`）
- DOMPurify 文档 — 默认 profile 行为、`sanitize(htmlString)` 返回 string
- Turndown 文档 + `turndown-plugin-gfm` — `Turndown.use(gfm)` 接通；fenced code / table / strikethrough rule
- Chrome MV3 §`chrome.scripting.executeScript` §`chrome.tabs.query` §`chrome.tabs.sendMessage` — 编程注入路径与回包

### Phase 2 不需要 / 不会读的外部 spec

- 各 IM 平台 DOM contract — Phase 4 / 5 才需要
- `chrome.storage.session` 详细生命周期 — Phase 3 / Phase 4 才会落 dispatch session 状态
- `chrome.permissions.request` API — Phase 4 OpenClaw 动态权限才会用

</canonical_refs>

<code_context>
## Existing Code Insights

仓库已落地 Phase 1 骨架，Phase 2 在它的几个明确扩展点上叠加，**不**重写既有结构。

### Reusable Assets

- **`shared/messaging/protocol.ts`** — `ProtocolMap` interface + `schemas` const + `defineExtensionMessaging<ProtocolMap>()` exports。Phase 2 在此 interface 加 `capture.run`，在 `schemas` const 加对应 input/output zod schema；不拆文件（D-07 的 5-route 阈值未触发）。
- **`shared/messaging/result.ts`** — `ErrorCode` 联合 + `Result<T, E>` + `Ok` / `Err` helpers。Phase 2 在此扩展 `ErrorCode` 三个新码（D-17）；helper 不动。
- **`shared/messaging/index.ts`** — 公开 surface barrel。如果 Phase 2 在 protocol.ts 公开新类型（`ArticleSnapshot`），需在此 re-export。
- **`shared/storage/items.ts` / `migrate.ts`** — Phase 2 **不动**。Phase 3 dispatch 流程才会加 `articleSnapshotDraft` item 与对应迁移（如有 schema bump）。
- **`shared/i18n/`**（已就位） — Phase 2 popup 全部新增文案走 `t('capture.*')` 命名空间；en + zh_CN locale 100% 同构（CI 检查从 Phase 1 即在）。
- **`entrypoints/background.ts`** — `defineBackground(() => { ... })` + 顶层 `onMessage('meta.bumpHello', wrapHandler(async () => ...))` 模式。Phase 2 在同一个 `defineBackground` 闭包内顶层追加 `onMessage('capture.run', wrapHandler(async () => ...))`，**不**抽 `capture-pipeline` 到独立模块除非业务核 > ~50 行（按 D-07 同等克制原则）；逻辑可以抽进 `background/capture-pipeline.ts` 但 listener 注册必须留在顶层 `defineBackground`。
- **`entrypoints/popup/App.tsx`** — Phase 1 hello-world UI。Phase 2 演化成"抓取预览 + 编辑" 屏：替换 hello UI、保留 `t(...)` 入口、复用 Tailwind v4 类名。**不**引入路由 / 第二屏（Phase 3 的 SendForm / HistoryDropdown / PromptPicker 才进入）。
- **`scripts/verify-manifest.ts`** — 已断言静态 `host_permissions === ["https://discord.com/*"]` 与 `optional_host_permissions === ["<all_urls>"]`。Phase 2 不修改 manifest 权限（capture 走 `activeTab`，不申新 origin），脚本断言**保持不变**。
- **`tests/unit/messaging/bumpHello.spec.ts` 等已就位 fakeBrowser fixture** — Phase 2 capture-pipeline 单元测试沿用同一 `wxt/testing/fake-browser` + happy-dom 模式。
- **`tests/e2e/`**（Phase 1 已 ship 3 specs，CDP `ServiceWorker.stopWorker` 模式可用） — Phase 2 加 capture e2e spec 时不复用 SW-restart 编排（capture 是单 SW 闭包内动作），但 `launchPersistentContext + --load-extension` fixture 与 manifest verify 共享。

### Established Patterns（来自 Phase 1，必须遵守而非创立）

- **SW 顶层 listener 注册**：`onMessage('capture.run', wrapHandler(async () => {...}))` 必须出现在 `defineBackground` 顶层闭包同步路径上，前面绝无 `await`（FND-02）
- **`wrapHandler` 单类参签名**：`<R>(fn: () => Promise<R>) => () => Promise<R>` —— Phase 1 D-07 的精化记录在意，Phase 2 跟随，不重构。
- **Result 单一路径**：业务"无内容"走 `Err('EXTRACTION_EMPTY', ...)` 而非 `Ok({ empty: true, ... })`；popup 用 `result.ok` 一处分支
- **i18n key dot-notation**：新文案统一 `capture.loading` / `capture.empty.title` / `capture.error.restricted` / `capture.error.scriptFailed` / `capture.field.title` ... 等命名空间
- **Tailwind v4 utility-first**：popup 新增三态 + textarea 编辑全部走 utility class，不引 CSS module
- **storage 写入唯一通过 typed repo**：Phase 2 不写 storage（D-22），但 popup 读取 metaItem.helloCount 的演示数据该删除（hello-world 已退役） —— 见 Plans 阶段处理

### Integration Points

Phase 2 创建的接口 / 数据结构会被以下 phase 直接消费：

- `shared/messaging/protocol.ts` 的 `capture.run` 路由 + `ArticleSnapshot` 类型 —— Phase 3 SendForm 在 confirm 时把这个 snapshot 与 send_to / prompt 拼成 dispatch payload；Phase 4 / 5 adapter 在 `compose(message)` 之前会读 snapshot 字段
- `shared/messaging/result.ts` 的 `ErrorCode` 联合扩展 —— Phase 3 / 4 / 5 继续 append 自家错误码，无 schema bump
- `content/extractor.ts` 独立 bundle —— Phase 6 i18n 加固时若需要审计裸字符串，extractor 内部任何运行时常量都不会暴露给用户（runs in isolated world，不渲染 UI），但需要 grep 一遍确认无遗漏
- popup 的 always-on textarea 编辑 + 三态显示 —— Phase 3 SendForm 会把这块作为子区域嵌入（"snapshot preview" 子区） + 上方加 send_to / prompt 输入；Phase 6 打磨时审计 a11y（`aria-label`、tab order）
- Phase 2 的 e2e fixture（本地 HTML 文章页） —— 后续 phase 抓取 e2e 沿用同一 fixture 路径约定 `tests/e2e/fixtures/<name>.html`

</code_context>

<specifics>
## Specific Ideas

- **抓取流水线时序**（与 D-15..D-17 一致）：

  ```
  popup mount
    → useEffect: capture.run RPC 发出
    → SW handler:
        1. tabs.query({ active: true, lastFocusedWindow: true })
        2. URL scheme ∈ {http, https}? 否 → Err('RESTRICTED_URL', ...)
        3. create_at = new Date().toISOString()  // (CAP-04 — by SW, not by page)
        4. chrome.scripting.executeScript({ target: { tabId }, files: ['content/extractor.js'] })
           catch → Err('EXECUTE_SCRIPT_FAILED', ...)
        5. tabs.sendMessage(tabId, { type: 'CAPTURE_REQUEST' }) → ArticleSnapshotPartial
        6. snapshot = { ...partial, url, create_at }   // url + create_at by SW
        7. partial.content === '' || partial.title === '' && content === '' → Err('EXTRACTION_EMPTY', ...)
        8. zod parse output schema → Ok(snapshot)
    → popup useEffect 拿到 result：
        ok=true → 渲染 textarea 编辑屏 + Preact signals 初始化
        ok=false, code=RESTRICTED_URL → empty 三态 + i18n("capture.empty.restricted")
        ok=false, code=EXTRACTION_EMPTY → empty 三态 + i18n("capture.empty.noContent")
        ok=false, code=EXECUTE_SCRIPT_FAILED → error 三态 + i18n("capture.error.scriptFailed") + 重试提示
  ```

- **`ArticleSnapshot` 类型骨架**（在 `shared/messaging/protocol.ts` 定义，Result 数据通道，**不**进 storage）：

  ```ts
  export interface ArticleSnapshot {
    title: string;        // Readability.parse().title || document.title
    url: string;          // by SW from tabs.query result
    description: string;  // <meta name="description"> → og:description → Readability.excerpt
    create_at: string;    // ISO-8601 by SW at click time (CAP-04)
    content: string;      // sanitized HTML → Markdown via Turndown + GFM (D-18)
  }
  ```

- **manifest 校验脚本同步检查 `web_accessible_resources`**（如有）：本 phase 未引入 `web_accessible_resources`，但 verify-manifest 既有断言保持，新增最多再加一条："`web_accessible_resources` 字段不存在或为空数组"（防御性，避免后续 phase 不小心暴露 extractor bundle）。

- **测试矩阵**：

  - 单元（Vitest + happy-dom + fakeBrowser）：
    - `tests/unit/extractor/description-fallback.spec.ts` —— 三个 fixture HTML（meta description / og:description / readability excerpt only）每条命中
    - `tests/unit/extractor/sanitize.spec.ts` —— 含 `<script>alert(1)</script>` 的 fixture 经 DOMPurify + Turndown 后 Markdown 不含 script
    - `tests/unit/extractor/markdown-roundtrip.spec.ts` —— 标题（# / ##）、代码块（```ts ... ```）、链接（`[text](url)`）保留
    - `tests/unit/messaging/capture.spec.ts` —— `capture.run` 时序 mock：受限 URL → RESTRICTED_URL；executeScript reject → EXECUTE_SCRIPT_FAILED；空 partial → EXTRACTION_EMPTY；正常 → Ok(snapshot) + create_at 是 ISO-8601 + create_at = mocked Date.now() 的 toISOString
  - E2E（Playwright + launchPersistentContext + --load-extension）：
    - `tests/e2e/capture.spec.ts` —— 打开本地 fixture 文章页 → 点击 action → popup 2s 内显示五字段 + textarea 可编辑
    - `tests/e2e/capture-restricted.spec.ts` —— 打开 `chrome://newtab` → popup 渲染 empty.restricted 文案

- **i18n 命名空间**：`capture.*` —— `capture.loading.label`, `capture.empty.noContent`, `capture.empty.restricted`, `capture.error.scriptFailed`, `capture.field.title`, `capture.field.description`, `capture.field.content`。en + zh_CN 100% 同构。

- **Phase 1 hello-world 演示退役**：Phase 2 popup 不再需要 `meta.bumpHello` 路由（已被 capture preview 替代）。**保留 SW 端 onMessage 注册 + meta storage item**（避免 Phase 1 测试断版 + 留作 SW 健康探针），但 popup 端不再调用。`metaItem.helloCount` 字段保留 schemaVersion 1 不变；不做 schema bump。是否物理删除路由由 plan 阶段的 simplicity-first 评估再定。

</specifics>

<deferred>
## Deferred Ideas

讨论中提到但**不在 Phase 2** 落地的项，按目标 phase 分组：

### 留 Phase 3

- `articleSnapshotDraft` 草稿 storage item（schema、读写路径、debounce） —— D-22；Phase 3 dispatch flow 把 send_to / prompt / snapshot edits 一并落 storage.session（或 .local，由 Phase 3 决策）
- `content` 长度上限与裁切逻辑 —— D-19；按 IM 平台具体限制（Discord 单消息 2000 字符 / OpenClaw 不限）裁，并在 dispatch payload 上携 `truncated: boolean` 元字段
- popup 加 SendForm / HistoryDropdown / PromptPicker（Phase 2 popup 仅 capture preview + 编辑）
- send_to ↔ prompt 绑定 + 历史下拉
- dispatchId / chrome.storage.session 状态机 / badge 生命周期 / 草稿恢复

### 留 Phase 4 / 5（Adapter phases）

- Markdown 关键字 escape / Discord mention 清理（`@everyone` / `<@id>`） —— PITFALLS §安全错误第 1 条；Phase 5 Discord adapter 在 dispatch 前对 snapshot.content + prompt 做 `escapeForDiscord` / `escapeForOpenClaw` 工具
- Adapter 注册表 / `IMAdapter` 契约 —— ARCHITECTURE.md 模式 2

### 留 v1.x（已在 REQUIREMENTS V1X-* 中登记）

- **Defuddle 集成 / 非文章页（Reddit / YouTube / GitHub / HN）覆盖** —— D-13；Defuddle 0.17 已在 STACK.md 锁定，加进来时是 Readability 后回退或 PlatformDetector 分派；不改 ArticleSnapshot shape
- 自定义 message template（`{{title}}` / `{{url}}` / `{{content}}` / `{{prompt}}` 变量） —— V1X-03；属于 dispatch payload formatter，不影响抓取流水线

### 留 Phase 6（i18n 加固）

- 运行时 locale 切换（I18N-02） —— Phase 2 popup 文案仍跟 `chrome.i18n` 浏览器 UI 语言，不接 settings UI
- ESLint 完整版 hardcoded-string detector（I18N-03） —— Phase 2 仍在 Phase 1 的轻量 JSX literal 拦截层运行

### 留 Phase 7（分发）

- PRIVACY.md 列出 capture 抓取的字段（url / title / description / create_at / content） —— DST-02；Phase 2 这次正式落地了"抓什么"，Phase 7 在隐私政策里 1:1 反映即可

### 已驳回的方案（不进 deferred，仅记录）

- "snapshot 同时存 sanitized HTML + Markdown" —— D-18 选 Markdown only；HTML 预览不在 Phase 2 / 3 / 4 / 5 任一 phase 的成功标准里
- "always-on textarea 之外加 click-to-edit gate" —— D-21；用户未要求防误改，加 gate 是 over-design
- "Phase 2 立 articleSnapshotDraft schema 但不写入" —— Phase 2 不需要 draft，连 schema 也不该提前定义；Phase 3 一起设计 send_to / prompt / snapshot draft 才避免拆散设计
- "Phase 2 给 content 加 100KB 截断上限" —— D-19；Phase 2 内 snapshot 不入 storage，配额非问题；下游 dispatch 限制由 Phase 3 按 IM 具体上限处理

</deferred>

---

*Phase: 2-capture*
*Context gathered: 2026-04-29*
