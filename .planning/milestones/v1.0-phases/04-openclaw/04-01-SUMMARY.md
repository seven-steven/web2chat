---
phase: 04-openclaw
plan: 01
subsystem: shared-infrastructure
tags: [error-codes, dom-injection, storage, adapter-registry, i18n]

# Dependency graph
requires:
  - phase: 03-dispatch-popup
    provides: ErrorCode union, adapterRegistry, IMAdapter types, storage items pattern, ErrorBanner component
provides:
  - OPENCLAW_OFFLINE and OPENCLAW_PERMISSION_DENIED error codes
  - setInputValue DOM injection helper (property-descriptor setter)
  - grantedOrigins storage item + CRUD repo
  - OpenClaw adapter registry entry (match /ui/chat or /chat + session param)
  - Phase 4 i18n keys (error codes + options origins) in en + zh_CN
affects: [04-openclaw-plan-02, 04-openclaw-plan-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [property-descriptor-setter-dom-injection, storage-item-with-migrations, dynamic-permission-origin-tracking]

key-files:
  created:
    - shared/dom-injector.ts
    - shared/storage/repos/grantedOrigins.ts
    - tests/unit/dom-injector/setInputValue.spec.ts
    - tests/unit/repos/grantedOrigins.spec.ts
  modified:
    - shared/messaging/result.ts
    - shared/storage/items.ts
    - shared/adapters/registry.ts
    - entrypoints/popup/components/ErrorBanner.tsx
    - entrypoints/options/App.tsx
    - locales/en.yml
    - locales/zh_CN.yml

key-decisions:
  - "ErrorBanner exhaustive switch required adding OPENCLAW_OFFLINE + OPENCLAW_PERMISSION_DENIED cases + RETRIABLE_CODES set entries"
  - "options_origins_heading replaces options_reserved_granted_origins_label in App.tsx to match new i18n key naming"
  - "grantedOrigins storage item uses CURRENT_SCHEMA_VERSION + identity migration for WXT compatibility"

patterns-established:
  - "property-descriptor setter for React-controlled input injection: setInputValue uses Object.getOwnPropertyDescriptor + dispatchEvent(input)"
  - "storage repo pattern: typed item in shared/storage/items.ts + CRUD wrapper in shared/storage/repos/"

requirements-completed: [ADO-03, ADO-06, ADO-07]

# Metrics
duration: 5min
completed: 2026-05-01
---

# Phase 4 Plan 01: Foundation Summary

**Extended ErrorCode union with OpenClaw codes, created setInputValue DOM injection helper, grantedOrigins CRUD repo, registered OpenClaw adapter entry, and added all Phase 4 i18n keys**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-01T17:37:00Z
- **Completed:** 2026-05-01T17:41:43Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- ErrorCode union extended with OPENCLAW_OFFLINE + OPENCLAW_PERMISSION_DENIED (2 new codes)
- setInputValue helper using property-descriptor setter pattern for React-controlled inputs
- grantedOrigins repo with list/add/remove/has CRUD and deduplication
- OpenClaw adapter registered in adapterRegistry (match on /ui/chat or /chat + session param, empty hostMatches for dynamic permission)
- Phase 4 i18n keys 100% parity in en.yml + zh_CN.yml (6 error + 4 options keys)
- ErrorBanner.tsx updated with exhaustive switch for new codes
- 10 unit tests all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ErrorCode + create dom-injector + grantedOrigins storage** - `fd32404` (feat)
2. **Task 2: Register OpenClaw adapter entry + add i18n keys + write unit tests** - `0f11bbc` (feat)

## Files Created/Modified
- `shared/messaging/result.ts` - Added OPENCLAW_OFFLINE + OPENCLAW_PERMISSION_DENIED to ErrorCode union
- `shared/dom-injector.ts` - Created setInputValue helper (property-descriptor setter + input event dispatch)
- `shared/storage/items.ts` - Added grantedOriginsItem (storage.local, string[])
- `shared/storage/repos/grantedOrigins.ts` - Created CRUD repo (list/add/remove/has) with dedup
- `shared/adapters/registry.ts` - Registered OpenClaw adapter entry (match + scriptFile + hostMatches)
- `entrypoints/popup/components/ErrorBanner.tsx` - Added OPENCLAW_OFFLINE + OPENCLAW_PERMISSION_DENIED to exhaustive switch + RETRIABLE_CODES
- `entrypoints/options/App.tsx` - Updated reserved origins section to use new i18n key
- `locales/en.yml` - Added 10 Phase 4 keys (6 error + 4 options)
- `locales/zh_CN.yml` - Added 10 Phase 4 keys (6 error + 4 options)
- `tests/unit/dom-injector/setInputValue.spec.ts` - 3 tests for setInputValue
- `tests/unit/repos/grantedOrigins.spec.ts` - 7 tests for grantedOrigins repo

## Decisions Made
- ErrorBanner.tsx required exhaustive switch fix: added OPENCLAW_OFFLINE + OPENCLAW_PERMISSION_DENIED to switch cases and RETRIABLE_CODES set (Rule 1 auto-fix — typecheck failure)
- App.tsx reserved origins label changed from `options_reserved_granted_origins_label` to `options_origins_heading` to match new i18n key naming (Rule 3 auto-fix — typecheck failure from removed key)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ErrorBanner.tsx missing exhaustive switch cases for new ErrorCode**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** Adding OPENCLAW_OFFLINE and OPENCLAW_PERMISSION_DENIED to ErrorCode union caused TS2366 (Function lacks ending return statement) in ErrorBanner.tsx's switch statements
- **Fix:** Added case branches for both new codes in errorHeading, errorBody, and errorRetry functions; added both codes to RETRIABLE_CODES set
- **Files modified:** entrypoints/popup/components/ErrorBanner.tsx
- **Verification:** typecheck passes
- **Committed in:** fd32404 (Task 1 commit)

**2. [Rule 3 - Blocking] options App.tsx referenced removed i18n key**
- **Found during:** Task 2 (typecheck verification)
- **Issue:** `options_reserved_granted_origins_label` key was replaced by new `options_origins_*` keys, but App.tsx still referenced the old key
- **Fix:** Changed App.tsx to reference `options_origins_heading` instead
- **Files modified:** entrypoints/options/App.tsx
- **Verification:** typecheck passes
- **Committed in:** 0f11bbc (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. ErrorBanner exhaustive switch is critical for new error codes to render. No scope creep.

## Issues Encountered
None beyond the two auto-fixed deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OpenClaw adapter infrastructure complete: error codes, DOM helper, storage, registry entry, i18n
- Plan 02 (adapter content script) can proceed with setInputValue + ADAPTER_DISPATCH protocol
- Plan 03 (integration) can proceed with grantedOrigins repo + dispatch-pipeline permission check

---
*Phase: 04-openclaw*
*Completed: 2026-05-01*

## Self-Check: PASSED

All 11 created/modified files verified present on disk.
Both task commits (fd32404, 0f11bbc) verified in git log.
