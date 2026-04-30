---
phase: 02-capture
plan: "03"
subsystem: capture
tags: [wxt, content-script, readability, dompurify, turndown, gfm, runtime-registration]

requires:
  - phase: 02-capture
    provides: "@mozilla/readability + dompurify + turndown + turndown-plugin-gfm 运行时依赖（02-01）；ArticleSnapshotSchema + capture.run 路由 + ErrorCode 扩展（02-02）"
provides:
  - "entrypoints/extractor.content.ts — WXT runtime-registration content script，独立 bundle 到 content-scripts/extractor.js"
  - "ExtractorPartial 类型（{ title, description, content }）—— SW 之后追加 url + create_at 形成 ArticleSnapshot"
  - "getDescription helper 命名导出 —— 三段 fallback（meta[name=description] → og:description → Readability.excerpt）"
  - "Readability + DOMPurify + Turndown + GFM 流水线（D-14、D-18、D-20 顺序约束落地）"
affects: [02-04 (capture-pipeline 注入目标), 02-05 (extractor 单元测试 import getDescription/ExtractorPartial), 02-06 (popup 渲染 SW 返回的 ArticleSnapshot)]

tech-stack:
  added: []
  patterns:
    - "WXT runtime-registration content script — 不进 manifest content_scripts，通过 chrome.scripting.executeScript({ files: ['content-scripts/extractor.js'] }) 程序化注入"
    - "Readability 强制 cloneNode(true) — 防止 parse() 改写 live DOM"
    - "DOMPurify 在 Turndown 之前（默认 profile，零放宽）"
    - "description 查询原始 document（非 clone）作为 Readability 内部 mutation 行为的防御层"
    - "顶层零副作用：所有逻辑在 main() 内，模块顶层仅 import + export interface/function/default"

key-files:
  created:
    - entrypoints/extractor.content.ts
  modified: []

key-decisions:
  - "extractor 注入 world：默认 ISOLATED（CONTEXT.md Discretion 推荐项落地）—— Readability 只读 DOM 不依赖页面 JS state，registration: 'runtime' 不显式声明 world 即取 WXT 默认 ISOLATED"
  - "description fallback 三段查询单文件内顺序 try（CONTEXT.md Discretion 推荐项）；getDescription 命名导出供 Wave 2 并行的单元测试 (02-05) 直接 import 验证三分支"
  - "空白/换行规范化信任 Turndown 默认（CONTEXT.md Discretion 推荐项）—— 不在 extractor 里再做 trim/collapse，发现具体问题再加"
  - "main() 返回 ExtractorPartial（不含 url/create_at）—— url 由 SW 从 tabs.query 拿、create_at 由 SW toISOString，与 D-15..D-17 时序一致；ArticleSnapshot 完整 zod 校验由 SW 在 capture-pipeline (02-04) 里执行"

patterns-established:
  - "WXT runtime-only content script bundle：defineContentScript({ registration: 'runtime', main(): ReturnType }) — 后续任何 'on-demand 注入' 类 content script 沿用"
  - "executeScript 跨边界仅用 string-only return value：避免 structuredClone 边界上的对象引用泄漏"
  - "helper 命名导出 + default 入口默认导出：default export 是 WXT runtime contract，命名导出供单元测试，二者并存不冲突"

requirements-completed: [CAP-02, CAP-03]

duration: 5m
completed: 2026-04-30
---

# Phase 02 Plan 03: 创建 Extractor Content Script Summary

**WXT runtime-registration content script，封装 Readability(cloneNode) → DOMPurify → Turndown+GFM 流水线，输出 ExtractorPartial，bundle 到 content-scripts/extractor.js (73 KB)**

## Performance

- **Duration:** ~5m（Task 1 一次过；执行轮验证 + SUMMARY 撰写各 ~2m）
- **Started:** 2026-04-30T05:28:58Z（commit 0f7bcae 时间）
- **Completed:** 2026-04-30T08:10:00Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- `entrypoints/extractor.content.ts` 创建（84 行）—— `defineContentScript({ registration: 'runtime', main(): ExtractorPartial })`
- `pnpm build` 产物 `.output/chrome-mv3/content-scripts/extractor.js` 73.06 kB 存在；manifest `content_scripts: []`（runtime-only，符合 D-14 + 威胁模型 T-02-03-03）
- `getDescription(doc, article)` 命名导出 —— 三段 fallback：meta description → og:description → Readability.excerpt
- `ExtractorPartial` 接口命名导出 —— SW 在 capture-pipeline (02-04) 之后追加 url + create_at 形成 ArticleSnapshot
- D-14（cloneNode）+ D-18（Markdown only）+ D-20（DOMPurify 默认 profile，前置 Turndown）全部落地

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| Task 1 | 创建 entrypoints/extractor.content.ts | `0f7bcae` | feat(02-03) |

**Plan metadata commit:** 待本次 SUMMARY + STATE.md + ROADMAP.md 更新一并 docs commit

_Note: Task 1 标注为 `tdd="true"`，但单元测试在 Wave 2 并行的 02-05 plan 中实现（plan 拆分使然），本 plan 仅交付实现并由 typecheck/build/manifest 验证落地_

## Files Created/Modified

- `entrypoints/extractor.content.ts` —— WXT runtime content script：Readability + DOMPurify + Turndown+GFM 流水线 + getDescription helper + ExtractorPartial 类型

## Decisions Made

- **注入 world = ISOLATED（默认）**：CONTEXT.md Discretion 推荐落地。Readability 只读 DOM，无需访问页面 JS state；ISOLATED world 让 extractor bundle 与页面脚本隔离，加固 T-02-03-03。
- **description 查询原始 document 而非 clone**：Readability.parse() 主要改写 body，head meta 通常不动，但查询原始 document 让 getDescription 与 Readability 内部 mutation 行为完全解耦。注释中明示这是防御性设计（D-20 + RESEARCH.md A5）。
- **顶层零副作用**：所有逻辑（cloneNode、new Readability、DOMPurify.sanitize、TurndownService）在 main() 闭包内运行；模块顶层仅 import + export，符合 SW 纪律的"无副作用模块顶层"扩展（content script 也遵守同等原则）。
- **GFM 一次 use()，无自定义 rule**：Turndown 默认输出 + GFM 扩展（表格、删除线、fenced code、task list）已覆盖 CAP-03 场景；不为单一 IM 平台预留 rule 注入接口（v1.x 再说）。

## Deviations from Plan

None - plan executed exactly as written.

Task 1 在前次会话已经完整实现并 commit（0f7bcae），所有 acceptance criteria 一次过：

- ✓ `registration: 'runtime'` 出现 2 次（注释 + 实际配置）
- ✓ `document.cloneNode(true)` 出现 2 次（D-14 注释 + 实际调用）
- ✓ `DOMPurify.sanitize` 出现 2 次（D-20 注释 + 实际调用）；位置严格在 `td.turndown(cleanHtml)` 之前
- ✓ `export function getDescription` 出现 1 次
- ✓ `export interface ExtractorPartial` 出现 1 次
- ✓ `pnpm build` exit 0，extractor.js 73.06 kB 存在
- ✓ `pnpm typecheck` exit 0
- ✓ 模块顶层无 `document.cloneNode` / `new Readability` 等副作用调用（awk 扫描非 import/export 行返回空）

## Issues Encountered

None.

本次执行的实质动作是"验证 + 文档化"：核对前次会话的 commit 0f7bcae 是否满足全部 must_haves 与 acceptance criteria（满足），运行 build/typecheck/test/lint（全绿，lint 4 warning 来自 02-01 的 `types/turndown-plugin-gfm.d.ts` `any`，与本 plan 无关），然后写 SUMMARY/更新 state。

## User Setup Required

None - 无外部服务配置需求。

## Next Phase Readiness

**Wave 3 (02-04 capture-pipeline) 输入就绪：**

- `chrome.scripting.executeScript({ target: { tabId }, files: ['content-scripts/extractor.js'] })` 注入路径打通；result 通过 structuredClone 通道回传（仅 string 字段）
- ExtractorPartial 与 02-02 的 ArticleSnapshotSchema 字段对齐：SW 只需追加 `url` + `create_at` 即可走 zod parse
- registration:'runtime' 不修改 manifest，无 web_accessible_resources（T-02-03-03 mitigation 落地）

**Wave 2 并行的 02-05（extractor 单元测试）输入就绪：**

- `getDescription` + `ExtractorPartial` 命名导出，可被 `tests/unit/extractor/*.spec.ts` 直接 import
- 注释中已声明 jsdom environment 要求（T-02-03-04），单元测试侧用 `// @vitest-environment jsdom` 即可触发

## Self-Check: PASSED

文件存在性：
- `entrypoints/extractor.content.ts` ✓ FOUND
- `.output/chrome-mv3/content-scripts/extractor.js` ✓ FOUND（73.06 kB）

Commit 存在性：
- `0f7bcae` ✓ FOUND（`git log --oneline | grep 0f7bcae`）

验证命令实际输出：
- `grep -c "registration: 'runtime'"` → 2
- `grep -c "document.cloneNode(true)"` → 2
- `grep -c "DOMPurify.sanitize"` → 2
- `grep -c "export function getDescription"` → 1
- `grep -c "export interface ExtractorPartial"` → 1
- `pnpm typecheck` → exit 0
- `pnpm build` → exit 0；extractor.js bundled
- `pnpm test` → 19/19 passed
- manifest `content_scripts: []` — runtime-only 确认

---
*Phase: 02-capture*
*Completed: 2026-04-30*
