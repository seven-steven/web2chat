---
phase: 08-architecture-generalization
reviewed: 2026-05-10T19:35:00+08:00
depth: deep
files_reviewed: 17
files_reviewed_list:
  - background/dispatch-pipeline.ts
  - background/injectors/discord-main-world.ts
  - background/main-world-registry.ts
  - entrypoints/background.ts
  - entrypoints/discord.content.ts
  - entrypoints/popup/components/ErrorBanner.tsx
  - entrypoints/popup/components/SendForm.tsx
  - shared/adapters/platform-errors.ts
  - shared/adapters/registry.ts
  - shared/adapters/types.ts
  - shared/messaging/index.ts
  - shared/messaging/result.ts
  - shared/storage/repos/dispatch.ts
  - tests/unit/dispatch/mainWorldBridge.spec.ts
  - tests/unit/dispatch/platform-detector.spec.ts
  - tests/unit/dispatch/spaFilter.spec.ts
  - tests/unit/messaging/errorCode.spec.ts
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
closure:
  critical_closed: 3
  warning_closed: 5
  info_closed: 3
  remaining: 0
status: closed
---

# Phase 08: Code Review Report

**Reviewed:** 2026-05-10T00:00:00Z  
**Closure reviewed:** 2026-05-10T19:35:00+08:00  
**Depth:** deep  
**Files Reviewed:** 17  
**Status:** closed

## Summary

Initial review found 11 issues across Phase 8 architecture-generalization work:

- 3 critical: popup bundle pollution via shared/background import, service-worker `setTimeout`, and `SendForm.handleConfirm` exception handling.
- 5 warnings: retry button not retrying, tab URL prefix collision, non-standard `InputEvent.inputType`, dead dispatch active-key guard, and unresolved content-script port disconnect.
- 3 info findings: implicit dynamic-permission sentinel, single-wildcard replacement, and registry comment contradiction.

Plan 08-05 closed all review findings. Current source confirms the most important architecture blocker is fixed: `shared/adapters/registry.ts` no longer imports `background/injectors/discord-main-world.ts`; MAIN-world injector wiring now lives only in `background/main-world-registry.ts`, which is SW-only.

## Closure Status

| Finding | Original Severity | Closure Status | Evidence |
| --- | --- | --- | --- |
| CR-01 shared/ imports background injector | critical | CLOSED | Registry no longer imports background injector; `background/main-world-registry.ts` owns manual injector map. |
| CR-02 service-worker `setTimeout` | critical | CLOSED | Phase 08-05 removed executable SW pipeline `setTimeout`; Phase 09 later introduced scoped adapter-response helper outside the pipeline per D-113. |
| CR-03 permission-check exception leaves submitting true | critical | CLOSED | 08-05 summary records exception-safe `SendForm.handleConfirm` and real retry behavior. |
| WR-01 Retry only dismisses error | warning | CLOSED | 08-05 summary records real retry; Phase 09 later tightened retriable-driven retry semantics. |
| WR-02 `tabs.query` URL prefix collision | warning | CLOSED | 08-05 summary records exact URL match before prefix fallback. |
| WR-03 non-standard `deleteContent` | warning | CLOSED | 08-05 summary records `deleteContentBackward` replacement. |
| WR-04 dead `ACTIVE_KEY` guard | warning | CLOSED | 08-05 summary records dead guard removal. |
| WR-05 unresolved port disconnect | warning | CLOSED | 08-05 summary records always-resolve disconnect behavior. |
| IN-01 implicit dynamic-permission sentinel | info | CLOSED | `requiresDynamicPermission` exists on registry entries. |
| IN-02 single wildcard replace | info | CLOSED | 08-05 summary records global wildcard replacement. |
| IN-03 registry comment contradiction | info | CLOSED | Registry comment now explicitly says `mainWorldInjector` is not populated in shared registry. |

## Final Assessment

Phase 8 now satisfies its architecture goal: new platforms can use the branded PlatformId + registry metadata model, generic MAIN-world bridge, registry-built SPA filters, and namespaced ErrorCode model without modifying the core popup/SW plumbing beyond platform-specific adapter/injector registration.

No open review blockers remain for Phase 8.

---

_Closure reviewed: 2026-05-10T19:35:00+08:00_  
_Reviewer: ChatGPT (gsd phase review)_
