---
phase: "05-discord"
plan: "03"
subsystem: "dispatch"
tags: [discord, webNavigation, login-detection, SPA-routing, ToS, brand-icon]
dependency_graph:
  requires:
    - phase: "05-01"
      provides: "Discord adapter registry entry with match() and hostMatches"
  provides: [webNavigation-SPA-listener, login-redirect-detection, discord-brand-svg, discord-tos-footnote]
  affects: [entrypoints/background.ts, background/dispatch-pipeline.ts, popup/PlatformIcon, popup/SendForm]
tech_stack:
  added: []
  patterns: [host-match-vs-adapter-match-login-detection, webNavigation-SPA-forwarding]
key_files:
  created:
    - tests/unit/dispatch/login-detection.spec.ts
  modified:
    - entrypoints/background.ts
    - background/dispatch-pipeline.ts
    - entrypoints/popup/components/PlatformIcon.tsx
    - entrypoints/popup/components/SendForm.tsx
key-decisions:
  - "Login detection uses generic hostMatches-vs-adapter.match() gap pattern, applicable to any future adapter with static hostMatches"
  - "webNavigation.onHistoryStateUpdated forwards to existing onTabComplete handler with synthetic status:'complete' — no separate handler needed"
patterns-established:
  - "SPA routing pattern: webNavigation.onHistoryStateUpdated filtered by hostSuffix, forwarded to onTabComplete with synthetic changeInfo"
  - "Login redirect detection: if actual tab URL matches adapter hostMatches but NOT adapter.match(), fail with NOT_LOGGED_IN"
requirements-completed: [ADD-04, ADD-06, ADD-07, ADD-08]
metrics:
  duration: "3m"
  completed: "2026-05-05"
---

# Phase 05 Plan 03: Discord Integration Wiring Summary

**webNavigation SPA listener for Discord pushState routing, login redirect detection via hostMatches-vs-match gap, Discord brand SVG icon, and conditional ToS footnote in SendForm.**

## Performance

- **Duration:** 3m
- **Started:** 2026-05-05T02:27:06Z
- **Completed:** 2026-05-05T02:31:01Z
- **Tasks:** 2
- **Files modified:** 5 (4 modified + 1 created)

## Accomplishments

- webNavigation.onHistoryStateUpdated listener registered in background.ts for Discord SPA channel navigation
- dispatch-pipeline login redirect detection: host matches but adapter.match() fails -> NOT_LOGGED_IN error
- Discord brand SVG (Clyde logo) replaces letterform placeholder in PlatformIcon
- Conditional Discord ToS warning footnote in SendForm with i18n keys

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add webNavigation listener + dispatch-pipeline login detection + unit test | 0120a4b | entrypoints/background.ts, background/dispatch-pipeline.ts, tests/unit/dispatch/login-detection.spec.ts |
| 2 | Replace Discord letterform with brand SVG + add conditional ToS footnote | 2c90d03 | entrypoints/popup/components/PlatformIcon.tsx, entrypoints/popup/components/SendForm.tsx |

## Verification Results

- `pnpm typecheck` — PASS
- `pnpm vitest run tests/unit/dispatch/login-detection.spec.ts` — 4 tests PASS
- `grep -c "onHistoryStateUpdated" entrypoints/background.ts` — 1
- `grep -c "NOT_LOGGED_IN" background/dispatch-pipeline.ts` — 3
- `grep -c "discord_tos_warning" entrypoints/popup/components/SendForm.tsx` — 1
- PlatformIcon discord variant uses SVG `<path>` (no DISCORD_GLYPH)

## Decisions Made

- Login detection uses generic hostMatches-vs-adapter.match() gap: works for any future adapter with static host_permissions, not just Discord
- webNavigation.onHistoryStateUpdated forwards to existing onTabComplete handler with synthetic `{ status: 'complete' }` — reuses existing dispatch state machine without new handler
- Discord brand SVG uses simplified single-path Clyde logo fitting 24x24 viewBox

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all implementations are fully wired with real logic.

## Threat Surface Scan

No new threat surface beyond what is documented in the plan's threat model:
- T-05-03-01: webNavigation filtered to `hostSuffix: 'discord.com'` (mitigated)
- T-05-03-02: Login detection checks actual tab URL against adapter.match() + hostMatches (mitigated)
- T-05-03-03: ToS footnote uses only i18n generic text (accepted)
- T-05-03-04: ToS link hardcoded to discord.com/terms (accepted)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Discord adapter integration is now wired end-to-end through dispatch pipeline
- Plan 05-04 (Discord adapter content script) can proceed — it implements the actual DOM injection
- webNavigation permission already declared in manifest (Plan 05-01)

---
*Phase: 05-discord*
*Completed: 2026-05-05*
