---
status: partial
phase: 02-capture
source: [02-VERIFICATION.md]
started: 2026-04-30T17:35:00Z
updated: 2026-04-30T18:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. tests/e2e/capture.spec.ts — Test 1: fixture article page fills 5 fields within 2s
expected: popup waits for [data-testid=capture-success] within 2_000ms；5 字段（title/description/content textarea + url/createAt output）均非空；title length > 0；url 含 'localhost'
result: [pending — re-test after G-1 fix]
issue (resolved 2026-04-30 commit 32ab18a): 扩展无法在 chrome://extensions 加载（先于 E2E 触发）。错误：`Name of a key "capture.empty.nocontent.body.after" is invalid. Only ASCII [a-z], [A-Z], [0-9] and "_" are allowed.` Chrome MV3 拒绝点号 key。已通过把 18 个 capture i18n key 扁平下划线化修复（locales × 2 + App.tsx t() ×18）。
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

### G-1: Chrome 拒绝加载扩展 — locale messages.json 含非法点号 key（RESOLVED 2026-04-30）

**source_uat:** UAT 1 (E2E happy path)
**reported_at:** 2026-04-30T17:50:00Z
**resolved_at:** 2026-04-30T18:10:00Z
**resolution_commit:** 32ab18a — fix(02-G-1): flatten capture i18n keys to ASCII underscore form
**status:** resolved
**root_cause:** 02-05 把 capture i18n key 用嵌套 YAML 结构（`capture.empty.noContent.body.after` 形态）写入 `locales/{en,zh_CN}.yml`。WXT 0.20.x + @wxt-dev/i18n 0.2.5 的 build 把嵌套 YAML 路径用 **dot 分隔** 拼成扁平 key 写入 `.output/chrome-mv3/_locales/<lang>/messages.json`。Chrome MV3 manifest validator 在加载扩展时严格要求 `_locales/*/messages.json` 的 key 匹配 `[a-zA-Z0-9_]+`，遇到点号即拒绝整个扩展加载。

**impact:** 扩展完全无法在 Chrome 上加载（无论 dev unpacked 还是 store 安装）。所有依赖扩展加载的 UAT（E2E ×3、visual UAT、WR-01 真实 Chrome 验证）都被阻断。

**fix scope:**
- `locales/en.yml` — 18 个 `capture.*` key 从嵌套结构改为扁平下划线 key（`capture_loading_label`, `capture_field_title`, ..., `capture_empty_noContent_body_after`, `capture_error_scriptFailed_body_after`）
- `locales/zh_CN.yml` — 同上，保持 100% 同构
- `entrypoints/popup/App.tsx` — 全部 `t('capture.*')` 调用 rename（约 18 处）
- `background/capture-pipeline.ts` — 检查是否使用 `t()`（应该没有，SW 不渲染文案；如有需 rename）
- `pnpm build` 后 grep `_locales/en/messages.json` 确认无点号 key
- `pnpm test` 全绿、`pnpm typecheck` 全绿

**evidence:**
```
$ grep -E '"capture[._]' .output/chrome-mv3/_locales/en/messages.json | head
  "capture.loading.label": { ... }
  "capture.field.title": { ... }
  "capture.empty.noContent.body.after": { ... }
```
Chrome 报错原文：`Name of a key "capture.empty.nocontent.body.after" is invalid. Only ASCII [a-z], [A-Z], [0-9] and "_" are allowed.`

**precedent:** Phase 1 已用 `popup_hello` 这种扁平下划线 key（messages.json 的 `popup_hello` 通过 Chrome 校验）；本 gap 只是把 Phase 2 拉回 Phase 1 已验证的 key 形态。

