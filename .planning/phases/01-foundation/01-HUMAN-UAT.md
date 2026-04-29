---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-29T06:23:15Z
updated: 2026-04-29T09:32:00Z
---

# Phase 1 — 人工验证清单

> 由 `/gsd-execute-phase 1` 在 verification 步骤生成。所有 13 个自动化 must-have 已 PASS，
> 这 4 项必须在带 Chromium 的真开发机上完成，无法由 verifier agent 自动覆盖。
> 标记每条 result：pass / issue: <描述> / skipped。

## Current Test

[awaiting human re-check after icon + README fixes]

## Tests

### 1. `chrome://extensions → Load unpacked` 真 Chrome 加载
- ROADMAP 成功标准 #1
- 步骤：`pnpm build` → 打开 `chrome://extensions` → 开启开发者模式 → Load unpacked → 选 `.output/chrome-mv3/`
- expected: 工具栏出现 Web2Chat action 图标；扩展 enabled 状态无错误徽章
- result: fixed — pending re-check
- note: 首测 (2026-04-29) 报告"图标空白" — 占位 PNG 透明。已绘制真 SVG (`public/icon/icon.svg`，绿色聊天气泡 + 白色右箭头) 并 rsvg-convert 渲染到 16/32/48/128，build output `.output/chrome-mv3/icon/*.png` 已含真实图像（285B / 476B / 697B / 1.64kB）。开发者下次 `pnpm build` + Reload 扩展后图标应显示。

### 2. en ↔ zh_CN i18n 文案切换
- ROADMAP 成功标准 #2
- 步骤：浏览器 UI 语言设为英文 → Reload 扩展 → 点击 action 图标 → 观察 popup 文案；切到简体中文 → 重启浏览器 → Reload → 再点击
- expected: en 下显示 `Hello, world (×N)`；zh_CN 下显示 `你好，世界 ×N`
- result: pass
- note: 开发者于 2026-04-29 在真 Chrome 上确认双语切换正常。

### 3. SW Stop 按钮后再点击 action 图标 helloCount 仍 +1
- ROADMAP 成功标准 #4（Stop SW 字面路径）
- 步骤：加载 unpacked 后点击图标 → 记下 helloCount=N → 打开 `chrome://serviceworker-internals/` → 找到 Web2Chat 的 SW → 点击 **Stop** → 立即点击 action 图标
- expected: popup 显示 helloCount = N+1（证明顶层同步注册 listener、无顶层 await、无依赖模块级状态）
- result: pass (via alternate path)
- note: 首测 (2026-04-29) 报告 chrome://extensions 卡片找不到 Stop 按钮 — 这是 Chrome 138+ 移除该入口的结果。开发者改走 `chrome://serviceworker-internals/` 的 Stop，行为正确（计数器正常 +1）。README #4 已更新为新路径，移除了过时的 chrome://extensions Inspect views 描述。

### 4. Playwright e2e 跑绿（3 specs）
- ROADMAP 成功标准 #5 末段 + #4 自动化等价路径
- 步骤：`pnpm exec playwright install chromium` → `pnpm test:e2e`
- expected: 3 specs 全绿（first mount=1 / 三连递增 / SW reload 后递增）
- result: pending (binary install required)
- note: 首测 (2026-04-29) 直接跑 `pnpm test:e2e` 时 3 specs 因 `Executable doesn't exist at .../chromium-1217/chrome-linux64/chrome` 失败 — 缺 Chromium binary。这是 Playwright 1.59.1 的预期行为，不是 code bug。README 第 21 行与第 #4 节都已强化前置步骤："首次跑前必须先安装浏览器：pnpm exec playwright install chromium"。开发者本机 install binary 后重跑应全绿（执行机环境本身缺 GUI/binary，无法在此处复跑）。

## Summary

total: 4
passed: 2
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

### Gap-01: 占位 icon (resolved)
- 来源: HUMAN-UAT #1 首测
- 描述: `public/icon/{16,32,48,128}.png` 是 75-143 字节的透明占位，工具栏图标显示空白
- 修复: 2026-04-29 — `public/icon/icon.svg` 真实图标 (绿色聊天气泡 + 白色右箭头) + rsvg-convert 渲染 4 尺寸 PNG。Build output 已含真实图像。
- status: resolved
- commit: (pending — assets(01))

### Gap-02: README SW Stop 路径过时 (resolved)
- 来源: HUMAN-UAT #3 首测
- 描述: README #4 指引 `chrome://extensions → Inspect views → service worker → Stop`，但 Chrome 138+ 已移除该入口；开发者实测改走 `chrome://serviceworker-internals/` 的 Stop 后行为正确
- 修复: 2026-04-29 — README #4 重写为 `chrome://serviceworker-internals/` 路径 + 加注 Chrome 138+ 变化说明
- status: resolved
- commit: (pending — docs(01))

### Gap-03: README 未明确 e2e 跑前必须先 install Chromium binary (resolved)
- 来源: HUMAN-UAT #4 首测
- 描述: 首测开发者直接跑 `pnpm test:e2e`，3 specs 因 `chromium-1217 binary missing` 失败；README 仅在 #4 节末提到 `pnpm test:e2e`，未明示 install binary 是首次必跑
- 修复: 2026-04-29 — README 第 21 行注释加 "首次跑前必须先安装浏览器：pnpm exec playwright install chromium"；#4 节末独立成块给出两行命令
- status: resolved
- commit: (pending — docs(01))
