---
id: 01-2-storage-i18n
phase: 01-foundation
plan: 2
title: 存储 schema + 迁移框架 + i18n facade（en + zh_CN）
status: completed
started: 2026-04-29T13:15:00+08:00
completed: 2026-04-29T13:21:00+08:00
duration: ~6m
commits:
  - bde6b37
requirements_satisfied: [FND-04, FND-06, STG-01, STG-02]
---

## 完成内容

### Task 1: 迁移框架 + metaItem storage facade
- `shared/storage/migrate.ts` — 导出 `CURRENT_SCHEMA_VERSION` (1)、`migrations` map、`runMigrations()`
- `shared/storage/items.ts` — **Path A（WXT 原生）**：`storage.defineItem<MetaSchema>('local:meta', { fallback, version, migrations })`
- `shared/storage/index.ts` — barrel re-export
- 所有模块顶层无 `chrome.*` 调用、无 `await`

### Task 2: i18n facade + locale 文件
- `locales/en.yml` + `locales/zh_CN.yml`（Chrome 嵌套格式 YAML，4 个 key 100% 同构）
- `shared/i18n/index.ts` — 从 `#i18n` 导出类型化 `t`
- 删除了旧的 `locales/en.json`（Plan 01-1 占位）

### Task 3: Vitest 配置 + 单元测试
- `vitest.config.ts` — WxtVitest plugin + happy-dom
- `tests/unit/storage/migrate.spec.ts` — 4 个断言
- `tests/unit/storage/items.spec.ts` — 3 个断言（含 D-04 `.local` 写入验证）
- 7/7 tests passing

## 关键发现

### WXT defineItem 原生支持 migrations（Path A 确认）
`storage.defineItem<T>(key, { fallback, version, migrations })` 在 WXT 0.20.25 / @wxt-dev/storage 1.2.8 完全可用。migrations map 的 key 是目标版本号，函数接收上一版本的值。无需手写 wrapper（Path B 未触发）。

### i18n locale 路径: `locales/` 而非 `assets/locales/`
@wxt-dev/i18n 0.2.5 默认从 `<srcDir>/locales/` 读取 YAML/JSON。Plan 的 `assets/locales/` 路径不被 WXT 识别。已调整为 `locales/en.yml` + `locales/zh_CN.yml`，与 STACK.md YAML 真值源一致。

### tsconfig.json paths 覆盖问题
项目 tsconfig 的自定义 `paths` 会完全覆盖 WXT 生成的 `.wxt/tsconfig.json` 中的 `paths`（包括 `#i18n`、`@/*` 等）。修复方式：在项目 tsconfig 中显式添加 `"#i18n": ["./.wxt/i18n/index.ts"]` 和 `"@/*": ["./*"]`。

### WxtVitest Vite 版本类型冲突
WXT 0.20.25 内部依赖 Vite 8（rolldown），而 Vitest 3.2 依赖 Vite 7（rollup）。`exactOptionalPropertyTypes: true` 让 plugin 类型不兼容。用 `as any` 加 eslint-disable 绕过，运行时无影响。

### fakeBrowser storage key 格式
WXT `storage.defineItem('local:meta', ...)` 在 fakeBrowser 中使用复合 key 存储（非简单的 `meta` 字段）。items.spec.ts 用 `Object.values(raw).some(...)` 模式检测值存在，不依赖具体 key 名。

## Deviations

| Item | Plan 预期 | 实际 | 原因 |
|------|-----------|------|------|
| locale 路径 | `assets/locales/*.yml` | `locales/*.yml` | WXT @wxt-dev/i18n 默认从 `<srcDir>/locales/` 读取 |
| tsconfig.json | 未提及修改 | 添加 `#i18n` + `@/*` path | WXT paths 被自定义 paths 覆盖 |
| vitest.config.ts | `WxtVitest()` 直接使用 | `WxtVitest() as any` | Vite 8/7 类型不兼容 |

## 验证结果

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- `pnpm test` ✅ (7/7)
- `pnpm build` ✅
- `pnpm verify:manifest` ✅ `[verify-manifest] OK`
- shared/ 模块无 chrome.* 直接引用 ✅
- shared/ 模块无顶层 await ✅
- locale key 完全同构 ✅
- popup_hello 含 $COUNT$ 占位符 ✅
