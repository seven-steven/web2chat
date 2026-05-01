---
phase: 04-openclaw
plan: 02
subsystem: adapter
tags: [openclaw, content-script, dom-injection, mutation-observer, adapter-protocol]

requires:
  - phase: 04-openclaw-01
    provides: "OpenClaw adapter registry entry, dom-injector setInputValue, ErrorCode extensions, i18n keys"
provides:
  - "OpenClaw adapter content script with full ADAPTER_DISPATCH protocol (canDispatch/compose/send/confirm)"
  - "Pure composeMarkdown utility module (shared/adapters/openclaw-format.ts) importable without WXT side effects"
  - "Unit tests covering URL matching (7 valid + 7 invalid) and Markdown formatting (5 scenarios)"
affects: ["04-openclaw-03", "04-openclaw-04", "05-discord"]

tech-stack:
  added: []
  patterns: ["adapter-content-script-protocol", "pure-utility-module-for-testability", "mutation-observer-dom-detection"]

key-files:
  created:
    - shared/adapters/openclaw-format.ts
    - entrypoints/openclaw.content.ts
    - tests/unit/adapters/openclaw-match.spec.ts
    - tests/unit/adapters/openclaw-compose.spec.ts
  modified:
    - tests/unit/dispatch/platform-detector.spec.ts

key-decisions:
  - "composeMarkdown lives in shared/adapters/openclaw-format.ts (pure utility) rather than inside the content script, enabling direct unit test imports without triggering defineContentScript side effects"
  - "OPENCLAW_OFFLINE detection uses fallback chain: querySelector feature selector OR document.title contains 'openclaw'"

patterns-established:
  - "Adapter content script pattern: one-shot onMessage listener + handleDispatch async handler + sendResponse protocol"
  - "Pure utility extraction: formatting logic separated from content script to enable unit test imports without chrome/WXT dependencies"

requirements-completed: [ADO-01, ADO-02, ADO-04]

duration: 8min
completed: 2026-05-02
---

# Phase 4 Plan 02: OpenClaw Adapter Content Script Summary

**OpenClaw adapter content script implementing ADAPTER_DISPATCH protocol with canDispatch/compose/send/confirm, plus pure composeMarkdown utility module**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-02T01:44:00Z
- **Completed:** 2026-05-02T01:50:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- OpenClaw adapter content script with full dispatch protocol: canDispatch (OPENCLAW_OFFLINE/INPUT_NOT_FOUND), waitForReady (MutationObserver), compose (setInputValue), send (Enter keydown), confirm (MutationObserver + 5s timeout)
- Pure composeMarkdown utility module (shared/adapters/openclaw-format.ts) — no WXT/chrome imports, safe for direct unit test imports
- 21 unit tests covering URL matching (localhost, LAN IP, custom domain, encoded params, query/hash edge cases) and Markdown formatting (prompt-first, empty-field omission, no truncation)

## Task Commits

1. **Task 1: Create openclaw-format utility + implement OpenClaw adapter content script** - `27fae77` (feat)
2. **Task 2: Unit tests for OpenClaw match and compose logic** - `13b3559` (feat)

## Files Created/Modified

- `shared/adapters/openclaw-format.ts` - Pure utility exporting composeMarkdown (prompt-first Markdown, empty-field omission, no truncation)
- `entrypoints/openclaw.content.ts` - OpenClaw adapter content script: ADAPTER_DISPATCH protocol, canDispatch (feature DOM + title fallback), waitForReady, compose, Enter keydown send, MutationObserver confirm
- `tests/unit/adapters/openclaw-match.spec.ts` - URL pattern matching tests: 7 valid URLs (localhost/LAN/domain/encoded/params/hash), 7 invalid URLs, trailing slash edge case
- `tests/unit/adapters/openclaw-compose.spec.ts` - composeMarkdown tests: prompt-first format, empty-field omission, prompt omission, content-only, no truncation (10k chars)
- `tests/unit/dispatch/platform-detector.spec.ts` - Updated registry count assertion from 1 to 2 (mock + openclaw)

## Decisions Made

- composeMarkdown extracted to shared/adapters/openclaw-format.ts as pure utility to enable direct unit test imports without triggering defineContentScript or chrome.runtime side effects
- OPENCLAW_OFFLINE detection uses fallback chain: querySelector feature selector OR document.title includes 'openclaw' — defensive against missing feature DOM

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated platform-detector registry count assertion**
- **Found during:** Task 2 verification
- **Issue:** Existing test asserted `adapterRegistry` has exactly 1 entry (Phase 3 only); adding openclaw entry made it 2
- **Fix:** Updated assertion from `toHaveLength(1)` to `toHaveLength(2)` with both mock and openclaw id checks
- **Files modified:** tests/unit/dispatch/platform-detector.spec.ts
- **Verification:** `pnpm vitest run tests/unit/dispatch/platform-detector` passes
- **Committed in:** `13b3559` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix to prevent existing test regression. No scope creep.

## Issues Encountered

- Pre-existing verify-manifest.spec.ts failure (`alarms` permission not in expected list) — out of scope, not caused by this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- OpenClaw adapter content script ready for E2E integration testing (Plan 03)
- composeMarkdown utility importable by both adapter and future plan tests
- Plan 03 can build dispatch-pipeline integration + popup permission flow on top of this adapter

---
*Phase: 04-openclaw*
*Completed: 2026-05-02*
