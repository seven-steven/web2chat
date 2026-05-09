---
phase: 8
slug: architecture-generalization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09T15:12:25.316Z
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
| 08-01-01 | TBD | 0/1 | ARCH-01 | — | N/A | unit + typecheck | `npx vitest run tests/unit/dispatch/platform-detector.spec.ts && npx tsc --noEmit` | existing update | pending |
| 08-02-01 | TBD | 0/1 | ARCH-02 | T-08-01 / T-08-02 | Reject unknown `WEB2CHAT_MAIN_WORLD:<platformId>` ports and execute only in sender tab | unit | `npx vitest run tests/unit/dispatch/mainWorldBridge.spec.ts` | Wave 0 | pending |
| 08-03-01 | TBD | 0/1 | ARCH-03 | T-08-03 | Use exact `hostEquals` SPA filters and skip listener registration for empty filters | unit | `npx vitest run tests/unit/dispatch/spaFilter.spec.ts` | Wave 0 | pending |
| 08-04-01 | TBD | 0/1 | ARCH-04 | — | N/A | unit | `npx vitest run tests/unit/messaging/errorCode.spec.ts` | existing update | pending |
| 08-05-01 | TBD | final | ARCH-01..04 | T-08-01 / T-08-02 / T-08-03 | No static `<all_urls>` permission regression | full suite | `npx vitest run && npx tsc --noEmit && pnpm run verify:manifest` | existing | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/dispatch/mainWorldBridge.spec.ts` — stubs for ARCH-02 generic port routing
- [ ] `tests/unit/dispatch/spaFilter.spec.ts` — stubs for ARCH-03 registry-built SPA filters
- [ ] `tests/unit/dispatch/platform-detector.spec.ts` — update assertions for branded `PlatformId` and registry construction helpers
- [ ] `tests/unit/messaging/errorCode.spec.ts` — update assertions for common/platform ErrorCode namespace and runtime guard

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
