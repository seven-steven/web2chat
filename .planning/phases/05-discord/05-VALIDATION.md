---
phase: 5
slug: discord
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + @playwright/test 1.58 |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `pnpm vitest run tests/unit/adapters/discord` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run tests/unit/adapters/discord`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | ADD-01..09 | TBD | TBD | unit/e2e | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/adapters/discord-format.spec.ts` — compose formatting + truncation + mention escape
- [ ] `tests/unit/adapters/discord-match.spec.ts` — URL matching positive/negative cases
- [ ] `tests/unit/adapters/discord-selector.spec.ts` — ARIA selector fallback + paste injection
- [ ] `tests/unit/adapters/discord.fixture.html` — Discord DOM fixture for selector tests
- [ ] `tests/e2e/discord-dispatch.spec.ts` — end-to-end dispatch via stub Discord page
- [ ] `tests/e2e/discord-channel-switch.spec.ts` — cross-channel safety
- [ ] `tests/e2e/discord-login.spec.ts` — login redirect detection

*Existing vitest + playwright infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Discord paste injection | ADD-02 | Requires real Discord login session | 1. Login to Discord in test browser 2. Navigate to test channel 3. Trigger dispatch from popup 4. Verify message appears in chat |
| ToS footnote visual appearance | ADD-07 | Visual verification needed | 1. Open popup with Discord target 2. Verify footnote text, styling, link |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
