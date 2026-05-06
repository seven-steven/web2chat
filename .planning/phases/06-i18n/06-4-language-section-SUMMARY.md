---
phase: 06-i18n
plan: "06-4"
subsystem: ui
tags: [preact, signals, i18n, chrome-storage, options-page]

# Dependency graph
requires:
  - phase: 06-1a
    provides: signal-based t() function, setLocale(), localeItem storage
provides:
  - LanguageSection component for runtime locale switching on Options page
  - 4 new i18n keys (options_language_heading/explainer/label/auto)
  - Cleanup of deprecated popup_hello and options_reserved_* keys
affects: [06-5, options-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [allowlist-validated onChange for storage writes, native select for locale switching]

key-files:
  created:
    - entrypoints/options/components/LanguageSection.tsx
  modified:
    - entrypoints/options/App.tsx
    - locales/en.yml
    - locales/zh_CN.yml

key-decisions:
  - "LanguageSection uses native select element (v1 has only 2 locales, native select is simplest per D-80)"
  - "Removed unused localeSig import and added void prefix to floating promise in useEffect"

patterns-established:
  - "Allowlist-validated select onChange: validate value against LOCALE_ALLOWLIST before storage write"
  - "Language identifier strings (English/简体中文) use eslint-disable-next-line comments"

requirements-completed: [I18N-02]

# Metrics
duration: 3min
completed: 2026-05-07
---

# Phase 6 Plan 06-4: LanguageSection UI + locale file update Summary

**LanguageSection component with runtime locale switching via native select, replacing ReservedSection placeholder and cleaning up deprecated locale keys**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-06T23:15:50Z
- **Completed:** 2026-05-06T23:19:12Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- LanguageSection component renders 3-option select (Auto/English/简体中文) with allowlist validation
- 4 new i18n keys added to both en.yml and zh_CN.yml (options_language_heading/explainer/label/auto)
- Deprecated keys removed: popup_hello, options_reserved_language_label, options_reserved_placeholder_body
- ReservedSection placeholder removed from App.tsx; LanguageSection placed as first section card

## Task Commits

Each task was committed atomically:

1. **Task 1: Update locale files** - `149a7fe` (feat)
2. **Task 2: Create LanguageSection component** - `137a9a9` (feat)
3. **Task 3: Replace ReservedSection in App.tsx** - `005a1a2` (feat)

## Files Created/Modified

- `entrypoints/options/components/LanguageSection.tsx` - New LanguageSection component with select-based locale switching
- `entrypoints/options/App.tsx` - Replaced ReservedSection with LanguageSection, removed ~39 lines of placeholder code
- `locales/en.yml` - Added 4 Group K keys, removed 3 deprecated keys
- `locales/zh_CN.yml` - Added 4 Group K keys, removed 3 deprecated keys

## Decisions Made

- Used native `<select>` element per UI-SPEC D-80 (v1 has only 2 locales, no dropdown library needed)
- Language identifier strings ("English", "简体中文") are exempt from i18n -- they stay in native script regardless of current locale

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused localeSig import and fixed floating promise**
- **Found during:** Task 2 (LanguageSection creation)
- **Issue:** `localeSig` imported but never used; `localeItem.getValue()` promise not handled (no-floating-promises rule)
- **Fix:** Removed `localeSig` from import, added `void` prefix to promise in useEffect
- **Files modified:** entrypoints/options/components/LanguageSection.tsx
- **Verification:** `pnpm lint` passes with 0 errors
- **Committed in:** 137a9a9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal - lint compliance fix only. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Options page LanguageSection fully functional and ready for E2E locale-switch verification
- Locale keys in sync between en.yml and zh_CN.yml
- Plan 06-5 (coverage audit) can now verify 100% key coverage across both locales

---
*Phase: 06-i18n*
*Completed: 2026-05-07*

## Self-Check: PASSED

- All 4 files exist (LanguageSection.tsx, App.tsx, en.yml, zh_CN.yml)
- All 3 task commits found (149a7fe, 137a9a9, 005a1a2)
