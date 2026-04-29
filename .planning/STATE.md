# 项目状态

## 项目引用

参见：`.planning/PROJECT.md` (更新于 2026-04-28)

**核心价值：** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话。
**当前焦点：** Phase 2 — 抓取流水线（Foundation 已完成，待 discuss）

## 当前位置

- Phase：2 / 7（抓取流水线 — 待 discuss）
- Plan：上一 phase（Phase 1）4 / 4 全部完成
- 状态：Phase 1 ✓ Complete (2026-04-29) — 13/13 自动化 must-have PASS + 5 个 post-verification gap 已修复并 commit；剩 1 项 e2e 重跑 final verify 持久化在 01-HUMAN-UAT.md
- 最近活动：2026-04-29 — Phase 1 closure：fix(01) commit 61046e6 修复 popup loading state + e2e fixture race（HUMAN-UAT 重测暴露的 2 个真 bug）；ROADMAP / REQUIREMENTS / STATE 同步翻新

进度：[██████████] 100%（Phase 1）→ Phase 2 待启动

## 性能指标

**速度：**

- 已完成 plan 总数：4
- 平均时长：7.5m
- 累计执行时长：约 0.5 小时

**按 Phase：**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 1     | 4     | 42m   | 10.5m    |

**近期趋势：**

- 最近 5 个 plan：01-1 (11m), 01-2 (6m), 01-3 (5m), 01-4 (~20m)
- 趋势：Plan 01-4 含 Playwright chromium 后台下载等待，去除环境耗时后核心实现仍约 8m

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
- 2026-04-29（Plan 01-3 执行）— `wrapHandler` 不按 ProtocolMap 路由名做映射类型，而是以业务返回类型 R 为单一类参（`<R>(fn: () => Promise<R>) => () => Promise<R>`）。原因：`Promise<ReturnType<ProtocolMap[K]>>` 在 K 为泛型时 TS 5.6 视为 `Promise<Promise<R>>`，触发 TS2322。Phase 1 仅一条路由，简化签名等价且 lint+typecheck 双绿。Phase 3 路由扩张时若需要按路由分派，再考虑用 `K extends keyof ProtocolMap` 重构。
- 2026-04-29（Plan 01-3 执行）— `bumpHello` 业务核心保留在 `entrypoints/background.ts` 内的 `onMessage` 闭包中、不导出；测试侧在 `tests/unit/messaging/bumpHello.spec.ts` 中复刻 mirror 函数 `bumpHelloCore` 用于 fakeBrowser 验证。第三方 caller 出现时再考虑提取到 `shared/messaging/handlers/`。
- 2026-04-29（Plan 01-4 执行）— WXT 0.20.x 把 popup HTML `<title>` 写入 `manifest.action.default_title`，覆盖 `wxt.config.ts` 中的字段。要让 manifest 保留 `__MSG_action_default_title__` 占位符，HTML `<title>` 也必须写成 `__MSG_action_default_title__`。verify-manifest 第一次跑出 FAIL 后由此一行修正得到 OK；后续所有引入新 popup-like entrypoint 的 phase 都要遵守这条。
- 2026-04-29（Plan 01-4 执行）— Preact JSX 在严格 `tsc --noEmit` 下需要 tsconfig 显式 `jsx: "react-jsx"` + `jsxImportSource: "preact"` + `react`/`react-dom`/`react/jsx-runtime` → preact compat 的 path aliases。`@preact/preset-vite` 仅处理运行时编译，不替代 TS 类型解析。Phase 6 引入运行时 locale 切换 + Phase 3 引入 SendForm 时不要回退这些设置。
- 2026-04-29（Plan 01-4 执行）— @wxt-dev/i18n 0.2.5 的 `t()` 类型签名要求 substitutions 作为 tuple（`[count]`），而非可变参数（`(key, count)`）。运行时实现也按 `Array.isArray(arg) → 当作 substitution` 分派。所有 popup / future component 的 `t()` 调用统一走 tuple 写法。
- 2026-04-29（Plan 01-4 执行）— Playwright 1.59.1 + chromium-1217 在受限网络下下载耗时较长；`pnpm test:e2e` discovery + fixture / spec / config 三件套已 coherent 且 Phase 1 端到端语义完整（3 specs 含 SW-restart）。开发者本机首次跑前应先 `pnpm exec playwright install chromium`；CI 不需此步（D-11，留 Phase 4）。
- 2026-04-29（Phase 1 closure）— 人工 UAT 重测暴露 popup loading 状态与 RPC 失败渲染同形（×0），同时是 Playwright locator race 与真用户 FOUC 来源；fix 为 loading 时不挂 `[data-testid="popup-hello"]` 的空 `<main aria-busy>`。后续任何 popup 化的 entrypoint（settings / dispatch confirm 等）都应保持这一 loading-vs-data 的明确分离，不要靠 `count ?? 0` fallback 让 loading 与 0 视觉同形。
- 2026-04-29（Phase 1 closure）— Playwright `chrome.runtime.reload()` 后**不要**马上 `await context.waitForEvent('serviceworker', ...)` — 新 SW 是 lazy-start，没人触发就不会启动，必然 timeout（code-review WR-03 已预警）。正确做法：reload 后让下一个 page navigation 自然触发 SW，依赖 Playwright `locator.waitFor` 隐式等到 RPC 完成。Phase 4 / 5 的 dispatch e2e fixture 共用这一约定。

### 待办

跨 phase 跟踪项：
- Phase 1 HUMAN-UAT #4：开发者本机 `pnpm exec playwright install chromium && pnpm build && pnpm test:e2e` 重跑确认 3/3 绿（fix commit 61046e6 后未在带 GUI / Chromium binary 的环境复跑过）；`/gsd-progress` 与 `/gsd-audit-uat` 持续可见。

### 阻塞 / 关注点

暂无。

## 延后事项

从上一个 milestone 收尾时遗留并继续推进的项：

| Category | Item | Status | Deferred At |
| -------- | ---- | ------ | ----------- |
| _(无)_   |      |        |             |

## 会话连续性

- 上次会话：2026-04-29（Phase 1 closure — verifier + human UAT + 5 个 gap 修复）
- 停在哪里：Phase 1 ✓ Complete；自动化全 PASS，HUMAN-UAT.md 跟踪 1 项 e2e 重跑 final verify（不阻塞 phase 推进）
- Resume 文件：`.planning/phases/02-capture/` （待 `/gsd-discuss-phase 2` 创建）
