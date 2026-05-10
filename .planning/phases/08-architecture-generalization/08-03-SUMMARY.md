---
phase: 08-architecture-generalization
plan: 03
subsystem: background
tags: [main-world-bridge, spa-filter, registry-routing, service-worker, chrome-extensions]

# Dependency graph
requires:
  - phase: 08-architecture-generalization
    provides: Branded PlatformId, defineAdapter(), buildSpaUrlFilters(), expanded AdapterRegistryEntry
  - phase: 08-architecture-generalization
    provides: ErrorCode = CommonErrorCode | PlatformErrorCode, isErrorCode() runtime guard
provides:
  - Generic MAIN world bridge routing via WEB2CHAT_MAIN_WORLD:<platformId> port prefix
  - Registry-driven mainWorldInjectors map (auto-built from adapterRegistry)
  - Dynamic SPA filter via buildSpaUrlFilters(adapterRegistry) replacing hardcoded hostSuffix
  - Dedicated onSpaHistoryStateUpdated handler (D-106)
  - advanceDispatchForTab shared helper for tab/SPA dispatch advancement
  - failDispatch with ErrorCode type and isErrorCode validation
  - discordMainWorldPaste extracted to background/injectors/discord-main-world.ts
affects: [phase-10-slack, phase-11-telegram, phase-12-lark]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MAIN world injector per-platform: create in background/injectors/<platform>-main-world.ts, set on registry entry's mainWorldInjector"
    - "SW-local injector map: background/main-world-registry.ts auto-discovers from adapterRegistry"
    - "SPA filter dynamic: buildSpaUrlFilters(adapterRegistry) at module top level, guarded by length > 0"
    - "Port name routing: WEB2CHAT_MAIN_WORLD:<platformId> prefix parsing in SW"

key-files:
  created:
    - background/injectors/discord-main-world.ts
    - background/main-world-registry.ts
    - tests/unit/dispatch/mainWorldBridge.spec.ts
  modified:
    - entrypoints/background.ts
    - entrypoints/discord.content.ts
    - background/dispatch-pipeline.ts
    - shared/adapters/registry.ts

key-decisions:
  - "mainWorldInjector set directly on registry entry (not SW-only overlay) -- tree-shaking confirmed via bundle-check gate"
  - "advanceDispatchForTab extracted as shared helper, used by both onTabComplete and onSpaHistoryStateUpdated"
  - "isErrorCode() runtime validation replaces unsafe inline cast for adapter response codes"

patterns-established:
  - "Adding MAIN world platform: create injector in background/injectors/, import in registry.ts, set on entry -- zero changes to background.ts or main-world-registry.ts"
  - "SPA platform: add spaNavigationHosts to registry entry -- buildSpaUrlFilters auto-discovers"
  - "Port routing: SW parses WEB2CHAT_MAIN_WORLD:<platformId>, looks up mainWorldInjectors map"

requirements-completed: [ARCH-02, ARCH-03]

# Metrics
duration: 9min
completed: 2026-05-10
---

# Phase 8 Plan 03: Generic MAIN Bridge + SPA Filter Summary

**Registry-driven MAIN world bridge routing via WEB2CHAT_MAIN_WORLD:<platformId> port prefix, with dynamic SPA filter from buildSpaUrlFilters and dedicated onSpaHistoryStateUpdated handler**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-09T23:50:52Z
- **Completed:** 2026-05-10T00:00:08Z
- **Tasks:** 3 (TDD RED + GREEN + generalization)
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- background.ts has zero Discord-specific constants or functions (DISCORD_MAIN_WORLD_PASTE_PORT removed, discordMainWorldPaste moved out)
- Generic MAIN bridge routes via WEB2CHAT_MAIN_WORLD: prefix + registry-driven mainWorldInjectors map
- SPA filter dynamically built from registry via buildSpaUrlFilters(adapterRegistry), uses hostEquals (exact match)
- failDispatch accepts ErrorCode type with isErrorCode() runtime validation
- All 265 tests pass, tsc clean, bundle-check gate passed (popup clean of injector code)

## TDD Gate Compliance

- RED commit: `d915346` (test) -- failing tests for port name parsing, registry injector lookup, security grep gates
- GREEN commit: `ae2b456` (feat) -- implementation passes all tests (combined with Task 3 generalization)
- Gate sequence verified: test commit precedes feat commit in git log

## Task Commits

Each task was committed atomically:

1. **Task 1: RED -- Create mainWorldBridge tests (failing)** - `d915346` (test)
2. **Task 2: GREEN -- Extract advanceDispatchForTab, add onSpaHistoryStateUpdated, type failDispatch** - `a3ba3a4` (feat)
3. **Task 3: Generalize background.ts -- create main-world-registry, remove Discord-specific code** - `ae2b456` (feat)

## Files Created/Modified
- `background/injectors/discord-main-world.ts` (NEW) - discordMainWorldPaste function extracted from background.ts
- `background/main-world-registry.ts` (NEW) - SW-local injector map auto-built from adapterRegistry entries
- `tests/unit/dispatch/mainWorldBridge.spec.ts` (NEW) - 9 tests covering port parsing, registry lookup, security gates
- `entrypoints/background.ts` - Generic MAIN bridge + dynamic SPA filter, no Discord-specific code
- `entrypoints/discord.content.ts` - Uses WEB2CHAT_MAIN_WORLD:discord port name
- `background/dispatch-pipeline.ts` - advanceDispatchForTab helper, onSpaHistoryStateUpdated, failDispatch with ErrorCode
- `shared/adapters/registry.ts` - Discord entry gains mainWorldInjector: discordMainWorldPaste

## Decisions Made
- Set mainWorldInjector directly on registry entry (shared/adapters/registry.ts imports from background/injectors/) rather than using SW-only overlay. Bundle-check gate confirmed tree-shaking works correctly -- popup bundle has no injector code.
- advanceDispatchForTab is a private helper shared between onTabComplete and onSpaHistoryStateUpdated, keeping D-106 semantics distinct while avoiding code duplication.
- Replaced the unsafe `code as | 'INTERNAL' | ...` inline cast with `isErrorCode(rawCode) ? rawCode : 'INTERNAL'` runtime validation per T-08-03-04.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree lacked .wxt/ directory (generated by `npx wxt prepare`). Required running `wxt prepare` to generate tsconfig base before vitest could resolve imports. Standard worktree bootstrapping issue.

## Known Stubs
None -- all code is fully wired.

## User Setup Required
None - no external service configuration required.

## Threat Surface Verification

All four threat mitigations from the plan's threat model verified:
- T-08-03-01 (Port name injection): Port prefix validated, unknown platformIds rejected via mainWorldInjectors.get()
- T-08-03-02 (Wrong tab execution): Uses senderPort.sender?.tab?.id, grep gate test confirms no msg.tabId
- T-08-03-03 (SPA filter too broad): Uses hostEquals (exact match), guarded by spaFilters.length > 0
- T-08-03-04 (Adapter response code): isErrorCode() validates, unknown codes default to INTERNAL

## Next Phase Readiness
- New MAIN world platforms only need: background/injectors/<platform>-main-world.ts + mainWorldInjector on registry entry
- New SPA platforms only need: spaNavigationHosts on registry entry
- background.ts and main-world-registry.ts require zero changes for new platforms
- Plan 08-04 (ErrorBanner default case) can proceed independently

## Self-Check: PASSED

- All 7 key files exist (3 created, 4 modified)
- All 3 task commits found (d915346, a3ba3a4, ae2b456)
- TDD gate order correct: test commit precedes feat commits

---
*Phase: 08-architecture-generalization*
*Completed: 2026-05-10*
