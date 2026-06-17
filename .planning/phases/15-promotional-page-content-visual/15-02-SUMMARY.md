---
phase: 15-promotional-page-content-visual
plan: 02
subsystem: marketing
tags: [marketing, components, proof-mockup, tdd]
requires:
  - 15-01（site-content getter API + ProofMeta / PayloadExample / FlowStep 类型）
provides:
  - SectionShell（band tone + width 显式 props 的单栏 section 容器）
  - CtaButton（primary/secondary 共享 CTA 视觉契约，44px + focus ring）
  - AssetLabel（mockup 徽标 + source/status/version 元数据行）
  - PopupMockup（popup 风格 payload 字段证据模块，字段顺序锁定）
  - TargetMockup（chat surface 投递结果证据模块）
  - Stepper（固定三步 ol stepper，横/纵/响应式布局）
  - proof metadata 回归测试（11 个）
affects:
  - 15-03+（app.tsx 页面组装直接消费这些组件接口）
tech-stack:
  added: []
  patterns:
    - "presentation-only 组件 + 内容经 props 注入（不在组件内调 getter，TargetMockup/AssetLabel 例外为类型导入）"
    - "design token CSS 变量 + Tailwind arbitrary value（延续 popup token 体系）"
    - "figure/figcaption + dl/dt/dd 语义化 proof 结构"
key-files:
  created:
    - apps/marketing/src/components/section-shell.tsx
    - apps/marketing/src/components/cta-button.tsx
    - apps/marketing/src/components/proof/asset-label.tsx
    - apps/marketing/src/components/proof/popup-mockup.tsx
    - apps/marketing/src/components/proof/target-mockup.tsx
    - apps/marketing/src/components/flow/stepper.tsx
    - tests/unit/marketing/proof-labels.spec.tsx
  modified: []
decisions:
  - "CtaButton 渲染为 <a>（两个 CTA 目标都是外部 GitHub URL），不做 button/link 双形态 API"
  - "Stepper orientation 增加 'responsive' 默认值（mobile 纵向 / md+ 横向），horizontal/vertical 保留为测试与显式布局用；连接线拆成两个独立 aria-hidden span 而不是单个三态 class"
  - "PopupMockup 字段分两组渲染：title/url/description/create_at 为紧凑 dl 行，content/prompt 为块级行（content 限高 max-h-28 截断），匹配真实 popup 的 Properties + Content 分区"
  - "TargetMockup 文案全部经 props 注入（chatLabel/messageLines/statusLabel），组件本身零硬编码文案，i18n 责任留给 15-03 组装层（D-07）"
  - "mockup chrome 内品牌字 'Web2Chat' 作为常量 BRAND_WORDMARK 不本地化（延续 15-01 品牌名不本地化决策）"
metrics:
  duration: ~12 min
  tasks: 2/2
  completed: 2026-06-11
---

# Phase 15 Plan 02: Shared Marketing Display + Proof Components Summary

宣传页共享展示组件族（section shell / CTA / asset label / popup mockup / target mockup / stepper）以 TDD RED→GREEN 完成，每个 proof 模块强制渲染可见 `mockup` 标签与 source/status/version 元数据行，后续页面组装只需按 section contract 排列。

## Tasks Completed

| Task | Name | Commits | Files |
|------|------|---------|-------|
| 1 | proof-labels RED 测试 + 共享组件与 proof mockup 实现 | a32e8bb (RED), f9163c2 (GREEN) | section-shell.tsx, cta-button.tsx, asset-label.tsx, popup-mockup.tsx, target-mockup.tsx, stepper.tsx, proof-labels.spec.tsx |
| 2 | typecheck 锁住新组件接口 | （无变更——typecheck 直接通过） | — |

## What Was Built

- **SectionShell：** D-01/D-04 单栏 banded 布局容器。`tone`（canvas/subtle）与 `width`（3xl/4xl）为显式 props 而非位置推导；`py-12 md:py-16` 外边距、`px-6 sm:px-8` 页面 shell、h2 标题 20px/600，零内容状态。
- **CtaButton：** Hero 与底部 CTA 共用的链接按钮。primary 用 accent 填充 + hover/active token，secondary 用 surface + 强边框；两者共享 `min-h-[44px]`、`px-6`、2px accent focus ring、active 按压位移。
- **AssetLabel：** 可见 `mockup` 徽标（mono 小徽章）+ `source: code-generated` / `status:` / `version:` 元数据行，消费 15-01 的 `getProofMeta()`。
- **PopupMockup：** figure + dl 结构，紧凑字段行（14px label + mono value）+ hairline 分隔 + content/prompt 块级行（content 限高截断），不用 raw `<pre>`；字段顺序由 `data-field-key` 锁定为 title/url/description/create_at/content/prompt；附带 AssetLabel figcaption。
- **TargetMockup：** 低对比 chat chrome（频道名 + 装饰消息图标）、accent-soft 投递消息气泡、显式文字投递状态行（勾选图标 + statusLabel，非纯颜色语义）；附带 AssetLabel figcaption。
- **Stepper：** `<ol>` 语义，固定接收恰好 3 步的 tuple 类型（编译期阻止任意步骤数组）；CSS 圆形数字徽章，最终 send 步 accent 填充；horizontal/vertical/responsive 三种布局只切 utility class 不变 DOM 顺序；连接线全部 `aria-hidden`。
- **回归测试（11 个）：** CTA 双 variant 44px/focus ring/accent 断言、stepper 3 步顺序 + 布局切换不变序、asset label 元数据、popup 字段顺序 + mono 无 pre、双 mockup 的 mockup 标签 + 元数据行、装饰 SVG aria-hidden、section shell tone/width/h2。

## Design Notes (design-taste-frontend)

Design read：B2B/OSS 开发者工具 landing page 组件层，Linear-style 克制语言，复用仓库既有 charcoal + emerald token 体系。Dials：VARIANCE 5 / MOTION 2 / DENSITY 4（15-UI-SPEC 锁定单栏叙事与既有 token，组件层无新增动效）。应用的 anti-slop 纪律：单 accent（emerald）锁定全组件、无渐变/无 AI-purple、无 generic 三等卡、阴影低对比且贴近背景色（`shadow-[0_1px_2px_var(--color-rule)]`）、圆角统一走 radius token、装饰元素全部 `aria-hidden`、proof 模块用语义化 dl/figure 而非 div 假截图堆砌（mockup 在本项目是 PLAN 锁定的 truth-safe 证据形式，且强制可见 mockup 标签自我声明）。

## Deviations from Plan

None - plan executed exactly as written.

（Stepper 的 `orientation` 在 plan 要求的 horizontal/vertical 之外补充了 `responsive` 默认值，属于 acceptance criteria 中 "vertical-mobile connectors" 的直接实现手段，组件 API 仍满足测试锁定的 horizontal/vertical 契约。）

## TDD Gate Compliance

- RED gate: `test(15-02)` commit a32e8bb — 11 个测试中 10 个以 null-render stub 失败。
- GREEN gate: `feat(15-02)` commit f9163c2 — 480/480 全量测试通过。
- REFACTOR: 无需独立 refactor commit（GREEN 即最简形态；pre-commit prettier 已规范格式）。

## Verification

- `pnpm test -- tests/unit/marketing/proof-labels.spec.tsx` — 57 files / 480 tests passed
- `pnpm typecheck` — clean
- `pnpm lint` — clean（含 no-hardcoded-strings JSX 规则）

## Known Stubs

None — 所有组件渲染真实结构；内容经 props 从 15-01 getter 注入，无 placeholder 流向 UI。

## Threat Flags

无新增安全面。T-15-04/05/06 mitigations 全部落入测试断言（每个 proof 模块的可见 mockup 标签 + 元数据行、stepper 固定三步 tuple 类型、装饰 SVG aria-hidden + CTA focus ring）。本计划零新增依赖（T-15-SC accept 维持）。

## Next Steps

15-03（页面组装）用 SectionShell 排列 8 个 section，Hero/底部 CTA 复用 CtaButton，proof section 注入 PopupMockup/TargetMockup，flow section 注入 Stepper；TargetMockup 的 chatLabel/messageLines/statusLabel 需在组装层接 i18n keys（D-07）。

## Self-Check: PASSED

- apps/marketing/src/components/section-shell.tsx — FOUND
- apps/marketing/src/components/cta-button.tsx — FOUND
- apps/marketing/src/components/proof/asset-label.tsx — FOUND
- apps/marketing/src/components/proof/popup-mockup.tsx — FOUND（contains "mockup"）
- apps/marketing/src/components/proof/target-mockup.tsx — FOUND（contains "status"）
- apps/marketing/src/components/flow/stepper.tsx — FOUND（contains "step"）
- tests/unit/marketing/proof-labels.spec.tsx — FOUND（contains "mockup"）
- Commits a32e8bb, f9163c2 — FOUND
