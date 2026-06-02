---
phase: 14-marketing-app-skeleton-build-isolation
plan: 1
subsystem: infra
tags: [css, design-tokens, tailwind-v4, build-isolation]

# Dependency graph
requires: []
provides:
  - "shared/styles/design-tokens.css — canonical design token source for extension + marketing app"
  - "Compatibility shim at entrypoints/_shared-tokens.css importing shared tokens"
  - "Extension entrypoints wired to shared token path directly"
affects: [14-02, 14-03, marketing-app]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared design tokens under shared/styles/ — single source of truth consumed by extension and marketing app"

key-files:
  created:
    - shared/styles/design-tokens.css
  modified:
    - entrypoints/_shared-tokens.css
    - entrypoints/popup/style.css
    - entrypoints/options/style.css

key-decisions:
  - "Design tokens live at shared/styles/design-tokens.css; extension entrypoints import directly via ../../shared/styles/design-tokens.css"
  - "entrypoints/_shared-tokens.css kept as compatibility shim (imports ../shared/styles/design-tokens.css) to avoid breaking any undiscovered references"

patterns-established:
  - "Shared visual boundary: shared/styles/ holds static CSS assets that cross the extension/marketing boundary without runtime module coupling"

requirements-completed: [BUILD-03]

# Metrics
duration: 1min
completed: 2026-06-02
---

# Phase 14 Plan 1: Extract Shared Design Tokens Summary

**Design tokens moved from entrypoints/ to shared/styles/design-tokens.css with compatibility shim and direct import rewiring for popup and options**

## Performance

- **Duration:** 1 min
- **Started:** 2026-06-02T00:18:42Z
- **Completed:** 2026-06-02T00:19:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Canonical design token source established at `shared/styles/design-tokens.css` containing all `@theme inline` tokens, dark-mode overrides, and `@keyframes w2c-*` animations
- Extension popup and options styles import the shared token path directly, proving the move is transparent to the build

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the canonical design-token source into /shared** - `d43ef44` (feat)
2. **Task 2: Rewire extension style entrypoints to the shared token path** - `c464d56` (feat)

## Files Created/Modified
- `shared/styles/design-tokens.css` - Canonical design token source: @theme inline tokens, dark-mode overrides, body chrome, w2c-* keyframes, reduced-motion reset
- `entrypoints/_shared-tokens.css` - Compatibility shim importing ../shared/styles/design-tokens.css
- `entrypoints/popup/style.css` - Import path changed from ../_shared-tokens.css to ../../shared/styles/design-tokens.css
- `entrypoints/options/style.css` - Import path changed from ../_shared-tokens.css to ../../shared/styles/design-tokens.css

## Decisions Made
- Kept `entrypoints/_shared-tokens.css` as a compatibility shim rather than deleting it, to avoid breaking any undiscovered references during the transition
- Updated popup and options to import directly from shared (bypassing the shim), establishing the canonical pattern for future consumers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Shared design tokens are available at `shared/styles/design-tokens.css` for the marketing app (Plan 14-02)
- Extension build verified green after token extraction
- No blockers for subsequent plans

---
*Phase: 14-marketing-app-skeleton-build-isolation*
*Completed: 2026-06-02*
