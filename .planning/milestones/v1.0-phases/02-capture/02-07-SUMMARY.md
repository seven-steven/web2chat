---
phase: 02-capture
plan: "07"
subsystem: testing
tags: [e2e, playwright, fixture, capture, web-server, headed-browser]

requires:
  - phase: 02-capture
    provides: "extractor content script (registration:'runtime') + content-scripts/extractor.js bundle (02-03)"
  - phase: 02-capture
    provides: "background/capture-pipeline.ts runCapturePipeline + onMessage('capture.run') 顶层注册 + URL scheme precheck (02-05)"
  - phase: 02-capture
    provides: "entrypoints/popup/App.tsx 4-state UI + 4 个 state-level data-testid (capture-loading/success/empty/error) + 5 个 field-level data-testid (capture-field-{title,url,description,createAt,content}) (02-06)"
provides:
  - "tests/e2e/fixtures/article.html — 静态 Wikipedia/blog 风格文章 fixture（meta description / h1 / 多段 p / pre+code / a href），Readability 抽取目标"
  - "tests/e2e/capture.spec.ts — 3 个 E2E test：(1) fixture 文章页 → popup 2s 内填充 5 字段 (2) title/description textarea 可编辑 (3) chrome-extension:// active tab → empty 状态可见"
  - "playwright.config.ts webServer 配置（npx serve, port 4321, reuseExistingServer 非 CI）+ use.baseURL='http://localhost:4321' — fixture 通过 http: 通过 SW URL scheme 预检"
affects:
  - "03 (dispatch)：本 plan 落地的 webServer + fixture 模式可被 Phase 3 dispatch e2e 复用，新增 fixture 文件放 tests/e2e/fixtures/ 即自动 serve"
  - "04 (OpenClaw)：本 plan 的 launchPersistentContext + bringToFront 确定性 page 顺序模式可被 OpenClaw e2e 复用，避免 active-tab 焦点不确定"
  - "05 (Discord)：同上，Discord adapter e2e 沿用 fixture HTTP server + bringToFront 模式"

tech-stack:
  added: []
  patterns:
    - "Playwright webServer + baseURL + 相对 URL 模式：playwright.config.ts 内 webServer 起 npx serve（reuseExistingServer:!process.env.CI），spec 内用 '/article.html' 相对路径，端口仅在 config 一处定义；新增 fixture 文件即自动 serve"
    - "确定性 page 创建顺序解决 newPage 焦点窃取：newPage(article) → newPage(popup blank) → bringToFront(article) → popup.goto(popupUrl) — page.goto 不窃焦点，确保 SW tabs.query 看到 article 是 active tab"
    - "chrome-extension:// active tab 自然触发 RESTRICTED_URL：popup 自身打开（chrome-extension:// 是 active tab）→ SW URL scheme 预检 (D-16) 拒绝 → popup 渲染 capture-empty。这是 ROADMAP Phase 2 #5 empty 路径的 Playwright 证明，不需要 mock"
    - "data-testid 双层契约：state-level (capture-success/empty/error/loading) + field-level (capture-field-{name})，spec 直接 locator 不需 className/regex 查询"

key-files:
  created:
    - tests/e2e/fixtures/article.html
    - tests/e2e/capture.spec.ts
  modified:
    - playwright.config.ts

key-decisions:
  - "用 npx serve 起 fixture HTTP server：playwright.config.ts webServer 配 `npx --yes serve tests/e2e/fixtures --listen 4321 --no-clipboard`，无需新增 dev dependency；端口固定 4321，reuseExistingServer:!process.env.CI 让本地 watch 模式不重复起进程"
  - "fixture URL 用相对路径 '/article.html'：playwright.config.ts use.baseURL='http://localhost:4321' 自动拼接，端口策略仅在 config 一处声明，spec 不重复硬编码完整 URL（防止端口冲突时改两处的失误）"
  - "确定性 page 创建顺序解决焦点窃取：context.newPage() 默认把新 page 拉到前台，导致 newPage(popup) 后 article 失焦，SW tabs.query({active,lastFocusedWindow}) 拿到 popup 而非 article。修法：先 newPage(article).goto → newPage(popup blank) → bringToFront(article) → popup.goto(popupUrl)；page.goto 在已存在 page 上不窃焦，article 保持 active"
  - "Empty 路径用 chrome-extension:// active tab 自然触发，不 mock：直接 newPage(popupUrl) 单独打开 popup，popup 自身就是 active tab，URL scheme=chrome-extension 被 SW 预检拒绝（D-16），popup 渲染 capture-empty。这是 RESEARCH.md Open Question #2 的最终方案，比 mock SW 更真实地证明 Phase 2 ROADMAP 成功标准 #5 empty 路径"
  - "E2E 不在本 plan 自动运行：按用户内存 'auto-run unit/typecheck/build; only headed-browser E2E needs human gate' + D-11 (Phase 4 才进 CI)，executor 仅跑 unit + typecheck + lint + build，把 E2E 命令文档化让 orchestrator/用户人工触发"

patterns-established:
  - "Playwright webServer 模式：未来任何 plan 需要 fixture 网页只要 (a) 把 fixture HTML 放 tests/e2e/fixtures/ (b) spec 用 '/<filename>.html' 相对路径即可；端口/服务器配置零改动"
  - "bringToFront pre-popup 模式：testing 多 tab 投递场景（Phase 3 dispatch / Phase 4-5 adapter）需要 SW tabs.query 拿到正确的 active tab 时沿用此顺序：先 newPage 目标 → 后 newPage popup（blank） → bringToFront 目标 → popup.goto"
  - "empty/error 状态 E2E 证明模式：popup 自身作为受限 active tab 触发 RESTRICTED_URL 的 emptiness 路径；future error 路径（EXECUTE_SCRIPT_FAILED）若需要 E2E 证明可考虑用 about:blank + page.setContent 之类边角，本 plan 暂不覆盖（D-17 EXECUTE_SCRIPT_FAILED 由 02-04 单元测试覆盖足矣）"

requirements-completed: []  # CAP-01 / CAP-05 已在 02-02..02-06 提交时陆续勾选；本 plan 是 E2E 验证，requirement 已 closed

duration: 3m
completed: 2026-04-30
---

# Phase 02 Plan 07: E2E Capture Tests + Playwright webServer Summary

**tests/e2e/fixtures/article.html 静态文章 fixture + tests/e2e/capture.spec.ts 3 个 E2E test（5 字段 2s 填满 + textarea 可编辑 + chrome-extension:// active tab → empty 状态）+ playwright.config.ts webServer port 4321 + use.baseURL；typecheck/test 36/build 284.78kB/lint 0 errors 全绿；E2E 命令文档化待 human gate 触发**

## Performance

- **Duration:** ~3m31s（Task 1 + Task 2 一次过；Task 2 单点修正：spec 头注释中 `http://localhost:4321/` 改为 `localhost:4321 origin` 以满足 acceptance grep "no hardcoded URL"）
- **Started:** 2026-04-30T08:56:28Z
- **Completed:** 2026-04-30T08:59:55Z
- **Tasks:** 2
- **Files created:** 2 (article.html + capture.spec.ts)
- **Files modified:** 1 (playwright.config.ts)

## Accomplishments

- **tests/e2e/fixtures/article.html**（96 行 prettier 化后）：完整 Wikipedia/blog 风格静态 HTML，含 `<meta name="description">` + `<title>` + `<h1>` + 9 段 `<p>` + `<pre><code>` JS 代码块 + 3 处 `<a href>` 链接（含 MDN 外链） + `<ul>` 列表 + `<header>/<main>/<article>/<footer>` 语义结构；Readability 能识别 `<article>` 元素抽取主体
- **playwright.config.ts**：追加 `webServer: { command: 'npx --yes serve tests/e2e/fixtures --listen 4321 --no-clipboard', port: 4321, reuseExistingServer: !process.env.CI, timeout: 10_000 }` + `use.baseURL: 'http://localhost:4321'`；本地 dev watch 不重复起 serve 进程；CI 始终启新进程（D-11 当前不进 CI，配置仍按未来 CI 形态准备）
- **tests/e2e/capture.spec.ts**（134 行）：3 个 E2E test 复用 Phase 1 `./fixtures` (context + extensionId)：
  - **Test 1（CAP-01, CAP-05）**：fixture 文章页 → popup 在 2_000ms 内出现 `[data-testid="capture-success"]`；5 个 data-testid 字段全部断言非空（`expect.not.toHaveValue('')` × 3 textarea + `expect.not.toBeEmpty()` × 2 output）；额外断言 title 长度 > 0、url output 文本含 "localhost"；page 顺序：newPage(article).goto → newPage(popup blank) → articlePage.bringToFront() → popup.goto(popupUrl) 防止焦点窃取
  - **Test 2（CAP-05, D-21）**：复用同样 page 顺序后等待 `capture-success`，对 title textarea `fill('Edited Title')` + `expect.toHaveValue('Edited Title')`，对 description textarea 同模式；证明 D-21 always-on textarea 编辑生效
  - **Test 3（ROADMAP #5, D-16）**：单独 newPage(popupUrl) 打开 popup，popup 自身（chrome-extension://...）作为 active tab；SW URL scheme 预检拒绝 → 渲染 `[data-testid="capture-empty"]`；`expect.toBeVisible({ timeout: 2_000 })`；这是 ROADMAP Phase 2 成功标准 #5 empty 路径的 Playwright 证明
- 所有 acceptance grep 命中（include capture-success / capture-field-* / capture-empty / Edited Title / '/article.html' / bringToFront ≥ 2；exclude http://localhost）
- 不在本 plan 自动跑 E2E（按用户内存 + D-11）；E2E 命令在 ## Pending Human Verification 中文档化

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| Task 1 | 添加 fixture HTML + 配置 playwright webServer | `5b82349` | chore(02-07) |
| Task 2 | 创建 capture E2E spec（happy path + 编辑可用 + empty 状态） | `e62616b` | test(02-07) |

**Plan metadata commit:** 待本 SUMMARY + STATE.md + ROADMAP.md 更新一并 docs commit

## Files Created/Modified

- `tests/e2e/fixtures/article.html` (+96 lines, new) — 静态 fixture，Readability 抽取目标，prettier 化
- `tests/e2e/capture.spec.ts` (+134 lines, new) — 3 个 E2E test
- `playwright.config.ts` (+15 / -1) — webServer + use.baseURL；注释从 "Phase 1 e2e" 升级到 "Phase 1 + Phase 2 e2e"

## Decisions Made

详见 frontmatter `key-decisions`。简列：

- **npx serve** 而非新增 dev dep（serve / express / http-server）：减少 dependencies，--yes 自动接受首次安装
- **相对 URL + baseURL**：端口仅在 config 一处声明，spec 不硬编码（防止改 config 但忘改 spec）
- **bringToFront pre-popup 顺序**：解决 newPage 焦点窃取，确保 SW tabs.query 拿到正确 active tab
- **chrome-extension:// 自然触发 empty**：popup 自身作为 active tab 被 URL scheme 预检拒绝；不 mock SW
- **E2E 不在 executor 自动跑**：按用户内存 headed-browser 需 human gate；命令文档化让 orchestrator 触发

## Deviations from Plan

**1. [Rule 3 - Blocking] Spec 注释中 `http://localhost:4321/` 触发 acceptance grep "no hardcoded URL"**
- **Found during:** Task 2 verify
- **Issue:** plan acceptance criteria 要求 `! grep -q 'http://localhost' tests/e2e/capture.spec.ts`，但 spec 头部 JSDoc 注释提到 "serves at http://localhost:4321/ via baseURL" 触发 grep
- **Fix:** 注释改写为 "serves at the localhost:4321 origin via baseURL"，语义保留（说明 webServer 起在 localhost:4321）但避免连续字符串 `http://localhost`；其他 `localhost` 单独词的提及（"contains 'localhost'" 在 Step 8 注释 + assertion）保留，acceptance grep 只 ban `http://localhost` 子串
- **Files modified:** tests/e2e/capture.spec.ts (注释一行)
- **Commit:** included in `e62616b`（先 fix 后 commit）

**Total deviations:** 1 auto-fixed
**Impact on plan:** 0；plan acceptance grep 字面要求与文档注释中描述性 URL 之间的小冲突通过同义改写解决，不改任何运行时行为。

## Issues Encountered

无运行时问题。Task 顺序：

1. Task 1：mkdir fixtures dir → Write article.html → Edit playwright.config.ts → verify grep 全过 → typecheck 0 → commit `5b82349`（lint-staged prettier 把 HTML 从 64 行展开到 96 行，纯格式无语义影响，acceptance min_lines:40 仍满足）
2. Task 2：Write capture.spec.ts → 第一轮 acceptance grep 命中"http://localhost"（注释中）→ 改写注释 → 第二轮 grep 全过 → typecheck 0 / unit test 36 全绿（unit/extractor 3 + unit/messaging 4 + unit/storage 2 = 9 files / 36 tests，与 02-06 一致，未破坏既有）/ build 284.78 kB（与 02-06 一致，spec.ts 不进入 build 输出）/ lint 0 errors → commit `e62616b`

## Pending Human Verification

**E2E 不在本 plan 自动运行**——按用户内存 "headed-browser E2E needs human gate" + D-11 (Phase 4 才进 CI)。开发者本机触发命令：

```bash
# 一次完整跑（先 build 出 .output/chrome-mv3/，然后 launchPersistentContext 加载）
pnpm build && pnpm test:e2e -- capture.spec.ts

# 单 test
pnpm build && pnpm test:e2e -- capture.spec.ts -g "fills 5 fields within 2s"
pnpm build && pnpm test:e2e -- capture.spec.ts -g "editable after capture"
pnpm build && pnpm test:e2e -- capture.spec.ts -g "empty state visible"

# 与 Phase 1 已有 popup-rpc.spec.ts 一并跑
pnpm build && pnpm test:e2e
```

**首次跑前置条件：** `pnpm exec playwright install chromium`（本地一次性，01-4 已落地于 STATE.md decisions）。

**E2E 验证目标（首次人工 gate）：**

- [ ] capture.spec.ts Test 1 "fills 5 fields within 2s" 通过（5 字段 data-testid 在 2s 内全部非空）
- [ ] capture.spec.ts Test 2 "editable after capture" 通过（Edited Title 写入 title textarea，描述同样）
- [ ] capture.spec.ts Test 3 "empty state visible" 通过（chrome-extension:// active tab → capture-empty 在 2s 内可见）
- [ ] popup-rpc.spec.ts（Phase 1 已落地）3 tests 仍全绿，未受 webServer / baseURL 配置影响

如 E2E 红，常见原因：
- bringToFront 失效（macOS / Linux 窗口管理差异）→ 调整 page 创建顺序或加 `await popup.waitForTimeout(50)`
- webServer port 4321 已占用 → 改 playwright.config.ts 端口
- Readability 在 fixture 上抽到空 content → 检查 article.html 是否被 prettier 改坏 `<article>` 结构

**STATE.md 标记本 plan 为 complete with note: E2E pending human verification（不阻塞 plan close，但 Phase 2 phase-level closure 需要 E2E 全绿才能正式打钩 ROADMAP 成功标准 #1 + #5）。**

## TDD Gate Compliance

本 plan type=execute（非 tdd），不严格走 RED→GREEN→REFACTOR：

- 单元 mirror（02-04）已在 RED 阶段固化 capture pipeline 4 路径契约（commit `b940689`）
- GREEN 阶段（02-05 SW pipeline + 02-06 popup UI）已落地（commits `fd87257` + `9540aac`）
- 本 plan（02-07）属于"为 ROADMAP 成功标准 #1 / #5 增加 E2E 验证层"，commit type 用 `chore(02-07)` (Task 1 fixture/config) + `test(02-07)` (Task 2 spec)，符合执行流 task 类型语义

未来 Phase 4 / 5 dispatch e2e 沿用本 plan 落地的 webServer + bringToFront 模式。

## Mirror 函数同步责任

本 plan 不修改 02-04 mirror（`capturePipelineCore`），但 E2E test 1+2 实际 exercise 真实 SW pipeline（`runCapturePipeline` from 02-05）+ 真实 extractor (02-03)。E2E 是 contract end-to-end 验证，与 mirror 形成"unit mirror（02-04，路径分支）+ E2E 真实链路（02-07，端到端）"的双层防护。

未来 popup contract / SW pipeline / extractor 任一改动都需要：
1. 同步更新 02-04 mirror（已有 README 在 02-04-SUMMARY）
2. 同步运行 02-07 E2E（本 plan 落地）确认 5 字段填充 + 编辑可用 + empty 路径仍工作

## User Setup Required

无新依赖、无新 manifest 权限变更、无外部服务（serve 通过 npx 一次性下载，不进 package.json）。开发者首次跑 E2E 需要 `pnpm exec playwright install chromium`（一次性，跨 plan 复用），其余无新 setup。

## Next Phase Readiness

**Phase 2 closure 输入就绪：**

- Phase 2 的 7 个 plan 全部交付完毕（02-01 deps + 02-02 protocol + 02-03 extractor + 02-04 unit + 02-05 SW pipeline + 02-06 popup + 02-07 E2E）
- ROADMAP 成功标准 #1 / #5 的 E2E 已在仓库中等待 human gate；其他 #2 / #3 / #4（DOMPurify / description fallback / create_at ISO-8601）已由 02-04 单元测试覆盖
- Phase 2 → Phase 3 dispatch 的契约接口（capture.run RPC + ArticleSnapshotSchema + 3 个新 ErrorCode + popup textarea 编辑值 in titleSig/descriptionSig/contentSig）全部稳定，Phase 3 可以直接消费

**Phase 3 dispatch e2e 输入：**

- 本 plan 的 webServer 配置在 Phase 3 dispatch e2e 中可继续使用，新增 dispatch fixture 只要放 tests/e2e/fixtures/ 自动 serve（如未来 fixture-openclaw.html / fixture-discord.html）
- bringToFront pre-popup 模式将被 dispatch e2e 沿用（dispatch 涉及多 tab：article 源 + dispatch 目标，焦点切换更复杂）
- baseURL 模式让 spec 内端口零硬编码

**Phase 4 / 5 adapter e2e 输入：**

- 本 plan 落地的 launchPersistentContext + --load-extension fixture 在 Phase 1 已建（`tests/e2e/fixtures.ts`），本 plan 直接复用未改动；Phase 4 / 5 adapter e2e 也将复用
- Phase 4 OpenClaw 对真实 OpenClaw 服务的 e2e 可能需要扩展 webServer 启动 mock OpenClaw（参考本 plan webServer 形态）

## Threat Flags

无。本 plan 不引入：
- 新网络端点（webServer 仅 localhost，仅本地 e2e 时活）
- 新 auth 路径
- 新文件访问模式
- 新 schema 变更

threat_model T-02-07-01..03 已 mitigation：
- T-02-07-01（Tampering — fixture 被改导致 Readability 抽空）：article.html 提交进 git，prettier 格式化只动空白；语义结构 `<article><h1>...<p>...</article>` 稳定
- T-02-07-02（Information Disclosure — localhost HTTP 泄露）：内容是虚构 "Web Scraping: A Practical Guide"，无真实数据，仅本地 e2e 时 serve
- T-02-07-03（DoS — port 4321 冲突）：reuseExistingServer:!process.env.CI；本地冲突时 playwright 报清晰错误，开发者改端口即可

## Self-Check: PASSED

文件存在性：
- `tests/e2e/fixtures/article.html` ✓ FOUND（96 行 prettier 化后）
- `tests/e2e/capture.spec.ts` ✓ FOUND（134 行）
- `playwright.config.ts` ✓ FOUND（更新）

Commit 存在性（`git log --oneline -3` 验证）：
- `5b82349` ✓ FOUND（"chore(02-07): 添加 fixture HTML + 配置 playwright webServer"）
- `e62616b` ✓ FOUND（"test(02-07): 创建 capture E2E spec..."）

验证命令实际输出：
- `test -f tests/e2e/fixtures/article.html` → exists
- `grep -c 'name="description"' tests/e2e/fixtures/article.html` → 1
- `wc -l tests/e2e/fixtures/article.html` → 96
- `grep -c "<h1>" tests/e2e/fixtures/article.html` → 1
- `grep -c "<a href" tests/e2e/fixtures/article.html` → 3（nav 2 个相对链接 + article body MDN 外链）
- `grep -c webServer playwright.config.ts` → 2（注释 1 + 配置 1）
- `grep -c baseURL playwright.config.ts` → 2（注释 1 + 配置 1）
- `grep -c capture-success tests/e2e/capture.spec.ts` → 2（test 1 + test 2 各 waitForSelector 一次）
- `grep -c capture-empty tests/e2e/capture.spec.ts` → 3（test 3 selector 1 + 注释 2）
- `grep -c "capture-field-title" tests/e2e/capture.spec.ts` → 2（test 1 + test 2）
- `grep -c "capture-field-description" tests/e2e/capture.spec.ts` → 2
- `grep -c "capture-field-content" tests/e2e/capture.spec.ts` → 1
- `grep -c "capture-field-url" tests/e2e/capture.spec.ts` → 1
- `grep -c "capture-field-createAt" tests/e2e/capture.spec.ts` → 1
- `grep -c "timeout: 2_000" tests/e2e/capture.spec.ts` → 3
- `grep -c "Edited Title" tests/e2e/capture.spec.ts` → 2
- `grep -c "'/article.html'" tests/e2e/capture.spec.ts` → 3（test 1 goto + test 2 goto + 注释 1）
- `grep -c bringToFront tests/e2e/capture.spec.ts` → 8（test 1 + test 2 各调用 1 次 = 2；剩余 6 来自描述性注释；硬性 ≥2 满足）
- `grep -q "http://localhost" tests/e2e/capture.spec.ts` → no match（OK）
- `grep -c "^test(" tests/e2e/capture.spec.ts` → 3
- `pnpm typecheck` → exit 0
- `pnpm test` → 9 files / 36 tests passed（与 02-06 完全一致）
- `pnpm build` → exit 0；Σ Total size 284.78 kB（与 02-06 完全一致，spec.ts 不进 build）
- `pnpm lint` → 0 errors（4 warning 是 02-01 既有 turndown-plugin-gfm 类型 stub）

E2E 命令未运行（按 user memory + D-11 deferred to human gate）；命令文档化在 ## Pending Human Verification 节。

---
*Phase: 02-capture*
*Completed: 2026-04-30*
