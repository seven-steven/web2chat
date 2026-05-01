---
phase: 04-openclaw
plan: 03
subsystem: permissions
tags: [chrome.permissions, dispatch-pipeline, options-page, preact-signals]

# Dependency graph
requires:
  - phase: 04-openclaw-plan-01
    provides: "grantedOrigins repo, OPENCLAW_* error codes, openclaw adapter registry entry with hostMatches:[]"
  - phase: 04-openclaw-plan-02
    provides: "openclaw content script adapter"
provides:
  - "Permission request in popup Confirm handler (user-gesture context)"
  - "Defensive permissions.contains guard in SW dispatch-pipeline"
  - "ErrorBanner exhaustive coverage for all 11 ErrorCodes"
  - "Options page GrantedOriginsSection with list + remove"
affects: [04-04, phase-5-discord]

# Tech tracking
tech-stack:
  added: []
  patterns: ["chrome.permissions.request in user-gesture context", "chrome.permissions.contains defensive guard in SW", "chrome.permissions.remove + storage double-action cleanup"]

key-files:
  created:
    - entrypoints/options/components/GrantedOriginsSection.tsx
  modified:
    - background/dispatch-pipeline.ts
    - entrypoints/popup/components/SendForm.tsx
    - entrypoints/popup/components/ErrorBanner.tsx
    - entrypoints/options/App.tsx

key-decisions:
  - "Permission requested only for specific origin/* (not broad wildcards) per T-04-03-01 mitigation"
  - "Remove button calls both chrome.permissions.remove and grantedOriginsRepo.remove (double-action) per T-04-03-02 mitigation"

patterns-established:
  - "Dynamic-permission adapter guard: adapter.hostMatches.length === 0 triggers permissions.contains check in SW and permissions.request in popup"
  - "Options section replacement: ReservedSection placeholder replaced by real component when phase delivers"

requirements-completed: [ADO-06, ADO-07]

# Metrics
duration: 4min
completed: 2026-05-02
---

# Phase 4 Plan 03: Permission UX Flow Summary

**Popup permissions.request on Confirm, SW defensive permissions.contains guard, ErrorBanner exhaustive ErrorCode coverage, Options page GrantedOriginsSection management**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-01T18:03:25Z
- **Completed:** 2026-05-01T18:07:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Popup Confirm handler calls chrome.permissions.request in user-gesture context for dynamic-permission adapters (openclaw)
- SW startDispatch has defensive permissions.contains check before openOrActivateTab — catches revoked permissions between popup click and SW processing
- ErrorBanner switch cases now cover all 11 ErrorCode values (added OPENCLAW_OFFLINE + OPENCLAW_PERMISSION_DENIED)
- Options page GrantedOriginsSection displays granted origins list with per-origin remove button (calls both chrome.permissions.remove and storage repo)

## Task Commits

Each task was committed atomically:

1. **Task 1: Permission guard in dispatch-pipeline + SendForm permission request** - `401571a` (feat)
2. **Task 2: ErrorBanner extension + GrantedOriginsSection + Options wiring** - `081c95f` (feat)

## Files Created/Modified

- `background/dispatch-pipeline.ts` - Added permissions.contains guard + OPENCLAW_* codes in failDispatch union
- `entrypoints/popup/components/SendForm.tsx` - Added chrome.permissions.request + grantedOriginsRepo in handleConfirm
- `entrypoints/popup/components/ErrorBanner.tsx` - Already had OPENCLAW_* codes (committed in previous plan's ErrorBanner creation); verified exhaustive
- `entrypoints/options/App.tsx` - Replaced ReservedSection placeholder with GrantedOriginsSection
- `entrypoints/options/components/GrantedOriginsSection.tsx` - Created: origins list + remove with chrome.permissions.remove

## Decisions Made

- Permission requested only for specific `origin/*` (not broad wildcards) per T-04-03-01 mitigation — user makes explicit grant/deny decision
- Remove button calls both `chrome.permissions.remove` (browser-level) AND `grantedOriginsRepo.remove` (storage) — double-action prevents stale grants (T-04-03-02)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Permission UX flow complete — popup requests, SW guards, options manages
- Ready for Plan 04-04 (E2E tests for OpenClaw adapter)

---
*Phase: 04-openclaw*
*Completed: 2026-05-02*
