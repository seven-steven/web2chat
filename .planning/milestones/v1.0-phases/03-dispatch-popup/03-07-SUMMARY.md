---
phase: 03-dispatch-popup
plan: 07
subsystem: [ui, settings, i18n, accessibility]
tags: [preact, wxt-options-entrypoint, confirm-dialog, focus-trap, tailwind-v4, i18n, destructive-action]

# Dependency graph
requires:
  - phase: 03-dispatch-popup/03-01
    provides: i18n keys for options_* namespace, sendMessage typed RPC, ErrorCode union
  - phase: 03-dispatch-popup/03-02
    provides: history + binding typed repos with resetAll()
  - phase: 03-dispatch-popup/03-03
    provides: verify-manifest conditional options_ui assertion (now fires actively)
  - phase: 03-dispatch-popup/03-04
    provides: historyDelete + bindingUpsert RPC handlers with resetAll support
  - phase: 03-dispatch-popup/03-05
    provides: FieldLabel + textareaClass primitives (cross-entrypoint reuse path)
provides:
  - entrypoints/options/ full WXT entrypoint (WXT auto-generates manifest.options_ui.page = 'options.html')
  - ConfirmDialog reusable modal component with focus trap + ESC close + destructive/default variant
  - ResetSection component wiring 2 RPC reset calls with 2-step confirmation + post-reset toast
  - Reserved placeholder slots for Phase 4 (Granted origins) + Phase 6 (Language switcher)
affects: [03-06-popup-integration, 04-openclaw-adapter, 06-i18n-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns: [wxt-options-entrypoint-auto-detection, confirm-dialog-focus-trap, destructive-confirmation-2-step, module-level-signals-options-page, reserved-section-placeholder]

key-files:
  created:
    - entrypoints/options/index.html
    - entrypoints/options/main.tsx
    - entrypoints/options/style.css
    - entrypoints/options/App.tsx
    - entrypoints/options/components/ResetSection.tsx
    - entrypoints/options/components/ConfirmDialog.tsx
  modified: []

key-decisions:
  - "ConfirmDialog auto-focuses confirm button (not cancel) because confirm is the visually primary action; users bail via ESC or overlay click"
  - "ResetSection dispatches history.delete(kind:'sendTo',resetAll:true) + binding.upsert(send_to:'',prompt:'',resetAll:true) in sequence; error on either stops and shows inline message"
  - "Raw error.message rendered in options dialog body (not popup) because options page is privileged settings UI where operator debugging benefits from raw text"
  - "Phase tag strings ('Phase 4', 'Phase 6') rendered inline as font-mono spans — treated as stable project metadata, not user-facing translatable text"

patterns-established:
  - "WXT options entrypoint: entrypoints/options/ directory auto-detected, generates options_ui.page not options_page (RESEARCH Pitfall 7)"
  - "Reserved section pattern: muted opacity-60 card with aria-disabled for future phase insertion slots"
  - "ConfirmDialog pattern: fixed inset-0 overlay + centered card + ESC handler + focus trap via useEffect keydown listener"
  - "Post-action toast: aria-live polite paragraph, auto-dismisses via window.setTimeout 3s"

requirements-completed: [STG-03]

# Metrics
duration: 5min
completed: 2026-05-01
---

# Phase 3 Plan 07: Options Page Summary

**Options page entrypoint with ConfirmDialog modal + ResetSection (STG-03) — history.delete + binding.upsert reset RPCs with 2-step destructive confirmation, reserved Phase 4/6 insertion slots**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-01T11:45:58Z
- **Completed:** 2026-05-01T11:52:00Z
- **Tasks:** 2
- **Files modified:** 6 (all created)

## Accomplishments

- entrypoints/options/ created as WXT-detected entrypoint; manifest.options_ui.page === 'options.html' verified by active verify-manifest assertion (Plan 03 BLOCKER 3 closure)
- ConfirmDialog reusable modal with fixed overlay, ESC close, focus trap (Tab wrap), destructive/default variant, ARIA dialog + aria-modal + labelledby + describedby
- ResetSection implements STG-03 reset flow: red-600 button -> ConfirmDialog(variant='destructive') -> 2 sequential RPCs (history.delete + binding.upsert with resetAll) -> success toast 3s or inline error in dialog body
- Reserved placeholder sections for Phase 4 (Granted origins) and Phase 6 (Language switcher) with muted opacity-60 treatment

## Task Commits

Each task was committed atomically:

1. **Task 1: Options entrypoint scaffolding** - `ed6b164` (feat)
2. **Task 2: ResetSection + ConfirmDialog components** - `dff00e9` (feat)

## Files Created/Modified

- `entrypoints/options/index.html` - Options entry HTML with __MSG_options_page_title__
- `entrypoints/options/main.tsx` - Preact bootstrap (mirrors popup/main.tsx)
- `entrypoints/options/style.css` - Tailwind import + color-scheme
- `entrypoints/options/App.tsx` - Single-column layout with ResetSection + 2 reserved Phase 4/6 sections
- `entrypoints/options/components/ConfirmDialog.tsx` - Reusable destructive-confirmation modal with focus trap + ESC
- `entrypoints/options/components/ResetSection.tsx` - Reset button + ConfirmDialog wiring + 2 RPC reset calls + toast

## Decisions Made

- ConfirmDialog auto-focuses confirm button (not cancel) per plan rationale: confirm is the visually primary action; users can bail via ESC, overlay click, or Cancel button
- Raw RPC error.message displayed in dialog body on failure — acceptable for options page (privileged settings UI) per threat model T-03-07-03, unlike popup's strict no-leak policy
- Phase tag strings ("Phase 4" / "Phase 6") kept as inline font-mono text rather than i18n keys — they are stable project metadata identifiers, not user-facing translatable strings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing Vitest jsdom package resolution warnings (3 unhandled errors in test output) — not caused by our changes, all 109 tests pass. These are out of scope per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 08 e2e (options-reset.spec.ts) can navigate to chrome-extension://<id>/options.html and test the reset flow end-to-end
- Phase 4 (ADO-07) can replace the Granted origins reserved placeholder with a real section in App.tsx
- Phase 6 (I18N-02) can replace the Language reserved placeholder with a locale switcher
- Phase 4/6 can reuse ConfirmDialog directly: `import { ConfirmDialog } from '@/entrypoints/options/components/ConfirmDialog'`
- Popup Plan 06 (PopupChrome) settings gear can call chrome.runtime.openOptionsPage() to open this page

## Self-Check: PASSED

All 6 key files verified present. Both task commits verified in git log (ed6b164, dff00e9). Full suite: typecheck clean, lint clean (0 errors), 109 tests pass, verify:manifest OK with options_ui.page === 'options.html' assertion active.

---
*Phase: 03-dispatch-popup*
*Completed: 2026-05-01*
