---
phase: 01-foundation
plan: 3
subsystem: messaging
tags: [messaging, service-worker, rpc, zod, mv3, error-model]

# Dependency graph
requires:
  - 01-1-scaffold (defineBackground 占位 + WXT 0.20.x 工程链)
  - 01-2-storage-i18n (metaItem + MetaSchema)
provides:
  - "shared/messaging/result.ts — Result<T,E> 判别联合 + Ok/Err 构造器 + ErrorCode 枚举（Phase 1 仅 'INTERNAL'）"
  - "shared/messaging/protocol.ts — ProtocolMap 接口（meta.bumpHello 唯一路由）+ zod schemas + defineExtensionMessaging<TProtocolMap>() 实例"
  - "shared/messaging/index.ts — barrel re-export（下游一律走 @/shared/messaging）"
  - "entrypoints/background.ts — defineBackground 内顶层 onMessage('meta.bumpHello', ...) 注册 + wrapHandler 错误兜底"
  - "tests/unit/messaging/protocol.spec.ts + bumpHello.spec.ts — 9 个新断言"
affects: [01-4-popup-e2e, 02-capture, 03-dispatch, 04-openclaw, 05-discord]

# Tech tracking
tech-stack:
  added:
    - "@webext-core/messaging@2.3.0（启用，先前由 01-1 安装但未引用）"
    - "zod@3.24（启用，先前由 01-1 安装但未引用）"
  patterns:
    - "MV3 SW 顶层同步 listener 注册 — defineBackground(() => { onMessage(...) }) 第一条实质语句即注册（FND-02 / PITFALLS §3+§4）"
    - "Mixed error model — 业务错走 Result.err，程序错由顶层 wrapHandler 兜成 Err('INTERNAL', ...)（D-06）"
    - "ProtocolMap 单文件聚合（Phase 1 仅 1 路由 — Phase 3 路由 >5 时再拆 routes/）"
    - "zod 在 RPC handler 入口 .parse(input)、出口前 .parse(output) 双侧验证（FND-03）"

# Key files
key-files:
  created:
    - shared/messaging/result.ts
    - shared/messaging/protocol.ts
    - shared/messaging/index.ts
    - tests/unit/messaging/protocol.spec.ts
    - tests/unit/messaging/bumpHello.spec.ts
  modified:
    - entrypoints/background.ts (Plan 01-1 占位被替换为真实 SW 入口)

decisions:
  - "wrapHandler 类型签名简化为 `<R>(fn: () => Promise<R>) => () => Promise<R>` — 而非按 ProtocolMap 路由名做映射类型。原因：`Promise<ReturnType<ProtocolMap[K]>>` 在 K 为泛型时会包成 `Promise<Promise<R>>` 导致 TS2322；以业务侧的 R 为单一类参更直观，且 Phase 1 仅一条路由不需要复杂的 K-映射。"
  - "bumpHelloCore 业务核心在 background.ts 内是 onMessage 闭包，不导出；测试文件 bumpHello.spec.ts 内复刻一份 mirror 版本以便用 fakeBrowser 直接验证 storage 行为。第三方 caller 出现时再考虑提到 shared/messaging/handlers/。"

# Metrics
metrics:
  duration: ~5m
  completed: 2026-04-29T05:40:32Z
  commits:
    - 0f96cf5 (Task 1: result + protocol + index)
    - b41408c (Task 2: SW entrypoint + bumpHello handler + wrapHandler)
    - 8f6905c (Task 3: vitest specs)
  task-count: 3
  file-count: 6 (5 created + 1 modified)
  test-count: 16 total (9 new from this plan)
---

# Phase 1 Plan 01-3: 类型化消息协议 + Service Worker 顶层 listener — Summary

popup ↔ SW 之间的类型化 RPC 协议（zod 双向校验、Result 错误模型、ProtocolMap 单文件）+ MV3 service worker 入口（defineBackground 内顶层 onMessage 注册），bumpHello 路由全链路落地并被 9 个新断言覆盖。

## 完成内容

### Task 1: Result + ErrorCode + ProtocolMap + zod schemas（commit 0f96cf5）

- `shared/messaging/result.ts`
  - `Result<T, E>` discriminated union — 业务 Ok 与失败 Err 单一类型
  - `ErrorCode = 'INTERNAL'` — Phase 1 起步形态；Phase 3 (DSP-07) / Phase 4 (ADO-05) 各自扩展枚举
  - `Ok<T>(data)` / `Err<E>(code, message, retriable=false)` 构造器
- `shared/messaging/protocol.ts`
  - `ProtocolMap` 接口含唯一路由 `'meta.bumpHello'(): Promise<Result<MetaSchema>>`
  - `schemas['meta.bumpHello']` = `{ input: z.void(), output: z.object({ schemaVersion: z.literal(1), helloCount: z.number().int().nonnegative() }) }`
  - `defineExtensionMessaging<ProtocolMap>()` 单实例导出 `sendMessage` / `onMessage`
- `shared/messaging/index.ts` — barrel；下游统一从 `@/shared/messaging` 引入
- 验证：`pnpm typecheck` 干净；`grep` 链确认 `defineExtensionMessaging`、`z.literal(1)`、`ErrorCode = 'INTERNAL'` 全部就位且 `ErrorCode` 不含 Phase 3/4 的码值

### Task 2: SW 入口 + meta.bumpHello handler + wrapHandler（commit b41408c）

- `entrypoints/background.ts` — Plan 01-1 占位替换为真实入口
- `defineBackground` 从 `#imports` 导入（WXT 0.20.x 官方 auto-import 路径；非 `wxt/sandbox`）
- `defineBackground(() => { ... })` 主体的第一条实质语句即 `onMessage('meta.bumpHello', wrapHandler(async () => { ... }))`
- 主体在 listener 注册之前**无任何 `await` 表达式**（`awk + grep` 验证通过；唯一含 "await" 的字面文本是注释 "no await before this point"）
- handler 内业务核心：`schemas.input.parse(undefined)` → `metaItem.getValue()` → `helloCount + 1` → `metaItem.setValue(next)` → `schemas.output.parse(next)` → `Ok(validated)`
- `wrapHandler<R>(fn)`：try/catch 把任意 throw 转成 `Err('INTERNAL', err.message, false)`，履行 D-06 的"程序错走 wrapper、业务错走 Result"契约
- 全文不含 `setInterval` / `setTimeout` / 模块作用域 `let` 状态变量
- 验证：`pnpm build` 产出 `.output/chrome-mv3/background.js` (85.43 kB)；`pnpm typecheck`、`pnpm lint`、`pnpm verify:manifest` 全部干净

### Task 3: Vitest 单元测试（commit 8f6905c）

- `tests/unit/messaging/protocol.spec.ts` — 5 个断言
  - input schema 接受 `undefined`、拒绝其它值
  - output schema 强制 `schemaVersion: 1` 字面 + 非负整数 `helloCount`（边界：0、7 通过；2 / -1 / 1.5 不通过）
  - `Ok(42)` 形态；`Err('INTERNAL', 'boom')` retriable 默认 false；`Err('INTERNAL', 'try again', true)` 显式 true
- `tests/unit/messaging/bumpHello.spec.ts` — 4 个断言
  - 默认状态首调返回 `helloCount=1`
  - 连续三调返回 `helloCount=3`（单调递增）
  - 写入持久化到 `chrome.storage.local`（D-04 验证；与 storage spec 重叠强化）
  - `fakeBrowser.reset()` 后回到 `META_DEFAULT`
- 业务核心 `bumpHelloCore` 在 spec 内 mirror —— background.ts 不导出 onMessage 闭包，保持 SW 入口最小
- 验证：`pnpm test` 16/16 passing（先前 7 + 本 plan 新增 9）

## 关键发现

### `@webext-core/messaging` 的 `defineExtensionMessaging` API 形态（v2.3.0 实测）

- 真实签名（`node_modules/@webext-core/messaging/lib/index.d.ts`）：
  ```ts
  declare function defineExtensionMessaging<TProtocolMap extends Record<string, any> = Record<string, any>>(
    config?: ExtensionMessagingConfig
  ): ExtensionMessenger<TProtocolMap>;
  ```
- `ExtensionMessenger.onMessage` 期待 callback 返回 `void | MaybePromise<GetReturnType<TProtocolMap[TType]>>`（`GetReturnType` 取函数 `infer R`）
- 因此把 `ProtocolMap['meta.bumpHello']` 写成 `() => Promise<Result<MetaSchema>>` 等价于声明"返回值是 `Promise<Result<MetaSchema>>`"，与 plan 设想一致

### WXT 0.20.x `defineBackground` 导入路径

- WXT 0.20.x 通过 auto-imports（`#imports` 虚拟模块）暴露 `defineBackground`；`.wxt/types/imports-module.d.ts` 显式列出 `export { defineBackground } from 'wxt/utils/define-background'`
- 物理实现位于 `node_modules/wxt/dist/utils/define-background.{mjs,d.mts}`（重载：`(main: () => void)` 或 `(definition: BackgroundDefinition)`）
- 用法上既可以走 `import { defineBackground } from '#imports'`（本 plan 选择），也可以走 `wxt/utils/define-background` 显式路径；不可走旧 `wxt/sandbox`（0.19.x 已废弃，0.20.25 上 build 会失败）
- 顶层 listener 注册无额外限制：`defineBackground(() => { onMessage(...) })` 即被识别为顶层注册（main 函数同步主体）

### `wrapHandler` 类型签名简化（执行期偏差）

- Plan 原始建议 `wrapHandler<K extends keyof ProtocolMap>(fn: () => ReturnType<ProtocolMap[K]>): () => Promise<Awaited<ReturnType<ProtocolMap[K]>>>`
- 实测在 `K` 为泛型未实例化时，TS 5.6 把 `ReturnType<ProtocolMap[K]>` 视为 `Promise<...>`，外层 `() => Promise<...>` 就出现 `Promise<Promise<R>>`，触发 TS2322
- 改为 `wrapHandler<R>(fn: () => Promise<R>): () => Promise<R>` —— 直接以业务返回类型 R 为单一类参，Phase 1 唯一调用点 `wrapHandler(async () => Ok(...))` 类型完全推断
- 副作用：`background.ts` 不再 `import type { ProtocolMap }`（仅在路由名字面 `'meta.bumpHello'` 处由 `onMessage` 自身的 ProtocolMap 推断）

### bumpHello handler 行为测试通过日志摘录

```
✓ tests/unit/messaging/protocol.spec.ts (5 tests) 7ms
✓ tests/unit/messaging/bumpHello.spec.ts (4 tests) 7ms

Test Files  4 passed (4)
     Tests  16 passed (16)
  Duration  796ms
```

### PITFALLS §陷阱 3/4 在落地中的实际表现

- 顶层 `await`：`wxt build` 在 `defineBackground(async () => { await ... })` 主体上**不会**直接报错（rolldown 允许 async 函数），但运行时仍违反 MV3 SW 契约。本 plan 通过纪律（`awk + grep` + 代码审查）规避，未触发 build-level 报错
- `wxt/sandbox` 不存在：未尝试该路径（plan 已显式禁止）；`#imports` 直接成功
- 模块作用域状态：本 plan 全程不引入任何 module-scope `let`，handler 每次调用都从 `metaItem.getValue()` 读最新值

## Deviations

| Item | Plan 预期 | 实际 | 原因 |
|------|-----------|------|------|
| `wrapHandler` 类型签名 | `<K extends keyof ProtocolMap>(fn: () => ReturnType<ProtocolMap[K]>) => () => Promise<Awaited<ReturnType<ProtocolMap[K]>>>` | `<R>(fn: () => Promise<R>) => () => Promise<R>` | TS 5.6 在泛型 K 上对 `ReturnType<ProtocolMap[K]>` 做 `Awaited` 包裹时与外层 `Promise<>` 冲突，触发 TS2322；按 R 单一类参改写后类型完全自洽，语义一致（外层仍把 throw 兜成 `Err('INTERNAL', ...)`）|
| `background.ts` 内 `// eslint-disable-next-line no-console` | Plan 直接列出 disable 注释 | 移除 | 项目 ESLint 配置无 `no-console` 规则，disable 触发 `unused eslint-disable directive` 警告；移除后 lint 干净 |
| `background.ts` 不再 `import type { ProtocolMap }` | Plan 包含该 import | 仅 import `onMessage / schemas / Ok / Err` | `wrapHandler` 简化后不再用 ProtocolMap 类型；route key `'meta.bumpHello'` 由 `onMessage` 自身推断 |

未触发任何架构性偏差（Rule 4）；以上三项均为执行期局部修正（Rule 1：bug 修复 + Rule 3：阻塞性问题修复）。

## 验证结果

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- `pnpm test` ✅ (16/16，本 plan 新增 9)
- `pnpm build` ✅ — `.output/chrome-mv3/background.js` (85.43 kB) 产出
- `pnpm verify:manifest` ✅ `[verify-manifest] OK — all assertions passed`
- `defineBackground` 主体首条实质语句 = `onMessage('meta.bumpHello', ...)`，之前**无 `await`** ✅
- `entrypoints/background.ts` 不含 `setInterval` / `setTimeout` / 模块作用域 `let` 状态 ✅
- `defineBackground` 从 `#imports` 导入；`wxt/sandbox` 不被引用 ✅
- `ErrorCode` 字面恰为 `'INTERNAL'`，不含 Phase 3/4 编码 ✅

## Self-Check: PASSED

- shared/messaging/result.ts ✓
- shared/messaging/protocol.ts ✓
- shared/messaging/index.ts ✓
- entrypoints/background.ts ✓ (modified)
- tests/unit/messaging/protocol.spec.ts ✓
- tests/unit/messaging/bumpHello.spec.ts ✓
- Commit 0f96cf5 ✓
- Commit b41408c ✓
- Commit 8f6905c ✓
