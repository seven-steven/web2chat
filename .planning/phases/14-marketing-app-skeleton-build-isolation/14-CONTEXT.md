# Phase 14: 独立 marketing app 骨架与构建隔离 - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 在仓库内建立独立静态 marketing app 骨架，使其可独立 build / preview / smoke test，且不影响扩展构建输出。

本 phase 不实现页面内容与视觉（Phase 15）、不修改扩展运行时代码、不做发布验收（Phase 16）、不补 Telegram live UAT / Phase 11-12 Nyquist gaps。

</domain>

<decisions>
## Implementation Decisions

### 目录落点与工程边界
- **D-01:** marketing app 源码目录放在 `apps/marketing/`，与扩展根级 WXT 工程平级共存。
- **D-02:** marketing app 只共享静态资源（`public/icon/*`、截图素材等）与 design token；不共享通用 UI 组件。
- **D-03:** design token 从 `entrypoints/_shared-tokens.css` 提取到 `shared/` 目录，marketing app 与扩展两侧共同引用，保证单一事实源。
- **D-04:** 页面文案与展示数据放在 marketing app 内部数据文件（如 `apps/marketing/src/data/`），不从 planning artifact 源文件读取生成。
- **D-05:** 工程边界采用显式"硬隔离"规则：目录结构和 import 规则禁止 marketing 依赖扩展 runtime 模块（service worker、storage repo、messaging、permissions、IM adapters）。Phase 16 验收时需验证此隔离。

### 技术栈与依赖复用边界
- **D-06:** marketing app 使用独立 `package.json`，通过 pnpm workspace 链接到根 monorepo。需新增 `pnpm-workspace.yaml`。
- **D-07:** UI 方案为 Preact + @preact/signals + Tailwind v4，与扩展保持一致的技术栈。
- **D-08:** marketing app 使用完全独立的 `vite.config.ts`，不 import 根目录的 WXT vite 配置。插件只加 Tailwind 及必要的插件。
- **D-09:** TypeScript 配置独立于扩展（`apps/marketing/tsconfig.json`），不引用 WXT 的 tsconfig。

### 构建与预览命令设计
- **D-10:** marketing app 在自己的 `package.json` 里定义 `build` / `dev` / `preview` 命令。根目录 `package.json` 加代理命令 `site:dev` / `site:build` / `site:preview`（通过 `pnpm --filter marketing` 调用）。
- **D-11:** 构建产物输出到 `apps/marketing/dist/`，独立于扩展的 `.output/`。两套构建输出互不干扰。
- **D-12:** 扩展现有构建命令（`wxt build` / `pnpm build` / `pnpm test` 等）保持不变。

### Smoke Test 形式
- **D-13:** Phase 14 骨架期 smoke test 只做构建产物验证：`site:build` 成功、`apps/marketing/dist` 非空、`index.html` 存在。
- **D-14:** marketing app 内定义 `verify:build` 命令，根目录加 `site:verify` 代理。与扩展的 `verify:manifest` 模式一致。
- **D-15:** 更全面的页面加载验证（Playwright 等）留给 Phase 16 发布验收，不在骨架期引入。

### Claude's Discretion
- `pnpm-workspace.yaml` 的具体 packages 配置。
- `apps/marketing/` 内的子目录结构（src / public / data 等）。
- `shared/` 目录的文件命名与 token 提取粒度。
- 硬隔离规则的校验方式（ESLint import restriction、tsconfig paths、或构建脚本检查）。
- Vite 配置中的具体插件选择与 dev server 端口。
- `site:verify` 的具体验证脚本实现。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.2 scope and requirements
- `.planning/ROADMAP.md` — Phase 14 goal, requirements mapping (BUILD-01/02/03), success criteria.
- `.planning/REQUIREMENTS.md` — BUILD-01/02/03 requirements and explicit out-of-scope list.
- `.planning/PROJECT.md` — product positioning, v1.2 direction, Key Decisions.
- `.planning/STATE.md` — current milestone state.

### Build isolation truth sources
- `package.json` — current build / verification scripts; baseline for not breaking extension commands.
- `wxt.config.ts` — production permission model and WXT vite integration; marketing app must NOT import this.
- `vitest.config.ts` — existing test configuration; marketing smoke test is separate from extension tests.

### Design and visual token sources
- `entrypoints/_shared-tokens.css` — current design token direction; source for token extraction to `shared/`.
- `DESIGN.md` — full design system: charcoal + emerald palette, typography, component stylings.
- `public/icon/*` — existing product icons usable as shared static assets.

### Prior decisions
- `.planning/phases/13-information-architecture-copy-sources/13-CONTEXT.md` — information architecture, claims boundaries, copy guardrails; Phase 14 marketing app must be ready to consume these decisions.
- `.planning/research/SUMMARY.md` — architecture recommendation: independent marketing sub-app, pitfalls, and open decisions that Phase 14 resolves.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `entrypoints/_shared-tokens.css` — design tokens to extract into `shared/` directory.
- `public/icon/*` — product icons (16/32/48/128 PNG) usable as shared static brand assets.
- `DESIGN.md` — comprehensive design system document with color palette, typography, and component stylings; marketing app should visually align.

### Established Patterns
- Extension uses WXT 0.20.x with Vite integration; marketing app uses standalone Vite (not WXT).
- Extension builds to `.output/`; marketing builds to `apps/marketing/dist/`.
- Extension uses `verify:manifest` / `verify:zip` pattern for build verification; marketing mirrors with `verify:build`.
- Root `package.json` scripts follow `command:subcommand` naming; marketing commands use `site:*` prefix.

### Integration Points
- `pnpm-workspace.yaml` — new file needed to link `apps/marketing` into workspace.
- `shared/` — new directory for extracted design tokens, referenced by both extension and marketing app.
- Root `package.json` — add `site:dev` / `site:build` / `site:preview` / `site:verify` proxy scripts.
- `apps/marketing/package.json` — new independent package with own dependencies and scripts.
- `apps/marketing/vite.config.ts` — new standalone Vite config for the marketing static site.

</code_context>

<specifics>
## Specific Ideas

- Marketing app is a static site, not a web app — no routing, no state management beyond static page rendering.
- BUILD-03 explicitly prohibits importing extension runtime modules; planner should define the enforcement mechanism.
- The marketing app skeleton should produce a minimal valid HTML page (e.g., a placeholder index page) that proves the build pipeline works end-to-end.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-独立 marketing app 骨架与构建隔离*
*Context gathered: 2026-06-02*
