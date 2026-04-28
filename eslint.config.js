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
  // 轻量版硬编码字符串规则：JSX 文本节点不能是裸字符串字面量。
  // 完整版（CJK + 大写英文启发式）留 Phase 6 / I18N-03。
  {
    files: ['**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-z\\u4e00-\\u9fa5]/]',
          message:
            '禁止 JSX 文本节点出现裸字符串字面量；请使用 t("...") 走 i18n（轻量规则；完整版 hardcoded-string detector 留 Phase 6 / I18N-03）',
        },
      ],
    },
  },
  prettier,
);
