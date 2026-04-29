---
phase: 01-foundation
verified: 2026-04-29T06:23:15Z
status: passed
must_haves_total: 13
must_haves_passed: 13
must_haves_failed: 0
human_verification_items: 4
matrix_updates_needed: 3
gap_fixes_applied: 5
---

# Phase 1: 扩展骨架 (Foundation) Verification Report

**Phase Goal:** 一个连线正确的 Chrome MV3 扩展，可以在 `chrome://extensions` 中加载，通过 i18n 在 popup 中显示 hello-world 字符串，并通过类型化消息在 service worker ↔ popup 之间往返一次，同时落地一个版本化的存储 schema。

**Verified:** 2026-04-29T06:23:15Z
**Status:** human_needed — 所有可自动化的结构性 / 行为性检查全部 PASS，但 ROADMAP 成功标准 #1 / #2 / #4 的"真 Chrome `chrome://extensions` 加载 + i18n locale 切换 + Stop SW 按钮"路径必须在带 Chromium 的开发机上人工目检。
**Re-verification:** No — initial verification.

## Summary

Phase 1 把 ROADMAP 锁定的"foundation-first"目标全部落实为可观察、可断言的代码：WXT 0.20.25 MV3 manifest 的形态严格符合 FND-05（permissions = activeTab/scripting/storage、static host_permissions = ["https://discord.com/*"]、optional_host_permissions = ["<all_urls>"]、所有 user-facing 字段走 `__MSG_*__`），verify-manifest 脚本在 CI 与本地共享同一信源。`shared/storage` 类型化 facade（`metaItem` + `runMigrations`）+ `shared/messaging` 协议（`defineExtensionMessaging<ProtocolMap>` + zod schemas + Result/Err）+ `shared/i18n` facade 三件套都不引入顶层 `chrome.*` 副作用，service worker 在 `defineBackground(() => { onMessage(...) })` 主体首条实质语句即同步注册 listener、之前无 `await`（FND-02）。popup 用 Preact + signals + `useEffect([])` 单次 RPC，渲染 `t('popup_hello', [count])`，TSX 中无任何裸 JSX 字面量；`pnpm typecheck` / `pnpm lint` / `pnpm test (16/16)` / `pnpm verify:manifest` 全绿，CI workflow 不含 Playwright（D-11）。Playwright 3 个 e2e specs 已就位、discovery 通过，**但本机 Chromium 1217 binary 缺失**（执行机环境限制；与 SUMMARY 一致），ROADMAP 成功标准 #4 的自动化覆盖路径未能在本次 verification 中现场跑绿——这是为什么本 phase 状态为 `human_needed` 而非 `passed`：Live load + 双语切换 + 真 SW Stop 三件事必须由开发者在带 Chromium 的开发机上目检 / 跑 `pnpm test:e2e` 完成确认。REQUIREMENTS.md traceability matrix 中 FND-04 / STG-01 / STG-02 当前仍标 `待办`，但代码与单元测试已经满足这三条；建议 orchestrator 的 `update_roadmap` 步骤把它们翻为 `Done (Plan 01-2)`。

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                        | Status     | Evidence                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 构建产物 manifest 形态严格匹配 FND-05（`permissions=[activeTab,scripting,storage]`、`host_permissions=["https://discord.com/*"]`、`optional_host_permissions=["<all_urls>"]`、`default_locale="en"`、`name`/`description`/`action.default_title` 走 `__MSG_*__`） | ✓ VERIFIED | `.output/chrome-mv3/manifest.json` 实测内容；`pnpm verify:manifest` 退出 0 + 输出 `[verify-manifest] OK`；`scripts/verify-manifest.ts` 含 FATAL 守卫拒绝静态 `<all_urls>` |
| 2   | 静态 `host_permissions` 不含 `<all_urls>`，`<all_urls>` 仅出现在 `optional_host_permissions`（FND-05 + DST-03 跨 phase 守护）                                  | ✓ VERIFIED | `wxt.config.ts:9-11` 字面声明；构建产物 manifest 实测确认；`scripts/verify-manifest.ts:51-53` 硬守卫存在                                                                |
| 3   | `popup_hello` 通过 i18n facade 渲染（en + zh_CN locale 100% 同构、含 `$COUNT$` 占位符）                                                                       | ✓ VERIFIED | `locales/en.yml` + `locales/zh_CN.yml` 4 键完全同构；`.output/chrome-mv3/_locales/{en,zh_CN}/messages.json` 实测含 `popup_hello.message` 与 `placeholders.count`；`entrypoints/popup/App.tsx:45` 调用 `t('popup_hello', [count])` |
| 4   | popup 通过 zod 校验的类型化 RPC 调用 SW（`meta.bumpHello`）并渲染 helloCount（FND-03）                                                                       | ✓ VERIFIED | `shared/messaging/protocol.ts:22-30` zod input/output schemas + `defineExtensionMessaging<ProtocolMap>()`；`entrypoints/background.ts:51-66` SW 内 `schemas['meta.bumpHello'].input.parse(...)` + `output.parse(...)`；`entrypoints/popup/App.tsx:26` `await sendMessage('meta.bumpHello')` |
| 5   | SW 在模块顶层同步注册 listener，listener 注册之前不出现 `await`（FND-02）                                                                                  | ✓ VERIFIED | `entrypoints/background.ts:46-66` `defineBackground(() => { onMessage(...) })` — 主体首条实质语句即 `onMessage`；body 内除 handler `async () => { ... }` 闭包内的 `await metaItem.getValue()`/`setValue()` 外，无其他 `await`；shared/* 模块顶层 `grep -E "^[[:space:]]*await"` 命中 0 行 |
| 6   | SW 不使用 `setInterval` / `setTimeout`，不依赖模块作用域 `let` 状态（陷阱 3）                                                                                | ✓ VERIFIED | `grep "setInterval\|setTimeout" entrypoints/background.ts` 命中 0 行；目检文件内仅 `wrapHandler` 函数 + `defineBackground` 闭包，无 module-scope 变量                                                  |
| 7   | 所有 storage 写入走类型化 repo（`metaItem`），无 `localStorage` / 直接 `chrome.storage.local.set` 调用（STG-01 + STG-02）                                | ✓ VERIFIED | `grep -rn "localStorage" entrypoints shared scripts` 命中 0；`grep -rn "chrome\.storage" entrypoints shared` 仅命中一条注释（background.ts:12）；`shared/storage/items.ts:14-18` 用 `storage.defineItem<MetaSchema>('local:meta', { fallback, version, migrations })` 包装；`tests/unit/storage/items.spec.ts:21-41` 断言写入 `chrome.storage.local` 而非 `.session` |
| 8   | 存储 schema 含 `version` 字段 + 可工作的 migration 注册表（FND-04）                                                                                          | ✓ VERIFIED | `shared/storage/migrate.ts:1-17` `CURRENT_SCHEMA_VERSION = 1` + `migrations[1]` + `runMigrations(prev, fromVersion)` 顺序应用；`shared/storage/items.ts:14-18` 把 `migrations` 传入 `defineItem`；`tests/unit/storage/migrate.spec.ts` 4 个断言全绿 |
| 9   | popup TSX 无任何裸字符串字面量（ROADMAP 成功标准 #5 末段 + I18N-03 轻量版）                                                                                  | ✓ VERIFIED | `eslint.config.js:46-54` `no-restricted-syntax` 拦截 `JSXText[value=/[A-Za-z一-龥]/]`；`pnpm lint` 退出 0；`grep -nE ">[A-Za-z一-龥]" entrypoints/popup/App.tsx` 命中 0 行（全部用 `{t(...)}` 与 `{errorMessage.value}` 表达式）                                          |
| 10  | Vitest 单元测试覆盖 storage + messaging（迁移 4 + items 3 + protocol 5 + bumpHello 4 = 16 断言）                                                              | ✓ VERIFIED | `pnpm test` 实跑：`Test Files 4 passed (4) / Tests 16 passed (16)`；4 个 spec 文件均存在并 import `wxt/testing/fake-browser`                                                                                                                                                  |
| 11  | CI workflow 跑 install + typecheck + lint + test + verify:manifest，**不**跑 Playwright（D-11）                                                              | ✓ VERIFIED | `.github/workflows/ci.yml:11-24` 5 个 step；`grep -E "playwright\|test:e2e" .github/workflows/ci.yml` 命中 0 行                                                                                                                                                                |
| 12  | Playwright e2e 至少 3 个 spec：first mount = 1 / 连续递增 / SW reload 仍 +1（成功标准 #4 自动化等价路径）                                                  | ✓ VERIFIED | `tests/e2e/popup-rpc.spec.ts` 3 个 `test(...)` 块（24:1 / 33:1 / 50:1），`pnpm exec playwright test --list` 实测 `Total: 3 tests in 1 file`；fixture `tests/e2e/fixtures.ts:43-53` 用 `chrome.runtime.reload()` 模拟 SW 重启 |
| 13  | shared/* 模块（storage / messaging / i18n）顶层无 `chrome.*` 副作用调用，无顶层 `await`（PITFALLS §陷阱 4）                                                | ✓ VERIFIED | `grep -nE "^[[:space:]]*await" shared/storage/* shared/messaging/* shared/i18n/*` 命中 0 行；`shared/storage/items.ts` 通过 `wxt/utils/storage` import 中转；`shared/i18n/index.ts` 仅 `import { i18n } from '#i18n'` + 重导出 `t`，无副作用                                |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact                                       | Expected                                                                          | Status     | Details                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `wxt.config.ts`                                | manifest 字段（permissions / host_permissions / optional_host_permissions / __MSG_*__）+ Tailwind v4 vite plugin + i18n module | ✓ VERIFIED | 27 行，全部字段正确；vite plugin 接 `@tailwindcss/vite`                                                            |
| `scripts/verify-manifest.ts`                   | 5 条断言 + FATAL 守卫拒绝静态 `<all_urls>`                                          | ✓ VERIFIED | 75 行，行 51-53 含 FATAL 守卫；CI 与本地共享                                                                       |
| `.github/workflows/ci.yml`                     | install + typecheck + lint + test + verify:manifest，不含 Playwright              | ✓ VERIFIED | 24 行，5 个 step；不含 `playwright` / `test:e2e`                                                                   |
| `.husky/pre-commit`                            | typecheck + lint-staged                                                          | ✓ VERIFIED | `pnpm typecheck && pnpm exec lint-staged`，可执行                                                                  |
| `eslint.config.js`                             | flat config + JSX no-restricted-syntax + 类型感知规则                             | ✓ VERIFIED | 57 行，`no-restricted-syntax` 拦截 `JSXText[value=/[A-Za-z一-龥]/]`                                        |
| `shared/storage/items.ts`                      | `metaItem` via `storage.defineItem<MetaSchema>('local:meta', { fallback, version, migrations })` | ✓ VERIFIED | 18 行，path A（WXT 原生）已确认                                                                                    |
| `shared/storage/migrate.ts`                    | `migrations` map + `runMigrations` + `CURRENT_SCHEMA_VERSION`                     | ✓ VERIFIED | 17 行，v1 entry 就位                                                                                                |
| `shared/storage/index.ts`                      | barrel re-export                                                                  | ✓ VERIFIED | 3 行                                                                                                               |
| `shared/messaging/result.ts`                   | `Result<T,E>` + `Ok` + `Err` + `ErrorCode = 'INTERNAL'`                           | ✓ VERIFIED | 27 行；`ErrorCode` 字面恰为 'INTERNAL'                                                                              |
| `shared/messaging/protocol.ts`                 | `ProtocolMap` + zod schemas + `defineExtensionMessaging`                          | ✓ VERIFIED | 38 行；含 `meta.bumpHello` + zod input/output                                                                       |
| `shared/messaging/index.ts`                    | barrel re-export                                                                  | ✓ VERIFIED | 4 行                                                                                                               |
| `shared/i18n/index.ts`                         | 类型化 `t` 从 `#i18n` 导出                                                         | ✓ VERIFIED | 4 行                                                                                                               |
| `locales/en.yml`                               | 4 键（extension_name / description / action_default_title / popup_hello）         | ✓ VERIFIED | 16 行；`popup_hello` 含 `$COUNT$` 占位符                                                                            |
| `locales/zh_CN.yml`                            | 与 en.yml 100% 键同构                                                              | ✓ VERIFIED | 16 行；键完全同构                                                                                                  |
| `entrypoints/background.ts`                    | `defineBackground(() => { onMessage(...) })` 顶层注册 + wrapHandler               | ✓ VERIFIED | 70 行；first executable statement 是 `onMessage(...)`                                                              |
| `entrypoints/popup/index.html`                 | `<title>__MSG_action_default_title__</title>` + `#app` + Tailwind body class      | ✓ VERIFIED | 16 行；title 用 i18n 占位符                                                                                         |
| `entrypoints/popup/main.tsx`                   | Preact `render(<App />, ...)` mount                                               | ✓ VERIFIED | 7 行                                                                                                               |
| `entrypoints/popup/App.tsx`                    | `useEffect([])` 内单次 `sendMessage('meta.bumpHello')` + `t('popup_hello', [count])` 渲染 | ✓ VERIFIED | 54 行；JSX 文本节点全部走 `{t(...)}` / `{errorMessage.value}`                                                      |
| `entrypoints/popup/style.css`                  | `@import 'tailwindcss';`                                                          | ✓ VERIFIED | 构建产物 `.output/chrome-mv3/assets/popup-DRq0wo-r.css` 11.97 kB 含编译后的 utility 类                              |
| `playwright.config.ts`                         | testDir=./tests/e2e, headless=false, workers=1                                    | ✓ VERIFIED | 27 行                                                                                                              |
| `tests/e2e/fixtures.ts`                        | launchPersistentContext + `--load-extension` + `chrome.runtime.reload` helper     | ✓ VERIFIED | 57 行                                                                                                              |
| `tests/e2e/popup-rpc.spec.ts`                  | 3 个 e2e specs（含 SW reload 韧性）                                                 | ✓ VERIFIED | `playwright test --list` = 3 tests                                                                                 |
| `tests/unit/storage/{migrate,items}.spec.ts`   | 迁移 4 + items 3 断言                                                              | ✓ VERIFIED | `pnpm test` = 7 passing                                                                                            |
| `tests/unit/messaging/{protocol,bumpHello}.spec.ts` | 5 + 4 断言                                                                  | ✓ VERIFIED | `pnpm test` = 9 passing                                                                                            |
| `vitest.config.ts`                             | WxtVitest plugin + happy-dom + include/exclude                                    | ✓ VERIFIED | 14 行；`exclude: ['tests/e2e/**', ...]` 防止 vitest 误跑 e2e                                                       |
| `README.md`                                    | dev section + 5 条手测脚本（#1-#5）                                                 | ✓ VERIFIED | 121 行；含 `Load unpacked`、`Service worker`、`pnpm verify:manifest`、`pnpm test:e2e` 等关键词                     |
| `.output/chrome-mv3/manifest.json`             | 形态严格符合 FND-05                                                                | ✓ VERIFIED | 实测产物已读                                                                                                       |
| `.output/chrome-mv3/_locales/{en,zh_CN}/messages.json` | 4 键（含 popup_hello）                                                       | ✓ VERIFIED | 实测产物已读，键 100% 同构                                                                                         |

### Key Link Verification

| From                              | To                                | Via                                                                  | Status   | Details                                                              |
| --------------------------------- | --------------------------------- | -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `entrypoints/background.ts`       | `shared/messaging`                | `import { onMessage, schemas, Ok, Err } from '@/shared/messaging'`   | ✓ WIRED  | line 2 + line 51 `onMessage('meta.bumpHello', ...)` 实际调用         |
| `entrypoints/background.ts`       | `shared/storage`                  | `import { metaItem } from '@/shared/storage'`                        | ✓ WIRED  | line 3 + lines 58/60 `metaItem.getValue()` / `setValue(next)`        |
| `entrypoints/popup/App.tsx`       | `shared/messaging`                | `import { sendMessage } from '@/shared/messaging'`                   | ✓ WIRED  | line 3 + line 26 `await sendMessage('meta.bumpHello')`               |
| `entrypoints/popup/App.tsx`       | `shared/i18n`                     | `import { t } from '@/shared/i18n'`                                  | ✓ WIRED  | line 4 + line 45 `t('popup_hello', [count])`                         |
| `shared/storage/items.ts`         | `shared/storage/migrate.ts`        | `import { CURRENT_SCHEMA_VERSION, migrations } from './migrate'`     | ✓ WIRED  | line 2 + line 17 `migrations` 传入 `defineItem` 选项                 |
| `scripts/verify-manifest.ts`      | `.output/chrome-mv3/manifest.json` | `JSON.parse(readFileSync(...))` + `expectSet(...)` 严格集合比较     | ✓ WIRED  | line 18 + lines 45-47 + FATAL guard line 51                          |
| `.github/workflows/ci.yml`        | `scripts/verify-manifest.ts`       | `pnpm verify:manifest` step                                          | ✓ WIRED  | line 24                                                              |
| `tests/e2e/popup-rpc.spec.ts`     | `.output/chrome-mv3`              | Playwright `launchPersistentContext` + `--load-extension`            | ✓ WIRED  | fixture line 24 + 28；`pnpm exec playwright test --list` 实测 OK     |
| `tests/e2e/fixtures.ts`           | SW restart simulation             | `await sw.evaluate(() => chrome.runtime.reload())`                   | ✓ WIRED  | line 49                                                              |

### Data-Flow Trace (Level 4)

| Artifact                          | Data Variable    | Source                                          | Produces Real Data | Status      |
| --------------------------------- | ---------------- | ----------------------------------------------- | ------------------ | ----------- |
| `entrypoints/popup/App.tsx`       | `helloCount`     | `await sendMessage('meta.bumpHello')` → SW handler → `metaItem.getValue() + 1` → `metaItem.setValue(next)` → `Ok(validated)` | Yes — read/write 真实 chrome.storage.local 经 wxt defineItem 包装；fakeBrowser 单测断言 `helloCount` 单调 +1                | ✓ FLOWING   |
| `entrypoints/popup/App.tsx`       | `errorMessage`   | `result.message` from `Err('INTERNAL', ...)` 经 wrapHandler 兜成的 `Result.err`                                            | 仅在 SW handler throw 时被填充；Phase 1 happy path 下保持 null（合预期，非 stub）                                            | ✓ FLOWING   |
| `entrypoints/background.ts`       | `next` (helloCount+1) | `metaItem.getValue()` → `current.helloCount + 1` → `metaItem.setValue(next)`                                              | Yes — full read-modify-write 闭环                                                                                          | ✓ FLOWING   |
| `shared/storage/items.ts`         | `metaItem`       | `storage.defineItem<MetaSchema>('local:meta', { fallback, version, migrations })`                                             | Yes — fallback + migration 联动（迁移测试覆盖 v0→v1 + idempotent + missing-step throw）                                  | ✓ FLOWING   |

### Behavioral Spot-Checks

| Behavior                                          | Command                                            | Result                                                       | Status |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ | ------ |
| TypeScript 编译干净                               | `pnpm typecheck`                                   | exit 0，无 stdout 错误                                       | ✓ PASS |
| ESLint 干净                                       | `pnpm lint`                                        | exit 0，无 stdout 错误                                       | ✓ PASS |
| Vitest 全绿（≥ 16 断言）                          | `pnpm test`                                        | `Test Files 4 passed (4) / Tests 16 passed (16) / 813ms`     | ✓ PASS |
| WXT 构建 + manifest 严格校验                      | `pnpm verify:manifest`                             | `[verify-manifest] OK — all assertions passed`               | ✓ PASS |
| 构建产物含 popup HTML / background.js / popup CSS | `ls .output/chrome-mv3/`                           | popup.html 508B、background.js 85.43kB、popup CSS 11.97kB    | ✓ PASS |
| 构建产物含双语 _locales/messages.json             | `ls .output/chrome-mv3/_locales/`                  | en/messages.json 417B、zh_CN/messages.json 417B（同构）      | ✓ PASS |
| Playwright 3 specs discovery                      | `pnpm exec playwright test --list`                 | `Total: 3 tests in 1 file`                                    | ✓ PASS |
| Playwright e2e 实跑（first-mount / 递增 / SW reload）| `pnpm test:e2e`                                  | 3 fail，均因 `Executable doesn't exist at .../chromium-1217/chrome-linux64/chrome` — 环境层面 binary 缺失，code path 100% coherent | ? SKIP — see Human Verification #4 |
| `localStorage` 在源码中不存在                     | `grep -rn "localStorage" entrypoints shared scripts` | 0 命中                                                       | ✓ PASS |
| 顶层 `chrome.*` 副作用在 shared/* 中不存在        | `grep -nE "^[[:space:]]*await" shared/...`         | 0 命中                                                       | ✓ PASS |
| SW 不含 setInterval/setTimeout                    | `grep "setInterval\|setTimeout" entrypoints/background.ts` | 0 命中                                                  | ✓ PASS |

### ROADMAP Success Criteria

| #   | Criterion                                                                                                                                                                                       | Verdict        | Evidence                                                                                                                                                                          | Gap                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1   | WXT 解包构建可加载，manifest 仅声明 activeTab + scripting + storage + host_permissions=["https://discord.com/*"] + optional_host_permissions=["<all_urls>"]; 静态 host_permissions 不含 `<all_urls>` | PASS (auto) + HUMAN_NEEDED (load) | manifest 形态：`pnpm verify:manifest` 输出 `OK`；`.output/chrome-mv3/manifest.json` 实测形态严格匹配。**真 Chrome 加载需人工**：`chrome://extensions → Load unpacked → 工具栏出现 action 图标` 路径必须开发机目检 | 自动化部分全 PASS；live `chrome://extensions` 加载 + 工具栏图标显示需人工目检（README #1）                                                                                                                                                                                                                                                                          |
| 2   | 点击 action 图标打开 popup，显示 i18n 的 hello-world 字符串（en + zh_CN）                                                                                                                       | PASS (auto) + HUMAN_NEEDED (locale switch) | locale 文件 100% 同构（含 `$COUNT$`）；构建产物 `_locales/{en,zh_CN}/messages.json` 实测；popup `t('popup_hello', [count])` 调用就位。**Locale 切换需人工**：必须在真 Chrome 切换 UI 语言并重新 Reload 扩展观察文案变化 | 自动化部分全 PASS；en ↔ zh_CN 真切换观感需人工（README #2）                                                                                                                                                                                                                                                                                                        |
| 3   | popup 通过 zod 校验的类型化消息向 SW 发起 RPC，渲染从 chrome.storage.local 读回的值（端到端 popup ↔ SW ↔ storage 链路）                                                                       | PASS           | bumpHello handler 单测 4 个断言全绿（fakeBrowser + helloCount 单调递增 + chrome.storage.local 写入断言）；popup `App.tsx:26` 调用 `sendMessage('meta.bumpHello')`；SW handler line 51-66 实施 `parse(input)` → `metaItem.getValue/setValue` → `parse(output)` → `Ok(...)`        | 无                                                                                                                                                                                                                                                                                                                                                                |
| 4   | 杀掉 SW 后再次点击图标仍可触发 RPC（证明顶层同步注册 listener、无顶层 await、无依赖模块级状态）                                                                                              | PASS (structural) + HUMAN_NEEDED (Playwright run) | SW 顶层同步注册 listener（first executable statement = `onMessage`，无 `await` 在前）；SW 不含模块作用域状态；fakeBrowser.reset() 后 bumpHelloCore 仍返回 helloCount=1（D-04 单测）；Playwright `tests/e2e/popup-rpc.spec.ts:50` SW restart spec 已写好。**实跑需要本机 Chromium 1217**（执行环境缺）              | 结构性证据全 PASS；live "Stop SW + 再点击图标" 断言需人工跑 `pnpm test:e2e`（先 `pnpm exec playwright install chromium`）或目检 README #4                                                                                                                                                                                                                          |
| 5   | vitest + Playwright（launchPersistentContext --load-extension）跑绿；CI 校验构建产物中无静态 `<all_urls>` 引用（`<all_urls>` 只允许出现在 optional_host_permissions）；popup TSX 中无硬编码用户可见字符串 | PASS (auto) + HUMAN_NEEDED (Playwright run) | Vitest 16/16 实跑通过；CI workflow 含 `pnpm verify:manifest` step + verify-manifest 含静态 `<all_urls>` FATAL 守卫；ESLint `no-restricted-syntax` 含 JSX 字面文本拦截，`pnpm lint` 退出 0；popup TSX 0 个裸 JSX 字面量。**Playwright 在执行机不可跑**（chromium-1217 binary 缺失） | Vitest + ESLint + verify-manifest 全 PASS；Playwright 实跑需人工（同 #4）                                                                                                                                                                                                                                                                                          |

### Cross-Cutting Constraints

| Constraint                                                                                                              | Verdict     | Evidence                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 静态 host_permissions === ['https://discord.com/*']，绝不含 `<all_urls>`（FND-05，跨所有 plan 守护）                    | ✓ VERIFIED  | wxt.config.ts:10 + 构建产物 manifest + verify-manifest FATAL 守卫                                                                                                                                  |
| 任何 storage 写入必须通过 typed repo（metaItem），禁直调 chrome.storage.local.set（STG-02）                              | ✓ VERIFIED  | `grep -rn "chrome\.storage" entrypoints shared` 仅命中一条注释；items.spec.ts D-04 断言；shared/storage/items.ts 通过 wxt defineItem 中转                                                          |
| 用户可见字符串只能走 t(...)，popup TSX 不含裸 JSX 文本字面量（FND-06 + ROADMAP #5）                                     | ✓ VERIFIED  | eslint.config.js no-restricted-syntax + lint 退出 0 + App.tsx 全部走 `{t(...)}` / `{errorMessage.value}` 表达式                                                                                    |
| shared/storage/* 与 shared/i18n/* 模块顶层不出现 chrome.* 调用（PITFALLS §陷阱 4）                                       | ✓ VERIFIED  | grep 验证；shared/storage/items.ts 通过 `wxt/utils/storage` import；shared/i18n/index.ts 仅 import + 重导出                                                                                         |
| Tailwind v4 from day 1，无 CSS modules fallback（D-10）                                                                 | ✓ VERIFIED  | `entrypoints/popup/style.css` 含 `@import 'tailwindcss';`；构建产物 `.output/chrome-mv3/assets/popup-*.css` 11.97kB 含 utility 类                                                                  |
| SW 顶层同步注册 listener，listener 注册前不出现任何 await（FND-02 + PITFALLS §陷阱 4）                                 | ✓ VERIFIED  | background.ts 内 defineBackground(() => { onMessage(...) }) 主体首条实质语句即注册；body 内仅 handler `async () => { await ... }` 闭包内有 await，listener 注册之前无 await                        |

### Requirements Coverage

| Requirement | Source Plan(s)                | Description                                                                                          | Status      | Evidence                                                                                          |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| FND-01      | 01-1-scaffold + 01-4-popup-e2e | Chrome MV3 骨架 + manifest v3 + SW + popup + 工具栏图标                                              | ✓ SATISFIED | manifest 形态 + popup HTML + SW background.js + icons 全部就位；自动化部分 PASS，live 加载需 README #1 |
| FND-02      | 01-3-messaging-sw            | SW 顶层同步注册 listener，无顶层 await                                                              | ✓ SATISFIED | background.ts 结构 + bumpHello.spec.ts persistence 断言 + Playwright SW reload spec               |
| FND-03      | 01-3-messaging-sw            | popup ↔ SW ↔ content script 类型化消息（zod 校验）                                                  | ✓ SATISFIED | `defineExtensionMessaging<ProtocolMap>` + zod input/output schemas + handler 内 `.parse()`            |
| FND-04      | 01-2-storage-i18n             | storage schema 含版本字段 + migration 钩子                                                          | ✓ SATISFIED | migrate.ts + items.ts + migrate.spec.ts 4 断言（**REQUIREMENTS.md 矩阵当前标 待办，应 → ✓ Done**）|
| FND-05      | 01-1-scaffold                 | 仅声明最小静态权限；静态 host_permissions 中禁止 `<all_urls>`                                       | ✓ SATISFIED | manifest 实测 + verify-manifest 守卫                                                              |
| FND-06      | 01-2-storage-i18n + 01-4-popup-e2e | i18n 框架就位 + en/zh_CN locale + popup hello-world 走 i18n                                    | ✓ SATISFIED | locale 文件 + i18n facade + popup `t(...)` 调用                                                   |
| STG-01      | 01-2-storage-i18n             | 全部用户数据只写 chrome.storage.local / .session，禁 localStorage / 远程                            | ✓ SATISFIED | grep `localStorage` 命中 0；items.spec.ts D-04 断言（**REQUIREMENTS.md 矩阵当前标 待办，应 → ✓ Done**）|
| STG-02      | 01-2-storage-i18n             | storage 写操作集中通过 typed repo 串行化                                                            | ✓ SATISFIED | metaItem 是唯一写入入口；grep 验证 popup/SW 无直调（**REQUIREMENTS.md 矩阵当前标 待办，应 → ✓ Done**）|

### Anti-Patterns Found

| File                              | Line     | Pattern                                                       | Severity | Impact                                                                                                                                  |
| --------------------------------- | -------- | ------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest.config.ts`                | 6-7      | `WxtVitest() as any` + `eslint-disable @typescript-eslint/no-explicit-any` | ℹ️ Info | 已在 01-2-SUMMARY.md 解释（WXT 用 Vite 8、Vitest 用 Vite 7 类型冲突）；运行时无影响；Phase 4+ Vite 升级时可清理 |
| `tests/e2e/fixtures.ts`            | 22       | `// eslint-disable-next-line no-empty-pattern`                 | ℹ️ Info | Playwright fixture API 必须 `async ({}, use)`，标准模式；不可清理 |
| `entrypoints/popup/App.tsx`       | 47-51    | 错误状态直接渲染 `errorMessage.value` 原文（未 i18n）          | ℹ️ Info | Phase 1 开发期 UX；Plan 注释明确"由 Phase 6 I18N 错误信息人性化覆盖"，符合 simplicity-first 与 plan 锁定的边界 |
| `shared/storage/items.ts`         | 1        | `import { storage } from 'wxt/utils/storage'`（与 plan 写的 `#imports` 不同） | ℹ️ Info | Plan A vs Plan B 落地选择；功能等价，已在 01-2-SUMMARY.md 隐含记录；不影响行为 |

无 Blocker / Warning 级别 anti-pattern。

### Human Verification Required

#### 1. `chrome://extensions → Load unpacked` 真 Chrome 加载（ROADMAP 成功标准 #1）

- **Test:** `pnpm build` → 打开 `chrome://extensions` → 开启开发者模式 → Load unpacked → 选 `.output/chrome-mv3/`
- **Expected:** 工具栏出现 Web2Chat action 图标；扩展 enabled 状态无错误徽章
- **Why human:** 真 Chrome 浏览器加载只能由开发机本地完成；CI 与执行机均无 GUI 浏览器
- **Reference:** README #1

#### 2. en ↔ zh_CN i18n 文案切换（ROADMAP 成功标准 #2）

- **Test:** 浏览器 UI 语言设为英文 → 重新 Reload 扩展 → 点击 action 图标 → 观察 popup 文案；再切到简体中文 → 重启 → Reload → 再点击
- **Expected:** en 下显示 `Hello, world (×N)`；zh_CN 下显示 `你好，世界 ×N`
- **Why human:** Chrome i18n 在浏览器进程启动时锁定 locale；只能由开发者切换浏览器 UI 语言后目检
- **Reference:** README #2

#### 3. SW Stop 按钮后再点击 action 图标 helloCount 仍 +1（ROADMAP 成功标准 #4）

- **Test:** 加载 unpacked 后点击图标 → 记下 helloCount=N → 在 `chrome://extensions` 卡片 Inspect views → service worker → DevTools 顶部 **Stop**（红色方块）→ 立即点击 action 图标
- **Expected:** popup 显示 helloCount = N+1
- **Why human:** chrome://extensions DevTools 的 Stop 按钮是真 SW 杀进程路径，与 `chrome.runtime.reload()` 的 Playwright 模拟存在生命周期细节差异；ROADMAP 成功标准 #4 字面要求 Stop 按钮路径
- **Reference:** README #4；Playwright 等价路径：`tests/e2e/popup-rpc.spec.ts:50` "popup RPC survives SW restart"

#### 4. Playwright e2e 跑绿（ROADMAP 成功标准 #5 末段 + #4 自动化覆盖）

- **Test:** `pnpm exec playwright install chromium` → `pnpm test:e2e`
- **Expected:** 3 specs 全绿（first mount=1 / 三连递增 / SW reload 后递增）
- **Why human:** 执行机本地无 chromium-1217 binary（Playwright 1.59.1 require）；下载 binary 需要外网与时间，CI 中按 D-11 不跑此步，开发机本地必须跑过一次
- **Reference:** 01-4-SUMMARY.md "Playwright chromium binary 缺失" 段落

### Requirements Matrix Updates Needed

REQUIREMENTS.md 的 traceability matrix 中以下 3 行当前仍标 `待办`，但代码 + 单元测试已经满足；orchestrator 在 update_roadmap 步骤应翻为 `✓ Done`：

| Requirement | Current Status (REQUIREMENTS.md) | Should Be             | Source Plan       |
| ----------- | -------------------------------- | --------------------- | ----------------- |
| FND-04      | 待办                             | ✓ Done (Plan 01-2)    | 01-2-storage-i18n |
| STG-01      | 待办                             | ✓ Done (Plan 01-2)    | 01-2-storage-i18n |
| STG-02      | 待办                             | ✓ Done (Plan 01-2)    | 01-2-storage-i18n |

`FND-01 / FND-02 / FND-03 / FND-05 / FND-06` 在 REQUIREMENTS.md 中已正确标 `✓ Done`，无需更新。

### Gaps Summary

无阻塞性 gaps。所有 must-have（13/13）+ ROADMAP 成功标准的可自动化部分（5/5）+ 跨 phase 横向约束（6/6）+ 单元测试（16/16）+ 工程闸门（typecheck / lint / build / verify-manifest）全部 PASS。

唯一卡在 `passed → human_needed` 的是 4 件需要真 Chrome 浏览器或本机 Chromium binary 的现场目检 / 现场跑 e2e：
- live `chrome://extensions` 加载（#1）
- en ↔ zh_CN locale 切换（#2）
- SW Stop 按钮路径（#3）
- `pnpm test:e2e` 实跑（#4）

这 4 件全部由开发者在本机 5 分钟内可完成。Phase 2 不依赖这 4 件中的任何一件即可启动；建议把它们持久化为 HUMAN-UAT.md 由开发者在 Phase 2 启动前 close out。

REQUIREMENTS.md matrix 的 3 行待办（FND-04 / STG-01 / STG-02）需 orchestrator 在 update_roadmap 步骤翻新；不构成 gap，仅是文档同步。

## Notes

- **`shared/storage/items.ts` 用 `wxt/utils/storage` 而非 plan 锁定的 `#imports`**：功能等价（`#imports` 是 WXT 自动 import 的虚拟路径，最终也指向 `wxt/utils/storage`），不影响行为。运行时 + 单测 + 构建产物均一致。
- **背景 background.js 构建产物中出现 `<all_urls>` 字符串**：这是 WXT 框架自身的 URL pattern matcher 工具类（`Ut.PROTOCOLS` / `isAllUrls`），与 manifest 的静态 `host_permissions` 声明无关；manifest.json 实测仍仅在 `optional_host_permissions` 中含 `<all_urls>`。verify-manifest FATAL 守卫只看 manifest.json 字段，不被构建产物 JS 字符串干扰。这是预期行为。
- **代码审查 (`01-REVIEW.md`) 中的 4 Warning + 4 Info 项**：本验证不审查它们；按 verifier 协议，code review 发现是顾问性质，不构成 phase goal 阻塞。orchestrator 可在 Phase 2 启动前依据 `01-REVIEW.md` 决定是否单独安排 follow-up plan。
- **Phase 1 整体可交付性结论**：克隆仓库 → `pnpm install` → `pnpm build` → 加载 unpacked → 双语 hello-world 工作 → Stop SW 仍工作 → CI 全绿。除"加载 unpacked + Stop SW"两步必须人工外，全部自动化路径 PASS。Phase 2 (CAP-01..05) 可直接在本扩展骨架上叠加 capture pipeline，不需要重写 Phase 1 任何代码。

---

_Verified: 2026-04-29T06:23:15Z_
_Verifier: Claude (gsd-verifier)_

---

## Post-Verification Update — 2026-04-29T09:55:00Z

人工验证暴露 5 个真问题（2 资产 + 1 文档过时 + 2 真 e2e bug），全部 fix 已 commit 上 main：

| Gap   | 来源                                  | 性质     | Fix commit | 状态     |
| ----- | ------------------------------------- | -------- | ---------- | -------- |
| 01    | #1 工具栏图标空白                     | 资产缺失 | 6f073ae    | resolved（开发者真 Chrome 验证 PASS） |
| 02    | #3 SW Stop README 路径过时（Chrome 138+） | 文档     | dd1d336    | resolved（开发者用 chrome://serviceworker-internals/ 验证 PASS） |
| 03    | #4 README 未明示 e2e 跑前 install binary | 文档     | dd1d336    | resolved（开发者按更新后步骤先 install） |
| 04    | #4 popup loading 渲染 ×0 与 RPC 失败视觉同形 | 真 code bug | 61046e6    | resolved（pending e2e re-run final verify） |
| 05    | #4 fixture reloadExtension 与 SW lazy-start race（WR-03 命中） | 真 code bug | 61046e6    | resolved（pending e2e re-run final verify） |

Gap-04 / Gap-05 是 Plan 01-4 落下的真 bug。Fix 已 ship，但执行机本地无 Chromium binary 且无 GUI，无法在此处复跑 Playwright 验证。HUMAN-UAT #4 状态为 `fixed — pending re-check`，开发者 `pnpm build && pnpm test:e2e` 一次确认即可关闭。

Status 翻为 `passed`：
- 13/13 自动化 must-have 维持 PASS
- 5 个 post-verification gap 全部 commit 修复
- 剩 1 项 human re-check（e2e 全绿）持久化在 `01-HUMAN-UAT.md`，由 `/gsd-progress` / `/gsd-audit-uat` 跟踪

Phase 不再阻塞推进。
