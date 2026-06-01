---
phase: 12
slug: feishu-lark-adapter
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-16
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm vitest run tests/unit/adapters/feishu-` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run tests/unit/adapters/feishu-`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | FSL-05 | T-12-01 | Pure function, no side effects | unit | `pnpm vitest run tests/unit/adapters/feishu-format.spec.ts` | W0 | pending |
| 12-02-01 | 02 | 1 | FSL-01, FSL-02 | T-12-02, T-12-03 | URL parsing pure function; DOM detection best-effort | unit | `pnpm vitest run tests/unit/adapters/feishu-match.spec.ts tests/unit/adapters/feishu-login.spec.ts` | W0 | pending |
| 12-03-01 | 03 | 1 | FSL-01, FSL-03 | T-12-04, T-12-05 | hostSuffix for subdomain; DataTransfer text/plain only | unit | `pnpm vitest run tests/unit/adapters/feishu-i18n.spec.ts tests/unit/dispatch/spaFilter.spec.ts` | W0 | pending |
| 12-04-01 | 04 | 1 | FSL-05, FSL-03 | — | i18n key coverage | unit | `pnpm vitest run tests/unit/adapters/feishu-i18n.spec.ts` | W0 | pending |
| 12-05-01 | 05 | 2 | FSL-02, FSL-03, FSL-04 | T-12-06, T-12-07 | Injection guard; rate limit | unit | `pnpm vitest run tests/unit/adapters/feishu-selector.spec.ts` | W0 | pending |

*Status: pending = not yet run*

---

## Wave 0 Requirements

- [ ] `tests/unit/adapters/feishu-match.spec.ts` — stubs for FSL-01 (created in Plan 02)
- [ ] `tests/unit/adapters/feishu-format.spec.ts` — stubs for message formatting (created in Plan 01)
- [ ] `tests/unit/adapters/feishu-selector.spec.ts` — stubs for FSL-03 (created in Plan 05)
- [ ] `tests/unit/adapters/feishu-login.spec.ts` — stubs for FSL-02 (created in Plan 02)
- [ ] `tests/unit/adapters/feishu.fixture.html` — editor DOM fixture (created in Plan 05)
- [ ] `tests/unit/adapters/feishu-i18n.spec.ts` — stubs for FSL-05 (created in Plan 04)

*Note: All test files are created by their respective plans during execution. No separate Wave 0 scaffolding task needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual Feishu Web editor selector validity | FSL-03 | Requires live Feishu Web account + DevTools | Open `{tenant}.feishu.cn/next/messenger` in browser, use F12 to verify `[contenteditable="true"][role="textbox"]` matches the editor, verify send button `[aria-label*="Send"]` exists |
| Send confirmation editor-clear behavior on real Feishu | FSL-04 | Requires live Feishu Web account | Send a message via real Feishu Web, observe if editor textContent clears after send |
| Login wall redirect URL structure | FSL-02 | Requires logged-out Feishu account | Clear cookies, visit `{tenant}.feishu.cn/next/messenger`, observe redirect URL and DOM structure |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
