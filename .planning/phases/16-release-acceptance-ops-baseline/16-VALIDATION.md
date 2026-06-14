---
phase: 16
slug: release-acceptance-ops-baseline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-14
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 16 is a release-acceptance phase: it converts static claims rules into
> automated gates. The validation here proves the gates themselves detect
> drift (the gate-testing-the-gate principle).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (unit) + tsx scripts (integration) + GitHub Actions (CI) |
| **Config file** | `vitest.config.ts`; CI at `.github/workflows/ci.yml` |
| **Quick run command** | `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` |
| **Full suite command** | `pnpm test && pnpm typecheck && pnpm lint && pnpm verify:manifest && pnpm site:build && pnpm site:verify && pnpm verify:claims && pnpm verify:readme` |
| **Estimated runtime** | ~25 seconds (test suite ~8s + builds ~12s + verify scripts ~5s) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` (verify-claims logic) OR `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` (a11y)
- **After every plan wave:** Run `pnpm test && pnpm verify:claims && pnpm site:verify`
- **Before `/gsd:verify-work`:** Full suite must be green; `pnpm verify:claims` green; CI workflow green on push
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | TRUST-02 / OPS-02 | — | permission copy === built manifest set | unit | `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | TRUST-01 | — | privacy copy has no forbidden wording | unit | `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` | ❌ W0 | ⬜ pending |
| 16-01-03 | 01 | 1 | TRUST-03 | info-disclosure | platform names only in limits for Feishu/Lark | unit | `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` | ❌ W0 | ⬜ pending |
| 16-01-04 | 01 | 1 | OPS-02 | — | `pnpm verify:claims` runs end-to-end | integration | `pnpm verify:claims` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | BUILD-01/02/03 | — | CI runs site:build/site:verify/verify:readme/verify:claims | CI | `.github/workflows/ci.yml` push run | ❌ W0 (wiring) | ⬜ pending |
| 16-03-01 | 03 | 2 | (a11y / SC3) | — | CtaButton G201 sr-only + visible glyph | unit | `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` | ✅ (extend) | ⬜ pending |
| 16-03-02 | 03 | 2 | (a11y / SC2-3) | — | lang attribute tracks locale signal | unit | `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` | ✅ (extend) | ⬜ pending |
| 16-04-01 | 04 | 1 | OPS-01 / SC4 | — | MAINTENANCE.md documents update paths | manual/doc | grep coverage check | ❌ W0 | ⬜ pending |
| 16-05-01 | 05 | 1 | TRUST-03 / SC5 | info-disclosure | CHANGELOG v1.2 honest boundaries | manual/doc | grep forbidden tokens absent | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/scripts/verify-claims.spec.ts` — RED-first unit test for `assertClaims()` (TDD; covers permission set, privacy forbidden-wording, platform no-leak, locale key parity)
- [ ] `scripts/verify-claims.ts` — GREEN implementation exporting `assertClaims(input, errors)`
- [ ] `apps/marketing/src/styles/index.css` — confirm `.sr-only` class exists; add if absent (Wave 0 investigation: `grep -r "sr-only" apps/marketing/src/ shared/styles/`)
- [ ] *Existing infrastructure (vitest, tsx, happy-dom, wxt build, GitHub Actions) covers all other Phase 16 requirements — no framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MAINTENANCE.md update paths are actionable for a maintainer | OPS-01 / SC4 | doc quality is judgment, not assertion | reviewer follows one update path (e.g. add a platform) and confirms the source-first → artifact-second → page-last chain resolves |
| CHANGELOG v1.2 Known Issues wording is honest, not over-claiming | TRUST-03 / SC5 | honesty is a judgment call; forbidden-token scan is a floor, not a ceiling | reviewer reads each Known Issue against `13-CONTENT-SOURCES.md` CLM-LIMIT-01/02 allowed-wording column |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
