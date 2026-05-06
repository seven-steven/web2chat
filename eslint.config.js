import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '.output/',
      '.wxt/',
      'node_modules/',
      'coverage/',
      'dist/',
      'playwright-report/',
      'test-results/',
      'public/',
      '.claude/',
      '.planning/',
      'tests/lint/*.fixture.tsx',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Type-aware rules require parserOptions.projectService (modern flat-config form).
  // Scoped to TS/TSX so plain .js / .mjs configs stay non-typed.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Phase 6 (I18N-03): 完整硬编码字符串检测规则
  // 检测 JSXText 节点和 JSXExpressionContainer 内的字符串字面量
  // CJK: U+4E00-U+9FFF (Unified) + U+3400-U+4DBF (Extension A)
  // 英文: 大写开头且长度 >= 2 的词组（排除单字母、全数字、全标点）
  {
    files: ['**/*.tsx'],
    plugins: {
      local: {
        rules: {
          'no-hardcoded-strings': {
            create(context) {
              const CJK_RE = /[一-鿿㐀-䶿]/;
              const EN_RE = /^[A-Z][a-zA-Z\s]{1,}/;

              function isUserVisible(str) {
                if (!str || !str.trim()) return false;
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
  prettier,
);
