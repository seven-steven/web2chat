---
phase: "05-discord"
plan: "01"
subsystem: "adapters"
tags: [discord, formatting, registry, permissions, i18n]
dependency_graph:
  requires: []
  provides: [discord-format-module, discord-registry-entry, webNavigation-permission, discord-i18n-keys]
  affects: [wxt.config.ts, verify-manifest.ts, adapters/registry.ts]
tech_stack:
  added: []
  patterns: [escape-mentions-zws, prompt-first-truncation, bold-title-format]
key_files:
  created:
    - shared/adapters/discord-format.ts
    - tests/unit/adapters/discord-format.spec.ts
    - tests/unit/adapters/discord-match.spec.ts
  modified:
    - shared/adapters/registry.ts
    - wxt.config.ts
    - scripts/verify-manifest.ts
    - locales/en.yml
    - locales/zh_CN.yml
    - tests/unit/dispatch/platform-detector.spec.ts
decisions:
  - "escapeMentions uses ZWS (U+200B) insertion rather than backslash escaping — Discord renders ZWS invisibly while breaking mention resolution"
  - "Truncation priority: prompt preserved fully, then title+url, then content truncated, description as last resort"
metrics:
  duration: "3m"
  completed: "2026-05-05"
---

# Phase 05 Plan 01: Discord Format + Registry + Permissions Summary

Discord message formatting with 2000-char prompt-first truncation, ZWS mention escape, registry entry matching /channels/<g>/<c> (rejecting DM), webNavigation permission, and Discord ToS i18n keys.

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create discord-format.ts + register Discord adapter + update permissions | 2edf297 | shared/adapters/discord-format.ts, shared/adapters/registry.ts, wxt.config.ts, scripts/verify-manifest.ts, locales/en.yml, locales/zh_CN.yml |
| 2 | Unit tests for discord-format and discord-match | ba25311 | tests/unit/adapters/discord-format.spec.ts, tests/unit/adapters/discord-match.spec.ts, tests/unit/dispatch/platform-detector.spec.ts |

## Verification Results

- `pnpm typecheck` — PASS
- `pnpm vitest run tests/unit/adapters/discord-format.spec.ts` — 13 tests PASS
- `pnpm vitest run tests/unit/adapters/discord-match.spec.ts` — 10 tests PASS
- `pnpm vitest run tests/unit/dispatch/platform-detector.spec.ts` — 6 tests PASS
- Total: 29 tests green

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated platform-detector.spec.ts assertion for discord URL**
- **Found during:** Task 2
- **Issue:** Existing test expected `detectPlatformId('https://discord.com/channels/1/2')` to return `null`, but with discord adapter registered it now returns `'discord'`
- **Fix:** Updated assertion from `toBeNull()` to `toBe('discord')`
- **Files modified:** tests/unit/dispatch/platform-detector.spec.ts
- **Commit:** ba25311

## Known Stubs

None — all exports are fully implemented with real logic.

## Threat Surface Scan

No new threat surface beyond what is documented in the plan's threat model:
- T-05-01-01: escapeMentions mitigated (ZWS injection verified by tests)
- T-05-01-02: strict hostname check implemented (hostname === 'discord.com')
- T-05-01-03: webNavigation is read-only permission (accepted risk)
