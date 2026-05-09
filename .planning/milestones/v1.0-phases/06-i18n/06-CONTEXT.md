# Phase 6: i18n 加固 + 打磨 - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 交付完整的国际化加固：

1. **运行时 locale 切换**：用户在 settings 切换语言后，popup/options 当前已挂载的 UI 立即更新，无需重载扩展（I18N-02）
2. **i18n 覆盖率审计**：`pnpm test:i18n-coverage` 断言 en + zh_CN locale 文件 100% 覆盖代码中所有 `t()` 引用的键，含 Phase 4 + Phase 5 适配器错误信息（I18N-01）
3. **ESLint 硬编码字符串守护**：flat-config 自定义规则拦截 JSX/TSX 中的 CJK + 大写英文硬编码字符串，CI 运行（I18N-03）
4. **manifest 本地化验证**：manifest.json 的 name/description/default_title 使用 `__MSG_*__` 占位符（I18N-04 — 已在 Phase 1 落地，Phase 6 仅验证完整性）

Phase 6 **不包含**：

- PRIVACY.md（Phase 7）
- README 双语章节（Phase 7）
- Web Store 打包（Phase 7）
- 新增适配器或投递功能（v2）
- 新增 locale 语言（v2 — v1 仅 en + zh_CN）

</domain>

<decisions>
## Implementation Decisions

### 1. 运行时 Locale 切换架构 (D-73..D-76)

- **D-73:** **Signal-based `t()` 替换**。重写 `shared/i18n/index.ts`，用 `@preact/signals` 构建 locale store。当前 locale dict 存储在 signal 中，`t('key')` 内部读取 signal `.value` 获取翻译文本，返回纯字符串。Preact 组件中调用 `t()` 时自动跟踪 signal 依赖，切换 locale 触发 signal 更新，所有使用 `t()` 的组件立即重渲染。所有现有 `t('key')` 调用无需改动 API。manifest `__MSG_*__` 占位仍走 `chrome.i18n`（无法绕过，浏览器控制）。
- **D-74:** **Vite 构建时 YAML→JS 转换**。通过 Vite YAML import plugin 在构建时把 `locales/en.yml` / `locales/zh_CN.yml` 转为 JS 对象，通过 `import en from '../locales/en.yml'` 引入。零运行时解析开销。
- **D-75:** **切换立即生效**。用户在 settings 切换 locale 后：(1) 更新 signal 中的 locale dict；(2) 当前已挂载的 popup/options UI 立即用新语言重渲染；(3) 选择持久化到 `chrome.storage.local`；(4) 下次打开 popup 也读取存储的 locale。SW 不受影响（无 UI）。
- **D-76:** **默认跟随浏览器语言**。未手动选择时，locale 从 `navigator.language` 推断（zh 系列 → zh_CN，其他 → en）。用户显式选择后覆盖存储到 `chrome.storage.local`。可在 settings 恢复"跟随浏览器"选项以清除覆盖。

### 2. ESLint 硬编码字符串检测 (D-77..D-79)

- **D-77:** **自定义 ESLint 规则**。在项目内编写自定义规则（eslint-local-rules 或直接 flat-config inline plugin），无外部依赖。精确控制检测启发式，避免第三方插件的通用启发式导致误报。
- **D-78:** **检测范围 = JSX 文本 + 表达式内字符串**。检测 JSXText 节点 + JSXExpressionContainer 内的字符串字面量。不检测 JSX 属性值（class/key/testid/aria/data-* 等不是用户可见文本）。CJK 检测范围：`一-鿿` + `㐀-䶿`（CJK Unified Ideographs + Extension A）。英文检测：大写开头且长度 >= 2 的词组（排除单字母如 `"X"`、纯数字、纯标点/空白）。
- **D-79:** **Fixture 测试验证拦截能力**。添加 `tests/lint/no-hardcoded-strings.fixture.tsx` 测试文件，有意包含 `<button>Send</button>` 等硬编码字符串。通过 Vitest 调用 ESLint API 对 fixture 执行规则，断言报告了预期数量的错误。ROADMAP 成功标准 #4 要求此验证。

### 3. Settings 语言切换 UX (D-80..D-82)

- **D-80:** **Native `<select>` 下拉**。两个选项：简体中文 / English。切换即存储 + 即时生效，无需"保存"按钮。v1 只有两个 locale，原生 select 最简洁直接。
- **D-81:** **页面顶部位置**。Language 选择器放在 Options page 标题行同行或下方，在所有 section card 之前。切换后整个 options page 立即用新语言渲染，用户可以立即看到效果。替换现有的 `ReservedSection` 占位。
- **D-82:** **"跟随浏览器"选项**。select 下拉中增加一个"Auto (跟随浏览器)" / "Auto (follow browser)" 选项作为默认值。选择此项时清除 storage 中的 locale 覆盖，回退到 `navigator.language` 推断。

### Claude's Discretion

下列决策委托给 plan 阶段：

- **Vite YAML plugin 的具体选型**：`@modyfi/vite-plugin-yaml` 或自写小 plugin，由研究阶段确定兼容性。
- **i18n coverage 测试的具体实现**：静态分析 `t('...')` 调用 vs locale 键的匹配脚本形态。
- **`t()` 的 placeholder/substitution 语法**：当前 `@wxt-dev/i18n` 用 `$1$` 占位。替换为自定义 `t()` 后，substitution 语法是否保持 `$1$` 还是切换到 `{0}` 等，由 planner 按最小改动原则决定。
- **Locale signal 的精确 Preact/signals 集成方式**：computed signal 还是 effect + signal，由 planner 按性能与简洁度裁定。
- **ESLint 自定义规则的精确文件位置**：`eslint-local-rules/` 目录 vs flat-config inline plugin，由 planner 决定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目顶层上下文
- `CLAUDE.md` — i18n 约定（`t()` facade、YAML locale 默认路径、`__MSG_*__` manifest 占位、ESLint 拦截硬编码字符串）；Preact JSX 属性命名约定（`for` 非 `htmlFor`、原生 SVG 属性）
- `.planning/PROJECT.md` — 核心价值、约束、i18n 要求
- `.planning/REQUIREMENTS.md` §i18n — I18N-01..I18N-04 具体验收标准

### i18n 基础设施
- `shared/i18n/index.ts` — 当前 `t()` 实现（薄 re-export，Phase 6 重写目标）
- `locales/en.yml` / `locales/zh_CN.yml` — 当前 255 行 locale 文件（Phase 6 审计目标）

### 先前 phase 决策
- `.planning/phases/03-dispatch-popup/03-CONTEXT.md` §D-30 — Combobox ARIA 结构（Phase 6 a11y 审计参考）
- `.planning/phases/04-openclaw/04-CONTEXT.md` §D-42..D-46 — 权限授权 UX / Options page 已有区块
- `.planning/phases/05-discord/05-CONTEXT.md` §D-59..D-61 — Discord ToS 脚注 i18n 命名空间 `discord.tos.*`

### STATE.md 决策记录
- `.planning/STATE.md` §决策 — WXT i18n 0.2.5 YAML locale 路径、tuple substitution、Preact JSX 约定等跨 phase 决策

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shared/i18n/index.ts` — 当前 `t()` 薄 re-export，Phase 6 重写为 signal-based 实现
- `entrypoints/options/App.tsx` — `ReservedSection` 占位组件，Phase 6 替换为真实 Language 选择器
- `shared/storage/items.ts` — typed storage items 模式，新增 `locale` item
- `entrypoints/options/components/` — ConfirmDialog、GrantedOriginsSection、ResetSection 组件可参考风格

### Established Patterns
- **Signal 状态管理**：popup 用 `@preact/signals` module-level signal（Phase 2 建立）
- **Typed storage items**：`WxtStorage.defineItem<T>` + version + migrations（Phase 1 建立）
- **i18n 三段式拆键**：before/icon/after 模式用于内嵌元素引用（Phase 2 建立）
- **ESLint flat-config**：`eslint.config.ts` 已有 typescript-eslint + parserOptions.projectService

### Integration Points
- 所有 popup/options 组件的 `t()` 调用 — Phase 6 重写 `shared/i18n/index.ts` 后自动切换实现
- `entrypoints/options/App.tsx` — 替换 `ReservedSection` 为 Language selector
- `eslint.config.ts` — 新增自定义硬编码字符串规则
- `package.json` — 新增 `test:i18n-coverage` script

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-i18n*
*Context gathered: 2026-05-06*
