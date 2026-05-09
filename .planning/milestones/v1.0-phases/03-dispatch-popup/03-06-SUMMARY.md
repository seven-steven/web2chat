---
phase: 03-dispatch-popup
plan: 06
subsystem: [popup-ui, state-machine, dispatch, draft-persistence]
tags: [preact, 6-state-machine, sendform, popup-chrome, capture-preview, combobox, binding, popup-draft, dispatch-in-progress]

# Dependency graph
requires:
  - phase: 03-dispatch-popup/03-01
    provides: ErrorCode union (9 codes), ProtocolMap with 6 RPC schemas, i18n keys
  - phase: 03-dispatch-popup/03-02
    provides: popupDraft repo (get/update/clear), dispatch repo (get/getActive), history repo, binding repo
  - phase: 03-dispatch-popup/03-04
    provides: Adapter registry with findAdapter/detectPlatformId, dispatch.start/cancel RPC handlers, background.ts wiring
  - phase: 03-dispatch-popup/03-05
    provides: Combobox, InProgressView, ErrorBanner, PlatformIcon, primitives (FieldLabel/textareaClass/inputClass)
provides:
  - 6-state popup machine (loading | success(SendForm) | empty | error | inProgress | dispatchError)
  - PopupChrome with settings gear (D-37)
  - SendForm composing send_to + prompt comboboxes + soft-overwrite hint + Confirm + CapturePreview
  - CapturePreview extracted from Phase 2 SuccessView with all 5 data-testids preserved
  - Parallel-read mount sequence: getActive -> capture.run + popupDraft.get -> badge clear
  - 200ms platform detection debounce, 800ms draft + binding debounce
affects: [03-08-e2e, 04-openclaw-adapter, 05-discord-adapter]

# Tech tracking
tech-stack:
  added: []
  patterns: [6-state-popup-machine, parallel-read-mount, capture-preview-extraction, soft-overwrite-binding]

key-files:
  created:
    - entrypoints/popup/components/PopupChrome.tsx
    - entrypoints/popup/components/SendForm.tsx
    - entrypoints/popup/components/CapturePreview.tsx
  modified:
    - entrypoints/popup/App.tsx

key-decisions:
  - "CapturePreview extracted as standalone child component (not inlined in SendForm) to preserve Phase 2 e2e selectors at same DOM depth"
  - "SendForm receives all signals via props (not direct signal imports) for testability and extraction flexibility"
  - "promptDirty signal bridges between SendForm and App.tsx to track whether user manually edited the prompt field"

patterns-established:
  - "6-state popup machine: InProgressView and SendForm are mutually exclusive; ErrorBanner only above SendForm"
  - "Parallel-read mount: getActive first (skip capture if in-flight), then Promise.all(capture.run, draftRepo.get), then badge clear"
  - "Popup chrome wrapper: all states wrapped in PopupChrome + state-specific main content"

requirements-completed: [DSP-01, DSP-02, DSP-03, DSP-04, DSP-05, DSP-06, DSP-07, DSP-08, DSP-09]

# Metrics
duration: 6min
completed: 2026-05-01
---

# Phase 3 Plan 06: Popup Integration Summary

**6-state popup machine with SendForm + PopupChrome + CapturePreview; parallel-read mount with draft recovery; 200ms platform detection + 800ms draft/binding debounce**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-01T11:54:18Z
- **Completed:** 2026-05-01T12:00:41Z
- **Tasks:** 2
- **Files modified:** 4 (3 created + 1 modified)

## Accomplishments

- PopupChrome: title bar + settings gear (chrome.runtime.openOptionsPage) rendered across all 6 popup states
- CapturePreview: Phase 2 SuccessView JSX extracted verbatim with all 5 data-testids (capture-success, capture-field-title, capture-field-url, capture-field-description, capture-field-createAt, capture-field-content) at same DOM depth for e2e selector compatibility
- SendForm: composes send_to Combobox + prompt Combobox + soft-overwrite hint (D-27) + Confirm button + CapturePreview; receives all signals via props; manages history fetch, platform detection debounce (200ms), popupDraft debounce (800ms), binding upsert debounce (800ms)
- App.tsx refactored from 4-state to 6-state machine: loading, success(SendForm), empty, error, inProgress, dispatchError
- Mount sequence per UI-SPEC S6: getActive first (skip capture if in-flight), parallel Promise.all(capture.run, draftRepo.get), then clear err badge (D-34)
- Phase 2 LoadingSkeleton / EmptyView / ErrorView / EmptyIcon / AlertIcon preserved verbatim with PopupChrome wrapper
- Local FieldLabel + textareaClass removed from App.tsx (now imported from primitives.tsx by CapturePreview)
- SuccessView removed (absorbed by CapturePreview composed within SendForm)

## Task Commits

Each task was committed atomically:

1. **Task 1: PopupChrome + CapturePreview + SendForm components** - `1f23fd8` (feat)
2. **Task 2: Refactor App.tsx — 6-state machine + parallel-read mount + 4 new signals** - `bac74a7` (feat)

## Files Created/Modified

- `entrypoints/popup/components/PopupChrome.tsx` - Title bar with settings gear icon, rendered across all popup states
- `entrypoints/popup/components/CapturePreview.tsx` - Phase 2 SuccessView extracted verbatim with props-based bindings instead of direct signal access
- `entrypoints/popup/components/SendForm.tsx` - Primary Phase 3 view composing send_to/prompt comboboxes, soft-overwrite hint, Confirm button, CapturePreview; all debounce timers and RPC calls
- `entrypoints/popup/App.tsx` - Refactored from 4-state to 6-state machine; 5 new module-level signals; parallel-read mount; removed SuccessView + local FieldLabel/textareaClass

## Decisions Made

- **CapturePreview as standalone component**: The plan specified extracting Phase 2 SuccessView into a CapturePreview child component rather than inlining the 80 lines of capture-preview JSX inside SendForm. This preserves Phase 2 e2e selectors at the same DOM nesting depth and keeps the field markup in one place.
- **SendForm receives signals via props**: Following the plan's constraint that SendForm is a pure functional view receiving all state via props. This makes it testable and extractable. App.tsx owns the module-level signals.
- **promptDirty signal bridge**: The promptDirty signal bridges between SendForm and App.tsx to implement D-27 soft-overwrite semantics: when user selects a send_to history item, the prompt auto-fills only if promptDirty is false.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing Vitest `jsdom` package resolution warnings (3 unhandled errors in test output) -- not caused by our changes, all 109 tests pass. These are out of scope per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 08 (e2e) can test the 6-state machine: popup with active dispatch renders InProgressView, popup with error dispatch renders ErrorBanner above SendForm, popup with no dispatch renders SendForm with capture preview
- Phase 4 OpenClaw adapter: PlatformIcon openclaw variant already handled in SendForm's `variantFromUrl`; appending entry to adapter registry makes Confirm enable for OpenClaw URLs
- Phase 5 Discord adapter: same pattern as Phase 4

## Build Artifact Verification

- `pnpm build` produces popup bundle at `.output/chrome-mv3/chunks/popup-Bwz3oKMP.js` containing `capture-success` data-testid
- Popup bundle size: 36.38 KB (includes Preact + Combobox + SendForm + CapturePreview + InProgressView + ErrorBanner + PlatformIcon + all popup views)

## Self-Check: PASSED

All 4 key files verified present. Both task commits verified in git log (1f23fd8, bac74a7). Full suite: typecheck clean, lint clean (0 errors, 4 pre-existing warnings), 109 tests pass, build succeeds.

---
*Phase: 03-dispatch-popup*
*Completed: 2026-05-01*
