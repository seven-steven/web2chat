# 项目状态

## 项目引用

参见：`.planning/PROJECT.md` (更新于 2026-04-28)

**核心价值：** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话。
**当前焦点：** Phase 1 — 扩展骨架 (Foundation)

## 当前位置

- Phase：1 / 7（扩展骨架）
- Plan：当前 phase 1 / 4 已完成（Wave 1 done）
- 状态：Plan 01-1 完成，可进入 Wave 2（Plan 01-2 storage + i18n）
- 最近活动：2026-04-28 — Plan 01-1 完成（WXT 0.20.25 脚手架 + manifest FND-05 形态 + ESLint/Prettier/Husky/lint-staged + GitHub Actions CI + verify-manifest 校验脚本，全部 plan-level verification PASSED）

进度：[██░░░░░░░░] 25%

## 性能指标

**速度：**

- 已完成 plan 总数：1
- 平均时长：11m
- 累计执行时长：约 0.2 小时

**按 Phase：**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 1     | 1     | 11m   | 11m      |

**近期趋势：**

- 最近 5 个 plan：01-1 (11m)
- 趋势：—（基线建立中）

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

### 待办

暂无。

### 阻塞 / 关注点

暂无。

## 延后事项

从上一个 milestone 收尾时遗留并继续推进的项：

| Category | Item | Status | Deferred At |
| -------- | ---- | ------ | ----------- |
| _(无)_   |      |        |             |

## 会话连续性

- 上次会话：2026-04-28（Phase 1 Plan 01-1 执行）
- 停在哪里：Phase 1 Plan 01-1 完成，4 个 task commit（263ed18 / ad1a98d / eab74a5 / da1b4b4）+ docs commit 上 main；下一步进入 Wave 2 / Plan 01-2（storage + i18n）
- Resume 文件：`.planning/phases/01-foundation/01-2-storage-i18n-PLAN.md`
