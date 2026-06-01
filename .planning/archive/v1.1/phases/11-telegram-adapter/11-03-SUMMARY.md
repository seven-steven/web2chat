---
phase: 11-telegram-adapter
plan: 03
subsystem: adapter-registry, i18n, popup-ui, manifest-config
tags: [telegram, adapter-registry, main-world-injector, i18n, platform-icon, host-permissions]

# Dependency graph
requires:
  - phase: 11-telegram-adapter (11-01)
    provides: Telegram message formatting (composeTelegramMessage)
  - phase: 11-telegram-adapter (11-02)
    provides: Telegram login wall detection (loggedOutPathPatterns)
  - phase: 08-architecture-generalization
    provides: AdapterRegistryEntry interface, MAIN world bridge pattern, verify-manifest
provides:
  - Telegram adapter registry entry (match, hostMatches, spaNavigationHosts, loggedOutPathPatterns)
  - Telegram MAIN world paste injector (telegramMainWorldPaste)
  - Telegram MAIN world bridge routing in main-world-registry
  - Telegram host_permissions in wxt.config.ts manifest
  - Telegram verify-manifest assertion update
  - Telegram i18n keys (en + zh_CN) with 100% coverage
  - Telegram PlatformIcon variant with official SVG
  - Telegram ToS warning in SendForm
  - Telegram DOM fixture HTML for selector tests
affects: [11-04, popup, dispatch-pipeline, manifest]

# Tech tracking
tech-stack:
  added: []
patterns:
  - defineAdapter registry entry per platform (D-97)
  - MAIN world injector in background/injectors/<platform>-main-world.ts
  - Manual map pattern for SW-only injector registry (D-100)
  - PlatformVariant union type for PlatformIcon
  - ToS warning block pattern per platform

key-files:
  created:
    - background/injectors/telegram-main-world.ts
    - tests/unit/adapters/telegram.fixture.html
    - tests/unit/adapters/telegram-i18n.spec.ts
  modified:
    - shared/adapters/registry.ts
    - background/main-world-registry.ts
    - wxt.config.ts
    - scripts/verify-manifest.ts
    - locales/en.yml
    - locales/zh_CN.yml
    - entrypoints/popup/components/PlatformIcon.tsx
    - entrypoints/popup/components/SendForm.tsx
    - entrypoints/popup/components/Combobox.tsx
    - tests/unit/dispatch/platform-detector.spec.ts
    - tests/unit/scripts/verify-manifest.spec.ts

key-decisions:
  - "Telegram uses web.telegram.org/a/ URL path matching (Web K client)"
  - "Combobox iconVariant type extended to include slack + telegram (was missing slack)"
  - "telegram_timestamp_label key added as orphan — will be consumed by 11-04 content script"

patterns-established: []

requirements-completed: [TG-01, TG-05]

# Metrics
duration: 14min
completed: 2026-05-16
---

# Phase 11 Plan 03: Telegram Adapter Registration + Configuration Summary

**Telegram adapter registry entry, MAIN world injector, manifest host_permissions, i18n双语覆盖, PlatformIcon SVG, and SendForm ToS warning**

## Performance

- **Duration:** 14 min
- **Started:** 2026-05-16T02:24:01Z
- **Completed:** 2026-05-16T02:38:06Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Telegram adapter fully registered with URL matching (web.telegram.org/a/), SPA navigation, login wall paths
- MAIN world paste injector with Telegram-specific editor + send button selectors and synthetic ClipboardEvent dispatch
- host_permissions updated in wxt.config.ts (production + development modes) with verify-manifest assertion
- i18n keys added to both en.yml and zh_CN.yml with automated coverage test
- PlatformIcon supports Telegram with official logo SVG
- SendForm displays Telegram ToS warning and recognizes telegram in known platform array
- Combobox types corrected to include slack + telegram variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Registry + MAIN world injector + manifest config** - `3c2e2c1` (feat)
2. **Task 2: i18n + platform icon + fixture + SendForm ToS** - `0f023bf` (feat)
3. **Task 3: Telegram i18n key coverage test** - `c4da0a9` (test)

## Files Created/Modified
- `shared/adapters/registry.ts` - Telegram defineAdapter entry with URL matching, hostMatches, spaNavigationHosts, loggedOutPathPatterns
- `background/injectors/telegram-main-world.ts` - Telegram MAIN world paste injector (editor + send button selectors, ClipboardEvent dispatch, pre/post cleanup)
- `background/main-world-registry.ts` - Telegram injector import + map entry
- `wxt.config.ts` - host_permissions includes https://web.telegram.org/* in both production and development modes
- `scripts/verify-manifest.ts` - host_permissions assertion includes web.telegram.org
- `locales/en.yml` - Telegram i18n keys (platform_icon_telegram, telegram_tos_warning, telegram_tos_details, telegram_timestamp_label, updated combobox placeholder)
- `locales/zh_CN.yml` - Same keys with Chinese translations
- `entrypoints/popup/components/PlatformIcon.tsx` - Telegram variant with official SVG + tooltip
- `entrypoints/popup/components/SendForm.tsx` - known array includes telegram, Telegram ToS warning block
- `entrypoints/popup/components/Combobox.tsx` - iconVariant + leadingIcon types include slack + telegram
- `tests/unit/adapters/telegram.fixture.html` - Telegram Web K DOM fixture
- `tests/unit/adapters/telegram-i18n.spec.ts` - i18n key coverage test (8 assertions)
- `tests/unit/dispatch/platform-detector.spec.ts` - Updated for 5-entry registry
- `tests/unit/scripts/verify-manifest.spec.ts` - Updated validManifest host_permissions

## Decisions Made
- Telegram URL matching uses `web.telegram.org` hostname + `/a/` pathname prefix (Web K client)
- Telegram loggedOutPathPatterns set to `['/', '/login*']` per research findings
- telegram_timestamp_label added as orphan key (consumed by 11-04 content script)
- Combobox iconVariant/leadingIcon types corrected to include both slack and telegram (slack was missing from the union type despite being functional via the iconKeyToVariant helper)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] platform-detector.spec.ts hardcoded registry length**
- **Found during:** Task 1 (verification)
- **Issue:** Existing test expected `adapterRegistry.toHaveLength(4)` which failed with the new Telegram entry
- **Fix:** Updated test to expect length 5 and added `adapterRegistry[4]?.id` assertion for telegram
- **Files modified:** tests/unit/dispatch/platform-detector.spec.ts
- **Verification:** All 401 tests pass
- **Committed in:** 3c2e2c1 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Combobox iconVariant type missing slack + telegram**
- **Found during:** Task 2 (PlatformIcon update)
- **Issue:** Combobox `iconVariant` and `leadingIcon` types only listed `'mock' | 'openclaw' | 'discord' | 'unsupported' | 'none'` — missing both `'slack'` and `'telegram'`. Slack worked at runtime because iconKeyToVariant returns string, but TypeScript union was incomplete.
- **Fix:** Added `'slack'` and `'telegram'` to both union types
- **Files modified:** entrypoints/popup/components/Combobox.tsx
- **Verification:** All 401 tests pass, typecheck clean
- **Committed in:** 0f023bf (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## Next Phase Readiness
- All Telegram "wiring" complete: registry, MAIN world injector, manifest permissions, i18n, icon, ToS warning
- Ready for 11-04: Telegram content script implementation (entrypoints/telegram.content.ts) which will consume the registry entry and telegram_timestamp_label i18n key

---
*Phase: 11-telegram-adapter*
*Completed: 2026-05-16*
