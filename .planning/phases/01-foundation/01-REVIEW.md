---
phase: 01-foundation
reviewed: 2026-04-29T06:17:02Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - entrypoints/background.ts
  - entrypoints/popup/App.tsx
  - entrypoints/popup/index.html
  - entrypoints/popup/main.tsx
  - entrypoints/popup/style.css
  - locales/en.yml
  - locales/zh_CN.yml
  - playwright.config.ts
  - scripts/verify-manifest.ts
  - shared/i18n/index.ts
  - shared/messaging/index.ts
  - shared/messaging/protocol.ts
  - shared/messaging/result.ts
  - shared/storage/index.ts
  - shared/storage/items.ts
  - shared/storage/migrate.ts
  - tests/e2e/fixtures.ts
  - tests/e2e/popup-rpc.spec.ts
  - tests/unit/messaging/bumpHello.spec.ts
  - tests/unit/messaging/protocol.spec.ts
  - tests/unit/storage/items.spec.ts
  - tests/unit/storage/migrate.spec.ts
  - wxt.config.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-04-29T06:17:02Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Phase 1 骨架整体落地扎实：MV3 SW 纪律严守（顶层同步 listener、handler 内读 storage、未使用 module-scope 状态）；类型化 RPC + Result 边界清晰；manifest 通过 `verify-manifest.ts` 硬拦 `<all_urls>` 进入静态 `host_permissions`；Tailwind v4 + Preact 装配按 D-10 直接落地；i18n 真值源使用 YAML、双语 100% 键覆盖。无 Critical 级别的安全 / 数据丢失风险。

值得在 Phase 2 起步前修掉的主要是四项 Warning：
- `migrations[1]` 丢弃 `prev`，是未来真升级路径上的 footgun（W-01）。
- `bumpHello` 业务核心在 SW entrypoint 与单元测试中被复制实现，验证的不是真正运行时路径（W-02）。
- e2e `reloadExtension` 存在 `serviceworker` 事件监听竞态（W-03）。
- popup `index.html` 内的 `__MSG_action_default_title__` 不会被 chrome.i18n 替换（W-04）。

四项 Info 主要是约束契约里的死代码 / 文档与现实不一致 / 装配冗余，建议顺手清理。

## Warnings

### WR-01: `migrations[1]` discards `prev`, breaking the migration contract for any non-default legacy data

**File:** `shared/storage/migrate.ts:3-5`

**Issue:** Per WXT storage 与项目自定义 `runMigrations` 的语义，`migrations[N]` 接收上一版本的数据，返回 N 版本形态。当前 `1: () => ({ schemaVersion: 1, helloCount: 0 })` 直接忽略入参。Phase 1 因为还没有任何线上版本（v1 是首发），实际不会引入数据丢失；但这给未来留下两个隐藏风险：
1. 任何 pre-versioning 的早期开发构建（CI / 自测）写入的 `local:meta` 数据，在 dev 升级路径上会被无声清零。
2. 这条 migration 一旦被作为模板复制到 `migrations[2]`、`migrations[3]`，开发者可能习惯性地写出"返回常量"的形式，导致 helloCount / 未来字段在生产线上被重置为默认值。

**Fix:**
```ts
// shared/storage/migrate.ts
export const migrations: Record<number, (prev: unknown) => unknown> = {
  // v0 → v1: bootstrap shape; preserve any legacy helloCount if present.
  1: (prev) => {
    const legacy = (prev ?? {}) as Partial<{ helloCount: number }>;
    return {
      schemaVersion: 1,
      helloCount: typeof legacy.helloCount === 'number' ? legacy.helloCount : 0,
    };
  },
};
```
同时为 `tests/unit/storage/migrate.spec.ts` 增加一条 case：传入 `{ helloCount: 7 }`（无 schemaVersion）应保留 helloCount=7。

---

### WR-02: SW handler logic is duplicated in `bumpHello.spec.ts`; the unit test never exercises the real handler

**File:** `tests/unit/messaging/bumpHello.spec.ts:14-25`, `entrypoints/background.ts:51-66`

**Issue:** `bumpHelloCore` 在 spec 里照抄了 `entrypoints/background.ts` 的 handler 主体（comment 已承认这点）。后果：
- 任何对真实 handler 的修改（错误处理、字段顺序、`schemas[...].input.parse` 调用时机）都不会被这套测试发现。
- 测试声称在验证 D-08 行为，但实际上是在验证一份 fork 的副本。
- `wrapHandler`（`background.ts:34`）在测试里完全未被覆盖——内部 `INTERNAL` 转换路径目前没有任何自动化测试。

WXT 提供 `wxt/testing/fake-browser`，且 `@webext-core/messaging` 在 `fakeBrowser` 下可正常 round-trip。把 handler 抽成 `shared/messaging/handlers/meta.ts` 后，在 SW entrypoint 与测试里同时复用，是常规做法。

**Fix:**
```ts
// shared/messaging/handlers/meta.ts (new)
import { schemas, Ok, type Result } from '@/shared/messaging';
import { metaItem, type MetaSchema } from '@/shared/storage';

export async function bumpHelloHandler(): Promise<Result<MetaSchema>> {
  schemas['meta.bumpHello'].input.parse(undefined);
  const current = await metaItem.getValue();
  const next = { schemaVersion: 1 as const, helloCount: current.helloCount + 1 };
  await metaItem.setValue(next);
  const validated = schemas['meta.bumpHello'].output.parse(next);
  return Ok(validated);
}
```
然后 `entrypoints/background.ts` 与 `tests/unit/messaging/bumpHello.spec.ts` 都从这里 import，spec 同时新增针对 `wrapHandler` 抛错→`Err('INTERNAL', ...)` 的 case（mock `metaItem.getValue` 抛错）。

---

### WR-03: `reloadExtension` Playwright fixture races against the new service worker event

**File:** `tests/e2e/fixtures.ts:43-53`

**Issue:** 顺序是 `await sw.evaluate(() => chrome.runtime.reload())` → `await context.waitForEvent('serviceworker', { timeout: 10_000 })`。`chrome.runtime.reload()` 在 SW 内同步触发 reload；新的 SW 在 Playwright 客户端绑定 `waitForEvent` 之前就可能已经启动并发出 `serviceworker` 事件。一旦发生，`waitForEvent` 会等到 10 秒超时（或挂在那里直到下次 SW 出现），让 `popup-rpc.spec.ts:50` 那条 SW 重启韧性测试间歇性 flake。

修法是先注册等待，再在 SW 内异步触发 reload（不要 await），确保监听器先就位：

**Fix:**
```ts
reloadExtension: async ({ context }, use) => {
  await use(async () => {
    const [sw] = context.serviceWorkers();
    if (!sw) throw new Error('[e2e] no service worker to reload');
    // Register the wait BEFORE triggering reload to avoid missing the event.
    const swPromise = context.waitForEvent('serviceworker', { timeout: 10_000 });
    // Fire-and-forget: don't await; eval may resolve after the SW is already restarted.
    void sw.evaluate(() => chrome.runtime.reload()).catch(() => {
      // SW context tears down mid-call; expected.
    });
    await swPromise;
  });
},
```

---

### WR-04: `__MSG_action_default_title__` inside popup HTML never gets substituted

**File:** `entrypoints/popup/index.html:6`

**Issue:** Chrome `__MSG_*__` 占位符替换发生在 *manifest fields* 与 CSS 中，**不**对扩展 HTML 文件的内容做替换。`<title>__MSG_action_default_title__</title>` 因此就是字面量字符串。Popup 没有标题栏所以用户不会直接看到这条；但：
- DevTools 顶部 tab 标题、accessibility 工具、用户截屏给客服时，这串原始 placeholder 会出现并造成"扩展似乎没本地化"的观感。
- 给后续阅读这份代码的人留下"HTML 也会被自动替换"的错误信号，下个 phase 写 options page / sidepanel 时会原样复制这个反例。

**Fix（任选其一）：**
- A. 直接写一个固定字符串（popup title 用户看不到，没必要走 i18n）：
  ```html
  <title>Web2Chat</title>
  ```
- B. 用 chrome.i18n 在脚本里注入：
  ```html
  <title></title>
  ```
  ```ts
  // entrypoints/popup/main.tsx
  document.title = chrome.i18n.getMessage('action_default_title');
  ```
推荐 A——popup 标题对最终用户不可见，引入运行时调用是过度工程。

---

## Info

### IN-01: `schemas['meta.bumpHello'].input.parse(undefined)` is a no-op assertion

**File:** `entrypoints/background.ts:55`, `tests/unit/messaging/bumpHello.spec.ts:16`

**Issue:** `input` schema 是 `z.void()`，handler 永远收不到参数（`@webext-core/messaging` 协议签名 `'meta.bumpHello'(): Promise<...>` 没有 args），所以 `parse(undefined)` 总是成功。注释说"validate input"但实际上是死的断言——它在文档上**承诺**了输入校验但运行时没有校验任何东西。Phase 2/3 引入真实有 args 的路由时这条会自然消失，但当前留着会让"FND-03 输入校验"读起来比实际更可信。

**Fix:** 要么删掉这一行（让代码与现实对齐），要么把 input schema 抽到一个 helper 里、对真实接收到的 args（即从 messaging 层透传过来的对象）做校验。Phase 1 推荐直接删，并在注释里改为"input is `z.void()` — runtime validation kicks in at Phase 3 when real args appear"。

---

### IN-02: `runMigrations` is parallel infrastructure that production code never calls

**File:** `shared/storage/migrate.ts:7-17`, `shared/storage/index.ts:3`

**Issue:** `metaItem` 在 `items.ts` 用 `storage.defineItem({ migrations })` 形式注册，迁移由 WXT 自己运行。手写的 `runMigrations` 只在 `tests/unit/storage/migrate.spec.ts` 中被调用。它复制了 WXT 的循环逻辑，存在两个未来风险：
- WXT 在 0.21+ 改变迁移触发语义时（例如 from-version 计算方式），手写版本会与真实运行时漂移，但测试还会绿。
- 二次开发者会以为可以在 production 调 `runMigrations`，把它当成"主迁移入口"使用。

**Fix:** 选其一：
- 把 `runMigrations` 限制在 spec 模块里（不要从 `shared/storage/index.ts` re-export），并把签名改成 `_runMigrationsForTests` 之类显式的名字。
- 或者整段删掉 `runMigrations` + `migrate.spec.ts` 里那 4 条 case，改成针对 `metaItem.getValue()`（在 fakeBrowser 中 set 一份 v0 数据后看 WXT 是否运行了 `migrations[1]`）的集成测试。

---

### IN-03: `package.json` runs husky twice on install (`postinstall` + `prepare`)

**File:** `package.json:25-26`

**Issue:**
```json
"postinstall": "wxt prepare && husky",
"prepare":     "husky"
```
`pnpm install` 会触发 `prepare` 然后 `postinstall`，这会让 husky 安装 hook 跑两次。Husky 9 是幂等的，所以没有功能性 bug，但每次 install 会有两条 husky 输出，让 CI 日志噪音变多，也会让新人困惑"哪条是真正的入口"。

**Fix:** 合并到一个钩子；保留 `prepare`（npm 标准生命周期），把 wxt prepare 一并放进去：
```json
"postinstall": "wxt prepare",
"prepare": "husky"
```
或：
```json
"postinstall": "wxt prepare && husky",
// 删掉独立的 "prepare"
```

---

### IN-04: `react` / `react-dom` path aliases in `tsconfig.json` are unused after `jsxImportSource: 'preact'`

**File:** `tsconfig.json:14-17`

**Issue:** `jsx: 'react-jsx'` + `jsxImportSource: 'preact'` 已让 TS 直接从 `preact/jsx-runtime` 解析 JSX runtime；下面四条 `react` / `react/jsx-runtime` / `react-dom` / `react-dom/*` paths alias 在当前代码里没有任何 import 命中（仓库里没有 `from 'react'` / `from 'react-dom'`）。它们是为了未来引入 React-only 第三方库（典型如 React Hook Form、TanStack Query）时让 preact/compat 接管而预留的——但 Phase 1 还没有这种依赖。

留着不算 bug，但符合 CLAUDE.md "No 'flexibility' or 'configurability' that wasn't requested" 的话应该删掉，等 Phase 3 popup UI 真的接入需要 compat 的库时再加回来。

**Fix:**
```json
"paths": {
  "~/*": ["./*"],
  "@/*": ["./*"],
  "@/shared/*": ["./shared/*"],
  "#i18n": ["./.wxt/i18n/index.ts"]
}
```
删除 4 条 `react*` 别名；引入第一个需要 React API 表面的库时再恢复（届时用 PR 注释把"为什么需要 preact/compat"写清楚）。

---

_Reviewed: 2026-04-29T06:17:02Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
