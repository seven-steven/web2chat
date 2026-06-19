# Requirements: web2chat v2.0 — Prompt 模板变量引用

**Defined:** 2026-06-19
**Core Value:** 让用户用一次点击，把“当前网页的格式化信息 + 预设 prompt”投递到指定的 IM 会话或 AI Agent 会话。

## v2.0 Requirements

本 milestone 为 prompt 增加 `{{field}}` 模板变量引用能力。每个 requirement 映射到 roadmap phase；完成标准是实现、验证、提交。

### Template Semantics

- [ ] **TPL-01**: 用户可以在 prompt 中使用 `{{title}}` / `{{url}}` / `{{description}}` / `{{create_at}}` / `{{content}}` 引用当前 snapshot 字段。
- [ ] **TPL-02**: 用户可以在变量名两侧添加空格（如 `{{ title }}`），但变量名大小写敏感（`{{Title}}` 不等于 `{{title}}`）。
- [ ] **TPL-03**: 用户输入未知变量或 typo（如 `{{dedcription}}`）时，变量原样保留，并生成非阻断 warning。
- [ ] **TPL-04**: 用户引用已知但为空的字段时，变量替换为空串；替换为单次、非递归，snapshot 值中的 `{{...}}` 不会二次展开。
- [ ] **TPL-05**: 用户引用 `{{create_at}}` 时，得到 snapshot 原始 ISO 字符串，不做本地化、不加标签。
- [ ] **TPL-06**: 用户引用 `{{content}}` 时支持长正文展开；系统在渲染后进行专门长度校验，并在超限时给出用户可理解的错误提示，不落入模糊 INTERNAL。

### Preview & UX

- [ ] **PRV-01**: 用户可以在 popup 中看到渲染后的 prompt 预览，且预览与实际 dispatch 使用同一渲染函数。
- [ ] **PRV-02**: 用户编辑 prompt 或 snapshot 字段后，预览自动更新。
- [ ] **PRV-03**: 用户在 prompt 中输入未知变量时，popup 显示非阻断提示，不阻止发送。
- [ ] **PRV-04**: 用户可以通过 prompt UI 的快捷入口插入 5 个可用变量。
- [ ] **PRV-05**: 用户可以看到平台级完整预览，反映目标平台 composer 的自动追加/跳过、escape、mrkdwn 转换和截断结果。

### Dispatch & Persistence

- [ ] **DSP-01**: 用户点击发送后，dispatch 使用与 popup 预览一致的渲染结果。
- [ ] **DSP-02**: 系统采用模型 A：prompt 含已识别变量时跳过自动追加 snapshot；无已识别变量时保持旧的 prompt-first auto-append 行为。
- [ ] **DSP-03**: 系统对替换后的内容继续应用目标平台 escape/转换，防止 `@everyone` 等 mention 注入回归。
- [ ] **DSP-04**: 系统在 prompt history、binding、draft 中保存原始模板字符串，而不是某次网页的渲染结果。
- [ ] **DSP-05**: OpenClaw / Discord / Slack / Telegram 现有无变量 prompt 投递行为不回退。

### Quality / i18n

- [ ] **QLT-01**: 所有新增模板提示、warning、变量插入文案均走 i18n，en / zh_CN locale 100% 覆盖。
- [ ] **QLT-02**: 单元测试覆盖变量替换边界矩阵、未知变量、空值、大小写敏感、非递归、长 content。
- [ ] **QLT-03**: E2E 或 fixture 测试覆盖 4 个平台含变量 prompt，断言 `{{content}}` 不重复、未知变量保留、旧 prompt 行为不变。

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Template Library

- **TPLLIB-01**: 用户可以创建和命名多个 prompt 模板。
- **TPLLIB-02**: 用户可以管理模板库（搜索、编辑、删除、排序）。
- **TPLLIB-03**: 用户可以为不同 send_to 配置不同模板默认值之外的变量配置。

### User-defined Variables

- **UVAR-01**: 用户可以定义自定义变量（例如 `{{audience}}` / `{{tone}}`）。
- **UVAR-02**: 用户可以选择全局或 per-binding 的自定义变量作用域。
- **UVAR-03**: 系统可以禁止或管理自定义变量 shadow 内置字段名。

### Date Formatting

- **DATE-01**: 用户可以引用本地化后的 capture time 变量。
- **DATE-02**: 用户可以选择日期格式或使用格式化 token 变体。

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| user-defined variables / per-binding variables | 本 milestone 只覆盖固定 ArticleSnapshot 字段；引入变量作用域会触发 storage schema 与 UX 范围膨胀 |
| named template library / template editor | PROJECT.md 已列为 v2+ 候选；本轮只让现有 prompt 文本支持变量引用 |
| filters / conditionals / nested paths / alias table | 会把固定字段替换扩张为模板引擎，增加 parser 与文档复杂度 |
| `create_at` 本地化变体 | 本轮采用原始 ISO，保持渲染纯函数确定性；本地化变体另行评估 |
| AI 总结或改写变量值 | 扩展本身不调用 LLM，用户 prompt 由下游 Agent 处理 |
| 新增 snapshot 字段 | 复用现有 `title` / `url` / `description` / `create_at` / `content`，避免扩大抓取与隐私表面积 |
| 平台专属变量命名空间 | 保持跨平台 prompt 模板一致，避免 adapter 逻辑泄漏到用户模板 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TPL-01 | Phase 17 | Pending |
| TPL-02 | Phase 17 | Pending |
| TPL-03 | Phase 17 | Pending |
| TPL-04 | Phase 17 | Pending |
| TPL-05 | Phase 17 | Pending |
| TPL-06 | Phase 18 | Pending |
| DSP-01 | Phase 18 | Pending |
| DSP-02 | Phase 18 | Pending |
| DSP-03 | Phase 18 | Pending |
| DSP-04 | Phase 18 | Pending |
| DSP-05 | Phase 18 | Pending |
| PRV-01 | Phase 19 | Pending |
| PRV-02 | Phase 19 | Pending |
| PRV-03 | Phase 19 | Pending |
| PRV-04 | Phase 19 | Pending |
| PRV-05 | Phase 19 | Pending |
| QLT-01 | Phase 19 | Pending |
| QLT-02 | Phase 17 | Pending |
| QLT-03 | Phase 20 | Pending |

**Coverage:**
- v2.0 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-19*
*Last updated: 2026-06-19 after roadmap creation*
