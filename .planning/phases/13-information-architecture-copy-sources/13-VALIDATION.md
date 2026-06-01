---
phase: 13
slug: information-architecture-copy-sources
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
approved: 2026-06-02
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for docs-only planning artifact execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Docs assertions with `rg`; production manifest verification with project script |
| **Config file** | `package.json` scripts; production permissions source in `wxt.config.ts` |
| **Quick run command** | `rg "CLM-|Allowed wording|Forbidden wording|Owner update trigger|PROJECT.md|PRIVACY.md|STORE-LISTING.md|wxt.config.ts" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` |
| **Full suite command** | `pnpm verify:manifest && rg "CLM-|Allowed wording|Forbidden wording|Owner update trigger|Shipped|Deferred|Known risk|PROJECT.md|PRIVACY.md|STORE-LISTING.md|wxt.config.ts" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick run command.
- **After every plan wave:** Run the full suite command.
- **Before `/gsd:verify-work`:** Full suite must be green.
- **Max feedback latency:** 15 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | MSG-01, MSG-02, MSG-03, TRUST-03 | T-13-01 | Public page outline separates shipped, deferred, and known-risk claims before copy is implemented. | docs assertion | `rg "Hero|use cases|structured-payload|Core flow|Known limits|CTA|Shipped|Deferred|Known risk" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ W1 creates artifact | ⬜ pending |
| 13-01-02 | 01 | 1 | TRUST-01, TRUST-02, OPS-02 | T-13-02 | Claims matrix ties privacy and permission statements to source files and production manifest facts. | script + docs assertion | `pnpm verify:manifest && rg "CLM-|PROJECT.md|PRIVACY.md|STORE-LISTING.md|wxt.config.ts|source file / section|verification note" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ W1 creates artifact | ⬜ pending |
| 13-01-03 | 01 | 1 | OPS-01, OPS-02 | T-13-03 | Maintenance rules define owner update triggers for platforms, privacy, permissions, screenshots, CTA, and claims. | docs assertion | `rg "Owner update trigger|Maintenance Rules|platform|privacy|permission|screenshot|CTA|Allowed wording|Forbidden wording" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ W1 creates artifact | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:

- [x] `package.json` contains `verify:manifest`.
- [x] `wxt.config.ts` is the production permission source.
- [x] `rg` assertions cover docs-only artifact checks.
- [x] No new test framework or stubs are required for this docs-only phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claim tone does not overstate shipped scope | MSG-01, MSG-02, TRUST-03 | Tone and over-claiming require editorial judgment beyond string presence. | Read `13-CONTENT-SOURCES.md` and confirm forbidden wording excludes “支持所有聊天平台”, “全自动”, “隐私合规认证”, and “无需任何权限”. |
| Screenshot/asset labels are truthful | OPS-01 | Asset provenance may depend on future Phase 15 assets that do not exist yet. | Confirm maintenance rules require every asset to be labeled as actual screenshot, mockup, diagram, or placeholder with source/date/version. |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or explicit manual-only rationale.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 15s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-02
