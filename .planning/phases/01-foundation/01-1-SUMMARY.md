---
phase: 01-foundation
plan: 1
subsystem: infra
tags: [wxt, mv3, preact, typescript, tailwind, eslint, husky, lint-staged, github-actions]

# Dependency graph
requires: []
provides:
  - "WXT 0.20.x MV3 扩展骨架（package.json / tsconfig.json / wxt.config.ts）"
  - "符合 FND-05 形态的 .output/chrome-mv3/manifest.json（permissions / host_permissions / optional_host_permissions / default_locale + __MSG_*__）"
  - "ESLint flat config（typescript-eslint recommended + 类型感知规则块 + 轻量 JSX 硬编码字符串规则）"
  - "Prettier + Husky pre-commit (typecheck && lint-staged) + lint-staged 矩阵"
  - "scripts/verify-manifest.ts manifest 校验器（CI 与本地共用）"
  - ".github/workflows/ci.yml（install + typecheck + lint + test + verify:manifest，无 Playwright）"
  - "locales/en.json 占位（extension_name / extension_description / action_default_title）— Plan 02 接管完整 i18n facade 与 zh_CN locale"
  - "entrypoints/background.ts 占位（defineBackground(()=>{}))— Plan 03 接管 SW 顶层 listener 注册与 RPC 路由"
affects: [01-2-storage-i18n, 01-3-messaging-sw, 01-4-popup-e2e, 02-capture, 03-dispatch, 04-openclaw, 05-discord, 06-i18n-polish, 07-distribution]

# Tech tracking
tech-stack:
  added:
    - "wxt@0.20.25 (manifest: 锁定到 caret-minor，pre-1.0)"
    - "preact@10.29.1 + @preact/signals@^2.0 + @preact/preset-vite@^2.0"
    - "@webext-core/messaging@^2.0（Phase 1 Plan 03 启用）"
    - "@wxt-dev/i18n@0.2.5 + @wxt-dev/browser@0.1.40"
    - "zod@^3.24（Phase 1 Plan 03 启用）"
    - "tailwindcss@4.2.4 + @tailwindcss/vite@4.2.4（Phase 1 Plan 04 启用）"
    - "vitest@3.2.4 + happy-dom@15.11.7（Phase 1 Plan 04 启用，本 plan 仅 --passWithNoTests）"
    - "@playwright/test@1.59.1 + playwright@1.59.1（Phase 1 Plan 04 + Phase 4+ 启用，CI 不跑）"
    - "eslint@9.39.4 + typescript-eslint@8.59.1 + eslint-config-prettier@10.1.8 + @eslint/js@9.39.4"
    - "prettier@3.8.3 + husky@9.1.7 + lint-staged@15.5.2"
    - "tsx@4.21.0 + typescript@5.9.3"
  patterns:
    - "WXT entrypoints 文件约定 — entrypoints/background.ts 即 SW 入口；postinstall 跑 wxt prepare 生成 .wxt/ 类型"
    - "类型感知 ESLint 规则只对 ts/tsx 文件启用（parserOptions.projectService），plain js/mjs 不走类型推断以避免 no-floating-promises 误触发"
    - "manifest 校验器同时被 CI（pnpm verify:manifest）与本地手测共用，单一 source of truth"
    - "ESLint + Prettier ignores 同步包含 .claude/ + .planning/ — 项目工作流文件不在 Web2Chat 源码 lint 范围内"
    - "tsconfig.json extends ./.wxt/tsconfig.json（必须前缀 ./），并显式 include .wxt/wxt.d.ts 以让 WXT 自动 import（defineBackground 等）类型可见"

key-files:
  created:
    - "package.json — 锁版本依赖 + npm scripts (dev/build/typecheck/lint/test/test:e2e/verify:manifest/postinstall)"
    - "tsconfig.json — strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes，extends ./.wxt/tsconfig.json"
    - "wxt.config.ts — manifest 字段 + Tailwind v4 vite plugin + @wxt-dev/i18n module"
    - ".gitignore / .editorconfig"
    - "entrypoints/background.ts — Plan 03 替换"
    - "locales/en.json — Plan 02 替换并新增 zh_CN"
    - "public/icon/{16,32,48,128}.png — 真实尺寸 RGBA 透明 PNG"
    - "eslint.config.js — flat ESM config，含类型感知规则块 + JSX 硬编码字符串规则"
    - ".prettierrc.json / .prettierignore"
    - ".husky/pre-commit (executable) — pnpm typecheck && pnpm exec lint-staged"
    - ".lintstagedrc.json"
    - "scripts/verify-manifest.ts — 6 条结构性断言 + FATAL 守卫"
    - ".github/workflows/ci.yml — install + typecheck + lint + test + verify:manifest"
  modified: []

key-decisions:
  - "锁定 packageManager 为 pnpm@10.33.2（本机实际版本）而非 plan 写的 9.x；CI 同步用 pnpm/action-setup@v4 with version 10，保证 --frozen-lockfile 不会因版本错位失败"
  - "ESLint 类型感知规则用 parserOptions.projectService（typescript-eslint v8 现代写法），仅作用于 **/*.{ts,tsx}；no-floating-promises 因此可正常工作"
  - "tsconfig.json include 必须显式列出 .wxt/wxt.d.ts，否则 WXT 自动 import 的全局（defineBackground / browser / storage / i18n）在 tsc --noEmit 下不可见"
  - "Tailwind v4 + WXT 0.20.x 的 Vite plugin 集成无任何坑（vite()=>({plugins:[tailwindcss()]}) 即工作）；D-10 决定的 'no CSS modules fallback' 没有触发"

patterns-established:
  - "Pattern: postinstall 跑 wxt prepare && husky — clone 即用，无需手工后处理"
  - "Pattern: pnpm verify:manifest = wxt build && tsx scripts/verify-manifest.ts — CI 与本地共享单一脚本"
  - "Pattern: pre-commit 全仓 typecheck + lint-staged 分文件 eslint+prettier；分两步是因为 lint-staged 不做 typecheck"
  - "Pattern: ESLint ignores 同步 .claude/ + .planning/ + .output/ + .wxt/ + node_modules/ + dist/ + coverage/ + public/ + playwright-report/ + test-results/"

requirements-completed: [FND-01, FND-05]

# Metrics
duration: 11m
completed: 2026-04-28
---

# Phase 1 Plan 1: WXT 脚手架 + manifest + 工程基础设施 Summary

**WXT 0.20.25 + Preact 10.29 MV3 扩展骨架就位；构建产物 manifest 严格符合 FND-05（permissions=activeTab/scripting/storage、static host_permissions=[https://discord.com/*]、optional_host_permissions=[<all_urls>]、__MSG_*__ 占位符），verify-manifest 脚本 + GitHub Actions CI + Husky pre-commit 三道结构性闸门全部接通。**

## Performance

- **Duration:** 11m 6s
- **Started:** 2026-04-28T23:09:56Z
- **Completed:** 2026-04-28T23:21:02Z
- **Tasks:** 3 + 1 follow-up CI fix
- **Files modified:** 19 个新文件，0 个修改（首次 green-field 提交）

## Accomplishments

- 锁版本的依赖矩阵全部到位（resolved 版本贴在下方），`pnpm install --frozen-lockfile && pnpm build` 在干净仓库上一次成功
- 构建产物 manifest 形态严格满足 FND-05：static `host_permissions` **不含** `<all_urls>`，`<all_urls>` 仅出现在 `optional_host_permissions`
- Manifest 校验器 `scripts/verify-manifest.ts` 已对接 CI（pnpm verify:manifest）；负向测试证明它在 static `<all_urls>` 出现时返回 exit 1 + stderr `FATAL` 行
- ESLint flat config 跑通 `--print-config` 无错；JSX 硬编码字符串反例 `<div>Hello</div>` 触发 `no-restricted-syntax` 含 i18n 引导文案
- `.husky/pre-commit` 真实执行链路：每个 task commit 都通过 `pnpm typecheck && pnpm exec lint-staged` 闸门绿灯放行
- `.github/workflows/ci.yml` 跑 install + typecheck + lint + test + verify:manifest（5 个 step），**不含** `playwright` 与 `test:e2e`（D-11 锁定 Phase 4 才接 e2e）

## Task Commits

每个 task 原子提交：

1. **Task 1: WXT 脚手架 + 锁版本 + manifest 形态** — `263ed18` (feat)
2. **Task 2: ESLint flat + Prettier + Husky + lint-staged** — `ad1a98d` (chore)
3. **Task 3: GitHub Actions CI + verify-manifest 脚本** — `eab74a5` (ci)
4. **Task 3 follow-up: vitest --passWithNoTests** — `da1b4b4` (ci)（Rule 3 偏差：CI test step 在无测试时退 1 会让 Phase 1 自打脸）

**Plan metadata commit (final):** see `git log` for `docs(01-1): complete scaffold plan` (covers SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Manifest 实际形态

`pnpm build` 后 `.output/chrome-mv3/manifest.json` 的实际产物：

```json
{
  "manifest_version": 3,
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "version": "0.1.0",
  "icons": {
    "16": "icon/16.png",
    "32": "icon/32.png",
    "48": "icon/48.png",
    "128": "icon/128.png"
  },
  "default_locale": "en",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["https://discord.com/*"],
  "optional_host_permissions": ["<all_urls>"],
  "action": {
    "default_title": "__MSG_action_default_title__",
    "default_icon": {
      "16": "/icon/16.png",
      "32": "/icon/32.png",
      "48": "/icon/48.png",
      "128": "/icon/128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

形态对照 FND-05：
- ✅ `permissions === ['activeTab', 'scripting', 'storage']`
- ✅ `host_permissions === ['https://discord.com/*']`（无 `<all_urls>`）
- ✅ `optional_host_permissions === ['<all_urls>']`
- ✅ `default_locale === 'en'`
- ✅ `name`、`description`、`action.default_title` 全部以 `__MSG_` 起头
- ✅ `background.service_worker` 由 WXT 从 `entrypoints/background.ts` 自动声明

## 实际安装的依赖版本（Resolved）

caret-minor lock 都被 pnpm 解析为最新兼容版（截至 2026-04-28）：

| Package                  | Specifier        | Resolved             |
| ------------------------ | ---------------- | -------------------- |
| `wxt`                    | `^0.20.25`       | `0.20.25`            |
| `preact`                 | `^10.29.1`       | `10.29.1`            |
| `@preact/signals`        | `^2.0.0`         | `2.9.0`              |
| `@webext-core/messaging` | `^2.0.0`         | `2.3.0`              |
| `@wxt-dev/i18n`          | `^0.2.5`         | `0.2.5`              |
| `@wxt-dev/browser`       | `^0.1.40`        | `0.1.40`             |
| `zod`                    | `^3.24.0`        | `3.25.76`            |
| `typescript`             | `^5.6.0`         | `5.9.3`              |
| `@types/chrome`          | `^0.1.40`        | `0.1.40`             |
| `tailwindcss`            | `^4.0.0`         | `4.2.4`              |
| `@tailwindcss/vite`      | `^4.0.0`         | `4.2.4`              |
| `vitest`                 | `^3.2.4`         | `3.2.4`              |
| `happy-dom`              | `^15.0.0`        | `15.11.7`            |
| `@playwright/test`       | `^1.58.0`        | `1.59.1`             |
| `playwright`             | `^1.58.0`        | `1.59.1`             |
| `eslint`                 | `^9.20.0`        | `9.39.4`             |
| `typescript-eslint`      | `^8.20.0`        | `8.59.1`             |
| `eslint-config-prettier` | `^10.0.0`        | `10.1.8`             |
| `prettier`               | `^3.4.0`         | `3.8.3`              |
| `husky`                  | `^9.1.0`         | `9.1.7`              |
| `lint-staged`            | `^15.5.0`        | `15.5.2`             |
| `tsx`                    | `^4.20.0`        | `4.21.0`             |
| `@preact/preset-vite`    | `^2.0.0`         | `2.10.5`             |
| `@eslint/js`             | `^9.39.4` *(新)* | `9.39.4`             |
| `pnpm` (packageManager)  | `10.33.2`        | `10.33.2`（本机已装）|

无与 STACK.md 锁定方向冲突的版本；`@eslint/js` 是 Task 2 安装时新增到 devDependencies（`tseslint.config(js.configs.recommended, ...)` 显式依赖），未在 STACK.md 中列出但属于 ESLint flat config 的标准伴生包，不算偏差。

## ESLint + verify-manifest 实际输出快照

**ESLint print-config（确认 flat config 解析无错）:**
```
$ pnpm exec eslint --print-config eslint.config.js > /dev/null && echo OK
OK
```

**JSX 硬编码字符串反例触发规则:**
```
$ printf 'export const X = () => <div>Hello</div>;\n' > tmp/_check.tsx
$ pnpm exec eslint tmp/_check.tsx
/Users/.../tmp/_check.tsx
  1:29  error  禁止 JSX 文本节点出现裸字符串字面量；请使用 t("...") 走 i18n（轻量规则；完整版 hardcoded-string detector 留 Phase 6 / I18N-03）  no-restricted-syntax

✖ 1 problem (1 error, 0 warnings)
```

**verify-manifest 正向（manifest 形态符合 FND-05）:**
```
$ pnpm verify:manifest
> wxt build && tsx scripts/verify-manifest.ts
WXT 0.20.25
ℹ [i18n] Default locale: en
ℹ Building chrome-mv3 for production with Vite 8.0.10
✔ Built extension in 66 ms
[verify-manifest] OK — all assertions passed
```

**verify-manifest 负向（手动把 host_permissions 改为 ['<all_urls>']）:**
```
$ pnpm verify:manifest
✔ Built extension in 58 ms
[verify-manifest] FAIL:
  - host_permissions mismatch: expected ["https://discord.com/*"], got ["<all_urls>"]
  - FATAL: `<all_urls>` present in static host_permissions (FND-05 + DST-03 violation)
 ELIFECYCLE  Command failed with exit code 1.
```

## Tailwind v4 + WXT 0.20.x 集成

D-10 锁定 "Tailwind v4 from day 1，无 CSS modules fallback"。集成无任何痛点：

```ts
import tailwindcss from '@tailwindcss/vite';
defineConfig({
  // ...
  vite: () => ({ plugins: [tailwindcss()] }),
});
```

`pnpm build` 一次成功；Tailwind v4 的 Oxide 引擎自动接管 CSS。Plan 04 引入 popup HTML/TSX 时直接 `import './style.css'` + `@import "tailwindcss";` 即可——无需 PostCSS 配置。

**已驳回的 fallback 路径（CSS modules）未被触发。**

## Decisions Made

- **Pre-commit 实际形态**：`#!/usr/bin/env sh` + `pnpm typecheck && pnpm exec lint-staged`（与 plan 一致）。`husky init` 默认生成 `pnpm test`，被显式覆盖。
- **CI pnpm 版本对齐**：本机 `pnpm@10.33.2`，CI workflow 同步 `pnpm/action-setup@v4 with version: 10`（plan 写 9）。理由：lockfile 由 pnpm 10 生成，`--frozen-lockfile` 在 CI 用 pnpm 9 会失败。
- **`vitest run --passWithNoTests`**：Phase 1 Plan 01-1 不交付任何测试文件，但 CI 跑 `pnpm test`；vitest 默认无文件即 exit 1 会让 Phase 1 自打脸。Plan 02/03/04 引入测试后该 flag 即 no-op。
- **类型感知 ESLint 规则的边界**：`parserOptions.projectService` 仅在 `files: ['**/*.{ts,tsx}']` 块启用，`@typescript-eslint/no-floating-promises` 不再触发 plain JS 文件。这维持了 plan 锁定的"类型感知"约束同时避免误报。
- **`tsconfig.json` extends 路径必须以 `./` 起头**：TypeScript 5.9 / WXT 生成的 `.wxt/tsconfig.json` 必须 `extends: "./.wxt/tsconfig.json"` 才能解析（不带 `./` 前缀会以 npm package 名查找而失败）。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] WXT prepare 需要至少一个 entrypoint，否则 postinstall 失败**
- **Found during:** Task 1 (`pnpm install` 触发 `wxt prepare` 抛 `No entrypoints found`)
- **Issue:** plan 明确写 "不要在本任务中写任何 entrypoints/ 下的 popup / background 代码 — 那些由 Plan 03 / Plan 04 落地"。但 WXT 0.20.x 的 prepare 在零 entrypoint 时硬失败，导致 `pnpm install` 不可能成功完成。
- **Fix:** 创建 `entrypoints/background.ts` 占位 `defineBackground(() => {})`，文件头注释明确这是 Plan 03 接管前的最小占位。Plan 03 会替换它为真实 SW 入口（顶层 listener、storage 引导、RPC 路由）。
- **Files modified:** entrypoints/background.ts
- **Verification:** `pnpm install` 完成 `wxt prepare` 无错并生成 `.wxt/` 类型；`pnpm build` 产出 `background.js` 2.6 kB
- **Committed in:** 263ed18 (Task 1)

**2. [Rule 3 - Blocking] @wxt-dev/i18n 模块要求 source locale 文件存在**
- **Found during:** Task 1（第二次 `pnpm install` 触发 `wxt prepare` 抛 `Required localization file does not exist: <localesDir>/en.{json|...}`）
- **Issue:** plan 把 `locales` 文件落地推给 Plan 02，但 `@wxt-dev/i18n/module` 要求 default_locale 对应的源文件在 `<srcDir>/locales/<default_locale>.{json|yml|toml}` 必须存在，否则 prepare 失败。
- **Fix:** 创建 `locales/en.json` 最小占位（仅 `extension_name` / `extension_description` / `action_default_title` 三键，对应 manifest 的 `__MSG_*__` 占位符）。Plan 02 会接管完整 i18n facade、补齐 `zh_CN` locale + 全部业务 key。
- **Files modified:** locales/en.json
- **Verification:** `wxt prepare` 通过；`pnpm build` 产出 `_locales/en/messages.json` 274 B
- **Committed in:** 263ed18 (Task 1)

**3. [Rule 3 - Blocking] tsconfig.json extends 路径需要 `./` 前缀**
- **Found during:** Task 2（`pnpm typecheck` 抛 `tsconfig.json(2,14): error TS6053: File '.wxt/tsconfig.json' not found`）
- **Issue:** plan 写 `extends: ".wxt/tsconfig.json"`，但 TypeScript 在 5.x 解析中把不带 `./` 前缀的相对路径当作 npm 包名，解析失败。
- **Fix:** 改为 `extends: "./.wxt/tsconfig.json"`。
- **Files modified:** tsconfig.json
- **Verification:** `pnpm typecheck` 退出 0
- **Committed in:** ad1a98d (Task 2)

**4. [Rule 3 - Blocking] tsconfig.json 必须显式 include `.wxt/wxt.d.ts`**
- **Found during:** Task 2（`pnpm typecheck` 抛 `Cannot find name 'defineBackground'`）
- **Issue:** WXT 通过 `.wxt/wxt.d.ts` 注入 `defineBackground` / `browser` / `storage` / `i18n` 等全局类型；这个文件在 `.wxt/tsconfig.json` 的 include 中。我的根 tsconfig.json 因为重写了 `include` 导致 `.wxt/wxt.d.ts` 被排除。
- **Fix:** 在根 tsconfig.json 的 `include` 数组追加 `".wxt/wxt.d.ts"`。
- **Files modified:** tsconfig.json
- **Verification:** `pnpm typecheck` 退出 0；entrypoints/background.ts 中 `defineBackground` 类型正确解析
- **Committed in:** ad1a98d (Task 2)

**5. [Rule 3 - Blocking] `@typescript-eslint/no-floating-promises` 需要 type-aware lint**
- **Found during:** Task 2（ESLint 抛 `You have used a rule which requires type information, but don't have parserOptions set to generate type information for this file.`）
- **Issue:** plan 把 `no-floating-promises` 列入全局 rules 块，但该规则在 typescript-eslint v8 下需要 parserOptions 提供类型信息。
- **Fix:** 把类型感知规则集中到 `files: ['**/*.{ts,tsx}']` 子块，并在该块设置 `languageOptions.parserOptions = { projectService: true, tsconfigRootDir: import.meta.dirname }`（typescript-eslint v8 的现代写法）。
- **Files modified:** eslint.config.js
- **Verification:** `pnpm exec eslint <反例.tsx>` 触发 `no-restricted-syntax`；`pnpm lint` 全仓退出 0
- **Committed in:** ad1a98d (Task 2)

**6. [Rule 3 - Blocking] ESLint + Prettier 必须 ignore `.claude/` + `.planning/`**
- **Found during:** Task 2（`pnpm lint` 在 `.claude/get-shit-done/bin/gsd-tools.cjs` 上爆 668 个 require/process/no-undef 错误）
- **Issue:** GSD 工具与 .planning 文档不在 Web2Chat 源代码 lint 范围内（项目级运维文件，不应被本仓库的 ESLint 规则约束）。这是 SCOPE BOUNDARY 内但需要 lint 配置层面修复——否则 CI 永久红。
- **Fix:** 在 `eslint.config.js` ignores 与 `.prettierignore` 中追加 `.claude/` + `.planning/`。
- **Files modified:** eslint.config.js, .prettierignore
- **Verification:** `pnpm lint` 退出 0；prettier 不再扫描这两个目录
- **Committed in:** ad1a98d (Task 2)

**7. [Rule 3 - Blocking] CI 用的 pnpm 版本必须与 lockfile 生成器一致**
- **Found during:** Task 3（写 `.github/workflows/ci.yml` 时审视）
- **Issue:** plan 写 `version: 9`；本机 `pnpm@10.33.2` 生成的 lockfile 在 pnpm 9 下用 `--frozen-lockfile` 安装会因 lockfile schema 差异失败。
- **Fix:** package.json 的 `packageManager` 与 ci.yml 的 `pnpm/action-setup version` 都对齐到 `10`。
- **Files modified:** package.json, .github/workflows/ci.yml
- **Verification:** 本地 `pnpm install --frozen-lockfile` 通过；CI workflow 在 PR 时会同样跑通
- **Committed in:** 263ed18 (Task 1) + eab74a5 (Task 3)

**8. [Rule 3 - Blocking] vitest 默认在无测试文件时 exit 1**
- **Found during:** Task 3（CI workflow 写好后跑 `pnpm test` 退出 1）
- **Issue:** Phase 1 Plan 01-1 不交付任何测试，但 CI 跑 `pnpm test` 会因 vitest 默认行为返回非 0 退出码，让 Phase 1 自打脸。
- **Fix:** `package.json` 的 `test` script 加 `--passWithNoTests` flag。Plan 02/03/04 写入测试后该 flag 即 no-op。
- **Files modified:** package.json
- **Verification:** `pnpm test` 退出 0；Plan 02 起追加测试后 flag 不影响测试发现
- **Committed in:** da1b4b4 (Task 3 follow-up)

---

**Total deviations:** 8 auto-fixed（全部 Rule 3 - Blocking）
**Impact on plan:** 全部偏差都是为了让 plan 锁定的命令（`pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm verify:manifest`、`.husky/pre-commit`）能真正在本机 + CI 跑通。无功能性偏差，无 scope creep。每条偏差都明确标注由哪个 Plan / Phase 接管下一步动作。

## Issues Encountered

无新问题。所有遇到的失败模式均通过 Rule 3 自动修复路径处理，无需上升为 Rule 4 架构变更。

## User Setup Required

None — 本 plan 的所有产物都是本地代码与配置；无外部服务凭据 / 环境变量需求。

## Next Phase Readiness

✅ Plan 02 可基于本 plan 落地的：
- `package.json`（@wxt-dev/i18n 已就绪、storage/zod 依赖已锁版本）
- `wxt.config.ts`（modules 数组 + manifest 形态）
- `locales/en.json`（占位，Plan 02 接管完整 facade + zh_CN）
- `eslint.config.js`（JSX 硬编码字符串规则在 Phase 6 之前已就位）
- `tsconfig.json`（strict + path mapping 已就绪）
- `.husky/pre-commit`（每次 commit 都过 typecheck + lint-staged）

**下一步:** `01-2-storage-i18n-PLAN.md`（Wave 2，FND-04 / FND-06 / STG-01 / STG-02）。

## Self-Check

- [x] 每个 task 的 `<verify><automated>` 块本地跑过且打 PASS
- [x] 7 条 plan-level `<verification>` 全部通过（pnpm install --frozen-lockfile / build / verify:manifest / eslint print-config / JSX 反例 / pre-commit 内容 / ci.yml 不含 playwright|test:e2e / static host_permissions === ['https://discord.com/*']）
- [x] 4 个 task 提交（feat 263ed18 / chore ad1a98d / ci eab74a5 / ci da1b4b4）全部存在于 `git log --oneline -5`
- [x] 所有 frontmatter `requirements: [FND-01, FND-05]` 与 plan 一致
- [x] 创建文件全部存在（package.json / tsconfig.json / wxt.config.ts / .gitignore / .editorconfig / locales/en.json / entrypoints/background.ts / public/icon/{16,32,48,128}.png / eslint.config.js / .prettierrc.json / .prettierignore / .husky/pre-commit / .lintstagedrc.json / scripts/verify-manifest.ts / .github/workflows/ci.yml）
- [x] `.output/chrome-mv3/manifest.json` 形态严格匹配 FND-05

**Self-Check: PASSED**

---

*Phase: 01-foundation*
*Completed: 2026-04-28*
