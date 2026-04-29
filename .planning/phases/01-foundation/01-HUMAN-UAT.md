---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-29T06:23:15Z
updated: 2026-04-29T06:23:15Z
---

# Phase 1 — 人工验证清单

> 由 `/gsd-execute-phase 1` 在 verification 步骤生成。所有 13 个自动化 must-have 已 PASS，
> 这 4 项必须在带 Chromium 的真开发机上完成，无法由 verifier agent 自动覆盖。
> 标记每条 result：pass / issue: <描述> / skipped。

## Current Test

[awaiting human testing]

## Tests

### 1. `chrome://extensions → Load unpacked` 真 Chrome 加载
- ROADMAP 成功标准 #1
- 步骤：`pnpm build` → 打开 `chrome://extensions` → 开启开发者模式 → Load unpacked → 选 `.output/chrome-mv3/`
- expected: 工具栏出现 Web2Chat action 图标；扩展 enabled 状态无错误徽章
- result: [pending]

### 2. en ↔ zh_CN i18n 文案切换
- ROADMAP 成功标准 #2
- 步骤：浏览器 UI 语言设为英文 → Reload 扩展 → 点击 action 图标 → 观察 popup 文案；切到简体中文 → 重启浏览器 → Reload → 再点击
- expected: en 下显示 `Hello, world (×N)`；zh_CN 下显示 `你好，世界 ×N`
- result: [pending]

### 3. SW Stop 按钮后再点击 action 图标 helloCount 仍 +1
- ROADMAP 成功标准 #4（Stop SW 字面路径）
- 步骤：加载 unpacked 后点击图标 → 记下 helloCount=N → `chrome://extensions` 卡片 → Inspect views → service worker → DevTools 顶部 **Stop**（红色方块）→ 立即点击 action 图标
- expected: popup 显示 helloCount = N+1（证明顶层同步注册 listener、无顶层 await、无依赖模块级状态）
- result: [pending]

### 4. Playwright e2e 跑绿（3 specs）
- ROADMAP 成功标准 #5 末段 + #4 自动化等价路径
- 步骤：`pnpm exec playwright install chromium` → `pnpm test:e2e`
- expected: 3 specs 全绿（first mount=1 / 三连递增 / SW reload 后递增）
- result: [pending]
- note: 执行机本地无 chromium-1217 binary（Playwright 1.59.1 要求）；CI 按 D-11 不跑此步，开发机本地必须跑过一次

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

(none — automated portion 100% PASS; this file tracks live-Chrome-only items)
