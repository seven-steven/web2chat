# 陷阱研究 — v2.0 Prompt 模板变量引用

**领域：** 为现有 web2chat Chrome MV3 扩展的 `prompt` 增加 `{{title}}` / `{{url}}` / `{{description}}` / `{{create_at}}` / `{{content}}` 变量引用；popup 预览与投递使用同一渲染结果；未知变量原样保留并以 warning 提示。
**研究日期：** 2026-06-19
**置信度：** HIGH（基于 v1.0–v1.2 全量代码审查：`dispatch-pipeline.ts` / 四个 `*-format.ts` / `items.ts` / `history.ts` / `binding.ts` / `discord.content.ts` / `capture.ts` schema / `CapturePreview.tsx` / `SendForm.tsx`）/ MEDIUM（设计抉择类条目——取决于 roadmap 最终如何裁定 prompt-first auto-append 与显式引用的冲突）

---

## 关键架构事实（读者必读）

本功能改写的不是"一个小工具函数"，而是**整个消息组装模型**。当前实现的事实：

1. **prompt-first auto-append 模型**：每个 `compose*` 函数（`discord-format.ts:39`、`slack-format.ts:115`、`telegram-format.ts:30`、`openclaw-format.ts:20`）签名都是 `{ prompt, snapshot, timestampLabel }`，逻辑是"先放 prompt，再自动追加所有非空 snapshot 字段"。`prompt` 字符串本身**从不被解析**——它只是首行。
2. **prompt 以原始字符串跨越 SW → content-script 边界**：`dispatch-pipeline.ts:291` 的 `ADAPTER_DISPATCH` payload 携带原始 `prompt` + `snapshot` 对象；render 发生在 content script 内（如 `discord.content.ts:333`）。渲染器与渲染时机**分散在 4 个 content script**。
3. **`create_at` 在两处有不同表示**：popup `CapturePreview.tsx:60-65` 用 `Intl.DateTimeFormat` 做本地化 + 相对时间；4 个 formatter 用**原始 ISO-8601**（`capture.ts:13` `z.string().datetime()`）+ 一个硬编码 locale 标签（discord-format 默认 `'采集时间:'`，openclaw-format 硬编码 `采集时间:`，telegram/slack 走 `t()` 的 `*_timestamp_label`）。
4. **prompt 历史与 binding 存的是原始 prompt 文本**（`history.ts:71-76` `addCore` 按 `value` 精确去重；`binding.ts:13` `upsert` 存 `prompt` 原文）。`DispatchStartInputSchema.prompt` 上限 `z.string().max(10_000)`（`dispatch.ts:22`）。
5. **snapshot 内容已受净化**：extractor 在 `document.cloneNode(true)` 上跑 Readability + DOMPurify + Turndown（CLAUDE.md §技术栈）；但 **prompt 是用户自由文本，从未经过任何转义/净化**，escape（`escapeMentions` / `escapeSlackMentions`）发生在 formatter 内、**只作用于被注入的字段**（`discord-format.ts:47-50` 对 prompt/title/description/content 做 escape，url/create_at 不做）。

这五条事实直接催生下方几乎所有陷阱。

---

## 新增关键陷阱

### 陷阱 T1：模板渲染与 auto-append 双重写入（最严重，可能让消息重复一整份正文）

**问题表现：**
用户写 prompt = `总结 {{title}}：{{content}}`。如果 formatter 仍保留 prompt-first auto-append（把 snapshot 字段再追加一遍），最终消息会变成：

```
总结 <title>：<content>
<title>
<url>
<description>
<content>            ← content 出现两次，全文重复
```

Discord 2000 字符 / Telegram 4096 字符硬限下，第二次 `{{content}}` 被截断丢字，用户看到的是"半截重复正文"，且无法察觉原因。

**原因：**
`compose*` 的现有契约是"prompt + 全部 snapshot 字段"。引入显式引用后存在两种语义模型，roadmap 必须二选一并贯穿所有 formatter：
- **模型 A（纯显式）**：prompt 含变量时，**不再 auto-append**；prompt 无变量时回退到旧行为（兼容存量 binding）。
- **模型 B（混合）**：变量只替换，auto-append 永远发生——这就是双重写入。

**后果：** 消息重复 / 超长截断 / 用户对"我到底发出去什么"失去信任。这是会破坏 **dispatch 主链路稳定性**（核心价值）的回归。

**如何避免：**
- roadmap 显式裁定为模型 A，并在每个 formatter 实现一个"是否包含已识别变量"的开关：`hasVariableReference(prompt) === true` → 跳过 auto-append。
- "已识别变量"判定必须用**白名单**（解析出的变量名 ∈ `{title,url,description,create_at,content}`），**不能用"是否包含 `{{`"**——否则 `{{titel}}`（拼写错误）会被当成"含变量"而关闭 auto-append，结果变量不替换 + 正文也不追加 = 用户什么都没发出去（见 T6）。
- **同一渲染函数必须同时服务 popup 预览和 content-script 注入**（见 T2），否则"预览无重复、投递有重复"的不一致极难排查。

**预警信号：**
- 单测里同一 prompt 在 popup 渲染结果与 formatter 输出**字符数不同**。
- Discord/Telegram 消息出现 `[truncated]` 但用户 prompt 本身很短。
- 用户反馈"正文发了两遍"。

**应处理阶段：** 模板渲染核心设计 phase——必须在写第一个 formatter 改动前定下模型 A/B。每个 formatter 的单测都要加"prompt 含 `{{content}}` 时 content 恰好出现一次"的断言。

---

### 陷阱 T2：popup 预览与投递渲染走两套代码（预览说谎，投递才真）

**问题表现：**
为了 popup 即时预览，开发者在 `popup/` 写了一个 `renderPrompt(prompt, snapshot)`。但 content script 里仍在用各自的 `compose*`（它们还要负责 markdown→mrkdwn 转换、mention escape、截断）。两边对 `{{content}}` 的处理不同：
- popup 预览：原始 markdown 原样显示。
- Discord 投递：`convertMarkdownToMrkdwn` + `escapeMentions` + 2000 字符截断。

用户在预览看到 3500 字，点确认后 Discord 实际发出去的是 2000 字（被截断）。预览与投递不一致 = **用户信任崩塌**。

**原因：**
渲染逻辑天然要分两段——变量替换（pure，可共享）vs 平台格式化（platform-specific，已在 formatter 内）。如果"变量替换"不抽成共享纯函数、各自实现，就会出现：popup 的 `{{url}}` 替换用 `snapshot.url`，formatter 的 `{{url}}` 替换忘了传 snapshot 导致 `undefined`。

**如何避免：**
- 抽出 **单一纯函数** `interpolatePrompt(prompt, snapshot): { text: string; unknownVars: string[] }`，放在 `shared/`（无 chrome/WXT 依赖，参照现有 `*-format.ts` 的"pure utility"约定）。
- popup 预览调用它得到 `{ text, unknownVars }` → 展示 `text` + 渲染 unknown warning。
- 每个 `compose*` 也调用它，把返回的 `text` 作为新的 `prompt` 入参喂给既有的追加/截断逻辑。
- 这样**变量替换只有一份实现**，平台差异（escape、截断、markdown 转换）仍留在 formatter——分层干净。
- 单测对 `interpolatePrompt` 做穷举边界测试（见 T3–T7），popup 与 formatter 共享同一组 fixture。

**预警信号：**
- popup 预览字符数 ≠ 实际投递字符数（可写一个跨层断言）。
- 预览里 `{{content}}` 显示完整，投递后被截断（这是平台限制导致的合理差异，但**预览必须提示**"将按平台限制截断"，否则就是欺骗）。
- 两个文件里出现两份长得像但不一样的 `{{...}}` 正则。

**应处理阶段：** 模板渲染核心 phase——`interpolatePrompt` 是本功能的基石，必须先于任何 UI / formatter 改动落地并被单测覆盖。

---

### 陷阱 T3：花括号边界——嵌套、不闭合、多余空格、转义

**问题表现与边界矩阵：**

| 输入 | 期望 | 常见错误实现的行为 |
|------|------|-------------------|
| `{{title}}` | 替换 | ✓ |
| `{{ title }}` | 替换（容错） | ✗ 不少正则 `\{\{(\w+)\}\}` 不容空格 → 不替换 + warning，用户困惑 |
| `{{title}}}` | 替换 + 保留多余 `}` | ✗ 贪婪正则吃掉 → 替换后少一个 `}` |
| `{{{title}}}` | 保留外层 `{` + 替换 | ✗ 替换失败或吞掉前导 `{` |
| `{{title` (不闭合) | 原样保留 + warning | ✗ 部分实现把 `{{title` 当变量名 |
| `{{titel}}` (typo) | 原样保留 + unknown warning | ✗ 静默丢弃或替换成空串 |
| `{{}}` | 原样保留 + warning | ✗ 替换成 `undefined` |
| `{{a=b}}` / `{{title|upper}}` | 超出 v2 范围 → 原样保留 + warning | ✗ 把 `title|upper` 当变量名查表 miss |
| `\{\{title\}\}` (用户想字面量) | v2 不支持转义 → 原样输出 `\{\{...\}\}` | ⚠️ 需明确文档"v2 不支持转义花括号" |
| `{{title}}{{title}}` (连续两个) | 替换两次 | ✗ 某些手写 replace 只替换第一个 |
| `{{content}}` 内文本本身含 `{{url}}` | **不递归替换**（防注入/防无限循环） | ✗ 递归替换 → snapshot 内容里的 `{{...}}` 被二次解析 |

**原因：**
"解析 `{{var}}`"看起来 trivial，但边界情况多达十余种。手写 `string.replace(/\{\{(\w+)\}\}/g, ...)` 会踩中空格、typo、空名、连续、嵌套（content 自带 `{{`）等多个坑。

**如何避免：**
- 用**单次扫描、非回溯、不递归**的替换：正则匹配所有 `{{ ... }}`，对每个匹配：strip 首尾空格 → 若结果 ∈ 白名单 → 替换为对应字段值；否则**保留整个原匹配串**并记入 `unknownVars`。
- **替换后的结果不再二次扫描**（content 字段值里若含 `{{xxx}}` 必须原样输出——这是防注入关键，见 T8）。
- 变量名匹配用 `^[a-z_][a-z0-9_]*$`（snake_case，匹配现有字段名 `create_at`），区分大小写——`{{Title}}` 应判 unknown（与 `capture_field_*` i18n 键风格一致）。
- 编写**边界矩阵单测**，上表每一行一条 case，断言 `text` 与 `unknownVars` 双输出。

**预警信号：**
- 用户 prompt 里出现的 `{{ }}` 在投递后消失或变形。
- snapshot 正文里恰好含 `{{something}}`（如技术文档片段）被二次替换。

**应处理阶段：** `interpolatePrompt` 单测 phase——边界矩阵是 acceptance criteria。

---

### 陷阱 T4：空值字段——`{{description}}` 为空时产生多余空行 / 孤立标点

**问题表现：**
用户 prompt = `> {{description}}\n\n{{content}}`。当页面无 meta description（`snapshot.description === ''`，extractor 常见情况），渲染后变成：

```
> 

<content>
```

出现一个孤立的 `> `（blockquote 标记）+ 空行。Discord 把它渲染成空引用块；Slack mrkdwn 里 `>` 无意义但占行。更糟：prompt = `【{{title}}】{{description}}`，description 空 → `【标题】`，看起来像没发完。

**原因：**
现有 formatter 对空字段的策略是"整行省略"（`discord-format.ts:54` `if (safeDescription)` 才 push）。但变量替换发生在 formatter **之前**（T2 的 `interpolatePrompt`），替换后 formatter 看到的是 `> ` 这种"非空但语义空"的字符串，无法再省略。

**如何避免：**
- roadmap 明确：**变量替换为空时，替换为空串**（不保留变量名，也不塞占位符）。这是"未知变量原样保留"的反面——已知变量但值为空 = 替换为空。
- 由此产生的"空行 / 孤立标点"是**预期行为**，不特殊处理；但需在 popup 预览里**如实展示**（用户能看到 `> ` 空行），让用户自行调整 prompt。
- 单测断言：`interpolatePrompt('> {{description}}', { description: '' })` → `text === '> '`、`unknownVars === []`（空值不是 unknown）。
- **不要**尝试"智能删除空行周围的标点"——那是无底洞，且会让预览与投递再次分叉。

**预警信号：**
- 投递消息出现孤立 `>`、`【】`、`：` 等悬挂标点。
- 用户抱怨"我的引用格式坏了"。

**应处理阶段：** `interpolatePrompt` + 预览 phase。

---

### 陷阱 T5：`{{content}}` 注入大正文——撑爆 prompt 上限 / 撑爆 popup textarea / 结构化克隆

**问题表现：**
`capture.ts:14` content 上限 200_000 字符。用户写 prompt = `请翻译：{{content}}`，渲染后 prompt 可能达 20 万字符。三个独立上限会被同时撞爆：

1. **`DispatchStartInputSchema.prompt: z.string().max(10_000)`**（`dispatch.ts:22`）——渲染后的 prompt 若超过 10_000，**zod 校验在 SW 边界失败**，dispatch 直接 `INTERNAL` 错误，用户看到"投递失败"却不知是 prompt 太长。
2. **popup textarea**——20 万字符渲染进预览 textarea 会卡顿（`CapturePreview.tsx` 的 content textarea 已是性能敏感区）。
3. **`chrome.scripting.executeScript` / `tabs.sendMessage` 的 structuredClone**——超大 payload 跨上下文序列化慢甚至失败（v1 已为此设了 200KB content cap）。

**原因：**
变量替换发生在 prompt 进入 dispatch 之前。当前 `max(10_000)` 限制针对的是**用户输入的 prompt 原文**（短），替换后体积爆炸没人管。

**如何避免：**
- **在 `interpolatePrompt` 之后、构造 `DispatchStartInput` 之前**做长度校验，返回专门的 error code（如 `PROMPT_TOO_LONG`），而非让它落到 zod `INTERNAL`。
- 或者：roadmap 裁定"`{{content}}` 替换为**引用占位**而非全文"——但这改变了功能语义，需用户预期对齐。
- **popup 预览对 `{{content}}` 做截断展示**（如只渲染前 N 千字 + "…（预览已截断，投递将含全文）"），但**投递用全文**——并明确告知用户。否则预览快了、投递仍超限。
- 提升 `prompt` 的 `max()` 上限到能容纳 content（如 210_000），并验证 `tabs.sendMessage` 在该体积下的稳定性（v1 已验证 200KB content 可行，prompt 同量级应可行，但需实测）。
- Discord 2000 / Telegram 4096 的平台硬限仍在 formatter 截断——但**预览必须提示目标平台的截断**（T2），否则用户以为发了全文其实只发了开头。

**预警信号：**
- 长 prompt 投递报 `INTERNAL: Invalid dispatch input`（zod 失败的模糊信息）。
- popup 在含 `{{content}}` 时明显卡顿。
- 投递成功但 Discord 消息被 `[truncated]`，用户未察觉。

**应处理阶段：** 渲染核心 phase（长度校验）+ 平台适配 phase（截断预览提示）。

---

### 陷阱 T6：未知变量（typo）——静默吞掉 vs 噪声 warning 的取舍

**问题表现：**
用户写 `{{titel}}`（拼错）。两种坏结果：
- (a) 静默替换成空串 → 消息里该位置消失，用户找不到原因，**重复触发信任崩塌**。
- (b) 替换成字面 `{{titel}}` 并弹 warning → 但若 warning 太吵（每次投递都弹），用户关掉提示后再次踩坑。

team-lead 的 quality gate 明确要求："unknown variables remain unchanged and are surfaced as warning"。所以 (a) 是明确禁止的。风险在于 warning 的**形态与时机**。

**原因：**
现有 dispatch 已有 warning 机制：`DispatchWarningSchema`（`dispatch.ts:8`，当前仅 `SELECTOR_LOW_CONFIDENCE`），经 `requireDispatchConfirmation` 走 `needs_confirmation` 状态（`dispatch-pipeline.ts:384`），popup 会停住等确认。如果把 unknown var 也走这条路径，**每次含 typo 的投递都要二次确认**，UX 重。

**如何避免：**
- 区分两种 warning 严重度：
  - **selector 低置信**：阻断式（`needs_confirmation`，现有机制）——因为它意味着"可能发错频道"。
  - **unknown 变量**：**非阻断式**——在 popup 预览区**实时**标红未知变量（用户在编辑 prompt 时就能看到），投递不再二次确认。预览即 warning 载体。
- 扩展 `DispatchWarningSchema` 增加码 `UNKNOWN_TEMPLATE_VAR`（携带 `vars: string[]`），但**仅在 popup 未展示过预览时**才经 dispatch 回传（理论上 popup 预览已覆盖所有场景，dispatch 路径是 backstop）。
- 单测：`unknownVars` 数组去重 + 保序；`{{a}}{{a}}` 只报一次 `a`。
- i18n：warning 文案走 `t()`，新增 `template_unknown_var_warning` 键，en/zh_CN 100% 覆盖（CLAUDE.md §i18n，`scripts/i18n-coverage.ts` 会 gate）。

**预警信号：**
- 用户反复投递同一 typo（说明 warning 没被看到）。
- options 页 `no-hardcoded-strings` lint（`tests/lint/`）失败——有人把 warning 文案写死了。

**应处理阶段：** 渲染核心 phase（`unknownVars` 产出）+ popup 预览 phase（实时标红）+ i18n phase（新键）。

---

### 陷阱 T7：`{{create_at}}` 的"两种真值"——ISO 原文 vs 本地化标签 vs 相对时间

**问题表现：**
`create_at` 在系统里有**四种**可能的表示，`{{create_at}}` 替换成哪种直接影响用户预期：

1. 原始 ISO-8601（`capture.ts:13` 存的值，如 `2026-06-19T08:30:00.000Z`）。
2. popup `CapturePreview.tsx:61` 的 `Intl.DateTimeFormat` 本地化（如 `2026年6月19日 16:30`）。
3. 现有 formatter 的"硬编码标签 + ISO"（discord: `> 采集时间: 2026-06-19T...`，openclaw 同；telegram/slack 走 `t()` 标签）。
4. `CapturePreview.tsx:65` 的相对时间（`3 分钟前`）。

若 `{{create_at}}` 替换成 (1) 原始 ISO，用户在 Discord 看到一串 `T...Z` 很丑；若替换成 (2)，则**预览和投递的时区/格式又分叉**（预览用浏览器 locale，投递若也想本地化得在 content script 里跑 `Intl`，但 content script 的 `navigator.language` 与 popup 一致，可行但要验证）。

**原因：**
`create_at` 是唯一一个"既有原始值、又有派生展示值"的字段。其他四个字段（title/url/description/content）都是"原始值即展示值"。

**如何避免：**
- roadmap 明确**唯一真值**：推荐 `{{create_at}}` → **本地化的绝对时间**（与 popup `CapturePreview` 的 `Intl.DateTimeFormat` 同一格式器、同一 locale 来源），**不**含相对时间、**不**含 `采集时间:` 标签（标签是 formatter 的职责，变量只给值）。
- 把 `CapturePreview.tsx:60-64` 的格式化逻辑抽成共享纯函数 `formatCreatedAt(iso, locale)`，popup 与 `interpolatePrompt` 共用——避免第三种分叉。
- locale 来源：popup 用 `navigator.language`；`interpolatePrompt` 若在 content script 调用，content script 的 `navigator.language` 与目标页一致（通常等于浏览器 locale，但若用户在 Discord 页面改过语言偏好……IM 页面的 `navigator.language` 反映的是浏览器而非平台账号语言，可接受）。
- **决策点**：是否让 `{{create_at}}` 受 locale storage（`items.ts:153` `localeItem`）影响？推荐"是"——与 popup 语言选择一致。
- 单测：固定 ISO，断言 en/zh_CN 两种 locale 下的输出；断言 `interpolatePrompt` 与 `CapturePreview` 输出一致。

**预警信号：**
- 投递消息里的时间带 `T...Z` 或时区错（如用户在 UTC+8 但显示 UTC）。
- 预览显示 `2026年6月19日`，投递显示 `2026-06-19`。

**应处理阶段：** 渲染核心 phase（`formatCreatedAt` 抽取）。

---

### 陷阱 T8：模板注入——snapshot 字段值里含 `{{...}}` 或平台语法，被二次解析或恶意触发

**问题表现：**
两个注入面：

**(a) 二次解析注入**：若 `interpolatePrompt` 对替换结果**递归扫描**（T3 已警告），则当 `snapshot.title` = `{{url}}`（网页标题恰好是这串字符，或被攻击者构造）时，`{{title}}` → `{{url}}` → 再替换成真实 url。攻击者可构造标题为 `{{content}}` 诱导用户 prompt 里 `{{title}}` 泄露全文。更隐蔽：标题含 `{{title}}` 自引用 → 无限循环。

**(b) 平台语法注入**：snapshot 字段值含平台敏感语法。例：抓取的页面 title = `@everyone`，prompt = `新文章：{{title}}`，Discord 渲染后触发 @everyone 全员通知。现有 `escapeMentions`（`discord-format.ts:47-50`）**只对 prompt/title/description/content 字段做 escape**——但如果 `{{title}}` 替换发生在 escape **之前**（T2 的分层：interpolate → compose），则替换进 prompt 的 title 文本会被后续 escape 覆盖到（因为 escape 作用域含 prompt）→ **安全**。但若分层搞反（先 escape 再 interpolate），escape 就漏了 → @everyone 被触发。

**原因：**
变量替换把"原本独立的字段"灌进了"prompt 文本流"，绕过了 formatter 对各字段分别施加的净化边界。

**如何避免：**
- **(a) 强制单次替换、不递归**（T3）：替换后的字符串不再扫描。这同时解决循环与注入。单测必须覆盖"title 字段值 = `{{url}}` 时 `{{title}}` 替换为字面 `{{url}}` 而非二次展开"。
- **(b) 严格保证分层顺序**：`interpolatePrompt`（纯替换）→ 喂给 `compose*` → formatter 内部对"含已替换变量的 prompt 整体"施加平台 escape。即 escape 作用在**替换后**的 prompt 字符串上，而非替换前。单测：title=`@everyone`、prompt=`{{title}}` → Discord 输出含零宽空格的 `@​everyone`。
- 文档化威胁模型：snapshot 字段是**半可信**的（来自任意网页，可能被攻击者构造），prompt 是**用户可信**的；变量替换让半可信内容进入用户文本流，**所有平台 escape 必须覆盖替换后的 prompt**。
- **隐私维度**（CLAUDE.md §隐私）：模板渲染本身不引入任何外发——snapshot 本就要发往 IM。但需确认 `interpolatePrompt` 不把 unknown 变量名等写入任何 storage / 遥测（项目无遥测，OK，但 code review 时核对）。

**预警信号：**
- Discord 频道被 `@everyone` 刷屏（escape 分层搞反）。
- 投递消息出现非预期字段（二次解析）。
- 长 prompt 渲染卡死浏览器（自引用无限循环）。

**应处理阶段：** 渲染核心 phase（分层顺序 + 单次替换是 acceptance criteria）+ 每个平台 formatter 的注入单测。

---

### 陷阱 T9：prompt 历史与 binding 存的是"含变量的原文"——切换 send_to 后变量失配

**问题表现：**
用户在 send_to = OpenClaw 的 binding 里存 prompt = `总结 {{content}}`（依赖 content）。切换到 send_to = Discord 时，binding 软覆盖（`SendForm.tsx:158-161` D-27 语义：仅当 `!promptDirty` 时自动填充）拉出同一个 `总结 {{content}}`。看似正常。但：

- 历史是**按 prompt 原文去重**的（`history.ts:32` `findIndex(e => e.value === value)`）。`总结 {{content}}` 和 `总结 {{content}} `（尾随空格）会被当成两条历史。用户从历史下拉选了一条，下次手敲一条，历史列表膨胀。
- 更隐蔽：同一 prompt 模板对不同 snapshot 渲染出不同文本，但**历史存的是模板原文**——这是**正确的**（要存模板才能复用），但开发者可能误以为"存渲染结果"，导致历史预览显示变量原文而非示例渲染。

**原因：**
历史/binding 的存储单元是字符串，与"它是模板还是成品"无关。功能正确性取决于**存储模板原文、仅在 UI 预览时渲染**。

**如何避免：**
- roadmap 明确：**历史与 binding 存原始 prompt 文本（含 `{{}}`）**，不存渲染结果。这与"prompt 是可复用模板"的语义一致，且无需 schema migration（`promptHistoryItem` / `bindingsItem` 的 `value`/`prompt` 仍是 string）。
- **不需要 schema 版本迁移**（`migrate.ts:1` `CURRENT_SCHEMA_VERSION = 1` 保持）——这是降低回归风险的关键。若有人为"加速渲染"给 binding 加 `cachedRender` 字段，反而引入缓存失效问题（snapshot 每次都变，缓存必失效）。**不要加缓存字段。**
- 历史下拉的**预览**：可在 Combobox option 的 label 里对 `{{title}}` 等做轻量高亮（区分变量与字面），但不做真实替换（因为下拉时还不知道目标 snapshot）。
- 单测：同一模板多次投递不同 snapshot → 历史只增一条（去重按原文）；切换 send_to → binding 拉出原文模板。

**预警信号：**
- 历史列表出现大量近似条目（尾随空格 / 大小写差异去重失败）。
- 用户切换 send_to 后 prompt 显示成"上次渲染的成品"而非模板。
- 有人提了带 `cachedRender` 的 schema v2 migration（**阻止**）。

**应处理阶段：** popup / history phase——存储语义澄清 + 单测。

---

### 陷阱 T10：i18n——变量名是英文，但 prompt 文案、warning、标签都要本地化；硬编码字符串 lint 会拦

**问题表现：**
- 变量名 `{{title}}` 等是**英文标识符**，不本地化（用户在任何语言下都写 `{{title}}`）。但**告诉用户有哪些变量可用**的文档/提示文案（如"可用变量：title, url, ..."）需本地化。
- warning 文案"未知变量 {{var}}"（T6）、时间标签（T7）需走 `t()`。
- **`tests/lint/no-hardcoded-strings.test.ts`**（`tests/lint/`）会拦截 JSX/TSX 中的硬编码字符串——任何在 popup 组件里写死的"可用变量列表"会让 CI 红。
- 现有 formatter 里 **discord-format / openclaw-format 硬编码了 `'采集时间:'`**（`discord-format.ts:44`、`openclaw-format.ts:26`）——这是**已存在的技术债**，本功能若动到这两个文件，顺手用 `t()` 修掉，否则 code review 会被质疑"为什么新代码走 i18n、隔壁老代码硬编码"。

**原因：**
纯工具函数（`*-format.ts`）历史上无法调 `t()`（content script 里 `t()` 可用，但 pure utility 约定无 WXT 依赖——见每个 format 文件头注释 "no WXT or chrome.* imports"）。`timestampLabel` 是作为**参数**从 content script 传入的（`discord.content.ts` 目前没传，走默认值 `'采集时间:'`；telegram/slack 的 content script 传了 `t('xxx_timestamp_label')`）。

**如何避免：**
- 变量名本身不本地化（英文 snake_case，与 snapshot 字段名一致）。
- 所有面向用户的文案（变量说明、warning、标签）走 `t()`，新增 i18n 键并在 en/zh_CN 双 locale 100% 覆盖，由 `scripts/i18n-coverage.ts` gate。
- `interpolatePrompt` 保持 pure（无 `t()`）——时间本地化通过把 `formatCreatedAt(iso, locale)` 的结果作为 `snapshot` 的派生字段传入，或由 content script 在调用前预处理。**不要**为图方便在 pure utility 里引入 `t()`，破坏现有分层。
- 修 `discord-format` / `openclaw-format` 的硬编码 `'采集时间:'`——让 content script 统一传 `timestampLabel`（与 telegram/slack 对齐）。

**预警信号：**
- `i18n-coverage` CI 红（新键只加了一边 locale）。
- `no-hardcoded-strings` CI 红。
- code review 指出"新老代码 i18n 风格不一致"。

**应处理阶段：** i18n phase（键 + 覆盖率）+ formatter 改动 phase（顺手修硬编码标签）。

---

### 陷阱 T11：content script / SW 重启场景下渲染的确定性——同一模板 + 同一 snapshot 必须渲染出同一字符串

**问题表现：**
SW 可能在 dispatch 中途被挂起重启（`dispatch-pipeline.ts:16-19` D-33）。`ADAPTER_DISPATCH` payload 在 SW 重启后从 `storage.session` 的 `dispatch:<id>` 记录恢复（`dispatch-pipeline.ts:151-163`，记录里存了原始 `prompt` + `snapshot`）。若渲染依赖**任何非常量上下文**（如 `new Date()`、`navigator.language` 在不同上下文取值不同、Math.random），则 SW 重启前预览的渲染结果 ≠ 重启后 content script 实际渲染的结果。

具体：`{{create_at}}` 若替换成"当前时间的相对时间"（如"3 分钟前"），SW 重启后 content script 再渲染会得到"5 分钟前"——预览与投递不一致。

**原因：**
渲染必须**仅依赖 (prompt, snapshot) 两个输入**，是纯函数。任何隐式依赖（当前时刻、随机、外部 locale storage 读取时机）都破坏确定性。

**如何避免：**
- `interpolatePrompt(prompt, snapshot)` 必须是**纯函数**——所有"当前时间"类需求只能用 `snapshot.create_at`（捕获时刻的固定值），**绝不用 `new Date()`**。
- locale 若参与渲染（T7 的 `formatCreatedAt`），locale 值作为**显式参数**传入（从 `localeItem` 读一次后传入），不函数内部读 storage。
- 单测：对同一 (prompt, snapshot) 断言输出稳定（可跑两次断言相等）；mock 不同 `now` 断言输出不变。

**预警信号：**
- SW 重启后投递的消息时间与预览不符。
- 同一 prompt 连续投递两次结果字符不同。

**应处理阶段：** 渲染核心 phase（纯函数契约 + 单测）。

---

## 中等陷阱

### 陷阱 M1：popup 预览的渲染性能——每次 keystroke 都全文替换 content

用户在 prompt 输入框打字，每个 `onInput`（`SendForm.tsx` prompt combobox）若触发 `interpolatePrompt` 含 `{{content}}` 的全量替换，长 content 下每键卡顿。
**预防：** 预览渲染加 debounce（参照 binding 的 800ms debounce `SendForm.tsx:129`）；或预览仅在 prompt 失焦/确认前渲染一次；或对 `{{content}}` 在预览里用占位（见 T5）。

### 陷阱 M2：变量名大小写 / 别名期待——用户写 `{{URL}}` / `{{link}}` / `{{created}}`

`{{URL}}`（大写）、`{{link}}`（url 的别名）、`{{created}}` / `{{createdAt}}`（驼峰）、`{{date}}`（create_at 的别名）都是用户合理猜测。若白名单只认 snake_case 小写，这些全部判 unknown + warning，UX 差。
**预防：** roadmap 决策——要么严格（只认 5 个 snake_case，文档明示，typo 走 warning），要么宽容（加常见别名表）。推荐**严格 + 文档**，避免别名表膨胀与"两个变量同一字段"的歧义。单测覆盖大小写拒绝。

### 陷阱 M3：Combobox 历史下拉显示变量原文，用户以为"坏了"

历史 option 显示 `总结 {{content}}`，不熟悉的用户以为字面要发 `{{content}}`。
**预防：** Combobox option label 对 `{{...}}` 做视觉区分（如灰色 / 等宽），暗示"这是变量"。或加 tooltip。i18n 提示"模板含变量"。

### 陷阱 M4：E2E fixture 覆盖——现有 dispatch.spec.ts 不含模板场景

`tests/e2e/dispatch.spec.ts` 验证的是无变量 prompt。本功能需补 E2E：含 `{{content}}` 的 prompt 在 Discord/Telegram/Slack/OpenClaw 各跑一遍，断言"content 恰好出现一次"（T1）+ "未知变量原样保留"（T6）。
**预防：** roadmap 列 E2E 扩展为独立 plan；适配器 selector 仍在已提交 DOM fixture 上验证（CLAUDE.md §测试），新增含变量的 fixture。

---

## 轻微陷阱

### 陷阱 L1：变量文档漂移

变量列表（5 个）若分散在多处（popup tooltip、README、marketing site `apps/marketing`、CLAUDE.md），易腐化。`verify:claims` CI gate（v1.2 引入）目前校验 marketing claim，可扩展校验"文档列出的变量集 == 代码白名单"。
**预防：** 变量白名单定义为单一 `const TEMPLATE_VARS = ['title','url','description','create_at','content'] as const`（shared/），所有文档与代码引用它。

### 陷阱 L2：`{{create_at}}` 与现有 formatter 的 `采集时间:` 标签重复

若用户 prompt = `时间 {{create_at}}`，而 Discord formatter 又 auto-append `> 采集时间: <iso>`（T1 模型 B 下），时间出现两次。
**预防：** T1 模型 A（含变量则不 auto-append）天然解决；模型 B 下需特别处理。

### 陷阱 L3：测试 fixture 里 `{{` 字符与 YAML locale 文件冲突

`vite-plugins/yaml-locale.ts` 处理 i18n YAML。若 locale 值里含 `{{var}}`（如 warning 文案"未知变量 {{var}}"），需确认 YAML 解析 + `t()` 占位替换不与模板变量冲突。`@wxt-dev/i18n` 的占位语法通常是 `{var}` 单括号，与双括号 `{{var}}` 不冲突——但需验证，避免 warning 文案里的 `{var}` 被 i18n 吞掉。

---

## 阶段对照表（给 roadmap 用）

| Phase 主题 | 最可能踩的陷阱 | 缓解（本表行号） | 建议单测/验收 |
|-----------|---------------|-----------------|--------------|
| 模板渲染核心（`interpolatePrompt` 纯函数） | T1, T2, T3, T7, T8, T11 | 模型 A 裁定 / 单一纯函数 / 边界矩阵 / create_at 真值 / 单次替换防注入 / 确定性 | 边界矩阵全表 + 注入用例 + 确定性（同输入两次相等）|
| popup 预览 + warning UX | T2, T4, T6, M1, M3 | 预览走同一纯函数 / 空值如实展示 / unknown 非阻断标红 / 渲染 debounce / Combobox 视觉区分 | 预览字符数 = 投递字符数（除平台截断）|
| 平台 formatter 改动（4 个 `*-format.ts`） | T1, T8(b), T10, L2 | 含变量跳过 auto-append / escape 在替换后 / 硬编码标签改 `t()` / 时间不重复 | 每 formatter：content 恰好一次 + mention escape 覆盖替换后 prompt |
| i18n | T6, T10, L3 | 新键双 locale 100% / 变量名不本地化 / YAML 占位不冲突 | `i18n-coverage` + `no-hardcoded-strings` CI 绿 |
| prompt 长度 / 大 content | T5 | 渲染后长度校验 + 专门 error code / 预览截断提示 | 20 万字 content + `{{content}}` 不崩 |
| 历史 / binding 语义 | T9, M2 | 存模板原文 / 无 schema 迁移 / 变量白名单严格 | 同模板多次投递历史去重 |
| E2E | M4, T1 | 4 平台各跑含变量 prompt | content 出现一次 + unknown 保留 |

---

## 置信度评估

| 领域 | 置信度 | 理由 |
|------|--------|------|
| 现有架构事实（prompt-first auto-append / 跨边界原始 prompt / create_at 双重表示） | HIGH | 直接读 `dispatch-pipeline.ts` / 4 个 `*-format.ts` / `capture.ts` / `CapturePreview.tsx` 源码确认 |
| T1 模型 A/B 冲突 | HIGH | 这是本功能与现有代码的结构性矛盾，无法回避 |
| T3 边界矩阵 | HIGH | 通用模板解析陷阱，多源印证 |
| T7 create_at 真值选择 | MEDIUM | "替换成本地化绝对时间"是推荐，非唯一解；roadmap 可裁 ISO |
| T8 注入分层顺序 | HIGH | 现有 escape 作用域（`discord-format.ts:47-50` 注释明示）直接决定分层必须 interpolate→escape |
| T9 无需 schema 迁移 | HIGH | `migrate.ts` / `items.ts` 现状直接支撑 |
| 各平台 DOM 细节（M4 E2E） | 不适用 | 本功能不改 selector，沿用 v1.1 已验证 fixture |

---

## 来源

- 源码审查（HIGH）：`background/dispatch-pipeline.ts`、`background/capture-pipeline.ts`、`shared/adapters/{discord,slack,telegram,openclaw}-format.ts`、`shared/adapters/types.ts`、`shared/storage/items.ts`、`shared/storage/migrate.ts`、`shared/storage/repos/{history,binding}.ts`、`shared/messaging/routes/{capture,dispatch}.ts`、`entrypoints/discord.content.ts`、`entrypoints/popup/components/{CapturePreview,SendForm}.tsx`、`tests/lint/no-hardcoded-strings.test.ts`
- 项目约束（HIGH）：`CLAUDE.md`（§技术栈 / §约定 / §架构 / §隐私 / §测试 / GSD 工作流）
- 里程碑上下文（HIGH）：`.planning/PROJECT.md`、`.planning/STATE.md`
