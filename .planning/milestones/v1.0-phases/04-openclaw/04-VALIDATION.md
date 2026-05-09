---
phase: 4
slug: openclaw
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-01
updated: 2026-05-02
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (unit) + Playwright 1.58 (E2E) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `pnpm vitest run --reporter=dot` |
| **Full suite command** | `pnpm vitest run && pnpm playwright test` |
| **Estimated runtime** | ~15 seconds (unit) + ~30 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=dot`
- **After every plan wave:** Run `pnpm vitest run && pnpm playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 01 | 1 | ADO-03, ADO-06, ADO-07 | T-04-01-01 | grantedOrigins deduplicates; no arbitrary objects | unit | `pnpm vitest run tests/unit/dom-injector tests/unit/repos/grantedOrigins` | created by plan | ⬜ pending |
| 04-01-T2 | 01 | 1 | ADO-06, ADO-07 | — | N/A | unit | `pnpm vitest run tests/unit/dom-injector tests/unit/repos/grantedOrigins` | created by plan | ⬜ pending |
| 04-02-T1 | 02 | 2 | ADO-01, ADO-04 | T-04-02-02, T-04-02-03 | Type guard validates msg; MutationObserver always disconnected | typecheck | `pnpm typecheck` | created by plan | ⬜ pending |
| 04-02-T2 | 02 | 2 | ADO-01, ADO-02 | — | N/A | unit | `pnpm vitest run tests/unit/adapters/openclaw-match tests/unit/adapters/openclaw-compose` | created by plan | ⬜ pending |
| 04-03-T1 | 03 | 3 | ADO-06 | T-04-03-01 | Permission requested for specific origin only; requires user gesture | typecheck | `pnpm typecheck` | existing | ⬜ pending |
| 04-03-T2 | 03 | 3 | ADO-06, ADO-07 | T-04-03-02 | Double-action remove (chrome.permissions + storage) | typecheck+lint | `pnpm typecheck && pnpm lint` | created by plan | ⬜ pending |
| 04-04-T1 | 04 | 4 | ADO-05 | — | N/A | e2e | `pnpm playwright test tests/e2e/openclaw-dispatch` | created by plan | ⬜ pending |
| 04-04-T2 | 04 | 4 | ADO-05 | — | N/A | e2e+unit | `pnpm playwright test tests/e2e/openclaw-offline tests/e2e/openclaw-permission && pnpm vitest run tests/unit/popup/permission-deny` | created by plan | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/dom-injector/setInputValue.spec.ts` — setInputValue helper tests (created by Plan 01 Task 2)
- [ ] `tests/unit/repos/grantedOrigins.spec.ts` — storage repo CRUD tests (created by Plan 01 Task 2)
- [ ] `tests/unit/adapters/openclaw-match.spec.ts` — match() URL pattern tests (created by Plan 02 Task 2)
- [ ] `tests/unit/adapters/openclaw-compose.spec.ts` — compose() formatting tests (created by Plan 02 Task 2)
- [ ] `tests/e2e/fixtures/ui/chat/index.html` — local OpenClaw stub page for E2E (created by Plan 04 Task 1)
- [ ] `tests/unit/popup/permission-deny.spec.ts` — permission deny path unit test (created by Plan 04 Task 2)

*Existing infrastructure (Vitest + Playwright + fake-browser) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Permission dialog appearance | ADO-06 | Browser permission dialogs cannot be automated in dev mode (auto-grants with `<all_urls>`) | Verify in production build that dialog appears on first OpenClaw dispatch to unlisted origin |

*Permission deny path is covered by unit test (mock chrome.permissions.request → false). All other behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
