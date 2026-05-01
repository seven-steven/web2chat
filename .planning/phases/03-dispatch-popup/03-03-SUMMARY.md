---
phase: 03-dispatch-popup
plan: 03
subsystem: manifest-config
tags: [manifest, commands, keyboard-shortcut, verify-manifest, deviations]
dependency_graph:
  requires: ["03-01 (i18n command_open_popup key in locales)"]
  provides: ["manifest commands field", "verify-manifest Phase 3 assertions", "03-DEVIATIONS.md D-34 record"]
  affects: [wxt.config.ts, scripts/verify-manifest.ts]
tech_stack:
  added: []
  patterns: [exported pure assertion function for unit testing]
key_files:
  created:
    - tests/unit/scripts/verify-manifest.spec.ts
    - .planning/phases/03-dispatch-popup/03-DEVIATIONS.md
  modified:
    - wxt.config.ts
    - scripts/verify-manifest.ts
decisions:
  - Manifest commands._execute_action with explicit mac override (Command+Shift+S) per RESEARCH Pitfall 8
  - verify-manifest refactored to exported assertManifest() pure function for unit test consumption
  - options_ui assertion is conditional guard (no-op until Plan 07 lands entrypoints/options/)
metrics:
  duration: 4m
  completed: 2026-05-01
---

# Phase 3 Plan 3: Manifest Config Summary

manifest commands 字段注册 + verify-manifest Phase 3 断言扩展 + DEVIATIONS 文档

## Task Summary

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add commands field to wxt.config.ts | be61e0a | wxt.config.ts |
| 2 | Extend verify-manifest + unit tests + DEVIATIONS | cfa04c2 | scripts/verify-manifest.ts, tests/unit/scripts/verify-manifest.spec.ts, .planning/phases/03-dispatch-popup/03-DEVIATIONS.md |

## What Was Done

### Task 1: commands field (DSP-10 + D-38)

Added `commands._execute_action` to `wxt.config.ts` manifest factory:
- `suggested_key.default = 'Ctrl+Shift+S'`
- `suggested_key.mac = 'Command+Shift+S'` (explicit, per RESEARCH Pitfall 8)
- `description = '__MSG_command_open_popup__'` (i18n placeholder, key added in Plan 01 Group A)

Production build confirmed: manifest.json contains correct commands field. Phase 1 invariants (host_permissions, permissions) unchanged.

### Task 2: verify-manifest extension + tests + DEVIATIONS

1. **Refactored verify-manifest.ts** -- extracted `assertManifest(manifest, errors)` as exported pure function. All Phase 1 assertions preserved verbatim (permissions, host_permissions, optional_host_permissions, `<all_urls>` hard guard, default_locale, `__MSG_*__` fields).

2. **Added Phase 3 assertions:**
   - `commands._execute_action` existence + suggested_key values + description `__MSG_*__` check
   - Conditional `options_ui.page === 'options.html'` guard (no-op until Plan 07)

3. **Created 8 unit tests** (`tests/unit/scripts/verify-manifest.spec.ts`) driving assertManifest with synthetic Manifest objects: valid manifest, missing commands, wrong default/mac key, missing i18n description, options_ui absent/present-correct/present-wrong.

4. **Created 03-DEVIATIONS.md** documenting D-34 5s -> 30s badge auto-clear deviation with chrome.alarms minimum delay rationale, alternatives considered, and reversibility note.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes type error in Manifest type**
- **Found during:** Task 2 commit (pre-commit hook)
- **Issue:** `exactOptionalPropertyTypes: true` in tsconfig prevents `{ commands: undefined }` from being assignable to `Partial<Manifest>` when properties use `?: T` (without explicit `| undefined`)
- **Fix:** Changed Manifest type properties to use `?: T | undefined` pattern for all optional fields
- **Files modified:** scripts/verify-manifest.ts (Manifest type definition)
- **Commit:** cfa04c2

## Verification Results

- `pnpm build` -- passes, manifest.json valid
- `pnpm verify:manifest` -- passes, all assertions green
- `pnpm typecheck` -- passes
- `pnpm lint` -- passes (4 pre-existing warnings in turndown-plugin-gfm.d.ts, 0 errors)
- `pnpm test` -- 84/84 tests pass (including 8 new verify-manifest tests)
- Pre-existing `jsdom` unhandled errors (3) from vitest teardown -- not caused by this plan

## Known Stubs

None.

## Threat Flags

None -- no new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

All files exist: wxt.config.ts, scripts/verify-manifest.ts, tests/unit/scripts/verify-manifest.spec.ts, 03-DEVIATIONS.md, 03-03-SUMMARY.md
All commits found: be61e0a, cfa04c2
