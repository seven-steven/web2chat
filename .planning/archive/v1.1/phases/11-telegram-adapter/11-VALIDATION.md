---
phase: 11
slug: telegram-adapter
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-16
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run`
- **After every plan wave:** Run `pnpm test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | TG-01 | — | URL match validates hostname + pathname | unit | `vitest run tests/unit/dispatch/platform-detector.spec.ts` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | TG-01 | — | Registry entry has correct hostMatches | unit | `vitest run tests/unit/scripts/verify-manifest.spec.ts` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | TG-05 | — | platform_icon_telegram in locales | unit | `vitest run tests/unit/i18n/locale-coverage.spec.ts` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 1 | TG-02 | T-11-02 | DOM login detection for login wall | unit | `vitest run tests/unit/adapters/telegram-login.spec.ts` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | TG-02 | — | loggedOutPathPatterns for Telegram | unit | `vitest run tests/unit/dispatch/logged-out-paths.spec.ts` | ✅ | ⬜ pending |
| 11-03-01 | 03 | 1 | — | T-11-01 | Metadata-first truncation at 4096 | unit | `vitest run tests/unit/adapters/telegram-format.spec.ts` | ❌ W0 | ⬜ pending |
| 11-03-02 | 03 | 1 | — | — | Plain text composeTelegramMessage | unit | `vitest run tests/unit/adapters/telegram-format.spec.ts` | ❌ W0 | ⬜ pending |
| 11-04-01 | 04 | 2 | TG-03 | — | Three-tier selector finds editor | unit | `vitest run tests/unit/adapters/telegram-selector.spec.ts` | ❌ W0 | ⬜ pending |
| 11-04-02 | 04 | 2 | TG-03 | T-11-03 | MAIN world bridge routes to telegram | unit | `vitest run tests/unit/dispatch/mainWorldBridge.spec.ts` | ✅ | ⬜ pending |
| 11-04-03 | 04 | 2 | TG-04 | — | Send confirmation via editor clearance | unit | `vitest run tests/unit/adapters/telegram-selector.spec.ts` | ❌ W0 | ⬜ pending |
| 11-04-04 | 04 | 2 | — | — | SPA filter includes web.telegram.org | unit | `vitest run tests/unit/dispatch/spaFilter.spec.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/adapters/telegram.fixture.html` — DOM fixture for selector tests
- [ ] `tests/unit/adapters/telegram-selector.spec.ts` — covers TG-03, TG-04
- [ ] `tests/unit/adapters/telegram-format.spec.ts` — covers D-140..D-145 truncation
- [ ] `tests/unit/adapters/telegram-login.spec.ts` — covers TG-02 DOM detection

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Telegram Web K paste + send E2E | TG-03, TG-04 | Needs live Telegram Web K session | 1. Open web.telegram.org/a/ 2. Enter send_to URL in popup 3. Click send 4. Verify message appears in chat |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
