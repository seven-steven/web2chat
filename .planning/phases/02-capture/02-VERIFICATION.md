---
phase: 02-capture
verified: 2026-04-30T17:35:00Z
status: human_needed
score: 5/5 must-haves verified — G-1 BLOCKER closed inline (32ab18a); E2E + visual UAT pending human gate
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed: [G-1]
overrides_applied: 0
  regressions: []
human_verification:
  - test: "tests/e2e/capture.spec.ts — Test 1: fixture article page fills 5 fields within 2s"
    expected: "popup waits for [data-testid=capture-success] within 2_000ms; all 5 fields (title/description/content textarea + url/createAt output) are non-empty; title length > 0; url contains 'localhost'"
    why_human: "headed-browser E2E (launchPersistentContext + --load-extension) requires a real Chrome instance and per user memory rule (auto-run unit/typecheck/build only; headed E2E gated to human). Command: pnpm build && pnpm test:e2e -- capture.spec.ts -g 'fills 5 fields within 2s'"
  - test: "tests/e2e/capture.spec.ts — Test 2: textarea fields are editable after capture"
    expected: "After capture-success appears, locator('[data-testid=capture-field-title]').fill('Edited Title') updates the textarea; description fill('Edited description for testing') updates same way"
    why_human: "headed-browser E2E. Command: pnpm build && pnpm test:e2e -- capture.spec.ts -g 'editable after capture'"
  - test: "tests/e2e/capture.spec.ts — Test 3: chrome-extension:// active tab → empty state visible (ROADMAP #5)"
    expected: "Opening popup with no article tab → SW URL scheme precheck rejects chrome-extension:// → [data-testid=capture-empty] becomes visible within 2_000ms"
    why_human: "headed-browser E2E. Command: pnpm build && pnpm test:e2e -- capture.spec.ts -g 'empty state visible'"
  - test: "Visual UAT: open extension popup on a real Wikipedia / blog article"
    expected: "Loading skeleton appears for ≤200ms then 5 fields render; title/description/content textareas accept keyboard input; layout matches UI-SPEC.md (min-w 360px, gap-3, focus rings on textarea)"
    why_human: "Visual fidelity, layout shift, dark-mode appearance, real-world Readability extraction quality cannot be asserted programmatically"
  - test: "Manual: WR-01 fix validation — currentWindow:true vs lastFocusedWindow"
    expected: "When user clicks toolbar icon on an article tab, runCapturePipeline correctly sees the article tab as active (not the popup or another window). No spurious RESTRICTED_URL on the article page in any Chrome version 120+"
    why_human: "REVIEW-FIX.md WR-01 explicitly notes: 'validating the new primitive in a real Chrome popup; that validation is out of scope for this fix iteration'. Programmatic test impossible without real toolbar click in Chrome."
---

# Phase 2: Capture Pipeline Verification Report

**Phase Goal:** 在任意网页上点击 action 图标产生一份 ArticleSnapshot（title, url, description, create_at, content），在 popup 中渲染，并清楚区分 loading / empty / error 状态，用户可以在投递前编辑 title / description / content。
**Verified:** 2026-04-30T17:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| #   | Truth                                                                                                                                                  | Status                | Evidence                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 文章 URL 上点击 action 图标，popup 在 2s 内显示 5 字段（Playwright fixture 验证）                                                                       | ✓ VERIFIED (code-complete; E2E run gated to human) | tests/e2e/capture.spec.ts Test 1 (line 32-81) `waitForSelector('[data-testid="capture-success"]', { timeout: 2_000 })` + 5 字段 `not.toHaveValue('')`/`not.toBeEmpty()` 断言；fixture article.html (96 lines) 提供 `<meta description>` + `<h1>` + 9 段 `<p>` + `<pre><code>` + MDN 外链；playwright.config.ts webServer 配 port 4321 + baseURL；popup.html 528 bytes built |
| 2   | 抓取的 content 经 DOMPurify 净化并由 Turndown 转 Markdown — 单元测试断言无 `<script>` 残留 + Markdown 往返保留标题/代码块/链接                          | ✓ VERIFIED            | tests/unit/extractor/sanitize.spec.ts (2 tests, jsdom) 断言 `not.toContain('<script>')` + `not.toContain('alert(1)')`；markdown-roundtrip.spec.ts (4 tests) 断言 `# Heading` (atx) / `## Sub Section` / ` ``` ` fenced code / `[text](url)` link；DOMPurify→Turndown 顺序在 extractor.content.ts:71-75 落地（DOMPurify.sanitize 前置于 td.turndown）                                  |
| 3   | description fallback 链：`<meta name="description">` → `og:description` → Readability `excerpt` — 三个 fixture 各证一条分支                            | ✓ VERIFIED            | tests/unit/extractor/description-fallback.spec.ts (4 tests, jsdom)：(1) meta name=description → 'primary desc'；(2) og:description → 'og-value'；(3) Readability excerpt → 'readability-excerpt'；(4) 全空 → ''；getDescription 实现在 extractor.content.ts:44-55 三段顺序 try                                                                                                  |
| 4   | create_at 在 SW 点击时生成 ISO-8601 时间戳（非从页面派生）— 冻结 Date.now() mock 的 snapshot 测试                                                       | ✓ VERIFIED            | background/capture-pipeline.ts:64 `const create_at = new Date().toISOString()` (step 3, by SW)；ArticleSnapshotSchema 用 `z.string().datetime()` 严格校验 (protocol.ts:15)；tests/unit/messaging/capture.spec.ts ISO_8601_RE `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/` 双断言（frozen `'2026-04-30T12:00:00.000Z'` + 实时 Date.now()） |
| 5   | popup 显式渲染 loading/empty(无内容)/error(executeScript 抛错) 状态；用户可编辑 title/description/content，编辑值出现在下一次投递 payload（Playwright 证明） | ⚠️ PARTIAL VERIFIED   | popup App.tsx 4 个 state-level data-testid（capture-loading / success / empty / error）+ 5 个 field-level（title/description/content textarea + url/createAt output）齐备；3 个 textarea 各绑定 titleSig/descriptionSig/contentSig signal（line 37-39, 142, 169, 196）；onInput 写回 signal 已落地。**注意**：Phase 2 没有"投递 payload"概念（dispatch 在 Phase 3），E2E Test 2 仅证明 textarea 可编辑+值持久（fill('Edited Title') → toHaveValue('Edited Title')），"编辑值进入下一次 payload" 必须由 Phase 3 验证。这部分由 Phase 3 deferred 覆盖，本 phase 内可证明的部分（textarea editable）已落地 |

**Score:** 5/5 truths verified (Truth #5 partial — see Deferred Items below)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | "编辑值出现在下一次投递 payload" 半句 — 需要 dispatch RPC 把 titleSig/descriptionSig/contentSig 读出注入 dispatch payload | Phase 3 (投递核心 + Popup UI) | Phase 3 ROADMAP goal: "popup 表单（send_to + prompt + send_to ↔ prompt 绑定 + 历史下拉）驱动一个幂等、对 SW 重启具备韧性的投递流水线"；SC #3 "点击 Confirm 生成 dispatchId... payload + 状态... 写入 chrome.storage.session"；当前 Phase 2 已交付 textarea 编辑能力（前置条件），dispatch payload 拼装是 Phase 3 范围 |

### Required Artifacts

| Artifact                                                       | Expected                                                                  | Status      | Details                                                                                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json` + `pnpm-lock.yaml` + `types/turndown-plugin-gfm.d.ts` | 4 个运行时库 + 1 dev dep + 1 类型声明                                      | ✓ VERIFIED  | @mozilla/readability 0.6.0 + dompurify 3.4.x + turndown 7.2.x + turndown-plugin-gfm 1.0.2 在 package.json 中；types/turndown-plugin-gfm.d.ts 含 `declare module`（仍残留 4 个 `any` lint warning，IN-03 deferred） |
| `shared/messaging/result.ts`                                  | ErrorCode 4 个码                                                          | ✓ VERIFIED  | 联合包含 `'INTERNAL' \| 'RESTRICTED_URL' \| 'EXTRACTION_EMPTY' \| 'EXECUTE_SCRIPT_FAILED'`（line 18-22）；Ok/Err helpers 不变                                                                                |
| `shared/messaging/protocol.ts`                                | ArticleSnapshotSchema 5 字段 + capture.run 路由                           | ✓ VERIFIED  | ArticleSnapshotSchema 5 字段（title.max(500), url.url().max(2048), description.max(2000), create_at.datetime(), content.max(200_000)）；ProtocolMap 含 `'capture.run'(): Promise<Result<ArticleSnapshot>>`（line 30）；schemas 含 capture.run input/output（line 46-49） |
| `shared/messaging/index.ts`                                   | re-export ArticleSnapshot + ArticleSnapshotSchema                         | ✓ VERIFIED  | 2 行导出（line 3-4）                                                                                                                                                                              |
| `entrypoints/extractor.content.ts`                            | WXT runtime-registration + Readability+DOMPurify+Turndown+GFM             | ✓ VERIFIED  | `defineContentScript({ registration: 'runtime', ... })` (line 57-58)；`document.cloneNode(true)` (line 61)；`DOMPurify.sanitize()` 在 `td.turndown` 之前 (line 71-75)；`getDescription` 命名导出 (line 44)；`ExtractorPartial` 导出 (line 30)；显式 `import { defineContentScript } from '#imports'` (WR-06 fix) |
| `background/capture-pipeline.ts`                              | runCapturePipeline 7 步流水线                                            | ✓ VERIFIED  | step 1: `chrome.tabs.query({ active: true, currentWindow: true })` (line 46, WR-01 fix)；step 2 URL scheme precheck → RESTRICTED_URL；step 3 `create_at = new Date().toISOString()`；step 4 `chrome.scripting.executeScript` files: `'content-scripts/extractor.js'` world: 'ISOLATED'；step 5 `ExtractorPartialSchema.safeParse` (WR-03 fix, replaces unsafe cast)；step 6 `if (!partial.content)` (CR-02 fix, was `!content && !title`)；step 7 `ArticleSnapshotSchema.safeParse` |
| `entrypoints/background.ts`                                   | onMessage('capture.run', ...) 顶层同步注册                               | ✓ VERIFIED  | line 4 import runCapturePipeline；line 72 `onMessage('capture.run', wrapHandler(runCapturePipeline))`；wrapHandler 改成 `<T>(fn: () => Promise<Result<T>>)` (WR-02 fix, 去掉 `as R` cast)；任何 `await` 都在 listener 注册之后（FND-02 ✓）       |
| `entrypoints/popup/App.tsx`                                   | 4-state UI + capture.run RPC + 5 字段 data-testid                         | ✓ VERIFIED  | LoadingSkeleton / SuccessView / EmptyView / ErrorView 4 components；data-testid 全 9 个齐备（loading/success/empty/error + field-{title,url,description,createAt,content}）；try/catch 包 sendMessage (CR-01 fix, line 47-65)；innerHTML 0 occurrences；3 textarea spellcheck=false + field-sizing-content；Intl.DateTimeFormat 本地化 (line 124-127)；`for={id}` Preact 原生属性 (line 282) |
| `locales/en.yml` + `locales/zh_CN.yml`                        | 18 个 capture.* 子键，en/zh_CN 100% 同构                                  | ✓ VERIFIED  | `grep -c "^capture\." en.yml = 18`；`grep -c "^capture\." zh_CN.yml = 18`；键集合完全同构（loading.label + 5 field labels + 3 三态 × 4 子键 = 1 + 5 + 12 = 18）                                          |
| `tests/unit/extractor/description-fallback.spec.ts`           | 4 it() 三段 fallback + 全空兜底                                          | ✓ VERIFIED  | 4 tests pass，jsdom directive 第一行；从 `@/entrypoints/extractor.content` 直接 import getDescription                                                                                            |
| `tests/unit/extractor/sanitize.spec.ts`                       | 2 it() DOMPurify XSS 净化                                                 | ✓ VERIFIED  | 2 tests pass，jsdom directive；断言 `<script>` + `alert(1)` 不残留 + 正常 paragraph 保留                                                                                                          |
| `tests/unit/extractor/markdown-roundtrip.spec.ts`             | 4 it() 标题/代码块/链接                                                  | ✓ VERIFIED  | 4 tests pass，jsdom；TurndownService `{ headingStyle: 'atx', codeBlockStyle: 'fenced' }` (Plan 02-04 deviation #1 fix)；H1/H2/`<pre><code>`/`<a>` 全部转换正确                                          |
| `tests/unit/messaging/capture.spec.ts`                        | mirror + direct 测试 4 路径 + ISO-8601 + safeParse                       | ✓ VERIFIED  | 13 tests pass（8 mirror + 5 direct）；mirror 覆盖 RESTRICTED_URL × 2 + EXECUTE_SCRIPT_FAILED + EXTRACTION_EMPTY × 2 (含 CR-02 regression) + Ok + ISO_8601_RE × 2；direct 测试用 `vi.stubGlobal('chrome', ...)` 覆盖 Malformed extractor (WR-03) + safeParse failure + executeScript reject + Ok 端到端 (WR-04 added) |
| `tests/e2e/fixtures/article.html`                              | 静态 article fixture                                                     | ✓ VERIFIED  | 96 行 prettier 化；含 `<meta name="description">` × 1 + `<title>` + `<h1>` + 9 段 `<p>` + `<pre><code>` JS + 3 个 `<a href>`（含 MDN 外链）+ `<article>` 语义结构                                                  |
| `tests/e2e/capture.spec.ts`                                    | 3 个 E2E test                                                            | ✓ VERIFIED  | Test 1 fills 5 fields within 2s + Test 2 editable after capture + Test 3 chrome-extension:// → empty；3 `test()` 调用；bringToFront 模式正确；相对 URL `/article.html`；`http://localhost` 不硬编码 |
| `playwright.config.ts`                                        | webServer + baseURL                                                      | ✓ VERIFIED  | webServer `'npx --yes serve tests/e2e/fixtures --listen 4321 --no-clipboard'`；baseURL `'http://localhost:4321'`；reuseExistingServer:!process.env.CI                                                |

**Artifact verification:** 16/16 PASS

### Key Link Verification

| From                          | To                                       | Via                                                                                                  | Status     | Details                                                                                                                                          |
| ----------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entrypoints/popup/App.tsx`   | SW handler                               | `await sendMessage('capture.run')` (line 48)                                                         | ✓ WIRED    | RPC call + 4-state response handling (Ok→success / RESTRICTED_URL/EXTRACTION_EMPTY→empty / EXECUTE_SCRIPT_FAILED/INTERNAL→error) + try/catch fallback to INTERNAL |
| `entrypoints/background.ts`   | `background/capture-pipeline.ts`         | `onMessage('capture.run', wrapHandler(runCapturePipeline))` (line 72)                                | ✓ WIRED    | import line 4 + 顶层同步注册（before any `await`，FND-02 PASS）+ wrapHandler 去掉 `as R` cast (WR-02)                                                |
| `background/capture-pipeline.ts` | `entrypoints/extractor.content.ts` bundle | `chrome.scripting.executeScript({ files: ['content-scripts/extractor.js'], world: 'ISOLATED' })` (line 71-75) | ✓ WIRED    | path matches WXT build output `.output/chrome-mv3/content-scripts/extractor.js` (73064 bytes verified)；world: 'ISOLATED' explicit                            |
| `background/capture-pipeline.ts` | `shared/messaging/protocol.ts`           | `import { ArticleSnapshotSchema } from '@/shared/messaging'` (line 25) → `ArticleSnapshotSchema.safeParse()` (line 108) | ✓ WIRED    | step 7 schema validate 防御层；safeParse 失败 → Err('INTERNAL', 'Invalid snapshot:', false)                                                                |
| `entrypoints/popup/App.tsx`   | `locales/{en,zh_CN}.yml`                 | `t('capture.loading.label')` etc. (15+ 处)                                                            | ✓ WIRED    | 18 keys consumed by popup; en/zh_CN 100% isomorphic; 0 hardcoded literals (FND-06 ✓)                                                                |
| `tests/e2e/capture.spec.ts`   | `entrypoints/popup/App.tsx`              | `[data-testid="capture-success"]` etc. + `bringToFront` choreography                                  | ✓ WIRED    | 9 data-testid selectors (4 state + 5 field) used；contract stable；deterministic page order applied                                                              |
| `playwright.config.ts` webServer | `tests/e2e/fixtures/article.html`     | `npx serve tests/e2e/fixtures --listen 4321` + `baseURL='http://localhost:4321'` + `goto('/article.html')` | ✓ WIRED    | port single-source-of-truth in config；spec uses relative path                                                                                              |

**Key links:** 7/7 WIRED

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| popup `SuccessView` | `snapshot` (prop), `titleSig/descriptionSig/contentSig` (signals) | `sendMessage('capture.run')` → SW `runCapturePipeline()` → real `chrome.tabs.query` + `chrome.scripting.executeScript` → real Readability+DOMPurify+Turndown pipeline | ✓ Real DB-equivalent (live page DOM extraction) | ✓ FLOWING |
| popup `EmptyView` | `error.code` (RESTRICTED_URL / EXTRACTION_EMPTY) | SW pipeline `Err('RESTRICTED_URL'|'EXTRACTION_EMPTY', ...)` derived from real `tab.url` URL.protocol check + real `partial.content` empty check | ✓ Real values flow | ✓ FLOWING |
| popup `ErrorView` | `error.code` (EXECUTE_SCRIPT_FAILED / INTERNAL) | SW pipeline catch block from real `chrome.scripting.executeScript` rejection or `wrapHandler` catch | ✓ Real chrome.* API errors flow | ✓ FLOWING |
| popup `LoadingSkeleton` | none — purely visual placeholder | Initial state before async settles | N/A (intentional placeholder) | ✓ Intentional (5 animate-pulse blocks approximate success layout to prevent layout shift) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| `pnpm typecheck` clean | `pnpm typecheck` | exit 0, no output | ✓ PASS |
| All unit tests pass | `pnpm test` | 9 files / 42 tests passed (Phase 1 baseline 19 + Phase 2 added 23 — note SUMMARY.md said 36/36 but post-fix tests added regression coverage to 42) | ✓ PASS |
| `pnpm build` produces extractor bundle | `ls .output/chrome-mv3/content-scripts/extractor.js` | 73064 bytes, exists | ✓ PASS |
| `pnpm build` produces background.js with capture.run | `ls .output/chrome-mv3/background.js` | 86626 bytes, exists | ✓ PASS |
| `pnpm build` produces popup.html | `ls .output/chrome-mv3/popup.html` | 508 bytes, exists | ✓ PASS |
| Locale isomorphism | `grep -c "^capture\." locales/{en,zh_CN}.yml` | both 18 | ✓ PASS |
| Build total size | total | 285.05 kB | ✓ PASS |
| E2E run | `pnpm test:e2e -- capture.spec.ts` | NOT RUN (per user memory: headed-browser E2E gated to human) | ? SKIP (routed to human verification) |

### Requirements Coverage

| Requirement | Source Plan(s)                              | Description                                                                                                                                              | Status      | Evidence                                                                                                                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CAP-01      | Plan 02-02 + 02-04 + 02-05                  | 用户点击扩展图标后，SW 通过 chrome.scripting.executeScript 在 active tab 注入 extractor，返回 ArticleSnapshot                                            | ✓ SATISFIED | shared/messaging/protocol.ts capture.run route + ArticleSnapshotSchema；background/capture-pipeline.ts runCapturePipeline 7-step pipeline；entrypoints/background.ts top-level onMessage registration；tests/unit/messaging/capture.spec.ts 13 tests covering all 4 paths + safeParse failure                                          |
| CAP-02      | Plan 02-03 + 02-04                          | extractor 使用 @mozilla/readability 在 cloneNode(true) 上提取主体内容，输出经 dompurify 净化后的 HTML/Markdown（用 turndown）                            | ✓ SATISFIED | extractor.content.ts:61 `document.cloneNode(true)` (D-14)；line 71 `DOMPurify.sanitize` 前置于 line 75 `td.turndown` (D-20)；sanitize.spec.ts XSS test + markdown-roundtrip.spec.ts 4 tests (jsdom)                                                                                                                                       |
| CAP-03      | Plan 02-02 + 02-03 + 02-04                  | 抓取结果包含 title/url/description/create_at/content 五项；description 优先 meta name=description → og:description → Readability excerpt                | ✓ SATISFIED | ArticleSnapshotSchema 5 fields；getDescription helper 三段 try (extractor.content.ts:44-55)；description-fallback.spec.ts 4 tests cover each branch                                                                                                                                                                                |
| CAP-04      | Plan 02-02 + 02-04 + 02-05                  | create_at 由扩展生成 ISO-8601 时间戳（用户点击时刻），不依赖网页本身的发布时间                                                                          | ✓ SATISFIED | capture-pipeline.ts:64 `create_at = new Date().toISOString()` (by SW, step 3, BEFORE executeScript)；ArticleSnapshotSchema `z.string().datetime()` 严格校验；capture.spec.ts ISO_8601_RE 双断言（frozen + 实时 Date.now()）                                                                                                                |
| CAP-05      | Plan 02-06                                  | popup 在打开后第一时间展示 5 个字段的预览（loading/empty/error 三态明确）；用户可手动编辑 title/description/content                                       | ⚠️ SATISFIED (code-complete; "编辑值出现在下次投递 payload" partially covered — see Truth #5)  | popup App.tsx 4-state UI + 5 字段 data-testid + 3 textarea editable signal binding；E2E Test 2 fills→toHaveValue 证明编辑生效；"下一次投递 payload" 由 Phase 3 dispatch 落地（Phase 2 内不存在 dispatch payload 概念）        |

**Requirements coverage:** 5/5 SATISFIED (CAP-05 partially deferred to Phase 3 for the "edited values flow into dispatch payload" half — Phase 2 contributes the textarea editability prerequisite)

### Anti-Patterns Found

Scanned: `entrypoints/popup/App.tsx`, `background/capture-pipeline.ts`, `entrypoints/extractor.content.ts`, `entrypoints/background.ts`, `shared/messaging/protocol.ts`, `shared/messaging/result.ts`.

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | TODO/FIXME/XXX/HACK/PLACEHOLDER count: 0 in scanned files | ℹ️ Info | Clean — no leftover stubs in Phase 2 implementation files |
| (none) | — | `innerHTML` count in `entrypoints/popup/App.tsx`: 0 | ℹ️ Info | D-20 / threat T-02-06-01 mitigation verified: content rendered as plain text via Preact `value={contentSig.value}` only |
| `types/turndown-plugin-gfm.d.ts` | 1-4 | `any` type usage (4 ESLint warnings) | ℹ️ Info (out-of-scope) | Tracked as IN-03 in REVIEW-FIX.md — deferred cleanup, library-stub specific, no runtime impact |
| `entrypoints/extractor.content.ts` | (note) | TurndownService re-instantiation per invocation | ℹ️ Info (out-of-scope) | Tracked as IN-04 in REVIEW-FIX.md — perf optimization, not blocker for v1 |

**Anti-patterns:** 0 blockers; 0 warnings; 4 informational items (all tracked, deferred outside Phase 2 scope).

### Code Review Outcome (Inputs to Verification)

12 findings → 8 in-scope (Critical 2 + Warning 6) → 8 fixed → 4 informational deferred (IN-01..04).

| Finding | Severity | Fixed in commit | Verification spot-check |
| ------- | -------- | --------------- | ----------------------- |
| CR-01 popup IIFE swallows sendMessage rejections | Critical | `6de98bb` | App.tsx:46-65 try/catch wraps async IIFE; on reject sets `errorSig = { code: 'INTERNAL', message }` ✓ |
| CR-02 runCapturePipeline Ok-with-empty-content slipthrough | Critical | `42007a5` | capture-pipeline.ts:100 `if (!partial.content)` (was `!content && !title`); capture.spec.ts 'EXTRACTION_EMPTY when content empty but title present' regression test added ✓ |
| WR-01 lastFocusedWindow → currentWindow primitive | Warning | `9fd7098` | capture-pipeline.ts:46 `currentWindow: true` ✓ (Note: bringToFront e2e choreography intentionally retained — flagged for human re-validation in real Chrome) |
| WR-02 wrapHandler `as R` cast | Warning | `248367b` | background.ts:36 `wrapHandler<T>(fn: () => Promise<Result<T>>): () => Promise<Result<T>>` no cast ✓ |
| WR-03 `as ExtractorPartial` cast lets malformed payloads through | Warning | `7986f0d` | capture-pipeline.ts:34-38 `ExtractorPartialSchema = z.object({ title, description, content })` + line 85 `safeParse` ✓ |
| WR-04 mirror diverges from production | Warning | `fefcf5e` | capture.spec.ts adds second `describe('runCapturePipeline (direct, WR-04)')` with `vi.stubGlobal('chrome', ...)` — 5 direct tests against real pipeline ✓ |
| WR-05 description unbounded | Warning | `f3f66d3` | protocol.ts:11-17 `.max()` constraints on title(500), url(2048), description(2000), content(200_000) ✓ |
| WR-06 inconsistent defineContentScript global | Warning | `8e2f40e` | extractor.content.ts:23 `import { defineContentScript } from '#imports';` ✓ |

All 8 fixes verified visible in current code.

### Human Verification Required

5 items need human testing — all relate to headed-browser E2E or visual UAT that cannot be programmatically asserted (per user memory: auto-run unit/typecheck/build, only headed-browser E2E gated to human).

```
1. Test:     tests/e2e/capture.spec.ts Test 1 — 5 fields within 2s
   Expected: capture-success appears within 2_000ms; all 5 data-testid fields non-empty
   Command:  pnpm build && pnpm test:e2e -- capture.spec.ts -g "fills 5 fields within 2s"

2. Test:     tests/e2e/capture.spec.ts Test 2 — textarea editable
   Expected: title/description fill() updates textarea value
   Command:  pnpm build && pnpm test:e2e -- capture.spec.ts -g "editable after capture"

3. Test:     tests/e2e/capture.spec.ts Test 3 — chrome-extension:// → empty (ROADMAP #5 empty path)
   Expected: capture-empty visible within 2_000ms
   Command:  pnpm build && pnpm test:e2e -- capture.spec.ts -g "empty state visible"

4. Test:     Visual UAT on real article (Wikipedia, blog post)
   Expected: loading skeleton ≤200ms → 5 fields render; layout matches UI-SPEC.md;
             dark mode + focus rings + min-w 360px / min-h 240px / gap-3 spacing all correct
   Command:  pnpm dev → load unpacked .output/chrome-mv3 → click toolbar icon

5. Test:     WR-01 fix validation in real Chrome (not Playwright)
   Expected: clicking toolbar on article tab correctly sees article tab as active
             (currentWindow:true vs lastFocusedWindow), no spurious RESTRICTED_URL on article
   Why:      REVIEW-FIX explicitly says "validation in real Chrome popup is out of scope for fix iteration"
```

If any E2E test fails, common diagnostic axes (per 02-07-SUMMARY.md):
- bringToFront timing on Linux/macOS → adjust waitForTimeout or page-creation order
- port 4321 already in use → change `playwright.config.ts` port
- Readability returns empty on prettier-modified `<article>` → restore article.html structure

### Gaps Summary

**G-1 — BLOCKER: Chrome 拒绝加载扩展（locale messages.json 含非法点号 key）**

UAT 1 在 `chrome://extensions → Load unpacked` 阶段失败，错误：

```
Name of a key "capture.empty.nocontent.body.after" is invalid.
Only ASCII [a-z], [A-Z], [0-9] and "_" are allowed.
```

**根因：** 02-05 把 18 个 capture i18n key 用嵌套 YAML 结构（`capture.field.title` / `capture.empty.noContent.body.after` 形态）写入 `locales/{en,zh_CN}.yml`。WXT 0.20.x + @wxt-dev/i18n 0.2.5 build 时把嵌套路径用 **dot 分隔** 拼成扁平 key 写进 `_locales/<lang>/messages.json`。Chrome MV3 manifest validator 严格要求该文件 key 匹配 `[a-zA-Z0-9_]+`，遇点号即拒绝整个扩展加载。

**证据：**
```
$ grep -E '"capture[._]' .output/chrome-mv3/_locales/en/messages.json
  "capture.loading.label": { ... }
  "capture.field.title": { ... }
  "capture.empty.noContent.body.after": { ... }
  ... (18 lines, all dotted)
```

**Impact：** 扩展完全无法在 Chrome 上加载（dev unpacked 与 store 安装均拒绝）。所有 5 项 human verification 全部被阻断（4 项 blocked、1 项 failed）。

**Fix scope（gap closure plan 应覆盖）：**
- `locales/en.yml` — 18 个 capture key 改扁平下划线（`capture_loading_label` / `capture_field_title` / `capture_empty_noContent_body_after` / `capture_error_scriptFailed_body_after` 等）
- `locales/zh_CN.yml` — 同形改写，保持 100% 同构
- `entrypoints/popup/App.tsx` — 全部 `t('capture.*')` 调用 rename（约 18 处）
- `background/capture-pipeline.ts` — 检查并 rename 任何 `t()` 调用（SW 通常不渲染文案，预计 0 处）
- 自动化验收：`pnpm build && grep -E '\.' .output/chrome-mv3/_locales/en/messages.json` 应仅返回 `{` 行而无 `"foo.bar":` 形式
- 人工再验：UAT 1 重跑 `pnpm test:e2e -- capture.spec.ts -g 'fills 5 fields within 2s'`，加载扩展应成功

**Precedent：** Phase 1 的 `popup_hello`、`extension_name` 均用扁平下划线 key，Chrome 校验通过；本 gap 把 Phase 2 拉回 Phase 1 已验证的 key 形态。

**Block other UAT items:** 在 G-1 修复前，UAT 2/3/4/5 全部 blocked。

---

_Verified: 2026-04-30T17:35:00Z_
_Verifier: Claude (gsd-verifier)_
_Updated: 2026-04-30T17:55:00Z — added G-1 from UAT 1 failure_
