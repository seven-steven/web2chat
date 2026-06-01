---
phase: 10
slug: slack-adapter
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-11
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm test:unit -- --reporter=verbose` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --reporter=verbose`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | D-128, D-130 | — | escapeSlackMentions breaks mention patterns | unit | `pnpm test:unit -- tests/unit/adapters/slack-format.spec.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | D-128, D-131 | — | composeSlackMrkdwn produces valid mrkdwn | unit | `pnpm test:unit -- tests/unit/adapters/slack-format.spec.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | SLK-01 | T-10-01 | URL match pure, no host escalation | unit | `pnpm test:unit -- tests/unit/adapters/slack-match.spec.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | SLK-02 | T-10-02 | DOM login detection (positive + negative fixtures) | unit | `pnpm test:unit -- tests/unit/adapters/slack-login-detect.spec.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | SLK-02 | — | loggedOutPathPatterns for Slack | unit | `pnpm test:unit -- tests/unit/dispatch/logged-out-paths.spec.ts` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 1 | SLK-01 | — | Registry entry with correct hostMatches | unit | `pnpm test:unit -- tests/unit/dispatch/platform-detector.spec.ts` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 1 | SLK-01 | — | SPA filter includes app.slack.com | unit | `pnpm test:unit -- tests/unit/dispatch/spaFilter.spec.ts` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 1 | SLK-03 | — | MAIN world bridge routes to slack injector | unit | `pnpm test:unit -- tests/unit/dispatch/mainWorldBridge.spec.ts` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 1 | T-10-04 | Static host_permissions limited to known domains | unit | `pnpm test:unit -- tests/unit/scripts/verify-manifest.spec.ts` | ✅ | ⬜ pending |
| 10-03-02 | 03 | 1 | SLK-05 | — | i18n key coverage en + zh_CN 100% | unit | `pnpm test:unit -- tests/unit/adapters/slack-i18n.spec.ts` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 2 | SLK-03 | — | Editor selector three-tier fallback | unit | `pnpm test:unit -- tests/unit/adapters/slack-selector.spec.ts` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 | 2 | SLK-03 | — | MAIN world paste + Enter injection test | unit | `pnpm test:unit -- tests/unit/adapters/slack-selector.spec.ts` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 | 2 | SLK-04 | — | Send confirmation (editor clear check) | unit | `pnpm test:unit -- tests/unit/adapters/slack-selector.spec.ts` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 | 2 | SLK-04 | — | Content script handleDispatch flow | manual | Human UAT on live Slack | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/adapters/slack-format.spec.ts` — covers D-128 mrkdwn formatting + D-130 mention escaping (Plan 01)
- [ ] `tests/unit/adapters/slack-match.spec.ts` — covers SLK-01 URL matching (Plan 02)
- [ ] `tests/unit/adapters/slack-login-detect.spec.ts` — covers SLK-02 DOM detection (Plan 02)
- [ ] `tests/unit/adapters/slack-i18n.spec.ts` — covers SLK-05 i18n key coverage (Plan 03)
- [ ] `tests/unit/adapters/slack-selector.spec.ts` — covers SLK-03 selector fallback + SLK-04 send confirmation (Plan 04)
- [ ] `tests/unit/adapters/slack.fixture.html` — DOM fixture for selector and injection tests (Plan 03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Slack editor paste + send | SLK-03, SLK-04 | Requires logged-in Slack session in Chrome | 1. Open Slack channel 2. Configure send_to with Slack URL 3. Click send 4. Verify message appears in channel |
| Platform icon display in popup | SLK-05 | Requires extension loaded + popup rendering | 1. Enter Slack URL in send_to 2. Verify Slack icon appears next to platform label |
| ToS warning display | D-132 | Requires popup rendering on Slack platform | 1. Select Slack platform 2. Verify ToS warning banner displays |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
