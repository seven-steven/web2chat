---
id: 01-2-storage-i18n
phase: 01-foundation
plan: 2
title: 存储 schema + 迁移框架 + i18n facade（en + zh_CN）
wave: 2
type: execute
depends_on: [01-1-scaffold]
requirements: [FND-04, FND-06, STG-01, STG-02]
files_modified:
  - shared/storage/items.ts
  - shared/storage/migrate.ts
  - shared/storage/index.ts
  - shared/i18n/index.ts
  - assets/locales/en.yml
  - assets/locales/zh_CN.yml
  - tests/unit/storage/migrate.spec.ts
  - tests/unit/storage/items.spec.ts
  - vitest.config.ts
autonomous: true
user_setup: []
must_haves:
  truths:
    - "每个 popup / SW / 未来 content script 写入 storage 的代码必须 import `metaItem`（来自 `shared/storage/items.ts`），永远不直接调用 `chrome.storage.local.set`（STG-02 的结构性强制）"
    - "`metaItem.getValue()` 返回 `{ schemaVersion: 1; helloCount: number }`；首次读时若 storage 中无值，自动写入默认值 `{ schemaVersion: 1, helloCount: 0 }`（D-02 + D-03 的 v0→v1 迁移）"
    - "`shared/storage/migrate.ts` 导出 `migrations: Record<number, (prev: unknown) => unknown>`；Phase 1 注册 `1: () => ({ schemaVersion: 1, helloCount: 0 })` 作为 v0 → v1 noop 起点（D-03）"
    - "popup hello-world 文案通过 `t('popup_hello', count)` 走 i18n 而非硬编码；en + zh_CN 两份 locale 文件的 `popup_hello` 都含 `$COUNT$` 占位符（FND-06）"
    - "`assets/locales/en.yml` 与 `assets/locales/zh_CN.yml` 100% 键覆盖（任何 key 在两份文件中都存在）"
    - "shared/storage/* 与 shared/i18n/* 模块顶层不出现 `chrome.*` 调用（陷阱 4 + ARCHITECTURE.md §结构理由的硬约束）"
    - "Phase 1 不写入任何敏感用户数据；helloCount 是数值探针；存储位置为 `chrome.storage.local`（D-04 + STG-01）"
  artifacts:
    - path: "shared/storage/items.ts"
      provides: "类型化 storage item facade — 唯一的 chrome.storage.local 入口；导出 metaItem"
      contains: "metaItem"
    - path: "shared/storage/migrate.ts"
      provides: "schema 迁移注册表 — 每次未来 schema 变更新增一个 migrations[N] entry"
      contains: "migrations"
    - path: "shared/i18n/index.ts"
      provides: "i18n facade — 导出 t() / 使用 @wxt-dev/i18n 类型化 messages"
      contains: "createI18n"
    - path: "assets/locales/en.yml"
      provides: "英文文案；含 manifest 用 __MSG_*__ 引用的 key 与 popup_hello"
      contains: "popup_hello"
    - path: "assets/locales/zh_CN.yml"
      provides: "简体中文文案；与 en.yml 100% key 同构"
      contains: "popup_hello"
    - path: "tests/unit/storage/migrate.spec.ts"
      provides: "迁移框架单元测试 — 在 fake-browser 上验证 v0 → v1 路径与已迁移情况下的 idempotent 行为"
      contains: "migrations"
    - path: "tests/unit/storage/items.spec.ts"
      provides: "metaItem 单元测试 — 验证 getValue 默认填充 + setValue 持久化 + onChange 触发"
      contains: "metaItem"
  key_links:
    - from: "shared/storage/items.ts"
      to: "shared/storage/migrate.ts"
      via: "import migrations + 在 metaItem.getValue 路径上跑迁移"
      pattern: "import.*migrate"
    - from: "Plan 03 background/service-worker.ts (未来)"
      to: "shared/storage/items.ts"
      via: "import metaItem 在 SW handler 内调用 getValue/setValue"
      pattern: "metaItem\\.(getValue|setValue)"
    - from: "Plan 04 entrypoints/popup/main.tsx (未来)"
      to: "shared/i18n/index.ts"
      via: "import t 渲染 popup_hello"
      pattern: "t\\('popup_hello'"
---

<objective>
落地 Phase 1 的纯共享模块（不接触 chrome.runtime / chrome.tabs）：(1) 类型化 storage 仓库 + 版本化 schema + 迁移框架（FND-04 + STG-02 + D-01..04），(2) i18n facade + en/zh_CN locale 文件（FND-06）。

Purpose: ARCHITECTURE.md §"结构理由" 把 `shared/` 列为构建顺序第一层（"不允许在顶层调用 `chrome.*`"），是 SW（Plan 03）与 popup（Plan 04）的共同依赖。把存储与 i18n 一次性、按 simplicity-first 落地，下游两个 plan 才能并行 import 它们。

Output: `shared/storage/{items,migrate,index}.ts`、`shared/i18n/index.ts`、`assets/locales/{en,zh_CN}.yml`，以及 Vitest 单元测试覆盖迁移路径与 metaItem 读写。
</objective>

<execution_context>
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/workflows/execute-plan.md
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@CLAUDE.md
@.planning/phases/01-foundation/01-1-scaffold-PLAN.md

<interfaces>
<!-- 本 plan 创建的接口；Plan 03/04 将直接 import。 -->

将由 shared/storage/items.ts 导出（典型形态，按 WXT defineItem 实际签名落地）：
```typescript
// 由 wxt 生成的 storage helper（来自 #imports）：
//   storage.defineItem<T>(key: `local:${string}` | `session:${string}`, opts: { fallback: T; version?: number; migrations?: Record<number, (prev: unknown) => unknown> })
// 返回类型形如：
//   { getValue(): Promise<T>; setValue(value: T): Promise<void>; watch(cb: (n: T, o: T) => void): () => void }

export type MetaSchema = { schemaVersion: 1; helloCount: number };
export const META_DEFAULT: MetaSchema = { schemaVersion: 1, helloCount: 0 };
export const metaItem: WxtStorageItem<MetaSchema, ...>; // local:meta
```

将由 shared/storage/migrate.ts 导出：
```typescript
export const migrations: Record<number, (prev: unknown) => unknown>;
// migrations[1] = (_prev) => ({ schemaVersion: 1, helloCount: 0 });   // v0 → v1
```

将由 shared/i18n/index.ts 导出：
```typescript
// @wxt-dev/i18n 的类型化 t():
// import { i18n } from '#i18n';   // 由 wxt prepare 生成
// export const t: typeof i18n.t;
// 调用形式：t('popup_hello', 5) → 'Hello, world (×5)' (en) / '你好，世界 ×5' (zh_CN)
export const t: <K extends MessageKey, P extends MessageParams<K>>(key: K, ...params: P) => string;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: 迁移框架 + metaItem（D-01..04 落地）</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-01（schema 极简）+ D-02（meta = schemaVersion 1 + helloCount）+ D-03（migrate.ts 真实就位）+ D-04（写 chrome.storage.local 而非 .session）
    - .planning/research/ARCHITECTURE.md §"组件职责" + §"StorageSchema"（typed repo + version + migration hook）
    - .planning/research/STACK.md §"存储层"（`storage.defineItem<T>(...)` + WXT `migrations` 选项的真实 API 签名 — 在写代码前用 Context7 / WXT 文档确认 0.20.x 实际签名是否含 `migrations`；若无，则用 wrapper 自行实现）
    - .planning/research/PITFALLS.md §陷阱 4（顶层 await 禁忌；shared 模块顶层不能调 chrome.*）
    - CLAUDE.md §"约定" §"存储"（所有写入走 typed repo）
    - 当前 wxt.config.ts、tsconfig.json（Plan 01 落地后；理解 paths alias 与 #imports 来源）
  </read_first>
  <files>
    shared/storage/migrate.ts
    shared/storage/items.ts
    shared/storage/index.ts
  </files>
  <action>
按下列形态实现，**严格遵守 D-01..04**：

1. **shared/storage/migrate.ts**：
   ```ts
   /**
    * Storage schema migration registry.
    *
    * Each entry maps a TARGET schema version → a function that takes the previous
    * shape (unknown — caller must defensively narrow) and returns the new shape.
    *
    * Phase 1 (D-03): only v0 → v1 registered. v1 is the initial real schema; the
    * function is effectively a "first-write default" rather than a transformation.
    *
    * Future phases append to this map. The orchestrator (`runMigrations` below)
    * applies them in ascending order until reaching the current schema version.
    */
   export const CURRENT_SCHEMA_VERSION = 1 as const;

   export const migrations: Record<number, (prev: unknown) => unknown> = {
     1: (_prev: unknown) => ({ schemaVersion: 1, helloCount: 0 }),
   };

   /**
    * Apply migrations sequentially from `fromVersion` (exclusive) to
    * CURRENT_SCHEMA_VERSION (inclusive). Returns the migrated value.
    *
    * Caller pattern: load raw value, read its `schemaVersion` (default 0 if
    * absent / non-object), then runMigrations(rawValue, raw?.schemaVersion ?? 0).
    */
   export function runMigrations(prev: unknown, fromVersion: number): unknown {
     let current = prev;
     for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
       const step = migrations[v];
       if (!step) {
         throw new Error(`[storage/migrate] missing migration step for version ${v}`);
       }
       current = step(current);
     }
     return current;
   }
   ```

2. **shared/storage/items.ts**：
   首先用 Context7（或读 wxt 0.20.x storage docs）确认 `storage.defineItem<T>` 的当前签名是否原生支持 `migrations` 字段。**两条路径都准备好实现：**

   - **路径 A（推荐 — 如果 WXT 0.20.x defineItem 支持 `version` + `migrations`）：**
     ```ts
     import { storage } from '#imports';
     import { CURRENT_SCHEMA_VERSION, migrations } from './migrate';

     export type MetaSchema = { schemaVersion: typeof CURRENT_SCHEMA_VERSION; helloCount: number };

     export const META_DEFAULT: MetaSchema = { schemaVersion: CURRENT_SCHEMA_VERSION, helloCount: 0 };

     export const metaItem = storage.defineItem<MetaSchema>('local:meta', {
       fallback: META_DEFAULT,
       version: CURRENT_SCHEMA_VERSION,
       migrations,
     });
     ```

   - **路径 B（fallback — 如果 WXT defineItem 不支持 migrations 选项）：**
     手写一层薄包装，导出与 defineItem 相同的接口（`getValue`、`setValue`、`watch`），内部在 `getValue` 路径上读取 raw 值 → 读 `schemaVersion` → 调用 `runMigrations` → 写回（如果 version 提升过）→ 返回。`setValue` 直写 `chrome.storage.local`。

   关键约束（无论 A / B 都强制）：
   - 顶层**不出现** `await chrome.storage.local.get(...)`（PITFALLS.md §陷阱 4）
   - 唯一 export 是 `metaItem`（+ `MetaSchema`、`META_DEFAULT` 类型）；popup 与 SW 都 import 这一个对象
   - 若选路径 B，新写的 wrapper 必须有公开 `.watch(cb)` 方法（Plan 04 popup 不需要 watch，但 Plan 03 SW 已知未来要订阅；保持 API 一致）

   不要现在创建 sendToHistory / promptHistory / dispatchDraft 等其它 storage item — 它们由 Phase 2/3/4 各自的 plan 添加（Deferred Ideas）。

3. **shared/storage/index.ts**（barrel）：
   ```ts
   export { metaItem, META_DEFAULT } from './items';
   export type { MetaSchema } from './items';
   export { CURRENT_SCHEMA_VERSION, runMigrations, migrations } from './migrate';
   ```
   下游一律 import 自 `@/shared/storage` 而非具体内部路径。
  </action>
  <verify>
    <automated>pnpm typecheck &amp;&amp; node -e "import('./shared/storage/index.ts').catch(()=&gt;{}); console.log('barrel resolves')" 2&gt;/dev/null || pnpm exec tsc --noEmit shared/storage/items.ts shared/storage/migrate.ts shared/storage/index.ts 2&gt;&amp;1 | (! grep -E 'error TS')</automated>
  </verify>
  <done>
    - `shared/storage/migrate.ts` 导出 `migrations`（含 v1 entry）+ `runMigrations` + `CURRENT_SCHEMA_VERSION`
    - `shared/storage/items.ts` 导出 `metaItem` + `MetaSchema` + `META_DEFAULT`
    - 模块顶层无任何 `await`、无任何 `chrome.*.get/set` 副作用调用（grep 验证）
    - `pnpm typecheck` 干净通过
    - `metaItem.getValue()` 在 happy-dom + fake-browser 环境下首次返回 `{ schemaVersion: 1, helloCount: 0 }`（由 Task 3 的测试断言）
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: i18n facade + en/zh_CN locale 文件 + manifest 占位 key</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-08（popup 渲染 `t('popup.hello', { count: N })`，zh_CN "你好，世界 ×N"，en "Hello, world (×N)"）+ §specifics（locale 草稿）+ §"Claude's Discretion"（dot-notation key — 注意 @wxt-dev/i18n 与 chrome _locales 的 key 形态差异，落地形式由 plan 决定）
    - .planning/research/STACK.md §"i18n 边界"（@wxt-dev/i18n 真值来源 = YAML locale 文件 `locales/en.yml` / `locales/zh_CN.yml`；`__MSG_*__` 用于 manifest；`t()` 用于代码）
    - .planning/research/PITFALLS.md §陷阱 11（chrome.i18n 没有复数；用复数中性 phrasing；`__MSG_*__` 在 popup HTML body 不工作）
    - .planning/REQUIREMENTS.md FND-06 + I18N-04（manifest name/description/default_title 经 __MSG_*__）
    - 当前 wxt.config.ts（Plan 01 落地后）— manifest 引用了 `extension_name` / `extension_description` / `action_default_title` 三个 key，本 task 必须在两份 locale 中提供这些 key
  </read_first>
  <files>
    assets/locales/en.yml
    assets/locales/zh_CN.yml
    shared/i18n/index.ts
  </files>
  <action>
1. **确认 @wxt-dev/i18n 当前真值来源 + 文件路径：** 用 Context7（或读 https://wxt.dev/i18n）确认 0.2.5 的精确路径约定。**本 plan 按 STACK.md §"i18n 边界" 锁定的 YAML 形态落地**：源文件为 `assets/locales/en.yml` / `assets/locales/zh_CN.yml`，wxt prepare 在构建期把它们生成为 `_locales/<lang>/messages.json` 供 chrome.i18n 与 manifest `__MSG_*__` 占位符消费。Chrome `__MSG_*__` 解析与源文件格式无关 — 只关心 build 输出的 `_locales/*/messages.json`。**本 plan 与 STACK.md §i18n 边界 的真值定义完全对齐，无 deviation 需要记录到 SUMMARY.md。** 如 Context7 显示其它路径（极少见），按文档调整 `wxt.config.ts` 与本 task 文件位置，并把该差异记入 01-2-SUMMARY.md。

2. **assets/locales/en.yml**（与 zh_CN.yml 100% 键同构）：
   ```yaml
   extension_name:
     message: "Web2Chat"

   extension_description:
     message: "One-click clip-and-send to your favorite IM or AI agent chat."

   action_default_title:
     message: "Web2Chat — clip current page"

   popup_hello:
     message: "Hello, world (×$COUNT$)"
     placeholders:
       count:
         content: "$1"
         example: "5"
   ```

3. **assets/locales/zh_CN.yml**：
   ```yaml
   extension_name:
     message: "Web2Chat"

   extension_description:
     message: "一键把当前网页投递到 IM 或 AI Agent 聊天会话"

   action_default_title:
     message: "Web2Chat — 投递当前页面"

   popup_hello:
     message: "你好，世界 ×$COUNT$"
     placeholders:
       count:
         content: "$1"
         example: "5"
   ```
   （文案直接采用 D-08 + §specifics 的草稿；不要加 `popup_say_hello` 等 D-09 已驳回方案对应的 key）

4. **shared/i18n/index.ts** — 类型化 t() facade：
   ```ts
   import { i18n } from '#i18n';

   /**
    * Re-export the typed t() function from `@wxt-dev/i18n`.
    *
    * Phase 1 keys:
    *  - extension_name / extension_description / action_default_title
    *    (referenced from manifest via __MSG_*__ — DO NOT call t() for these in code;
    *     they are resolved at manifest-load time by chrome.i18n)
    *  - popup_hello (used at runtime in popup; takes 1 numeric param COUNT)
    *
    * Future phases append keys; full coverage audit + runtime locale switch belong to Phase 6 / I18N-01..04.
    */
   export const t = i18n.t;
   export type T = typeof i18n.t;
   ```

5. **跑 `pnpm wxt prepare`** 验证 wxt 从 YAML 源生成 `_locales/{en,zh_CN}/messages.json` + `wxt-i18n-structure.d.ts`（路径名以实际生成结果为准）；如生成失败，把 `assets/locales/` 路径调整为 wxt 实际期望路径。
6. **跑 `pnpm build`**，验证 `.output/chrome-mv3/_locales/en/messages.json` 与 `_locales/zh_CN/messages.json` 都存在且含上述 4 个 key。
7. **跑 `pnpm verify:manifest`**，验证 manifest 校验脚本仍通过（即 `__MSG_extension_name__` 等占位符在 locale 中已定义、build 输出正确）。
  </action>
  <verify>
    <automated>pnpm wxt prepare &amp;&amp; pnpm build &amp;&amp; pnpm verify:manifest &amp;&amp; test -f assets/locales/en.yml &amp;&amp; test -f assets/locales/zh_CN.yml &amp;&amp; node -e "const en=require('./.output/chrome-mv3/_locales/en/messages.json'); const zh=require('./.output/chrome-mv3/_locales/zh_CN/messages.json'); const enKeys=Object.keys(en).sort(); const zhKeys=Object.keys(zh).sort(); if(JSON.stringify(enKeys)!==JSON.stringify(zhKeys)){console.error('locale key parity FAIL', {enKeys, zhKeys}); process.exit(1)} for(const k of ['extension_name','extension_description','action_default_title','popup_hello']){if(!en[k]||!zh[k]){console.error('missing required key', k);process.exit(1)}} if(!en.popup_hello.message.includes('$COUNT$')||!zh.popup_hello.message.includes('$COUNT$')){console.error('popup_hello missing $COUNT$ placeholder');process.exit(1)} console.log('locale parity + required keys OK')"</automated>
  </verify>
  <done>
    - `assets/locales/en.yml` 与 `assets/locales/zh_CN.yml` 存在且键 100% 同构
    - 两份 locale 都含 `extension_name`、`extension_description`、`action_default_title`、`popup_hello`
    - `popup_hello.message` 在两份文件中都含 `$COUNT$` 占位符且声明了 `placeholders.count`
    - `shared/i18n/index.ts` 导出类型化 `t`
    - `pnpm build` 后 `.output/chrome-mv3/_locales/{en,zh_CN}/messages.json` 都生成（由 wxt prepare 从 YAML 源转换）
    - `pnpm verify:manifest` 仍输出 `[verify-manifest] OK`
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Vitest 配置 + storage / migrate 单元测试</name>
  <read_first>
    - .planning/research/STACK.md §"开发工具"（Vitest + happy-dom + WXT fake-browser）
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-04（验证强度上限：杀 SW 后 + 浏览器重启后 counter 仍递增 — Vitest 不能直接验证后者，但可验证 .local 持久化语义）
    - 当前 shared/storage/items.ts + shared/storage/migrate.ts（Task 1 落地）
    - WXT testing docs：`wxt/testing/vitest-plugin` + `wxt/testing/fake-browser`（用 Context7 获取当前 0.20.x API 形态）
  </read_first>
  <files>
    vitest.config.ts
    tests/unit/storage/migrate.spec.ts
    tests/unit/storage/items.spec.ts
  </files>
  <action>
1. **vitest.config.ts**（项目根）：
   ```ts
   import { defineConfig } from 'vitest/config';
   import { WxtVitest } from 'wxt/testing';

   export default defineConfig({
     plugins: [WxtVitest()],
     test: {
       environment: 'happy-dom',
       include: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.tsx'],
       exclude: ['tests/e2e/**', 'node_modules/**', '.output/**', '.wxt/**'],
       globals: false,
       restoreMocks: true,
       coverage: {
         enabled: false, // 留 Phase 6 再考虑
       },
     },
   });
   ```
   注意：用 Context7 / WXT 文档确认 0.20.x `wxt/testing/vitest-plugin` 的当前 named export 是 `WxtVitest` 还是其它名称；按实际签名落地。

2. **tests/unit/storage/migrate.spec.ts**：
   ```ts
   import { describe, it, expect } from 'vitest';
   import { migrations, runMigrations, CURRENT_SCHEMA_VERSION } from '@/shared/storage/migrate';

   describe('storage/migrate', () => {
     it('exposes a migration entry for the current schema version', () => {
       expect(migrations[CURRENT_SCHEMA_VERSION]).toBeTypeOf('function');
     });

     it('migrates from v0 (no value) to v1 default shape', () => {
       const result = runMigrations(undefined, 0) as { schemaVersion: number; helloCount: number };
       expect(result).toEqual({ schemaVersion: 1, helloCount: 0 });
     });

     it('is a no-op when already at current version', () => {
       const already = { schemaVersion: 1, helloCount: 7 };
       const result = runMigrations(already, CURRENT_SCHEMA_VERSION);
       expect(result).toBe(already);
     });

     it('throws if a migration step is missing in the chain', () => {
       expect(() => runMigrations(undefined, -1)).toThrow();
     });
   });
   ```

3. **tests/unit/storage/items.spec.ts**：
   ```ts
   import { beforeEach, describe, it, expect } from 'vitest';
   import { fakeBrowser } from 'wxt/testing';
   import { metaItem, META_DEFAULT } from '@/shared/storage/items';

   describe('storage/items metaItem', () => {
     beforeEach(() => {
       fakeBrowser.reset();
     });

     it('returns the default value when storage is empty', async () => {
       const value = await metaItem.getValue();
       expect(value).toEqual(META_DEFAULT);
     });

     it('persists writes via setValue and reads them back', async () => {
       await metaItem.setValue({ schemaVersion: 1, helloCount: 5 });
       const value = await metaItem.getValue();
       expect(value).toEqual({ schemaVersion: 1, helloCount: 5 });
     });

     it('writes to chrome.storage.local (NOT session) per D-04', async () => {
       await metaItem.setValue({ schemaVersion: 1, helloCount: 3 });
       const local = await fakeBrowser.storage.local.get('meta');
       const session = await fakeBrowser.storage.session.get('meta');
       expect(local.meta).toBeDefined();
       expect(session.meta).toBeUndefined();
     });
   });
   ```
   注意：`fakeBrowser.storage.local.get('meta')` 假定 wxt defineItem 'local:meta' 用 `meta` 作为底层 chrome key（去 `local:` 前缀）。若 0.20.x 实现为 `local:meta` 字面 key，相应调整断言。
4. **跑 `pnpm test`**，应所有测试通过。
  </action>
  <verify>
    <automated>pnpm exec vitest run --reporter=basic 2&gt;&amp;1 | tee /tmp/web2chat-vitest.log; test ${PIPESTATUS[0]} -eq 0 &amp;&amp; grep -q 'tests/unit/storage/migrate.spec.ts' /tmp/web2chat-vitest.log &amp;&amp; grep -q 'tests/unit/storage/items.spec.ts' /tmp/web2chat-vitest.log</automated>
  </verify>
  <done>
    - `vitest.config.ts` 含 WxtVitest plugin + happy-dom + 正确 include/exclude
    - `pnpm test` 跑通，至少 7 个断言全部 pass（迁移 4 + items 3）
    - 断言验证 metaItem 写到 .local 而不是 .session（D-04 的结构性证据）
    - 测试文件不含任何 chrome.* 直接调用（一切走 fakeBrowser / metaItem facade）
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| popup ↔ shared/storage facade | popup 唯一可读写存储的入口；不允许直接调 chrome.storage.local |
| shared/storage ↔ chrome.storage.local | 应用进程 ↔ 浏览器持久化层；schemaVersion 是 forward-compat 的唯一守护 |
| 仓库 ↔ 用户私有数据 | Phase 1 不存储任何 PII（仅 helloCount 数值探针）；为后续 phase 写入页面快照 / prompt 建立"本地优先"约束 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-2-01 | Information Disclosure (V8.1 — Data classification at rest) | shared/storage/items.ts → chrome.storage.local | mitigate | 所有写入仅落 chrome.storage.local（D-04 + STG-01）；无 fetch / XHR / 远程同步逻辑；items.spec.ts 显式断言写到 .local 不写 .session 也不写其它位置；Phase 2-7 任何新增 storage item 必须沿用此 facade（STG-02 强制） |
| T-01-2-02 | Tampering | shared/storage/migrate.ts | mitigate | runMigrations 在缺失迁移步骤时显式抛错（不静默吞），单元测试覆盖该路径；schemaVersion 字段是 forward-compat 检测窗口 — 未来 phase 修改 schema 必须先 bump CURRENT_SCHEMA_VERSION 并追加 migrations entry，否则旧用户读取时立即 fail-fast |
| T-01-2-03 | Information Disclosure | locale 文件 (assets/locales/*.yml) | accept | 文案是公开界面文本，无敏感数据；en/zh_CN 文案均无 PII / 凭据 |
| T-01-2-04 | Repudiation | metaItem.setValue 写入路径 | accept | Phase 1 helloCount 只是单纯递增计数器；无审计需求；Phase 7 PRIVACY.md 总览隐私边界 |
</threat_model>

<verification>
- `pnpm typecheck` 干净
- `pnpm test` 对 storage/migrate 与 storage/items 全部测试通过
- `grep -rn "chrome\\.storage" shared/storage/items.ts shared/storage/migrate.ts shared/storage/index.ts` 返回 0 行（typed facade 不直接 reference chrome 全局；通过 wxt `#imports` 或 fake-browser 中转）
- `grep -nE "^await |^[^/]*\\bawait\\b" shared/storage/items.ts shared/storage/migrate.ts shared/i18n/index.ts | grep -v '^#' | grep -c '.' | grep -q '^0$'` — 即 shared/ 模块顶层无 await（陷阱 4）
- `.output/chrome-mv3/_locales/en/messages.json` 与 `.output/chrome-mv3/_locales/zh_CN/messages.json` 键完全相同
- `pnpm verify:manifest` 仍通过
</verification>

<success_criteria>
- shared/storage 与 shared/i18n 是纯共享模块，可在 popup（Plan 04）与 SW（Plan 03）任一上下文 import，且不引入 chrome.* 模块顶层副作用
- 迁移框架真实就位（不是注释占位）；下游 phase 修改 schema 时模式已经显式
- en + zh_CN locale 文件 100% 键同构，含 popup hello + manifest 占位三件套
- Vitest 在 fake-browser 上跑通，作为 Plan 03 / 04 单元测试的基线
- 满足 FND-04（schema + 版本 + 迁移钩子）+ FND-06（i18n + en/zh_CN）+ STG-01（chrome.storage.local 唯一写入路径）+ STG-02（typed repo）
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-2-SUMMARY.md` capturing:
- WXT 0.20.x defineItem 实际是否原生支持 `migrations` 字段（影响 items.ts 落地路径 A vs B）
- @wxt-dev/i18n 0.2.5 真值来源文件路径（`assets/locales/*.yml` 是 STACK.md §i18n 边界锁定的形态；如 wxt 实际期望其它路径请记录偏差）
- fake-browser API 实际签名快照（影响 items.spec.ts 断言 .local 用 'meta' 还是 'local:meta' key）
- 迁移测试 4 + items 测试 3 的实际通过截图 / 日志摘录
</output>

<deviations>
W1 (plan-checker iter 1) 处理记录：
- plan-checker iter 1 报告"Plan locks `assets/locales/{en,zh_CN}.json` but STACK.md §i18n 边界 specifies YAML truth source"。
- 复核当前 plan 状态：本 plan 自起始版本即以 YAML（`assets/locales/{en,zh_CN}.yml`）落地（见 frontmatter `files_modified` + Task 2 action 步骤 1-3 + verify 中的 `test -f assets/locales/en.yml`）。
- 结论：**当前 plan 与 STACK.md §i18n 边界 完全对齐，无 JSON-vs-YAML drift 需要解决**。W1 finding 的前提（"plan picks JSON"）与本 plan 实际状态不符；保留本 plan 的 YAML 形态、不作改动。
- SUMMARY.md 记录指引：执行者无需为 i18n 源格式记录任何 deviation；如 wxt 0.20.x / @wxt-dev/i18n 0.2.5 在执行机上要求其它路径或格式（极少见），按 Task 2 action 步骤 1 末尾的指引把该差异记入 01-2-SUMMARY.md。
</deviations>
</content>
