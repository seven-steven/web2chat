---
phase: 8
slug: architecture-generalization
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-09T15:12:25.316Z
updated: 2026-05-10T19:35:00+08:00
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + TypeScript typecheck |
| **Config file** | `vitest.config.ts`, `tsconfig.json` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 08-01 | 1 | ARCH-01 | — | N/A | unit + typecheck | `npx vitest run tests/unit/dispatch/platform-detector.spec.ts && npx tsc --noEmit` | existing update | green |
| 08-02-01 | 08-03 | 2 | ARCH-02 | T-08-01 / T-08-02 | Reject unknown `WEB2CHAT_MAIN_WORLD:<platformId>` ports and execute only in sender tab | unit | `npx vitest run tests/unit/dispatch/mainWorldBridge.spec.ts` | created | green |
| 08-03-01 | 08-01 / 08-03 | 2 | ARCH-03 | T-08-03 | Use exact `hostEquals` SPA filters and skip listener registration for empty filters | unit | `npx vitest run tests/unit/dispatch/spaFilter.spec.ts` | created | green |
| 08-04-01 | 08-02 / 08-04 | 1-2 | ARCH-04 | — | N/A | unit | `npx vitest run tests/unit/messaging/errorCode.spec.ts` | existing update | green |
| 08-05-01 | 08-05 | final | ARCH-01..04 | T-08-01 / T-08-02 / T-08-03 | No popup bundle injector leak; no static `<all_urls>` permission regression | full suite + build | `npx vitest run && npx tsc --noEmit && pnpm run verify:manifest` | existing | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] `tests/unit/dispatch/mainWorldBridge.spec.ts` — stubs/tests for ARCH-02 generic port routing
- [x] `tests/unit/dispatch/spaFilter.spec.ts` — stubs/tests for ARCH-03 registry-built SPA filters
- [x] `tests/unit/dispatch/platform-detector.spec.ts` — assertions for branded `PlatformId` and registry construction helpers
- [x] `tests/unit/messaging/errorCode.spec.ts` — assertions for common/platform ErrorCode namespace and runtime guard

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

_Approved: 2026-05-10T19:35:00+08:00_
