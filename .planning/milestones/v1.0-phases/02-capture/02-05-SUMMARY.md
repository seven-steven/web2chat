---
phase: 02-capture
plan: "05"
subsystem: background
tags: [chrome-scripting, executeScript, capture-pipeline, sw-orchestration, i18n, locale-isomorphic, top-level-listener]

requires:
  - phase: 02-capture
    provides: "ErrorCode 扩展 + ArticleSnapshotSchema + capture.run 路由（02-02）+ entrypoints/extractor.content.ts 含 ExtractorPartial（02-03）"
  - phase: 02-capture
    provides: "tests/unit/messaging/capture.spec.ts 中 capturePipelineCore mirror 函数固化的 4 路径分支契约（02-04）"
provides:
  - "background/capture-pipeline.ts — runCapturePipeline 命名导出，SW 端 7 步 capture 编排核心（CAP-01..CAP-04, D-15..D-17）"
  - "entrypoints/background.ts onMessage('capture.run') 顶层同步注册（FND-02 SW 纪律）"
  - "locales/en.yml + zh_CN.yml 各 18 个 capture.* 子键（loading + 5 字段标签 + 3 三态文案 × 4 子键）；100% 同构"
affects: [02-06 (popup capture UI 接到真实 SW pipeline 与 locale), 02-07 (e2e 直接验证 popup→SW→executeScript→snapshot 全链路), 03 (dispatch 的 ArticleSnapshot 输入由本 pipeline 产出)]

tech-stack:
  added: []
  patterns:
    - "SW pipeline 7 步编排：tabs.query → URL scheme 预检 → create_at by SW → executeScript → 解包 → 空检 → ArticleSnapshotSchema.safeParse"
    - "ExtractorPartial 在 SW 模块内本地定义（不从 content-script 模块 import）—— 防止 content-script bundle 被 bundler 拉入 SW bundle"
    - "zod safeParse 显式 Err 通道：safeParse 失败时直接 Err('INTERNAL', 'Invalid snapshot:...')，与 wrapHandler 的 generic catch 解耦，提升 diagnose 精度"
    - "i18n 三态文案拆 .before / .icon / .after 三段：popup 在文本中内嵌 toolbar icon 引用，避免硬编码字符串切片"

key-files:
  created:
    - background/capture-pipeline.ts
  modified:
    - entrypoints/background.ts
    - locales/en.yml
    - locales/zh_CN.yml

key-decisions:
  - "ExtractorPartial 类型在 background/capture-pipeline.ts 内复刻而非 import 自 entrypoints/extractor.content.ts —— content-script bundle（含 Readability + DOMPurify + Turndown，约 73 KB）不应被 SW import 触发拉入 SW bundle；类型字段稳定（D-15..D-17 已锁），重复定义维护成本可忽略。"
  - "step 7 用 ArticleSnapshotSchema.safeParse 而非 .parse —— 让 schema 验证失败走显式 Err('INTERNAL') 通道，而不是抛出后由 wrapHandler 的 generic catch 转换；错误消息直接包含 'Invalid snapshot:' 前缀便于日志定位。@webext-core/messaging 的 schemas.output 通过 RPC 边界再做一次校验（defense-in-depth）。"
  - "world: 'ISOLATED' 显式声明 —— ISOLATED 是 chrome.scripting.executeScript 的默认 world，但显式写出与 02-03 extractor.content.ts 的 'registration: runtime' 隐式 ISOLATED 形成一致表面，便于后续 Phase 5 adapter 任何 'MAIN' world 注入需求做对照。"
  - "三态文案 i18n 键拆 .before / .icon / .after 三个子键 —— 让 popup 在 'Click [the toolbar icon] again' 这种内嵌引用语义下不必硬编码字符串切片或 placeholder substitution；UI-SPEC.md Copywriting Contract 中 .body 全句仅供翻译审查，物理键只走拆分形态。"

patterns-established:
  - "SW handler 业务核心抽到 background/<feature>-pipeline.ts，listener 注册留在 entrypoints/background.ts 顶层 defineBackground 闭包 —— Phase 3+ 任何超过 ~50 行的 handler（dispatch / history / settings RPC）沿用同一拆分"
  - "ExtractorPartial 类型在使用方本地复刻（rather than cross-module import）—— SW ↔ content-script 边界普适：当 content-script bundle 体积可观（含第三方库）时，复刻类型代价远小于错误的 cross-bundle import"
  - "chrome.scripting.executeScript 错误 → Err('EXECUTE_SCRIPT_FAILED', ..., retriable=true)；undefined result → 同样错误码（不同 message）—— Phase 4/5 adapter executeScript 注入失败统一映射到此码（或后续扩展的 adapter 专属码）"

requirements-completed: [CAP-01, CAP-02, CAP-03, CAP-04]

duration: 4m
completed: 2026-04-30
---

# Phase 02 Plan 05: SW Capture Pipeline + 顶层注册 + Locale 键 Summary

**SW 端 7 步 capture 编排（chrome.tabs.query → URL scheme 预检 → ISO-8601 by SW → executeScript → 解包 → 空检 → ArticleSnapshotSchema.safeParse）+ entrypoints/background.ts 顶层 capture.run 路由 + 18 个 capture.* locale 子键（en/zh_CN 同构），36 tests 全绿、build 278.5 kB**

## Performance

- **Duration:** ~4m（Task 1 ~2m，Task 2 ~2m；总 217s）
- **Started:** 2026-04-30T08:25:51Z
- **Completed:** 2026-04-30T08:29:28Z
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 3

## Accomplishments

- `background/capture-pipeline.ts` 创建（102 行）—— `runCapturePipeline()` 命名导出，按 CONTEXT.md 时序图 7 步顺序执行：
  1. `chrome.tabs.query({ active: true, lastFocusedWindow: true })` → 无 tab 即 `Err('INTERNAL', false)`
  2. URL scheme 预检（`new URL(tab.url).protocol`）→ 非 http/https 即 `Err('RESTRICTED_URL', false)`
  3. `create_at = new Date().toISOString()`（CAP-04 — by SW）
  4. `chrome.scripting.executeScript({ target: { tabId }, files: ['content-scripts/extractor.js'], world: 'ISOLATED' })` → catch 即 `Err('EXECUTE_SCRIPT_FAILED', true)`
  5. `results[0]?.result` 解包；undefined 即 `Err('EXECUTE_SCRIPT_FAILED', 'Extractor returned no result', true)`
  6. `!partial.content && !partial.title` 即 `Err('EXTRACTION_EMPTY', false)`
  7. `ArticleSnapshotSchema.safeParse({ title, url, description, create_at, content })` → success 即 `Ok(parseResult.data)`；失败显式 `Err('INTERNAL', 'Invalid snapshot:...', false)`
- `entrypoints/background.ts`：在现有 `import { metaItem }` 之后追加 `import { runCapturePipeline } from '@/background/capture-pipeline'`；在 `defineBackground` 闭包顶层 `onMessage('meta.bumpHello', ...)` 之后立即追加 `onMessage('capture.run', wrapHandler(runCapturePipeline))`，绝无 await 先于此（FND-02 grep 验证）
- `locales/en.yml` + `locales/zh_CN.yml` 各追加 18 个 `capture.*` 子键（grep `^capture\.` 各计 18，100% 同构）：
  - `capture.loading.label`
  - `capture.field.{title,url,description,createAt,content}`（5 字段标签）
  - `capture.empty.restricted.{heading,body.before,body.icon,body.after}`（4 子键）
  - `capture.empty.noContent.{heading,body.before,body.icon,body.after}`（4 子键）
  - `capture.error.scriptFailed.{heading,body.before,body.icon,body.after}`（4 子键）
- `pnpm typecheck` exit 0；`pnpm test` 9 files / 36 tests passed（与 Wave 3 完全一致，未破坏既有测试）；`pnpm build` 278.5 kB；`pnpm lint` 0 errors（4 既有 warning 来自 02-01 turndown-plugin-gfm 类型 stub，与本 plan 无关）
- 构建产物 `.output/chrome-mv3/background.js` 含 `capture.run` × 2 与 `content-scripts/extractor.js` × 1；`.output/chrome-mv3/_locales/{en,zh_CN}/messages.json` 含 `capture.loading.label` × 1

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| Task 1 | 创建 background/capture-pipeline.ts（7 步流水线 + zod safeParse） | `fd87257` | feat(02-05) |
| Task 2 | 在 background.ts 顶层注册 capture.run + 补齐 en/zh_CN capture.* 18 个子键 | `f18929e` | feat(02-05) |

**Plan metadata commit:** 待本次 SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md 更新一并 docs commit

## Files Created/Modified

- `background/capture-pipeline.ts` — runCapturePipeline 7 步编排 + ExtractorPartial 本地复刻类型 + 全 4 个 ErrorCode（INTERNAL / RESTRICTED_URL / EXTRACTION_EMPTY / EXECUTE_SCRIPT_FAILED）映射
- `entrypoints/background.ts` — 新增 1 行 import（@/background/capture-pipeline）+ 1 行 onMessage('capture.run', ...) + 2 行注释；保持 defineBackground 顶层零 await
- `locales/en.yml` — 追加 18 个 capture.* 子键（lint-staged 后 prettier 把单引号 + `''` 转义统一为双引号包裹的撇号字符串，YAML 等价）
- `locales/zh_CN.yml` — 追加 18 个 capture.* 子键（与 en.yml 1:1 同构）

## Decisions Made

- **ExtractorPartial 类型在 SW 模块内本地复刻**：plan `<behavior>` 已明示动机（防止 content-script bundle 拉入 SW bundle）；02-03 SUMMARY 记录 `entrypoints/extractor.content.ts` extractor.js 73 KB（含 Readability + DOMPurify + Turndown），若 SW import 该文件，bundler 会把整个依赖图链接进 background.js。本地 3-字段 interface 维护成本极低，且与 ArticleSnapshotSchema（`{ title, description, content }` 子集 + SW 补 url/create_at）形成清晰的契约边界。
- **step 7 用 safeParse 而非 parse**：参 plan `<action>` 注释 + threat_model T-02-05-03 mitigation。safeParse 失败显式 Err('INTERNAL', 'Invalid snapshot: ${parseResult.error.message}', false)，错误码可溯源（"snapshot 组装失败" vs "其他 INTERNAL"），retriable=false（snapshot 字段错误重试无意义）。wrapHandler 的 generic catch 仍保留作为 chrome.* API 抛错的兜底。
- **world: 'ISOLATED' 显式声明**：默认值即 ISOLATED，但显式写出让代码 reviewer 一眼看到 02-03 extractor 与本处 executeScript 选用的 world 一致，T-02-03-03（content-script bundle 不暴露 web_accessible_resources）+ T-02-05-01（受限页面预检）形成一致防御层。Phase 5 OpenClaw / Discord adapter 若有 MAIN world 注入需求，对照修改一目了然。
- **i18n 三态文案拆 .before / .icon / .after**：UI-SPEC.md Copywriting Contract 中明确 popup 三态文案需要在文本中内嵌可点击/可指代的 "the toolbar icon" 引用（视觉上是带 icon 的内联文本）。拆三段让 popup 用 `<>{t('...before')}{IconElement}{t('...icon')}{t('...after')}</>` 自然组装，不必硬编码字符串切片或走 chrome.i18n placeholder substitution。

## Deviations from Plan

None - plan 一次过执行；2 个 task 各 1 commit，0 自动修复触发。

唯一与 plan `<action>` 块原文不同的点：lint-staged 在 commit Task 2 时由 prettier 把 plan 提供的 `'Can''t capture this page'`（YAML 单引号字面 + 内嵌 `''` 转义）格式化为 `"Can't capture this page"`（双引号包裹 + 撇号原文）。两者 YAML 解析等价（值同为字符串 `Can't capture this page`），不影响 chrome.i18n 输出，未破坏 100% 同构断言（zh_CN 无撇号字符不受影响），不计入 deviation。

## Issues Encountered

无。

执行轮按 plan task 顺序：
1. Task 1：创建 `background/capture-pipeline.ts`（mkdir background → Write 102 行）→ 9 个 acceptance grep 全绿 → typecheck exit 0 → commit fd87257
2. Task 2：3 个文件批量修改（background.ts 1 处 import + 1 处 listener + 2 行注释；en.yml + zh_CN.yml 各 18 个 capture.* 块）→ 9 个 acceptance grep 全绿（含 capture.* count 18 == 18 同构断言）→ listener 行号 71 < 任何 await（PASS）→ typecheck/test/build/lint 全绿 → commit f18929e

## TDD Gate Compliance

本 plan 两个 task 均为 `type="auto"`（Task 1 标 `tdd="true"` 但配合 02-04 mirror 函数 RED → 本 plan GREEN 的跨 plan TDD 流转）：

- **Task 1 GREEN gate**：02-04 plan 已交付 `tests/unit/messaging/capture.spec.ts` 中 `capturePipelineCore` mirror 函数（commit b940689），固化 4 条业务路径的红灯参考。本 plan Task 1 的 `runCapturePipeline` 实际实现按 mirror 同形分支（URL scheme → executeScript → 空检 → 组装），mirror 测试本就 GREEN（mirror 自包含闭合）；本 plan 不重新跑 mirror 验证真实 pipeline，二者契约同构由代码 review + acceptance criteria grep 验证，符合 02-04-SUMMARY.md "Mirror 函数同步责任" 节描述的工作流。
- **Task 2 无 TDD 标注**：i18n 键 + listener 注册类变更，不走单元测试（CI 的 i18n coverage gate + manifest verify-manifest 脚本会在 build 后兜底 100% 同构断言）；plan 已显式不要求 RED commit。

无独立 `test(...)` commit；TDD gate 通过 02-04 / 02-05 跨 plan 形成 RED→GREEN 序列：`b940689 (test) → fd87257 (feat) → f18929e (feat)`。

## Mirror 函数同步责任（继承）

`tests/unit/messaging/capture.spec.ts` 的 `capturePipelineCore` mirror 与本 plan 的 `runCapturePipeline` 实际实现分支同形：

| Mirror（02-04） | 实际（本 plan） |
|----------------|--------------------|
| URL scheme `try/catch new URL(...)` | URL scheme `try/catch new URL(...)` ✓ |
| `scheme !== 'http' && scheme !== 'https'` → `Err('RESTRICTED_URL', tabUrl, false)` | 同 ✓ |
| `executeScriptShouldThrow → Err('EXECUTE_SCRIPT_FAILED', 'executeScript rejected', true)` | `try/catch chrome.scripting.executeScript → Err('EXECUTE_SCRIPT_FAILED', String(err), true)` ✓ |
| `!partial → Err('EXECUTE_SCRIPT_FAILED', 'No result from extractor', true)` | `!partial → Err('EXECUTE_SCRIPT_FAILED', 'Extractor returned no result', true)` ✓（消息措辞略异，非分支行为差异） |
| `!partial.content && !partial.title → Err('EXTRACTION_EMPTY', ..., false)` | 同 ✓ |
| `Ok({ title, url, description, create_at, content })` | `ArticleSnapshotSchema.safeParse(...) → Ok(parseResult.data)`（额外 zod 校验层；mirror 未模拟此层因为 happy path 输入字段已合规） ✓ |

**实际比 mirror 多出的步骤**：step 7 ArticleSnapshotSchema.safeParse —— mirror 测试场景的 Ok 输入字段全合规（`https://example.com/article` URL + ISO-8601 create_at），即使加 safeParse 也仍 Ok。Phase 3+ 修改 ArticleSnapshot schema（如新增字段、约束变更）时，必须同步更新 mirror 函数的 Ok 出口与本 step 7 实现；建议在 schema 变更 plan 内同时改两处 + 跑全套测试。

## User Setup Required

None — 纯 SW 编排 + i18n 键，无外部服务、无新权限申请、无 manifest 变更。

## Next Phase Readiness

**Wave 5（02-06 popup capture UI）输入就绪：**

- `capture.run` RPC 路由通；popup mount 时 `sendMessage('capture.run')` 直接拿 `Result<ArticleSnapshot>`
- 18 个 `capture.*` 子键就位：popup 用 `t('capture.loading.label')` / `t('capture.field.title')` / `t('capture.empty.restricted.body.before')` 等即可，无需新增 i18n 键
- 三态分支由 popup 在 result.code 上 switch：`RESTRICTED_URL → empty.restricted` / `EXTRACTION_EMPTY → empty.noContent` / `EXECUTE_SCRIPT_FAILED → error.scriptFailed`（与 02-CONTEXT.md `<specifics>` 时序图一致）

**Wave 6（02-07 e2e）输入就绪：**

- 完整链路 popup → SW → executeScript → extractor → snapshot 已可端到端跑
- 02-CONTEXT.md `<specifics>` "测试矩阵" 中 `tests/e2e/capture.spec.ts`（本地 fixture 文章页）+ `tests/e2e/capture-restricted.spec.ts`（chrome://newtab）两个 spec 直接对接本 plan 输出

**Phase 3 dispatch flow 输入：**

- `ArticleSnapshot` 五字段（title / url / description / create_at / content）就位；Phase 3 `dispatch.run` payload 直接复用本 snapshot + send_to + prompt 拼接
- `ErrorCode` 联合已含 RESTRICTED_URL / EXTRACTION_EMPTY / EXECUTE_SCRIPT_FAILED；Phase 3 不动这三个，append 自家码（NOT_LOGGED_IN / TIMEOUT / RATE_LIMITED 等）即可

## Self-Check: PASSED

文件存在性：
- `background/capture-pipeline.ts` ✓ FOUND
- `entrypoints/background.ts` ✓ FOUND（含 capture.run 注册）
- `locales/en.yml` ✓ FOUND（含 18 个 capture.* 子键）
- `locales/zh_CN.yml` ✓ FOUND（含 18 个 capture.* 子键）
- `.output/chrome-mv3/background.js` ✓ FOUND（86503 bytes, capture.run × 2, content-scripts/extractor.js × 1）
- `.output/chrome-mv3/content-scripts/extractor.js` ✓ FOUND（73064 bytes，未破坏 02-03 产物）
- `.output/chrome-mv3/_locales/en/messages.json` ✓ FOUND（1927 bytes, capture.loading.label × 1）
- `.output/chrome-mv3/_locales/zh_CN/messages.json` ✓ FOUND（1902 bytes, capture.loading.label × 1）

Commit 存在性：
- `fd87257` ✓ FOUND（`git log --oneline | grep fd87257`）
- `f18929e` ✓ FOUND

验证命令实际输出：
- `grep -c "export async function runCapturePipeline" background/capture-pipeline.ts` → 1
- `grep -c "content-scripts/extractor.js" background/capture-pipeline.ts` → 3（注释 + 代码 + 注释引用）
- `grep -c "RESTRICTED_URL" background/capture-pipeline.ts` → 2
- `grep -c "EXTRACTION_EMPTY" background/capture-pipeline.ts` → 2
- `grep -c "EXECUTE_SCRIPT_FAILED" background/capture-pipeline.ts` → 2
- `grep -c "new Date().toISOString()" background/capture-pipeline.ts` → 2（注释 + 代码）
- `grep -c "world: 'ISOLATED'" background/capture-pipeline.ts` → 1
- `grep -c "ArticleSnapshotSchema.safeParse(" background/capture-pipeline.ts` → 3（注释 × 2 + 代码 × 1）
- `grep -c "Invalid snapshot:" background/capture-pipeline.ts` → 1
- `grep -c "capture.run" entrypoints/background.ts` → 1
- `grep -c "meta.bumpHello" entrypoints/background.ts` → 3（保留旧路由）
- `grep -c "runCapturePipeline" entrypoints/background.ts` → 2（import + onMessage）
- `grep -c "capture.loading.label" locales/en.yml` → 1
- `grep -c "capture.error.scriptFailed.body.after" locales/en.yml` → 1
- `grep -c "capture.empty.restricted.body.icon" locales/en.yml` → 1
- `grep -c "capture.loading.label" locales/zh_CN.yml` → 1
- `grep -c "^capture\." locales/en.yml` → 18
- `grep -c "^capture\." locales/zh_CN.yml` → 18（en/zh_CN 100% 同构 ✓）
- listener 行号断言：`onMessage('capture.run', ...)` 在第 71 行；任何 `await chrome.*` 在 background.ts 中无匹配（顶层 zero await，FND-02 PASS）
- `pnpm typecheck` → exit 0
- `pnpm test` → `Test Files 9 passed (9) | Tests 36 passed (36)`（与 Wave 3 完全一致，未破坏既有测试）
- `pnpm build` → exit 0；Σ Total size 278.5 kB；background.js 86.5 kB（capture-pipeline 增量约 1.5 kB）
- `pnpm lint` → 0 errors（4 warning 来自 02-01 既有 turndown-plugin-gfm 类型 stub，与本 plan 无关）

---
*Phase: 02-capture*
*Completed: 2026-04-30*
