---
phase: 6
plan: "06-2"
type: execute
wave: 1
depends_on: []
files_modified:
  - eslint.config.js
  - tests/lint/no-hardcoded-strings.fixture.tsx
  - tests/lint/no-hardcoded-strings.test.ts
autonomous: true
requirements:
  - I18N-03
---

# Plan 06-2: ESLint 硬编码字符串规则升级

## Objective

将 `eslint.config.js` 中现有的轻量级 `no-restricted-syntax` JSXText 规则，升级为完整的自定义 ESLint 规则（inline flat-config plugin），精确检测 JSX 中的 CJK + 大写英文硬编码字符串。添加 fixture 测试验证拦截能力。

## Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| ESLint rule false positives | LOW | fixture 测试精确验证预期错误数，不检测 JSX attribute values |
| Rule bypass via attribute props | LOW | 仅检测 JSXText + JSXExpressionContainer（用户可见文本路径），排除 class/key/testid 等属性 |
| Missing detection on future hardcoded strings | MEDIUM | CI runs eslint as part of lint check，任何新硬编码字符串都会被 block |

## Tasks

### Task 1: 替换 eslint.config.js 中的 no-restricted-syntax 为 inline plugin 规则

<read_first>
- eslint.config.js (当前轻量规则，查看现有 no-restricted-syntax 块)
</read_first>

<action>
将 `eslint.config.js` 中现有的 `no-restricted-syntax` 块替换为一个 inline ESLint plugin。

**保留的 no-restricted-syntax 规则删除**（找到这一段并替换）：
```js
// 轻量版硬编码字符串规则...
{
  files: ['**/*.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXText[value=/[A-Za-z\\u4e00-\\u9fa5]/]',
        message: '...',
      },
    ],
  },
},
```

**替换为 inline plugin**（在 prettier 之前插入）：

```js
// Phase 6 (I18N-03): 完整硬编码字符串检测规则
// 检测 JSXText 节点和 JSXExpressionContainer 内的字符串字面量
// CJK: U+4E00-U+9FFF (Unified) + U+3400-U+4DBF (Extension A)
// 英文: 大写开头且长度 >= 2 的词组（排除单字母、全数字、全标点）
{
  files: ['**/*.tsx'],
  plugins: {
    'local': {
      rules: {
        'no-hardcoded-strings': {
          create(context) {
            const CJK_RE = /[一-鿿㐀-䶿]/;
            const EN_RE = /^[A-Z][a-zA-Z\s]{1,}/; // 大写开头 >= 2 chars
            const IGNORE_RE = /^[\s\d\W]*$/; // 纯空白/数字/标点 → skip

            function isUserVisible(str) {
              if (!str || IGNORE_RE.test(str)) return false;
              return CJK_RE.test(str) || EN_RE.test(str.trim());
            }

            return {
              JSXText(node) {
                const val = node.value;
                if (isUserVisible(val)) {
                  context.report({
                    node,
                    message: '禁止 JSX 文本节点出现硬编码用户可见字符串，请使用 t("...")',
                  });
                }
              },
              JSXExpressionContainer(node) {
                const expr = node.expression;
                if (
                  expr.type === 'Literal' &&
                  typeof expr.value === 'string' &&
                  isUserVisible(expr.value)
                ) {
                  context.report({
                    node: expr,
                    message: '禁止 JSXExpressionContainer 内的硬编码字符串，请使用 t("...")',
                  });
                }
              },
            };
          },
        },
      },
    },
  },
  rules: {
    'local/no-hardcoded-strings': 'error',
  },
},
```

**特别注意**: 
- 不检测 JSX 属性值（`class="..."`, `data-testid="..."` 等）
- "English" 和 "简体中文" 在 `<option>` 内是语言标识符，应豁免 — 通过在 LanguageSection 对应 `<option>` 使用 `{/* eslint-disable-next-line local/no-hardcoded-strings */}` 或对整个文件 disable 的方式处理
- locale 文件 (`locales/`) 在 eslint ignores 中已排除
</action>

<verify>
  <automated>pnpm lint</automated>
</verify>

<acceptance_criteria>
- `eslint.config.js` 不再包含旧的 `JSXText[value=/[A-Za-z\\u4e00-\\u9fa5]/]` selector
- `eslint.config.js` 包含 `plugins: { 'local': {` 块
- `eslint.config.js` 包含 `'local/no-hardcoded-strings': 'error'`
- `eslint.config.js` 包含 `JSXText(node)` 和 `JSXExpressionContainer(node)` 两个访问器
- `eslint.config.js` 包含 `CJK_RE = /[一-鿿㐀-䶿]/`
- `pnpm lint` 对现有代码库不报新增错误（所有现有 tsx 文件都已走 `t()`）
</acceptance_criteria>

---

### Task 2: 创建 fixture 测试文件

<read_first>
- eslint.config.js (刚更新的规则，确认 plugin 名 `local`)
- entrypoints/options/components/ResetSection.tsx (参考现有合规的 tsx 文件风格)
</read_first>

<action>
创建 `tests/lint/no-hardcoded-strings.fixture.tsx`：

```tsx
// DO NOT FIX: this file intentionally contains hardcoded strings to test the ESLint rule.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';

export function BadComponent() {
  return (
    <div>
      {/* VIOLATION 1: CJK in JSXText */}
      <span>发送</span>
      {/* VIOLATION 2: English capitalized in JSXText */}
      <button>Send</button>
      {/* VIOLATION 3: CJK in JSXExpressionContainer */}
      <p>{'确认删除'}</p>
      {/* VIOLATION 4: English in JSXExpressionContainer */}
      <label>{'Reset all'}</label>
      {/* OK: JSX attribute (class, data-testid) — not user-visible text */}
      <div class="text-slate-900" data-testid="container" />
      {/* OK: purely whitespace JSXText */}
      <span>   </span>
      {/* OK: lowercase single word */}
      {'ok'}
    </div>
  );
}
```

期望违规数：4（span 发送、button Send、p 确认删除、label Reset all）
</action>

<verify>
  <automated>ls tests/lint/no-hardcoded-strings.fixture.tsx</automated>
</verify>

<acceptance_criteria>
- `tests/lint/no-hardcoded-strings.fixture.tsx` 存在
- 文件包含注释 `DO NOT FIX: this file intentionally contains hardcoded strings`
- 文件中有 4 处预期违规（`发送`、`Send`、`确认删除`、`Reset all`）
</acceptance_criteria>

---

### Task 3: 创建 Vitest 测试验证规则拦截能力

<read_first>
- tests/lint/no-hardcoded-strings.fixture.tsx (刚创建)
- eslint.config.js (查看 plugin 结构以便 programmatic 使用)
- tests/unit/ (查看现有测试导入模式)
</read_first>

<action>
创建 `tests/lint/no-hardcoded-strings.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ESLint 9 RuleTester 与 Vitest 集成
RuleTester.describe = describe as typeof RuleTester.describe;
RuleTester.it = it as typeof RuleTester.it;

// ─── 规则定义（从 eslint.config.js 提取以便隔离测试）───────────────────────
const CJK_RE = /[一-鿿㐀-䶿]/;
const EN_RE = /^[A-Z][a-zA-Z\s]{1,}/;
const IGNORE_RE = /^[\s\d\W]*$/;

function isUserVisible(str: string): boolean {
  if (!str || IGNORE_RE.test(str)) return false;
  return CJK_RE.test(str) || EN_RE.test(str.trim());
}

const noHardcodedStringsRule: import('eslint').Rule.RuleModule = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    return {
      JSXText(node: import('eslint').Rule.Node & { value: string }) {
        if (isUserVisible((node as unknown as { value: string }).value)) {
          context.report({ node, message: '禁止 JSX 文本节点出现硬编码用户可见字符串，请使用 t("...")' });
        }
      },
      'JSXExpressionContainer > Literal'(node: import('eslint').Rule.Node) {
        const n = node as unknown as import('estree').Literal;
        if (typeof n.value === 'string' && isUserVisible(n.value)) {
          context.report({ node, message: '禁止 JSXExpressionContainer 内的硬编码字符串，请使用 t("...")' });
        }
      },
    };
  },
};

// ─── RuleTester（精确验证违规数量）────────────────────────────────────────
const tester = new RuleTester({
  languageOptions: {
    // RESEARCH.md: ESLint 9 RuleTester 需要 @typescript-eslint/parser 解析 JSX
    parser: require('@typescript-eslint/parser'),
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-hardcoded-strings', noHardcodedStringsRule, {
  valid: [
    // JSX 属性值不触发规则
    { code: `function C() { return <div class="Send" data-testid="Reset all" />; }` },
    // 纯空白 JSXText 不触发
    { code: `function C() { return <span>   </span>; }` },
    // 小写单词不触发
    { code: `function C() { return <span>{'ok'}</span>; }` },
    // t() 调用不触发
    { code: `function C() { return <button>{t('send_button')}</button>; }` },
  ],
  invalid: [
    { code: `function C() { return <span>发送</span>; }`, errors: 1 },
    { code: `function C() { return <button>Send</button>; }`, errors: 1 },
    { code: `function C() { return <p>{'确认删除'}</p>; }`, errors: 1 },
    { code: `function C() { return <label>{'Reset all'}</label>; }`, errors: 1 },
  ],
});

// ─── Fixture 文件整体违规计数验证 ─────────────────────────────────────────
describe('no-hardcoded-strings fixture file', () => {
  it('reports exactly 4 violations in fixture', () => {
    const { Linter } = require('eslint');
    const linter = new Linter({ configType: 'flat' });
    const fixturePath = resolve(__dirname, 'no-hardcoded-strings.fixture.tsx');
    const code = readFileSync(fixturePath, 'utf-8');

    const messages = linter.verify(
      code,
      [
        {
          plugins: { local: { rules: { 'no-hardcoded-strings': noHardcodedStringsRule } } },
          rules: { 'local/no-hardcoded-strings': 'error' },
          languageOptions: {
            parser: require('@typescript-eslint/parser'),
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
        },
      ],
      { filename: 'fixture.tsx' },
    );

    const errors = messages.filter((m: import('eslint').Linter.LintMessage) => m.severity === 2);
    expect(errors).toHaveLength(4);
  });
});
```
</action>

<verify>
  <automated>pnpm test -- tests/lint/no-hardcoded-strings.test.ts</automated>
</verify>

<acceptance_criteria>
- `tests/lint/no-hardcoded-strings.test.ts` 存在
- 包含 `parser: require('@typescript-eslint/parser')` 配置（在 RuleTester 和 Linter.verify 两处）
- 包含 `expect(errors).toHaveLength(4)` 断言
- RuleTester invalid 用例共 4 条（与 fixture 对应）
- `pnpm test` 运行该测试文件通过
</acceptance_criteria>

## Verification

```bash
pnpm lint                       # 现有代码库不新增 lint 错误
pnpm test -- no-hardcoded       # 测试用例通过，violations = 4
grep -v '^//' eslint.config.js | grep -c "local/no-hardcoded-strings"  # 输出 >= 1
```

## Must Haves

```yaml
must_haves:
  truths:
    - eslint.config.js contains inline plugin with no-hardcoded-strings rule
    - rule detects JSXText CJK and capitalized English violations
    - rule does NOT report JSX attribute values
    - tests/lint/no-hardcoded-strings.fixture.tsx exists with 4 intentional violations
    - tests/lint/no-hardcoded-strings.test.ts passes with expect(errors).toHaveLength(4)
    - test uses @typescript-eslint/parser in languageOptions
    - pnpm lint passes on existing codebase (no false positives)
```
