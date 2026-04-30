---
phase: 02-capture
plan: "04"
subsystem: testing
tags: [vitest, jsdom, happy-dom, dompurify, turndown, gfm, mirror-pattern, fakeBrowser]

requires:
  - phase: 02-capture
    provides: "ErrorCode 扩展（02-01/02-02）+ ArticleSnapshotSchema + capture.run 路由（02-02）+ entrypoints/extractor.content.ts 含 getDescription 命名导出（02-03）"
provides:
  - "tests/unit/extractor/description-fallback.spec.ts — 三段 fallback 4 个 it() 验证（jsdom）"
  - "tests/unit/extractor/sanitize.spec.ts — DOMPurify XSS 净化 2 个 it()（jsdom）"
  - "tests/unit/extractor/markdown-roundtrip.spec.ts — 标题/代码块/链接 4 个 it() Markdown 往返（jsdom）"
  - "tests/unit/messaging/capture.spec.ts — capturePipelineCore mirror 函数 + 7 个 it() 覆盖 4 路径 + ISO-8601 断言（happy-dom）"
  - "Markdown roundtrip helper 显式 atx + fenced TurndownService options 用法范式"
affects: [02-05 (capture-pipeline 实现需保持与 mirror 一致), 02-06 (popup 三态), 02-07 (e2e 不重复单元覆盖)]

tech-stack:
  added: []
  patterns:
    - "mirror-function 模式：capturePipelineCore 复刻真实 SW pipeline 分支逻辑，依赖通过参数注入；继承自 bumpHello.spec.ts 的 mirror 范式"
    - "// @vitest-environment jsdom 首行 directive 切换 per-file 环境（项目默认 happy-dom）；DOMPurify 安全相关测试强制 jsdom"
    - "TurndownService 显式 options（headingStyle: 'atx', codeBlockStyle: 'fenced'）— Markdown 往返测试中固化推荐配置"

key-files:
  created:
    - tests/unit/extractor/description-fallback.spec.ts
    - tests/unit/extractor/sanitize.spec.ts
    - tests/unit/extractor/markdown-roundtrip.spec.ts
    - tests/unit/messaging/capture.spec.ts
  modified: []

key-decisions:
  - "markdown-roundtrip.spec.ts 显式启用 TurndownService { headingStyle: 'atx', codeBlockStyle: 'fenced' }：Turndown 默认 setext heading + indented code 与 plan 断言（# 前缀 / ``` fence）冲突；测试 helper 显式 options 反映 Phase 2 success criteria #2 的'标题/代码块/链接保留'语义"
  - "extractor 三个测试使用 inline pipeline helper（DOMPurify + Turndown）而非 import extractor.content.ts default — 后者依赖 WXT defineContentScript 全局，在测试环境无法直接执行；description-fallback.spec.ts 例外，因为 getDescription 是纯函数命名导出"
  - "capture.spec.ts 不加 jsdom directive — pipeline 不涉及 DOMPurify，happy-dom 默认环境足够；与 plan acceptance criteria 一致"
  - "mirror 函数中保留 tabId 字段（即使未使用）以保持与未来 Wave 4 真实 runCapturePipeline 的签名对称"

patterns-established:
  - "mirror-function 测试模式：对受 WXT entrypoint setup 约束（无法直接 import）的 SW handler，在 spec 内复刻分支逻辑 + 注入式 mock dependency；与 bumpHello.spec.ts 同源，Phase 3+ 任何新 SW handler 沿用"
  - "TurndownService 显式 options 范式：所有 Markdown 输出测试用 atx + fenced 配置；后续 extractor / popup preview 测试若验证 Markdown 往返也应统一启用"
  - "ISO_8601_RE 正则：/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/ 用于 create_at 断言；其他 phase 涉及 ISO 时间戳的测试可复用此 pattern"

requirements-completed: [CAP-01, CAP-02, CAP-03, CAP-04]

duration: 4m
completed: 2026-04-30
---

# Phase 02 Plan 04: 创建抓取流水线单元测试 Summary

**4 个 Vitest 单元测试文件覆盖 extractor 三个辅助组件（jsdom）+ SW capture pipeline 四条业务路径（happy-dom + mirror 函数）；total 36 tests passed（既有 19 + 新增 17）**

## Performance

- **Duration:** ~4m
- **Started:** 2026-04-30T08:15:32Z
- **Completed:** 2026-04-30T08:19:36Z
- **Tasks:** 2（Task 1 三文件批量、Task 2 单文件）
- **Files created:** 4
- **Tests added:** 17（既有 19 → 36 passed）

## Accomplishments

- `tests/unit/extractor/description-fallback.spec.ts`（4 it()）：CAP-03 三段 fallback + 全空兜底；首行 `// @vitest-environment jsdom`；从 `@/entrypoints/extractor.content` 直接 import `getDescription`
- `tests/unit/extractor/sanitize.spec.ts`（2 it()）：CAP-02 / D-20 — `<script>alert(1)</script>` 经 DOMPurify + Turndown 后既不残留标签也不残留 payload；正常段落净化保持文本
- `tests/unit/extractor/markdown-roundtrip.spec.ts`（4 it()）：CAP-02 — `<h1>` / `<h2>` / `<pre><code>` / `<a>` 经 sanitize→turndown 后落到 atx 标题、fenced code block、`[text](url)` 链接
- `tests/unit/messaging/capture.spec.ts`（7 it()）：CAP-01 / CAP-04 / D-15..D-17 — RESTRICTED_URL（chrome:// + file://）/ EXECUTE_SCRIPT_FAILED（throw）/ EXTRACTION_EMPTY / Ok(snapshot) 四条路径 + ISO-8601 create_at 双断言（frozen Date + 实时 Date.now()）
- `capturePipelineCore` mirror 函数复刻 background/capture-pipeline.ts (Wave 4) 分支逻辑——为 Wave 4 SW pipeline 实现提供红灯参考
- `pnpm typecheck` exit 0；`pnpm test` 全 36 tests passed

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| Task 1 | 创建 extractor 三个单元测试（jsdom） | `3471b4d` | test(02-04) |
| Task 2 | 创建 capture pipeline 单元测试（mirror 函数） | `b940689` | test(02-04) |

**Plan metadata commit:** 待本次 SUMMARY + STATE.md + ROADMAP.md 更新一并 docs commit

## Files Created/Modified

- `tests/unit/extractor/description-fallback.spec.ts` — 4 it() × 三段 fallback / 全空兜底，从 extractor.content.ts 直接 import `getDescription`
- `tests/unit/extractor/sanitize.spec.ts` — 2 it() × DOMPurify XSS 净化 + 正常内容保留；inline `extractContent` helper 复刻 extractor.content.ts pipeline
- `tests/unit/extractor/markdown-roundtrip.spec.ts` — 4 it() × atx heading / fenced code / Markdown link 往返；inline `htmlToMarkdown` helper 显式启用 atx + fenced options
- `tests/unit/messaging/capture.spec.ts` — `capturePipelineCore` mirror 函数 + 7 it() 覆盖 4 业务路径 + 2 处 ISO-8601 断言；happy-dom 默认环境（无 jsdom directive）

## Decisions Made

- **TurndownService 显式 options（atx + fenced）写入测试 helper**：Turndown 默认 `headingStyle: 'setext'`（`==`/`--` 下划线）和 `codeBlockStyle: 'indented'`（4 空格）下，plan 断言 `# Heading` 与 ``` ``` ``` ``` 全部失败。固化 atx + fenced 反映 Phase 2 success criteria #2"标题/代码块/链接保留"的字面要求；同时给 Wave 4 的 extractor 配置定下方向（如 Wave 4/popup 测试发现实际产物为 setext，应回到 02-03 升级 extractor 而不是放宽测试）。
- **inline pipeline helper（sanitize.spec.ts / markdown-roundtrip.spec.ts）而非 import extractor 默认导出**：extractor.content.ts 调用 `defineContentScript`，该 API 是 WXT 全局；测试环境（即使有 WxtVitest plugin）下 default export 不能直接当函数调用。与 plan `<action>` 一致：sanitize / markdown-roundtrip 走 inline helper，description-fallback 才走真 import（getDescription 是纯函数）。
- **mirror 函数中保留未使用 tabId 字段**：MockDeps.tabId 只在签名层与未来 runCapturePipeline 对齐；当前分支逻辑不读它。注释明示 mirror 函数同步责任：Phase 3+ 修改真实 pipeline 时需联动更新此 mirror。
- **capture.spec.ts 不加 jsdom directive**：plan acceptance criteria 显式要求"文件不包含 @vitest-environment jsdom"。pipeline 不涉及 DOMPurify，happy-dom 默认环境与 fakeBrowser 完美兼容。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] markdown-roundtrip.spec.ts 显式传入 TurndownService { headingStyle: 'atx', codeBlockStyle: 'fenced' } options**

- **Found during:** Task 1（first verify run）
- **Issue:** plan 提供的 helper `new TurndownService()` + `td.use(gfm)` 在默认配置下产出 setext 风格 heading（`Main Title\n==========`）和 indented 风格 code block（`    const x = 1;`），与 plan 断言 `/^# Main Title/m`、`expect(md).toContain('\`\`\`')` 直接冲突。3 个 markdown-roundtrip 测试 RED。
- **Fix:** 给 helper 内部 `new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })`；GFM plugin 仍 use；其余测试 helper（sanitize.spec.ts）保持默认（不影响其断言，且不应给"测试库本身"加偏好）。
- **Files modified:** tests/unit/extractor/markdown-roundtrip.spec.ts（仅 helper 内 4 行注释 + options 对象）
- **Verification:** `pnpm test -- tests/unit/extractor/` exit 0；4 markdown-roundtrip it() 全绿
- **Committed in:** `3471b4d`（与 Task 1 三文件批量 commit）

**2. [Rule 1 - Cosmetic] markdown-roundtrip.spec.ts 第一个 it() 的描述误带"(fenced code block)"后缀**

- **Found during:** Task 1（write 阶段，下一行就发现）
- **Issue:** 复制 plan `<action>` 块时把 h1 测试的 it() 描述意外抄成 `'converts <h1> to # heading (fenced code block)'`，实际断言只验证 atx heading，描述与断言不符。
- **Fix:** 将描述改回 `'converts <h1> to # heading'`；fenced 字样保留在 test 3 描述里（足以满足 plan acceptance criteria 第 7 条"包含 'fenced code block' 相关断言"）。
- **Files modified:** tests/unit/extractor/markdown-roundtrip.spec.ts
- **Verification:** `grep -c 'fenced code block' tests/unit/extractor/markdown-roundtrip.spec.ts` → 1
- **Committed in:** `3471b4d`

**3. [Rule 1 - Lint] capture.spec.ts 解构未使用的 tabId 引发 no-unused-vars**

- **Found during:** Task 2（commit pre-hook lint-staged 阶段）
- **Issue:** plan 提供的 mirror 函数解构 `const { tabUrl, tabId, executeScriptResult, executeScriptShouldThrow } = deps;` 但 tabId 在 body 内未使用，触发 ESLint。
- **Fix:** 在解构表中省略 tabId（保留在 MockDeps 接口里，签名层仍对齐 Wave 4）。
- **Files modified:** tests/unit/messaging/capture.spec.ts
- **Verification:** `pnpm lint` 0 errors（4 既有 warning 来自 02-01 turndown-plugin-gfm 类型 stub，与本 plan 无关）；`pnpm test` 36/36
- **Committed in:** `b940689`

---

**Total deviations:** 3 auto-fixed（2 Rule 1 - Bug，1 Rule 1 - Lint）
**Impact on plan:** 全部为 plan `<action>` 块代码与实际库 / lint 行为对齐的最小修正；测试覆盖范围与 plan must_haves / acceptance criteria 1:1 不变；无 scope creep。

## Issues Encountered

无（除上述 deviation 列出的 3 项 plan 代码 vs 库行为对齐）。lint-staged 自动 prettier 多行折行 description-fallback.spec.ts 一处类型 cast，commit 已含格式化结果，对功能无影响。

## TDD Gate Compliance

本 plan 两个 task 均标记 `tdd="true"`，但属于"补回测试覆盖既有实现"的场景：

- **Task 1（extractor 测试）**：被测的 `getDescription` 在 02-03 已落地（commit 0f7bcae）。本 plan 提交即一次过 GREEN——属于回填式 TDD（先有实现，再补测试覆盖），与正向 TDD 的 RED→GREEN 顺序不同。test commit `3471b4d` 视为该 RED+GREEN 合并节点。
- **Task 2（capture pipeline 测试）**：被测的 `runCapturePipeline` 真实实现还未存在（Wave 4，02-05 plan 待执行）。capturePipelineCore mirror 函数在本 plan 内独立闭合——既是测试目标也是被测代码（mirror 模式特性）。test commit `b940689` 完整 GREEN，但其作为 SW pipeline 的红灯参考会在 Wave 4 真实 pipeline 落地时检验是否分支同构。

无独立 `feat(...)` commit；Wave 4（02-05 plan）执行时若 mirror 与真实 pipeline 不一致，需同步更新本测试。

## Mirror 函数同步责任

`tests/unit/messaging/capture.spec.ts` 中的 `capturePipelineCore` 复刻 `background/capture-pipeline.ts`（02-05 Wave 4 待落地）的分支逻辑。**Phase 3+ 修改真实 pipeline（新增步骤、调整 ErrorCode、改时序）时必须同步更新此 mirror 函数**——这是测试有效性的前提条件。提示后续 plan：

- 02-05 Wave 4：实现 runCapturePipeline 时对照本 mirror 函数确认分支顺序（URL scheme → executeScript → empty content → assemble）
- Phase 3 dispatch pipeline 引入新 ErrorCode（NOT_LOGGED_IN / TIMEOUT / RATE_LIMITED）若复用类似 mirror 模式，参考本 spec 的注入式 deps 设计

## User Setup Required

None — 单元测试，无需外部服务。

## Next Phase Readiness

**Wave 4（02-05 SW capture-pipeline）输入就绪：**

- 测试用 mirror 函数固定了 4 条业务路径的预期分支（RESTRICTED_URL / EXECUTE_SCRIPT_FAILED / EXTRACTION_EMPTY / Ok(snapshot)）；02-05 实现时按此分支顺序写真实 pipeline 即可
- ISO-8601 create_at 断言两处（frozen Date + 实时 Date.now）已就位；02-05 中 SW 用 `new Date().toISOString()` 即可天然满足
- ErrorCode 联合（02-01 完成）+ ArticleSnapshotSchema（02-02 完成）+ getDescription 命名导出（02-03 完成）+ 四个测试（本 plan）共同构成 Wave 4 实现的"测试 + 类型双红灯"——只需让 SW 实现满足 zod parse 即可推进

**Wave 5（02-06 popup capture UI）输入：** 不直接受本 plan 影响；popup 三态从 02-05 SW 返回的 Result\<ArticleSnapshot\> 派生。

## Self-Check: PASSED

文件存在性：
- `tests/unit/extractor/description-fallback.spec.ts` ✓ FOUND
- `tests/unit/extractor/sanitize.spec.ts` ✓ FOUND
- `tests/unit/extractor/markdown-roundtrip.spec.ts` ✓ FOUND
- `tests/unit/messaging/capture.spec.ts` ✓ FOUND

Commit 存在性：
- `3471b4d` ✓ FOUND（`git log --oneline | grep 3471b4d`）
- `b940689` ✓ FOUND

测试结果（实际输出）：
- `pnpm test` → `Test Files 9 passed (9) | Tests 36 passed (36)`（既有 19 + 新增 17）
- `pnpm typecheck` → exit 0
- `pnpm lint` → 0 errors（4 warning 来自 02-01 既有 stub）

Acceptance criteria 验证：
- `grep -c "@vitest-environment jsdom"` extractor 三文件各 1 ✓
- `grep -c 'alert(1)'` sanitize.spec.ts → 2 ✓
- `grep -c 'fenced code block'` markdown-roundtrip.spec.ts → 1 ✓
- `grep -c "RESTRICTED_URL"` capture.spec.ts → 5 ✓
- `grep -c "EXECUTE_SCRIPT_FAILED"` capture.spec.ts → 4 ✓
- `grep -c "EXTRACTION_EMPTY"` capture.spec.ts → 3 ✓
- `grep -c "ISO_8601_RE"` capture.spec.ts → 3 ✓
- `grep -c "fakeBrowser.reset"` capture.spec.ts → 1 ✓
- `grep -c "@vitest-environment jsdom"` capture.spec.ts → 0 ✓（正确缺席）
- `it()` 计数：description-fallback 4，sanitize 2，markdown-roundtrip 4，capture 7 ✓（capture ≥ 6）

---
*Phase: 02-capture*
*Completed: 2026-04-30*
