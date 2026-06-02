---
phase: 14-marketing-app-skeleton-build-isolation
verified: 2026-06-02T08:40:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 14: 独立 marketing app 骨架与构建隔离 Verification Report

**Phase Goal:** 建立仓库内独立静态 marketing app，使宣传页可独立 build / preview / smoke test，且不影响扩展构建输出。
**Verified:** 2026-06-02T08:40:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

Roadmap success criteria mapped to verification:

| # | Truth (Roadmap SC) | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | 新增独立 marketing app 目录与专用 Vite 配置 / scripts，输出目录与 WXT extension build 隔离 | VERIFIED | `apps/marketing/` exists with independent `vite.config.ts` (no WXT import), `tsconfig.json` (no `.wxt/` reference), builds to `apps/marketing/dist/` while extension builds to `.output/` |
| 2 | `build` / 扩展现有测试命令保持不变；新增 marketing build / preview / smoke test 命令可单独运行 | VERIFIED | Root `package.json` preserves `"build": "wxt build"` and `"test": "vitest run --passWithNoTests"`; added `site:dev/site:build/site:preview/site:verify` proxy scripts; `pnpm build` passes, `pnpm site:build` passes, `pnpm site:verify` passes, all 451 tests pass |
| 3 | marketing app 不 import service worker、storage repositories、messaging、permissions、IM adapters 等扩展 runtime 模块 | VERIFIED | `marketing-isolation.spec.ts` scans all marketing source for forbidden tokens (background/, content/adapters/, messaging, permissions, storage, service-worker) -- 4/4 tests pass; manual grep confirms zero forbidden imports in `apps/marketing/src/` |
| 4 | CI / 本地验证命令能分别验证 extension 与 marketing page，失败边界清晰 | VERIFIED | Extension verification: `pnpm build` + `pnpm verify:manifest`; Marketing verification: `pnpm site:build` + `pnpm site:verify`; separate commands with separate error messages; `verify-build.mjs` has clear failure text for missing dist, empty dist, missing index.html |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shared/styles/design-tokens.css` | Canonical design token source for extension + marketing | VERIFIED | 235 lines, contains `@theme inline`, `--color-accent`, `--color-ink-strong`, `--radius-card`, `@keyframes w2c-editorial-rise`, dark mode overrides, reduced-motion reset |
| `entrypoints/_shared-tokens.css` | Compatibility shim importing shared tokens | VERIFIED | Single `@import '../shared/styles/design-tokens.css';` line |
| `entrypoints/popup/style.css` | Popup import rewired to shared tokens | VERIFIED | Contains `@import '../../shared/styles/design-tokens.css';`, preserves tailwindcss import and @source exclusions |
| `entrypoints/options/style.css` | Options import rewired to shared tokens | VERIFIED | Contains `@import '../../shared/styles/design-tokens.css';`, preserves tailwindcss import and @source exclusions |
| `pnpm-workspace.yaml` | Workspace membership for apps/marketing | VERIFIED | Contains `apps/marketing` |
| `apps/marketing/package.json` | Independent package with scripts | VERIFIED | Name "marketing", private, scripts: dev/build/preview/verify:build, deps include preact + @preact/signals |
| `apps/marketing/vite.config.ts` | Standalone Vite config | VERIFIED | Uses @preact/preset-vite + @tailwindcss/vite, outDir to `dist`, no WXT import |
| `apps/marketing/tsconfig.json` | Independent TS config | VERIFIED | No .wxt/tsconfig.json reference, jsx: react-jsx with preact source |
| `apps/marketing/index.html` | HTML entry point | VERIFIED | Valid HTML with `<div id="app">` mount point |
| `apps/marketing/src/main.tsx` | Preact mount with signal locale | VERIFIED | Imports signal from @preact/signals, locale detection, renders `<App locale={locale} />` |
| `apps/marketing/src/app.tsx` | Skeleton page rendering | VERIFIED | Renders hero/platforms/nextPhase from site-content.ts, uses t() for all user-visible strings (except locale-switch button labels "中文"/"English" which are language names, not localizable content) |
| `apps/marketing/src/styles/index.css` | Tailwind + shared tokens | VERIFIED | Contains `@import 'tailwindcss'` and `@import '../../../shared/styles/design-tokens.css'` |
| `apps/marketing/src/data/site-content.ts` | Locale-keyed content via t() | VERIFIED | Exports getHero/getSupportedPlatforms/getNextPhase, all values composed from t() calls |
| `apps/marketing/src/i18n/index.ts` | t() locale wrapper | VERIFIED | Exports `function t(key)`, lazy zh_CN loading, fallback to key |
| `apps/marketing/src/i18n/locales/en.json` | English locale | VERIFIED | 10 keys covering hero, supportedPlatforms, nextPhase |
| `apps/marketing/src/i18n/locales/zh_CN.json` | Chinese locale | VERIFIED | 10 keys, 100% key parity with en.json |
| `apps/marketing/scripts/verify-build.mjs` | Build verifier | VERIFIED | Exports assertBuildOutput(distDir, errors), CLI guard, checks dist exists + non-empty + index.html |
| `tests/unit/scripts/marketing-verify-build.spec.ts` | Verifier unit tests | VERIFIED | 4 tests: missing dist, empty dist, missing index.html, valid output |
| `tests/unit/scripts/marketing-isolation.spec.ts` | BUILD-03 isolation tests | VERIFIED | 4 tests: source scan, forbidden tokens, allowed tokens, coverage completeness |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json` (root) | `apps/marketing/package.json` | `pnpm --filter marketing` proxy | WIRED | site:dev/site:build/site:preview/site:verify all use `pnpm --filter marketing` |
| `apps/marketing/src/styles/index.css` | `shared/styles/design-tokens.css` | CSS @import | WIRED | `@import '../../../shared/styles/design-tokens.css'` |
| `apps/marketing/src/data/site-content.ts` | `apps/marketing/src/i18n/index.ts` | t() function calls | WIRED | getHero/getSupportedPlatforms/getNextPhase all call t() |
| `apps/marketing/src/app.tsx` | `apps/marketing/src/data/site-content.ts` | Preact render | WIRED | Imports and renders getHero/getSupportedPlatforms/getNextPhase |
| `apps/marketing/vite.config.ts` | `apps/marketing/dist` | build.outDir | WIRED | `outDir: path.resolve(__dirname, 'dist')` |
| `entrypoints/popup/style.css` | `shared/styles/design-tokens.css` | CSS @import | WIRED | `@import '../../shared/styles/design-tokens.css'` |
| `entrypoints/options/style.css` | `shared/styles/design-tokens.css` | CSS @import | WIRED | `@import '../../shared/styles/design-tokens.css'` |
| `apps/marketing/package.json` | `apps/marketing/scripts/verify-build.mjs` | verify:build script | WIRED | `"verify:build": "node scripts/verify-build.mjs"` |
| `tests/unit/scripts/marketing-isolation.spec.ts` | `apps/marketing/src/` | source scan | WIRED | globSync reads all .ts/.tsx in marketing/src, checks for forbidden imports |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `apps/marketing/src/app.tsx` | hero, platforms, nextPhase | getHero()/getSupportedPlatforms()/getNextPhase() -> t() -> locale JSON | Yes -- en.json/zh_CN.json contain 10 real keys | FLOWING |
| `apps/marketing/src/main.tsx` | locale (signal) | navigator.language detection -> setLocale() -> lazy import | Yes -- locale signal drives language switch | FLOWING |
| `apps/marketing/scripts/verify-build.mjs` | distDir, errors | existsSync/readdirSync on dist/ | Yes -- checks real filesystem | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Marketing build succeeds and produces dist/index.html | `pnpm site:build` | Exit 0, dist/index.html + 4 asset files produced (95ms) | PASS |
| Marketing build verification passes | `pnpm site:verify` | "[verify:build] OK -- marketing build output valid" | PASS |
| Extension build unchanged after token extraction | `pnpm build` | Exit 0, WXT builds chrome-mv3 to .output/ (503ms) | PASS |
| All unit tests pass including new marketing tests | `pnpm test` | 55 files, 451 tests pass, including marketing-verify-build (4) + marketing-isolation (4) | PASS |
| Marketing dist/index.html exists | `test -f apps/marketing/dist/index.html` | EXISTS | PASS |
| Locale key parity verified | node script comparing en.json vs zh_CN.json | "OK -- 10 keys, 100% parity" | PASS |
| No WXT imports in marketing config | grep for wxt in vite.config.ts + tsconfig.json | No matches (exit 1) | PASS |
| No forbidden extension imports in marketing source | grep for background/content\/adapters/etc in apps/marketing/src/ | No matches (exit 1) | PASS |

### Probe Execution

Step 7c: SKIPPED -- no probe scripts defined for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BUILD-01 | 14-02, 14-03 | Developer can build the promotional page through a dedicated static-site command without changing the extension build output | SATISFIED | `pnpm site:build` produces `apps/marketing/dist/`; `pnpm build` still produces `.output/chrome-mv3/` unchanged |
| BUILD-02 | 14-02, 14-03 | Developer can preview or smoke-test the promotional page independently from extension E2E tests | SATISFIED | `pnpm site:preview` serves dist; `pnpm site:verify` runs smoke checks; separate from `pnpm test:e2e` |
| BUILD-03 | 14-01, 14-02, 14-03 | Promotional page code does not import extension runtime modules | SATISFIED | `marketing-isolation.spec.ts` scans for forbidden imports; marketing app only consumes `shared/styles/design-tokens.css` CSS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | -- | -- | -- | -- |

No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any phase files. No hardcoded empty data, no stub implementations, no console.log-only handlers.

### Human Verification Required

No items require human testing. All verification criteria are programmatically verified through build commands, test suites, and source scanning.

### Gaps Summary

No gaps found. All 4 roadmap success criteria verified through behavioral spot-checks and code inspection. All 3 requirement IDs (BUILD-01, BUILD-02, BUILD-03) are satisfied with concrete evidence.

---

_Verified: 2026-06-02T08:40:00Z_
_Verifier: Claude (gsd-verifier)_
