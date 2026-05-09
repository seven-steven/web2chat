# Phase 6: i18n 加固 + 打磨 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 06-i18n
**Areas discussed:** 运行时 Locale 切换, ESLint 硬编码检测, Settings 语言切换 UX

---

## 运行时 Locale 切换

### Q1: 核心架构

| Option | Description | Selected |
|--------|-------------|----------|
| Signal-based t() 替换 | shared/i18n/index.ts 重写为 signal-based locale store。构建时 YAML 打包为 JSON dict，t() 读取 signal 内的当前 locale dict。切换 locale 更新 signal，Preact 自动重渲染。manifest __MSG_*__ 保留走 chrome.i18n。所有现有 t('key') 调用无需改动。 | ✓ |
| 重载扩展切换 | 保留 @wxt-dev/i18n 的 t()，切换语言时通过 chrome.runtime.reload() 重载扩展。简单但违反"不重载扩展"的成功标准。 | |
| Context Provider 方案 | 用 preact-i18n 或自建 Context Provider + useContext 方案，代替 signal。更传统但比 signal 多一层 context re-render。 | |

**User's choice:** Signal-based t() 替换
**Notes:** 无额外说明

### Q2: YAML 打包方式

| Option | Description | Selected |
|--------|-------------|----------|
| Vite 构建时转换 | Vite YAML import plugin 构建时把 en.yml / zh_CN.yml 转为 JS 对象，通过 import 引入。零运行时解析开销。 | ✓ |
| 运行时 fetch JSON | 写一个脚本把 YAML 转为 .json 文件，保存在 assets/ 下，运行时 fetch 加载。支持动态加载但有网络开销。 | |
| Claude 裁定 | 交给 planner 决定具体的打包方案。 | |

**User's choice:** Vite 构建时转换
**Notes:** 无额外说明

### Q3: 生效范围

| Option | Description | Selected |
|--------|-------------|----------|
| 立即生效 | 切换时仅更新 signal，popup/options 里当前已挂载的 UI 立即响应。下次打开 popup 也读取存储的 locale。SW 不受影响。 | ✓ |
| 下次打开生效 | 切换后存储到 chrome.storage.local，下次打开 popup/options 时才生效。实现更简单但体验不符合成功标准。 | |

**User's choice:** 立即生效
**Notes:** 无额外说明

### Q4: t() 的 signal 包装方式

| Option | Description | Selected |
|--------|-------------|----------|
| t() 内部读 signal | t('key') 返回纯字符串，内部读取 signal .value。在 Preact 组件内调用时自动跟踪依赖。所有现有 t() 调用不需要改动 API。非组件上下文（如 SW）不响应——但 SW 无 UI。 | ✓ |
| t() 返回 Signal | t() 返回 Signal 对象而非 string，调用方需要 .value。所有现有 t() 调用都要改。 | |
| Claude 裁定 | 具体 signal 包装方式交给 planner。 | |

**User's choice:** t() 内部读 signal
**Notes:** 无额外说明

---

## ESLint 硬编码检测

### Q1: 方案选型

| Option | Description | Selected |
|--------|-------------|----------|
| 自定义规则 | 在 eslint-local-rules/ 下写一个自定义规则。精确控制启发式：CJK 字符即拦截，英文只检测大写开头的词组。排除 class/aria/data-*/key/testid 等属性值。无外部依赖，完全可控。 | ✓ |
| 现有插件 | 使用 eslint-plugin-i18next 的 no-literal-string 规则，配置白名单。开箱即用但启发式不一定匹配项目需求，可能误报多。 | |
| Claude 裁定 | 交给 planner 确定具体实现方式。 | |

**User's choice:** 自定义规则
**Notes:** 无额外说明

### Q2: 检测范围

| Option | Description | Selected |
|--------|-------------|----------|
| JSX 文本 + 表达式 | JSXText 节点 + JSXExpressionContainer 内的字符串字面量。不检查属性值。CJK 范围为 一-鿿 + 㐀-䶿，英文为大写开头且长度 >= 2 的词组。排除纯空白/纯标点/纯数字。 | ✓ |
| 含语义属性 | 除上述外，还检查 title/alt/placeholder/label 等语义属性的字符串值。更严格但可能误报 aria-label。 | |
| Claude 裁定 | 具体检测范围交给 planner。 | |

**User's choice:** JSX 文本 + 表达式
**Notes:** 无额外说明

### Q3: Fixture 测试

| Option | Description | Selected |
|--------|-------------|----------|
| 加 fixture 测试 | 添加 tests/lint/no-hardcoded-strings.fixture.tsx 测试文件，有意包含硬编码字符串。通过 Vitest 调用 ESLint API 对 fixture 执行规则，断言报告了预期数量的错误。 | ✓ |
| 不加 fixture | 只验证现有代码 lint 过，不单独测规则本身。 | |

**User's choice:** 加 fixture 测试
**Notes:** ROADMAP 成功标准 #4 明确要求此验证

---

## Settings 语言切换 UX

### Q1: 控件形态

| Option | Description | Selected |
|--------|-------------|----------|
| Native `<select>` | 简洁的 select 下拉，两个选项：简体中文 / English。切换即存储 + 即时生效。v1 只有两个 locale 不需要复杂控件。 | ✓ |
| Radio group | 自定义样式的 radio button 组，带国旗/语言名。更美观但对两个选项 overkill。 | |
| Claude 裁定 | UI 形态交给 planner。 | |

**User's choice:** Native `<select>`
**Notes:** 无额外说明

### Q2: 位置

| Option | Description | Selected |
|--------|-------------|----------|
| 页面顶部 | 选择器放在 Options page 标题行同行或下方，在所有 section card 之前。切换后整个 options page 立即用新语言渲染。 | ✓ |
| Section card | 作为第三个 section card，和 Reset/Granted Origins 并列。位置在现有占位的地方。 | |

**User's choice:** 页面顶部
**Notes:** 无额外说明

### Q3: 默认 locale 策略

| Option | Description | Selected |
|--------|-------------|----------|
| 默认跟随浏览器 | 从 navigator.language 推断。用户显式选择后覆盖存储到 storage。可加一个"跟随浏览器"选项恢复自动检测。 | ✓ |
| 固定默认 en | 默认 en，不管浏览器语言。简单但用户体验差。 | |

**User's choice:** 默认跟随浏览器
**Notes:** 无额外说明

---

## Claude's Discretion

- Vite YAML plugin 的具体选型
- i18n coverage 测试的具体实现
- `t()` 的 placeholder/substitution 语法保持方式
- Locale signal 的精确 Preact/signals 集成方式
- ESLint 自定义规则的精确文件位置

## Deferred Ideas

None — discussion stayed within phase scope
