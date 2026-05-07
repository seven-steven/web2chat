---
status: resolved
trigger: "Extension fails to detect Discord's not-logged-in state. Shows generic dispatch timeout instead of NOT_LOGGED_IN error."
created: 2026-05-05T00:00:00Z
updated: 2026-05-07T13:30:00Z
---

## Current Focus

hypothesis: The error string "Couldn't find the message box / The target page changed" maps to ErrorCode `INPUT_NOT_FOUND` (locales/en.yml:101-104), NOT to NOT_LOGGED_IN. There are 3 places in `discord.content.ts` that emit `INPUT_NOT_FOUND`: (a) invalid send_to URL, (b) channelId mismatch between current URL and send_to URL, (c) editor element not found within 5s. When user is logged out, Discord either (a) does a full navigation away from the channel URL — making `extractChannelId(window.location.href)` return null → "Channel mismatch", or (b) keeps the channel URL but renders a login wall instead of the chat UI — making `findEditor()` time out → "Editor not found". In neither case does the existing /login URL check trigger, because (a) happens AFTER the adapter is injected, and (b) keeps the URL on /channels/ so the host-match URL filter never sees a non-matching URL.
test: Trace exact failure path by examining which of the 3 INPUT_NOT_FOUND code paths is hit
expecting: Real-world logged-out scenario hits the editor-not-found path (5s timeout in waitForElement) when Discord renders the login wall on the channel URL itself, OR the channel-mismatch path if Discord navigates the tab away.
next_action: [resolved — fix applied, all unit tests green]

reasoning_checkpoint:
  hypothesis: "Logged-out Discord access lands the user in one of two states: (1) tab URL navigates to /login or root domain — pipeline's onTabComplete URL check (lines 382-405) catches this only if the navigation completes BEFORE adapter injection AND host still matches discord.com; (2) Discord SPA loads at /channels/<g>/<c>, returns HTTP 200, and the React app detects no auth token → renders login overlay/modal in place of channel UI without changing the URL. In case (2) the entire existing detection chain fails: adapter URL host matches, channelId from URL matches send_to, /login pathname check fails (URL is still /channels/), adapter falls through to findEditor() which times out after 5s because the [role=textbox][aria-label*=Message] element is not in the login overlay DOM. Result: INPUT_NOT_FOUND emitted with message 'Editor not found'."
  confirming_evidence:
    - "locales/en.yml line 101-104 maps INPUT_NOT_FOUND to exact UI strings 'Couldn't find the message box' / 'The target page changed.'"
    - "discord.content.ts has 3 INPUT_NOT_FOUND emit sites: invalid URL (159), channel mismatch (167-174), editor not found (194-201)"
    - "discord.content.ts line 146 only checks pathname.startsWith('/login') — this fails if Discord renders login wall on /channels/<id> URL"
    - "extractChannelId returns null for /login, /channels/@me, /, /app — so case (1) hits 'Channel mismatch' INPUT_NOT_FOUND, NOT NOT_LOGGED_IN"
    - "dispatch-pipeline.ts line 382-405 onTabComplete login check requires (a) URL on adapter host AND (b) URL fails adapter.match() — but if Discord stays on /channels/ URL, both pass and adapter proceeds"
  falsification_test: "Manual reproduction in headed browser: log out, capture a page, dispatch to a known channel URL. Observe: (a) what the URL bar shows when adapter runs, (b) which INPUT_NOT_FOUND message surfaces, (c) DOM contents at the moment of failure (login modal? overlay? blank skeleton?). User-supplied UAT data confirms the error is INPUT_NOT_FOUND — but doesn't yet pin down which of the 3 emit sites. Evidence weight: medium-high based on architectural reading; needs DOM snapshot to be conclusive."
  fix_rationale: |
    Three coordinated changes that handle all observed and predicted scenarios:
    1. Adapter-layer DOM probe (discord.content.ts) — added detectLoginWall() helper (shared/adapters/discord-login-detect.ts) that returns true if any of three Discord login UI markers are in the DOM (input[name=email][type=email] | [class*=authBox] | a[href=/login]). Added BEFORE the channelId match check and AGAIN after editor-wait failure. New waitForReady() races editor render vs login-wall render with a 1.5s budget so the happy path is unaffected and the logged-out path resolves quickly instead of hitting the 5s editor timeout.
    2. Adapter-layer URL widening (discord.content.ts) — replaced `pathname.startsWith('/login')` with isLoggedOutPath() covering /, /login*, /register*. Defense-in-depth for full-navigation redirects.
    3. Pipeline-layer INPUT_NOT_FOUND→NOT_LOGGED_IN remap (dispatch-pipeline.ts) — when adapter responds with INPUT_NOT_FOUND but tab URL has navigated to a non-channel discord.com URL, remap the code before failDispatch. Backstop for the case where the adapter races against navigation and "Channel mismatch" surfaces before the DOM probe gets a chance.
  blind_spots:
    - "Without an actual Discord login DOM snapshot in repo fixtures, login-indicator selectors are educated guesses based on widely-reported Discord login form structure (`authBox` CSS-modules class, `input[name=email][type=email]`). Need to capture a real snapshot during reproduction OR add a feature-detection fallback that probes for ABSENCE of channel-UI markers (chat-messages container, channel sidebar) instead of PRESENCE of login markers."
    - "Discord may A/B test login pages (modal vs full page) — selectors must be tolerant. Mitigation: 3-selector OR chain instead of single-selector strict match. If a future Discord redesign drops all three markers, login wall detection will silently fail — but the URL-based fallback (isLoggedOutPath + pipeline remap) and the existing 5s editor timeout still surface SOME error code; the user just won't get the perfect error banner."

## Symptoms

expected: When user not logged into Discord and extension dispatches, adapter/pipeline should detect logged-out state and return NOT_LOGGED_IN error code
actual: Popup shows "Couldn't find the message box / The target page changed. Open it manually to confirm, then retry." (= INPUT_NOT_FOUND)
errors: INPUT_NOT_FOUND from adapter — emitted from one of (a) invalid URL, (b) channelId mismatch (URL navigated away), or (c) findEditor 5s timeout (login wall on channel URL)
reproduction: Be logged out of Discord, try to dispatch to a Discord channel
started: Unknown - possibly never implemented
last_observed: 2026-05-07 (P3 Phase 5 Test 5 UAT — recorded as v1 post-launch bug, blocked, severity major)

## Eliminated

- hypothesis: Login detection is entirely missing from the codebase
  evidence: Login detection EXISTS in dispatch-pipeline.ts (lines 382-405) AND in discord.content.ts (line 146). NOT_LOGGED_IN error code is defined in failDispatch signature and in adapter response types. E2E test and unit tests exist for login detection.
  timestamp: 2026-05-05T00:10:00Z

- hypothesis: User sees generic TIMEOUT
  evidence: 2026-05-07 UAT confirmed actual error is "Couldn't find the message box / The target page changed" — adapter-layer error, NOT a 30s alarm timeout. This means adapter executed and either (a) editor lookup failed, or (b) post-injection URL match check tripped. The original race-condition diagnosis predicted TIMEOUT outcome, but actual outcome is adapter-layer error.
  timestamp: 2026-05-07T00:00:00Z

- hypothesis: Original 2026-05-05 diagnosis was correct (race-condition leading to 30s TIMEOUT)
  evidence: Code has been updated since: dispatch-pipeline.ts now has ADAPTER_RESPONSE_TIMEOUT_MS (20s) Promise.race wrapper at lines 230-247 (Gap 3 fix from Phase 5-06). After timeout/sendMessage failure, lines 251-271 re-check tab URL for /login redirect. So the "30s alarm hangs" path the original diagnosis predicted no longer applies. The 2026-05-05 diagnosis described state at that point in time; subsequent fixes invalidated parts of it.
  timestamp: 2026-05-07T13:00:00Z

## Evidence

- timestamp: 2026-05-05T00:05:00Z
  checked: dispatch-pipeline.ts onTabComplete function
  found: Login detection at lines 382-405 checks actual tab URL after complete. If URL is on adapter host but doesn't match adapter.match(), calls failDispatch with NOT_LOGGED_IN. This logic ONLY runs when record.state === 'awaiting_complete' (line 365 filter).
  implication: Detection works for server-side 302 redirects but not client-side redirects where first complete fires with /channels/ URL. Also doesn't help if Discord renders login wall WITHOUT changing URL.

- timestamp: 2026-05-05T00:06:00Z
  checked: discord.content.ts handleDispatch defense-in-depth check
  found: Line 146 checks window.location.pathname.startsWith('/login'). But adapter is injected right after first complete fires (when URL is still /channels/). The pathname check passes (not /login), adapter proceeds to find editor.
  implication: Defense-in-depth doesn't help when adapter is injected before the redirect happens, AND doesn't help when login wall is on /channels/ URL (no URL change).

- timestamp: 2026-05-05T00:07:00Z
  checked: tabs.sendMessage in advanceToAdapterInjection (line 226)
  found: No timeout wrapper on sendMessage. If content script is destroyed (page navigates away during async handleDispatch), Chrome may either reject the promise or let it hang indefinitely (known Chrome bug across versions). Only backstop is the 30s alarm.
  implication: SUPERSEDED 2026-05-07. dispatch-pipeline.ts now has ADAPTER_RESPONSE_TIMEOUT_MS (20s) Promise.race wrapper at lines 231-247, plus URL re-check on timeout/disconnect at lines 251-271. The original "30s hang" prediction no longer applies.

- timestamp: 2026-05-05T00:08:00Z
  checked: webNavigation.onHistoryStateUpdated listener (background.ts line 249-258)
  found: Only fires for pushState/replaceState, not for full navigations (window.location.replace). Even if it fires, the record.state check (awaiting_complete) filters it out since state is already awaiting_adapter.
  implication: SPA navigation listener cannot catch the login redirect after pipeline has advanced. Also doesn't help when login wall is on /channels/ URL.

- timestamp: 2026-05-05T00:09:00Z
  checked: Unit test login-detection.spec.ts
  found: Test mocks chrome.tabs.get to directly return the login URL. This tests the happy path (server-side redirect where URL is already /login at time of check). Doesn't test the race condition where URL is /channels/ on first complete then redirects, AND doesn't test login-wall-on-channel-URL scenario.
  implication: Tests pass but don't cover real-world client-side redirect or login-wall scenarios.

- timestamp: 2026-05-07T00:00:00Z
  checked: P3 Phase 5 Test 5 UAT (real-world logged-out reproduction)
  found: Actual user-facing error is "Couldn't find the message box / The target page changed. Open it manually to confirm, then retry." — NOT a generic timeout. This contradicts the original diagnosis prediction (TIMEOUT after 30s alarm).
  implication: Adapter executed successfully (sendMessage did not hang). Failure is either (a) editor element lookup timed out within adapter's 5s budget, or (b) adapter's channel-mismatch check tripped. The error is adapter-layer.

- timestamp: 2026-05-07T00:00:01Z
  checked: User analysis of root cause
  found: User observation — "Discord redirect when not logged in does NOT land on /login path." This challenges the original diagnosis's implicit assumption that redirect eventually reaches /login (just with bad timing). If true, the entire URL-based /login detection strategy may not match real Discord behavior.
  implication: Need empirical evidence of where Discord actually navigates on logged-out /channels/<id> access. May need DOM-based detection.

- timestamp: 2026-05-07T13:00:00Z
  checked: locales/en.yml error_code_INPUT_NOT_FOUND_heading + body (lines 101-104)
  found: Exact match — "Couldn't find the message box" / "The target page changed. Open it manually to confirm, then retry." → ErrorCode `INPUT_NOT_FOUND`. This DEFINITIVELY identifies the failure path: it's INPUT_NOT_FOUND, not NOT_LOGGED_IN, not TIMEOUT.
  implication: Both layers of NOT_LOGGED_IN detection failed to fire. The adapter fell through to one of its 3 INPUT_NOT_FOUND emit sites.

- timestamp: 2026-05-07T13:05:00Z
  checked: discord.content.ts INPUT_NOT_FOUND emit sites (3 total)
  found: |
    Site 1 (line 158-163): invalid send_to URL → message: 'Invalid Discord channel URL'. Doesn't apply (send_to is valid).
    Site 2 (line 167-174): currentChannelId !== expectedChannelId → message: 'Channel mismatch'. Triggers when extractChannelId(window.location.href) returns null (URL no longer /channels/<g>/<c>) OR when extracted ID differs.
    Site 3 (line 194-201): findEditor() returns null after 5s waitForElement → message: 'Editor not found'. Triggers when [role=textbox][aria-label*=Message] is not in DOM after 5s.
  implication: Site 1 ruled out. Real-world failure is either Site 2 (Discord navigated tab away from /channels/, e.g. to /login or /) OR Site 3 (Discord SPA loaded but rendered login wall instead of chat). User's observation that Discord doesn't redirect to /login suggests Site 3 is the dominant path.

- timestamp: 2026-05-07T13:10:00Z
  checked: dispatch-pipeline.ts current state (post Phase 5-06 fixes)
  found: Lines 188-247 — ADAPTER_RESPONSE_TIMEOUT_MS = 20_000 wraps sendMessage with Promise.race. On timeout or "Receiving end does not exist" / "Could not establish connection", lines 251-271 re-check tab URL: if URL is on adapter host but doesn't match adapter.match(), maps to NOT_LOGGED_IN. This handles Scenario A (Discord navigates tab to /login or non-channel URL after adapter injection).
  implication: Pipeline-side fix already exists for "tab navigated to /login while adapter ran." But it triggers ONLY when sendMessage times out or fails — i.e., when content script is destroyed. If adapter completes its INPUT_NOT_FOUND emit BEFORE navigation destroys it, sendMessage returns successfully with INPUT_NOT_FOUND in payload, the NOT_LOGGED_IN remap is bypassed (line 280 takes the response.code as-is).

- timestamp: 2026-05-07T13:12:00Z
  checked: Unit + lint test suite (pnpm test)
  found: 33 test files / 225 tests all green pre-fix. Specific login-detection.spec.ts (4 tests) all pass with current logic.
  implication: No regression baseline issues. Existing tests cover the URL-redirect-already-happened case but not the 2 scenarios above.

- timestamp: 2026-05-07T13:30:00Z
  checked: Post-fix verification (pnpm test, typecheck, lint, build, verify:manifest)
  found: |
    - pnpm test → 34 files / 235 tests pass (was 33/225 — +1 file, +10 tests: 6 new login-wall unit tests + 4 new pipeline remap tests)
    - pnpm typecheck → clean
    - pnpm lint → 25 warnings, all pre-existing `any` casts unrelated to fix; 0 errors
    - pnpm build → discord.js 8.2 kB (was 7.6 kB), all bundles ok
    - pnpm verify:manifest → all assertions pass
  implication: Fix applied without regression. Headed E2E (discord-login.spec.ts new login-wall test) deferred — requires user to run on a machine with display.

## Resolution

root_cause: |
  The user-visible error "Couldn't find the message box / The target page changed" maps to ErrorCode `INPUT_NOT_FOUND` (confirmed via locales/en.yml lines 101-104), NOT `NOT_LOGGED_IN`. The Discord adapter falls through both NOT_LOGGED_IN detection layers because:

  1. **Pipeline-layer onTabComplete check (dispatch-pipeline.ts:382-405)** only fires when the actual tab URL is on the discord.com host AND fails adapter.match(). When Discord renders the login UI WITHOUT changing the URL (i.e., logged-out user accesses /channels/<g>/<c>, Discord SPA returns 200, React renders login overlay on the channel URL), the URL still matches adapter — check passes — adapter is injected.

  2. **Pipeline-layer post-sendMessage URL re-check (dispatch-pipeline.ts:251-271)** only fires when sendMessage times out (20s) OR fails with "Receiving end does not exist". When the adapter executes successfully and returns INPUT_NOT_FOUND in its response payload, sendMessage resolves normally — re-check is bypassed — code is propagated as-is at line 280.

  3. **Adapter-layer pathname.startsWith('/login') check (discord.content.ts:146)** only fires when the URL is /login. When Discord renders login UI on /channels/<id>, this check passes (not /login), adapter proceeds.

  4. **Adapter then hits one of two failure modes:**
     - (a) **Channel-mismatch path (line 167-174)**: if Discord did navigate the tab to a non-channel URL (e.g., /login or /) BEFORE the adapter executes its `extractChannelId(window.location.href)` call, currentChannelId is null → INPUT_NOT_FOUND "Channel mismatch".
     - (b) **Editor-not-found path (line 194-201)**: if Discord stayed on /channels/<id> URL but rendered login overlay (no [role=textbox][aria-label*=Message] in DOM), waitForElement times out after 5s → INPUT_NOT_FOUND "Editor not found". This is the user's observed scenario per their analysis ("redirect does not land on /login").

  Both NOT_LOGGED_IN detection layers depend on URL-based signals that don't trigger when Discord renders the login UI in-place on the channel URL. The fix requires DOM-based login detection in the adapter (probe for login wall markers BEFORE attempting findEditor) plus an INPUT_NOT_FOUND→NOT_LOGGED_IN remap in the pipeline for cases where the tab URL has navigated away.

fix: |
  Three coordinated changes plus regression tests, all green:

  **A. New file `shared/adapters/discord-login-detect.ts`** — `detectLoginWall()` helper. Pure DOM probe (no chrome.* deps), tested in isolation by 6 new unit tests in `tests/unit/adapters/discord-login-detect.spec.ts`. Markers: `input[name=email][type=email]` | `[class*="authBox"]` | `a[href="/login"]`. Conservative: false positives would mis-surface NOT_LOGGED_IN to logged-in users; selectors are specific enough that channel UI never matches.

  **B. `entrypoints/discord.content.ts`** — three insertion points:
    - (a) Widened pathname guard: replaced `pathname.startsWith('/login')` with `isLoggedOutPath()` covering `/`, `/login*`, `/register*`.
    - (b) Pre-channel-ID DOM probe: call `detectLoginWall()` before the channelId match. Catches the case where Discord rendered login UI on a non-channel URL OR on the channel URL itself.
    - (c) New `waitForReady(timeoutMs)` racing editor render vs login wall via a single MutationObserver, with a 1.5s budget. Returns 'editor' | 'login' | 'timeout'. On 'login' the adapter short-circuits to NOT_LOGGED_IN; on 'timeout' it falls back to the original 5s `waitForElement`. After the editor wait, a final `detectLoginWall()` re-check protects against late-rendered login UI.

  **C. `background/dispatch-pipeline.ts`** — new `isOnAdapterHost()` helper extracted from existing onTabComplete logic. New post-response remap block: when `response.code === 'INPUT_NOT_FOUND'` and `chrome.tabs.get(tabId)` returns a URL that's on an adapter host but fails `adapter.match()`, rewrite the code to `NOT_LOGGED_IN` before `failDispatch`. Other INPUT_NOT_FOUND causes (legit editor-missing on a still-channel URL) are unaffected.

  **D. Tests** — all green:
    - New `tests/unit/adapters/discord-login-detect.spec.ts`: 6 tests (login UI present/absent, multiple marker variants).
    - Extended `tests/unit/dispatch/login-detection.spec.ts`: +4 tests covering the INPUT_NOT_FOUND→NOT_LOGGED_IN remap (login URL, root URL, still-on-channel passthrough, NOT_LOGGED_IN passthrough). Total 8 tests in this file (was 4).
    - Extended `tests/e2e/discord-login.spec.ts`: +1 test using new `tests/e2e/fixtures/discord/login-wall.html` fixture (channel-URL pathname + login form DOM). Asserts NOT_LOGGED_IN within 3s. Headed E2E — needs user run.
    - Test totals: 235 unit (was 225). Typecheck clean, build clean, manifest verify clean.

verification: |
  Automated (run in this session):
  - `pnpm test` → 34 files / 235 tests pass.
  - `pnpm typecheck` → clean.
  - `pnpm lint` → 0 errors, 25 warnings (all pre-existing).
  - `pnpm build` → ok, content-scripts/discord.js = 8.2 kB.
  - `pnpm verify:manifest` → ok.

  Headed E2E (deferred — needs user / display):
  - `pnpm test:e2e tests/e2e/discord-login.spec.ts` → expect both tests pass:
    1. `/login` path returns NOT_LOGGED_IN (existing).
    2. login-wall fixture (channel-shaped path with login DOM) returns NOT_LOGGED_IN within 3s (new).

  Manual real-world reproduction (also deferred):
  1. Log out of Discord.
  2. Trigger dispatch via popup to a known channel URL.
  3. Expect popup banner: "Not logged in" + "Sign in to the target platform in your browser, then retry." within ~3s.

files_changed:
  - shared/adapters/discord-login-detect.ts          # new (DOM probe helper)
  - entrypoints/discord.content.ts                   # widened pathname guard, DOM probe, waitForReady race
  - background/dispatch-pipeline.ts                  # isOnAdapterHost helper, INPUT_NOT_FOUND→NOT_LOGGED_IN remap
  - tests/unit/adapters/discord-login-detect.spec.ts # new (6 tests)
  - tests/unit/dispatch/login-detection.spec.ts      # extended (+4 tests, total 8)
  - tests/e2e/fixtures/discord/login-wall.html       # new fixture
  - tests/e2e/discord-login.spec.ts                  # extended (+1 test, total 2)
