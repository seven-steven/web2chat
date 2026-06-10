---
phase: 15-promotional-page-content-visual
plan: 03
subsystem: marketing
tags: [marketing, page-composition, tdd, a11y]
requires:
  - 15-01（site-content getter API + 双语 locale keys）
  - 15-02（SectionShell / CtaButton / PopupMockup / TargetMockup / Stepper）
provides:
  - 最终 8-section 宣传页（app.tsx 完整组装）
  - section 顺序 / 语义结构 / CTA / 平台 truth / limits 落点 DOM 回归测试（11 个）
  - locale toggle 整页重渲染回归保护
affects:
  - Phase 16（发布验收直接验证本页面）
tech-stack:
  added: []
  patterns:
    - "getter-driven section render：app.tsx 零自由文案，全部经 site-content getter"
    - "signal 订阅 + 先 setLocale 后翻 signal 的 locale 切换顺序"
key-files:
  created:
    - tests/unit/marketing/app-sections.spec.tsx
  modified:
    - apps/marketing/src/app.tsx
    - apps/marketing/src/data/site-content.ts
    - apps/marketing/src/i18n/locales/en.json
    - apps/marketing/src/i18n/locales/zh_CN.json
decisions:
  - "locale toggle 改为先 await setLocale(next) 再赋值 locale.value：signal 赋值本身触发重渲染（App 渲染期读取 locale.value 已订阅），字典先加载保证重渲染读到新 locale，无需 CustomEvent hack"
  - "TargetMockup 文案经新增 getTargetMockup() 注入（chatLabel/messageLines/statusLabel 走 t()），messageLines 复用 payload example 数据保持双 mockup 叙事一致（D-07）"
  - "trust section 标题键新增 trust.title（隐私与权限），privacy/permissions 两组渲染为独立卡片内 h3"
  - "Telegram 风险标签用 --color-warn-soft 徽章 + 显式文字（非纯颜色语义），落在平台卡片内的 sublabel 行"
  - "底部 CTA 按钮组包在 accent-soft inset 面板中（15-UI-SPEC band 8 可选项），primary className 与 Hero CTA 完全一致由测试断言"
metrics:
  duration: ~25 min
  tasks: 2/2
  completed: 2026-06-11
---

# Phase 15 Plan 03: Final 8-Section Marketing Page Summary

宣传页骨架占位被替换为最终 8-section 体验：Hero（单 h1 + 主 CTA + payload 预览 + 平台 chips）→ Use cases → Payload mockup → Platforms → Flow stepper + 投递 mockup → Trust 双分组 → Known limits → 底部双 CTA，全部内容经 15-01 getter 注入、用 15-02 组件排列，11 个 DOM 回归测试锁住顺序、语义、CTA、truth 与 locale 切换行为。

## Tasks Completed

| Task | Name | Commits | Files |
|------|------|---------|-------|
| 1 | app-sections RED 测试 + app.tsx 最终 8-section 组装 | b731e03 (RED), 6783bee (GREEN) | app-sections.spec.tsx, app.tsx, site-content.ts, en.json, zh_CN.json |
| 2 | site build 锁住最终页面可构建性 | （无变更——build + verify-build 直接通过） | — |

## What Was Built

- **`app.tsx` 完整重写：** `<main>` 内 8 个块按锁定顺序排列（hero 自有 section + 7 个 SectionShell），背景按 canvas/subtle 交替（D-04）；Hero 是唯一 `max-w-4xl` section，桌面端文案/预览双栏，移动端单栏。skeleton 的 nextPhase 残留彻底移除。
- **语义结构：** 单个 `h1`（hero value statement）+ 7 个 section `h2` + trust 组内 `h3`；locale toggle 为 footer 内可见文字按钮（44px、focus ring、键盘可达）。
- **locale 切换修复落地：** toggle 先 `setLocale(next)` 加载字典，再翻 `locale.value` 触发 signal 订阅重渲染——测试断言 h1 与深层 section h2 全部切换到 zh_CN。
- **proof 落位：** payload section 渲染 PopupMockup，flow section 渲染 Stepper + TargetMockup（消费新增 `getTargetMockup()`，文案随 locale）；两个 mockup 的可见 `mockup` 标签 + 元数据行由测试确认仍在。
- **truth 边界：** 平台 section 仅 4 个 shipped 平台、Telegram warn 徽章 + 显式风险文字；`live UAT` 与 Feishu/Lark 字样被断言只出现在平台风险标签与 known limits，绝不进入 hero/use cases/payload/flow/trust/CTA。
- **回归测试（11 个）：** section 顺序与 h2 标题、mockup 落位、nextPhase 移除、h1/h2 计数、toggle 可达性与整页重渲染、trust 双分组、hero 单 primary CTA + 预览、底部双 CTA 与 Hero primary className 全等、平台白名单、limits 三项、风险文案泄漏防护。

## Design Notes (design-taste-frontend)

Design read：B2B/OSS 开发者工具 landing page，延续 wave 2 的 Linear-style 克制方向。Dials：VARIANCE 5 / MOTION 2 / DENSITY 4。应用纪律：单 emerald accent 全页锁定（hero CTA / 底部 primary / stepper 终步 / focus ring）、零渐变零 AI-purple、无 em-dash（新增文案）、Hero 文字栈 ≤4 元素（headline + subtext + CTA + 低权重 chips）、阴影统一低对比 `0_1px_2px var(--color-rule)`、radius 全走 token、布局家族跨 section 变化（hero 双栏 / 3-col 卡 / 单 mockup / 2-col 列表 / stepper+mockup 纵列 / 2-col 卡组 / 纯文字列表 / inset 按钮组）、known limits 比 trust 视觉权重更低（无卡片、muted 文字）。mockup 是 PLAN 锁定的 truth-safe 证据形式且强制自我声明标签。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] 新增 `getTargetMockup()` 与 `trust.title` 等 locale keys**
- **Found during:** Task 1 GREEN
- **Issue:** 15-02 把 TargetMockup 文案责任留给组装层接 i18n（D-07），但 15-01 数据层没有对应 getter / keys；trust section 也缺 section 级标题键。直接在 JSX 写死会违反 no-hardcoded-strings ESLint 规则与 getter-driven 契约。
- **Fix:** site-content.ts 新增 `getTargetMockup()`（chatLabel/messageLines/statusLabel，messageLines 复用 payload example 常量与键）与 `TrustContent.title`；en/zh_CN 各加 3 个 key（`trust.title`、`targetMockup.chatLabel`、`targetMockup.statusLabel`），parity 保持 100%。
- **Files modified:** apps/marketing/src/data/site-content.ts, en.json, zh_CN.json
- **Commit:** 6783bee

**2. [Rule 1 - Bug] RED 测试的 tabIndex 断言不兼容 happy-dom**
- **Found during:** Task 1 GREEN（其余 10 个测试已通过，仅此断言失败）
- **Issue:** happy-dom 不计算原生 `<button>` 的默认 `tabIndex = 0`（返回 -1），断言在真实浏览器语义正确但在测试环境恒假。
- **Fix:** 改为断言"无 `tabindex` 属性且无 `disabled`"（等价的键盘可达性保证，且不依赖环境实现）。
- **Files modified:** tests/unit/marketing/app-sections.spec.tsx
- **Commit:** 6783bee

## TDD Gate Compliance

- RED gate: `test(15-03)` commit b731e03 — 11 个测试中 10 个对 skeleton app.tsx 失败（验证为真 RED）。
- GREEN gate: `feat(15-03)` commit 6783bee — 492/492 全量测试通过。
- REFACTOR: 无需独立 refactor commit（GREEN 即最简组装形态；pre-commit prettier/eslint 已规范格式）。

## Verification

- `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` — 58 files / 492 tests passed（全量）
- `pnpm site:build` — vite build 成功（21 modules，index + zh_CN chunk）
- `node apps/marketing/scripts/verify-build.mjs` — OK
- `pnpm typecheck` — clean
- `pnpm lint` — clean（含 no-hardcoded-strings 规则）
- `pnpm test:i18n-coverage` — 100%（107 keys；marketing locale parity 由 site-content.spec 锁定）

## Known Stubs

None — 所有 section 渲染真实双语内容；payload/mockup 数据为 PLAN 锁定的 deterministic 演示数据（D-11），带可见 mockup 标签自我声明。

## Threat Flags

无新增安全面。T-15-07/08/09 mitigations 全部落入测试断言（平台 section 白名单 + Feishu/Lark 排除、trust/limits 分区与风险文案落点防泄漏、单 h1 + h2 outline + 键盘可达 toggle 与 CTA 顺序）。本计划零新增依赖（T-15-SC accept 维持）。

## Next Steps

Phase 15 三个 plan 全部完成；Phase 16 发布验收可直接对最终页面跑 visual smoke checklist（320px/768px/dark mode/键盘 tab 流）与 README 安装锚点核对。

## Self-Check: PASSED

- tests/unit/marketing/app-sections.spec.tsx — FOUND（contains "h1"）
- apps/marketing/src/app.tsx — FOUND（contains "App"）
- Commits b731e03, 6783bee — FOUND
