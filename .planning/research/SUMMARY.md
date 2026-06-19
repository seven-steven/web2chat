# Project Research Summary

**Project:** web2chat v2.0 — Prompt Template Variable References
**Domain:** Chrome MV3 web-clipper 扩展增量特性（现有 capture → preview → dispatch 链路）
**Researched:** 2026-06-19
**Confidence:** HIGH（核心结论基于 v1.0–v1.2 全量代码审查；scope 严格限定为 5 个固定 ArticleSnapshot 字段）

## Executive Summary

本里程碑为 web2chat 的 prompt 文本新增“变量引用”能力：用户在 prompt 中写 `{{title}}` / `{{url}}` / `{{description}}` / `{{create_at}}` / `{{content}}`，在投递前替换为对应 ArticleSnapshot 字段值。popup 预览与投递必须使用**同一份渲染结果**；未知变量（含拼写错误如 `{{dedcription}}`）**原样保留**并以**非阻断式 warning** 提示，绝不静默吞掉或阻断投递。这是一个约 40 行纯函数 + 一处 dispatch-pipeline 接线 + schema 扩展一个 code 的最小改动面特性，**零新依赖**。

业界做这类“固定字段占位符替换”的标准做法就是单正则 `String.replace`，**不需要任何模板引擎**（Mustache/Handlebars 的“未定义→空串”默认行为与我们的“未知→原样保留”需求正好相反，属过度设计）。四个 researcher 在“渲染必须是纯函数、放在 `shared/`、由 popup 与 SW/adapter 共享”上完全一致——这是满足“预览≡投递”质量门与 SW 重启确定性的唯一解。

最大的结构性风险是**新特性与现有 prompt-first auto-append 模型的冲突**（PITFALLS T1）：当前 4 个 `compose*` 函数会“先放 prompt，再自动追加所有非空 snapshot 字段”。若引入显式 `{{content}}` 后仍保留 auto-append，消息正文会**重复一整份**，在 Discord 2000 / Telegram 4096 字符硬限下被截断，直接破坏“主链路稳定可用”的核心价值。roadmap 必须在动第一个 formatter 前裁定为“模型 A（含已识别变量则跳过 auto-append）”并贯穿全部 formatter。

### 关键 scope 裁定（researcher 分歧已解决）

ARCHITECTURE research 的部分建议**超出了用户确认的 scope**——它引入了 user-defined variables（`{{audience}}` / `{{tone}}`）、per-binding 变量存储、schema v2 migration、`composeForAdapter` 预览调度器、`promptVariables` 跨边界字段。**这些全部排除在本里程碑之外**（见 FEATURES AF-5/AF-6/AF-7、DIF-5）。本 synthesis 按 STACK/FEATURES/PITFALLS 的严格 scope 裁定：

- **只支持 5 个固定 ArticleSnapshot 字段**，无 user-defined 变量、无 shadowing 决策、无变量 scope 问题。
- **`DispatchStartInputSchema` 形状不变**——渲染仅作用于 prompt 字符串，使用已随 payload 携带的 snapshot；无需新增 `promptVariables` 字段。
- **无 storage schema migration**——binding/history 仍存原始 prompt 模板文本，`CURRENT_SCHEMA_VERSION` 保持 1。
- **预览共享同一纯函数**，但**不引入 `composeForAdapter` 调度器**做平台级预览；本里程碑预览目标是“渲染后的 prompt 文本”，平台级截断/escape 差异作为已知 limitation 在预览标注，不做完整平台级 preview parity（除非 requirements 阶段用户明确要求）。

## Key Findings

### Recommended Stack

**零新依赖。** 详见 `.planning/research/STACK.md`。整个特性落在一个纯 TS 模块 + 现有 dispatch-pipeline 一处调用 + `DispatchWarning` schema 扩一个 code + 2 个 i18n key。

**核心改动：**
- **`shared/prompt-template.ts`（新增）** — 单一纯函数 `renderPromptTemplate(prompt, snapshot) → { rendered, unknownVariables }`，与 `shared/dom-injector.ts`、`shared/adapters/*-format.ts` 同层（无 `chrome.*`、无 Preact、无 `t()`）。正则 `/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g`，单次扫描、不递归。
- **`background/dispatch-pipeline.ts`（改 1 处）** — 在组装 `ADAPTER_DISPATCH` payload 前调用渲染，把 `rendered` 喂给既有 `compose*`；`unknownVariables` 转 warning 上报。**format 函数零改动契约由模型 A 保证。**
- **`shared/messaging/routes/dispatch.ts`（扩展）** — `DispatchWarningCodeSchema` 从 `z.literal('SELECTOR_LOW_CONFIDENCE')` 改为 `z.enum([...])` 加 `UNKNOWN_TEMPLATE_VARIABLE`，加可选 `detail` 字段。向后兼容。
- **i18n（2 个新 key）** — `prompt_template_hint`、`warning_unknown_template_variable`，en + zh_CN 双 locale 100% 覆盖，CI 门禁兜底。

**明确不引入：** Mustache/Handlebars/micromustache、过滤器/嵌套语法、async 渲染或 storage 依赖。

### Expected Features

**Must have（TS-1..TS-9）：** 5 变量替换；未知变量原样保留不抛错；空值→空串；多次出现/任意位置；popup 实时预览且字段编辑跟随；投递≡预览（共享渲染函数，阻断 ship）；替换后内容受平台 escape 覆盖（render→then escape）；历史/binding 携带变量（存原始模板）；UI 文案走 `t()`。

**Should have（可 defer）：** 预览实时标注未知变量（DIF-1，成本低建议纳入）；变量插入按钮（DIF-2，可 defer）。

**Defer：** `create_at` 本地化变体（DIF-3）；命名模板库/编辑器（DIF-5/AF-7，独立 v2 milestone）。

**Anti-features：** 静默纠错（AF-1）、阻断投递（AF-2）、`{{name}}` 以外语义（AF-3）、AI 总结变量值（AF-4）、新增 snapshot 字段（AF-5）、per-platform 命名空间（AF-6）。

### Architecture Approach

单一渲染纯函数置于 `shared/`，popup 与 SW 共享；SW 在 `dispatch.start` 组装 payload 前渲染一次。**关键纪律：存储层只存原始模板，渲染只发生在投递与预览的瞬时。**

**主要组件：** (1) `shared/prompt-template.ts`（新，基石）；(2) `background/dispatch-pipeline.ts`（改，渲染调用 + warning）；(3) `dispatch.ts` schema 扩展；(4) 4 个 `compose*`（改，模型 A 开关）；(5) popup `SendForm`/`CapturePreview`（改，实时预览 + 标注）。

**Researcher 分歧与裁定：** ARCHITECTURE research 建议预览走 `composeForAdapter` 调度器做平台级 parity。本 milestone **不采纳**——预览目标为“渲染后 prompt 文本”，平台级差异作为已知 limitation 标注，避免 scope 膨胀。

### Critical Pitfalls

1. **T1 — auto-append 双重写入（最严重）**：裁定模型 A（含已识别变量则跳过 auto-append），判定用**白名单**（非“是否含 `{{`”，否则 typo 既不替换又关闭 append）。每 formatter 单测断言 content 恰好一次。
2. **T2 — 预览与投递两套代码**：单一纯函数 popup 与 SW/adapter 共享，共享边界 fixture。
3. **T8 — 模板注入**：强制单次替换不递归（防二次解析/无限循环）；严格 `interpolate → compose → escape` 顺序（防 `@everyone` 逃逸）。
4. **T5 — `{{content}} 撑爆 prompt 上限**：渲染后、构造 `DispatchStartInput` 前做长度校验，返回专门 error code（如 `PROMPT_TOO_LONG`）；预览截断但告知“投递含全文”。
5. **T11 — SW 重启确定性**：渲染纯函数仅依赖 (prompt, snapshot)，绝不用 `new Date()`；locale 若参与作为显式参数传入。

## Implications for Roadmap

建议 4 个 phase。依赖链：渲染纯函数（1）→ dispatch 接线 + 模型 A（2）→ popup 预览/i18n（3）→ 硬化/E2E（4）。模型 A 裁定必须在动 formatter 前定下（phase 2）。

### Phase 1: 模板渲染核心（纯函数 + 边界矩阵）

**Rationale:** 基石，popup/dispatch 都依赖它；先落地并穷举单测避免 T2/T3/T8/T11。
**Delivers:** `shared/prompt-template.ts` + `tests/unit/prompt-template.spec.ts`（PITFALLS T3 边界矩阵全表 + 注入 + 确定性）。
**Addresses:** TS-1..TS-4；两个 DECISION NEEDED（空白容忍 on、大小写敏感）。
**Avoids:** T2, T3, T8(a), T11。

### Phase 2: dispatch 接线 + 模型 A + warning 通道

**Rationale:** SW 渲染契约与模型 A 必须先定，formatter 与预览才有正确依赖。
**Delivers:** dispatch-pipeline 渲染调用 + `UNKNOWN_TEMPLATE_VARIABLE` warning（非阻断）+ 4 个 `compose*` 模型 A 开关（白名单判定）+ 渲染后长度校验（T5）。
**Addresses:** TS-6, TS-7, TS-8；T1 模型 A 落地。
**Avoids:** T1, T8(b), T5。

### Phase 3: popup 预览 + 未知变量标注 + i18n

**Rationale:** 数据流证明后做纯展示层。
**Delivers:** `SendForm`/`CapturePreview` 实时预览 + 未知变量非阻断标注（DIF-1）+ 渲染 debounce（M1）+ 2 个 i18n key 双 locale + 顺手修 `discord-format`/`openclaw-format` 硬编码 `'采集时间:'`（T10）。
**Addresses:** TS-5, TS-9, DIF-1；create_at 格式一致性（T7）。
**Avoids:** T6, T10, M1, M3。

### Phase 4: 硬化 + E2E + 回归

**Rationale:** 质量门需端到端验证；现有 dispatch.spec.ts 不含模板场景。
**Delivers:** 4 平台含 `{{content}}` E2E（mock platform 可做 payload 断言无需 headed）+ 跨层“预览字符数=投递字符数”断言 + SW 重启确定性 E2E + CI 绿。
**Addresses:** TS-6 验收；T11, M4。
**Avoids:** T11, M4, L1。

### Research Flags

**需 plan-phase 带 research：**
- Phase 2（模型 A 开关判定逻辑 + 兼容存量无变量 binding 回退）— `--research-phase 2`
- Phase 3（若 requirements 裁定 `create_at`→本地化时间，需抽共享 `formatCreatedAt` 并验证 content script `navigator.language`）— `--research-phase 3`

**标准模式可跳过：** Phase 1（成熟正则替换）、Phase 4（沿用 v1.1 mock-platform fixture）。

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 零新依赖；正则替换标准做法；字段全为 string 已核验 |
| Features | HIGH | 全部源码核验；两 DECISION NEEDED 已有推荐 |
| Architecture | HIGH（scope 内） | STACK/FEATURES/PITFALLS 一致；ARCHITECTURE 超范围部分已裁定排除 |
| Pitfalls | HIGH | 全量代码审查；T1 为结构性事实 |

**Overall:** HIGH

### Gaps to Address（requirements 阶段，保持最小）

- **`{{create_at}}` 真值（T7）**：raw ISO（最简单、确定性最强）vs 本地化绝对时间（UX 更好但需共享 formatter + locale 参数）。用户 context 默认 raw ISO；选本地化则进 phase 3 research。**唯一真正影响实现复杂度的决策。**
- **`{{content}}` 撑爆上限策略（T5）**：提升 `prompt` max 到 ~210_000 并实测 `tabs.sendMessage`，还是限制 `{{content}}`？建议提升 + 专门 error code + 预览截断提示。
- **平台级 preview parity 是否在本 milestone**：默认不做（标注 limitation），用户要求则新增工作。

## Sources

Primary（HIGH，源码）：`shared/messaging/routes/{capture,dispatch}.ts`、`background/dispatch-pipeline.ts:285-300`、`shared/adapters/{openclaw,discord,slack,telegram}-format.ts`、`shared/storage/repos/{binding,history}.ts`、`shared/storage/migrate.ts`、`entrypoints/popup/components/{SendForm,CapturePreview}.tsx`、`tests/lint/no-hardcoded-strings.test.ts`、`scripts/i18n-coverage.ts`。

Secondary：`CLAUDE.md`、`.planning/PROJECT.md`、`.planning/research/STACK.md`、`.planning/research/FEATURES.md`、`.planning/research/ARCHITECTURE-PROMPT-VARIABLES.md`、`.planning/research/PITFALLS-PROMPT-VARIABLES.md`。

---

_Research summary written: 2026-06-19_
