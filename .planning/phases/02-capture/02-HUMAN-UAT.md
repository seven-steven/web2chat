---
status: passed
phase: 02-capture
source: [02-VERIFICATION.md]
started: 2026-04-30T17:35:00Z
updated: 2026-04-30T18:30:00Z
---

## Current Test

[all tests passed]

## Tests

### 1. tests/e2e/capture.spec.ts — Test 1: fixture article page fills 5 fields within 2s
expected: popup waits for [data-testid=capture-success] within 2_000ms；5 字段（title/description/content textarea + url/createAt output）均非空；title length > 0；url 含 'localhost'
result: passed (2026-04-30T18:23:00Z, 1.0s)
command: `pnpm test:e2e -- capture.spec.ts -g 'fills 5 fields within 2s'`

### 2. tests/e2e/capture.spec.ts — Test 2: textarea fields are editable after capture
expected: capture-success 出现后，`locator('[data-testid=capture-field-title]').fill('Edited Title')` 更新 textarea；description 同方式 fill 也更新
result: passed (2026-04-30T18:23:00Z, 954ms)
command: `pnpm test:e2e -- capture.spec.ts -g 'editable after capture'`

### 3. tests/e2e/capture.spec.ts — Test 3: chrome-extension:// active tab → empty state visible (ROADMAP #5)
expected: 打开 popup 无 article tab → SW URL scheme 预检拒绝 chrome-extension:// → [data-testid=capture-empty] 在 2_000ms 内可见
result: passed (2026-04-30T18:23:00Z, 792ms)
command: `pnpm test:e2e -- capture.spec.ts -g 'empty state visible'`

### 4. Visual UAT — 在真实 Wikipedia / blog 文章上打开扩展 popup
expected: loading skeleton ≤200ms 后渲染 5 字段；title/description/content textarea 接受键盘输入；布局符合 UI-SPEC.md（min-w 360px、gap-3、textarea focus rings）
result: passed (2026-04-30T18:27:00Z, real Chrome via `Load unpacked .output/chrome-mv3`)
evidence: 廖雪峰 blog post `https://liaoxuefeng.com/blogs/all/2026-04-29-vibe-coding-mypassword/index.html` — 5 字段全部正确抓取：title 含中文、来源 URL 完整、description 是 og:description 的 fallback 文案、create_at 为 SW 时间戳、content 是 Turndown 输出的 GFM Markdown（含代码块、表格、图片链接）。Popup 布局符合 UI-SPEC（深色主题正确切换，textarea 可滚动可编辑）。

### 5. Manual: WR-01 fix validation — currentWindow:true vs lastFocusedWindow
expected: 用户在 article tab 上点击 toolbar 图标，runCapturePipeline 正确把 article tab 视为 active（非 popup / 别窗）；任何 Chrome 120+ 版本不应在 article 上误报 RESTRICTED_URL
result: passed (2026-04-30, indirect via UAT 4)
evidence: UAT 4 的 5 字段抓取成功本身即证明 SW 在真实 toolbar 点击下正确解析了 article tab。如果 `getLastFocused({windowTypes:['normal']})` + `tabs.query({active,windowId})` 误判，popup 会显示 capture-empty 或 capture-error，而非完整字段。WR-01 的"popup 自指"边界条件已通过 windowTypes:['normal'] 过滤排除（popup window 不计入）。

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

### G-1: Chrome 拒绝加载扩展 — locale messages.json 含非法点号 key（RESOLVED 2026-04-30）

**source_uat:** UAT 1 (E2E happy path)
**reported_at:** 2026-04-30T17:50:00Z
**resolved_at:** 2026-04-30T18:10:00Z
**resolution_commit:** 32ab18a — fix(02-G-1): flatten capture i18n keys to ASCII underscore form
**status:** resolved

**root_cause:** Phase 2 的 18 个 capture i18n key 用 `capture.field.title` 这种点号格式写入 `locales/{en,zh_CN}.yml`，WXT 把它们 verbatim 输出到 `_locales/<lang>/messages.json`。Chrome MV3 严格要求 i18n key 匹配 `[a-zA-Z0-9_]+`，含点号即拒绝整个扩展加载。

**fix:** 18 个 key 全部改扁平下划线（`capture_field_title` 等），3 个文件改动（locales × 2 + App.tsx t() × 18）。

### G-2: E2E Playwright 无法触发 activeTab grant（RESOLVED 2026-04-30）

**source_uat:** UAT 1/2/3 (all 3 E2E tests blocked)
**reported_at:** 2026-04-30T18:10:00Z
**resolved_at:** 2026-04-30T18:23:00Z
**resolution_commit:** c78f207 — fix(02-G-2): make E2E capture tests work without real toolbar click
**status:** resolved

**root_cause:** Chrome `activeTab` 权限只在用户**真实点击 toolbar 图标 / 触发命令快捷键 / 选 context menu** 时授予；Playwright `page.goto(popupUrl)` 模拟不出这一手势 → SW `chrome.tabs.query` 返回的 tab 没有 `url` 字段 → pipeline 报 INTERNAL "No active tab found" → popup 渲染 capture-error。同时 `executeScript` 也因没有 host_permission 注入 localhost fixture 失败。次生：02-WR-01 的 `currentWindow:true` 在 SW context 因没有 current window 概念而返回空。

**fix:**
1. **`background/capture-pipeline.ts`** — 用 `chrome.windows.getLastFocused({windowTypes:['normal']})` + `tabs.query({active:true, windowId})` 替换 `currentWindow:true`。`windowTypes:['normal']` 仍排除扩展自己的 popup window（保留 WR-01 的初衷）。
2. **`wxt.config.ts`** — 改造为 `manifest: ({mode}) => ...`，在 `mode === 'development'` 时追加 `tabs` permission + `<all_urls>` host_permission；生产模式 (`pnpm build`) 仍锁定 `activeTab/scripting/storage` + `https://discord.com/*`。`pnpm verify:manifest` 通过。
3. **`tests/e2e/fixtures.ts`** — extensionPath 指向 `.output/chrome-mv3-dev`。
4. **`package.json`** — `test:e2e` 脚本前置 `wxt build --mode development`。
5. **`tests/unit/messaging/capture.spec.ts`** — `ChromeStub` interface 加 `windows.getLastFocused`，5 个 stubChrome 调用站补充 `windows: okWindow()`；direct test 全绿。

**verification:**
- `pnpm test:e2e` — 3/3 pass（1.0s + 954ms + 792ms）
- `pnpm typecheck` exit 0
- `pnpm test` 42/42 pass
- `pnpm lint` 0 errors
- `pnpm verify:manifest` OK — 生产 manifest 不受影响

**impact preserved:** 项目 CLAUDE.md 锁定的"manifest 仅 activeTab + scripting + storage + 静态 https://discord.com/*"约定在生产构建中保持。dev 模式的 `tabs` + `<all_urls>` 仅出现在 `.output/chrome-mv3-dev/`，不会被 `pnpm zip` 打包到上架产物。
