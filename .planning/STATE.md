---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Executing
last_updated: "2026-05-02T02:25:00.000Z"
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 31
  completed_plans: 23
  percent: 74
---

# 项目状态

## 项目引用

参见：`.planning/PROJECT.md` (更新于 2026-04-28)

**核心价值：** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话。
**当前焦点：** Phase 4 complete — ready for Phase 5 (Discord adapter)

## 当前位置

- Phase：4 / 7（OpenClaw 适配器 — executed，4/4 plans complete）
- Plan：Phase 4 全部 4 plans 执行完毕（04-01..04-04）
- 状态：Phase 4 execution complete — 152 单元测试全绿 + 3 E2E specs (pending human verification)
- 最近活动：2026-05-02 — Phase 4 execute-phase 完成，4 waves 串行执行，~27 min

进度：[██████████] Phase 1 → [██████████] Phase 2 → [██████████] Phase 3 (E2E pending) → [██████████] Phase 4 (E2E pending)

## 性能指标

**速度：**

- 已完成 plan 总数：19
- 平均时长：~6.3m
- 累计执行时长：约 2.0 小时

**按 Phase：**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 1     | 4     | 42m   | 10.5m    |
| 2     | 7     | ~40m  | ~5.7m    |
| 3     | 8     | ~49m  | ~6.1m    |
| 4     | 4     | ~27m  | ~6.8m    |

**近期趋势：**

- 最近 5 个 plan：04-04 (10m), 04-03 (4m), 04-02 (8m), 04-01 (5m), 03-08 (5m)
- 趋势：Phase 4 plan 平均 ~6.8m；04-04 最重（E2E fixture + 3 specs + verify-manifest fix）耗时 10m

_每完成一个 plan 后更新_

## 累积上下文

### 决策

决策记录在 PROJECT.md 的 Key Decisions 表里。
对当前工作有影响的近期决策：

- Pre-Phase-1：仅支持 Chrome MV3（Firefox / Safari 推迟到 v2）
- Pre-Phase-1：MVP adapter = OpenClaw + Discord；v2 平台通过 `optional_host_permissions` 按需授权
- Pre-Phase-1：通过新开 tab + content script 完成 DOM 注入（不使用 Bot API、不引入后端）
- Pre-Phase-1：所有持久化状态写入 `chrome.storage.local` / `.session`（不使用 `localStorage`，无云同步）
- Pre-Phase-1：Phase 4（OpenClaw）先行于 Phase 5（Discord），让 `IMAdapter` 契约先吸收友好目标的经验，再去面对最难的目标
- 2026-04-28 — OpenClaw 自部署 origin 不可枚举（可能落在 localhost / LAN IP / 自定义域名），因此静态 `host_permissions` 只放 `https://discord.com/*`；`optional_host_permissions` 设为 `["<all_urls>"]`，OpenClaw 适配器与未来 v2 平台都通过 `chrome.permissions.request` 在用户配置实例 URL 时动态获取具体 origin 权限。Capture 仍走 `activeTab`。新增需求 ADO-07 覆盖该流程；v1 总数从 46 调整为 47（Phase 4 Requirements 现含 ADO-07）。
- 2026-04-28（Plan 01-1 执行）— 锁定 `packageManager` 为 `pnpm@10.33.2`；CI workflow `pnpm/action-setup version: 10` 与之对齐，避免 lockfile schema 错位让 `--frozen-lockfile` 失败。
- 2026-04-28（Plan 01-1 执行）— ESLint 类型感知规则（含 `no-floating-promises`）通过 `parserOptions.projectService` + `tsconfigRootDir: import.meta.dirname` 启用，且仅作用于 `**/*.{ts,tsx}`；这是 typescript-eslint v8 的现代 flat-config 写法。
- 2026-04-28（Plan 01-1 执行）— `tsconfig.json` 必须显式 `extends: "./.wxt/tsconfig.json"`（带 `./` 前缀）并把 `.wxt/wxt.d.ts` 加入 `include`，否则 WXT 自动 import 的全局（`defineBackground` 等）在 `tsc --noEmit` 下不可见。后续所有 plan 都依赖这个 tsconfig 形态。
- 2026-04-28（Plan 01-1 执行）— Tailwind v4 + WXT 0.20.x 的 Vite plugin 集成无任何坑（`vite() => ({ plugins: [tailwindcss()] })` 即工作）；D-10 锁定的"no CSS modules fallback"未被触发。Plan 04 popup 可直接走 `@import "tailwindcss";`。
- 2026-04-28（Plan 01-1 执行）— Phase 1 Plan 01-1 不交付任何测试，但 CI 跑 `pnpm test`；vitest 默认无文件即 exit 1，因此 `package.json` 的 `test` script 加 `--passWithNoTests`。Plan 02 起追加测试后该 flag 即 no-op。
- 2026-04-28（Plan 01-1 执行）— ESLint + Prettier ignores 必须包含 `.claude/` + `.planning/`（项目工作流文件不在 Web2Chat 源码 lint 范围内）。后续 plan 不要试图把这两个目录纳入 lint。
- 2026-04-29（Plan 01-2 执行）— WXT `storage.defineItem<T>` 原生支持 `version` + `migrations` 字段（@wxt-dev/storage 1.2.8）；无需手写 wrapper（Path A 确认，Path B 未触发）。
- 2026-04-29（Plan 01-2 执行）— @wxt-dev/i18n 0.2.5 YAML locale 默认路径为 `<srcDir>/locales/<lang>.yml`（非 `assets/locales/`）。Plan 文件中标注的 `assets/locales/` 路径不被 WXT 识别；实际使用 `locales/en.yml` + `locales/zh_CN.yml`。
- 2026-04-29（Plan 01-2 执行）— 项目 tsconfig.json 的自定义 `paths` 会完全覆盖 WXT `.wxt/tsconfig.json` 的 `paths`（TypeScript 不合并 paths）。必须在项目 tsconfig 中显式声明 `#i18n` 和 `@/*` 等 WXT 需要的路径别名。
- 2026-04-29（Plan 01-2 执行）— WXT 0.20.25 内部依赖 Vite 8（rolldown），Vitest 3.2 依赖 Vite 7（rollup）。`exactOptionalPropertyTypes: true` 下 WxtVitest plugin 类型不兼容，需 `as any` 绕过。运行时无影响。
- 2026-04-29（Plan 01-3 执行）— `defineBackground` 在 WXT 0.20.x 通过 `#imports` 虚拟模块自动暴露（实现位于 `wxt/utils/define-background`）；旧的 `wxt/sandbox` 路径在 0.20.25 已废弃，build 会失败。本 plan 选择显式 `import { defineBackground } from '#imports'` 而非依赖纯 auto-import，便于 grep 验证导入路径。
- 2026-04-29（Plan 01-3 执行）— `wrapHandler` 不按 ProtocolMap 路由名做映射类型，而是以业务返回类型 R 为单一类参（`<R>(fn: () => Promise<R>) => () => Promise<R>`）。原因：`Promise<ReturnType<ProtocolMap[K]>>` 在 K 为泛型时 TS 5.6 视为 `Promise<Promise<R>>`，触发 TS2322。Phase 1 仅一条路由,简化签名等价且 lint+typecheck 双绿。Phase 3 路由扩张时若需要按路由分派，再考虑用 `K extends keyof ProtocolMap` 重构。
- 2026-04-29（Plan 01-3 执行）— `bumpHello` 业务核心保留在 `entrypoints/background.ts` 内的 `onMessage` 闭包中、不导出；测试侧在 `tests/unit/messaging/bumpHello.spec.ts` 中复刻 mirror 函数 `bumpHelloCore` 用于 fakeBrowser 验证。第三方 caller 出现时再考虑提取到 `shared/messaging/handlers/`。
- 2026-04-29（Plan 01-4 执行）— WXT 0.20.x 把 popup HTML `<title>` 写入 `manifest.action.default_title`，覆盖 `wxt.config.ts` 中的字段。要让 manifest 保留 `__MSG_action_default_title__` 占位符，HTML `<title>` 也必须写成 `__MSG_action_default_title__`。verify-manifest 第一次跑出 FAIL 后由此一行修正得到 OK；后续所有引入新 popup-like entrypoint 的 phase 都要遵守这条。
- 2026-04-29（Plan 01-4 执行）— Preact JSX 在严格 `tsc --noEmit` 下需要 tsconfig 显式 `jsx: "react-jsx"` + `jsxImportSource: "preact"` + `react`/`react-dom`/`react/jsx-runtime` → preact compat 的 path aliases。`@preact/preset-vite` 仅处理运行时编译，不替代 TS 类型解析。Phase 6 引入运行时 locale 切换 + Phase 3 引入 SendForm 时不要回退这些设置。
- 2026-04-29（Plan 01-4 执行）— @wxt-dev/i18n 0.2.5 的 `t()` 类型签名要求 substitutions 作为 tuple（`[count]`），而非可变参数（`(key, count)`）。运行时实现也按 `Array.isArray(arg) → 当作 substitution` 分派。所有 popup / future component 的 `t()` 调用统一走 tuple 写法。
- 2026-04-29（Plan 01-4 执行）— Playwright 1.59.1 + chromium-1217 在受限网络下下载耗时较长；`pnpm test:e2e` discovery + fixture / spec / config 三件套已 coherent 且 Phase 1 端到端语义完整（3 specs 含 SW-restart）。开发者本机首次跑前应先 `pnpm exec playwright install chromium`；CI 不需此步（D-11，留 Phase 4）。
- 2026-04-29（Phase 1 closure）— 人工 UAT 重测暴露 popup loading 状态与 RPC 失败渲染同形（×0），同时是 Playwright locator race 与真用户 FOUC 来源；fix 为 loading 时不挂 `[data-testid="popup-hello"]` 的空 `<main aria-busy>`。后续任何 popup 化的 entrypoint（settings / dispatch confirm 等）都应保持这一 loading-vs-data 的明确分离，不要靠 `count ?? 0` fallback 让 loading 与 0 视觉同形。
- 2026-04-29（Phase 1 closure）— Playwright `chrome.runtime.reload()` **不要**用来模拟 SW restart。在 `launchPersistentContext + --load-extension`（unpacked dev mode）下它卸载扩展但不自动重新启用——extension URL 在 5+ 秒内 `ERR_BLOCKED_BY_CLIENT`，新 SW 永远不上线。正确 API 是 CDP `ServiceWorker.stopWorker`（chrome://serviceworker-internals/ Stop 按钮的底层调用），仅杀 SW 进程不卸载扩展，下次 message 自然唤醒新 SW；fixture 通过 throwaway helper page 创建 page-level CDP session（newCDPSession 不接受 Worker，但 ServiceWorker domain 可经任意 page session 访问）。Phase 4 / 5 的 dispatch e2e fixture 共用这一约定。
- 2026-04-30（Plan 02-03 执行）— WXT runtime-only content script 通过 `defineContentScript({ registration: 'runtime', main() })` 落地：extractor 不进 manifest `content_scripts`（构建产物 manifest 中 `content_scripts: []`），仅 bundle 到 `content-scripts/extractor.js`（73 KB），由 SW `chrome.scripting.executeScript({ files })` 程序化注入；main() return value 经 structuredClone 通道回 SW（仅 string 字段，序列化安全）。这是 Phase 2-5 所有"按需注入"类 content script 的共用模式。
- 2026-04-30（Plan 02-03 执行）— description fallback 在 extractor 内部以三段顺序 try 实现：`meta[name="description"]` → `meta[property="og:description"]` → `Readability.excerpt`。helper `getDescription(doc, article)` 命名导出（与 default export 并存），供 Wave 3（02-04）单元测试三分支 fixture 直接 import 验证。helper 查询的是**原始 document**而非 cloneNode（防御 Readability 内部 DOM mutation 的细节假设依赖）。
- 2026-04-30（Plan 02-04 执行）— Turndown 0.7.x 默认 `headingStyle: 'setext'`（`==`/`--` 下划线）+ `codeBlockStyle: 'indented'`（4 空格）；GFM plugin 不改变这些默认。要让 extractor 输出 atx heading（`# `）+ fenced code block（```` ``` ````），必须在 `new TurndownService()` 时显式 `{ headingStyle: 'atx', codeBlockStyle: 'fenced' }`。markdown-roundtrip 测试 helper 已固化此配置；Wave 4（02-05 SW pipeline）实现 extractor 实际产物若也想要 atx + fenced 形态，需回到 02-03 升级 extractor.content.ts 的 TurndownService 构造（当前 extractor 走默认）。这是 Phase 2 success criteria #2"标题/代码块/链接保留"的具体形态约束。
- 2026-04-30（Plan 02-04 执行）— mirror-function 测试模式从 bumpHello.spec.ts 推广到 capture.spec.ts：`capturePipelineCore` 在 spec 内复刻 SW pipeline 的分支逻辑（URL scheme check → executeScript inject → empty check → assemble snapshot），通过 `MockDeps` interface 注入所有外部依赖（tabUrl / executeScriptResult / executeScriptShouldThrow / nowIso）。这让 Wave 4 真实 runCapturePipeline 实现前就能锁定 4 条业务路径的预期。**同步责任**：Phase 3+ 修改真实 pipeline 时必须同步更新本 mirror 函数；02-04-SUMMARY.md 在 "Mirror 函数同步责任" 节有显式提示。
- 2026-04-30（Plan 02-05 执行）— SW capture pipeline 编排核心抽到 `background/capture-pipeline.ts`，listener 注册留在 `entrypoints/background.ts` 顶层 `defineBackground` 闭包；ExtractorPartial 类型在 SW 模块本地复刻而非 import 自 `entrypoints/extractor.content.ts`，防止 73 KB 的 content-script bundle（Readability + DOMPurify + Turndown）被 bundler 拉入 SW bundle。这是 SW ↔ content-script 边界的普适模式：当 content-script bundle 体积可观时复刻类型代价远小于错误的 cross-bundle import。
- 2026-04-30（Plan 02-05 执行）— ArticleSnapshotSchema.safeParse 在 step 7 显式走 Result 通道（safeParse 失败 → `Err('INTERNAL', 'Invalid snapshot:...', false)`），而非依赖 wrapHandler 的 generic catch。原因：(a) 错误码可溯源（snapshot 组装失败 vs 其他 INTERNAL）；(b) retriable=false（snapshot 字段错误重试无意义）；(c) `@webext-core/messaging` 通过 `schemas.output` 在 RPC 边界再做一次校验，本层 + RPC 层形成 defense-in-depth。Phase 3+ 的 dispatch / history pipeline 涉及 zod 校验时沿用同一模式：业务流水线内显式 safeParse + Err 通道，RPC 边界 schemas.output 兜底。
- 2026-04-30（Plan 02-05 执行）— popup 三态 i18n 文案拆 `.before` / `.icon` / `.after` 三个子键（每个三态 4 子键 = heading + before + icon + after），让 popup 用 `<>{t('...before')}{IconElement}{t('...icon')}{t('...after')}</>` 自然组装内嵌 toolbar icon 引用，不必硬编码字符串切片或走 `chrome.i18n` placeholder substitution。en + zh_CN 各 18 个 `capture.*` 子键 100% 同构（`grep '^capture\.'` 均为 18）。后续任何在文本中内嵌可点击 / 可指代元素的 i18n 文案都沿用此拆分模式。
- 2026-04-30（Plan 02-06 执行）— popup 多状态渲染采取 module-level `signal` + 早返回到子组件的纯函数式模式：`snapshotSig` / `errorSig` 决定四态分支；`titleSig` / `descriptionSig` / `contentSig` 持有可编辑字段值。这依赖 Chrome extension popup 每次打开都是全新 HTML 加载（模块状态自动 GC）的隔离行为。`<deferred_notes>` 记录：未来若把 popup App.tsx 复用到 sidepanel / devtools panel，模块级 signal 会跨实例泄漏，需迁移到 useState 或 Preact Context；当前 MVP 不受影响。
- 2026-04-30（Plan 02-06 执行）— inline accent span 在 JSX 中拼接（`{before}<span class="text-sky-600">{icon}</span>{after}`）而非通过 i18n placeholder 注入 HTML，是 Phase 2 落地 PITFALLS §11 + threat T-02-06-02 的核心 mitigation：YAML locale 文件永远不嵌入 HTML，DOMPurify 不需要在文案路径上介入，hardcoded-string ESLint 规则未来在 Phase 6 加固时不会误报。Phase 3 dispatch 文案中可能再次出现"send to [send_to chip]"等内嵌引用，沿用同一三段式拆键模式。
- 2026-04-30（Plan 02-06 执行）— Preact JSX 中 `<label for={id}>`（不是 React 的 `htmlFor`）、SVG 用 `stroke-width` / `stroke-linecap` 原生 HTML 属性名而非 React camelCase 别名（`strokeWidth` / `strokeLinecap`）。这是 Preact 与 React 在属性命名上的核心差异——Preact 使用原生 HTML 属性；项目所有 JSX 都遵循此约定，未来 Phase 3 SendForm / Phase 6 settings UI 不要回退到 React 兼容别名。
- 2026-04-30（Plan 02-06 执行）— popup ErrorView 不渲染 `result.message`（即底层 chrome.scripting 抛错原文），仅渲染 `t('capture.error.scriptFailed.*')` 三键。这是 threat T-02-06-03（Information Disclosure）的 mitigation：底层错误信息只去 console，不暴露给用户，避免泄露内部实现细节（如 "Cannot access contents of url chrome://newtab/" 等）。Phase 3+ 任何 ErrorView 设计都遵循同样原则——业务文案走 i18n，底层 message 仅供开发者 debug。
- 2026-04-30（Plan 02-07 执行）— Playwright webServer + use.baseURL + 相对 URL 模式让 fixture 端口策略只在 playwright.config.ts 一处声明（`port: 4321`），spec.ts 用 `'/article.html'` 相对路径自动拼接 baseURL。`reuseExistingServer: !process.env.CI` 让本地 watch 模式不重复起 serve 进程；CI 始终启新进程（D-11 当前不进 CI，但配置按未来 CI 形态准备）。webServer command 用 `npx --yes serve tests/e2e/fixtures --listen 4321 --no-clipboard`，无需新增 dev dependency。Phase 3 dispatch / Phase 4-5 adapter e2e 沿用此模式：新增 fixture 文件放 `tests/e2e/fixtures/` 自动 serve。
- 2026-04-30（Plan 02-07 执行）— 多 tab E2E 用 newPage 焦点窃取的修法：`context.newPage()` 默认把新 page 拉到前台，导致 newPage(popup) 后 article 失焦，SW `tabs.query({active, lastFocusedWindow})` 拿到 popup 而非 article。修法：先 newPage(article).goto → newPage(popup blank) → bringToFront(article) → popup.goto(popupUrl)；page.goto 在已存在 page 上不窃焦，article 保持 active。这是 Phase 3 dispatch e2e（涉及多 tab：article 源 + dispatch 目标）将沿用的模式。
- 2026-04-30（Plan 02-07 执行）— Empty 路径 E2E 用 chrome-extension:// active tab 自然触发，不 mock SW：直接 `newPage(popupUrl)` 单独打开 popup，popup 自身就是 active tab，URL scheme=chrome-extension 被 SW 预检拒绝（D-16），popup 渲染 capture-empty。这是 RESEARCH.md Open Question #2 的最终方案，比 mock SW 更真实地证明 Phase 2 ROADMAP 成功标准 #5 empty 路径。Phase 3+ 任何"受限 active tab"路径的 E2E 都可沿用此自然触发模式。
- 2026-05-02（Plan 04-01 执行）— `setInputValue` 使用 `Object.getOwnPropertyDescriptor` + `HTMLTextAreaElement.prototype` / `HTMLInputElement.prototype` 的 property-descriptor setter 绕过 React synthetic event 系统，然后 `dispatchEvent(new Event('input', { bubbles: true }))` 让 React reconciler 接收新值。这是 CLAUDE.md DOM 注入规范的首个具体实现，Phase 5 Discord adapter 的 Slate/Lexical 注入走不同路径（ClipboardEvent paste）。
- 2026-05-02（Plan 04-01 执行）— `grantedOrigins` storage repo 用 `local:grantedOrigins` key + `string[]` 类型，4 个 CRUD 方法（list/add/remove/has），add 内置去重。OpenClaw adapter 注册在 `adapterRegistry` 中 `hostMatches: []`（空数组表示无静态 host），SW dispatch-pipeline 根据此判断需要 `chrome.permissions.contains` 动态权限检查。
- 2026-05-02（Plan 04-02 执行）— OpenClaw adapter content script 通过 `defineContentScript({ registration: 'runtime', main() })` 注册，仅在 dispatch 时由 SW 程序化注入。`match()` 逻辑匹配 `/ui/chat` 或 `/chat` 路径 + `session` query param，不限 host。`composeMarkdown` 抽到纯工具模块 `shared/adapters/openclaw-format.ts`，可在测试中无 WXT side-effect 地 import。
- 2026-05-02（Plan 04-03 执行）— popup Confirm handler 在 user-gesture context 内调用 `chrome.permissions.request({ origins: [origin + '/*'] })`（仅请求 `origin/*` 而非 `*://*/*`），grant 后调 `grantedOrigins.add(origin)`，deny 显示 `OPENCLAW_PERMISSION_DENIED` ErrorBanner。SW dispatch-pipeline 在 `startDispatch` 入口增加 `chrome.permissions.contains` 防御性检查。Options 页面 `GrantedOriginsSection` 展示已授权 origins 列表 + 移除按钮（`chrome.permissions.remove` + `grantedOrigins.remove` 双重清理）。
- 2026-05-02（Plan 04-04 执行）— `scripts/verify-manifest.ts` 的 expected permissions 集合需要同步 Phase 3 新增的 `alarms` permission，否则单元测试在读取构建产物 manifest 时 `process.exit(1)`。修复为将 `['activeTab', 'scripting', 'storage']` 更新为 `['activeTab', 'alarms', 'scripting', 'storage']`。这是跨 phase 的 manifest 断言同步问题——后续添加新 permission 时 verify-manifest 的 expected set 必须同步更新。

### 待办

- Phase 2 closure 待人工 E2E 验证：`pnpm build && pnpm test:e2e -- capture.spec.ts`
- Phase 3 closure 待人工 E2E 验证：`pnpm wxt build --mode development && pnpm test:e2e`（8 specs：dispatch 5 + draft-recovery 1 + options-reset 2）
- Phase 4 closure 待人工 E2E 验证：`pnpm wxt build --mode development && pnpm test:e2e -- openclaw`（3 specs：dispatch + offline + permission）

### 阻塞 / 关注点

- 3 个 jsdom module resolution 错误（Phase 2 extractor 测试，非阻塞）
- Phase 3 E2E 需要 headed browser + dev-mode build

## 延后事项

从上一个 milestone 收尾时遗留并继续推进的项：

| Category | Item | Status | Deferred At |
| -------- | ---- | ------ | ----------- |
| _(无)_   |      |        |             |

## 会话连续性

- 上次会话：2026-05-02（Phase 4 execute-phase — 4/4 plans executed，13 commits，152 单元测试 + 3 E2E specs）
- 停在哪里：Phase 4 execution complete，待 human E2E 验证；可开始 Phase 5
- Resume 文件：`.planning/phases/04-openclaw/04-04-SUMMARY.md`
