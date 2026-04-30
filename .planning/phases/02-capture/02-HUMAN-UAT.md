---
status: partial
phase: 02-capture
source: [02-VERIFICATION.md]
started: 2026-04-30T17:35:00Z
updated: 2026-04-30T17:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. tests/e2e/capture.spec.ts — Test 1: fixture article page fills 5 fields within 2s
expected: popup waits for [data-testid=capture-success] within 2_000ms；5 字段（title/description/content textarea + url/createAt output）均非空；title length > 0；url 含 'localhost'
result: [pending]
command: `pnpm build && pnpm test:e2e -- capture.spec.ts -g 'fills 5 fields within 2s'`

### 2. tests/e2e/capture.spec.ts — Test 2: textarea fields are editable after capture
expected: capture-success 出现后，`locator('[data-testid=capture-field-title]').fill('Edited Title')` 更新 textarea；description 同方式 fill 也更新
result: [pending]
command: `pnpm build && pnpm test:e2e -- capture.spec.ts -g 'editable after capture'`

### 3. tests/e2e/capture.spec.ts — Test 3: chrome-extension:// active tab → empty state visible (ROADMAP #5)
expected: 打开 popup 无 article tab → SW URL scheme 预检拒绝 chrome-extension:// → [data-testid=capture-empty] 在 2_000ms 内可见
result: [pending]
command: `pnpm build && pnpm test:e2e -- capture.spec.ts -g 'empty state visible'`

### 4. Visual UAT — 在真实 Wikipedia / blog 文章上打开扩展 popup
expected: loading skeleton ≤200ms 后渲染 5 字段；title/description/content textarea 接受键盘输入；布局符合 UI-SPEC.md（min-w 360px、gap-3、textarea focus rings）
result: [pending]
why_human: 视觉保真、layout shift、dark-mode 外观、Readability 实际抽取质量无法编程断言

### 5. Manual: WR-01 fix validation — currentWindow:true vs lastFocusedWindow
expected: 用户在 article tab 上点击 toolbar 图标，runCapturePipeline 正确把 article tab 视为 active（非 popup / 别窗）；任何 Chrome 120+ 版本不应在 article 上误报 RESTRICTED_URL
result: [pending]
why_human: REVIEW-FIX.md WR-01 明确：'real-Chrome popup 验证 out of scope for this fix iteration'。无 toolbar click 无法编程证伪。

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
