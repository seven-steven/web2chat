---
phase: 2
reviewers: [claude-sonnet-4-6]
reviewed_at: 2026-04-30T04:29:35Z
plans_reviewed:
  - 02-01-PLAN.md
  - 02-02-PLAN.md
  - 02-03-PLAN.md
  - 02-04-PLAN.md
  - 02-05-PLAN.md
  - 02-06-PLAN.md
  - 02-07-PLAN.md
notes: >
  OpenCode review attempted but failed with Unauthorized token error.
  Review performed by orchestrating Claude (claude-sonnet-4-6) with full plan context.
---

# Cross-AI Plan Review — Phase 2: Capture Pipeline

## Claude Review (claude-sonnet-4-6)

### Summary

Phase 2 的 7 个计划整体架构清晰、设计决策有据可查，是一个经过充分讨论的实施方案。Wave 序列设计合理，依赖链正确（Wave 1 库安装解锁 Wave 2 extractor，Wave 2 解锁 Wave 3 pipeline，以此类推）。关键安全约束（cloneNode(true)、DOMPurify 前置、ISOLATED world、URL scheme 预检）均已明确记录并落入 must_haves。最大风险点集中在两处：(1) Wave 2 的 02-04 单元测试 wave 标注与 ROADMAP 不一致（frontmatter 写 wave:3，ROADMAP 描述 Wave 2），可能导致并行执行歧义；(2) E2E 测试（02-07）对 bringToFront() 的依赖以及 webServer fixture 服务器的端口硬编码问题存在潜在的测试不稳定性。整体风险评级：**MEDIUM**（核心逻辑健壮，测试基础设施层有细节需要锁定）。

---

### Strengths

- **安全约束完整且有据可查**：DOMPurify 前置于 Turndown、cloneNode(true) 强制传入 Readability、ISOLATED world 明确配置、URL scheme 预检在 executeScript 之前——每一项都有 D-XX 决策编号可溯源，执行者无需猜测。
- **ErrorCode 设计精准**：RESTRICTED_URL(retriable=false) / EXTRACTION_EMPTY(retriable=false) / EXECUTE_SCRIPT_FAILED(retriable=true) 三者语义边界清晰，popup 三态渲染逻辑可以直接映射 ErrorCode，无需二次判断。
- **ExtractorPartial 在 capture-pipeline.ts 本地定义**（不 import 自 extractor.content.ts）：避免 bundler 将 content script 依赖树拉入 SW bundle，是一个正确的 MV3 架构决策。
- **mirror-function 测试模式**：capture.spec.ts 用注入依赖的 capturePipelineCore 镜像函数而非直接 import SW handler，避免了 WXT defineBackground 宏在测试环境的初始化问题，与 Phase 1 bumpHello.spec.ts 保持模式一致。
- **create_at 由 SW 生成**（CAP-04 明确要求）：在时序图的步骤 3 即确定时间戳，不依赖页面元数据，正确且可测试（frozen Date.now() mock）。
- **i18n 键拆分为 .before/.icon/.after**：避免在 YAML 中嵌入 HTML，inline accent span 在 JSX 层组合，符合 PITFALLS §11 的要求。
- **locale 100% 同构约束**：CI i18n coverage gate 在 Phase 1 已就位，Phase 2 新增 18 个 capture.* 键要求 en + zh_CN 完全同步，这一约束有机制保障而非仅靠 developer discipline。

---

### Concerns

**HIGH**

- **02-04 wave 标注冲突**：02-04-PLAN.md frontmatter 写 `wave: 3`，但 ROADMAP 将 02-03 和 02-04 描述为 "Wave 2 (并行)"，02-05 才是 Wave 3。如果执行器严格按照 frontmatter wave 字段排序，会把 02-04 推迟到 02-05 之后才执行，破坏 "测试先于 pipeline 实现" 的 TDD 意图。**必须在执行前统一：要么把 02-04 frontmatter 改为 `wave: 2`，要么把 depends_on 字段从 `["02-01","02-02","02-03"]` 改为仅 `["02-01","02-02"]`（与 02-03 并行）。**
- **ArticleSnapshotSchema.parse() 在 wrapHandler 内部可能吞掉 ZodError**：02-05 的流水线步骤 7 调用 `ArticleSnapshotSchema.parse(snapshot)`，如果字段不合法会抛出 ZodError。注释说 "wrapHandler 在 background.ts converts that to Err('INTERNAL')"，但 wrapHandler 的具体实现（Phase 1 代码）需要确认是否 catch 并转换了 ZodError，而非只 catch RuntimeError 或 Promise rejection。如果 wrapHandler 未覆盖同步 throw，步骤 7 会产生未捕获异常而非 Result.err。**建议：在 02-05 task 中明确验证 wrapHandler 能处理 ZodError，或改用 `ArticleSnapshotSchema.safeParse()` 返回 Result 而非 throw。**

**MEDIUM**

- **E2E bringToFront() 依赖顺序脆弱**：02-07 要求在打开 popup 前调用 `articlePage.bringToFront()` 以确保文章 tab 是 lastFocusedWindow 的活跃 tab。但 Playwright 的 `context.newPage()` 自动将新 page 置为前台，如果 popup page 在 bringToFront 后通过 `context.newPage()` 打开，又会夺回焦点。需要明确操作顺序：先 bringToFront(articlePage) → 再 popup.goto(popupUrl) 而非 newPage()，或使用现有 page.goto() 而非 context.newPage()。
- **webServer 端口未在计划中锁定**：02-07 计划提到在 playwright.config.ts 添加 webServer，但未指定固定端口。如果端口随机分配，capture.spec.ts 中的 fixture URL 需要从 webServer.url 动态读取，而非硬编码。如果计划中写死端口（如 4321），则测试间端口冲突风险低；建议在 02-07 计划中明确端口策略。
- **02-03 extractor：getDescription 查询原始 document 的注释与实际场景的潜在矛盾**：注释说 "getDescription uses the ORIGINAL document (not clone) because Readability.parse() may remove meta tags from the clone"。但实际上 Readability 的 DOM 突变主要影响 body，`<head>` 中的 `<meta>` 标签通常保留在 clone 中。这个假设虽然是安全侧（用原始 document 更可靠），但注释的理由不够精确，可能让未来维护者混淆是否可以改为查询 clone。建议将注释改为 "uses original document as a defensive measure"。
- **capture.spec.ts mirror 函数与真实实现的同步风险**：mirror 函数 `capturePipelineCore` 复刻了 `runCapturePipeline` 的分支逻辑。如果 Phase 3/4/5 修改了流水线（如增加步骤），mirror 函数需要同步更新，否则测试会通过但真实行为不一致。这是 mirror 模式的固有缺陷，属于 developer discipline 问题，在 PLAN 的 threat model 中已 accept，但值得在 SUMMARY 文档中留记以提醒后续 phase。
- **02-06 popup 信号为 module-level**：`snapshotSig`、`errorSig`、`titleSig` 等定义为模块级 signal，而非组件内部 state。在 Chrome extension popup 中，每次 popup 打开都是全新的 HTML 页面加载，模块级 signal 会被重新初始化，这实际上是正确的。但如果将来在非 popup 上下文（如 sidepanel）复用 App.tsx，模块级 signal 可能导致状态跨实例泄漏。当前 MVP 不受影响，但可以在 CONTEXT deferred 中记录。
- **02-02 i18n 缺失键**：CONTEXT.md 的 i18n 命名空间描述列出了 `capture.loading.label, capture.empty.noContent, capture.empty.restricted, capture.error.scriptFailed, capture.field.title`，但在 02-05 locale 实现中使用了 `.body.before/.icon/.after` 三段式拆分。02-02 计划本身不涉及 locale，但如果 02-06 执行器仅参考 02-02 的 protocol 定义而未读取 02-05 的 locale 规格，可能漏掉三段式键的命名约定。建议在 02-06 的 read_first 中明确列出 `02-05-PLAN.md` 的 locale 键规范。

**LOW**

- **describe(article) fallback：Readability 返回 null 时的 title fallback**：当 `article` 为 null 时，`title = article?.title?.trim() || document.title.trim()` 正确回退到 `document.title`。但如果 `document.title` 也为空字符串（某些 SPA 的特殊情况），最终 `title = ""`，后续步骤 6 只检查 `!partial.content && !partial.title`，空 title + 空 content 才触发 EXTRACTION_EMPTY。如果 content 不为空但 title 为空，会返回 Ok(snapshot)，这符合 D-17 的设计意图，但 popup 显示空 title 的 textarea 体验可能让用户困惑。当前 MVP 范围内可接受，建议在 empty/fallback 行为说明中记录此边界情况。
- **02-07 article.html min_lines: 40**：40 行 HTML fixture 能够提供足够结构化内容触发 Readability 正确解析，但 Readability 有最小内容阈值（article 通常需要 500+ 字符正文）。计划中的示例 HTML 覆盖多个段落和代码块，看起来足够，但建议在执行时验证 Readability 确实能从该 fixture 返回非空 content（而不是 null）。
- **02-03 turndown-plugin-gfm 无类型声明**：计划中提到 "turndown-plugin-gfm 没有 @types 包，安装后直接写类型声明"，但 02-03 任务描述中未提供具体类型声明内容（如 `declare module 'turndown-plugin-gfm' { export function gfm(turndown: any): void; }`）。如果执行器跳过此步骤，TypeScript 编译会报 `Cannot find module` 错误。建议在 02-01 或 02-03 中明确类型声明的位置（如 `types/turndown-plugin-gfm.d.ts`）和内容。

---

### Plan-Specific Issues

**02-01 (Install Dependencies)**
- 无重大问题。精确版本号（readability@0.6.0, dompurify@3.4.1, turndown@7.2.4）已锁定，pnpm lockfile 约束有效。
- 微小遗漏：未明确 `turndown-plugin-gfm` 类型声明文件的创建（见 LOW 关注项）。

**02-02 (Messaging Protocol)**
- `z.string().url()` 对 `url` 字段严格校验：需确认 `chrome.tabs.query` 返回的 `tab.url` 是否总能通过 zod url() 验证。在受限页面预检通过后（URL scheme 为 http/https），tab.url 应该是合法 URL，但 zod 的 `z.string().url()` 使用 URL constructor，与 WHATWG URL 规范一致，实践中 http/https URL 应全部通过。低风险但值得在 02-02 的 verify step 中加一条断言。
- `create_at: z.string().datetime()` 默认接受带时区的 ISO-8601（包括 `Z` 和 `+HH:MM` offset）。`new Date().toISOString()` 返回 `Z` 结尾格式，两者兼容。无问题。

**02-03 (Extractor Content Script)**
- `defineContentScript` 在单元测试环境（jsdom）中是 WXT 全局宏，不可用。02-04 的 sanitize.spec.ts 和 markdown-roundtrip.spec.ts 正确地避免了直接 import extractor.content.ts，而是内联库调用。但 description-fallback.spec.ts 直接 `import { getDescription } from '@/entrypoints/extractor.content'`，此 import 会触发 `defineContentScript` 的执行。需要确认：(a) WXT 的测试 setup 是否 stub 了 `defineContentScript` 全局，或 (b) extractor.content.ts 的 `export default defineContentScript({...})` 是否会在 import 时报错。如果 Phase 1 的 WXT Vitest plugin 配置了正确的 globals，这不是问题；否则需要 mock `defineContentScript`。**建议在 02-04 中明确验证此 import 在 jsdom 环境下无副作用。**
- `getDescription` 注释提到使用 original document 而非 clone，但函数签名 `getDescription(doc: Document, article: ...)` 接受 `doc` 参数，测试中通过 `document.implementation.createHTMLDocument()` 传入，与运行时行为一致。设计正确。

**02-04 (Unit Tests)**
- **wave 标注冲突**（见 HIGH 关注项）：frontmatter `wave: 3` 与 ROADMAP Wave 2 描述不一致。
- capture.spec.ts 的 `capturePipelineCore` mirror 函数缺少对 `tabs.query` 无结果（`[tab]` 解构得到 undefined）的覆盖路径。02-05 的 pipeline 实现有 `if (!tab?.id || !tab.url) → Err('INTERNAL')`，但 mirror 函数直接从 `deps.tabUrl` 接受 URL 而非模拟 tabs.query，略微降低了 mock 覆盖的真实性。低风险（mirror 函数的边界在 INTERNAL 路径，不是主要业务路径）。

**02-05 (SW Capture Pipeline + i18n)**
- **ZodError 处理风险**（见 HIGH 关注项）：步骤 7 的 `ArticleSnapshotSchema.parse()` 可能 throw，需确认 wrapHandler 覆盖此情况。
- `chrome.scripting.executeScript` 的 `results[0]?.result` 类型在 Chrome 类型定义中是 `unknown`，需要类型断言 `as ExtractorPartial | undefined`。Plan 中已写 `as ExtractorPartial | undefined`，类型处理正确。
- locale 键数量：计划要求 en + zh_CN 各 18 个 capture.* 子键，验收标准中也有此断言。需要确认实际添加的键数量与 UI-SPEC.md Copywriting Contract 一致，避免 off-by-one 错误导致 CI 失败。

**02-06 (Popup UI)**
- `INTERNAL` 错误码的路由：behavior 描述中写 "code=EXECUTE_SCRIPT_FAILED 或 INTERNAL → error 状态"，但 EXTRACTION_EMPTY 和 RESTRICTED_URL 走 empty 状态。这意味着 popup 需要对 code 值进行两个判断：`code === 'EXTRACTION_EMPTY' || code === 'RESTRICTED_URL'` → empty；否则 → error。执行器需要确保这个分支覆盖了所有 4 个 ErrorCode，没有落网情况。
- `Intl.DateTimeFormat(navigator.language, ...)` 在 Chrome extension popup 中，`navigator.language` 反映浏览器 UI 语言，与 `chrome.i18n.getUILanguage()` 一致，行为符合预期。无问题。
- module-level signals 在 Preact 中：`signal()` 创建的 signal 是响应式的，在 JSX 中直接访问 `.value` 会订阅更新。由于 popup 每次打开重新加载整个 JS 模块，module-level signal 初始值每次都是 `null`/`''`，行为正确。

**02-07 (E2E Tests)**
- **bringToFront 顺序问题**（见 MEDIUM 关注项）。
- **webServer 端口策略未明确**（见 MEDIUM 关注项）。
- article.html 中的代码块使用 `<code class="language-javascript">`，而 markdown-roundtrip 单元测试用 `<code class="language-ts">`。Turndown GFM plugin 识别 `language-*` class 并提取语言名。两者行为一致，但 E2E fixture 和单元测试 fixture 使用不同语言名，语言标识会出现在 fenced code block 的 ` ``` ` 后。这不影响功能但可能让开发者认为两个 fixture 不对称。

---

### Suggestions

1. **立即修复：02-04 wave 标注**。将 02-04-PLAN.md 的 `wave: 3` 改为 `wave: 2`，或更新 `depends_on` 使其与 ROADMAP 描述一致。这是执行正确性的前提。

2. **立即修复：明确 wrapHandler 对 ZodError 的处理**。在 02-05 task 1 中添加验收条件：`ArticleSnapshotSchema.safeParse()` 替代 `.parse()`，将 ZodError 转为 `Err('INTERNAL', ...)` 而非 unhandled rejection。或在 task 执行时确认 Phase 1 的 wrapHandler 已覆盖同步 throw。

3. **02-01 补充：turndown-plugin-gfm 类型声明**。在 task 1 action 中添加一步：创建 `types/turndown-plugin-gfm.d.ts`（或 `src/types/` 等项目惯用路径），内容为 `declare module 'turndown-plugin-gfm' { export function gfm(service: any): void; }`，并在 `tsconfig.json` 的 `typeRoots` 或 `types` 中引用。这防止 typecheck 失败。

4. **02-03 补充：验证 description-fallback.spec.ts 对 defineContentScript 的 import 安全性**。在 task 1 的 verify 步骤中添加：`pnpm test -- tests/unit/extractor/description-fallback.spec.ts` 并确认无 `defineContentScript is not defined` 错误。如果报错，在 tests/unit/setup.ts 或 vitest.config.ts 中添加 `global.defineContentScript = (opts) => opts`。

5. **02-07 补充：固定 webServer 端口**。在 playwright.config.ts webServer 配置中明确 `port: 4321`（或其他固定值），capture.spec.ts 使用 `process.env.WEB_SERVER_URL || 'http://localhost:4321'` 而非硬编码，避免端口冲突和 URL 不同步问题。

6. **02-07 补充：明确 bringToFront 顺序**。在 capture.spec.ts 的 E2E test 中，操作序列应为：`(1) open article tab → (2) bringToFront(articlePage) → (3) open popup via popup.goto(popupUrl)（复用已有 page，不创建新 page）`，确保 popup 打开时文章 tab 是 lastFocusedWindow 的活跃 tab。

7. **02-05 locale 键计数验证**。在 task 2 acceptance_criteria 中，将 "zh_CN capture.* 键数量与 en.yml 相同（18 个子键）" 的验证改为可执行命令：`grep -c "^capture\." locales/en.yml`，避免手动计数错误。

8. **后续 phase 提醒**：capture.spec.ts mirror 函数在 Phase 3 扩展 dispatch pipeline 时需同步检查是否需要更新 mirror 逻辑，建议在 Phase 3 的 CONTEXT.md 中添加此约束。

---

### Risk Assessment

**Overall Risk: MEDIUM**

**Justification:**

- **核心业务逻辑风险：LOW**。Readability + DOMPurify + Turndown 的组合经过充分研究，pipeline 步骤序列正确，错误码设计精准，安全约束（cloneNode/DOMPurify 前置/ISOLATED world/URL scheme 预检）均有明确执行约束。
- **测试基础设施风险：MEDIUM**。两个 HIGH 问题（02-04 wave 标注冲突、ZodError 处理未确认）和两个 MEDIUM 问题（bringToFront 顺序、webServer 端口）均集中在测试执行正确性，而非业务逻辑本身。如果不修复 wave 标注，执行器可能按错误顺序执行，导致 02-04 在 02-05 之后运行，TDD 红灯指导作用丧失。
- **MV3 兼容性风险：LOW**。所有 MV3 约束（SW 顶层监听器、activeTab 权限、scripting.executeScript 而非 tabs.executeScript）已正确应用，没有发现违规模式。
- **隐私/安全风险：LOW**。抓取内容仅存活于 popup signals（Phase 2 不写 storage），DOMPurify 净化 + textarea 纯文本渲染双重防护，extractor 运行在 ISOLATED world，没有数据出扩展边界的路径。

---

## Consensus Summary

（单评审者，无共识比较，以下为综合要点）

### Key Strengths

- 安全约束完整且有决策编号溯源
- ErrorCode 三态 (restricted/empty/failed) 语义边界精准
- ExtractorPartial 本地定义避免 SW bundle 污染
- mirror-function 测试模式与 Phase 1 保持一致
- locale 100% 同构有 CI gate 保障

### Top Concerns

1. **[HIGH] 02-04 wave 标注冲突**：frontmatter `wave: 3` 与 ROADMAP "Wave 2 并行" 描述不一致，需在执行前修正以保证 TDD 顺序
2. **[HIGH] ZodError 处理路径未确认**：02-05 步骤 7 的 `ArticleSnapshotSchema.parse()` 可能 throw ZodError，需确认 wrapHandler 能转换为 Err('INTERNAL')，否则改用 safeParse()
3. **[MEDIUM] E2E bringToFront 顺序**：需明确 popup 打开方式（goto vs newPage）和 bringToFront 调用时机
4. **[MEDIUM] webServer 端口策略**：需在 playwright.config.ts 中固定端口并在 spec 中动态读取

### To Incorporate Feedback

```
/gsd-plan-phase 2 --reviews
```
