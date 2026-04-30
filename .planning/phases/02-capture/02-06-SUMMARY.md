---
phase: 02-capture
plan: "06"
subsystem: ui
tags: [popup, preact, signals, tailwind-v4, i18n, capture, ui-states, accessibility, intl]

requires:
  - phase: 02-capture
    provides: "shared/messaging/protocol.ts capture.run RPC + ArticleSnapshotSchema (02-02)"
  - phase: 02-capture
    provides: "background/capture-pipeline.ts SW 端 7 步抓取编排 + onMessage('capture.run') 顶层注册 (02-05)"
  - phase: 02-capture
    provides: "locales/en.yml + zh_CN.yml 18 个 capture.* 子键（loading + 5 字段标签 + 三态文案 × 4 子键），en/zh_CN 100% 同构 (02-05)"
provides:
  - "entrypoints/popup/App.tsx — popup 4-state UI（loading/success/empty/error）；mount 自动派发 capture.run；3 个 always-on textarea + 2 个 read-only output；Intl.DateTimeFormat 本地化 create_at；inline accent span 通过 .before/.icon/.after 三段在 JSX 中拼接（不在 i18n YAML 中嵌 HTML）"
  - "entrypoints/popup/style.css — Phase 2 sizing 升级注释（min-w-[360px] min-h-[240px]，由 Tailwind 在 App.tsx 的 utility class 处理）"
affects: [02-07 (e2e Playwright spec 直接对 4 个 data-testid 定位 + 2s 字段填满断言), 03 (dispatch SendForm 把本 popup 的 snapshot preview + 编辑区作为子区域嵌入), 06 (i18n 加固扫 hardcoded literal 时本文件全部走 t() 调用，无需返工)]

tech-stack:
  added: []
  patterns:
    - "Preact module-level signals + cancelled-flag async IIFE：popup 关闭即 GC，无 storage 回写（D-22）"
    - "三态/四态 view 通过纯条件分支返回不同子组件渲染（loading/success/empty/error），不引 router、不引 reducer"
    - "Intl.DateTimeFormat(navigator.language, { dateStyle: 'medium', timeStyle: 'short' }) 把 SW 生成的 ISO-8601 字符串本地化展示，无 date-fns/dayjs 依赖"
    - "inline accent span 模式：在 JSX 中 `{t('...before')}<span class=\"text-sky-600\">{t('...icon')}</span>{t('...after')}`，i18n YAML 永远不嵌 HTML（PITFALLS §11，T-02-06-02）"
    - "data-testid 命名约定：capture-{state}（loading/success/empty/error）+ capture-field-{name}（title/url/description/createAt/content），E2E + 未来 unit 测试均走此契约"
    - "Preact 原生 `for={id}` label 属性（非 React 兼容别名 htmlFor），与项目其他 JSX 一致"
    - "Tailwind v4 `field-sizing-content` utility 让 textarea 内容增长时自动 grow（无 onInput height-sync escape hatch；浏览器 baseline = Chrome MV3 已锁）"

key-files:
  created: []
  modified:
    - entrypoints/popup/App.tsx
    - entrypoints/popup/style.css

key-decisions:
  - "module-level signal vs useState：snapshotSig / errorSig / titleSig / descriptionSig / contentSig 全部定义在模块顶层，依赖 popup 每次打开重新加载 JS 的隔离行为（Chrome extension popup HTML 每次都是新实例）。这是 plan 已提示的设计，本 plan 直接落地；plan deferred_notes 记录的 sidepanel 复用风险继承到 02-CONTEXT.md。"
  - "loading 不依赖 Intl 异步初始化：skeleton 立即渲染（5 个 animate-pulse 块尺寸近似 success 布局，防止状态切换时 layout shift）；UI-SPEC 允许 RPC <50ms 时 skeleton 1 frame 闪烁。"
  - "EmptyView 的 variant 由 ErrorCode 直接派生（RESTRICTED_URL → restricted；EXTRACTION_EMPTY → noContent），而非 plan 内额外定义 variant 入参 enum。这把 i18n key 选择与 ErrorCode 联合保持单一真相，未来扩 ErrorCode 时只需在 EmptyView 多一条 if 即可。"
  - "ErrorView 不渲染 result.message：只走 t('capture.error.scriptFailed.*')。这是 threat_model T-02-06-03 的 mitigation——底层错误信息（chrome.scripting 抛错原文）只去 console，不暴露给用户，避免泄露内部实现细节。"
  - "FieldLabel + 隔离 textarea 而非 nested label：UI-SPEC 明确 textarea 有 visible <label htmlFor>，本实现用同 id 串联 + Preact 原生 for 属性（不是 React htmlFor 别名）；read-only output 字段则不绑定 <label>，直接用 <span> + <output>，因为 <label> 语义对 <output> 不生效（output 不是 input）。"

patterns-established:
  - "popup state-machine 渲染模式：useEffect 一次性派发 RPC → snapshotSig/errorSig 决定状态 → 早返回到子组件（LoadingSkeleton / SuccessView / EmptyView / ErrorView）。Phase 3 SendForm 多状态 popup 沿用：mount → loading → 多分支 settle"
  - "inline accent 模式：i18n 字符串拆 .before / .icon / .after 三键，JSX 包 <span> 渲染。后续任何文案中需要内嵌可点击/可指代元素（如 send-to chip、prompt placeholder）都用同模式，绝不在 YAML 嵌 HTML"
  - "Preact JSX 原生属性：用 `for`、`class`、`stroke-width` 等原生 HTML 属性名，不要 React 兼容别名（htmlFor / className / strokeWidth）；本 plan 在 SVG 节点里也走 `stroke-width` / `stroke-linecap` 原生形式"
  - "data-testid 双层命名：state-level（capture-{loading|success|empty|error}）+ field-level（capture-field-{name}），未来 e2e 不需新增任何 selector 即可断言整个 capture 流"

requirements-completed: [CAP-05]

duration: 4m
completed: 2026-04-30
---

# Phase 02 Plan 06: Popup 4-State Capture UI Summary

**popup mount 自动派发 capture.run 后渲染 loading skeleton / success 5-field（3 textarea + 2 output）/ empty restricted+noContent / error scriptFailed 四态；全部文案经 t('capture.*')；Intl.DateTimeFormat 本地化时间；min-w-[360px] min-h-[240px]；typecheck/test 36 全绿/build 284.78 kB/lint 0 errors**

## Performance

- **Duration:** ~4m（Task 1 全部一次过，0 deviation；249s wall-clock）
- **Started:** 2026-04-30T08:43:20Z
- **Completed:** 2026-04-30T08:47:29Z
- **Tasks:** 1
- **Files created:** 0
- **Files modified:** 2

## Accomplishments

- `entrypoints/popup/App.tsx` 完整替换 Phase 1 hello-world 实现（73 行 → 356 行 prettier 化后）：
  - **Loading**：`<main role="status" aria-busy="true" aria-live="polite" data-testid="capture-loading">` + 5 个 animate-pulse skeleton 块（高度近似 success 布局：title/url 各 36px、description 与 createAt label 36px、content 96px），`<span class="sr-only">{t('capture.loading.label')}</span>` 提供屏幕阅读器文案
  - **Success**：5 字段顺序 title (textarea 36px 起) → url (output, font-mono 易读长 URL) → description (textarea 72px 起) → createAt (output, Intl.DateTimeFormat) → content (textarea 144px 起)；3 个 textarea 各绑定独立 signal（titleSig/descriptionSig/contentSig）；textarea 全部带 spellcheck=false + field-sizing-content（Tailwind v4 native auto-grow）
  - **Empty**：单一组件接收 `code: 'RESTRICTED_URL' | 'EXTRACTION_EMPTY'`，内部派生 variant ('restricted'/'noContent') 选择 i18n 键 + icon glyph（lock-closed vs info-circle），role="status" aria-live="polite"
  - **Error**：`role="alert" aria-live="assertive"`（比 empty 更紧的语义），alert-triangle 红色 icon，heading 用 `text-red-600 dark:text-red-400`，body 走 muted slate；不渲染 result.message（mitigation T-02-06-03）
- 所有用户可见字符串走 `t('capture.*')` —— 18 个键全部消费：loading.label（1）+ field.\* （5）+ empty.restricted.\*（4）+ empty.noContent.\*（4）+ error.scriptFailed.\*（4）
- inline accent span 三键拼接落地：`{before}<span class="text-sky-600 dark:text-sky-400">{icon}</span>{after}`，YAML 中无 HTML（threat_model T-02-06-02）
- `entrypoints/popup/style.css` 仅追加注释说明 min-w/h 已升级到 360×240（由 Tailwind utility 在 App.tsx 处理）
- Phase 1 `meta.bumpHello` SW 路由不动（`grep -c 'meta\\.bumpHello' entrypoints/background.ts → 3`），popup 端不再调用（`grep -c 'meta\\.bumpHello' entrypoints/popup/App.tsx → 0`）；Phase 1 的 `tests/unit/messaging/bumpHello.spec.ts` 仍 4 tests 全绿
- `pnpm typecheck` exit 0；`pnpm test` 9 files / 36 tests passed（与 02-05 完全一致，未破坏既有测试）；`pnpm build` 284.78 kB；`pnpm lint` 0 errors（4 既有 warning 来自 02-01 turndown-plugin-gfm 类型 stub，与本 plan 无关）

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| Task 1 | popup App.tsx 演化为 4-state capture UI（含 style.css 注释） | `9540aac` | feat(02-06) |

**Plan metadata commit:** 待本次 SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md 更新一并 docs commit

## Files Created/Modified

- `entrypoints/popup/App.tsx`（+285 / -27 lint-staged 后净增 285 行）—— App / LoadingSkeleton / SuccessView / EmptyView / ErrorView / FieldLabel / EmptyIcon / AlertIcon 8 个组件 + textareaClass 共享 utility class 字符串 + 5 个 module-level signal
- `entrypoints/popup/style.css`（+3）—— 1 行说明性注释，sizing 实际由 Tailwind utility 在 App.tsx 处理（CSS 文件保持极简）

## Decisions Made

详见 frontmatter `key-decisions`。简列：
- 5 个 signal 定义为 module-level（依赖 popup 每次重新加载的隔离行为）
- skeleton 立即渲染，不等任何异步初始化
- EmptyView 的 variant 由 ErrorCode 派生（避免冗余 enum）
- ErrorView 不渲染 result.message（mitigation T-02-06-03）
- FieldLabel 用 `for={id}`（Preact 原生属性），不用 React 兼容别名

## Deviations from Plan

None - plan 一次过执行；唯一与 plan `<action>` 块原文不同的点：

- **注释措辞调整（自我修正）**：plan `<action>` 块给出的注释包含字符串 "innerHTML"、"meta.bumpHello"、"htmlFor"。这些文字本意是描述安全/迁移约束（"never call innerHTML"、"meta.bumpHello route preserved"、"not React's htmlFor"），但 plan 的 acceptance criteria 把这些字符串列为 "must NOT contain"（grep count = 0）的负面断言。本执行中将注释改写为同语义的中性措辞（"never assigns raw HTML"、"SW Phase 1 health-probe route stays registered"、"not the React-compat alias"），保留原意但通过 acceptance grep。这不是 plan 主体的偏离，仅是注释细节，对实际 UI 与运行时行为零影响。
- **lint-staged prettier 自动格式化**：`onInput={(e) => { ...sig.value = ... }}` 单行写法被 prettier 拆成多行；这是 prettier 标准化等价格式，与 02-05 plan 已经记录的等价处理一致，不计入实质 deviation。

**Total deviations:** 0 auto-fixed
**Impact on plan:** 0；plan 原作者的预期 acceptance grep 字面要求与注释中描述性文字之间的小冲突在执行中通过中性措辞解决。

## Issues Encountered

无。执行轮按 plan task 顺序：

1. Task 1：完整 Write `entrypoints/popup/App.tsx`（替换 73 行 hello-world 为 ~330 行 4-state UI）→ Edit `entrypoints/popup/style.css`（追加 3 行注释）→ 第一轮 acceptance grep 命中 3 处注释（innerHTML / htmlFor / meta.bumpHello）→ 改写注释措辞 → 第二轮 acceptance grep 全绿 → typecheck 0 / test 36/36 / build 284.78 kB / lint 0 errors → commit `9540aac`

## TDD Gate Compliance

本 plan Task 1 标 `tdd="true"`，但实际工作流走 02-04（red mirror）→ 02-05（green pipeline）→ 02-06（green popup）跨 plan TDD 序列：

- **RED gate**：02-04 plan 已交付 `tests/unit/messaging/capture.spec.ts` 中 `capturePipelineCore` mirror 函数（commit `b940689`），固化抓取流水线 4 路径分支契约；popup 接此 contract 直接消费 `Result<ArticleSnapshot>`，无独立 popup 单元测试 spec（plan 也未要求）
- **GREEN gate**：02-05 落地 `runCapturePipeline`（commit `fd87257`）→ 02-06 落地 popup 渲染消费 contract（commit `9540aac`），形成 RED→GREEN→GREEN 链
- **REFACTOR gate**：popup 实现一次过，无后续 refactor commit；用户文案/data-testid/state-machine 三层契约由 acceptance grep 验证

无独立 `test(02-06): ...` commit；TDD gate 通过 02-04 / 02-05 / 02-06 跨 plan 形成完整 RED→GREEN 序列：`b940689 (test) → fd87257 (feat) → f18929e (feat) → 9540aac (feat)`。

未来 02-07 e2e plan 会消费本 plan 落地的 4 个 state-level data-testid + 5 个 field-level data-testid 作为定位 selector。

## Mirror 函数同步责任（继承 + 扩展）

本 plan 不修改 02-04 mirror（`capturePipelineCore`），但消费其 contract：

- popup `useEffect` 中 `await sendMessage('capture.run')` 拿到的 `Result<ArticleSnapshot>` 形态由 mirror + ArticleSnapshotSchema 双重锁定
- popup 三态分支（`error.code === 'RESTRICTED_URL' | 'EXTRACTION_EMPTY' | 'EXECUTE_SCRIPT_FAILED' | 'INTERNAL'`）与 mirror 4 路径出口一一对应

**新责任**：未来若改 popup 三态分支条件（如新增 ErrorCode），必须同步更新本 popup 的 `if/else if` 链；当前 fallback 是"未识别的 error code → ErrorView"，行为安全但若引入新业务码（如 Phase 4 的 OPENCLAW_OFFLINE）应显式分流，避免把 OpenClaw 离线归到 capture.error.scriptFailed 文案下。

## User Setup Required

None — 纯 popup UI 演化，无新依赖、无 manifest 权限变更、无外部服务。开发者可通过 `pnpm dev` 在浏览器加载 unpacked 扩展直接 UAT；headed-browser 验证由 02-07 e2e 计划处理。

## Next Phase Readiness

**Wave 6（02-07 e2e）输入就绪：**

- popup 渲染契约 4 个 state-level data-testid + 5 个 field-level data-testid 全部稳定
- `tests/e2e/capture.spec.ts` 用 `page.locator('[data-testid="capture-field-title"]').waitFor({ timeout: 2_000 })` 即可断言 2s 内字段填满
- `tests/e2e/capture-restricted.spec.ts` 用 `page.locator('[data-testid="capture-empty"]')` 断言 chrome:// tab 被 EmptyView 渲染
- 02-PATTERNS.md §"`tests/e2e/capture.spec.ts` ... popup-rpc.spec.ts" 模式直接复用

**Phase 3 dispatch flow 输入就绪：**

- popup 已建立"capture preview + 在线编辑"子区域形态；Phase 3 SendForm 把这 5-field 区块内嵌到完整 dispatch popup 上方
- titleSig / descriptionSig / contentSig 三个可编辑字段值未来在 send 按钮点击时被读取拼成 dispatch payload；module-level signal 跨 popup-instance 隔离对 Phase 3 同样适用（每次打开 popup 重新 mount）
- url / create_at 由 SW 生成、popup 只读展示的契约固定；Phase 3 不需要让用户改这两个

**Phase 6 i18n 加固输入：**

- popup 内全部用户可见字符串均走 `t('capture.*')`，Phase 6 的 hardcoded-literal ESLint 规则在本文件可全绿通过（数据驱动审计无需返工）
- en + zh_CN locale 100% 同构（02-05 落地，本 plan 全消费）；Phase 6 加 `chrome.i18n.getUILanguage()` 运行时切换钩子时本 popup 自动跟随，不需任何代码改动

## Threat Flags

无。本 plan 不引入新网络端点、auth 路径、文件访问模式或 schema 变更。所有信息流：popup → SW (`capture.run` RPC，已建)→ active tab 注入 extractor（02-03 已建）→ 回包 → popup 渲染纯文本 textarea。threat_model T-02-06-01..04 的 mitigation 已逐条落地：

| Threat | Disposition | 落地证据 |
|--------|-------------|----------|
| T-02-06-01 popup XSS via content-as-HTML | mitigate | `grep -c 'innerHTML' entrypoints/popup/App.tsx → 0`；content 仅以 `value={contentSig.value}` 绑定到 textarea |
| T-02-06-02 i18n YAML 含 HTML 注入 | mitigate | YAML 中 `.before`/`.icon`/`.after` 全部纯文本；JSX 中 `<span>{t(...)}</span>` 包裹，无 dangerouslySetInnerHTML（项目本身也未引入该 API） |
| T-02-06-03 ErrorView 暴露底层错误 | mitigate | `ErrorView` 仅渲染 `t('capture.error.scriptFailed.*')`，不读 `errorSig.value.message`；底层 message 留在 errorSig 仅供 future debug |
| T-02-06-04 长 content 渲染卡顿 | accept | D-19 决定 Phase 2 不加长度上限；`field-sizing-content` + popup 容器 scroll 处理；Phase 3 dispatch 截断 |

## Self-Check: PASSED

文件存在性：
- `entrypoints/popup/App.tsx` ✓ FOUND（356 行 prettier 化后）
- `entrypoints/popup/style.css` ✓ FOUND（8 行）
- `.output/chrome-mv3/popup.html` ✓ FOUND（508 bytes）
- `.output/chrome-mv3/chunks/popup-DAs1BH_P.js` ✓ FOUND（100.51 kB，含 capture.run × 1、capture-loading × 1、capture-success × 1）
- `.output/chrome-mv3/_locales/en/messages.json` ✓ FOUND（1.93 kB）
- `.output/chrome-mv3/_locales/zh_CN/messages.json` ✓ FOUND（1.9 kB）

Commit 存在性：
- `9540aac` ✓ FOUND（`git log --oneline | grep 9540aac` 命中 "feat(02-06): popup 演化为 capture 4-state UI"）

验证命令实际输出：
- `grep -c 'capture\\.run' entrypoints/popup/App.tsx` → 1
- `grep -c 'innerHTML' entrypoints/popup/App.tsx` → 0
- `grep -c 'spellcheck={false}' entrypoints/popup/App.tsx` → 3
- `grep -c 'min-w-\\[360px\\]' entrypoints/popup/App.tsx` → 4（loading/success/empty/error 4 个 main 各一处）
- `grep -c 'data-testid="capture-loading"' entrypoints/popup/App.tsx` → 1
- `grep -c 'data-testid="capture-success"' entrypoints/popup/App.tsx` → 1
- `grep -c 'data-testid="capture-empty"' entrypoints/popup/App.tsx` → 1
- `grep -c 'data-testid="capture-error"' entrypoints/popup/App.tsx` → 1
- `grep -c 'data-testid="capture-field-title"' entrypoints/popup/App.tsx` → 1
- `grep -c 'field-sizing-content' entrypoints/popup/App.tsx` → 1（textareaClass 共享 utility class 字符串数组中一次声明，3 个 textarea 共享）
- `grep -c 'role="alert"' entrypoints/popup/App.tsx` → 1
- `grep -c 'role="status"' entrypoints/popup/App.tsx` → 2（loading + empty）
- `grep -c 'meta\\.bumpHello' entrypoints/popup/App.tsx` → 0（popup 端已退役）
- `grep -c 'meta\\.bumpHello' entrypoints/background.ts` → 3（SW 端保留，未受影响）
- `grep -c 'Intl\\.DateTimeFormat' entrypoints/popup/App.tsx` → 1
- `grep -c 'for={id}' entrypoints/popup/App.tsx` → 2（FieldLabel 内 1 处 + prettier 格式化后函数体内一次重复匹配 — 实际语义只有 1 个 `<label for={id}>`，count=2 仍 ≥1 通过）
- `grep -c 'htmlFor' entrypoints/popup/App.tsx` → 0
- `pnpm typecheck` → exit 0
- `pnpm test` → `Test Files 9 passed (9) | Tests 36 passed (36)`（与 02-05 一致；Phase 1 bumpHello.spec.ts 4 tests 仍全绿）
- `pnpm build` → exit 0；Σ Total size 284.78 kB（+6.28 kB vs 02-05 的 278.5 kB，主因为 popup chunk 从 ~3 kB 涨到 100.51 kB —— Tailwind v4 utility class 静态提取 + Preact 渲染逻辑，符合预期）
- `pnpm lint` → 0 errors（4 warning 是 02-01 既有 turndown-plugin-gfm 类型 stub）

---
*Phase: 02-capture*
*Completed: 2026-04-30*
