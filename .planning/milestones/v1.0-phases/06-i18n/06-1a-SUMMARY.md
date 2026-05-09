---
phase: 06-i18n
plan: 06-1a
subsystem: i18n, infra
tags: [preact-signals, vite-plugin, yaml, i18n, tdd]

# Dependency graph
requires:
  - phase: 01-skeleton
    provides: "shared/i18n/index.ts re-export facade, @wxt-dev/i18n setup, locale YAML files"
  - phase: 02-storage
    provides: "WxtStorage.defineItem pattern, shared/storage/items.ts"
provides:
  - "Signal-based t() with runtime locale switching (no extension reload)"
  - "Vite YAML locale plugin for build-time dict conversion"
  - "localeItem storage for user locale preference persistence"
  - "4 passing unit tests for i18n switching behavior"
affects: [06-1b, 06-2, 06-4, popup, options]

# Tech tracking
tech-stack:
  added: [yaml@2.8.4]
  patterns: [signal-based-locale-store, vite-yaml-transform-plugin]

key-files:
  created:
    - vite-plugins/yaml-locale.ts
    - shared/i18n/yaml.d.ts
    - tests/unit/i18n/locale-switch.spec.ts
  modified:
    - shared/i18n/index.ts
    - shared/storage/items.ts
    - wxt.config.ts
    - vitest.config.ts
    - package.json

key-decisions:
  - "yamlLocalePlugin as separate file (vite-plugins/) rather than inline in wxt.config.ts — reusable by vitest.config.ts and future tooling"
  - "yaml.d.ts declares *.yml as Record<string, string> (post-transform shape), not the raw YAML structure — matches plugin output"
  - "t() accepts string key (not typed LocaleKey) for forward-compat with future locale additions"
  - "localeItem fallback null (no version/migrations needed) — null means follow browser"

patterns-established:
  - "Signal-based locale: localeSig (null | 'en' | 'zh_CN') + computed localeDictSig + t() reads signal.value"
  - "Build-time YAML-to-JS: yamlLocalePlugin transforms WXT {key:{message,placeholders}} to flat {key:string}"
  - "Placeholder rewrite: $NAME$ with $N content → positional {0}, {1} in t() via regex replace"

requirements-completed: [I18N-02]

# Metrics
duration: 6m
completed: 2026-05-07
---

# Phase 6 Plan 06-1a: i18n Infra Summary

**Signal-based t() with @preact/signals locale store and Vite build-time YAML-to-JS dict conversion, replacing chrome.i18n runtime dependency for instant locale switching**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-06T22:27:47Z
- **Completed:** 2026-05-06T22:34:13Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- Signal-based `t()` in `shared/i18n/index.ts` that reads from `@preact/signals` computed dict — Preact components auto-track and re-render on locale change without extension reload
- `yamlLocalePlugin` Vite plugin that transforms WXT YAML locale format (`{key:{message,placeholders}}`) into flat `{key:string}` dicts at build time with positional placeholder rewrite
- `localeItem` typed storage for persisting user locale preference in `chrome.storage.local`
- TDD cycle complete: 4 tests RED in Task 3, GREEN in Task 4 — 216 total tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: yaml plugin + wxt config** - `ae044b0` (feat)
2. **Task 2: localeItem storage** - `d407943` (feat)
3. **Task 3: TDD RED test stub** - `475e982` (test)
4. **Task 4: TDD GREEN signal-based t()** - `5cf0c3b` (feat)

## Files Created/Modified
- `vite-plugins/yaml-locale.ts` - Vite plugin: YAML locale to flat JS dict with placeholder transform
- `shared/i18n/yaml.d.ts` - TypeScript `*.yml` module declaration (post-transform shape: `Record<string, string>`)
- `shared/i18n/index.ts` - Rewritten: signal-based locale store (`localeSig`, `localeDictSig`), `setLocale()`, `t()`
- `shared/storage/items.ts` - Added `LocaleChoice` type and `localeItem` storage definition
- `wxt.config.ts` - Registered `yamlLocalePlugin()` in vite plugins array
- `vitest.config.ts` - Registered `yamlLocalePlugin()` for test YAML import support
- `package.json` - Added `yaml@2.8.4` devDependency
- `tests/unit/i18n/locale-switch.spec.ts` - 4 TDD tests for t() + setLocale() behavior

## Decisions Made
- `yamlLocalePlugin` as separate file rather than inline in `wxt.config.ts` — allows reuse in `vitest.config.ts`
- `yaml.d.ts` declares `*.yml` as `Record<string, string>` matching the plugin output, not the raw YAML structure
- `t()` accepts `string` key (not typed `LocaleKey`) for forward-compatibility with future locale additions without re-typing
- `localeItem` has no `version`/`migrations` — `null` fallback is sufficient, schema cannot evolve in a breaking way
- Tests use dynamic `import()` with `as any` to avoid compile-time type errors against the pre-rewrite module while still testing the target API at runtime (TDD-friendly with strict tsc)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Avoided vite type import in yaml-locale plugin**
- **Found during:** Task 1 (vite-plugins/yaml-locale.ts creation)
- **Issue:** `import { type Plugin } from 'vite'` fails tsc because WXT doesn't expose vite types at project level
- **Fix:** Removed vite Plugin type import; used plain object return with typed parameters instead
- **Files modified:** vite-plugins/yaml-locale.ts
- **Verification:** `pnpm typecheck` clean
- **Committed in:** ae044b0 (Task 1 commit)

**2. [Rule 3 - Blocking] TDD test file must pass tsc for pre-commit hook**
- **Found during:** Task 3 (locale-switch.spec.ts)
- **Issue:** Pre-commit hook runs `tsc --noEmit`; tests importing non-existent exports (`setLocale`, `localeSig`) cause TS2339
- **Fix:** Tests use `await import() as any` with dynamic import to avoid compile-time type checking while still testing runtime behavior
- **Files modified:** tests/unit/i18n/locale-switch.spec.ts
- **Verification:** `pnpm typecheck` clean, tests fail at runtime (RED as intended)
- **Committed in:** 475e982 (Task 3 commit)

**3. [Rule 3 - Blocking] yamlLocalePlugin not registered in vitest.config.ts**
- **Found during:** Task 4 (running locale-switch tests)
- **Issue:** YAML imports in tests fail with Rollup parse error because vitest doesn't use wxt.config.ts plugins
- **Fix:** Added `yamlLocalePlugin()` to `vitest.config.ts` plugins array
- **Files modified:** vitest.config.ts
- **Verification:** 216/216 tests pass including 4 new i18n tests
- **Committed in:** 5cf0c3b (Task 4 commit)

**4. [Rule 1 - Bug] yaml.d.ts declared raw YAML structure instead of plugin output**
- **Found during:** Task 4 (tsc failure after rewriting index.ts)
- **Issue:** yaml.d.ts declared `Record<string, { message: string; placeholders?: ... }>` but yamlLocalePlugin outputs `Record<string, string>` — type mismatch caused TS2352 on cast
- **Fix:** Changed yaml.d.ts to declare `Record<string, string>` matching the plugin's build-time output
- **Files modified:** shared/i18n/yaml.d.ts
- **Verification:** `pnpm typecheck` clean
- **Committed in:** 5cf0c3b (Task 4 commit)

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 bug)
**Impact on plan:** All auto-fixes necessary for type safety, test infrastructure, and build correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Signal-based i18n infrastructure complete; `t()`, `setLocale()`, `localeSig`, `localeDictSig` exported from `shared/i18n/index.ts`
- Plan 06-1b can now wire the language selector UI in the options page using these exports
- Plan 06-2 (ESLint rule) can proceed independently
- All 216 unit tests green, typecheck clean, build clean

---
*Phase: 06-i18n*
*Completed: 2026-05-07*

## Self-Check: PASSED

All 5 created/modified files verified present. All 4 task commits verified in git log.
