---
phase: 7
slug: distribution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 + tsx scripts |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm typecheck && pnpm lint && pnpm test` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck && pnpm lint && pnpm test`
- **After every plan wave:** Run full suite + verify:manifest + verify:zip
- **Before `/gsd-verify-work`:** Full suite must be green + all documentation files present + anchor validation green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | DST-01 | — | N/A | smoke (script) | `pnpm build && pnpm zip && tsx scripts/verify-zip.ts` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | DST-02 | — | N/A | lint (script) | `tsx scripts/verify-readme-anchors.ts` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 1 | DST-03 | — | N/A | unit | `pnpm verify:manifest` | ✅ | ⬜ pending |
| 07-04-01 | 04 | 1 | DST-04 | — | N/A | lint (script) | `tsx scripts/verify-readme-anchors.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-zip.ts` — asserts zip structure (DST-01: file count, manifest at root, no source maps, required icons)
- [ ] `scripts/verify-readme-anchors.ts` — validates bilingual anchor parity (DST-04) + PRIVACY.md file existence (DST-02)

*Existing infrastructure covers DST-03 via `scripts/verify-manifest.ts`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CWS dashboard upload | DST-01 | Requires CWS developer account | Upload zip to CWS dashboard "Upload draft" |
| Privacy policy content review | DST-02 | Legal language quality | Read PRIVACY.md for completeness and formal tone |
| README user experience | DST-04 | Subjective documentation quality | Read README for clarity and completeness |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
