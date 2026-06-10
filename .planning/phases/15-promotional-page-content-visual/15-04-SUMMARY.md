---
phase: 15-promotional-page-content-visual
plan: 04
subsystem: marketing
tags: [marketing, smoke-verifier, tdd, cta]
requires:
  - 15-01（REPO_URL / INSTALL_URL truth anchors + locale keys）
  - 15-02（mockup 组件与 proof label）
  - 15-03（最终 8-section 页面组装）
provides:
  - 强化版 marketing build smoke verifier（REQUIRED_PAGE_MARKERS + SPA shell 断言）
  - verifier 回归测试（11 个：3 个文件系统 + 8 个 final-page smoke）
  - verify:readme 新增 README `## 安装` 锚点守卫（CTA-02）
affects:
  - Phase 16（发布验收的 site:verify gate 即本 plan 产物）
tech-stack:
  added: []
  patterns:
    - "assertBuildOutput(distDir, errors) 纯函数 + CLI wrapper（延续 verify-manifest 模式）"
    - "REQUIRED_PAGE_MARKERS 导出常量供测试与 CLI 共享 truth"
key-files:
  created: []
  modified:
    - apps/marketing/scripts/verify-build.mjs
    - tests/unit/scripts/marketing-verify-build.spec.ts
    - scripts/verify-readme-anchors.ts
decisions:
  - "页面是 client-rendered SPA，dist/index.html 只有壳：smoke 断言拆为两层——index.html 验 SPA shell（id=\"app\" mount + module script），content markers 扫描 dist 全部文本资产（.html/.js/.mjs/.css/.json/.txt），兼容 zh_CN locale chunk 拆分"
  - "REQUIRED_PAGE_MARKERS 锁定：hero 文案、7 个 section h2 标题、mockup proof label、4 个 shipped 平台名、Telegram 风险原文、REPO_URL 与 #%E5%AE%89%E8%A3%85 安装锚点"
  - "README.md 与 package.json 零改动：`## 安装` 标题与全部 Phase 15 验证命令已存在；CTA-02 闭环改为在 verify:readme 加锚点守卫（标题被改名/删除时 fail），符合 Minimal Change Principle"
metrics:
  duration: ~15 min
  tasks: 2/2
  completed: 2026-06-11
---

# Phase 15 Plan 04: Final Smoke Gate & Install Anchor Closure Summary

`site:verify` 从骨架期的"dist 存在"升级为最终页面内容 smoke gate：断言 SPA shell 完整、8-section 标题、mockup proof label、shipped 平台 truth、Telegram 风险文案与双 CTA 目标全部进入构建产物；`verify:readme` 新增 `## 安装` 锚点守卫闭合 CTA-02 的安装入口可验证性。

## Tasks Completed

| Task | Name | Commits | Files |
|------|------|---------|-------|
| 1 | 扩展 build verifier 到最终页面 smoke 断言 | f0c4b6a (RED), a50dd29 (GREEN) | verify-build.mjs, marketing-verify-build.spec.ts |
| 2 | 固化 README 安装入口与验证命令闭环 | 57b70da | verify-readme-anchors.ts |

## What Was Built

- **`verify-build.mjs` 强化：** 保留原 3 项文件系统断言（dist 存在 / 非空 / index.html 存在），新增两层 final-page smoke——(1) `dist/index.html` SPA shell 完整性（`id="app"` mount point + `type="module"` script tag，缺失即白屏）；(2) `REQUIRED_PAGE_MARKERS`（17 项）在 dist 全部文本资产中逐一断言，含 hero 文案、7 个 section 标题、`mockup` proof label、OpenClaw/Discord/Slack/Telegram 平台名、`live UAT pending / known risk` 风险原文、REPO_URL 与 `#%E5%AE%89%E8%A3%85` 安装锚点。CLI 契约不变（`[verify:build] FAIL` / `OK`）。
- **回归测试 11 个：** 3 个原文件系统失败路径 + 8 个新 smoke 路径（marker 列表契约、SPA shell 缺失、section/hero 缺失、proof label 缺失、CTA 缺失、风险文案缺失、成功路径、marker 跨 index.html 与 locale chunk 分布）。
- **`verify:readme` 锚点守卫：** README.md 若失去 `## 安装` 标题（INSTALL_URL 的 `#%E5%AE%89%E8%A3%85` 编码目标），`pnpm verify:readme` 直接 FAIL，防止锚点漂移导致营销页安装 CTA 死链（T-15-11）。
- **README.md / package.json 验证为零改动：** `## 安装` 标题已存在且稳定；`lint` / `typecheck` / `test` / `test:i18n-coverage` / `site:build` / `site:verify` / `verify:readme` / `verify:manifest` 全部命令入口完备。

## Deviations from Plan

### 计划文件范围内的说明

**1. README.md 与 package.json 无需修改（PLAN files_modified 列出但实际零 diff）**
- **Found during:** Task 2
- **Issue:** PLAN 将 README.md / package.json 列入 `files_modified`，但核对后 `## 安装` 锚点（15-01 INSTALL_URL 的目标）与全部必跑验证命令已存在且正确。
- **Resolution:** 遵循 Minimal Change Principle 与 PLAN 自身指令（"Verify and, if needed, minimally adjust"），不做无意义改动；CTA-02 的"锚点经仓库内校验"要求改为在 `scripts/verify-readme-anchors.ts` 加守卫实现（该文件属于 `pnpm verify:readme` 的实现体，是 PLAN verify 命令的直接载体）。
- **Files modified:** scripts/verify-readme-anchors.ts
- **Commit:** 57b70da

其余执行与计划完全一致。

## TDD Gate Compliance

- RED gate: `test(15-04)` commit f0c4b6a — 11 个测试中 8 个新 smoke 测试对旧 verifier 失败（验证为真 RED；3 个原文件系统测试保持通过）。
- GREEN gate: `feat(15-04)` commit a50dd29 — 499/499 全量测试通过。
- REFACTOR: 无需独立 refactor commit（GREEN 即最简实现；pre-commit eslint/prettier 已规范格式）。

## Verification

- `pnpm test -- tests/unit/scripts/marketing-verify-build.spec.ts` — 58 files / 499 tests passed（全量）
- `pnpm verify:readme` — OK（8 sections parity + `## 安装` 锚点存在 + PRIVACY 文件存在）
- `pnpm lint` — clean
- `pnpm typecheck` — clean
- `pnpm test` — 499/499 passed
- `pnpm test:i18n-coverage` — 100%（107 keys）
- `pnpm site:build` — vite build 成功（21 modules）
- `pnpm site:verify` — `[verify:build] OK`（真实 dist 通过全部 17 项 marker + SPA shell 断言）
- `pnpm verify:manifest` — OK

## Known Stubs

None — verifier 断言的全部 marker 来自真实构建产物，无 placeholder。

## Threat Flags

无新增安全面。T-15-10（smoke assertions + 明确错误输出）、T-15-11（`## 安装` 锚点守卫进 verify:readme）、T-15-12（mockup label + Telegram 风险文本进 smoke 断言）三项 mitigation 全部落地；零新增依赖（T-15-SC accept 维持）。

## Next Steps

Phase 15 四个 plan 全部完成。Phase 16 发布验收可直接以 `pnpm site:build && pnpm site:verify` 作为宣传页内容回归 gate，以 `pnpm verify:readme` 作为安装锚点 gate。

## Self-Check: PASSED

- apps/marketing/scripts/verify-build.mjs — FOUND（contains `assertBuildOutput` + `REQUIRED_PAGE_MARKERS`）
- tests/unit/scripts/marketing-verify-build.spec.ts — FOUND（contains `assertBuildOutput`）
- README.md — FOUND（contains `## 安装`）
- Commits f0c4b6a, a50dd29, 57b70da — FOUND
