---
phase: 10-slack-adapter
plan: 03
subsystem: adapter-infrastructure
tags: [slack, registry, i18n, manifest, host-permissions, main-world-injector, quill]

# Dependency graph
requires:
  - phase: 08-architecture-generalization
    provides: defineAdapter registry pattern, MAIN world bridge, dispatch pipeline
  - phase: 09-dispatch-robustness
    provides: SPA navigation, login detection, selector confidence tiers
provides:
  - Slack adapter registry entry with URL match for app.slack.com/client/<w>/<c>
  - Slack MAIN world ClipboardEvent paste injector for Quill editor
  - Slack host_permissions in manifest (https://app.slack.com/*)
  - Slack i18n keys (platform_icon_slack, slack_tos_warning, slack_tos_details)
  - Slack platform icon (hash logo SVG) in PlatformIcon component
  - Slack ToS warning in SendForm
  - Slack DOM fixture for selector tests
  - Slack i18n key coverage test
affects: [10-slack-adapter-plan-04, future-slack-adapter-plans]

# Tech tracking
tech-stack:
  added: []
  patterns: [Quill ClipboardEvent paste injection, Slack hash logo SVG]

key-files:
  created:
    - background/injectors/slack-main-world.ts
    - tests/unit/adapters/slack.fixture.html
    - tests/unit/adapters/slack-i18n.spec.ts
  modified:
    - shared/adapters/registry.ts
    - background/main-world-registry.ts
    - wxt.config.ts
    - scripts/verify-manifest.ts
    - locales/en.yml
    - locales/zh_CN.yml
    - entrypoints/popup/components/PlatformIcon.tsx
    - entrypoints/popup/components/SendForm.tsx
    - tests/unit/dispatch/platform-detector.spec.ts
    - tests/unit/scripts/verify-manifest.spec.ts

key-decisions:
  - "Slack MAIN world injector uses same beforeinput cleanup + ClipboardEvent paste + Enter pattern as Discord, with Quill-specific selectors"
  - "Slack registry entry uses hostname + pathname startsWith + segment count >= 3 for URL matching"

patterns-established:
  - "Quill editor selector fallback: .ql-editor[role=textbox] -> .ql-editor[contenteditable=true] -> #msg_input [contenteditable=true]"
  - "Platform icon addition: extend PlatformVariant type, add SVG path, update tooltip chain"

requirements-completed: [SLK-01, SLK-05]

# Metrics
duration: 7min
completed: 2026-05-12
---

# Phase 10 Plan 03: Slack Registration & Configuration Summary

**Slack adapter registry entry, Quill MAIN world paste injector, manifest host_permissions, i18n keys (en + zh_CN), platform icon (hash logo), and SendForm ToS warning**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-12T16:26:13Z
- **Completed:** 2026-05-12T16:34:03Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Slack adapter registered in adapterRegistry with URL pattern for app.slack.com/client/<workspace>/<channel>
- MAIN world Quill paste injector created and registered alongside Discord
- host_permissions updated in both wxt.config.ts and verify-manifest.ts assertion
- i18n keys added to both en.yml and zh_CN.yml with 100% coverage verified by automated test
- Slack hash logo SVG added to PlatformIcon component
- Slack ToS warning block added to SendForm (parallel to Discord ToS)

## Task Commits

Each task was committed atomically:

1. **Task 1: Registry + MAIN world injector + manifest config** - `158271b` (feat)
2. **Task 2: i18n + platform icon + fixture + SendForm ToS** - `ebec19d` (feat)
3. **Task 3: Slack i18n key coverage test** - `ccdf6c6` (test)

## Files Created/Modified
- `shared/adapters/registry.ts` - Added Slack defineAdapter entry with URL match, hostMatches, iconKey, spaNavigationHosts, loggedOutPathPatterns
- `background/injectors/slack-main-world.ts` - NEW: Quill editor ClipboardEvent paste injector
- `background/main-world-registry.ts` - Added slackMainWorldPaste to injector map
- `wxt.config.ts` - Added https://app.slack.com/* to host_permissions (both dev and production)
- `scripts/verify-manifest.ts` - Updated host_permissions assertion for Slack
- `locales/en.yml` - Added platform_icon_slack, slack_tos_warning, slack_tos_details
- `locales/zh_CN.yml` - Added corresponding Chinese translations
- `entrypoints/popup/components/PlatformIcon.tsx` - Added 'slack' variant with hash logo SVG
- `entrypoints/popup/components/SendForm.tsx` - Added 'slack' to known array + Slack ToS warning block
- `tests/unit/adapters/slack.fixture.html` - NEW: Quill editor DOM fixture
- `tests/unit/adapters/slack-i18n.spec.ts` - NEW: i18n key coverage verification (6 tests)
- `tests/unit/dispatch/platform-detector.spec.ts` - Updated for 4-entry registry
- `tests/unit/scripts/verify-manifest.spec.ts` - Updated validManifest host_permissions

## Decisions Made
- Slack MAIN world injector follows exact Discord pattern (beforeinput cleanup + ClipboardEvent paste + Enter + 200ms post-clear) with Quill-specific selectors
- Slack registry URL match requires hostname === 'app.slack.com' AND pathname.startsWith('/client/') AND >= 3 path segments
- loggedOutPathPatterns set to ['/check-login*', '/signin*', '/workspace-signin*'] per RESEARCH Pitfall 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated platform-detector.spec.ts for 4-entry registry**
- **Found during:** Task 1 (verification)
- **Issue:** Existing test asserted registry length === 3, now fails with 4 entries
- **Fix:** Updated assertion to length 4, added slack entry checks
- **Files modified:** tests/unit/dispatch/platform-detector.spec.ts
- **Verification:** pnpm test all 297 pass
- **Committed in:** 158271b (Task 1 commit)

**2. [Rule 3 - Blocking] Updated verify-manifest.spec.ts validManifest helper**
- **Found during:** Task 1 (verification)
- **Issue:** Test helper had old host_permissions causing assertion failure
- **Fix:** Updated validManifest host_permissions to include slack
- **Files modified:** tests/unit/scripts/verify-manifest.spec.ts
- **Verification:** pnpm test all 297 pass
- **Committed in:** 158271b (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking test updates)
**Impact on plan:** Minimal -- existing test assertions needed updating to account for new registry entry. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 2 can now implement the Slack content script (entrypoints/slack.content.ts) using the registered infrastructure
- slack.fixture.html ready for selector tests in Plan 04
- All dispatch tests (platform-detector, spaFilter, logged-out-paths, mainWorldBridge, timeout-config) pass with new registry entry

---
*Phase: 10-slack-adapter*
*Completed: 2026-05-12*

## Self-Check: PASSED

- All 4 created files verified present
- All 3 commit hashes verified in git log
- 303/303 tests passing (297 existing + 6 new slack-i18n)
