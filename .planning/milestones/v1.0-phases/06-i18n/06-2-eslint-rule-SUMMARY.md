---
phase: 06-i18n
plan: "06-2"
subsystem: testing
tags: [eslint, custom-rule, jsx, cjk, i18n, vitest, flat-config]

# Dependency graph
requires:
  - phase: 06-1
    provides: i18n t() function used by all tsx files (no hardcoded strings in codebase)
provides:
  - Inline ESLint plugin `local/no-hardcoded-strings` detecting CJK + capitalized English in JSX
  - Vitest test suite with RuleTester + fixture file for rule validation
affects: [06-4-language-section, future-tsxt-files]

# Tech tracking
tech-stack:
  added: []
  patterns: [inline-eslint-plugin-flat-config, eslint-rule-ruletester-vitest]

key-files:
  created:
    - tests/lint/no-hardcoded-strings.fixture.tsx
    - tests/lint/no-hardcoded-strings.test.ts
  modified:
    - eslint.config.js
    - vitest.config.ts

key-decisions:
  - "Removed IGNORE_RE with \\W pattern: \\W matches CJK in JS regex, causing false negatives"
  - "Used typescript-eslint re-exported parser instead of @typescript-eslint/parser (not installed separately)"
  - "Added files: ['**/*.tsx'] to Linter.verify config to match flat-config resolution"

patterns-established:
  - "Inline ESLint plugin in flat-config: plugins.local.rules structure"
  - "ESLint rule testing: RuleTester + Linter.verify with Vitest integration"

requirements-completed: [I18N-03]

# Metrics
duration: 7min
completed: 2026-05-07
---

# Phase 6 Plan 06-2: ESLint 硬编码字符串规则升级 Summary

**Inline ESLint plugin detecting CJK + capitalized English hardcoded strings in JSX, with RuleTester + fixture Vitest validation**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-06T23:06:37Z
- **Completed:** 2026-05-06T23:13:51Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Replaced lightweight `no-restricted-syntax` JSXText selector with full inline `local/no-hardcoded-strings` ESLint plugin
- Plugin detects CJK (U+4E00-U+9FFF + U+3400-U+4DBF) and capitalized English (>= 2 chars) in JSXText and JSXExpressionContainer
- JSX attribute values, whitespace-only, lowercase words, and `t()` calls correctly pass
- Fixture test file with 4 intentional violations + Vitest test confirming exactly 4 errors
- Zero new lint errors on existing codebase (all tsx files already use `t()`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace no-restricted-syntax with inline plugin** - `c1d73fe` (feat)
2. **Task 2: Create fixture test file** - `1a92b5b` (test)
3. **Task 3: Create Vitest test** - `eed30d5` (test)

## Files Created/Modified
- `eslint.config.js` - Inline `local/no-hardcoded-strings` plugin with CJK + English detection, added fixture ignore
- `tests/lint/no-hardcoded-strings.fixture.tsx` - 4 intentional violations + valid cases
- `tests/lint/no-hardcoded-strings.test.ts` - RuleTester (8 cases) + fixture integration test (1 case)
- `vitest.config.ts` - Added `tests/lint/**/*.test.ts` to include pattern

## Decisions Made
- Removed `IGNORE_RE = /^[\s\d\W]*$/` in favor of simple `!str.trim()` check: `\W` in JS regex matches CJK characters (they are not `[a-zA-Z0-9_]`), causing all CJK strings to be classified as "ignorable"
- Used `import { parser } from 'typescript-eslint'` instead of `require('@typescript-eslint/parser')`: the latter is not installed as a separate package; typescript-eslint re-exports it
- Added `files: ['**/*.tsx']` to `Linter.verify` config object: ESLint flat-config `Linter` requires `files` glob to match the filename argument

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] IGNORE_RE regex matches CJK as non-word characters**
- **Found during:** Task 3 (Vitest test creation)
- **Issue:** Plan's `IGNORE_RE = /^[\s\d\W]*$/` uses `\W` which matches CJK characters in JavaScript (CJK is not in `[a-zA-Z0-9_]`), causing `isUserVisible('发送')` to return `false`
- **Fix:** Removed `IGNORE_RE` entirely; replaced with simple `!str.trim()` empty check, letting `CJK_RE` and `EN_RE` handle all detection
- **Files modified:** eslint.config.js, tests/lint/no-hardcoded-strings.test.ts
- **Verification:** All 9 tests pass (4 valid, 4 invalid, 1 fixture), `pnpm lint` still 0 errors
- **Committed in:** eed30d5 (Task 3 commit)

**2. [Rule 3 - Blocking] Fixture file needed eslint ignore + vitest config update**
- **Found during:** Task 2 (fixture creation) and Task 3 (test creation)
- **Issue:** Pre-commit hook runs eslint on fixture, which intentionally violates the rule. Vitest config `include` pattern only covered `tests/unit/**/*.spec.{ts,tsx}`
- **Fix:** Added `tests/lint/*.fixture.tsx` to eslint ignores; added `tests/lint/**/*.test.ts` to vitest include pattern
- **Files modified:** eslint.config.js, vitest.config.ts
- **Verification:** Pre-commit hooks pass, `npx vitest run tests/lint/` runs correctly
- **Committed in:** 1a92b5b (Task 2), eed30d5 (Task 3)

**3. [Rule 3 - Blocking] Used typescript-eslint parser re-export instead of @typescript-eslint/parser**
- **Found during:** Task 3 (test creation)
- **Issue:** Plan called for `require('@typescript-eslint/parser')` but package not installed; typescript-eslint re-exports it
- **Fix:** Used `import { parser } from 'typescript-eslint'`
- **Files modified:** tests/lint/no-hardcoded-strings.test.ts
- **Verification:** All tests pass
- **Committed in:** eed30d5 (Task 3)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for correctness and test execution. No scope creep.

## Issues Encounted
- ESLint `Linter.verify` with flat config requires `files` glob in config object to match the `filename` argument; without it, config doesn't apply and zero messages are returned
- `eslint-disable-next-line @typescript-eslint/no-unused-vars` in fixture caused a phantom error in `Linter.verify` (rule not found) that inflated error count; removed since fixture is eslint-ignored anyway

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ESLint rule is active and will block any new hardcoded strings in tsx files
- LanguageSection (06-4) may need `eslint-disable-next-line` for language name options (`"English"`, `"简体中文"`)
- Coverage audit (06-5) can rely on this rule as a safety net

---
*Phase: 06-i18n*
*Completed: 2026-05-07*

## Self-Check: PASSED

- All created files verified: tests/lint/no-hardcoded-strings.fixture.tsx, tests/lint/no-hardcoded-strings.test.ts
- All commits verified: c1d73fe, 1a92b5b, eed30d5
- pnpm lint: 0 errors, 25 warnings (baseline unchanged)
- pnpm test: 33 files, 225 tests passing
