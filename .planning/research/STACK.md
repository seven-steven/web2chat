# Stack 调研 — Prompt 模板变量（v2 增量）

**领域：** 为 web2chat 现有抓取/投递链路新增「prompt 模板变量」能力
**调研时间：** 2026-06-19
**置信度：** 高（结论基于现有代码结构核验 + 纯字符串处理方案的成熟度，无需外部依赖）

> 本文件是 **v2 milestone 的增量栈调研**，聚焦「用户在 prompt 中写 `{{title}}` / `{{url}}` / `{{description}}` / `{{create_at}}` / `{{content}}`，预览与投递使用同一份渲染结果；未知变量原样保留并以告警形式提示」这一新特性。
> v1 完整技术栈（WXT / Preact / i18n / Readability / Vitest / Playwright 等）见 git 历史 `STACK.md@v1`（2026-04-28）与 `CLAUDE.md`。本文件只回答「为这个新特性需要新增/改动什么」。

---

## TL;DR

**不新增任何依赖。** 模板渲染是一个 ~40 行的纯 TS 函数，用单个正则做 `{{key}}` 替换即可，完全落在现有 `shared/` 纯函数层，与 SW 纪律、i18n 边界、存储 schema 全部兼容。

核心结论：

1. **零新依赖** —— `{{var}}` 占位符替换不需要模板引擎（Mustache/Handlebars/micromustache 都属过度设计）。
2. **单一真值来源 = `ArticleSnapshot`** —— 五个变量与 `ArticleSnapshotSchema` 字段一一对应，复用现有 zod schema 作字段白名单。
3. **渲染点 = 投递管线组装 payload 之前** —— 在 `compose*` 格式化函数之前对 `prompt` 做一次替换，保证「预览」与「投递」走同一段代码、同一份结果。
4. **未知变量 = 扩展现有 `DispatchWarning` schema** —— 加一个 `UNKNOWN_TEMPLATE_VARIABLE` code，复用已有的告警上报/展示通道，不另起 UI。
5. **未知变量行为 = 原样保留**（不抛错、不剥离），符合「主链路稳定可用」的核心价值。

---

## 需要新增/改动什么

### 新增：1 个纯函数模块

**位置：** `shared/prompt-template.ts`（与 `shared/dom-injector.ts`、`shared/adapters/*-format.ts` 同层——纯 TS、无 `chrome.*`、无 Preact、可被 popup / SW / 测试三方导入）。

**职责：**

```ts
import type { ArticleSnapshot } from '@/shared/messaging';

/** 已知变量白名单 —— 与 ArticleSnapshotSchema 字段 1:1。 */
export const TEMPLATE_VARIABLES = [
  'title',
  'url',
  'description',
  'create_at',
  'content',
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export interface RenderResult {
  /** 替换后的最终 prompt 文本（未知变量原样保留）。 */
  rendered: string;
  /** 解析到的未知变量名（去重、保持首次出现顺序）。空数组 = 无告警。 */
  unknownVariables: string[];
}

/** 渲染 prompt 模板。纯函数、无副作用、可同步调用。 */
export function renderPromptTemplate(
  prompt: string,
  snapshot: ArticleSnapshot,
): RenderResult;
```

**实现要点（已对照现有 schema 验证）：**

- 正则：`/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g` —— 容忍变量名两侧空白（`{{ title }}`），变量名限定为合法标识符（避免把 `{{a b}}` 误判）。
- 替换：对每个匹配，若 `key ∈ TEMPLATE_VARIABLES` 则替换为 `snapshot[key]`（注意 `snapshot` 字段均为 `string`，zod schema 已保证），否则**保留原文 `{{key}}` 并记录到 `unknownVariables`**。
- `create_at` 是 ISO-8601（schema `z.string().datetime()`）——是否在渲染时本地化为可读时间是一个独立的产品决策（建议**不在模板层格式化**，保持「渲染 = 纯替换」，时间格式化交给现有 `compose*` 里已有的 `timestampLabel` 逻辑或单独议题处理）。
- 对长 `content`（最大 200KB）的替换是 O(n) 单次扫描，无性能问题。

### 改动：投递管线（payload 组装点）

**当前现状（已核验）：** `background/dispatch-pipeline.ts:285-300` 在 `chrome.tabs.sendMessage` 的 `payload` 里直接传 `prompt: updated.prompt`；各平台 `entrypoints/<platform>.content.ts` 调用 `shared/adapters/<platform>-format.ts` 的 `compose*(payload: { prompt, snapshot })` 把「prompt 整段 + snapshot 字段」拼成最终文本。

**两种接线方案：**

| 方案 | 做法 | 取舍 |
| --- | --- | --- |
| **A（推荐）** | 在 SW dispatch-pipeline 组装 payload 前调用 `renderPromptTemplate(prompt, snapshot)`，把**渲染后的 `rendered`** 存进 `DispatchRecord`（新增字段或复用），并把 `unknownVariables` 转成 warning 上报；`compose*` 收到的就是最终文本，**完全不改 format 函数**。 | 渲染只发生一次、预览与投递天然同源；format 函数零改动，回归面最小；warning 在 SW 层集中处理。 |
| B | 把渲染塞进每个 `compose*` 函数内部。 | 5 个平台 format 各改一遍、易漂移；预览（popup）还得再调一次渲染，出现两份实现。**不推荐。** |

**推荐 A。** 注意：`DispatchRecord.prompt` 目前存的是「用户原始 prompt」，需明确语义——建议保留原始 `prompt` 不变，新增 `rendered_prompt` 字段（或在 payload 生成时即时渲染不入库），避免破坏既有 `binding.upsert(done.send_to, done.prompt)` 回写历史时存的是渲染结果（历史里应存原始模板，否则 `{{title}}` 会被固化成某次具体值）。**关键纪律：存储层只存原始模板，渲染只发生在投递与预览的瞬时。**

### 改动：`DispatchWarning` schema 扩展

**当前（已核验 `shared/messaging/routes/dispatch.ts`）：**

```ts
export const DispatchWarningCodeSchema = z.literal('SELECTOR_LOW_CONFIDENCE');
```

**新增：**

```ts
export const DispatchWarningCodeSchema = z.enum([
  'SELECTOR_LOW_CONFIDENCE',
  'UNKNOWN_TEMPLATE_VARIABLE',
]);

export const DispatchWarningSchema = z.object({
  code: DispatchWarningCodeSchema,
  // 新增可选 detail 字段承载未知变量名列表（仅 UNKNOWN_TEMPLATE_VARIABLE 用）
  detail: z.string().optional(), // e.g. "user_name, foo"
});
```

复用现有 `DispatchRecord.warnings?: DispatchWarning[]` 与 popup 已有的告警展示通道（`ErrorBanner` / `SelectorWarningDialog` 同类机制），不新增 UI 组件类型。

### 改动：popup 预览

`CapturePreview` / `SendForm` 在展示「将要发送的内容」时，同样调用 `renderPromptTemplate` 渲染一次。因为方案 A 把渲染做成纯函数且预览与投递共享，**预览所见即投递所得**这一需求天然满足。未知变量在预览阶段即可提示（轻量 inline 提示），不必等到投递。

### 改动：i18n

**新增 locale key（en + zh_CN 双语 100% 覆盖，遵守 `CLAUDE.md` i18n 约束）：**

- `prompt_template_hint` —— 输入框下方/帮助文本，列出可用变量（`{{title}} {{url}} {{description}} {{create_at}} {{content}}`）。
- `warning_unknown_template_variable` —— 告警文案，支持占位（如 `Unknown variable: {detail}`）。

`@wxt-dev/i18n` 的 `t()` 支持占位参数；`scripts/i18n-coverage.ts` 已有覆盖率门禁，新 key 漏译会被 CI 拦截。**不要在 JSX 中硬编码变量列表字符串**（ESLint 已拦截）。

---

## 明确不要引入的依赖

| 方案 | 为什么不用 |
| --- | --- |
| **Mustache / Handlebars** | 我们的需求是「5 个固定变量的字符串替换 + 未知变量保留」，没有条件分支/循环/部分模板。引入它们换来的是 ~10KB+ bundle、新的转义语义（`{{{ }}}` 三花括号、HTML 转义行为）与学习成本，且 Mustache 的「未定义变量 → 空字符串」默认行为与我们的「未知变量原样保留」需求**正好相反**，还得配置关闭。 |
| **micromustache / tiny-templater** | 仍属多余抽象——核心实现就是一个 `String.replace(regex, fn)`。 |
| **自研 mini 模板引擎（支持过滤器 `{{title | upper}}`、嵌套 `{{a.b}}`）** | YAGNI。当前需求没有过滤器与嵌套。若未来确有需要，再作为独立议题评估；现在加只会膨胀表面积与测试矩阵。 |
| **把渲染做成 async / 依赖 storage** | 渲染是纯函数、同步、输入只有 `prompt` 与 `snapshot`。绝不要让它读 storage 或变 async——会破坏 SW 纪律下的可重入性与预览的即时性。 |

---

## 测试策略（沿用现有栈，无需新增测试工具）

**单元测试（Vitest + happy-dom，路径 `tests/unit/`）：** 新建 `tests/unit/prompt-template.spec.ts`，覆盖：

- 已知变量全部正确替换（5 个字段各一例）。
- 未知变量原样保留 + 进 `unknownVariables`（如 `{{author}}` → 文本不变、被记录）。
- 变量名两侧空白容忍（`{{ title }}`）。
- 同一变量多次出现全部替换。
- `content` 为空/超长时的边界（替换不报错、O(n) 不爆栈）。
- 无变量的 prompt 原样返回、`unknownVariables` 为空。
- 大小写敏感（`{{Title}}` ≠ `{{title}}`，按白名单严格匹配——除非产品决定大小写不敏感，建议**敏感**以减少歧义）。
- 特殊字符在替换值中不被二次解析（如 snapshot.title 里含 `{{url}}` 字面量不应被递归替换——单次 `replace` 天然避免，需有断言锁定）。

**回归测试：** 方案 A 不改 `compose*`，现有 `tests/unit/dispatch/state-machine.spec.ts` 等投递测试应全绿；新增 1 个 dispatch-pipeline 测试断言「带模板的 prompt 渲染后进入 payload、未知变量转为 warning」。

**i18n 覆盖：** `pnpm test:i18n-coverage` 保证新 key 双语齐全。

**E2E（Playwright）：** 可选——若要端到端验证，加一个 fixture：prompt 含 `{{title}}`，断言注入到 mock-platform 的 payload 文本里出现 snapshot 的真实 title。Mock platform（`entrypoints/mock-platform.content.ts`）已 `console.log` payload，适合做这类断言，无需 headed 浏览器。

---

## 与现有项目约束的兼容性核验

| 约束（CLAUDE.md） | 兼容性 | 说明 |
| --- | --- | --- |
| Service worker 纪律（顶层注册、无状态、`chrome.alarms`） | ✓ 完全兼容 | 渲染是纯函数，SW handler 内部从 `DispatchRecord` 取 prompt+snapshot 即时调用，不引入 module-scope 状态、不新增 setInterval。 |
| 适配器模式（平台逻辑不进投递核心） | ✓ 完全兼容 | 方案 A 把渲染放在 `shared/` + dispatch-pipeline，format/adapter 零改动，符合「投递核心不硬编码平台逻辑」。 |
| 存储：只走类型化 repo，schema 含 version | ✓ 需注意 | **存储层只存原始模板**，`bindingsItem`/`historyRepo` schema 不变；若新增 `rendered_prompt` 到 `DispatchRecord`，需 bump `DispatchRecord.schemaVersion` 并写 migration（放 schema 旁，遵守约定）。更简单的做法是不入库、投递时即时渲染。 |
| i18n：用户可见字符串全走 `t()`，en/zh_CN 100% | ✓ | 新增 2 个 key，走 `@wxt-dev/i18n`，CI 覆盖率门禁兜底。 |
| 隐私：抓取数据仅本地、仅主动投递 | ✓ | 渲染发生在本地 SW，不引入任何第三方调用，数据流不变。 |
| Zod 校验跨上下文 payload | ✓ | `DispatchWarning` schema 扩展用 `z.enum`，跨 popup↔SW 边界仍校验。 |
| 不做范围外改动（开发者画像 `regression`） | ✓ | 方案 A 是最小改动面：1 新文件 + dispatch-pipeline 一处调用 + schema 扩一个 code + 2 个 i18n key。 |

---

## 置信度汇总

| 结论 | 置信度 | 依据 |
| --- | --- | --- |
| 零新依赖、单正则纯函数足够 | **高** | 需求是 5 个固定变量的字符串替换；`String.replace(regex, fn)` 是标准做法，已对照 schema 确认字段类型全为 string |
| 渲染点应在 dispatch-pipeline（方案 A） | **高** | 已核验 `dispatch-pipeline.ts:285-300` payload 组装点与 5 个 `compose*` 签名一致；方案 A 让预览与投递共享同一渲染 |
| 存储层只存原始模板 | **高** | 已核验 `binding.ts`/`history` 回写路径，渲染结果入库会污染历史与 send_to 绑定 |
| `DispatchWarning` schema 可平滑扩展 | **高** | 已核验其为 `z.literal` 单值，改为 `z.enum` 向后兼容 |
| 大小写敏感 + 单次替换无递归 | **中** | 属产品/实现决策，建议项，需在 requirements 阶段确认 |

---

## 信息来源

- 代码核验（2026-06-19）：
  - `shared/messaging/routes/capture.ts` — `ArticleSnapshotSchema`（五字段白名单真值来源）
  - `shared/messaging/routes/dispatch.ts` — `DispatchWarningCodeSchema` / `DispatchWarningSchema`
  - `background/dispatch-pipeline.ts:285-300` — payload 组装点
  - `shared/adapters/{openclaw,discord,slack,telegram}-format.ts` — `compose*(payload: { prompt, snapshot }) → string`
  - `shared/storage/repos/binding.ts` / `dispatch.ts` — prompt/snapshot 存储形状
  - `shared/adapters/types.ts` — `IMAdapter` 契约
- v1 全栈调研：`STACK.md@v1`（git 历史，2026-04-28）
- 项目约束：`CLAUDE.md`（Service worker 纪律、权限模型、适配器模式、i18n、存储、隐私）

---

_Stack research for: web2chat v2 — prompt template variable references_
_Researched: 2026-06-19_
