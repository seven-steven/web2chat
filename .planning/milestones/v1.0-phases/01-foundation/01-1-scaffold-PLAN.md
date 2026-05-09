---
id: 01-1-scaffold
phase: 01-foundation
plan: 1
title: WXT 脚手架 + manifest + 工程基础设施
wave: 1
type: execute
depends_on: []
requirements: [FND-01, FND-05]
files_modified:
  - package.json
  - pnpm-lock.yaml
  - tsconfig.json
  - wxt.config.ts
  - .gitignore
  - .editorconfig
  - eslint.config.js
  - .prettierrc.json
  - .prettierignore
  - .husky/pre-commit
  - .lintstagedrc.json
  - scripts/verify-manifest.ts
  - .github/workflows/ci.yml
  - public/icon/16.png
  - public/icon/32.png
  - public/icon/48.png
  - public/icon/128.png
autonomous: true
user_setup: []
must_haves:
  truths:
    - "`pnpm install` 在干净仓库上完整成功，无需任何手工后处理"
    - "`pnpm build` 产出 `.output/chrome-mv3/manifest.json`，其 `permissions` 严格 === `['activeTab','scripting','storage']`"
    - "构建产物 manifest 的 `host_permissions` 严格 === `['https://discord.com/*']`，绝不含 `<all_urls>`"
    - "构建产物 manifest 的 `optional_host_permissions` 严格 === `['<all_urls>']`"
    - "构建产物 manifest 的 `default_locale === 'en'`，且 `name`/`description`/`action.default_title` 全部以 `__MSG_` 前缀引用 i18n 占位符"
    - "`.output/chrome-mv3` 目录可通过 `chrome://extensions → Load unpacked` 加载并显示工具栏 action 图标（FND-01）"
    - "GitHub Actions workflow 在每次 PR / push 上跑 install + typecheck + lint + vitest + manifest 校验，且 Playwright e2e 不在 CI 中跑（D-11）"
    - "Husky pre-commit hook 在每次 commit 前跑 typecheck + ESLint（含轻量 JSX 硬编码字符串规则）+ prettier --write（D-12）"
    - "manifest 校验脚本 `scripts/verify-manifest.ts` 在静态 `host_permissions` 含任何 `<all_urls>` 时退出码非 0（FND-05 的结构性强制约束）"
  artifacts:
    - path: "package.json"
      provides: "项目元数据 + 依赖锁版本（来自 STACK.md）+ npm scripts（dev/build/typecheck/lint/test/test:e2e/verify:manifest）"
      contains: "wxt"
    - path: "wxt.config.ts"
      provides: "WXT 0.20.x 配置；声明 manifest 字段（permissions、host_permissions、optional_host_permissions、default_locale、__MSG_*__ 占位符）+ 注册 Tailwind v4 Vite plugin + 注册 Preact module"
      contains: "defineConfig"
    - path: "scripts/verify-manifest.ts"
      provides: "构建产物 manifest 校验器；CI + 本地都调用同一脚本"
      contains: "host_permissions"
    - path: ".github/workflows/ci.yml"
      provides: "CI workflow（install + typecheck + lint + vitest + verify:manifest，无 Playwright）"
      contains: "verify:manifest"
    - path: "eslint.config.js"
      provides: "flat config；含 typescript-eslint + 自定义 JSX 字符串字面量规则（轻量版，I18N-03 完整版留 Phase 6）"
      contains: "no-restricted-syntax"
    - path: ".husky/pre-commit"
      provides: "pre-commit hook 调用 lint-staged"
      contains: "lint-staged"
    - path: ".lintstagedrc.json"
      provides: "lint-staged 矩阵：*.{ts,tsx} → typecheck + eslint --fix + prettier --write"
      contains: "*.{ts,tsx}"
  key_links:
    - from: "scripts/verify-manifest.ts"
      to: ".output/chrome-mv3/manifest.json"
      via: "JSON.parse + 数组深比较"
      pattern: "host_permissions"
    - from: ".github/workflows/ci.yml"
      to: "scripts/verify-manifest.ts"
      via: "pnpm verify:manifest npm script"
      pattern: "verify:manifest"
    - from: ".husky/pre-commit"
      to: ".lintstagedrc.json"
      via: "lint-staged 二进制"
      pattern: "lint-staged"
---

<objective>
搭建 Web2Chat 仓库的工程地基：基于 WXT 0.20.x + Preact + TypeScript 的 MV3 扩展骨架，落地最严格的 manifest 权限形态（D-11 / FND-05），并接入 ESLint + Prettier + Husky + lint-staged + GitHub Actions CI（D-11、D-12）。

Purpose: 后续 3 个 plan 的所有代码都依赖本 plan 创建的 package.json、tsconfig.json、wxt.config.ts、ESLint config、CI workflow 与 manifest 校验脚本。脚手架阶段就把权限收得最紧、把 lint 与 CI 接上，是项目唯一一次"正确从零开始"的窗口；放到后面再补每个细节都意味着回填全部已有代码。

Output: 一个 `pnpm install` 即可工作、`pnpm build` 产出符合 FND-05 manifest 形态的扩展骨架；CI workflow 在每次提交时自动验证。
</objective>

<execution_context>
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/workflows/execute-plan.md
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@CLAUDE.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: WXT 脚手架 + 锁版本 + Tailwind v4 集成 + manifest 形态</name>
  <read_first>
    - .planning/research/STACK.md（全部依赖与精确版本，逐字对照；"安装"段是 npm scripts 与 dev dep 的依据）
    - .planning/research/ARCHITECTURE.md §"推荐项目结构" + §"权限：最小特权原则"（理解 entrypoints/ 布局与 v1 权限集合）
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-10（Tailwind v4 from day 1，无 CSS modules fallback）+ §"Claude's Discretion"（WXT 默认 entrypoints 命名）
    - .planning/REQUIREMENTS.md FND-01 + FND-05（manifest 必须形态）
    - CLAUDE.md §"权限"（静态 host_permissions 仅 `https://discord.com/*`；optional_host_permissions 仅 `<all_urls>`；静态中绝不出现 `<all_urls>`）
    - .planning/research/PITFALLS.md §陷阱 9（Web Store 拒绝条件，特别是 `<all_urls>` 静态化）
  </read_first>
  <files>
    package.json
    pnpm-lock.yaml
    tsconfig.json
    wxt.config.ts
    .gitignore
    .editorconfig
    public/icon/16.png
    public/icon/32.png
    public/icon/48.png
    public/icon/128.png
  </files>
  <action>
执行下列步骤，按 STACK.md 锁版本，不要自己挑版本：

1. **初始化 package.json**（手写而非 wxt init，因为 wxt init 会拉非锁定版本）。`name = "web2chat"`，`type = "module"`，`packageManager = "pnpm@9.x"`（或当前 lockfile 实际版本，先 `corepack enable`），`engines.node = ">=20.19"`。
2. **dependencies**（精确版本，与 STACK.md 锁版本一一对应；caret 都是 STACK.md 里的）：
   - `wxt@^0.20.25`
   - `preact@^10.29.1`
   - `@preact/signals@^2.0.0`
   - `@webext-core/messaging@^2.0.0`
   - `@wxt-dev/i18n@^0.2.5`
   - `@wxt-dev/browser@^0.1.40`
   - `zod@^3.24.0`
   注意：D-05 要求 `@webext-core/messaging`（CONTEXT.md 锁定）；如 STACK.md 没列出版本，使用 `@webext-core/messaging@^2.0.0`（npm 当前 stable，2025 H2 起即可用）。
3. **devDependencies**：
   - `typescript@^5.6.0`
   - `@types/chrome@^0.1.40`
   - `tailwindcss@^4.0.0`、`@tailwindcss/vite@^4.0.0`
   - `vitest@^3.2.4`、`happy-dom@^15.0.0`
   - `@playwright/test@^1.58.0`、`playwright@^1.58.0`
   - `eslint@^9.20.0`、`typescript-eslint@^8.20.0`、`eslint-config-prettier@^10.0.0`
   - `prettier@^3.4.0`
   - `husky@^9.1.0`、`lint-staged@^15.5.0`
   - `tsx@^4.20.0`（用于跑 `scripts/verify-manifest.ts` 与 ESM 风格的 npm scripts）
   - `@preact/preset-vite@^2.0.0`（@wxt-dev/module-preact 不在 STACK.md，使用通用 vite 插件即可；如 wxt 模板把它打进 wxt.config 即跳过）
4. **npm scripts**（package.json `scripts` 字段）：
   ```json
   {
     "dev": "wxt",
     "build": "wxt build",
     "build:firefox": "echo 'firefox build deferred to v2' && exit 0",
     "zip": "wxt zip",
     "compile": "tsc --noEmit",
     "typecheck": "tsc --noEmit",
     "lint": "eslint .",
     "lint:fix": "eslint . --fix",
     "format": "prettier --write .",
     "test": "vitest run",
     "test:watch": "vitest",
     "test:e2e": "playwright test",
     "verify:manifest": "wxt build && tsx scripts/verify-manifest.ts",
     "postinstall": "wxt prepare && husky"
   }
   ```
   注意：`postinstall` 跑 `wxt prepare` 生成 `.wxt/` 类型；跑 `husky` 安装 git hooks。
5. **tsconfig.json**：使用 WXT 推荐基线 — `extends: ".wxt/tsconfig.json"`（postinstall 生成），自身 `compilerOptions` 仅放 `strict: true`、`noUncheckedIndexedAccess: true`、`exactOptionalPropertyTypes: true`、`paths: { "~/*": ["./*"], "@/shared/*": ["./shared/*"] }`。include: ["**/*.ts", "**/*.tsx", "wxt.config.ts", "scripts/**/*.ts"]。
6. **wxt.config.ts**：使用 `defineConfig` 导出。完整字段：
   ```ts
   import { defineConfig } from 'wxt';
   import tailwindcss from '@tailwindcss/vite';

   export default defineConfig({
     manifest: {
       name: '__MSG_extension_name__',
       description: '__MSG_extension_description__',
       default_locale: 'en',
       permissions: ['activeTab', 'scripting', 'storage'],
       host_permissions: ['https://discord.com/*'],
       optional_host_permissions: ['<all_urls>'],
       action: {
         default_title: '__MSG_action_default_title__',
         default_icon: {
           '16': '/icon/16.png',
           '32': '/icon/32.png',
           '48': '/icon/48.png',
           '128': '/icon/128.png',
         },
       },
     },
     modules: ['@wxt-dev/i18n/module'],
     vite: () => ({
       plugins: [tailwindcss()],
     }),
   });
   ```
   注意：`__MSG_*__` 引用的 key（`extension_name`、`extension_description`、`action_default_title`）由 Plan 02 的 i18n locale 文件提供。Plan 01 不写 locale 文件，但 manifest 必须以这些 key 引用 — Plan 02 会落地内容。
7. **.gitignore**：忽略 `node_modules/`、`.output/`、`.wxt/`、`.vite/`、`dist/`、`coverage/`、`*.log`、`.DS_Store`、`.env*`（除 `.env.example`）、`playwright-report/`、`test-results/`。
8. **.editorconfig**：utf-8、LF、2 空格缩进，最终换行 true。
9. **public/icon/**：放 4 个空白占位 PNG（16/32/48/128 实际像素尺寸）。可使用 1×1 透明 PNG bytes 或临时纯色块。**关键：必须是真实合法 PNG 文件**（manifest 加载会校验），尺寸字段不校验。
10. 运行 `pnpm install`，验证 lockfile 生成成功且 `wxt prepare` 跑通（生成 `.wxt/`）。
11. 运行 `pnpm build`，验证 `.output/chrome-mv3/manifest.json` 出现且形态正确（permissions = activeTab/scripting/storage；host_permissions = ['https://discord.com/*']；optional_host_permissions = ['<all_urls>']；default_locale = 'en'；name/description/action.default_title 形如 `__MSG_*__`）。
   - 如果 wxt build 此时因为 locale 文件不存在而 warn / fail，OK：locale 文件由 Plan 02 落地。如果是 fail，先在 `assets/locales/en.json` 写一个最小占位（仅含 `extension_name`、`extension_description`、`action_default_title` 三个 key），让 build 通过。Plan 02 会接管这两个文件。

不要在本任务中写任何 entrypoints/ 下的 popup / background 代码 — 那些由 Plan 03 / Plan 04 落地。
  </action>
  <verify>
    <automated>pnpm install &amp;&amp; pnpm build &amp;&amp; node -e "const m=require('./.output/chrome-mv3/manifest.json'); const ok=JSON.stringify(m.permissions.sort())==='[\"activeTab\",\"scripting\",\"storage\"]' &amp;&amp; JSON.stringify(m.host_permissions)==='[\"https://discord.com/*\"]' &amp;&amp; JSON.stringify(m.optional_host_permissions)==='[\"<all_urls>\"]' &amp;&amp; m.default_locale==='en' &amp;&amp; m.name.startsWith('__MSG_') &amp;&amp; m.description.startsWith('__MSG_') &amp;&amp; m.action.default_title.startsWith('__MSG_'); if(!ok){console.error('manifest shape FAIL', JSON.stringify(m,null,2));process.exit(1)} else console.log('manifest shape OK')"</automated>
  </verify>
  <done>
    - `pnpm install` 干净跑过；`pnpm-lock.yaml` 生成
    - `pnpm build` 产出 `.output/chrome-mv3/manifest.json`
    - manifest 中 `permissions` 严格为 `['activeTab','scripting','storage']`（顺序无关）
    - manifest 中 `host_permissions` 严格为 `['https://discord.com/*']`
    - manifest 中 `optional_host_permissions` 严格为 `['<all_urls>']`
    - manifest 中 `default_locale === 'en'`；`name`、`description`、`action.default_title` 全部以 `__MSG_` 起头
    - `.wxt/` 与 `.output/` 在 `.gitignore` 中；不会被意外提交
    - `package.json` 含全部 STACK.md 锁定的核心 + 配套 + 开发依赖（精确版本）
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: ESLint flat config + Prettier + Husky + lint-staged（含轻量 JSX 硬编码字符串规则）</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-12（Husky + lint-staged，pre-commit 跑 typecheck + ESLint + prettier --write，轻量硬编码字符串规则）
    - .planning/REQUIREMENTS.md I18N-03（完整版 detector 留 Phase 6 — 本 plan 只上 JSX 裸字符串字面量这一条）
    - CLAUDE.md §"i18n"（用户可见字符串走 t(...)；ESLint 拦截 JSX/TSX 硬编码字符串）
    - .planning/research/STACK.md §"开发工具"（eslint + typescript-eslint + prettier + eslint-config-prettier 版本）
    - 当前 package.json（Task 1 落地后）
  </read_first>
  <files>
    eslint.config.js
    .prettierrc.json
    .prettierignore
    .husky/pre-commit
    .lintstagedrc.json
  </files>
  <action>
1. **eslint.config.js**（flat config，ESM）：
   ```js
   import js from '@eslint/js';
   import tseslint from 'typescript-eslint';
   import prettier from 'eslint-config-prettier';

   export default tseslint.config(
     {
       ignores: ['.output/', '.wxt/', 'node_modules/', 'coverage/', 'dist/', 'playwright-report/', 'test-results/', 'public/'],
     },
     js.configs.recommended,
     ...tseslint.configs.recommended,
     {
       rules: {
         '@typescript-eslint/no-floating-promises': 'error',
         '@typescript-eslint/no-explicit-any': 'warn',
         '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
       },
     },
     // 轻量版硬编码字符串规则：JSX 文本节点不能是裸字符串字面量
     // 完整版（CJK + 大写英文启发式）留 Phase 6 / I18N-03
     {
       files: ['**/*.tsx'],
       rules: {
         'no-restricted-syntax': [
           'error',
           {
             selector: 'JSXText[value=/[A-Za-z\\u4e00-\\u9fa5]/]',
             message: '禁止 JSX 文本节点出现裸字符串字面量；请使用 t(\"...\") 走 i18n（轻量规则；完整版 hardcoded-string detector 留 Phase 6 / I18N-03）',
           },
         ],
       },
     },
     prettier, // 永远放最后，关闭与 prettier 冲突的格式规则
   );
   ```
   注意：`JSXText` 选择器仅拦截 `<div>Hello</div>` 这种字面文本节点，不拦截 `<div>{t('...')}</div>` 也不拦截 attribute（如 `aria-label="..."`）。这与 D-12 锁定的"轻量"边界一致。
2. **.prettierrc.json**：使用默认值，仅显式声明：
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "trailingComma": "all",
     "printWidth": 100,
     "tabWidth": 2,
     "useTabs": false,
     "arrowParens": "always",
     "endOfLine": "lf"
   }
   ```
3. **.prettierignore**：与 ESLint ignores 同步（`.output/`、`.wxt/`、`node_modules/`、`coverage/`、`dist/`、`pnpm-lock.yaml`、`playwright-report/`、`test-results/`、`public/icon/`）。
4. **husky 安装**：Task 1 的 `postinstall` 已经跑 `husky`；本任务创建 `.husky/pre-commit` 文件：
   ```sh
   #!/usr/bin/env sh
   pnpm typecheck && pnpm exec lint-staged
   ```
   关键：先全仓 typecheck（lint-staged 不做这件事），再用 lint-staged 在被改动的文件上跑 ESLint + Prettier。让 `chmod +x .husky/pre-commit` 在 unix 上有效。
5. **.lintstagedrc.json**：
   ```json
   {
     "*.{ts,tsx,js,mjs,cjs}": ["eslint --fix", "prettier --write"],
     "*.{json,md,yml,yaml,html,css}": ["prettier --write"]
   }
   ```
6. 验证 ESLint 自身配置无解析错误：`pnpm exec eslint --print-config eslint.config.js | head -10` 应不抛错。
7. 创建一个临时反例文件 `tmp/eslint-fixture.tsx`，内容 `export const X = () => <div>Hello</div>;`，跑 `pnpm exec eslint tmp/eslint-fixture.tsx`，应输出 `no-restricted-syntax` 错误，含上文 message。删除该临时文件。
8. 创建一个 git fixture commit（不要真提交，只本地试）：`echo 'export const X: number = 1;' > tmp/lint-fixture.ts; git add tmp/lint-fixture.ts; pnpm exec lint-staged`，应跑过 eslint+prettier。完成后 `rm tmp/lint-fixture.ts; git restore --staged tmp/lint-fixture.ts`。
  </action>
  <verify>
    <automated>pnpm exec eslint --print-config eslint.config.js >/dev/null &amp;&amp; mkdir -p tmp &amp;&amp; printf 'export const X = () =&gt; &lt;div&gt;Hello&lt;/div&gt;;\n' &gt; tmp/_eslint_check.tsx &amp;&amp; (pnpm exec eslint tmp/_eslint_check.tsx 2&gt;&amp;1 | grep -q no-restricted-syntax &amp;&amp; echo 'JSX hardcoded-string rule WORKS' || (echo 'JSX hardcoded-string rule FAILED' &amp;&amp; exit 1)) &amp;&amp; rm -f tmp/_eslint_check.tsx &amp;&amp; rmdir tmp 2&gt;/dev/null; test -x .husky/pre-commit &amp;&amp; grep -q lint-staged .husky/pre-commit &amp;&amp; grep -q typecheck .husky/pre-commit</automated>
  </verify>
  <done>
    - `eslint.config.js` 是 flat config（ESM），include typescript-eslint recommended + prettier compat
    - 跑 `pnpm exec eslint <反例 tsx>` 触发 `no-restricted-syntax` 含 i18n 提示信息
    - `.husky/pre-commit` 存在，可执行权限，调用 `pnpm typecheck && pnpm exec lint-staged`
    - `.lintstagedrc.json` 含 ts/tsx → eslint+prettier 与 json/md/yml → prettier
    - prettier 配置一致；与 ESLint 不冲突（`eslint-config-prettier` 在配置链最后）
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: GitHub Actions CI workflow + manifest 校验脚本</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-11（CI 跑 install + typecheck + lint + vitest + manifest 校验，Playwright 不在 CI；本地 pnpm test:e2e 仍可跑）+ §specifics（manifest 校验脚本 5 条断言）
    - .planning/REQUIREMENTS.md FND-05（manifest 必须形态）+ ROADMAP §"Phase 1" 成功标准 #5（CI 校验构建产物中没有静态 `<all_urls>`）
    - .planning/research/PITFALLS.md §陷阱 9（Web Store 拒绝触发条件 — 静态 `<all_urls>` 是首位）
    - 当前 package.json `scripts` 字段（Task 1 落地）
  </read_first>
  <files>
    scripts/verify-manifest.ts
    .github/workflows/ci.yml
  </files>
  <action>
1. **scripts/verify-manifest.ts**（用 tsx 直接跑的 ESM TS 脚本）：
   ```ts
   #!/usr/bin/env tsx
   /**
    * Manifest verifier — runs after `wxt build`.
    * Asserts FND-05 + ROADMAP Phase 1 success criterion #5:
    *   - permissions === ['activeTab', 'scripting', 'storage'] (set equality)
    *   - host_permissions === ['https://discord.com/*'] (NO `<all_urls>` ever)
    *   - optional_host_permissions === ['<all_urls>']
    *   - default_locale === 'en'
    *   - name / description / action.default_title use __MSG_*__
    *
    * NEVER pass on a manifest with `<all_urls>` in static `host_permissions`.
    */
   import { readFileSync, existsSync } from 'node:fs';
   import { resolve } from 'node:path';

   const manifestPath = resolve(process.cwd(), '.output/chrome-mv3/manifest.json');
   if (!existsSync(manifestPath)) {
     console.error(`[verify-manifest] FAIL: ${manifestPath} not found. Run \`pnpm build\` first.`);
     process.exit(1);
   }

   type Manifest = {
     name?: string;
     description?: string;
     default_locale?: string;
     permissions?: string[];
     host_permissions?: string[];
     optional_host_permissions?: string[];
     action?: { default_title?: string };
   };
   const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
   const errors: string[] = [];

   const expectSet = (label: string, actual: string[] | undefined, expected: string[]) => {
     const a = (actual ?? []).slice().sort();
     const e = expected.slice().sort();
     if (JSON.stringify(a) !== JSON.stringify(e)) {
       errors.push(`${label} mismatch: expected ${JSON.stringify(e)}, got ${JSON.stringify(actual)}`);
     }
   };

   expectSet('permissions', manifest.permissions, ['activeTab', 'scripting', 'storage']);
   expectSet('host_permissions', manifest.host_permissions, ['https://discord.com/*']);
   expectSet('optional_host_permissions', manifest.optional_host_permissions, ['<all_urls>']);

   // Hard guard: <all_urls> in static host_permissions is the canonical Web Store rejection trigger.
   if ((manifest.host_permissions ?? []).includes('<all_urls>')) {
     errors.push('FATAL: `<all_urls>` present in static host_permissions (FND-05 + DST-03 violation)');
   }

   if (manifest.default_locale !== 'en') {
     errors.push(`default_locale must be 'en', got ${JSON.stringify(manifest.default_locale)}`);
   }
   for (const [field, value] of [
     ['name', manifest.name],
     ['description', manifest.description],
     ['action.default_title', manifest.action?.default_title],
   ] as const) {
     if (typeof value !== 'string' || !value.startsWith('__MSG_')) {
       errors.push(`${field} must use __MSG_*__ placeholder, got ${JSON.stringify(value)}`);
     }
   }

   if (errors.length) {
     console.error('[verify-manifest] FAIL:');
     for (const e of errors) console.error('  -', e);
     process.exit(1);
   }
   console.log('[verify-manifest] OK — all assertions passed');
   ```
2. **.github/workflows/ci.yml**：
   ```yaml
   name: CI
   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]
   jobs:
     verify:
       runs-on: ubuntu-latest
       timeout-minutes: 10
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
           with:
             version: 9
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'pnpm'
         - run: pnpm install --frozen-lockfile
         - run: pnpm typecheck
         - run: pnpm lint
         - run: pnpm test
         - run: pnpm verify:manifest
   ```
   注意：**不要**加 Playwright 步骤 — D-11 明确推迟到 Phase 4。等 Phase 4 接入适配器时本 workflow 才追加 e2e job。
3. 本地手测：`pnpm verify:manifest` 应在 manifest 形态正确时打印 `[verify-manifest] OK`。临时把 `wxt.config.ts` 的 host_permissions 改成 `['<all_urls>']` 跑一次，应该 fail（输出 FATAL 行 + exit code != 0），然后立即恢复正确值。
  </action>
  <verify>
    <automated>pnpm verify:manifest 2&gt;&amp;1 | grep -q '\[verify-manifest\] OK' &amp;&amp; test -f .github/workflows/ci.yml &amp;&amp; grep -q 'pnpm verify:manifest' .github/workflows/ci.yml &amp;&amp; ! grep -q 'playwright' .github/workflows/ci.yml &amp;&amp; ! grep -q 'test:e2e' .github/workflows/ci.yml &amp;&amp; echo 'CI workflow + verify script OK'</automated>
  </verify>
  <done>
    - `scripts/verify-manifest.ts` 存在，是合法 ESM TS，可由 `tsx` 直接执行
    - 跑 `pnpm verify:manifest` 输出 `[verify-manifest] OK` 且 exit 0
    - 把 `wxt.config.ts` 的 host_permissions 临时改为 `['<all_urls>']` 后跑 `pnpm verify:manifest` exit code != 0 且 stderr 含 `FATAL`（恢复正确值后再交付）
    - `.github/workflows/ci.yml` 含 install + typecheck + lint + test + verify:manifest
    - `.github/workflows/ci.yml` **不含** `playwright`、`test:e2e`、`pnpm test:e2e` 任意子串（Playwright 留 Phase 4）
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Web Store 评审者 ↔ dist/manifest.json | 静态 manifest 形态决定上架与否；评审者唯一可信凭据 |
| 仓库未来 contributor ↔ manifest 改动 | 后续 PR 静默拓宽 host_permissions 是头号长期风险 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-1-01 | Elevation of Privilege (V14.4 — Permission scope) | wxt.config.ts → dist/manifest.json | mitigate | wxt.config.ts 静态 `host_permissions: ['https://discord.com/*']`；`<all_urls>` 仅出现在 `optional_host_permissions`；scripts/verify-manifest.ts 在静态部分含 `<all_urls>` 时硬失败（exit code 1 + 输出 FATAL 行） |
| T-01-1-02 | Tampering (V1.5 — Build hygiene) | 后续 PR 修改 wxt.config.ts 的权限字段 | mitigate | .github/workflows/ci.yml 在每次 PR 上跑 `pnpm verify:manifest`，对构建产物 `dist/manifest.json` 做字面量校验；CI 校验失败即 PR 不可合并 |
| T-01-1-03 | Information Disclosure (V8.1 — Data classification at rest) | 占位 PNG icon 资产（`public/icon/*`） | accept | icon 是公开资产，不含 PII；不存在隐私问题。ASVS L1 不要求加密静态资产 |
| T-01-1-04 | Denial of Service | CI 跑出 timeout | accept | timeout-minutes 设 10；jobs 是确定性的（install + typecheck + lint + vitest + verify-manifest），实际预计 < 3 分钟。低风险 |
</threat_model>

<verification>
- `pnpm install` 在干净 clone 上跑通，无后处理
- `pnpm build && pnpm verify:manifest` 输出 `[verify-manifest] OK` 且 exit 0
- `pnpm exec eslint --print-config eslint.config.js` 不抛错
- 反例 JSX `<div>Hello</div>` 触发 `no-restricted-syntax` 错误
- `.husky/pre-commit` 调用 typecheck + lint-staged
- `.github/workflows/ci.yml` 不含 Playwright / test:e2e（Phase 4 才接入）
- `dist/manifest.json` 静态 `host_permissions` 严格 === `['https://discord.com/*']`
</verification>

<success_criteria>
- 本 plan 完成后，`/Users/seven/data/coding/projects/seven/web2chat/` 是一个**可被克隆并跑通 `pnpm install && pnpm build` 的 WXT 0.20.x MV3 扩展骨架仓库**
- 工程基础设施（lint / format / pre-commit / CI / manifest 校验）全部就位
- 满足 FND-01（MV3 骨架可加载）+ FND-05（manifest 权限收紧 + 校验）的所有结构性条件
- Plan 02 / 03 / 04 可以基于本 plan 的 package.json + tsconfig + wxt.config 直接落地后续代码
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-1-SUMMARY.md` capturing:
- 实际安装的依赖版本（如发生与 STACK.md 锁版本的偏差）
- manifest 实际形态（贴 .output/chrome-mv3/manifest.json）
- ESLint 与 verify-manifest 实际输出快照
- 任何遇到的 Tailwind v4 / WXT 0.20.x 集成问题（D-10 明确：失败按 deviation 处理而非 fallback CSS modules）
</output>
