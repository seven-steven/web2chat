---
phase: 04-openclaw
plan: 05
subsystem: [storage, popup, permissions]
tags: [chrome.permissions, storage.local, popup-resume, dispatch]

# Dependency graph
requires:
  - phase: 04-openclaw
    provides: "grantedOrigins repo, SendForm handleConfirm, App.tsx mount logic"
provides:
  - "pendingDispatch storage item + repo methods for intent persistence across popup close"
  - "grantedOriginsRepo.has() using chrome.permissions.contains as authoritative source"
  - "App.tsx popup resume on reopen — auto-sends dispatch on grant, shows error on deny"
  - "Capture error no longer overrides dispatch error on popup reopen"
affects: [04-openclaw, e2e]

# Tech tracking
tech-stack:
  added: []
  patterns: ["pendingDispatch intent-before-permission-request pattern"]

key-files:
  created: []
  modified:
    - path: "shared/storage/items.ts"
      provides: "pendingDispatchItem storage.local item for DispatchStartInput persistence"
    - path: "shared/storage/repos/popupDraft.ts"
      provides: "savePendingDispatch / loadPendingDispatch / clearPendingDispatch repo methods"
    - path: "shared/storage/repos/grantedOrigins.ts"
      provides: "has() queries chrome.permissions.contains with local mirror fallback"
    - path: "entrypoints/popup/components/SendForm.tsx"
      provides: "handleConfirm saves intent before chrome.permissions.request"
    - path: "entrypoints/popup/App.tsx"
      provides: "Mount Step 0 checks pendingDispatch — auto-resume or error on reopen"

key-decisions:
  - "chrome.permissions.contains is the authoritative permission check; local mirror is fallback only"
  - "pendingDispatch stored in storage.local (not session) so it survives popup close"
  - "grantedOriginsRepo.add is best-effort (.catch(() => {})) since Chrome API is now authoritative"

requirements-completed: [ADO-05, ADO-06, ADO-07]

# Metrics
duration: 7min
completed: 2026-05-03
---

# Phase 4: OpenClaw Plan 05 Summary

**Fix popup close on permission dialog — intent persistence + auto-resume dispatch on reopen**

## Performance

- **Duration:** 7 min
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- Added pendingDispatchItem to storage.local for DispatchStartInput persistence
- Fixed grantedOriginsRepo.has() to query chrome.permissions.contains as authoritative source
- SendForm.handleConfirm saves intent before chrome.permissions.request, clears on grant/deny
- App.tsx mount Step 0 auto-resumes dispatch on popup reopen when permission was granted
- App.tsx capture error no longer overrides dispatch error (fixes OPENCLAW_OFFLINE vs EXECUTE_SCRIPT_FAILED priority)

## Task Commits

1. **Task 1: Pending dispatch storage + grantedOrigins fix + popup resume logic** - `8f45066` (feat)

## Files Created/Modified
- `shared/storage/items.ts` - Added pendingDispatchItem + DispatchStartInput import
- `shared/storage/repos/popupDraft.ts` - Added savePendingDispatch / loadPendingDispatch / clearPendingDispatch
- `shared/storage/repos/grantedOrigins.ts` - has() now queries chrome.permissions.contains with try/catch fallback
- `entrypoints/popup/components/SendForm.tsx` - handleConfirm saves intent before permission request
- `entrypoints/popup/App.tsx` - Mount Step 0 resume logic + dispatch error priority fix

## Decisions Made
- Used try/catch around chrome.permissions.contains in has() to handle test environments where the API is unavailable
- pendingDispatchItem uses simple nullable item (no version/migration) — cleared on successful dispatch, not durable schema

## Deviations from Plan
None — plan executed exactly as specified.

## Issues Encountered
- fakeBrowser doesn't implement chrome.permissions.contains — fixed by wrapping the call in try/catch with fallback to local mirror

## Next Phase Readiness
- Popup now survives permission dialogs and tab switches for OpenClaw dispatch
- E2E specs (plan 06) can be updated to test the popup-reopen pattern

---
*Phase: 04-openclaw*
*Completed: 2026-05-03*
