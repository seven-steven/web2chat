---
id: 01-3-messaging-sw
phase: 01-foundation
plan: 3
title: 类型化消息协议 + Service Worker 顶层 listener
wave: 3
type: execute
depends_on: [01-2-storage-i18n]
requirements: [FND-02, FND-03]
files_modified:
  - shared/messaging/protocol.ts
  - shared/messaging/result.ts
  - shared/messaging/index.ts
  - entrypoints/background.ts
  - tests/unit/messaging/protocol.spec.ts
  - tests/unit/messaging/bumpHello.spec.ts
autonomous: true
user_setup: []
must_haves:
  truths:
    - "service worker 在模块顶层同步注册 `chrome.runtime.onMessage` 等 listener；listener 注册之前不出现任何 `await` 表达式（FND-02 + 陷阱 4）"
    - "popup → SW 的 RPC 入参先经 zod schema 校验，校验失败由 wrapper 转换为 `{ ok: false, code: 'INTERNAL', message, retriable: false }` 而非 throw 跨进程（FND-03 + D-06）"
    - "SW handler 内若抛 throw，被顶层 wrapper 捕获并转成 `Result.err('INTERNAL', ...)`；业务逻辑错误（Phase 1 暂无）必须返回 `Result.err(...)` 而非 throw（D-06）"
    - "`meta.bumpHello` 路由：调用时 SW 读 metaItem → helloCount + 1 → 写回 metaItem → 返回 `{ ok: true, data: { schemaVersion, helloCount } }`（D-08）"
    - "ProtocolMap 集中在单文件 `shared/messaging/protocol.ts`（D-07，Phase 1 仅 1 条路由 — Phase 3 路由超 5 条时再拆分）"
    - "ErrorCode 枚举仅含 `INTERNAL`（D-06,Phase 1 起步；DSP-07 / ADO-* 各自扩枚举）"
    - "杀 SW 后再次触发 `meta.bumpHello` 路由仍返回新的 helloCount（FND-02 的端到端证据；正式验证由 Plan 04 的 Playwright e2e 完成）"
  artifacts:
    - path: "shared/messaging/protocol.ts"
      provides: "ProtocolMap 接口（Phase 1 形态：仅 meta.bumpHello）+ zod schemas（输入空、输出 MetaSchema）+ defineExtensionMessaging<TProtocolMap>() 实例（导出 sendMessage / onMessage）"
      contains: "meta.bumpHello"
    - path: "shared/messaging/result.ts"
      provides: "Result<T, E> 类型 + Ok / Err 构造器 + ErrorCode 枚举（Phase 1 仅 INTERNAL）"
      contains: "ErrorCode"
    - path: "entrypoints/background.ts"
      provides: "WXT background entrypoint；defineBackground 内顶层 onMessage handler 注册；handler 内调用 metaItem 实现 bumpHello；wrapper 把 throw 兜成 Result.err('INTERNAL')"
      contains: "defineBackground"
    - path: "tests/unit/messaging/protocol.spec.ts"
      provides: "ProtocolMap 形态 + zod schema 单元测试"
      contains: "bumpHello"
    - path: "tests/unit/messaging/bumpHello.spec.ts"
      provides: "bumpHello handler 行为测试 — 在 fakeBrowser + reset 后调用应返回 helloCount=1，再调用应返回 2；未捕获 throw 应转为 Result.err('INTERNAL')"
      contains: "bumpHello"
  key_links:
    - from: "entrypoints/background.ts"
      to: "shared/messaging/protocol.ts"
      via: "import { onMessage } from '@/shared/messaging'"
      pattern: "onMessage\\('meta\\.bumpHello'"
    - from: "entrypoints/background.ts"
      to: "shared/storage/items.ts"
      via: "import { metaItem }"
      pattern: "metaItem\\.(getValue|setValue)"
    - from: "Plan 04 entrypoints/popup/main.tsx (未来)"
      to: "shared/messaging/protocol.ts"
      via: "import { sendMessage }"
      pattern: "sendMessage\\('meta\\.bumpHello'"
---

<objective>
落地 popup ↔ service worker 之间的类型化 RPC 协议（FND-03 + D-05/D-06/D-07）与 SW 入口（FND-02）。Phase 1 唯一路由是 `meta.bumpHello`：popup mount 时调用，SW 把 `helloCount` 自增并返回（D-08 / D-09）。

Purpose: ARCHITECTURE.md §"模式 4" 把"顶层同步注册 listener、handler 内部读 storage"列为 MV3 SW 唯一可工作的形态；PITFALLS.md §陷阱 3、4 把任何不遵循这一模式的实现都列为生产中静默崩溃源。本 plan 把这一模式从 Phase 1 起就**结构性**确立 — Plan 04 的 popup、Phase 2 的 capture、Phase 3 的 dispatch 都将在这之上扩展，而非重写。

Output: `shared/messaging/{protocol,result,index}.ts`、`entrypoints/background.ts`、Vitest 单元测试覆盖协议形态与 bumpHello handler 行为。
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
@.planning/phases/01-foundation/01-2-storage-i18n-PLAN.md

<interfaces>
<!-- Plan 02 已落地，Plan 03 直接 import 这些。 -->

来自 shared/storage（Plan 02）：
```typescript
export type MetaSchema = { schemaVersion: 1; helloCount: number };
export const META_DEFAULT: MetaSchema;
export const metaItem: { getValue(): Promise<MetaSchema>; setValue(v: MetaSchema): Promise<void>; watch(cb: ...): () => void };
```

本 plan 创建（Plan 04 popup 将 import）：
```typescript
// shared/messaging/result.ts
export type ErrorCode = 'INTERNAL';   // Phase 1 起步；后续 phase 各自 union 扩展
export type Result<T, E extends ErrorCode = ErrorCode> =
  | { ok: true; data: T }
  | { ok: false; code: E; message: string; retriable: boolean };
export const Ok: <T>(data: T) => Result<T, never>;
export const Err: <E extends ErrorCode>(code: E, message: string, retriable?: boolean) => Result<never, E>;

// shared/messaging/protocol.ts
import { defineExtensionMessaging } from '@webext-core/messaging';
export interface ProtocolMap {
  'meta.bumpHello'(): Promise<Result<MetaSchema>>;
}
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
// 配套 zod schema（input = z.void()；output = z.object({ schemaVersion: z.literal(1), helloCount: z.number().int().nonnegative() })）
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Result + ErrorCode + ProtocolMap + zod schemas（D-05/06/07）</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-05（@webext-core/messaging + defineExtensionMessaging<TProtocolMap>）+ D-06（混合错误模型）+ D-07（Phase 1 ProtocolMap 单文件）+ D-08（meta.bumpHello 形态）
    - .planning/research/STACK.md §"配套库"（zod 3.24）
    - .planning/REQUIREMENTS.md FND-03（zod 校验 + 跨上下文 RPC 输入/输出明确 TS 类型）
    - .planning/research/ARCHITECTURE.md §"模式 1"（popup 永远不直接与 content script 通信）
    - 当前 shared/storage/items.ts（Plan 02 落地的 MetaSchema 类型）
    - 用 Context7 拉取 `@webext-core/messaging` 的 `defineExtensionMessaging` 当前 API 形态（确认 `defineExtensionMessaging<TProtocolMap>()` 返回的 sendMessage / onMessage 形态；如签名差异按真实签名落地）
  </read_first>
  <files>
    shared/messaging/result.ts
    shared/messaging/protocol.ts
    shared/messaging/index.ts
  </files>
  <action>
1. **shared/messaging/result.ts**：

```ts
/**
 * Mixed error model (D-06):
 *   - Business errors → return Result.err(...) — never throw across process boundaries
 *   - Programmer errors / chrome.* surprises → throw inside handler;
 *     the SW top-level wrapper (entrypoints/background.ts) catches and converts to
 *     Result.err('INTERNAL', message, retriable=false)
 *
 * ErrorCode is a union starting with 'INTERNAL' only (Phase 1).
 * Each subsequent phase extends the union:
 *   Phase 3 (DSP-07):  | 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED'
 *   Phase 4 (ADO-05):  | 'OPENCLAW_OFFLINE' | 'OPENCLAW_PERMISSION_DENIED'
 */
export type ErrorCode = 'INTERNAL';

export type Result<T, E extends ErrorCode = ErrorCode> =
  | { ok: true; data: T }
  | { ok: false; code: E; message: string; retriable: boolean };

export const Ok = <T>(data: T): Result<T, never> => ({ ok: true, data });

export function Err<E extends ErrorCode = ErrorCode>(
  code: E,
  message: string,
  retriable = false,
): Result<never, E> {
  return { ok: false, code, message, retriable };
}
```

2. **shared/messaging/protocol.ts**：

```ts
import { defineExtensionMessaging } from '@webext-core/messaging';
import { z } from 'zod';
import type { MetaSchema } from '@/shared/storage';
import type { Result } from './result';

/**
 * RPC ProtocolMap (D-07).
 *
 * Phase 1: single route — meta.bumpHello.
 * Phase 3 will split this file into shared/messaging/routes/{capture,dispatch,history,...}.ts
 * once route count > 5; protocol.ts will re-export the union.
 */
export interface ProtocolMap {
  'meta.bumpHello'(): Promise<Result<MetaSchema>>;
}

/**
 * zod schemas for runtime validation at the SW handler boundary (FND-03).
 *  - input  validated INSIDE the handler before business logic
 *  - output validated AFTER business logic in tests / contract checks
 */
export const schemas = {
  'meta.bumpHello': {
    input: z.void(),
    output: z.object({
      schemaVersion: z.literal(1),
      helloCount: z.number().int().nonnegative(),
    }),
  },
} as const;

export type MetaBumpHelloOutput = z.infer<(typeof schemas)['meta.bumpHello']['output']>;

/**
 * Typed extension messaging (D-05). Both popup and SW import sendMessage / onMessage from here.
 * Background entrypoint registers the actual handler at module top level.
 */
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
```

3. **shared/messaging/index.ts**（barrel）：

```ts
export type { Result, ErrorCode } from './result';
export { Ok, Err } from './result';
export type { ProtocolMap, MetaBumpHelloOutput } from './protocol';
export { sendMessage, onMessage, schemas } from './protocol';
```

4. **跑 `pnpm typecheck`** 验证类型自洽（`MetaSchema` 从 storage 导入，与 zod 输出推断对得上）。
  </action>
  <verify>
    <automated>pnpm typecheck &amp;&amp; grep -q 'defineExtensionMessaging' shared/messaging/protocol.ts &amp;&amp; grep -q 'z.literal(1)' shared/messaging/protocol.ts &amp;&amp; grep -q "ErrorCode = 'INTERNAL'" shared/messaging/result.ts &amp;&amp; ! grep -E "ErrorCode = '(NOT_LOGGED_IN|TIMEOUT|RATE_LIMITED|OPENCLAW)" shared/messaging/result.ts</automated>
  </verify>
  <done>
    - `shared/messaging/result.ts` 导出 `Result`、`ErrorCode`（仅 'INTERNAL'）、`Ok`、`Err`
    - `shared/messaging/protocol.ts` 导出 `ProtocolMap`（含 `meta.bumpHello`）、`schemas['meta.bumpHello'].input/output`、`sendMessage`、`onMessage`
    - `shared/messaging/index.ts` 是统一入口；下游 import 一律走它
    - `pnpm typecheck` 干净
    - shared/messaging 顶层无 `chrome.*` 副作用调用、无顶层 await
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Service Worker 入口 + meta.bumpHello handler + 顶层 wrapper</name>
  <read_first>
    - .planning/REQUIREMENTS.md FND-02（顶层同步注册 listener，无 top-level await）
    - .planning/research/PITFALLS.md §陷阱 3（SW 中途死亡 — listener 必须每次唤醒都重新注册，因为 SW 模块顶层会重新执行）+ §陷阱 4（顶层 await + importScripts 禁忌）
    - .planning/research/ARCHITECTURE.md §"模式 4"（顶层 listener 注册）+ §"组件职责"（SW 唯一事实来源；handler 内部读 storage 而非模块作用域缓存）
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-06（混合错误模型 — handler throw 由 wrapper 兜成 INTERNAL）+ D-08（bumpHello = read → +1 → write → return）
    - 当前 shared/messaging/protocol.ts + shared/storage/items.ts（Task 1 + Plan 02 落地）
    - 用 Context7 拉取 WXT 0.20.x `defineBackground` 当前 API（确认是否要 `main()` 包裹、是否支持顶层 listener 注册；**注意：0.20.x 的 `defineBackground` 通过 `#imports` 自动导入或从 `wxt/utils/define-background` 导入；早期 minor 的 `wxt/sandbox` 路径在 0.20.x 已不可用**）
  </read_first>
  <files>
    entrypoints/background.ts
  </files>
  <action>
1. **entrypoints/background.ts** — WXT 0.20.x 形态：

```ts
import { defineBackground } from '#imports';
import { onMessage, schemas, Ok, Err, type ProtocolMap } from '@/shared/messaging';
import { metaItem } from '@/shared/storage';

/**
 * Service Worker entrypoint.
 *
 * MV3 + WXT contract (FND-02 + PITFALLS §陷阱 3/4):
 *   - All chrome.runtime.* listeners are registered SYNCHRONOUSLY at module top level
 *     of the function passed to defineBackground.
 *   - NO `await` appears before listener registration.
 *   - handlers READ state from chrome.storage.local each invocation — they do NOT
 *     rely on module-scope variables (which vanish on SW restart).
 *
 * Mixed error model (D-06):
 *   - Business errors return Err(code, message, retriable)
 *   - Programmer errors / chrome.* surprises throw — wrapHandler catches and
 *     converts to Err('INTERNAL', err.message, false).
 *
 * Phase 1 ErrorCode is just 'INTERNAL'. Future phases (DSP-07, ADO-05, etc.)
 * extend the union and may map specific business errors here.
 *
 * Import path note: WXT 0.20.x exposes `defineBackground` via `#imports`
 * (auto-imports). The older `wxt/sandbox` module path used in earlier WXT minors
 * is NOT valid on 0.20.25 and will fail at build time.
 */

/** Wraps a handler so any thrown error becomes a Result.err('INTERNAL', ...). */
function wrapHandler<K extends keyof ProtocolMap>(
  fn: () => ReturnType<ProtocolMap[K]>,
): () => Promise<Awaited<ReturnType<ProtocolMap[K]>>> {
  return async () => {
    try {
      return (await fn()) as Awaited<ReturnType<ProtocolMap[K]>>;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error('[bg] handler threw — converting to Result.err(INTERNAL):', err);
      return Err('INTERNAL', message, false) as Awaited<ReturnType<ProtocolMap[K]>>;
    }
  };
}

export default defineBackground(() => {
  // ────────────────────────────────────────────────────────────────────────
  // TOP-LEVEL LISTENER REGISTRATION (sync, no await before this point)
  // ────────────────────────────────────────────────────────────────────────

  onMessage(
    'meta.bumpHello',
    wrapHandler<'meta.bumpHello'>(async () => {
      // (FND-03) Validate input — bumpHello takes no args, so just assert.
      schemas['meta.bumpHello'].input.parse(undefined);

      // (D-08) Read → +1 → write → return.
      const current = await metaItem.getValue();
      const next = { schemaVersion: 1 as const, helloCount: current.helloCount + 1 };
      await metaItem.setValue(next);

      // (FND-03) Validate output before returning.
      const validated = schemas['meta.bumpHello'].output.parse(next);
      return Ok(validated);
    }),
  );

  // Future phases register additional listeners here at top level
  // (chrome.runtime.onInstalled, chrome.tabs.onUpdated, chrome.alarms.onAlarm, etc.).
});
```

2. **关键约束（grep 验证）：**
   - `defineBackground(() => { ... })` 内的 listener 注册之前**不出现** `await` 关键字（grep 验证）
   - 整个文件**不出现** `setInterval` / `setTimeout`（PITFALLS §陷阱 3 — 周期任务必须用 chrome.alarms，Phase 1 不需要）
   - 不在模块作用域定义任何"in-flight"map（PITFALLS §技术债"模块作用域状态"）
   - **import path 严格使用 `#imports`**（WXT 0.20.x 的官方 auto-import 入口；**禁止** `from 'wxt/sandbox'`，那是 0.19.x 及更早路径，在 0.20.25 上 build 会失败）

3. **跑 `pnpm typecheck`** + `pnpm build`，验证 SW 入口能被 wxt 打包，`.output/chrome-mv3/background.js` 出现。
  </action>
  <verify>
    <automated>pnpm typecheck &amp;&amp; pnpm build &amp;&amp; test -f .output/chrome-mv3/background.js &amp;&amp; ! grep -nE '^[^/]*\bawait\b' entrypoints/background.ts | grep -v '//' | grep -E '^[0-9]+:[^/]*\bawait' &amp;&amp; ! grep -E 'setInterval|setTimeout' entrypoints/background.ts &amp;&amp; grep -F "from '#imports'" entrypoints/background.ts &amp;&amp; ! grep -F "from 'wxt/sandbox'" entrypoints/background.ts &amp;&amp; grep -q 'onMessage(' entrypoints/background.ts &amp;&amp; grep -q "wrapHandler" entrypoints/background.ts &amp;&amp; echo 'SW shape OK'</automated>
  </verify>
  <done>
    - `entrypoints/background.ts` 存在；用 `defineBackground(() => { ... })` 包装
    - `defineBackground` 从 `#imports` 导入（**不**从 `wxt/sandbox` — 后者在 WXT 0.20.x 已废弃）
    - listener 注册（`onMessage('meta.bumpHello', ...)`）出现在 main 函数顶层、第一行实质代码
    - main 函数顶层在 listener 注册之前**无任何 await 表达式**
    - 文件不含 `setInterval` / `setTimeout`
    - bumpHello handler 内部：input zod validate → metaItem.getValue → +1 → metaItem.setValue → output zod validate → Ok(...)
    - throw 经 `wrapHandler` 兜成 `Err('INTERNAL', ...)`
    - `pnpm build` 产生 `.output/chrome-mv3/background.js`
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Vitest 单元测试 — protocol 形态 + bumpHello handler 行为</name>
  <read_first>
    - 当前 entrypoints/background.ts（Task 2 落地）+ shared/messaging/protocol.ts（Task 1 落地）
    - .planning/research/STACK.md §"开发工具"（vitest + happy-dom + WXT fakeBrowser）
    - .planning/phases/01-foundation/01-2-storage-i18n-PLAN.md tests/unit/storage/items.spec.ts（参考 fakeBrowser.reset 模式）
    - WXT testing docs（确认 fakeBrowser API 是否包含 chrome.runtime.onMessage 模拟；如不支持，把 bumpHello 的"业务核心"提取为可单测函数后再测）
  </read_first>
  <files>
    tests/unit/messaging/protocol.spec.ts
    tests/unit/messaging/bumpHello.spec.ts
  </files>
  <action>
1. **tests/unit/messaging/protocol.spec.ts** — 协议形态：

```ts
import { describe, it, expect } from 'vitest';
import { schemas, Ok, Err, type Result, type ErrorCode } from '@/shared/messaging';

describe('messaging/protocol', () => {
  it('exposes meta.bumpHello input and output schemas', () => {
    expect(schemas['meta.bumpHello'].input.safeParse(undefined).success).toBe(true);
    expect(schemas['meta.bumpHello'].input.safeParse('hi').success).toBe(false);
  });

  it('output schema enforces schemaVersion=1 and non-negative integer helloCount', () => {
    const out = schemas['meta.bumpHello'].output;
    expect(out.safeParse({ schemaVersion: 1, helloCount: 0 }).success).toBe(true);
    expect(out.safeParse({ schemaVersion: 1, helloCount: 7 }).success).toBe(true);
    expect(out.safeParse({ schemaVersion: 2, helloCount: 1 }).success).toBe(false);
    expect(out.safeParse({ schemaVersion: 1, helloCount: -1 }).success).toBe(false);
    expect(out.safeParse({ schemaVersion: 1, helloCount: 1.5 }).success).toBe(false);
  });
});

describe('messaging/result', () => {
  it('Ok produces a success Result', () => {
    const r: Result<number> = Ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
  });

  it('Err produces a failure Result with retriable defaulting to false', () => {
    const r: Result<number> = Err('INTERNAL' as ErrorCode, 'boom');
    expect(r).toEqual({ ok: false, code: 'INTERNAL', message: 'boom', retriable: false });
  });

  it('Err honors explicit retriable flag', () => {
    const r = Err('INTERNAL' as ErrorCode, 'try again', true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retriable).toBe(true);
  });
});
```

2. **tests/unit/messaging/bumpHello.spec.ts** — handler 业务行为（直接调用，不走真实 onMessage 通道）：

策略：handler 内部业务核心是"读 metaItem → +1 → 写回"。本任务在 entrypoints/background.ts **不暴露**该内部函数（保持 SW 入口最小），因此本测试：
   - 把"业务核心"作为 spec 内辅助函数复刻（与 background.ts 的 handler 闭包等价）
   - 用 fakeBrowser 验证它在 storage 上的真实读写行为

```ts
import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { metaItem, META_DEFAULT } from '@/shared/storage';
import { schemas, Ok, Err, type Result } from '@/shared/messaging';

/**
 * Mirror of the bumpHello business core in entrypoints/background.ts.
 * Kept colocated with the test to avoid exposing it from the SW entrypoint.
 * If you change the handler logic, change BOTH places — and consider
 * extracting to shared/messaging/handlers/ if a third caller appears.
 */
async function bumpHelloCore(): Promise<Result<{ schemaVersion: 1; helloCount: number }>> {
  try {
    schemas['meta.bumpHello'].input.parse(undefined);
    const current = await metaItem.getValue();
    const next = { schemaVersion: 1 as const, helloCount: current.helloCount + 1 };
    await metaItem.setValue(next);
    const validated = schemas['meta.bumpHello'].output.parse(next);
    return Ok(validated);
  } catch (err) {
    return Err('INTERNAL', err instanceof Error ? err.message : String(err), false);
  }
}

describe('bumpHello handler core', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns helloCount=1 on first call from default state', async () => {
    const r = await bumpHelloCore();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ schemaVersion: 1, helloCount: 1 });
  });

  it('increments helloCount on each subsequent call', async () => {
    await bumpHelloCore();
    await bumpHelloCore();
    const r = await bumpHelloCore();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.helloCount).toBe(3);
  });

  it('persists between calls to chrome.storage.local (D-04)', async () => {
    await bumpHelloCore();
    const stored = await metaItem.getValue();
    expect(stored.helloCount).toBe(1);
  });

  it('starts from META_DEFAULT after fakeBrowser.reset()', async () => {
    fakeBrowser.reset();
    const before = await metaItem.getValue();
    expect(before).toEqual(META_DEFAULT);
    const r = await bumpHelloCore();
    if (r.ok) expect(r.data.helloCount).toBe(1);
  });
});
```

3. **跑 `pnpm test`**，验证全部通过。
  </action>
  <verify>
    <automated>pnpm exec vitest run --reporter=basic 2&gt;&amp;1 | tee /tmp/web2chat-msg-vitest.log; test ${PIPESTATUS[0]} -eq 0 &amp;&amp; grep -q 'tests/unit/messaging/protocol.spec.ts' /tmp/web2chat-msg-vitest.log &amp;&amp; grep -q 'tests/unit/messaging/bumpHello.spec.ts' /tmp/web2chat-msg-vitest.log</automated>
  </verify>
  <done>
    - `tests/unit/messaging/protocol.spec.ts`：6+ 断言全部通过（input/output schema 边界 + Ok/Err 结构）
    - `tests/unit/messaging/bumpHello.spec.ts`：4 断言全部通过（first call=1、后续递增、持久化、reset 后回到 default）
    - 测试在 fakeBrowser.reset() 之间互相隔离
    - `pnpm test` 全仓 lint+test 干净
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| popup ↔ SW (chrome.runtime.sendMessage) | 跨上下文 RPC；popup 是 chrome-extension:// origin，被 zod schema 校验在 SW handler 入口截断 |
| 第三方扩展 ↔ SW（externally_connectable） | 默认未启用，但 onMessage 仍可能收到 cross-extension 消息 |
| SW handler 内部业务 ↔ chrome.storage.local | 本 plan 唯一调用 metaItem 的 path |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-3-01 | Tampering (V13.1 — Cross-context message integrity) | popup → SW RPC payload | mitigate | shared/messaging/protocol.ts 的 zod schema 在 SW handler 内部对 input 调用 `.parse()`，校验失败抛 ZodError，被 wrapHandler 捕获并返回 `Err('INTERNAL', ...)`；output 同样在返回前 `.parse()` 验证；FND-03 的结构性强制约束。Phase 1 bumpHello 入参为 void，仍执行 parse 以确立模式 |
| T-01-3-02 | Spoofing | externally_connectable 消息 | accept | manifest 未声明 `externally_connectable`，所以 onMessage 只收到本扩展的 popup / content script。Phase 1 不需要额外 sender.id 校验；Phase 4 引入第三方平台 origin 时再评估 |
| T-01-3-03 | Denial of Service | bumpHello 高频调用导致 storage 抖动 | accept | bumpHello 仅在 popup mount 时被自动调用一次（D-09），不存在循环触发路径；Phase 3 草稿持久化引入 debounce 时再统一治理 |
| T-01-3-04 | Information Disclosure | wrapHandler 的 console.error 输出 | mitigate | 错误消息记录 `err.message` 而非整个对象；不记录 metaItem 内容（仅 helloCount 数值，无 PII，但保持纪律）。生产构建若需要进一步剥离，引入 `__DEV__` 守卫 — Phase 1 不实现 |
| T-01-3-05 | Elevation of Privilege | bumpHello handler 在 throw 时把内部 stack 信息泄漏给 popup | mitigate | wrapHandler 仅把 `err.message` 放进 Result.err.message；不传 `err.stack` |
</threat_model>

<verification>
- `pnpm typecheck` 干净
- `pnpm test` 至少 10 个断言全部通过（protocol 6+ + bumpHello 4）
- `pnpm build` 产出 `.output/chrome-mv3/background.js`
- entrypoints/background.ts 内 `defineBackground(() => { ... })` 主体的第一条实质语句是 `onMessage(...)`（grep + 行号目检）
- entrypoints/background.ts 不含 `setInterval` / `setTimeout` / 模块作用域 `let` 状态变量
- entrypoints/background.ts 的 `defineBackground` 从 `#imports` 导入（grep `from '#imports'` 命中、`from 'wxt/sandbox'` 0 命中）
- shared/messaging/result.ts 的 `ErrorCode` 恰为 `'INTERNAL'` 单字面量（grep 验证 no NOT_LOGGED_IN / TIMEOUT / 等 Phase 3+ 编码）
- `pnpm verify:manifest` 仍通过（Plan 01 的 manifest 形态未被破坏）
</verification>

<success_criteria>
- popup（Plan 04）可以一行 `await sendMessage('meta.bumpHello')` 拿到 `Result<MetaSchema>`，类型完全推断
- SW 在模块顶层注册 listener；满足 FND-02 的所有结构性条件
- zod 校验在 RPC 边界生效；满足 FND-03
- 错误模型（D-06）落地：业务错走 Result，程序错由 wrapper 兜成 'INTERNAL'
- 单元测试覆盖 protocol 形态 + bumpHello 业务核心 + 错误兜底路径
- Plan 04 的 popup 与 Playwright e2e 可以基于本 plan 直接验证 popup ↔ SW ↔ storage 全链路（成功标准 #3、#4）
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-3-SUMMARY.md` capturing:
- @webext-core/messaging 实际安装版本 + defineExtensionMessaging 真实签名
- WXT 0.20.x defineBackground 包装是否对顶层 listener 注册有额外约束（例如 main() 包装是否仍允许"顶层 sync" 语义）；同时记录 `defineBackground` 是否成功从 `#imports` 导入（如必须改用 `wxt/utils/define-background` 显式路径请记录偏差）
- bumpHello handler 行为测试实际通过日志摘录
- 任何 PITFALLS §陷阱 3/4 在落地中遇到的具体表现（如 wxt build 对顶层 await 的报错）
</output>
</content>
