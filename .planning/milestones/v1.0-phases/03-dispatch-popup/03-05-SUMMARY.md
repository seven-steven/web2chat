---
phase: 03-dispatch-popup
plan: 05
subsystem: [ui-components, i18n, accessibility]
tags: [preact, aria-combobox, inline-svg, tailwind-v4, i18n, error-banner, platform-icon]

# Dependency graph
requires:
  - phase: 03-dispatch-popup/03-01
    provides: ErrorCode union (9 codes), i18n keys for dispatch/error/history/binding/platform_icon namespaces
provides:
  - FieldLabel component + textareaClass + inputClass constants in primitives.tsx (shared across popup + options)
  - PlatformIcon component with 4 inline-SVG variants (mock/openclaw/discord/unsupported)
  - Combobox component implementing ARIA 1.2 editable combobox with list autocomplete (D-30)
  - InProgressView component for dispatch in-progress placeholder with cancel + copy-dispatchId
  - ErrorBanner component mapping 9 ErrorCodes to i18n heading/body/retry with slim red-600 left-border treatment
affects: [03-06-popup-integration, 03-07-options-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [aria-1.2-combobox-activedescendant, three-segment-inline-accent-i18n, blur-defer-for-listbox-click, svg-text-glyph-for-brand-placeholder]

key-files:
  created:
    - entrypoints/popup/components/primitives.tsx
    - entrypoints/popup/components/PlatformIcon.tsx
    - entrypoints/popup/components/Combobox.tsx
    - entrypoints/popup/components/InProgressView.tsx
    - entrypoints/popup/components/ErrorBanner.tsx
  modified: []

key-decisions:
  - "SVG text letterform placeholders (Oc/D) stored as module-level string constants to satisfy no-bare-JSX-string lint rule"
  - "150ms blur defer in Combobox to allow listbox option onMouseDown to fire before listbox closes"
  - "Combobox uses local useState (not module-level signal) because component is reused 2x in SendForm for send_to + prompt"

patterns-established:
  - "Component extraction pattern: shared primitives (FieldLabel, textareaClass, inputClass) in popup/components/primitives.tsx for cross-entrypoint reuse"
  - "PlatformIcon inline-SVG pattern: variant prop selects SVG body, currentColor for dark mode, no text-sky (reserved for CTA)"
  - "ErrorBanner ErrorCode-to-i18n switch pattern: exhaustive switch per function (heading/body/retry), retriable codes in ReadonlySet"

requirements-completed: [DSP-01, DSP-02, DSP-03, DSP-07, DSP-08]

# Metrics
duration: 6min
completed: 2026-05-01
---

# Phase 3 Plan 05: Popup Components Summary

**Extracted shared primitives + built 4 standalone popup components: ARIA 1.2 Combobox, PlatformIcon (4 variants), InProgressView (spinner + cancel + copy-dispatchId), ErrorBanner (9 ErrorCodes with slim red-600 left-border + retry/dismiss)**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-01T11:35:54Z
- **Completed:** 2026-05-01T11:43:16Z
- **Tasks:** 3
- **Files modified:** 5 (all created)

## Accomplishments

- Extracted FieldLabel + textareaClass from App.tsx into shared primitives.tsx, added sibling inputClass for Combobox reuse
- PlatformIcon renders 4 inline-SVG variants (mock=flask-conical, openclaw=Oc placeholder, discord=D placeholder, unsupported=globe) with currentColor dark-mode support and no text-sky (reserved per UI-SPEC)
- Combobox implements full ARIA 1.2 editable combobox with list autocomplete: role=combobox/listbox/option, aria-expanded, aria-controls, aria-activedescendant, aria-selected; keyboard contract (ArrowUp/Down cycle, Enter select, Escape close, Tab native); 150ms blur defer for option click; local useState for 2x reuse
- InProgressView renders centered status card with 24x24 sky-600 animate-spin spinner, three-segment inline accent body, outline destructive Cancel button, and click-to-copy dispatchId footer
- ErrorBanner renders slim red-600 left-border banner with exhaustive switch on all 9 ErrorCodes for heading/body/retry i18n keys; PLATFORM_UNSUPPORTED has no retry; error.message never rendered (T-03-05-01)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract primitives + create PlatformIcon** - `3ab5900` (feat)
2. **Task 2: Combobox component (ARIA 1.2 editable + list autocomplete)** - `28be8d2` (feat)
3. **Task 3: InProgressView + ErrorBanner** - `f947b6c` (feat)

## Files Created/Modified

- `entrypoints/popup/components/primitives.tsx` - FieldLabel + textareaClass + inputClass constants extracted from App.tsx for cross-entrypoint reuse
- `entrypoints/popup/components/PlatformIcon.tsx` - 4-variant inline-SVG platform icon (mock/openclaw/discord/unsupported) with currentColor dark mode
- `entrypoints/popup/components/Combobox.tsx` - ARIA 1.2 editable combobox with list autocomplete, keyboard navigation, 150ms blur defer, local useState
- `entrypoints/popup/components/InProgressView.tsx` - Dispatch in-progress placeholder with sky-600 spinner, Cancel button, click-to-copy dispatchId
- `entrypoints/popup/components/ErrorBanner.tsx` - Slim red-600 left-border error banner with 9 ErrorCode switch for heading/body/retry i18n

## Decisions Made

- SVG text letterform placeholders for openclaw ("Oc") and discord ("D") stored as module-level string constants (`OPENCLAW_GLYPH` / `DISCORD_GLYPH`) to satisfy the no-bare-JSX-string lint rule while keeping the SVG `<text>` content in JSX via expression `{OPENCLAW_GLYPH}`
- 150ms blur defer in Combobox chosen as the minimum that reliably allows `onMouseDown` on listbox options to fire before the listbox closes from input blur; lower values race on slow machines, higher values keep listbox open after Tab unnecessarily
- Combobox uses `useState` (not module-level `signal`) because the component is instantiated twice in SendForm (send_to + prompt fields) and module-level state would conflate the two instances' activeIdx/listOpen

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SVG text letterforms triggered no-bare-JSX-string lint**
- **Found during:** Task 1 (PlatformIcon creation)
- **Issue:** Inline SVG `<text>Oc</text>` and `<text>D</text>` were detected as bare JSX text literals by the project's no-restricted-syntax ESLint rule
- **Fix:** Extracted letterform strings to module-level constants (`OPENCLAW_GLYPH = 'Oc'`, `DISCORD_GLYPH = 'D'`) and used JSX expression `{OPENCLAW_GLYPH}` inside the SVG text element
- **Files modified:** entrypoints/popup/components/PlatformIcon.tsx
- **Verification:** pnpm lint passes with 0 errors
- **Committed in:** 3ab5900 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 lint compatibility)
**Impact on plan:** Minimal — letterform content is identical, just stored as a variable instead of inline literal. Visual output unchanged.

## Issues Encountered

- Pre-existing Vitest `jsdom` package resolution warnings (3 unhandled errors in test output) — not caused by our changes, all 109 tests pass. These are out of scope per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06 (popup integration) can `import { Combobox, ComboboxOption } from './components/Combobox'` for send_to + prompt fields
- Plan 06 can `import { InProgressView } from './components/InProgressView'` for the dispatch-in-progress state
- Plan 06 can `import { ErrorBanner } from './components/ErrorBanner'` for error display above SendForm
- Plan 07 (options page) can `import { FieldLabel, textareaClass } from '@/entrypoints/popup/components/primitives'` for shared chrome
- Phase 4 swap: replacing PlatformIcon openclaw letterform with real SVG = 1-file change in PlatformIcon.tsx
- Phase 5 swap: replacing PlatformIcon discord letterform with real SVG = 1-file change in PlatformIcon.tsx

## Self-Check: PASSED

All 5 key files verified present. All 3 task commits verified in git log (3ab5900, 28be8d2, f947b6c). Full suite: typecheck clean, lint clean (0 errors), 109 tests pass.

---
*Phase: 03-dispatch-popup*
*Completed: 2026-05-01*
