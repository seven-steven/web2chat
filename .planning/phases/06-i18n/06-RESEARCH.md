# Phase 6: i18n 加固 + 打磨 - Research

**Researched:** 2026-05-07
**Domain:** Chrome extension i18n runtime switching, ESLint custom rules, YAML build-time import, i18n coverage auditing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**运行时 Locale 切换架构 (D-73..D-76)**
- **D-73:** Signal-based `t()` 替换。重写 `shared/i18n/index.ts`，用 `@preact/signals` 构建 locale store。当前 locale dict 存储在 signal 中，`t('key')` 内部读取 signal `.value` 获取翻译文本，返回纯字符串。Preact 组件中调用 `t()` 时自动跟踪 signal 依赖，切换 locale 触发 signal 更新，所有使用 `t()` 的组件立即重渲染。所有现有 `t('key')` 调用无需改动 API。manifest `__MSG_*__` 占位仍走 `chrome.i18n`（无法绕过，浏览器控制）。
- **D-74:** Vite 构建时 YAML→JS 转换。通过 Vite YAML import plugin 在构建时把 `locales/en.yml` / `locales/zh_CN.yml` 转为 JS 对象，通过 `import en from '../locales/en.yml'` 引入。零运行时解析开销。
- **D-75:** 切换立即生效。用户在 settings 切换 locale 后：(1) 更新 signal 中的 locale dict；(2) 当前已挂载的 popup/options UI 立即用新语言重渲染；(3) 选择持久化到 `chrome.storage.local`；(4) 下次打开 popup 也读取存储的 locale。SW 不受影响（无 UI）。
- **D-76:** 默认跟随浏览器语言。未手动选择时，locale 从 `navigator.language` 推断（zh 系列 → zh_CN，其他 → en）。用户显式选择后覆盖存储到 `chrome.storage.local`。可在 settings 恢复"跟随浏览器"选项以清除覆盖。

**ESLint 硬编码字符串检测 (D-77..D-79)**
- **D-77:** 自定义 ESLint 规则，项目内编写（eslint-local-rules 或 flat-config inline plugin），无外部依赖。
- **D-78:** 检测范围 = JSXText 节点 + JSXExpressionContainer 内的字符串字面量。CJK 范围：`一-鿿` + `㐀-䶿`。英文检测：大写开头且长度 >= 2 的词组（排除单字母、纯数字、纯标点/空白）。不检测 JSX 属性值（class/key/testid/aria/data-* 等不是用户可见文本）。
- **D-79:** Fixture 测试验证拦截能力。`tests/lint/no-hardcoded-strings.fixture.tsx` + Vitest 调用 ESLint API，断言报告预期数量的错误。

**Settings 语言切换 UX (D-80..D-82)**
- **D-80:** Native `<select>` 下拉，两个选项：简体中文 / English。切换即存储 + 即时生效，无需"保存"按钮。
- **D-81:** 页面顶部位置。Language 选择器放在 Options page 顶部，替换 `ReservedSection` 占位。
- **D-82:** "跟随浏览器"选项。select 下拉增加 "Auto (跟随浏览器)" / "Auto (follow browser)" 选项作为默认值，选择此项清除 storage 覆盖。

### Claude's Discretion

- Vite YAML plugin 的具体选型：`@modyfi/vite-plugin-yaml` 或自写小 plugin
- i18n coverage 测试的具体实现形态（静态分析脚本）
- `t()` 的 placeholder/substitution 语法（保持 `$1$` 还是切换，按最小改动原则）
- Locale signal 的精确 Preact/signals 集成方式（computed signal 还是 effect + signal）
- ESLint 自定义规则的精确文件位置（`eslint-local-rules/` 目录 vs flat-config inline plugin）

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| I18N-01 | 全部 popup/options/错误消息文案均通过 i18n 接口产出，`zh_CN` 与 `en` 两份 locale 文件覆盖率 100% | Coverage gap analysis confirms 3 categories of discrepancy; `scripts/i18n-coverage.ts` handles all |
| I18N-02 | 用户可在设置面板切换 UI 语言；切换在不重载扩展的前提下立即生效 | Signal-based t() pattern confirmed compatible with existing @preact/signals 2.9.0 usage |
| I18N-03 | ESLint 规则禁止 JSX/TSX 中出现非 i18n 的硬编码用户可见字符串 | ESLint 9.39.4 RuleTester API verified; existing lightweight rule provides upgrade base |
| I18N-04 | manifest.json 的 name/description/default_title 通过 `__MSG_*__` 本地化 | ALREADY DONE in wxt.config.ts (Phase 1); Phase 6 adds assertion to verify-manifest.ts |
</phase_requirements>

---

## Summary

Phase 6 是一个纯基础设施加固 phase，改造现有 `@wxt-dev/i18n` 集成使其支持运行时语言切换、补齐 i18n 覆盖率、添加 ESLint 守护规则。**无新的用户可见界面**，除了 Options 页新增的 Language 选择器（替换 `ReservedSection` 占位）。

核心技术挑战是：`@wxt-dev/i18n` 的 `t()` 在运行时调用 `chrome.i18n.getMessage()`，而 `chrome.i18n` 无法在不重启扩展的情况下切换语言。解决方案（D-73/D-74）是：在构建时将 YAML locale 文件转换为 JS 对象导入，并用 `@preact/signals` 构建响应式 locale store，`t()` 从 signal 读取当前 locale dict，Preact 自动跟踪依赖并在切换时重渲染。

**当前代码库状态已非常接近完成**：manifest `__MSG_*__` 在 Phase 1 已落地（I18N-04 基本完成，仅需 verify-manifest.ts 覆盖验证）；en.yml/zh_CN.yml 各 100 个键完全对称；仅需重写 `shared/i18n/index.ts`、添加 Vite YAML plugin、增加 Language selector UI、编写 ESLint 规则和覆盖率脚本。

**Primary recommendation:** 使用 `yaml` npm 包编写内联 Vite plugin（比 `@modyfi/vite-plugin-yaml` 更少依赖），保持 `t(key, [substitutions])` API 兼容，用 `computed()` signal 封装当前 locale dict，配合现有 `WxtStorage.defineItem<string | null>` 存储用户偏好。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale dict 加载 | Build-time (Vite plugin) | — | YAML→JS 在构建时转换，零运行时解析开销 (D-74) |
| Locale signal / t() | Frontend (popup/options JS bundle) | — | Preact signal 只存在于 UI 上下文；SW 无 UI 无需 locale |
| Locale 持久化 | Storage (chrome.storage.local) | — | 走 typed storage item，与其他用户设置一致 |
| Language selector UI | Frontend (options page) | — | 替换 ReservedSection 占位，标准 card 布局 |
| manifest 本地化 | Build-time (wxt.config.ts) | chrome extension runtime | `__MSG_*__` 由浏览器在 extension load 时解析，无法运行时切换 |
| i18n 覆盖率断言 | Build/CI (Node.js script) | — | 静态分析脚本，不依赖浏览器环境 |
| ESLint 硬编码守护 | Lint (ESLint flat-config) | CI | 构建前拦截，CI 强制 |

---

## Standard Stack

### Core（已安装）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@preact/signals` | 2.9.0 | Locale signal + reactivity | Phase 2 已建立模式，popup module-level signals |
| `@wxt-dev/i18n` | 0.2.5 | YAML locale 编译为 `_locales/*/messages.json` | WXT 内置 module，manifest 本地化仍需它 |
| `eslint` | 9.39.4 | 自定义规则 + RuleTester | 项目已用 flat-config |
| `typescript-eslint` | 8.20.0 | TSX parser（自定义规则需要） | 项目已配置 projectService |
| `vitest` | 3.2.4 | ESLint 规则 fixture 测试 | 项目标准测试框架 |

### Supporting（需新增）

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `yaml` | 2.8.4 | Vite plugin 中解析 WXT YAML locale 格式 | 构建时；运行时无此包 |

验证：`npm view yaml version` → `2.8.4` [VERIFIED: npm registry]

**Installation:**
```bash
pnpm add -D yaml
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `yaml` (inline plugin) | `@modyfi/vite-plugin-yaml` | @modyfi 版本需 peerDeps vite >= 3.2.7（兼容），但引入额外 dep (js-yaml, tosource)；inline plugin 用已决定引入的 `yaml` 包更轻量 |
| `yaml` | `js-yaml` | js-yaml 未安装，yaml 是更现代的替代，类型支持更好 |
| computed signal | effect + signal | computed 更声明式，依赖自动跟踪；不需要手动 dispose；语义更清晰 |

---

## Architecture Patterns

### System Architecture Diagram

```
构建时 (Build time)
─────────────────────────────────────────────────────
locales/en.yml ─┐
                ├─► Vite YAML Plugin ─► JS 对象 (import en from '...yml')
locales/zh_CN.yml ─┘                   └─► tree-shaken into bundle

运行时 (Runtime — popup/options)
─────────────────────────────────────────────────────
chrome.storage.local ['local:locale']
  │ (on mount: read saved preference)
  ▼
localeSig = signal<LocaleDict>    ← setLocale() writes here
  │ (Preact auto-tracks reads)
  ▼
t('key', [subs])                  ← all components call this
  │ reads localeSig.value
  ▼
resolved string → Preact text node

Language selector (Options page)
  │ onChange: setLocale(newLocale) + write to storage
  └─► localeSig.value = newDict → all components re-render

构建时 (manifest)
─────────────────────────────────────────────────────
wxt.config.ts manifest.name = '__MSG_extension_name__'
  └─► chrome browser resolves at extension load (fixed to browser UI locale)
```

### Recommended Project Structure

```
shared/
├── i18n/
│   └── index.ts          # 重写：signal-based locale store + t()
├── storage/
│   └── items.ts          # 新增 localeItem (WxtStorage.defineItem<string | null>)
entrypoints/
├── options/
│   ├── App.tsx           # 替换 ReservedSection → LanguageSection
│   └── components/
│       └── LanguageSection.tsx  # 新增：<select> 语言切换器
locales/
├── en.yml                # 新增 i18n_language_* 键
└── zh_CN.yml             # 同上
scripts/
└── i18n-coverage.ts      # 新增：覆盖率审计脚本
tests/
├── unit/
│   ├── i18n/
│   │   └── locale-switch.spec.ts  # 测试 t() + setLocale()
│   └── scripts/
│       └── i18n-coverage.spec.ts  # 测试覆盖率脚本逻辑
└── lint/
    └── no-hardcoded-strings.fixture.tsx  # ESLint 规则 fixture
```

### Pattern 1: Signal-Based t() Implementation

**What:** 将当前 locale dict 存入 `@preact/signals` signal，`t()` 读取 signal.value，Preact 自动将组件订阅到 signal 变化。

**When to use:** 任何需要在不刷新页面的情况下切换 locale 的场景。

```typescript
// Source: @preact/signals 2.9.0 module-level signal pattern (established in Phase 2)
// shared/i18n/index.ts — Phase 6 重写

import { signal, computed } from '@preact/signals';
import en from '../../locales/en.yml';     // Vite YAML plugin converts to JS object
import zhCN from '../../locales/zh_CN.yml';

export type LocaleKey = keyof typeof en;

const LOCALES = { en, zh_CN: zhCN } as const;
type LocaleCode = keyof typeof LOCALES;

/** 当前激活的 locale dict (module-level signal) */
const localeSig = signal<(typeof LOCALES)[LocaleCode]>(en);
/** 当前激活的 locale code — 用于 select 的 value */
export const activeLocaleSig = signal<LocaleCode | 'auto'>('auto');

/** 切换 locale：更新 signal + 持久化到 storage */
export function setLocale(code: LocaleCode | 'auto'): void {
  const allowlist = new Set<string>(['en', 'zh_CN', 'auto']);
  if (!allowlist.has(code)) return; // 安全校验
  activeLocaleSig.value = code;
  const dict = code === 'auto' ? detectBrowserLocale() : LOCALES[code];
  localeSig.value = dict;
  // 持久化（调用者负责写 storage，保持 t() 纯函数）
}

function detectBrowserLocale(): (typeof LOCALES)[LocaleCode] {
  return navigator.language.startsWith('zh') ? zhCN : en;
}

/** 核心翻译函数 — API 与 @wxt-dev/i18n 的 i18n.t 相同 */
export function t(key: LocaleKey, substitutions?: string[]): string {
  const dict = localeSig.value;
  const entry = dict[key] as { message: string; placeholders?: Record<string, { content: string }> };
  if (!entry) {
    console.warn(`[i18n] Missing key: "${key}"`);
    return key;
  }
  let message = entry.message;
  // 解析 chrome.i18n 风格的 placeholder: $PLACEHOLDER$ → substitutions[n-1]
  if (entry.placeholders && substitutions?.length) {
    Object.entries(entry.placeholders).forEach(([name, { content }]) => {
      const idx = parseInt(content.replace('$', ''), 10) - 1;
      if (!isNaN(idx) && substitutions[idx] !== undefined) {
        message = message.replaceAll(new RegExp(`\\$${name}\\$`, 'gi'), substitutions[idx]);
      }
    });
  }
  return message;
}
```

**关键点：**
- `t()` 无需改动调用者 API（现有所有 `t('key')` 调用继续工作）
- 对于带 substitutions 的调用（如 `t('options_origins_confirm_body', [origin])`），传入 `string[]` 而非 `string | string[]`——可以在函数签名中统一
- Preact 组件在 render 期间调用 `t()` 会读取 `localeSig.value`，自动注册依赖
- 切换 locale 时 `localeSig.value = newDict`，所有依赖组件自动重渲染 [VERIFIED: @preact/signals 2.9.0 source]

### Pattern 2: Vite Inline YAML Plugin

**What:** 在 `wxt.config.ts` 内嵌小型 Vite plugin，拦截 `*.yml` import，用 `yaml` 包解析后返回 JS 对象。

**When to use:** 构建时 YAML→JS 转换，零运行时开销。

```typescript
// Source: Vite Plugin API (vite >= 3.2.7, WXT 0.20.x uses Vite 5-8)
// wxt.config.ts 内嵌 plugin

import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'fs';

function yamlPlugin() {
  return {
    name: 'yaml-locale',
    transform(_code: string, id: string) {
      if (!id.endsWith('.yml') && !id.endsWith('.yaml')) return null;
      const content = readFileSync(id, 'utf8');
      const obj = parseYaml(content);
      return { code: `export default ${JSON.stringify(obj)}`, map: null };
    },
  };
}

export default defineConfig({
  // ... existing config ...
  vite: () => ({
    plugins: [tailwindcss(), yamlPlugin()],
  }),
});
```

**注意：** WXT 的 `@wxt-dev/i18n` module 继续工作——它读取 YAML 文件生成 `_locales/*/messages.json`，不受此 Vite plugin 干扰（WXT module 在 build pipeline 阶段运行，独立于 Vite transform）。[VERIFIED: @wxt-dev/i18n module.mjs 源码]

### Pattern 3: ESLint Flat-Config Inline Custom Rule (D-77/D-78)

**What:** 在 `eslint.config.js` 内直接定义 plugin + rule，无需独立文件。检测 JSXText 和 JSXExpressionContainer 中的 CJK 和大写英文字符串。

```javascript
// eslint.config.js — 追加到现有 config 末尾（prettier 之前）
const noHardcodedStringsPlugin = {
  rules: {
    'no-hardcoded-strings': {
      meta: { type: 'problem', schema: [] },
      create(context) {
        const CJK_RE = /[一-鿿㐀-䶿]/; // CJK Unified + Extension A
        const EN_PHRASE_RE = /^[A-Z][a-zA-Z\s]{1,}/;   // 大写开头，长度>=2

        function check(node, value) {
          const trimmed = value.trim();
          if (!trimmed || /^[\s\d\W]+$/.test(trimmed)) return;
          if (CJK_RE.test(trimmed) || EN_PHRASE_RE.test(trimmed)) {
            context.report({ node, message: '禁止 JSX 中硬编码用户可见字符串，请使用 t("...")' });
          }
        }

        return {
          JSXText(node) {
            check(node, node.value);
          },
          'JSXExpressionContainer > Literal'(node) {
            if (typeof node.value === 'string') check(node, node.value);
          },
        };
      },
    },
  },
};
```

**与现有规则的关系：** 现有 `no-restricted-syntax: JSXText[value=/[A-Za-z一-龥]/]` 为"轻量版"——Phase 6 将其**替换**为功能更完整的自定义规则（D-78 明确 JSXExpressionContainer 范围）。[VERIFIED: eslint.config.js 现有代码]

### Pattern 4: i18n Coverage Script (静态分析)

**What:** `scripts/i18n-coverage.ts`，扫描 `shared/` + `entrypoints/` 中所有 `.ts`/`.tsx` 文件，提取 `t('key')` 和 `t("key")` 调用，与 locale 文件键集合做双向 diff。

```typescript
// 提取 t() key 的正则（覆盖单引号和双引号）
const T_CALL_RE = /\bt\(["']([^"']+)["']/g;

// 提取 locale YAML 键（顶层 key 即为键名，不含嵌套）
// locales/en.yml 格式：flat key: { message: '...' }
```

**key insight：** 脚本需扫描范围要排除 `tests/`（测试中的 `t('key')` 可用测试专用 key）以及 `scripts/` 自身。`options_page_title` 等 HTML 文件中的 `__MSG_options_page_title__` 不走 `t()`，不算在源码 t() 引用范围，也不该出现在 t() 覆盖率检查中——属于不同机制。

### Anti-Patterns to Avoid

- **在 t() 内部调用 chrome.i18n.getMessage：** chrome.i18n 不支持运行时切换 locale，切换后必须重启扩展。Phase 6 的目标就是绕过它。[VERIFIED: @wxt-dev/i18n 源码 `browser.i18n.getMessage(key.replaceAll(".", "_"), ...)`]
- **动态 key：** `t(\`prefix_${code}\`)` 无法被静态分析扫描，coverage 脚本会漏掉。约定：i18n key 必须为字符串字面量。
- **给 t() 返回 Signal 对象：** `t()` 应返回纯 string（读取 signal.value），不应返回 Signal 对象，否则现有组件代码需大量改动。
- **在 SW 中调用 setLocale：** SW 无 UI，无需 locale。locale signal 仅在 popup/options 上下文中有意义。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML 解析 | 手写 YAML parser | `yaml` npm 包 | YAML 格式复杂（placeholder 嵌套、特殊字符转义）|
| Preact signal 响应式 | 手写 pub/sub 或 context | `@preact/signals` module-level signal | 已安装 2.9.0，Phase 2 已验证，自动依赖追踪 |
| ESLint AST 遍历 | 手写字符串搜索 | ESLint rule AST 访问（JSXText/JSXExpressionContainer）| AST 精确定位，字符串搜索有误报 |
| 覆盖率检查双向 diff | 只检查"源码 key 在 locale 中存在" | 同时检查"locale key 在源码中被引用" | 单向检查遗漏孤立 key（无用翻译文本堆积） |

**Key insight:** chrome.i18n 的 placeholder 机制（`$NAME$` → `$1`）在 runtime 由浏览器处理。自定义 `t()` 绕过 chrome.i18n 后必须手动实现这一映射，但逻辑简单（7 行 replace，见 `applyChromeMessagePlaceholders` 源码）。

---

## Current Codebase State（实测）

### locale 文件现状

| 文件 | 键数 | 状态 |
|------|------|------|
| `locales/en.yml` | 100 键 | [VERIFIED: grep] |
| `locales/zh_CN.yml` | 100 键 | [VERIFIED: grep] |
| 两者差异 | 0 | 完全对称 [VERIFIED: diff] |

### Coverage Gap 分析（源码 t() 调用 vs locale 键）

**在 locale 中有、但源码 `t()` 未引用（孤立键，可能合法）：**
- `action_default_title` — 在 `wxt.config.ts` manifest 中作为 `__MSG_action_default_title__` 使用，不走 `t()`
- `command_open_popup` — 同上，manifest commands.description
- `dispatch_cancelled_toast` — 可能有 t() 引用未被 grep 捕获，需运行脚本确认
- `dispatch_confirm_disabled_tooltip` — 同上
- `extension_description` — manifest
- `extension_name` — manifest
- `history_view_all` — 检查是否确实有 t() 调用
- `options_origins_confirm_body` — 有调用但带 substitution（已确认 `t('options_origins_confirm_body', [pendingOrigin])`）
- `options_page_title` — 在 `options/index.html` 的 `<title>__MSG_options_page_title__</title>` 中，不走 t()
- `popup_hello` — Phase 1 hello-world 测试键，可能已弃用

**在源码引用、但 locale 中缺失（真正的 gap）：**
- `capture_field_content` — 存在于 `locales/en.yml`（已确认 `capture_field_content:` 有定义），grep 排序可能造成假象；需脚本二次确认
- `error_code_<CODE>_*` — 模板字符串引用，实际 key 在 locale 中均存在（已检查 error_code_EXECUTE_SCRIPT_FAILED 等）

**结论：** 覆盖率基本完整，Phase 6 coverage 脚本会扫描并给出准确 diff。Phase 6 还需新增 `i18n_language_*` 键（Language selector UI 文案）。

### manifest 本地化状态（I18N-04）

`wxt.config.ts` 已配置：
- `name: '__MSG_extension_name__'` [VERIFIED]
- `description: '__MSG_extension_description__'` [VERIFIED]
- `action.default_title: '__MSG_action_default_title__'` [VERIFIED]
- `commands._execute_action.description: '__MSG_command_open_popup__'` [VERIFIED]

**I18N-04 实质上已完成。** Phase 6 Plan 06-3 仅需在 `verify-manifest.ts` 中添加断言即可。

### 现有 ESLint 规则状态

`eslint.config.js` 已有轻量版规则：

```js
// 现有：JSXText 节点不能有 A-Za-z 或 CJK 字符
{
  selector: 'JSXText[value=/[A-Za-z\\u4e00-\\u9fa5]/]',
  message: '...',
}
```

Phase 6 需**替换**这个规则为覆盖 JSXExpressionContainer 的完整自定义规则（D-78）。

---

## Common Pitfalls

### Pitfall 1: YAML locale 格式 vs 直接 dict

**What goes wrong:** WXT locale YAML 格式是 Chrome extension `messages.json` 格式的映射：每个键对应 `{ message: "...", placeholders?: {...} }`，而不是 `{ key: "string value" }`。如果 `t()` 直接读取 `dict[key]` 并当字符串用，会得到 `[object Object]`。

**Why it happens:** 误以为 locale YAML 是简单 key-value 映射。

**How to avoid:** `t()` 内部读取 `entry.message`，并处理 placeholders。见 Pattern 1 代码示例。

**Warning signs:** UI 显示 `[object Object]` 而非翻译文本。

### Pitfall 2: chrome.i18n placeholder 语法 vs 直接 substitution

**What goes wrong:** locale YAML 用 `$ORIGIN$` 引用 placeholder，placeholder.content = `'$1'`（位置参数）。自定义 `t()` 绕过 chrome.i18n 后，必须先把 `$ORIGIN$` 替换为 substitution[0]，而不是直接替换 `$1`。

**How to avoid:** 先用 placeholder name 做 replace（`$ORIGIN$` → `substitutions[0]`），通过 content 字段 (`'$1'`) 获知索引。见 `applyChromeMessagePlaceholders` 函数实现（`@wxt-dev/i18n/dist/supported-locales-DxMHSeIj.mjs`）。[VERIFIED: source]

**Currently affected:** 只有 `options_origins_confirm_body` 使用带 substitution 的 `t()` 调用，其他键均无 placeholder。

### Pitfall 3: t() TypeScript 类型兼容

**What goes wrong:** `@wxt-dev/i18n` 生成 `.wxt/types/i18n.d.ts` 提供类型化的 `getMessage` overloads。重写 `shared/i18n/index.ts` 后，如果 `t()` 的 key 类型不正确，TypeScript 报错。

**How to avoid:** 从 `import en from '../../locales/en.yml'` 推断 `LocaleKey = keyof typeof en`。由于 Vite YAML plugin 在构建时运行，TypeScript 需要对 `*.yml` 模块声明类型（`declare module '*.yml' { const data: Record<string, { message: string; placeholders?: unknown }>; export default data; }`）。

**Warning signs:** `TS2307: Cannot find module '*.yml'`。

### Pitfall 4: WXT i18n module 仍需运行

**What goes wrong:** 误以为自定义 t() 完全替代 `@wxt-dev/i18n`，删除或禁用 `modules: ['@wxt-dev/i18n/module']`。

**Why it matters:** `@wxt-dev/i18n/module` 负责将 YAML 转换为 `_locales/*/messages.json`，manifest 的 `__MSG_*__` 占位符由浏览器解析这些 JSON 文件。即使 UI 用 signal 切换 locale，manifest 字段（name/description）仍由 chrome 静态解析。

**How to avoid:** 保留 `modules: ['@wxt-dev/i18n/module']` 配置；仅重写 `shared/i18n/index.ts` 的运行时 `t()` 实现。

### Pitfall 5: Locale signal 初始化竞态

**What goes wrong:** popup 挂载时，storage 中的 locale 偏好还未读出，signal 先用默认值渲染一帧，再切换到正确 locale——用户看到瞬间文字跳变。

**How to avoid:** 在 popup/options 挂载时，先 await storage.read，再渲染，或在 index.html 的 main.tsx 初始化时同步设置 signal（storage 读取为 async，需在 `render()` 调用前完成）。Pattern：`Promise.all([storageRead]).then(() => render(<App />, ...))`。

### Pitfall 6: ESLint 规则误报

**What goes wrong:** 自定义规则拦截了合法的 JSXExpressionContainer 字符串字面量，例如：`<input placeholder="URL" />`（属性值），`<div data-testid="options-app" />`（data 属性），或 `<span className="font-mono">Phase 6</span>`（技术字符串）。

**How to avoid:** D-78 明确：**不检测 JSX 属性值**（只检测 JSXText + JSXExpressionContainer 中的 Literal，但要排除 JSXAttribute 子节点）。AST 选择器：`JSXExpressionContainer > Literal`（非属性容器）。`JSXAttribute > JSXExpressionContainer > Literal` 需排除。

---

## Code Examples

### 完整 Vite YAML Plugin + wxt.config.ts 集成

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'fs';

function yamlLocalePlugin() {
  return {
    name: 'wxt-yaml-locale',
    transform(_code: string, id: string) {
      if (!/\.(ya?ml)$/.test(id)) return null;
      const raw = readFileSync(id, 'utf-8');
      return {
        code: `export default ${JSON.stringify(parseYaml(raw))}`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  // ... rest of existing config unchanged ...
  modules: ['@wxt-dev/i18n/module'],
  vite: () => ({
    plugins: [tailwindcss(), yamlLocalePlugin()],
  }),
});
```

### TypeScript YAML 模块声明

```typescript
// shared/i18n/yaml.d.ts (新文件)
declare module '*.yml' {
  const data: Record<string, { message: string; placeholders?: Record<string, { content: string; example?: string }> }>;
  export default data;
}
```

### ESLint RuleTester 在 Vitest 中使用（D-79）

```typescript
// tests/unit/lint/no-hardcoded-strings.spec.ts
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

// ESLint 9 RuleTester 与 Vitest describe/it 兼容
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-hardcoded-strings', noHardcodedStringsRule, {
  valid: [
    { code: '<button>{t("key")}</button>' },
    { code: '<div class="foo">x</div>' },
  ],
  invalid: [
    { code: '<button>Send</button>', errors: [{ message: /i18n/ }] },
    { code: '<p>{"Submit"}</p>', errors: [{ message: /i18n/ }] },
  ],
});
```

[VERIFIED: ESLint 9.39.4 `eslint/lib/rule-tester/rule-tester.js` exists]

### Storage locale item（遵循 typed storage 约定）

```typescript
// shared/storage/items.ts 追加
export const localeItem = storage.defineItem<string | null>('local:locale', {
  fallback: null,   // null = auto (跟随浏览器)
  version: 1,
  migrations: { 1: (prev) => prev },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chrome.i18n.getMessage()` 运行时 | Signal + JS dict 运行时切换 | Phase 6 (this phase) | 用户无需重启扩展即可切换语言 |
| 轻量 JSXText 规则 (no-restricted-syntax) | 完整自定义规则（JSXText + JSXExpressionContainer）| Phase 6 (this phase) | 捕获更多硬编码模式 |
| `ReservedSection` 占位 | 真实 Language selector | Phase 6 (this phase) | I18N-02 验收 |
| 无覆盖率脚本 | `scripts/i18n-coverage.ts` | Phase 6 (this phase) | CI 可断言 I18N-01 |

**已完成（Phase 1 落地，Phase 6 验证）：**
- manifest `__MSG_*__` 本地化（I18N-04）——`wxt.config.ts` 已配置

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `yaml` npm 包 v2.8.4 能正确解析 WXT YAML locale 格式（`key: { message: "..." }` 嵌套结构） | Standard Stack | YAML 解析失败会导致构建时 locale dict 为空；备选：`confbox` parseYaml（@wxt-dev/i18n 内部已用，但不在项目 node_modules 根目录，需确认可 import） |
| A2 | Preact 组件在 render 时读取 module-level signal.value 会自动订阅（无需 useSignal hook） | Pattern 1 | 若需 hook，现有所有组件需改动；但 @preact/signals 2.x 的 Preact integration 在 options hook 拦截时自动处理 |

**All other claims are VERIFIED via tool calls in this session.**

---

## Open Questions

1. **`dispatch_cancelled_toast` / `dispatch_confirm_disabled_tooltip` / `history_view_all` 是否有 t() 调用**
   - What we know: 这些键在 locale 中存在，但简单 grep 未找到 `t('...')` 形式的调用
   - What's unclear: 可能用了 `t("key")` 双引号或被动态生成
   - Recommendation: coverage 脚本运行时会准确输出，Phase 6 Plan 06-5 执行后自动得出答案

2. **Locale signal 初始化时机 vs popup 渲染**
   - What we know: `localeItem.getValue()` 是 async，popup `main.tsx` 在 `render()` 前需要知道初始 locale
   - What's unclear: 最优方式是在 `render()` 前 await storage，还是先用 navigator.language 同步推断，再异步更新
   - Recommendation: 先用 `navigator.language` 同步初始化 signal（零等待），再 async 读取 storage 覆盖（如有）。这样不会有空白帧，最多一次快速更新。

---

## Environment Availability

Step 2.6: 此 phase 无外部服务依赖，所有工具均为项目内 node_modules。

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@preact/signals` | Signal-based t() | ✓ | 2.9.0 | — |
| `@wxt-dev/i18n` | YAML→messages.json | ✓ | 0.2.5 | — |
| `eslint` | Custom rule | ✓ | 9.39.4 | — |
| `typescript-eslint` | TSX AST parser | ✓ | 8.20.0 | — |
| `vitest` | Rule fixture test | ✓ | 3.2.4 | — |
| `yaml` | Vite YAML plugin | ✗ (not installed) | 2.8.4 on npm | `@modyfi/vite-plugin-yaml` (不推荐，额外依赖) |
| `wxt` (Vite) | Build pipeline | ✓ | 0.20.25 (Vite 5-8 compat) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `yaml` 包未安装，需 `pnpm add -D yaml`。无阻塞。

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test && pnpm lint && pnpm typecheck` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | 100% key coverage en + zh_CN | script | `pnpm test:i18n-coverage` | ❌ Wave 3 (scripts/i18n-coverage.ts) |
| I18N-02 | setLocale() 切换后 t() 返回新语言文本 | unit | `pnpm test -- tests/unit/i18n/` | ❌ Wave 1 (locale-switch.spec.ts) |
| I18N-03 | ESLint 规则拦截 JSX 硬编码字符串 | lint/unit | `pnpm lint && pnpm test -- tests/unit/lint/` | ❌ Wave 2 (fixture + spec) |
| I18N-04 | manifest 字段使用 __MSG_*__ | script | `pnpm verify:manifest` (after build) | ✅ scripts/verify-manifest.ts |

### Sampling Rate

- **Per task commit:** `pnpm test` (212 existing + new tests)
- **Per wave merge:** `pnpm test && pnpm lint && pnpm typecheck`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/i18n/locale-switch.spec.ts` — covers I18N-02 (signal-based t())
- [ ] `tests/lint/no-hardcoded-strings.fixture.tsx` — covers I18N-03 (ESLint rule fixture)
- [ ] `shared/i18n/yaml.d.ts` — TypeScript module declaration for `*.yml` imports
- [ ] `yaml` devDependency: `pnpm add -D yaml`

---

## Security Domain

`security_enforcement: true`, ASVS Level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (locale switching) | allowlist validation in setLocale(): `['en', 'zh_CN', 'auto']` |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Locale storage tampering | Tampering | `setLocale()` allowlist validation，拒绝 allowlist 外的值 |
| XSS via translated string | Tampering | `t()` 返回纯 string，组件用 Preact text node（不走 innerHTML）|
| YAML build-time injection | Tampering | YAML 文件在源码控制中，非用户输入；构建产物不含用户数据 |

**Low risk phase:** i18n 纯前端 UI 操作，无网络请求，无权限变化，无敏感数据处理。

---

## Sources

### Primary (HIGH confidence)

- `@wxt-dev/i18n/dist/index.mjs` — t() 运行时实现（browser.i18n.getMessage 调用）[VERIFIED: codebase]
- `@wxt-dev/i18n/dist/module.mjs` — WXT module 如何处理 YAML locale 文件 [VERIFIED: codebase]
- `@wxt-dev/i18n/dist/supported-locales-DxMHSeIj.mjs` — applyChromeMessagePlaceholders 实现 [VERIFIED: codebase]
- `@preact/signals` 2.9.0 — module-level signal API [VERIFIED: node_modules source]
- `eslint/lib/rule-tester/` — ESLint 9 RuleTester API [VERIFIED: codebase]
- `shared/i18n/index.ts` — 当前薄 re-export 实现 [VERIFIED: codebase]
- `eslint.config.js` — 现有轻量 JSXText 规则 [VERIFIED: codebase]
- `wxt.config.ts` — manifest __MSG_*__ 配置 [VERIFIED: codebase]
- `locales/en.yml` / `locales/zh_CN.yml` — 100 键，完全对称 [VERIFIED: grep + diff]
- `package.json` — 所有安装依赖版本 [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- npm registry `yaml@2.8.4` — 包存在并可安装 [VERIFIED: npm view]
- npm registry `@modyfi/vite-plugin-yaml@1.1.1` — peerDeps `vite >= 3.2.7` [VERIFIED: npm view]
- WXT 0.20.25 Vite compatibility — `vite: '^5.4.19 || ^6.3.4 || ^7.0.0 || ^8.0.0-0'` [VERIFIED: wxt/package.json]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 所有库版本实测验证
- Architecture: HIGH — 基于实际代码库分析（t() 实现、signal 用法、ESLint 配置均已读取）
- Pitfalls: HIGH — 基于实际代码（placeholder 语法、locale YAML 格式均已确认）

**Research date:** 2026-05-07
**Valid until:** 2026-06-07（WXT/Preact signals stable）
