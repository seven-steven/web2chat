---
status: partial
phase: 15-promotional-page-content-visual
source: [15-VERIFICATION.md]
started: 2026-06-11T02:55:00Z
updated: 2026-06-13T01:45:00Z
---

## Current Test

[awaiting human visual approval after 15-05 gap closure]

## Tests

### 1. marketing 页面局部视觉收敛

expected: 在 `pnpm site:preview` 的真实页面中，Hero preview、use case / platform cards、底部 CTA inset panel 相较 gap-closure 前观感更柔和、更适合 web 呈现；如果仍不满意，反馈必须具体到组件/区域，而不是要求整套 shared token 重做。
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- truth: "marketing 页面在不改 shared design tokens 的前提下，局部收敛 Hero、卡片与 CTA band 的视觉层级，观感不再显得生硬。"
  status: pending-human-review
  severity: cosmetic
  source_gap: "15-HUMAN-UAT.md test 4 + 15-VERIFICATION.md re_verification.gaps_remaining[0]"
  evidence:
    - "apps/marketing/src/app.tsx 在 Hero preview、section cards、CTA inset panel 使用 local color-mix / border / shadow 柔化"
    - "shared/styles/design-tokens.css 未改动"
    - "phase15-05-marketing-page.png 为本次 preview 截图"
  acceptance_for_close:
    - "用户确认当前视觉观感可接受"
    - "若不接受，指出具体区域（Hero preview / use case cards / platform cards / CTA inset panel）"
