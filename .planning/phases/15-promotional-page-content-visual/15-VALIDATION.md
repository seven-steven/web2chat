---
phase: 15
slug: promotional-page-content-visual
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-02
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + marketing `site:verify` build verifier + manifest verifier |
| **Config file** | `/Users/seven/data/coding/projects/seven/web2chat/vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/unit/marketing/site-content.spec.ts && pnpm test -- tests/unit/marketing/proof-labels.spec.tsx && pnpm test -- tests/unit/marketing/app-sections.spec.tsx && pnpm site:build && pnpm site:verify` |
| **Full suite command** | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:i18n-coverage && pnpm site:build && pnpm site:verify && pnpm verify:manifest` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/unit/marketing/site-content.spec.ts && pnpm test -- tests/unit/marketing/proof-labels.spec.tsx && pnpm test -- tests/unit/marketing/app-sections.spec.tsx && pnpm site:build && pnpm site:verify`
- **After every plan wave:** Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:i18n-coverage && pnpm site:build && pnpm site:verify && pnpm verify:manifest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 15-01 | 1 | MSG-01 | T-15-01 / T-15-02 | Hero data exposes structured-page + prompt narrative and does not overclaim unsupported flows | unit | `pnpm test -- tests/unit/marketing/site-content.spec.ts` | ✅ | ⬜ pending |
| 15-01-01 | 15-01 | 1 | MSG-02 | T-15-01 | Use-case getters expose only the three approved scenarios | unit | `pnpm test -- tests/unit/marketing/site-content.spec.ts` | ✅ | ⬜ pending |
| 15-01-01 | 15-01 | 1 | MSG-03 | T-15-02 | Payload getter preserves exact `title/url/description/create_at/content/prompt` order and values | unit | `pnpm test -- tests/unit/marketing/site-content.spec.ts` | ✅ | ⬜ pending |
| 15-01-01 | 15-01 | 1 | PROOF-01 | T-15-01 | Shipped platform data is limited to OpenClaw, Discord, Slack, Telegram; Telegram remains risk-labeled | unit | `pnpm test -- tests/unit/marketing/site-content.spec.ts` | ✅ | ⬜ pending |
| 15-02-01 | 15-02 | 2 | PROOF-02 | T-15-04 / T-15-06 | Stepper renders the fixed three-step flow in the approved order with visible semantics | unit | `pnpm test -- tests/unit/marketing/proof-labels.spec.tsx` | ✅ | ⬜ pending |
| 15-02-01 | 15-02 | 2 | PROOF-03 | T-15-05 / T-15-06 | Every mockup shows `mockup` plus public metadata row with source/status/version note | unit | `pnpm test -- tests/unit/marketing/proof-labels.spec.tsx` | ✅ | ⬜ pending |
| 15-01-01 | 15-01 | 1 | CTA-01 | T-15-03 | Primary CTA target is explicit and stable at the repository root | unit | `pnpm test -- tests/unit/marketing/site-content.spec.ts` | ✅ | ⬜ pending |
| 15-04-02 | 15-04 | 4 | CTA-02 | T-15-11 | Secondary CTA resolves to the README install section and remains verifier-backed | integration | `pnpm verify:readme && pnpm test -- tests/unit/scripts/marketing-verify-build.spec.ts` | ✅ | ⬜ pending |
| 15-01-01 | 15-01 | 1 | TRUST-01 | T-15-03 | Privacy facts stay local-first, user-triggered, no telemetry, no third-party analytics | unit | `pnpm test -- tests/unit/marketing/site-content.spec.ts` | ✅ | ⬜ pending |
| 15-01-01 | 15-01 | 1 | TRUST-02 | T-15-02 / T-15-03 | Permission facts match production manifest truth and exclude dev-only `tabs` or static production `<all_urls>` claims | unit + integration | `pnpm test -- tests/unit/marketing/site-content.spec.ts && pnpm verify:manifest` | ✅ | ⬜ pending |
| 15-03-01 | 15-03 | 3 | MSG-01 / PROOF-02 / CTA-01 | T-15-07 / T-15-09 | Final app composition preserves section order, heading outline, CTA placement, and locale-toggle reachability | unit | `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/marketing/site-content.spec.ts` — data truth coverage for MSG-01, MSG-02, MSG-03, PROOF-01, CTA-01, TRUST-01, TRUST-02
- [ ] `tests/unit/marketing/proof-labels.spec.tsx` — mockup label, metadata row, and flow/proof coverage for PROOF-02, PROOF-03
- [ ] `tests/unit/marketing/app-sections.spec.tsx` — section order, CTA placement, semantic outline coverage
- [ ] `pnpm test:i18n-coverage` must include Phase 15 locale keys before wave completion

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-02
