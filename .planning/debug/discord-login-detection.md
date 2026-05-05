---
status: diagnosed
trigger: "Extension fails to detect Discord's not-logged-in state. Shows generic dispatch timeout instead of NOT_LOGGED_IN error."
created: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## Current Focus

hypothesis: Login detection logic exists but only covers server-side HTTP 302 redirects. Discord uses client-side redirect (SPA loads at /channels/ first, then JS redirects to /login). The first tabs.onUpdated:complete fires with /channels/ URL, pipeline advances past awaiting_complete, and misses the subsequent redirect.
test: Trace code paths for both server-side and client-side redirect scenarios
expecting: Code only catches login redirect if tab URL is /login at the time of the FIRST tabs.onUpdated:complete
next_action: Document root cause and affected files

reasoning_checkpoint:
  hypothesis: "Login detection in onTabComplete only runs during awaiting_complete -> awaiting_adapter transition. When Discord does client-side redirect (SPA shell loads with /channels/ URL first, then JS redirects to /login), the first complete fires with /channels/ URL passing adapter.match(), advancing state to awaiting_adapter. The second complete (after redirect to /login) is ignored because state != awaiting_complete. Additionally, the adapter's defense-in-depth check also misses because at injection time pathname is still /channels/. Result: sendMessage either hangs (Chrome bug) or the adapter times out waiting for editor (5s) + content script destroyed by navigation → sendMessage throws → EXECUTE_SCRIPT_FAILED or hangs → 30s alarm fires = TIMEOUT."
  confirming_evidence:
    - "onTabComplete line 329 skips records not in awaiting_complete state"
    - "Login check only at lines 342-369 inside onTabComplete, which requires state == awaiting_complete"
    - "webNavigation.onHistoryStateUpdated listener also calls onTabComplete but record state already advanced"
    - "tabs.sendMessage has no timeout wrapper (line 226) - relies solely on 30s alarm backstop"
    - "Discord is a React SPA - likely returns HTTP 200 for /channels/ then client-side redirects"
  falsification_test: "If Discord does HTTP 302 server-side redirect (tab URL is already /login when first complete fires), then chrome.tabs.get would return /login URL and detection would work. Test: check actual Discord behavior with curl/network tools."
  fix_rationale: "Need to handle the case where adapter injection happens but the page navigates away to /login shortly after. Options: (1) add login URL re-check after adapter injection fails, (2) add tabs.onUpdated listener for state=awaiting_adapter that checks URL, (3) wrap sendMessage with a timeout and URL re-check."
  blind_spots: "Uncertain whether Discord does HTTP 302 vs client-side redirect in all cases. Could vary by browser state (cached session token vs fresh)."

## Symptoms

expected: When user not logged into Discord and extension dispatches, adapter/pipeline should detect /login redirect and return NOT_LOGGED_IN error code
actual: Popup shows generic dispatch timeout
errors: Generic timeout instead of specific NOT_LOGGED_IN error
reproduction: Be logged out of Discord, try to dispatch to a Discord channel
started: Unknown - possibly never implemented

## Eliminated

- hypothesis: Login detection is entirely missing from the codebase
  evidence: Login detection EXISTS in dispatch-pipeline.ts (lines 342-369) AND in discord.content.ts (line 126). NOT_LOGGED_IN error code is defined in failDispatch signature and in adapter response types. E2E test and unit tests exist for login detection.
  timestamp: 2026-05-05T00:10:00Z

## Evidence

- timestamp: 2026-05-05T00:05:00Z
  checked: dispatch-pipeline.ts onTabComplete function
  found: Login detection at lines 342-369 checks actual tab URL after complete. If URL is on adapter host but doesn't match adapter.match(), calls failDispatch with NOT_LOGGED_IN. This logic ONLY runs when record.state === 'awaiting_complete' (line 329 filter).
  implication: Detection works for server-side 302 redirects but not client-side redirects where first complete fires with /channels/ URL.

- timestamp: 2026-05-05T00:06:00Z
  checked: discord.content.ts handleDispatch defense-in-depth check
  found: Line 126 checks window.location.pathname.startsWith('/login'). But adapter is injected right after first complete fires (when URL is still /channels/). The pathname check passes (not /login), adapter proceeds to find editor.
  implication: Defense-in-depth doesn't help when adapter is injected before the redirect happens.

- timestamp: 2026-05-05T00:07:00Z
  checked: tabs.sendMessage in advanceToAdapterInjection (line 226)
  found: No timeout wrapper on sendMessage. If content script is destroyed (page navigates away during async handleDispatch), Chrome may either reject the promise or let it hang indefinitely (known Chrome bug across versions). Only backstop is the 30s alarm.
  implication: If sendMessage hangs, user sees TIMEOUT after 30s instead of NOT_LOGGED_IN.

- timestamp: 2026-05-05T00:08:00Z
  checked: webNavigation.onHistoryStateUpdated listener (background.ts line 139)
  found: Only fires for pushState/replaceState, not for full navigations (window.location.replace). Even if it fires, the record.state check (awaiting_complete) filters it out since state is already awaiting_adapter.
  implication: SPA navigation listener cannot catch the login redirect after pipeline has advanced.

- timestamp: 2026-05-05T00:09:00Z
  checked: Unit test login-detection.spec.ts
  found: Test mocks chrome.tabs.get to directly return the login URL. This tests the happy path (server-side redirect where URL is already /login at time of check). Doesn't test the race condition where URL is /channels/ on first complete then redirects.
  implication: Tests pass but don't cover the real-world client-side redirect scenario.

## Resolution

root_cause: Login detection in onTabComplete only fires during the awaiting_complete->awaiting_adapter transition (line 329 requires state === 'awaiting_complete'). When Discord does a client-side redirect (SPA shell returns HTTP 200 at /channels/ URL, then JS redirects to /login), the first tabs.onUpdated:complete fires with the channel URL, which passes adapter.match() and advances state to awaiting_adapter. The second complete event (after redirect to /login) is ignored because the record state is no longer awaiting_complete. The adapter's defense-in-depth check also fails because at injection time window.location.pathname is still /channels/. The injected content script is then destroyed by the page navigation, and chrome.tabs.sendMessage either hangs (Chrome IPC edge case) or throws (mapped to EXECUTE_SCRIPT_FAILED, not NOT_LOGGED_IN). With no timeout wrapper on sendMessage, the 30s alarm fires as backstop → user sees generic TIMEOUT.
fix:
verification:
files_changed: []
