# Phase 1: 扩展骨架 (Foundation) - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 交付一个**可加载、连线正确**的 Chrome MV3 扩展骨架——它本身不暴露任何业务功能，但为后续所有 phase 提供共享地基：

1. WXT 0.20.x 脚手架 + MV3 manifest（含本 milestone 全部已锁定的权限形状）
2. service worker 顶层同步注册的 listener，无 top-level await，所有状态由 handler 内从 storage 拉取
3. popup（Preact + Tailwind v4）通过类型化 RPC 调用 SW，演示 popup ↔ SW ↔ storage 端到端链路
4. 一份**极简但已带版本号 + migration 骨架**的 storage schema
5. `@wxt-dev/i18n` 就位、`en` + `zh_CN` locale 注册、popup hello-world 文案走 i18n
6. 工程基础设施：Vitest 单元测试 + GitHub Actions CI（lint + typecheck + vitest + manifest 校验）+ Husky pre-commit + ESLint（含轻量 hardcoded-string 防护）

Phase 1 **不**包含：实际抓取（CAP-* / Phase 2）、实际投递（DSP-* / Phase 3）、任何具体平台适配器（Phase 4-5）、运行时切换 locale（I18N-02 / Phase 6）、Web Store 打包（Phase 7）。

</domain>

<decisions>
## Implementation Decisions

### 1. Storage schema 一次落多深

- **D-01:** Phase 1 storage schema **极简 (probe-only)**——只落 `meta` 一个 item；其它 8 个已知 v1 storage items（`sendToHistory[]`、`promptHistory[]`、`sendToPromptBindings`、`grantedOrigins[]`、`settings`、`dispatchDraft`、`dispatchSession`、`errorLog`）由各自使用它们的 phase（2/3/4）追加。理由：simplicity first；现在没有真实写入场景的 shape 容易错。
- **D-02:** `meta` item 形态 = `{ schemaVersion: 1, helloCount: number }`。`schemaVersion` 是 FND-04 要求的版本号；`helloCount` 是 hello-world demo 的探针字段（见 D-08）。**不放 locale**——I18N-02 留在 Phase 6 落地，Phase 1 popup 文案走 `@wxt-dev/i18n` 默认机制（跟随 `chrome.i18n` UI 语言）。
- **D-03:** Storage migration 框架**真实就位**：`shared/storage/migrate.ts` 定义 `migrations: Record<number, (prev: unknown) => unknown>`；Phase 1 注册 `v0 → v1: () => ({ schemaVersion: 1, helloCount: 0 })`。SW 顶层 listener 注册之后的 `chrome.runtime.onInstalled` 与 storage 首次 read 路径上检查并跑 migration。结构真实、逻辑轻。
- **D-04:** `helloCount` 写入 `chrome.storage.local`（不是 `.session`）。验证强度上限：杀 SW 后 counter 仍递增 + 关闭重开浏览器后 counter 仍递增 = SW 生命周期 + storage 持久化双重证据。

### 2. 类型化消息协议形态

- **D-05:** 跨上下文 RPC 底层使用 **`@webext-core/messaging`**（WXT 官方文档推荐）。它提供 `defineExtensionMessaging<TProtocolMap>()`，类型推断自动化。zod 校验在 SW handler 入口（入参）+ popup 收到 response 后（出参）双向手写一行。
- **D-06:** **混合错误模型**：业务错走 `Result<T, E>` = `{ ok: true; data: T } | { ok: false; code: ErrorCode; message: string; retriable: boolean }`，**永不抛**业务错；程序错（zod parse 失败、handler crash、`chrome.*` API unexpected error）允许抛 throw，由顶层 listener wrapper 捕获并转换为 `{ ok: false, code: 'INTERNAL', ... }` 返回。`ErrorCode` 在 Phase 1 起步先包含 `INTERNAL` 一个码，后续 phase 各自扩枚举（DSP-07 加 `NOT_LOGGED_IN`/`INPUT_NOT_FOUND`/`TIMEOUT`/`RATE_LIMITED`，ADO-05 加 `OPENCLAW_OFFLINE`/`OPENCLAW_PERMISSION_DENIED`，等）。
- **D-07:** Phase 1 的 RPC `ProtocolMap` 集中在**单文件** `shared/messaging/protocol.ts`。Phase 1 只一条路由（`meta.bumpHello`）。Phase 3 路由数量超过 5 条时再按 feature 拆分到 `shared/messaging/routes/{capture,dispatch,history,...}.ts`，由 `protocol.ts` 聚合 import。

### 3. Hello-world 演示形态

- **D-08:** popup 的演示 = **读写 `helloCount`**。`shared/messaging/protocol.ts` 注册 `meta.bumpHello: () => Result<{ schemaVersion: number; helloCount: number }>`；SW handler 读 storage → `helloCount + 1` → 写回 → 返回新值。popup 渲染 `t('popup.hello', { count: N })`，例如 zh_CN 输出 "Hello, world ×N"，en 输出 "Hello, world (×N)"。
- **D-09:** popup mount 时**自动**触发一次 `meta.bumpHello`（不是按钮点击）。这让 Phase 1 成功标准 #4（杀 SW 后再点击 action 图标仍工作）的语义自然——每次点击 action = popup 重 mount = counter +1，前后两个值之差直接是存活证据。

### 4. 样式栈 + CI baseline

- **D-10:** popup 样式 = **Tailwind v4 from day 1**（与 STACK.md / SUMMARY.md 推荐一致）。WXT 0.20.x + Vite 7 + Tailwind v4（Vite plugin）的集成偶发问题在 plan 阶段排坑。STACK.md 中的"如遇 v4 问题回退到 CSS modules"被本决策**主动忽略**——若集成确实失败，作为执行期 deviation 处理，不在 Phase 1 计划中预留 fallback 分支。
- **D-11:** **GitHub Actions** 从 Phase 1 接入：`.github/workflows/ci.yml` 跑 `pnpm install` → `typecheck` → `lint` → `vitest` → `manifest 校验脚本`（断言静态 `host_permissions` 不含 `<all_urls>`、断言只有 `https://discord.com/*`）。**Playwright e2e 留到 Phase 4**（首个适配器落地、`launchPersistentContext + --load-extension` fixture 真实有用时再接入 CI）。Phase 1 本地 `pnpm test:e2e` 仍可手动跑。
- **D-12:** **Husky + lint-staged**。pre-commit 跑 typecheck + ESLint（含轻量 hardcoded-string 规则：JSX text node 不能是裸字符串 literal）+ prettier --write。**完整版 i18n hardcoded-string detector**（CJK + 大写英文启发式、跨多文件类型）留 Phase 6 的 I18N-03 完整落地。

### Claude's Discretion

下列决策在讨论中明确委托给 plan 阶段，由 planner 按 simplicity first 与已锁定的上下文裁定：

- **typed repo API 形态**：Phase 1 默认采用 WXT `storage.defineItem<T>()` 返回的薄 API（直接 import + `await metaItem.getValue()` / `setValue()`），不做业务 namespace 包装。Phase 3 引入历史与绑定 items 时再评估是否包装为 `repo.history.add(entry)` 这类业务方法层。
- **manifest entrypoint 命名 / 目录布局微观细节**：跟随 WXT 默认 `entrypoints/` 约定（`entrypoints/popup/index.html` + `entrypoints/popup/main.tsx` + `entrypoints/background.ts`），无需自定义 override 配置。
- **i18n message key 命名约定**：选 `popup.hello`、`popup.greeting` 这类 dot-notation 风格，与 `@wxt-dev/i18n` 类型化 key 推断兼容；具体每个文案的 key 名称由 plan 决定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目顶层上下文

- `CLAUDE.md` — 已锁定的技术栈、SW 纪律、权限模型、适配器模式、DOM 注入路径、i18n 与存储约定；下游 planner 必须把这里的所有"约定 (Conventions)"视为硬约束
- `.planning/PROJECT.md` — Core Value、约束、Key Decisions 表（含 OpenClaw 动态权限决策）
- `.planning/REQUIREMENTS.md` — Phase 1 对应的 8 条 REQ-ID（FND-01..06, STG-01, STG-02）的可观察验收要求
- `.planning/ROADMAP.md` §"Phase 1: 扩展骨架 (Foundation)" — 5 条成功标准的精确措辞（CI 校验 `<all_urls>`、popup TSX 无硬编码、杀 SW 后 RPC 仍工作 等）
- `.planning/STATE.md` — 当前进度与会话连续性

### 技术与架构调研

- `.planning/research/SUMMARY.md` — 总览：技术栈选择、架构、Top 5 陷阱；Phase 1 段落直接列出"骨架阶段交付什么 / 规避哪些陷阱"
- `.planning/research/STACK.md` — 各依赖的精确版本与"不要使用"清单（Plasmo / `webextension-polyfill` / `i18next` 等被显式排除）
- `.planning/research/ARCHITECTURE.md` — 单 hub service-worker 模型、`IMAdapter` 契约、目录布局；Phase 1 即落地的 `shared/` / `background/` / `popup/` 三层
- `.planning/research/PITFALLS.md` — 陷阱 3（SW 中途死亡）、陷阱 4（top-level await）、陷阱 9（Web Store 拒绝 / 过宽权限）、陷阱 11（i18n 后期改造）必须在 Phase 1 即规避
- `.planning/research/FEATURES.md` — 后续 phase 的功能预期（影响 Phase 1 的 storage schema 与 RPC 协议**留白**形态）

### 外部权威文档

- WXT 0.20.x 文档（entrypoints、storage、i18n、testing 配线）
- `@webext-core/messaging` 文档（`defineExtensionMessaging<TProtocolMap>()` API）
- Chrome MV3 文档：service worker 生命周期、`chrome.scripting`、`chrome.storage.local/.session`、`chrome.permissions`、`chrome.runtime.onMessage`、`chrome.runtime.onInstalled`、`__MSG_*__` manifest 本地化
- Tailwind CSS v4 + Vite 集成文档

### Phase 1 不需要 / 不会读的外部 spec

- 各 IM 平台 DOM contract（Discord / OpenClaw / 其它）— Phase 4-5 才需要

</canonical_refs>

<code_context>
## Existing Code Insights

仓库目前**只有** `CLAUDE.md` 与 `.planning/` 目录——零 source 代码。Phase 1 是真正的"green field"：从 `pnpm create wxt@latest` 起步。

### Reusable Assets

无。Phase 1 创建的 `shared/storage/`、`shared/messaging/`、`background/service-worker.ts`、`popup/` 都是后续 phase 的"reusable asset 源头"，而非反向。

### Established Patterns（来自 CLAUDE.md / research，Phase 1 必须遵守而非创立）

- **SW 纪律**：所有 listener 顶层同步注册；任何 `chrome.runtime.onMessage.addListener(...)` 之前不出现 `await`；模块级变量在 SW 唤醒后视为不存在
- **Storage 路径**：popup 与 SW 都不直接 `chrome.storage.local.set(...)`，统一通过 `shared/storage/items.ts` export 的 typed item
- **i18n 路径**：用户可见字符串只能走 `t(...)`（@wxt-dev/i18n facade）；ESLint 拦截 JSX/TSX 中裸字符串
- **目录命名**：`shared/` / `background/` / `content/` / `popup/`（来自 `.planning/research/ARCHITECTURE.md` §"分层模块"）

### Integration Points

Phase 1 创建的接口 / 表会被以下 phase 直接消费：

- `shared/messaging/protocol.ts` 的 `ProtocolMap` —— Phase 2 加 `capture.run`，Phase 3 加 `dispatch.start` / `dispatch.cancel` / `history.list` / `binding.set`，Phase 4 加 `permissions.requestOrigin`
- `shared/storage/items.ts` —— Phase 2 加 `articleSnapshotDraft`，Phase 3 加 `sendToHistory` / `promptHistory` / `bindings` / `dispatchDraft` / `dispatchSession`，Phase 4 加 `grantedOrigins`
- `shared/storage/migrate.ts` —— 任何后续修改 v1 schema 字段的 phase 必须在这里追加 v1 → v2 migration（v1 内部追加新 item 不需要迁移）
- `shared/i18n/` 与 `_locales/{en,zh_CN}/messages.json` —— Phase 2-7 所有可见字符串入此处；Phase 6 在此基础上做覆盖率检查与运行时切换
- `.github/workflows/ci.yml` —— Phase 4 加 Playwright job；Phase 7 加 zip 与 release artifact step

</code_context>

<specifics>
## Specific Ideas

- **popup hello-world 文案**：读出 `helloCount` 后渲染 `t('popup.hello', { count })`。zh_CN messages.json: `"popup_hello": { "message": "你好，世界 ×$COUNT$", ... }`；en: `"popup_hello": { "message": "Hello, world (×$COUNT$)", ... }`。具体文案让 plan 阶段在 messages.json 草稿中确定。
- **manifest 校验脚本**：在 `scripts/verify-manifest.ts`（或 `.mjs`）中实现，CI 与 pre-commit 都调用同一个脚本。断言：(1) 静态 `host_permissions` 数组严格 === `["https://discord.com/*"]`；(2) `optional_host_permissions` 严格 === `["<all_urls>"]`；(3) `permissions` 数组包含且只包含 `activeTab` / `scripting` / `storage`；(4) `default_locale === "en"`；(5) `name` / `description` / `default_title` 走 `__MSG_*__`。
- **杀 SW 验证**：成功标准 #4 的本地手测路径——`chrome://extensions → Service worker → Stop` 之后立即点击 action 图标，期望 popup 弹出且 `helloCount` 仍 +1。Phase 1 文档（README dev section）写入这条手测脚本。

</specifics>

<deferred>
## Deferred Ideas

讨论中提到但**不在 Phase 1** 落地的项，按目标 phase 分组：

### 留 Phase 2

- `articleSnapshotDraft` storage item（CAP-05 popup 编辑后投递前的暂存）

### 留 Phase 3

- `sendToHistory` / `promptHistory` / `bindings` / `dispatchDraft` / `dispatchSession` storage items（DSP-02/03/04/06/09）
- `dispatch.*` / `history.*` / `binding.*` RPC 路由
- `messaging/routes/*.ts` 拆分（路由超 5 条触发，预计在 Phase 3 中完成）
- typed-repo 业务 namespace 包装的去留评估

### 留 Phase 4

- `grantedOrigins` storage item（ADO-07 OpenClaw 动态权限授权过的 origin 集合）
- `permissions.requestOrigin` RPC 路由
- Playwright e2e 接入 GitHub Actions CI

### 留 Phase 6

- `meta.locale` 字段 + 运行时 locale 切换（I18N-02）
- 完整版 hardcoded-string detector ESLint 规则（I18N-03）—— Phase 1 只上 JSX 裸字符串 literal 这一条轻量规则
- locale 文件覆盖率 CI 检查

### 留 Phase 7

- zip / release artifact CI step（DST-01）
- PRIVACY.md（DST-02）

### 已驳回的方案（不进 deferred，仅记录）

- "Tailwind v4 集成不通就回退 CSS modules" —— 主动忽略 STACK.md 的 fallback 建议；若集成失败按执行期 deviation 处理
- "popup 演示中提供 Say hello 按钮" —— 选了 popup mount 自动 bump，更贴近 Phase 1 成功标准 #4 的"点击 action = popup 重新 mount"语义

</deferred>

---

*Phase: 1-foundation*
*Context gathered: 2026-04-29*
