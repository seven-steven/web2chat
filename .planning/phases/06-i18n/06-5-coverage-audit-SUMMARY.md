---
phase: 06-i18n
plan: "06-5"
subsystem: i18n
tags: [i18n, coverage, audit, yaml, static-analysis]

# Dependency graph
requires:
  - phase: 06-4
    provides: en.yml and zh_CN.yml locale files with full key coverage
provides:
  - scripts/i18n-coverage.ts static audit script
  - test:i18n-coverage npm script
  - 100% bidirectional key coverage (94 source keys, 99 locale keys including 5 manifest-only)
affects: [06-i18n, CI]

# Tech tracking
tech-stack:
  added: [yaml (parse), tsx runtime]
  patterns: [line-level comment filtering, MANIFEST_ONLY_KEYS allowlist]

key-files:
  created:
    - scripts/i18n-coverage.ts
  modified:
    - package.json
    - locales/en.yml
    - locales/zh_CN.yml

key-decisions:
  - "Regex uses [a-zA-Z0-9_] to match mixed-case keys like error_code_NOT_LOGGED_IN_heading"
  - "Line-level isInComment() filter instead of full-file comment stripping (avoids false regex matches on string literals containing /*)"
  - "Removed 3 orphaned locale keys: dispatch_confirm_disabled_tooltip, dispatch_cancelled_toast, history_view_all"

patterns-established:
  - "MANIFEST_ONLY_KEYS allowlist for __MSG_*__ keys used in wxt.config.ts and HTML but not via t()"

requirements-completed: [I18N-01]

# Metrics
duration: 6min
completed: 2026-05-07
---

# Phase 6 Plan 06-5: i18n Coverage Audit Summary

**Static analysis script asserting 100% bidirectional coverage between t() source calls and locale YAML keys, with MANIFEST_ONLY_KEYS allowlist for manifest-use orphans**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-06T23:21:12Z
- **Completed:** 2026-05-07T07:26:59Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created i18n-coverage.ts with 6 gap checks (missing in en, missing in zh_CN, unused in en, unused in zh_CN, asymmetric en-vs-zh_CN)
- Added test:i18n-coverage npm script; exits 0 with 100% coverage
- Removed 3 orphaned locale keys (dispatch_confirm_disabled_tooltip, dispatch_cancelled_toast, history_view_all) from both en.yml and zh_CN.yml

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scripts/i18n-coverage.ts** - `519d2b6` (feat)
2. **Task 2: Add test:i18n-coverage to package.json** - `8edf394` (chore)
3. **Task 3: Run audit, remove orphaned locale keys** - `98729f7` (fix)

## Files Created/Modified
- `scripts/i18n-coverage.ts` - Static analysis script comparing t() calls vs YAML locale keys
- `package.json` - Added "test:i18n-coverage": "tsx scripts/i18n-coverage.ts"
- `locales/en.yml` - Removed 3 orphaned keys (99 keys remaining)
- `locales/zh_CN.yml` - Removed 3 orphaned keys (99 keys remaining)

## Decisions Made

- **Mixed-case regex:** Plan's regex used `[a-z0-9_]` which could not match keys like `error_code_NOT_LOGGED_IN_heading`. Changed to `[a-zA-Z0-9_]` to support mixed-case keys used in ErrorBanner.tsx.
- **Comment filtering approach:** Initial attempt used full-file regex comment stripping (`/* ... */` removal), but this incorrectly matched `/*']` string literals in source code, swallowing 9400+ chars including valid t() calls. Switched to line-level `isInComment()` check that skips lines starting with `//`, `*`, or `/*`.
- **Orphaned key removal:** `dispatch_confirm_disabled_tooltip`, `dispatch_cancelled_toast`, and `history_view_all` had zero source references and no manifest use -- removed from both locale files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Regex character class missed mixed-case keys**
- **Found during:** Task 3 (running audit)
- **Issue:** Plan specified `[a-z][a-z0-9_]*` regex but keys like `error_code_NOT_LOGGED_IN_heading` contain uppercase letters, causing 38 false "unused" reports
- **Fix:** Changed to `[a-zA-Z][a-zA-Z0-9_]*`
- **Files modified:** scripts/i18n-coverage.ts
- **Verification:** Audit output dropped from 43 unused keys to 3 genuine orphans
- **Committed in:** 519d2b6 (part of Task 1 commit)

**2. [Rule 1 - Bug] Comment stripping swallowed valid t() calls**
- **Found during:** Task 3 (investigating why capture_loading_label was reported as unused)
- **Issue:** Full-file `/* ... */` regex matched `/*']` string literal as comment start, consuming 9400+ chars of valid code including capture_loading_label references
- **Fix:** Replaced full-file comment stripping with line-level `isInComment()` function
- **Files modified:** scripts/i18n-coverage.ts
- **Verification:** capture_loading_label correctly detected as used; no false doc-comment matches
- **Committed in:** 519d2b6 (part of Task 1 commit)

**3. [Rule 1 - Bug] TypeScript m[2] type error in strict mode**
- **Found during:** Task 1 (typecheck failure)
- **Issue:** `RegExpExecArray[2]` returns `string | undefined` in strict TypeScript, not assignable to `Set.add(string)`
- **Fix:** Added `as string` cast (safe because regex always captures group 2 when group 1 matches)
- **Files modified:** scripts/i18n-coverage.ts
- **Verification:** `pnpm typecheck` passes clean
- **Committed in:** 519d2b6 (part of Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 bugs in plan-provided regex/approach)
**Impact on plan:** All fixes necessary for script correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- i18n coverage audit passes at 100% (94 source keys + 5 manifest-only = 99 locale keys)
- Script can be integrated into CI pipeline via `pnpm test:i18n-coverage`
- All Phase 6 i18n plans complete

## Self-Check: PASSED

All 5 files exist. All 3 commit hashes verified in git log.

---
*Phase: 06-i18n*
*Completed: 2026-05-07*
