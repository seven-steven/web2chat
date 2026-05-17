---
status: complete
quick_id: "260517-aa2"
description: "移除飞书代码，保留移除原因"
---

# Quick Task 260517-aa2: 移除飞书代码

## Summary

Removed all Feishu/Lark adapter code from the codebase. Reason preserved as comment in `shared/adapters/registry.ts`: SPA 所有会话共享同一 URL，无法按 URL 定位具体会话。

## Changes

**Deleted (10 files):**
- `entrypoints/feishu.content.ts` — content script
- `shared/adapters/feishu-format.ts` — message formatter
- `shared/adapters/feishu-login-detect.ts` — login wall detector
- `background/injectors/feishu-main-world.ts` — MAIN world injector
- `tests/unit/adapters/feishu-format.spec.ts`
- `tests/unit/adapters/feishu-i18n.spec.ts`
- `tests/unit/adapters/feishu-login.spec.ts`
- `tests/unit/adapters/feishu-match.spec.ts`
- `tests/unit/adapters/feishu-selector.spec.ts`
- `tests/unit/adapters/feishu.fixture.html`

**Edited (13 files):**
- `shared/adapters/registry.ts` — removed feishu defineAdapter() entry, added removal reason comment
- `background/main-world-registry.ts` — removed feishu import and Map entry
- `entrypoints/popup/components/PlatformIcon.tsx` — removed feishu variant
- `locales/en.yml` — removed 4 feishu i18n keys, updated platform list in 2 messages
- `locales/zh_CN.yml` — same changes
- `wxt.config.ts` — removed feishu.cn and larksuite.com host_permissions
- `scripts/verify-manifest.ts` — removed feishu from expected host_permissions
- `tests/unit/dispatch/platform-detector.spec.ts` — registry length 6→5, removed feishu assertions
- `tests/unit/dispatch/spaFilter.spec.ts` — renamed feishu test data to generic 'subdomain-platform'
- `tests/unit/scripts/verify-manifest.spec.ts` — removed feishu from validManifest helper
- `README.md` — removed Feishu/Lark from IM tools list
- `README.en.md` — same

## Verification

- 430 unit tests passed (0 failures)
- Production build successful (no feishu.js in output)
- No residual feishu/lark references in source (only the removal reason comment)
- Shared infrastructure intact: findAdapter, detectPlatformId, buildSpaUrlFilters all preserved
