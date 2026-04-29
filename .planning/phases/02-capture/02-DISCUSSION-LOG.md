# Phase 2: 抓取流水线 (Capture Pipeline) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 2-capture
**Areas discussed:** 抽取器组合, 捕获触发与受限页面, 内容形态与上限, 编辑 UX + draft 持久化

---

## Area selection (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| 抽取器组合 | Readability-only vs +Defuddle 双跑 vs Readability 主+Defuddle 后退 | ✓ |
| 捕获触发与受限页面 | popup mount 自动 vs 显式 Capture 按钮；受限 URL 三态语义 | ✓ |
| 内容形态与上限 | Markdown only vs +HTML 并存；长度上限；DOMPurify 配置 | ✓ |
| 编辑 UX + draft | always-on textarea vs click-to-edit；.session vs .local；lifecycle | ✓ |

**User's choice:** 全部 4 个区都讨论。

---

## 抽取器组合

| Option | Description | Selected |
|--------|-------------|----------|
| Readability-only | content 为 null 时走 EXTRACTION_EMPTY 空态。取者表面、snapshot shape、fixture 集最少；Defuddle / 非文章页面覆盖推迟到 v1.x。 | ✓ |
| Readability 主 + Defuddle 后退 | Readability 先跑。在其返回 null / content 过短（如 < 200 字符）时才后退 Defuddle。能接住 Reddit/YouTube/HN 部分场景，但需要多一份 fixture + 一个阈值决策。 | |
| Readability + Defuddle 双跑 | 两个抽取器都跑，按 PlatformDetector 或页面类型分派。代价：bundle 及冗余 + 两套 fixture + 选型逻辑。Phase 2 超出。 | |

**User's choice:** Readability-only（推荐）
**Notes:** 锁定为 D-13 / D-14。CAP-02 唯一点名 Readability；Roadmap 验证页是 Wikipedia/blog；Defuddle 推到 v1.x 不会改 ArticleSnapshot shape，无技术债。

---

## 捕获触发与受限页面

| Option | Description | Selected |
|--------|-------------|----------|
| 自动 + 预检 | popup mount 后立刻发一次 capture.run RPC；在 RPC 发出前在 popup（或 SW handler 入口）检查活动 tab URL 的 scheme，受限返回 RESTRICTED_URL 跳过注入。与 Phase 1 helloCount 模式对齐。 | ✓ |
| 自动 + 起后 catch | popup mount 后直接跳 executeScript。受限页面出现错误后转换为 EXECUTE_SCRIPT_FAILED 与 RESTRICTED_URL 两类。逻辑更简单但错误文案不够精准（全部 catch 走同一术语）。 | |
| 手动按钮 | popup 展示明确 Capture 按钮，点击后才跳 RPC。需要两类响应异常顶起 popup 居中，且与 Roadmap #1 "2s 内填充" 表述不完全对齐。 | |

**User's choice:** 自动 + 预检（推荐）
**Notes:** 锁定为 D-15..D-17。三个新 ErrorCode：RESTRICTED_URL（不重试） / EXTRACTION_EMPTY（empty 三态，不是 error） / EXECUTE_SCRIPT_FAILED（retriable）。

---

## 内容形态与上限

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown only | ArticleSnapshot.content 只存 Markdown。extractor 内部跳 Readability → DOMPurify（默认 profile）→ Turndown + GFM（表格 / 删除线 / fenced code）→ 返回。Phase 2 不加长度上限；dispatch payload 大小问题留给 Phase 3 裁定。 | ✓ |
| Markdown + sanitized HTML 并存 | snapshot 同时存 sanitized HTML 与 Markdown。存储价格加倍，Phase 3 dispatch payload 选型多一个决策。仅在 Phase 2 popup 需要 HTML 预览 或 未来 v1.x 要切 HTML 走向时才值得。 | |
| Markdown only + 100KB 上限 | Markdown only，且在 SW 返回前强制将 content 截断在 100KB（附上 truncated=true 标记）。低概率遇到超长文章时 popup 可表达删减；带一点额外复杂度。 | |

**User's choice:** Markdown only（推荐）
**Notes:** 锁定为 D-18..D-20。DOMPurify 用默认 profile，不放宽；Turndown + GFM；Phase 2 不加 cap，Phase 3 按 IM 平台具体上限再裁切并携 truncated 元字段。

---

## 编辑 UX + draft 持久化

| Option | Description | Selected |
|--------|-------------|----------|
| popup 仅瞬态 | title/description/content 走 always-on textarea + Preact signals，只活在 popup 挂载期间。articleSnapshotDraft schema 与写入路径推后到 Phase 3 dispatch flow 带起。Phase 2 不跨 popup 打开保留编辑。 | ✓ |
| .session draft 现在落 | always-on textarea。articleSnapshotDraft 在 Phase 2 就落到 chrome.storage.session，popup mount 读、编辑时 debounce 写。浏览器会话内重开 popup 保留编辑；重启丢失。Phase 3 直接消费。 | |
| .local draft 现在落 | always-on textarea。articleSnapshotDraft 到 chrome.storage.local，浏览器重启也保留。优点是面向 "明天接着发" 的使用场景；代价是莫名其妙的略股未发送的草稿跨天出现，需额外清理语义。 | |

**User's choice:** popup 仅瞬态（推荐）
**Notes:** 锁定为 D-21..D-22。Phase 2 单独存在时 draft 没有落地理由；Phase 3 把 send_to / prompt / snapshot edits 一并设计进 dispatch flow 才是合理边界。Phase 1 把 articleSnapshotDraft 列入 deferred 时虽指向 Phase 2，但本 phase 决定将其完整推到 Phase 3。

---

## Claude's Discretion

下列决策在讨论中明确委托给 plan 阶段：

- ArticleSnapshot zod schema 的精确字段约束（title/description 是否允许空字符串、url 是否做 z.string().url()、create_at 用 z.string().datetime()）
- description fallback 链的实现位置（content/extractor.ts 内部顺序 try vs 拆 helper）
- extractor 注入 world（ISOLATED 默认 vs MAIN —— 推荐 ISOLATED）
- 测试 fixture 形态（本地 HTML vs data:URL —— 推荐本地 HTML）
- 空白 / 换行规范化（信任 Turndown 默认 vs 后处理 —— 推荐信任）
- popup 三态视觉细节（loading skeleton vs spinner、empty / error 文案精确措辞、retry 按钮形态）

## Deferred Ideas

讨论中提到但不在 Phase 2 落地：

- **Phase 3：** articleSnapshotDraft 草稿 storage、content 长度上限与裁切、SendForm/HistoryDropdown/PromptPicker、send_to ↔ prompt 绑定、dispatchId 状态机
- **Phase 4 / 5：** Markdown 关键字 escape / Discord mention 清理、Adapter 注册表 / IMAdapter 契约
- **v1.x：** Defuddle 集成 / 非文章页（Reddit/YouTube/GitHub/HN）覆盖、自定义 message template（V1X-03）
- **Phase 6：** 运行时 locale 切换（I18N-02）、ESLint 完整版 hardcoded-string detector（I18N-03）
- **Phase 7：** PRIVACY.md 1:1 反映 capture 抓取字段（DST-02）

## 已驳回（仅记录）

- snapshot 同时存 sanitized HTML + Markdown
- always-on textarea 之外加 click-to-edit gate
- Phase 2 立 articleSnapshotDraft schema 但不写入
- Phase 2 给 content 加 100KB 截断上限
