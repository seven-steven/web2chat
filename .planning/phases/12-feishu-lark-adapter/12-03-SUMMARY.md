---
phase: 12-feishu-lark-adapter
plan: 03
subsystem: adapter-infrastructure
tags: [feishu, lark, registry, hostSuffix, SPA-filter, MAIN-world, paste-injector]

# Dependency graph
requires:
  - phase: 08-arch-generalization
    provides: AdapterRegistryEntry, defineAdapter, buildSpaUrlFilters, MAIN world registry pattern
provides:
  - feishu adapter registry entry with dual-domain match (feishu.cn / larksuite.com)
  - spaNavigationUseHostSuffix field for wildcard subdomain SPA filters
  - feishu MAIN world paste injector
affects: [12-04, 12-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [hostSuffix SPA filter for wildcard subdomain adapters, ARIA-first three-tier editor selector]

key-files:
  created:
    - background/injectors/feishu-main-world.ts
  modified:
    - shared/adapters/types.ts
    - shared/adapters/registry.ts
    - background/main-world-registry.ts
    - tests/unit/dispatch/spaFilter.spec.ts
    - tests/unit/dispatch/platform-detector.spec.ts

key-decisions:
  - "spaNavigationUseHostSuffix optional boolean field (default false) on AdapterRegistryEntry preserves backward compatibility for existing hostEquals adapters"
  - "hostSuffix: 'feishu.cn' matches all *.feishu.cn subdomains for SPA navigation, replacing need to enumerate each tenant subdomain"

patterns-established:
  - "hostSuffix pattern: adapters with wildcard subdomain tenants use spaNavigationUseHostSuffix: true to emit chrome.events.UrlFilter hostSuffix instead of hostEquals"

requirements-completed: [FSL-01, FSL-03]

# Metrics
duration: 3min
completed: 2026-05-16
---

# Phase 12 Plan 03: Registry + SPA hostSuffix + MAIN World Injector Summary

**Feishu adapter registered with dual-domain match, buildSpaUrlFilters extended with hostSuffix for wildcard subdomain SPA navigation, MAIN world paste injector wired**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-16T10:17:48Z
- **Completed:** 2026-05-16T10:21:14Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments
- Registered feishu adapter with dual-domain match (feishu.cn / larksuite.com) and /messenger path prefix
- Extended buildSpaUrlFilters to support hostSuffix for wildcard subdomain matching (backward compatible)
- Created feishu MAIN world paste injector with ARIA-first three-tier selector strategy
- All 430 tests pass (53 test files)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend buildSpaUrlFilters for hostSuffix + register feishu adapter + MAIN world injector** - `195189b` (feat)

## Files Created/Modified
- `shared/adapters/types.ts` - Added spaNavigationUseHostSuffix optional boolean field
- `shared/adapters/registry.ts` - Extended buildSpaUrlFilters return type + added feishu defineAdapter entry
- `background/injectors/feishu-main-world.ts` - NEW: MAIN world paste injector with ClipboardEvent strategy
- `background/main-world-registry.ts` - Wired feishuMainWorldPaste into injector map
- `tests/unit/dispatch/spaFilter.spec.ts` - Added hostSuffix + mixed filter tests
- `tests/unit/dispatch/platform-detector.spec.ts` - Updated registry count to 6, added feishu entry

## Decisions Made
- spaNavigationUseHostSuffix as optional boolean (default false) preserves hostEquals behavior for all existing adapters (discord, slack, telegram, openclaw, mock)
- hostSuffix: 'feishu.cn' matches all tenant subdomains without enumeration, which is essential for feishu's {tenant}.feishu.cn pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- feishu adapter infrastructure wired, ready for Plan 04 (i18n/icon/manifest) and Plan 05 (content script)
- feishu-match.spec.ts tests from Plan 02 will validate match function once that plan lands

---
*Phase: 12-feishu-lark-adapter*
*Completed: 2026-05-16*

## Self-Check: PASSED
