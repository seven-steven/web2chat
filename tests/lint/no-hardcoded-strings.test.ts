import { describe, it, expect } from 'vitest';
import { RuleTester, Linter } from 'eslint';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parser } from 'typescript-eslint';

// ESLint 9 RuleTester 与 Vitest 集成
RuleTester.describe = describe as typeof RuleTester.describe;
RuleTester.it = it as typeof RuleTester.it;

// ─── 规则定义（从 eslint.config.js 提取以便隔离测试）───────────────────────
const CJK_RE = /[一-鿿㐀-䶿]/;
const EN_RE = /^[A-Z][a-zA-Z\s]{1,}/;

function isUserVisible(str: string): boolean {
  if (!str || !str.trim()) return false;
  return CJK_RE.test(str) || EN_RE.test(str.trim());
}

const noHardcodedStringsRule: import('eslint').Rule.RuleModule = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      JSXText(node: any) {
        const val: string = node.value;
        if (isUserVisible(val)) {
          context.report({
            node,
            message: '禁止 JSX 文本节点出现硬编码用户可见字符串，请使用 t("...")',
          });
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      JSXExpressionContainer(node: any) {
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
};

// ─── RuleTester（精确验证违规数量）────────────────────────────────────────
const tester = new RuleTester({
  languageOptions: {
    parser,
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
    const linter = new Linter({ configType: 'flat' });
    const fixturePath = resolve(__dirname, 'no-hardcoded-strings.fixture.tsx');
    const code = readFileSync(fixturePath, 'utf-8');

    const messages = linter.verify(
      code,
      [
        {
          files: ['**/*.tsx'],
          plugins: { local: { rules: { 'no-hardcoded-strings': noHardcodedStringsRule } } },
          rules: { 'local/no-hardcoded-strings': 'error' },
          languageOptions: {
            parser,
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
        },
      ],
      { filename: 'fixture.tsx' },
    );

    const errors = messages.filter((m) => m.severity === 2);
    expect(errors).toHaveLength(4);
  });
});
