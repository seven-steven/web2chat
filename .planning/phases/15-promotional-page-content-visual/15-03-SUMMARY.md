---
phase: 15-promotional-page-content-visual
plan: 03
subsystem: ui
tags: [marketing-page, preact, vitest, i18n, static-site]

requires:
  - phase: 15-01
    provides: Marketing copy getters and locale-backed truth data
  - phase: 15-02
    provides: Shared section shell, CTA, proof mockups, and stepper components
provides:
  - Final eight-section marketing page composition in apps/marketing/src/app.tsx
  - DOM regression coverage for section order, heading outline, CTA placement, and platform truth boundaries
affects: [15-04, 16]

tech-stack:
  added: []
  patterns: [getter-driven section composition, single-h1 sectioned marketing page, locale-backed public copy]

key-files:
  created:
    - tests/unit/marketing/app-sections.spec.tsx
  modified:
    - apps/marketing/src/app.tsx
    - apps/marketing/src/components/section-shell.tsx
    - apps/marketing/src/data/site-content.ts
    - apps/marketing/src/i18n/locales/en.json
    - apps/marketing/src/i18n/locales/zh_CN.json

key-decisions:
  - "Promotional page assembly stays in App({ locale }) and pulls all public copy from site-content getters instead of embedding prose in JSX"
  - "Hero carries the only wide layout and merges CTA, shipped-platform chips, and compact payload proof while known risks stay out of the platform cards"
  - "SectionShell accepts explicit undefined-safe title/intro props so exactOptionalPropertyTypes does not block the final section composition"

patterns-established:
  - "Eight-section marketing narrative: hero, use cases, payload, platforms, flow, trust, limits, CTA"
  - "Trust and limits are separate bands: production claims stay in trust, open risks stay in known limits"

requirements-completed: [MSG-01, MSG-02, MSG-03, PROOF-01, PROOF-02, PROOF-03, CTA-01, CTA-02, TRUST-01, TRUST-02]

duration: 9min
completed: 2026-06-02
---

# Phase 15 Plan 3: Promotional page composition summary

**Final eight-section marketing landing page with getter-backed bilingual copy, compact proof surfaces, and DOM regression tests for structure and platform truth placement**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-02T13:03:00Z
- **Completed:** 2026-06-02T13:12:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Replaced the placeholder marketing skeleton with the locked eight-section narrative in `apps/marketing/src/app.tsx`
- Added `tests/unit/marketing/app-sections.spec.tsx` to lock heading structure, CTA placement, locale toggle reachability, and shipped-platform scope
- Extended the site-content and locale layers with section heading/intro getters so the page composition stays source-backed and bilingual
- Verified the final page with both focused DOM regression tests and `pnpm site:build`

## Task Commits

Each task was committed atomically:

1. **Task 1: 先写 app-sections RED 测试再重写 app.tsx 组装 8 个 section** - `046ef4c` (test), `2b3a4a1` (feat)
2. **Task 2: 补跑 site build 锁住最终页面可构建性** - no code changes required after verification

## Files Created/Modified
- `tests/unit/marketing/app-sections.spec.tsx` - DOM regression test covering section order, heading outline, CTA placement, locale toggle, and limits placement
- `apps/marketing/src/app.tsx` - Final promotional page composition using shared proof, CTA, and section primitives
- `apps/marketing/src/data/site-content.ts` - Section heading/intro getters for use cases, platforms, flow, trust, and known limits
- `apps/marketing/src/components/section-shell.tsx` - Undefined-safe optional props for exactOptionalPropertyTypes compatibility
- `apps/marketing/src/i18n/locales/en.json` - English section heading and intro copy additions
- `apps/marketing/src/i18n/locales/zh_CN.json` - Simplified Chinese section heading and intro copy additions

## Decisions Made
- Kept all public-facing page copy in locale JSON plus `site-content.ts` getters; `app.tsx` only performs structural composition
- Left Telegram risk messaging in the platform card label and known-limits section while excluding Feishu/Lark from supported platform cards entirely
- Used the hero band for the compact payload preview plus target mockup, keeping all subsequent sections on the narrower default width

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes mismatch on section intro props**
- **Found during:** Task 1 commit attempt
- **Issue:** `SectionShell` optional `intro` prop rejected `string | undefined` values from getter-backed section headings under strict TS settings
- **Fix:** Updated `SectionShellProps` to accept explicit `undefined` for `title` and `intro`
- **Files modified:** `apps/marketing/src/components/section-shell.tsx`
- **Verification:** `pnpm typecheck`
- **Committed in:** `2b3a4a1`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required for strict type compatibility only. No scope creep.

## Issues Encountered
- The requested RED commit initially exposed that the implementation files had already been modified in the working tree. I preserved the finished implementation separately, restored the placeholder baseline, committed the failing test, then restored and committed the green implementation so the TDD sequence remained intact.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The promotional page now renders the full user-facing structure expected by Phase 15
- DOM regression and build verification are both in place for Phase 15-04 visual/polish follow-up or Phase 16 validation
- No `STATE.md` or `ROADMAP.md` changes were made, per sequential executor instructions

## Self-Check: PASSED

- Verified `tests/unit/marketing/app-sections.spec.tsx` and `apps/marketing/src/app.tsx` exist on disk
- Verified commits `046ef4c` and `2b3a4a1` exist in git log
- Verified `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` passes
- Verified `pnpm site:build` passes
