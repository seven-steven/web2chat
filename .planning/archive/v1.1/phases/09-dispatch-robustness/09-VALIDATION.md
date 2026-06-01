---
phase: 09
slug: dispatch-robustness
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-10
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 via `wxt/testing/vitest-plugin` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/unit/dispatch/timeout-config.spec.ts tests/unit/dispatch/adapter-response-timeout.spec.ts tests/unit/dispatch/logged-out-paths.spec.ts tests/unit/popup/retry-retriable.spec.tsx tests/unit/adapters/discord-selector.spec.ts` |
| **Full suite command** | `pnpm test && pnpm typecheck && pnpm lint && pnpm test:i18n-coverage` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run the targeted Vitest command for the changed subsystem plus `pnpm typecheck` when TypeScript contracts change.
- **After every plan wave:** Run `pnpm test && pnpm typecheck && pnpm lint && pnpm test:i18n-coverage`.
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 120 seconds for automated checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | DSPT-01 | — | Registry timeout defaults/overrides enforce `dispatchTimeoutMs >= 30000` | unit | `pnpm test -- tests/unit/dispatch/timeout-config.spec.ts tests/unit/dispatch/adapter-response-timeout.spec.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | DSPT-02 | T-09-LOGIN | URL login remap only occurs for explicit `loggedOutPathPatterns` on adapter host | unit | `pnpm test -- tests/unit/dispatch/logged-out-paths.spec.ts tests/unit/dispatch/login-detection.spec.ts` | ❌ W0 / existing revise | ⬜ pending |
| 09-03-01 | 03 | 2 | DSPT-03 | T-09-RETRY | Retry appears only for `retriable: true` and starts a fresh dispatch with current form payload | unit | `pnpm test -- tests/unit/popup/retry-retriable.spec.tsx` | ❌ W0 | ⬜ pending |
| 09-04-01 | 04 | 2 | DSPT-04 | T-09-SELECTOR | Tier3 selector warning blocks send until one-shot user confirmation | unit | `pnpm test -- tests/unit/adapters/discord-selector.spec.ts tests/unit/dispatch/selector-warning.spec.ts` | ⚠️ partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/dispatch/timeout-config.spec.ts` — covers DSPT-01 defaults, overrides, and minimum guard.
- [ ] `tests/unit/dispatch/adapter-response-timeout.spec.ts` — covers DSPT-01/D-113 adapter response timeout wrapper and `TIMEOUT retriable=true` behavior.
- [ ] Revise `tests/unit/dispatch/dispatch-timeout.spec.ts` — stop forbidding all `setTimeout`; assert scoped adapter response timeout only.
- [ ] Revise or replace `tests/unit/dispatch/login-detection.spec.ts` — covers DSPT-02 helper and no remap for unconfigured platforms.
- [ ] `tests/unit/popup/retry-retriable.spec.tsx` — covers DSPT-03 retry UI/state behavior.
- [ ] `tests/unit/dispatch/selector-warning.spec.ts` or extend `tests/unit/adapters/discord-selector.spec.ts` — covers DSPT-04 warning channel and no-send-before-confirm.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Headed extension E2E for popup retry/confirmation | DSPT-03, DSPT-04 | Playwright extension E2E may require headed Chromium and a usable display | If headed browser is available, run relevant `pnpm test:e2e` specs after unit/type/lint are green; otherwise request human verification. |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-10
