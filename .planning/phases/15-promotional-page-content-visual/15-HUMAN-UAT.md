---
status: partial
phase: 15-promotional-page-content-visual
source: [15-VERIFICATION.md]
started: 2026-06-11T02:55:00Z
updated: 2026-06-11T02:55:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 首屏可理解性

expected: 打开宣传页（`pnpm site:preview`）后 5 秒内能理解 web2chat 核心价值（一键把网页结构化信息 + prompt 投递到 IM/AI 会话）与主 CTA（GitHub 仓库入口）。
result: [pending]

### 2. 响应式 + dark mode

expected: 320px / 768px / 桌面宽度下布局不破版；系统暗色模式下页面配色正常、文字可读。
result: [pending]

### 3. 键盘 tab 流 + locale 切换

expected: Tab 键依次聚焦 locale toggle、CTA、各交互元素且焦点环可见；点击 locale toggle 整页中英文切换可逆，无残留另一语言文案。
result: [pending]

### 4. 视觉风格一致性

expected: 页面视觉（accent 色、radius、间距）与现有扩展 popup/options UI 的 design tokens 观感一致。
result: [pending]

### 5. CTA 外链落点

expected: Hero 主 CTA 跳 GitHub 仓库根；底部安装 CTA 跳 README `## 安装` 锚点并正确定位。
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
