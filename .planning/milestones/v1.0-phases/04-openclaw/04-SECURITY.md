# Phase 04 — OpenClaw Adapter: Security Audit

**Audit date:** 2026-05-04
**Auditor:** gsd-security-auditor (automated)
**ASVS Level:** 1
**Result:** SECURED

## Summary

**Threats Closed:** 16/16
**Mitigated (code-verified):** 6
**Accepted (documented):** 10
**Transferred:** 0
**Unregistered Flags:** 0

All declared threat mitigations are present in the implementation code.
No new unregistered attack surface was detected.

---

## Threat Verification

### Mitigated Threats (code-verified)

| Threat ID | Category | Component | Evidence |
|-----------|----------|-----------|----------|
| T-04-01-01 | Tampering | shared/storage/repos/grantedOrigins.ts | `grantedOriginsItem` typed as `string[]` (shared/storage/items.ts:118). `add()` deduplicates via `!current.includes(origin)` (grantedOrigins.ts:15). All callers use `new URL(url).origin` before calling `add()`: SendForm.tsx:206, App.tsx:72, dispatch-pipeline.ts:118. |
| T-04-02-02 | Spoofing | entrypoints/openclaw.content.ts | `isAdapterDispatch` type guard (lines 46-53) verifies `typeof msg === 'object' && msg !== null && 'type' in msg && msg.type === 'ADAPTER_DISPATCH'`. Listener returns `false` if guard fails (line 60). Only SW can inject content script via `chrome.scripting.executeScript`. |
| T-04-02-03 | Denial of Service | entrypoints/openclaw.content.ts | `waitForElement` (lines 117-142): `setTimeout` disconnects observer at `WAIT_TIMEOUT_MS` (line 134-139). Success path also disconnects (line 128). `settled` flag prevents double resolution. `waitForNewMessage` (lines 144-170): same pattern with timeout (line 162-167) and success disconnect (line 155-156). No infinite observation possible. |
| T-04-03-01 | Elevation of Privilege | SendForm.tsx | `chrome.permissions.request({ origins: [targetOrigin + '/*'] })` at line 213 requests only the specific origin (not wildcards). `targetOrigin` derived from `new URL(props.sendTo).origin` (line 206). Called inside `handleConfirm` which is bound to Confirm button `onClick` (line 333), satisfying Chrome's user gesture requirement. |
| T-04-03-02 | Tampering | GrantedOriginsSection.tsx | `handleRemove` (lines 15-19) calls `chrome.permissions.remove({ origins: [origin + '/*'] })` (line 16, browser-level revoke) AND `grantedOriginsRepo.remove(origin)` (line 17, storage cleanup). Double-action prevents stale grants. |
| T-04-05-01 | Elevation of Privilege | pendingDispatchItem | App.tsx mount Step 0 (lines 68-112): `loadPendingDispatch()` loads intent, then `chrome.permissions.contains({ origins: [targetOrigin + '/*'] })` (line 73) gates execution. Only if `nowGranted === true` (line 76) does dispatch proceed. Deny path clears intent and shows `OPENCLAW_PERMISSION_DENIED` (lines 104-110). dispatch-pipeline.ts also has redundant `chrome.permissions.contains` guard (line 119). |

### Accepted Threats (documented risk)

| Threat ID | Category | Component | Risk Acceptance Rationale |
|-----------|----------|-----------|--------------------------|
| T-04-01-02 | Tampering | shared/dom-injector.ts | `setInputValue` writes plain text via native property-descriptor setter (`setter.call(el, text)` line 11). No innerHTML, no script injection. textarea.value content is not parsed as HTML. |
| T-04-01-03 | Info Disclosure | shared/messaging/result.ts | New error codes (`OPENCLAW_OFFLINE`, `OPENCLAW_PERMISSION_DENIED`) are string enum values only. `Err()` returns `{ code, message, retriable }` -- no internal implementation details exposed. |
| T-04-02-01 | Tampering | shared/adapters/openclaw-format.ts | `composeMarkdown` produces plain string via concatenation (lines 21-28). Content injected via `setInputValue` into textarea.value which is inherently safe (not parsed as HTML). |
| T-04-03-03 | Info Disclosure | ErrorBanner | Error messages display only the origin string (user-provided URL host). No internal implementation details rendered to DOM. |
| T-04-03-04 | DoS | dispatch-pipeline | `chrome.permissions.contains` is a synchronous Chrome API call with no timeout risk. Failures are caught by the top-level `wrapHandler` error boundary. |
| T-04-04-01 | Info Disclosure | E2E tests | Tests run locally only (not in CI). Fixture pages contain no sensitive data. No secrets in test files. |
| T-04-04-02 | EoP | Dev-mode auto-grant | Dev mode builds include `<all_urls>` in host_permissions for testing convenience. Documented limitation. Production builds use `optional_host_permissions` correctly. See RESEARCH.md Pitfall 3. |
| T-04-05-02 | Tampering | pendingDispatchItem | `storage.local` is only writable by the extension itself. Same trust boundary as `popupDraft` which already stores similar data. |
| T-04-05-03 | Info Disclosure | DispatchStartInput | Pending dispatch stores the same data (snapshot, prompt, send_to) as `popupDraft`. Same sensitivity level. Cleared on successful dispatch via `clearPendingDispatch()`. |
| T-04-06-01 | N/A | E2E tests | Test files have no security implications. No runtime code, no user-facing surface. |

---

## Unregistered Flags

None.

All threat flags reported in SUMMARY files map to existing threat IDs:
- `threat_flag:T-04-02-02` (04-02-SUMMARY.md) -> T-04-02-02 (verified CLOSED)
- `threat_flag:T-04-02-03` (04-02-SUMMARY.md) -> T-04-02-03 (verified CLOSED)

---

## Audit Methodology

- **Disposition: mitigate** -- grep for declared mitigation pattern in cited implementation files; verified exact code location (file:line).
- **Disposition: accept** -- verified the risk is inherent to the design and the rationale is sound; documented in this SECURITY.md as the accepted risks log.
- **Threat flags** -- cross-referenced SUMMARY.md threat flags against the threat register; all mapped to existing IDs.
- **ASVS Level 1** -- basic verification of declared mitigations. No penetration testing or dynamic analysis performed.
- **Config: block_on: high** -- no high-severity open threats found.

---

*Generated by gsd-security-auditor on 2026-05-04*
