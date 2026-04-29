---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-29T06:23:15Z
updated: 2026-04-29T09:55:00Z
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
- result: pass
- note: 首测 (2026-04-29 06:23 UTC) 报告"图标空白"。已绘制真 SVG (`public/icon/icon.svg`，绿色聊天气泡 + 白色右箭头) 并 rsvg-convert 渲染到 16/32/48/128。开发者于 2026-04-29 09:55 UTC 在真 Chrome 上重新 `pnpm build` + Reload 后确认图标正常显示。

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
- result: fixed — pending re-check
- note: 首测 (2026-04-29 06:23 UTC) 因缺 chromium binary 全部 fail（不是 code bug）。重测 (09:55 UTC) install binary 后跑出 1 ✓ + 2 ✗ 真 code bug：
  - test #2 [0,0,0] 期望 [N,N+1,N+2] — popup loading 状态渲染 `(×0)` 与 RPC 失败视觉同形 → Gap-04
  - test #3 `waitForEvent('serviceworker')` 10s 超时 — fixture race（WR-03 已预警） → Gap-05
  已在 commit 61046e6 修复，开发者下次 `pnpm build && pnpm test:e2e` 应 3/3 绿。

## Summary

total: 4
passed: 3
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

### Gap-01: 占位 icon (resolved)
- 来源: HUMAN-UAT #1 首测
- 描述: `public/icon/{16,32,48,128}.png` 是 75-143 字节的透明占位，工具栏图标显示空白
- 修复: 2026-04-29 09:32 UTC — `public/icon/icon.svg` 真实图标 (绿色聊天气泡 + 白色右箭头) + rsvg-convert 渲染 4 尺寸 PNG
- verified: 2026-04-29 09:55 UTC 开发者真 Chrome 复跑 — 图标正常显示
- status: resolved
- commit: 6f073ae

### Gap-02: README SW Stop 路径过时 (resolved)
- 来源: HUMAN-UAT #3 首测
- 描述: README #4 指引 `chrome://extensions → Inspect views → service worker → Stop`，但 Chrome 138+ 已移除该入口
- 修复: 2026-04-29 09:32 UTC — README #4 重写为 `chrome://serviceworker-internals/` 路径
- verified: 开发者实测 alt path 计数器 +1 行为正确
- status: resolved
- commit: dd1d336

### Gap-03: README 未明确 e2e 跑前必须先 install Chromium binary (resolved)
- 来源: HUMAN-UAT #4 首测
- 描述: 首测开发者直接跑 `pnpm test:e2e`，3 specs 因 `chromium-1217 binary missing` 失败
- 修复: 2026-04-29 09:32 UTC — README pnpm 脚本注释 + #4 节末块强化前置步骤
- verified: 开发者重测先 install binary，e2e 真正跑起来（暴露真 code bugs）
- status: resolved
- commit: dd1d336

### Gap-04: popup loading state 渲染 ×0 与 RPC 失败视觉同形 (resolved)
- 来源: HUMAN-UAT #4 重测 — `tests/e2e/popup-rpc.spec.ts:33` test #2 fail
- 描述: `App.tsx` 当 `helloCount === null`（loading 中、sendMessage 还未返回）时渲染 `t('popup_hello', [0])` 显示 `(×0)`，与 error path 视觉同形。Playwright `locator.innerText()` 在 page.goto 完成时立即取文本，sendMessage 还在 await，结果取到 `(×0)` 占位 → 三次连续 popup mount 全部解析为 0。同时这也是真用户的 FOUC bug（瞬间闪烁错误的 ×0）。
- 修复: 2026-04-29 09:55 UTC — `App.tsx` loading state（count===null && error===null）渲染空 `<main aria-busy="true" data-testid="popup-loading" />`，不挂 popup-hello data-testid。Playwright locator 因此自动等到 popup-hello 真正出现（即 sendMessage 完成），race 消除。Plan must_have（error 走 popup_hello fallback 文案）保持原样。
- status: resolved
- commit: 61046e6

### Gap-05: e2e fixture reloadExtension 与 SW lazy-start 竞态 (resolved)
- 来源: HUMAN-UAT #4 重测 — `tests/e2e/popup-rpc.spec.ts:50` test #3 fail（10s timeout on `context.waitForEvent('serviceworker')`）
- 描述: `tests/e2e/fixtures.ts:43-53` `reloadExtension` 先 `await sw.evaluate(() => chrome.runtime.reload())` 再 `await context.waitForEvent('serviceworker', { timeout: 10_000 })`。`chrome.runtime.reload()` 卸载 SW，新 SW 是 lazy-start，没有 trigger 不会启动 → waitForEvent 永远超时。code-review WR-03 已预警这一 race。
- 修复: 2026-04-29 09:55 UTC — `fixtures.ts` 移除 reload 后的 `waitForEvent`。下一步 test 代码（`newPage` + `goto popup.html`）即是天然 trigger，Playwright `locator.waitFor` 隐式等待 popup mount + RPC resolve，正确闸门 assert，且无 fragile event race。
- status: resolved
- commit: 61046e6
