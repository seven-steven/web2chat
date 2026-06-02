---
phase: 14-marketing-app-skeleton-build-isolation
plan: 2
subsystem: infra
tags: [pnpm-workspace, vite, preact, tailwind-v4, i18n, static-site]

# Dependency graph
requires:
  - phase: 14-01
    provides: Design tokens in shared/styles/design-tokens.css
provides:
  - Independent marketing workspace app at apps/marketing/ with isolated build
  - Root site:dev/site:build/site:preview/site:verify proxy commands
  - App-local t() i18n wrapper with en/zh_CN locale files
  - site-content.ts locale-keyed content data for hero, supportedPlatforms, nextPhase
  - Standalone Vite + Preact + signals + Tailwind v4 build pipeline
affects: [14-03, 15, 16]

# Tech tracking
tech-stack:
  added: [vite@6, @preact/preset-vite@2]
  patterns: [pnpm-workspace monorepo, app-local t() i18n, locale-keyed content data]

key-files:
  created:
    - pnpm-workspace.yaml
    - apps/marketing/package.json
    - apps/marketing/tsconfig.json
    - apps/marketing/vite.config.ts
    - apps/marketing/index.html
    - apps/marketing/src/main.tsx
    - apps/marketing/src/app.tsx
    - apps/marketing/src/styles/index.css
    - apps/marketing/src/data/site-content.ts
    - apps/marketing/src/i18n/index.ts
    - apps/marketing/src/i18n/locales/en.json
    - apps/marketing/src/i18n/locales/zh_CN.json
    - apps/marketing/scripts/verify-build.mjs
  modified:
    - package.json
    - eslint.config.js

key-decisions:
  - "Marketing app uses independent Vite 6.x (matching repo lockfile) with Preact preset, not WXT"
  - "Lazy-loaded locale switching via dynamic import for zh_CN, en loaded eagerly"
  - "Content data exported as typed functions (getHero, getSupportedPlatforms, getNextPhase) composing t() calls"

patterns-established:
  - "App-local t() i18n pattern: static JSON dictionaries with lazy locale loading, no framework plugin"
  - "site:* proxy commands pattern: root package.json delegates to workspace packages via pnpm --filter"
  - "Isolated Vite build: each workspace app has own vite.config.ts writing to own dist/"

requirements-completed: [BUILD-01, BUILD-02]

# Metrics
duration: 5min
completed: 2026-06-02
---

# Phase 14 Plan 2: Marketing App Skeleton Summary

**Independent marketing workspace app with pnpm workspace wiring, standalone Vite build, Preact + signals skeleton, and app-local t() i18n with en/zh_CN locale coverage**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-02T00:21:15Z
- **Completed:** 2026-06-02T00:26:35Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Created pnpm workspace linking apps/marketing as independent package
- Built standalone Vite + Preact + signals + Tailwind v4 marketing app
- All user-visible strings sourced from locale files via t() wrapper
- site:build produces apps/marketing/dist/index.html; site:preview serves it
- Extension build (wxt build) and tests (443/443) remain unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire the workspace and root proxy commands** - `ed725f4` (chore)
2. **Task 2: Create the standalone marketing skeleton app** - `2713e5c` (feat)

## Files Created/Modified
- `pnpm-workspace.yaml` - Workspace membership for apps/marketing
- `apps/marketing/package.json` - Independent package with Preact + signals + Tailwind v4 deps
- `apps/marketing/tsconfig.json` - Independent TS config (no .wxt/tsconfig.json)
- `apps/marketing/vite.config.ts` - Standalone Vite config outputting to apps/marketing/dist
- `apps/marketing/index.html` - HTML entry point
- `apps/marketing/src/main.tsx` - Preact mount with signal-backed locale detection
- `apps/marketing/src/app.tsx` - Skeleton page rendering hero, platforms, next phase from t()
- `apps/marketing/src/styles/index.css` - Tailwind v4 + shared design tokens import
- `apps/marketing/src/data/site-content.ts` - Locale-keyed content via t() functions
- `apps/marketing/src/i18n/index.ts` - Simple t() wrapper with lazy locale loading
- `apps/marketing/src/i18n/locales/en.json` - English locale (10 keys)
- `apps/marketing/src/i18n/locales/zh_CN.json` - Simplified Chinese locale (10 keys, 100% parity)
- `apps/marketing/scripts/verify-build.mjs` - Build verification script
- `package.json` - Added site:dev/site:build/site:preview/site:verify proxy scripts
- `eslint.config.js` - Added apps/marketing/dist/ to ignores

## Decisions Made
- Marketing Vite version pinned to ^6.3.5 (matching lockfile resolved 6.4.3), not 7.x or 8.x also present in the lockfile
- Lazy locale loading pattern: en loaded eagerly as default, zh_CN loaded via dynamic import on switch
- Content data uses typed getter functions (getHero, getSupportedPlatforms, getNextPhase) rather than a flat object, ensuring each value flows through t()
- locale signal in main.tsx provides the minimal signal-backed value required by D-07

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript noUncheckedIndexedAccess error in t() function**
- **Found during:** Task 2 (pre-commit typecheck)
- **Issue:** `dict` variable from dynamic Record access could be undefined under strict mode
- **Fix:** Added null check before accessing dict[key]
- **Files modified:** apps/marketing/src/i18n/index.ts
- **Verification:** pnpm compile passes clean
- **Committed in:** 2713e5c (Task 2 commit)

**2. [Rule 1 - Bug] Fixed ESLint no-floating-promises errors**
- **Found during:** Task 2 (pre-commit lint-staged)
- **Issue:** init() call in main.tsx and dynamic import in app.tsx were floating promises
- **Fix:** Added `void` prefix to mark intentionally unhandled promises
- **Files modified:** apps/marketing/src/main.tsx, apps/marketing/src/app.tsx
- **Verification:** pnpm lint passes clean
- **Committed in:** 2713e5c (Task 2 commit)

**3. [Rule 3 - Blocking] Added apps/marketing/dist/ to ESLint ignores**
- **Found during:** Task 2 (ESLint scanned build output)
- **Issue:** ESLint config ignored top-level dist/ but not apps/marketing/dist/; build output files caused 165 lint errors
- **Fix:** Added 'apps/marketing/dist/' to eslint.config.js ignores array
- **Files modified:** eslint.config.js
- **Verification:** pnpm lint passes clean after change
- **Committed in:** 2713e5c (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes were necessary pre-commit corrections. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Marketing workspace app builds and previews successfully
- Skeleton renders locale-keyed content through t() with en/zh_CN coverage
- Ready for Phase 14 Plan 3 (build isolation verification boundaries)
- Ready for Phase 15 (page content and visual implementation)

## Self-Check: PASSED

- All 13 created files verified present
- Both task commits (ed725f4, 2713e5c) verified in git log
- Extension build (wxt build) passes
- Extension tests (443/443) pass
- Marketing build (pnpm site:build) passes and produces dist/index.html

---
*Phase: 14-marketing-app-skeleton-build-isolation*
*Completed: 2026-06-02*
