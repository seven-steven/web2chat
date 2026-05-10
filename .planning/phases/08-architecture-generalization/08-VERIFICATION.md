---
phase: 08-architecture-generalization
verified: 2026-05-10T08:58:00Z
status: gaps_found
score: 12/13 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 12/12
  gaps_closed: []
  gaps_remaining: []
  regressions:
    - "Popup bundle still contains Discord MAIN-world injector code; previous verification missed this wiring leak."
gaps:
  - truth: "Popup bundle remains free of MAIN-world injector code, or a SW-only overlay is applied"
    status: failed
    reason: "shared/adapters/registry.ts imports the Discord injector from background/injectors, and the production popup bundle contains the compiled injector function plus DataTransfer/ClipboardEvent code. The planned fallback overlay was not applied."
    artifacts:
      - path: "shared/adapters/registry.ts"
        issue: "Shared registry imports '@/background/injectors/discord-main-world' at module top level, making injector code reachable from popup imports."
      - path: ".output/chrome-mv3/chunks/popup-A1thbmku.js"
        issue: "Built popup chunk contains the minified Discord injector function and mainWorldInjector:k on the discord registry entry."
    missing:
      - "Move MAIN-world injector attachment behind a SW-only boundary (for example, overlay in background/main-world-registry.ts or split popup-safe and SW-only registries)."
      - "Rebuild and verify popup bundle no longer contains ClipboardEvent/DataTransfer injector code."
---

# Phase 8: 架构泛化 Verification Report

**Phase Goal:** 多平台并行开发的架构基础就绪，新增平台无需改动 pipeline 或 SW 入口文件
**Verified:** 2026-05-10T08:58:00Z
**Status:** gaps_found
**Re-verification:** Yes — previous VERIFICATION.md existed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | PlatformId 为 branded string type，通过 registry 条目 id 字段约束合法值，新增平台不引起合并冲突 | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/types.ts` declares `__platformIdBrand`, `PlatformId`, `definePlatformId()`, and `defineAdapter()`. `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/registry.ts` wraps mock/openclaw/discord with `defineAdapter(...)`. |
| 2 | MAIN world paste 桥接基于 port.name 前缀路由到 per-adapter mainWorldInjector，SW 不含任何平台特定 DOM 逻辑 | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/background.ts` routes `WEB2CHAT_MAIN_WORLD:` ports via `mainWorldInjectors.get(platformId)` and has no Discord-specific DOM code. `/Users/seven/data/coding/projects/seven/web2chat/background/main-world-registry.ts` auto-builds the map from registry entries. |
| 3 | SPA 路由检测 filter 从 adapterRegistry 动态构建，新增 SPA 平台只需在 registry 添加条目 | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/registry.ts` exports `buildSpaUrlFilters()`, using `spaNavigationHosts -> { hostEquals }`. `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/background.ts` computes `const spaFilters = buildSpaUrlFilters(adapterRegistry)` and registers `onHistoryStateUpdated` only when `spaFilters.length > 0`. |
| 4 | ErrorCode 按平台命名空间组织，新平台可追加错误码而不影响现有错误处理 | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/shared/messaging/result.ts` defines `CommonErrorCode`, imports `PlatformErrorCode`, exports `ErrorCode = CommonErrorCode | PlatformErrorCode`, and provides `isErrorCode()`. `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/platform-errors.ts` provides `OPENCLAW_ERROR_CODES` and `ALL_PLATFORM_ERROR_CODES`. |
| 5 | DispatchRecord.platform_id uses branded PlatformId | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/shared/storage/repos/dispatch.ts` line 25 declares `platform_id: PlatformId;`. |
| 6 | Discord content script uses generic MAIN-world port naming | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/discord.content.ts` defines `const MAIN_WORLD_PORT = \`WEB2CHAT_MAIN_WORLD:${PLATFORM_ID}\`` and connects with that name. |
| 7 | onSpaHistoryStateUpdated is a dedicated handler rather than direct onTabComplete reuse | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/background/dispatch-pipeline.ts` exports `onSpaHistoryStateUpdated(details)` and delegates to shared helper `advanceDispatchForTab(details.tabId)`. |
| 8 | Adapter response error codes are runtime-validated, not blindly cast | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/background/dispatch-pipeline.ts` uses `const code: ErrorCode = isErrorCode(rawCode) ? rawCode : 'INTERNAL';`. |
| 9 | Popup SendForm consumes registry metadata instead of hardcoded platform if/else chains | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/popup/components/SendForm.tsx` uses `findAdapter(url)?.iconKey` and `adapterRegistry.find((e) => e.id === id)` via `iconKeyToVariant()`. |
| 10 | ErrorBanner has default handling for future ErrorCodes | ✓ VERIFIED | `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/popup/components/ErrorBanner.tsx` has `default` branches in `errorHeading`, `errorBody`, and `errorRetry`. |
| 11 | No raw `as PlatformId` casts are scattered outside the type helper layer | ✓ VERIFIED | `grep -R -n "as PlatformId" shared entrypoints background tests | grep -v "shared/adapters/types.ts"` returned no matches. |
| 12 | Automated behavior checks for this phase pass | ✓ VERIFIED | `npx vitest run` passed 37 files / 265 tests. `npx tsc --noEmit` exited 0. |
| 13 | Popup bundle remains free of MAIN-world injector code, or a SW-only overlay is applied | ✗ FAILED | Production build output `/Users/seven/data/coding/projects/seven/web2chat/.output/chrome-mv3/chunks/popup-A1thbmku.js` contains the compiled injector function (`new DataTransfer`, `new ClipboardEvent`) and the discord registry entry includes `mainWorldInjector:k`. This disproves the summary claim that the popup bundle is clean. |

**Score:** 12/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/types.ts` | Branded PlatformId and registry entry contract | ✓ VERIFIED | Contains branded `PlatformId`, `definePlatformId()`, `defineAdapter()`, and optional `mainWorldInjector` / `spaNavigationHosts` / `errorCodes`. |
| `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/registry.ts` | Shared adapter registry with Phase 8 fields | ⚠ ORPHANED/HOLLOW | Functionally wired, but imports SW injector code from `background/injectors/discord-main-world.ts`, making popup bundle contamination observable in build output. |
| `/Users/seven/data/coding/projects/seven/web2chat/background/main-world-registry.ts` | SW-local injector map | ✓ VERIFIED | Iterates `adapterRegistry` and collects entries whose `mainWorldInjector` is a function. |
| `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/background.ts` | Generic MAIN bridge and dynamic SPA filter | ✓ VERIFIED | Uses generic port prefix, dynamic SPA filters, dedicated SPA handler. |
| `/Users/seven/data/coding/projects/seven/web2chat/shared/messaging/result.ts` | Namespaced ErrorCode model | ✓ VERIFIED | Common/platform split plus runtime guard exists and is used. |
| `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/popup/components/SendForm.tsx` | Registry-driven popup consumer | ✓ VERIFIED | Registry lookup replaces hardcoded icon logic. |
| `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/popup/components/ErrorBanner.tsx` | Future-proof error rendering | ✓ VERIFIED | Default cases present in all three switch functions. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `entrypoints/background.ts` | `background/main-world-registry.ts` | `import { mainWorldInjectors }` | ✓ WIRED | Generic port listener uses `mainWorldInjectors.get(platformId)`. |
| `background/main-world-registry.ts` | `shared/adapters/registry.ts` | iterate `adapterRegistry` | ✓ WIRED | Injector map is derived from registry entries, not hardcoded per platform. |
| `entrypoints/background.ts` | `shared/adapters/registry.ts` | `buildSpaUrlFilters(adapterRegistry)` | ✓ WIRED | SPA filters are built once at module load and used for listener registration. |
| `shared/messaging/result.ts` | `shared/adapters/platform-errors.ts` | `PlatformErrorCode` + `ALL_PLATFORM_ERROR_CODES` imports | ✓ WIRED | Type union and runtime validation both depend on platform error declarations. |
| `entrypoints/popup/components/SendForm.tsx` | `shared/adapters/registry.ts` | `findAdapter` + `adapterRegistry` | ✓ WIRED | Popup icon logic is now registry-driven. |
| `shared/adapters/registry.ts` | `background/injectors/discord-main-world.ts` | top-level import | ✗ NOT_WIRED SAFELY | This link works functionally, but crosses the popup/SW boundary and leaks injector code into popup build output. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `/Users/seven/data/coding/projects/seven/web2chat/background/main-world-registry.ts` | `mainWorldInjectors` | `adapterRegistry.filter(...mainWorldInjector...)` | Yes | ✓ FLOWING |
| `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/background.ts` | `spaFilters` | `buildSpaUrlFilters(adapterRegistry)` | Yes | ✓ FLOWING |
| `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/popup/components/SendForm.tsx` | icon variant | `adapter.iconKey -> iconKeyToVariant()` | Yes | ✓ FLOWING |
| `/Users/seven/data/coding/projects/seven/web2chat/.output/chrome-mv3/chunks/popup-A1thbmku.js` | bundled injector code | reachable from shared registry import graph | Yes, undesirably | ✗ LEAKING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full unit suite | `cd /Users/seven/data/coding/projects/seven/web2chat && npx vitest run` | 37 files, 265 tests passed | ✓ PASS |
| Type checking | `cd /Users/seven/data/coding/projects/seven/web2chat && npx tsc --noEmit` | exit 0 | ✓ PASS |
| No scattered PlatformId casts | `cd /Users/seven/data/coding/projects/seven/web2chat && grep -R -n "as PlatformId" shared entrypoints background tests | grep -v "shared/adapters/types.ts"` | no output | ✓ PASS |
| Popup bundle isolation | `cd /Users/seven/data/coding/projects/seven/web2chat && npx wxt build && grep -R -n -E 'discordMainWorldPaste|ClipboardEvent|DataTransfer' .output/chrome-mv3/chunks/popup-*.js .output/chrome-mv3/popup.html` | popup chunk contains `new DataTransfer`, `new ClipboardEvent`, and `mainWorldInjector:k` | ✗ FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| ARCH-01 | `08-01-PLAN.md`, `08-04-PLAN.md` | PlatformId branded string type; registry id constrains legal values | ✓ SATISFIED | `shared/adapters/types.ts`, `shared/adapters/registry.ts`, `shared/storage/repos/dispatch.ts`, popup registry-driven consumers. |
| ARCH-02 | `08-03-PLAN.md` | MAIN world bridge routed per adapter via port prefix | ✓ SATISFIED | `entrypoints/background.ts`, `background/main-world-registry.ts`, `entrypoints/discord.content.ts`. |
| ARCH-03 | `08-01-PLAN.md`, `08-03-PLAN.md` | SPA filter dynamically built from adapterRegistry | ✓ SATISFIED | `buildSpaUrlFilters()` + `onSpaHistoryStateUpdated` registration. |
| ARCH-04 | `08-02-PLAN.md`, `08-04-PLAN.md` | ErrorCode namespaced and extensible | ✓ SATISFIED | `shared/messaging/result.ts`, `shared/adapters/platform-errors.ts`, `entrypoints/popup/components/ErrorBanner.tsx`. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/registry.ts` | 28 | Shared popup-imported registry directly imports SW injector module | BLOCKER | Makes MAIN-world injector code reachable from popup bundle. |
| `/Users/seven/data/coding/projects/seven/web2chat/.output/chrome-mv3/chunks/popup-A1thbmku.js` | 1 | Production popup bundle contains `DataTransfer` / `ClipboardEvent` injector implementation | BLOCKER | Disproves bundle-isolation claim; architecture leaks platform-specific DOM code into popup build. |
| `/Users/seven/data/coding/projects/seven/web2chat/tests/unit/dispatch/mainWorldBridge.spec.ts` | 16-76 | Test only checks local prefix parsing + map lookup; it does not guard bundle isolation | WARNING | Existing tests can pass while the build still violates the intended architecture boundary. |

### Human Verification Required

None.

### Gaps Summary

Phase 8 mostly implements the intended generic routing: branded PlatformId exists, registry-driven SPA filtering exists, generic MAIN-world port routing exists, and ErrorCode namespacing exists. But the phase goal is not fully achieved because the chosen wiring leaks Discord MAIN-world injector code into the popup production bundle.

The root cause is visible in source and build output:
- `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/registry.ts` imports `/Users/seven/data/coding/projects/seven/web2chat/background/injectors/discord-main-world.ts` directly.
- Popup code imports that shared registry.
- After `npx wxt build`, `/Users/seven/data/coding/projects/seven/web2chat/.output/chrome-mv3/chunks/popup-A1thbmku.js` contains the minified injector function and `mainWorldInjector` field.

So the summary's “popup clean of injector code” claim is false. The architecture still works today, but it is not the clean foundation claimed for multi-platform parallel development. Each future MAIN-world adapter added this way will also be pulled into the popup bundle unless the injector attachment is moved behind a SW-only boundary.

---

_Verified: 2026-05-10T08:58:00Z_
_Verifier: Claude (gsd-verifier)_
