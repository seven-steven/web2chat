# Pitfalls Research

**Domain:** Chrome MV3 extension + content-script injection into 16 IM/AI Web UIs (MVP: OpenClaw + Discord) + local-only storage + i18n
**Researched:** 2026-04-28
**Confidence:** HIGH (Context7-equivalent official Chrome docs + multiple verified sources)

> Web2Chat's main link is brittle by nature: a single click must (a) wake the SW, (b) snapshot the page, (c) open/activate a tab, (d) wait for an SPA chat UI to mount, (e) inject text into a third-party rich-text editor, and (f) trigger send — across heterogeneous platforms whose DOMs change weekly. Most pitfalls below are about that chain failing silently.

---

## Critical Pitfalls

### Pitfall 1: Setting `input.value =` on React-controlled inputs (does not fire `onChange`)

**What goes wrong:**
Adapter sets `inputElement.value = "Hello"`, sees the text appear, then "send" silently delivers an empty string. React's controlled input treats the typed-in DOM value as out-of-sync with its component state and discards it on next reconcile.

**Why it happens:**
React monkey-patches the native value setter on `HTMLInputElement.prototype` to track changes. Direct property assignment bypasses React's tracker, so React believes "no change happened" and never fires `onChange`. The DOM update is real but invisible to the React state machine.

**How to avoid:**
Use the native setter prototype descriptor, then dispatch a bubbling input event:

```js
const setter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  "value",
).set;
setter.call(inputEl, text);
inputEl.dispatchEvent(new Event("input", { bubbles: true }));
```

For `<textarea>` swap to `HTMLTextAreaElement.prototype`. For checkboxes use the `checked` descriptor and a `click` event. Do NOT cache the descriptor at module load — some apps shadow the prototype.

**Warning signs:**

- "Input visually populates but send button stays disabled."
- React DevTools shows component state still has the old/empty value.
- Toggling focus away/back resets the input to empty.

**Phase to address:** Dispatch Core (shared injection utility) — the single helper must be the only path adapters use to write into `<input>` / `<textarea>`.

---

### Pitfall 2: Lexical / Slate / Draft.js editors ignore DOM mutations entirely (Discord)

**What goes wrong:**
The Discord adapter focuses the chat input, sets `textContent`, dispatches a keypress, and visibly populates the contenteditable — but Lexical immediately reconciles the DOM back to its internal `EditorState`, wiping the injected text. Or worse: the text stays visible but pressing Enter sends an empty message.

**Why it happens:**
Lexical's source of truth is its in-memory `EditorState`, not the DOM. The DOM is a function of the state, computed via reconciliation. Any DOM mutation made outside `editor.update()` is overwritten on the next render tick. The same applies to Slate (used by Notion, Hex, Linear) and Draft.js (legacy Reddit, older Facebook).

**How to avoid:**
Two viable strategies, in order of preference:

1. **Synthetic paste (most reliable across Lexical/Slate/Draft):**

   ```js
   editorEl.focus();
   const dt = new DataTransfer();
   dt.setData("text/plain", text);
   editorEl.dispatchEvent(
     new ClipboardEvent("paste", {
       clipboardData: dt,
       bubbles: true,
       cancelable: true,
     }),
   );
   ```

   `@lexical/rich-text` and Slate's default plugins both handle `paste` events natively.

2. **`beforeinput` + `input` sequence with `inputType: 'insertFromPaste'`** (or `'insertText'` for short content). Construct a real `InputEvent`, not a generic `Event`.

3. **Last resort — main-world bridge:** Inject a `<script>` from the isolated content script, locate the React fiber on the editor element (`editorEl.__reactFiber$<hash>`), walk up to find the Lexical `editor` instance, then call `editor.update(() => { /* $insertText */ })`. Fragile across Discord deploys but the only deterministic path.

Never trust a single technique — adapters should attempt paste first, verify via `MutationObserver` that text landed in the editor's data model (poll `aria-label`, character count badge, or send-button enabled state), then fall back.

**Warning signs:**

- "Send" button never enables despite visible text.
- Text flashes for one frame then disappears.
- Sent message arrives with the old draft content, not the new injection.
- Discord console shows `Lexical: editor.update() must be used` warnings.

**Phase to address:** Discord Adapter — and again documented as the canonical pattern in the Adapter Architecture doc consumed by all v2 platform adapters (Slack, Telegram, Lark all use rich-text editors).

---

### Pitfall 3: Service worker dies mid-dispatch; tab opens but no message sent

**What goes wrong:**
User clicks "Send". SW spawns a tab via `chrome.tabs.create({ url, ... })`, registers a `chrome.tabs.onUpdated` listener to inject when complete, then becomes idle. 30 seconds later (slow Discord cold load + ML compile), the SW is terminated. The listener vanishes. The tab loads but the content script never runs.

**Why it happens:**
MV3 SWs terminate after 30s idle, or after 5 minutes of activity, or when an event takes >5 min to settle. WebSockets do NOT keep a SW alive. Module-scoped variables (the "in-flight dispatch" map) vanish when the SW dies, then return as `undefined` when it wakes.

**How to avoid:**

- **State in `chrome.storage.session`** (in-memory, survives SW restarts within a browser session). Write the dispatch payload keyed by `tabId` BEFORE opening the tab.
- **Re-register listeners synchronously at top level** of the SW script, every wake. Listeners attached inside `async` callbacks are silently lost on the next wake.
- **Make dispatch idempotent and resumable:** the SW listener for `chrome.tabs.onUpdated` should look up `chrome.storage.session.get(tabId)` to find the pending payload, rather than relying on a closure.
- **Use `chrome.scripting.executeScript` programmatic injection**, not module-scoped queues. Re-bind to the latest payload on each wake.
- Avoid the popular keepalive hacks (`chrome.runtime.connect` ping loops) — Chrome team has signaled they will tighten enforcement; relying on them is fragile and Web Store-flaggable.

**Warning signs:**

- Bug repros only after the user has another long-running task between popup-click and target-tab-load.
- Works in dev (DevTools keeps SW alive), fails in production builds.
- Logs show `chrome.tabs.onUpdated` registered but never firing for the dispatch tab.
- Intermittent "Could not establish connection. Receiving end does not exist."

**Phase to address:** Dispatch Core — must be designed as an event-driven state machine from day 1; retrofitting is painful.

---

### Pitfall 4: Top-level `await` and `importScripts` traps in the SW

**What goes wrong:**
Developer writes `const config = await chrome.storage.local.get('settings')` at the top of `service-worker.js` for "clean" initialization. SW fails to register with cryptic error, or initialization races against the first event so `config` is `undefined` when `onMessage` fires.

**Why it happens:**

- Top-level `await` is intentionally disabled in extension SWs.
- `importScripts()` is forbidden when the SW is a module (`"type": "module"` in manifest); pick one (ES modules OR `importScripts`).
- `import()` (dynamic import) is unsupported.
- `importScripts()` after the first event-loop turn fails with "after init" error.

**How to avoid:**

- Treat the SW as **stateless on every wake**. Read what you need from `chrome.storage` inside the event handler, not at module top level.
- For shared init (e.g., loading adapter registry), wrap behind a memoized `getReady(): Promise<State>` and `await` it inside every listener body — never at module scope.
- Decide ESM vs `importScripts` once in manifest and stick with it. ESM is the modern path; `importScripts` is for bundle-everything-into-one-file workflows.
- Bundle adapters into the SW package — never load them from a remote URL (also a Web Store violation, see Pitfall 9).

**Warning signs:**

- `Service worker registration failed. Status code: 15` in `chrome://extensions`.
- First event fires with empty/uninitialized state, subsequent events work fine.
- ESLint clean but extension fails silently in production.

**Phase to address:** Extension Skeleton (Phase 1) — set the SW pattern correctly before any features are written on top.

---

### Pitfall 5: SPA route transition races content-script injection

**What goes wrong:**
Extension navigates Discord tab to `https://discord.com/channels/<id>/<id>`. The tab is already on `discord.com` (different channel), so Chrome does NOT fire `onUpdated` with `status: 'complete'` — the URL changed via `history.pushState` inside Discord's React router. Content script never re-runs. Or it runs but the chat input element for the old channel is in the DOM; injection lands in the wrong room.

**Why it happens:**

- `chrome.tabs.onUpdated` only fires on top-level navigation, not SPA route changes.
- Discord (and Slack, Telegram, Linear) virtualize message lists and reuse the input element across channels — `querySelector` finds it before the channel state has caught up.
- React reconciles asynchronously; the input may be present but not yet bound to the new channel's send handler.

**How to avoid:**

- Always wait for **a channel-specific anchor** (e.g., `[data-list-id="chat-messages-<channelId>"]` on Discord) via `MutationObserver`, not just the input element.
- Use `chrome.webNavigation.onHistoryStateUpdated` to detect SPA pushState navigations and re-trigger injection.
- Adapters expose `waitForReady(targetUrl): Promise<HTMLElement>` that resolves only when (a) URL matches expected, (b) a channel-specific identifier is in the DOM, and (c) the input is focusable. Add a hard timeout (≥10s) with a structured error.
- After injection, verify the dispatch via a "post-condition" observer (e.g., a new message bubble appears in DOM with matching text within N seconds) before declaring success.

**Warning signs:**

- "Sometimes it sends to the wrong channel."
- "Works on cold tab, fails when switching from another channel."
- First injection after browser startup works; rapid second send fails.

**Phase to address:** Dispatch Core (route-aware injection contract) + per-Adapter (channel-specific anchors).

---

### Pitfall 6: DOM-class brittleness — selectors break on weekly Discord/Slack rollouts

**What goes wrong:**
Adapter selects `[class*="textArea-"]` for the Discord input. Two weeks later Discord ships a refactor; the class is now `chatInput__abc12`. Adapter silently fails for all users until next release. Worst case: the selector matches a different element (sidebar search) and the extension dispatches search queries instead of messages.

**Why it happens:**
Discord, Slack, Telegram, WhatsApp Web ship CSS modules with hashed class names that rotate weekly. `aria-*` and `role` attributes are far more stable but rarely first-choice for developers.

**How to avoid:**

- **Selector priority:** `role="textbox"` + `aria-label` (i18n-aware) > stable `data-*` attributes > tag + role > class fragments (last resort).
- Encode multiple fallbacks per element, ordered by stability:
  ```ts
  const SELECTORS = [
    '[role="textbox"][data-slate-editor]', // Slate editor variant
    'div[role="textbox"][contenteditable="true"]',
    '[class*="slateTextArea"]', // last-resort fragment
  ];
  ```
- **Snapshot test the adapter** against a saved DOM fixture per platform, refreshed quarterly. Any selector that matches >1 element is a bug.
- Centralize selectors per platform in a single file with version comments — diffing the file shows when Discord shipped a redesign.
- Build a **canary check**: at runtime, before injection, verify the selected element is unique and matches a stable shape (has expected ARIA attributes). Fail fast with a structured error.

**Warning signs:**

- Bug reports cluster around a specific date (Discord deploy day).
- `querySelector` returns `null` for the chat input but `document.body` has plenty of `contenteditable` divs.
- Adapter starts injecting into the wrong element (e.g., DM search bar).

**Phase to address:** OpenClaw Adapter / Discord Adapter — establish the selector hierarchy and canary pattern in the first adapter and codify it as the contract for all v2 adapters.

---

### Pitfall 7: Login wall — target tab redirects to `/login?redirect_to=...`

**What goes wrong:**
User dispatches to Discord. Tab opens at `https://discord.com/channels/123/456`, immediately redirects to `https://discord.com/login?redirect_to=/channels/123/456`. Adapter waits forever for the chat input that will never appear. User sees a frozen progress indicator in the popup; clicks send again; eventually logs in and gets two copies of the message (or four — see Pitfall 8).

**Why it happens:**
Discord (and every IM with a session-token auth model) redirects unauthenticated users to a login page that preserves the destination. The adapter sees the URL it expects, then watches a DOM that never matches its anchor.

**How to avoid:**

- **Detect login URLs explicitly.** Each adapter declares `loginUrlPatterns: RegExp[]` and the Dispatch Core checks the tab's URL after navigation.
- On login detected: surface a clear popup state ("Please log in to Discord, then click 'Send' again") with a **persisted draft** so the user doesn't retype.
- **Do not auto-retry after login.** Silent retry on auth state change is what creates duplicate-send bugs. Require explicit user action.
- The hard timeout (Pitfall 5) backstops everything — if neither login nor input is detected in N seconds, abort with a "couldn't reach the chat" error.

**Warning signs:**

- "Send hangs forever after I cleared cookies."
- "First send of the day fails, the second works."
- Popup spinner never resolves; user assumes it's broken.

**Phase to address:** Dispatch Core (login-detection lifecycle hook) + per-Adapter (URL patterns).

---

### Pitfall 8: Double-send on retry — user clicks twice, message goes twice

**What goes wrong:**
User clicks Send. Discord is slow loading. After 3s with no feedback, user clicks Send again. Now there are two queued dispatches; both eventually fire, the chat receives the message twice. Worse: an in-flight retry overlaps with a successful first attempt, producing duplicates that are hard to attribute.

**Why it happens:**

- No idempotency key on the dispatch.
- Popup state lost when popup closes; "in-flight" indicator gone.
- SW dispatch tracker stored in module scope, lost on SW restart between clicks.

**How to avoid:**

- Generate a `dispatchId` (UUID) on click, store it in `chrome.storage.session` keyed by `tabId`.
- Adapter checks `chrome.storage.session.get(dispatchId)` before injection — if state is `'sent'` or `'sending'`, refuse to re-inject.
- Disable the popup Send button as soon as click is registered; reflect "in-flight" state from `chrome.storage.session` so the button stays disabled even if popup is reopened.
- After successful injection, write `dispatchId: 'sent'` and clear after 60s.
- Provide a **post-send verification** step — observe the chat message list for the new message before declaring success. If verification fails, the user can retry without risking a duplicate (because the previous dispatchId is still 'sending' and only times out after a known interval).

**Warning signs:**

- User reports "I sent it once but two messages arrived."
- Logs show two `executeScript` calls within seconds of each other to the same tab.

**Phase to address:** Dispatch Core (idempotency contract + popup state synchronization).

---

### Pitfall 9: Web Store rejection — broad `host_permissions`, missing privacy policy, remote code

**What goes wrong:**
Submission rejected after 5–14 day review wait. Reasons typically: (a) `host_permissions: ["<all_urls>"]` requested but justification weak, (b) no privacy policy linked despite handling user data (page snapshots, configured prompts), (c) any remote code path (loading adapter logic from a URL, eval, dynamic Function), (d) excessive permissions vs. what's actually used.

**Why it happens:**
Reviewers in 2025 enforce zero-tolerance on remote code and obfuscation. They scrutinize every `host_permissions` entry against demonstrated use. They read privacy policies and compare against the manifest's permissions and the dashboard's "data usage" disclosures.

**How to avoid:**

- **Don't request `<all_urls>`.** List exact host patterns per adapter:
  ```json
  "host_permissions": [
    "http://localhost:18789/*",
    "https://discord.com/*"
  ]
  ```
  Add new ones as adapters ship. Use `optional_host_permissions` for v2 platforms so users opt in.
- **Use `activeTab` for page-snapshot capture** — it grants temporary permission on user-gesture (icon click) without `host_permissions`. Combine with programmatic `chrome.scripting.executeScript` from the SW.
- **Bundle every adapter inside the extension package.** No `fetch().then(eval)`, no `new Function()`, no remote `<script src>`. Web Store treats remote code as auto-rejection.
- **Default CSP is non-negotiable for `extension_pages`.** Don't try to relax it; you can't add `unsafe-eval` or `unsafe-inline` there. If a library needs `eval`, isolate it under `isolated_world` CSP relaxation, not `extension_pages`.
- **Privacy policy required.** Web2Chat captures page content (URL, title, description, body) — that triggers the policy requirement. Publish a minimal policy stating: data is captured only on icon click; stored locally in `chrome.storage.local`; never transmitted to any third party except the user-chosen IM destination via direct browser navigation.
- **Pre-submission checklist:**
  - [ ] Test the packed `.zip` build locally before submitting.
  - [ ] Each permission has a justification in the dashboard form.
  - [ ] Provide reviewer test credentials for OpenClaw / Discord (a test server).
  - [ ] Privacy practices tab matches the actual code behavior.

**Warning signs:**

- Rejection email cites "Yellow Magnesium" (general behavior mismatch) or "Blue Argon" (permissions excessive).
- Review takes >7 days for an established account → they're scrutinizing.

**Phase to address:** Distribution / Pre-Release — but the manifest design must be right from Phase 1; retrofitting host permissions late often requires a permission upgrade prompt to existing users (which spikes uninstall rate).

---

### Pitfall 10: Popup state lost — draft and dispatch progress vanish on focus loss

**What goes wrong:**
User opens popup, types a long prompt, clicks somewhere else by accident. Popup closes. Reopens popup — empty. Or: clicks Send, then opens popup again to verify status; popup is blank with no "in-flight" indicator.

**Why it happens:**
Popup HTML is reloaded fresh every time the user clicks the action icon. Module-scoped variables, React state, all gone. `localStorage` works in popup but is unavailable to the SW (Web Storage API is incompatible with SWs).

**How to avoid:**

- **Persist every popup input to `chrome.storage.local` on change** (debounced 100–250ms). Restore on mount.
- **Track dispatch lifecycle in `chrome.storage.session`** keyed by `dispatchId`. Popup subscribes via `chrome.storage.onChanged`.
- **No `localStorage` anywhere.** Use `chrome.storage` for popup ↔ SW ↔ content-script consistency.
- Treat the popup as a **view onto storage state**, not a stateful component. Every render reads from storage.

**Warning signs:**

- "I lost my draft when I clicked away."
- "I clicked Send but reopening the popup looks like nothing happened."
- Bug only repros on slow machines (popup re-mount race vs. write completion).

**Phase to address:** Popup UI (Phase 2/3) — establishes the storage-backed pattern before features expand.

---

### Pitfall 11: i18n — `__MSG_*__` not supported in popup HTML body, no plural rules

**What goes wrong:**
Developer puts `<button>__MSG_send__</button>` in `popup.html` expecting Chrome to substitute. It renders literally. Or: developer writes `chrome.i18n.getMessage('files_moved', [count])` for "{count} file moved" and finds Chrome has no plural support — output reads "1 file moved" / "5 file moved".

**Why it happens:**

- Chrome's `__MSG_*__` substitution works in `manifest.json` and CSS, but **not in HTML body content**. (Documented as "may be a feature in the future" — not currently supported.)
- `chrome.i18n` deliberately does not implement CLDR plural rules. The official guidance is "use plural-neutral phrasing" (e.g., "Files moved: 1").
- `getMessage()` supports only positional `$1`–`$9` substitutions, max 9, no named placeholders, no number/date formatting.
- No runtime locale switching — Chrome locks the locale to browser UI language.

**How to avoid:**

- **Populate popup HTML via JS at mount:** `document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = chrome.i18n.getMessage(el.dataset.i18n))`. Keep this helper in one file.
- **Plural-neutral phrasing is a constraint** — write all UI copy as "Items: 5" rather than "5 items". Document this in the i18n style guide.
- For **runtime locale switching** (zh ↔ en in the popup), don't rely on `chrome.i18n`. Roll a thin loader that fetches `_locales/<lang>/messages.json` via `fetch(chrome.runtime.getURL(...))` and stores the user's choice in `chrome.storage.local`.
- Use native `Intl.NumberFormat` / `Intl.DateTimeFormat` for number/date formatting. Don't try to embed numbers in `__MSG_*__` strings.
- **Lint-enforce no hardcoded user-facing strings.** Add an ESLint rule banning string literals in JSX/HTML that aren't through the i18n helper.

**Warning signs:**

- Popup shows literal `__MSG_send__` text.
- Plural strings read awkwardly in either zh or en.
- Switching locale in extension settings has no effect (because Chrome's locale is locked to browser UI).

**Phase to address:** i18n Phase — set the JS-based substitution + custom locale-loader pattern before any UI strings exist.

---

### Pitfall 12: Discord ToS — automating user accounts risks bans

**What goes wrong:**
Web2Chat injects messages into a user's Discord session. Discord's ML-based spam detection flags repetitive sends; user account is suspended. User blames the extension.

**Why it happens:**
Discord's ToS explicitly prohibits automation of user accounts ("selfbots"). Their detection considers cadence, message similarity, and user reports. Even infrequent automation can be flagged when combined with other signals (multi-account, VPN, fresh account).

**How to avoid:**

- **Frame the extension's behavior as user-initiated, one-shot dispatches.** Each dispatch requires an explicit popup click — never auto-fire on a schedule, never queue in batches.
- **Rate-limit defensively.** Reject dispatches faster than 1 per 5 seconds with a UI message, even if the user is willing to wait. Repeated rapid sends are the strongest spam signal.
- **Document the risk** in the README and Web Store listing: "Web2Chat dispatches a single message per click. Discord may flag accounts that exceed normal usage." Set user expectations.
- Where feasible, encourage users to **send to OpenClaw / their own Agent infrastructure** rather than public Discord channels. The Discord adapter is for personal channels and small servers, not broadcast.
- **Do not pre-format messages with bot-like signatures** ("Sent via Web2Chat") — those increase spam-classifier scores.
- For v2: provide an opt-in "use Discord Bot API" path that requires the user to register their own bot — moves dispatch off the user account.

**Warning signs:**

- User reports "my Discord got temp-banned after using this."
- Discord adds new captcha/challenge flows specifically on the message send path.

**Phase to address:** Discord Adapter (rate-limiting + user-facing risk disclosure) + Distribution (README + listing copy).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut                                                                       | Immediate Benefit                  | Long-term Cost                                                                                               | When Acceptable                                                                |
| ------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Use `<all_urls>` host_permissions to "skip the per-platform manifest plumbing" | Faster Phase 1 prototype           | Web Store rejection or warning at submission; user-trust hit; no path back without permission upgrade prompt | Never for shipped extension                                                    |
| Module-scoped state in SW ("it's just a small map of in-flight tabs")          | Simpler than storage round-trips   | Silent data loss on SW restart; entire dispatch chain breaks intermittently                                  | Never for any state that must survive past one event handler                   |
| Class-fragment selectors (`[class*="textArea-"]`) without ARIA fallback        | Quick to write while iterating     | Adapter breaks on next Discord deploy with no warning                                                        | Inside dev fixtures; never as the primary selector in shipped adapter          |
| Hardcoded English strings in popup ("we'll add i18n later")                    | Faster Phase 2 popup ship          | Every retrofitted string is a regression risk; translators get inconsistent context                          | Never — set up i18n helper before writing any UI string                        |
| `localStorage` in popup for draft persistence                                  | One-line fix vs. async storage API | Popup ↔ SW state desync (SW can't read it); migration pain when adding sync                                  | Never (use `chrome.storage.local` from day 1)                                  |
| Single global "send" button with no idempotency key                            | Trivial UX                         | Double-send bug, hard to debug, support ticket pile                                                          | Never for any dispatch path                                                    |
| Skipping post-send verification ("if executeScript resolved, it sent")         | Removes a 1–2s wait                | Silent failures when Lexical reconciles away injection                                                       | OK for OpenClaw (simpler input), never for Discord/Slack/Lexical-class editors |
| MV3 keepalive ping hack                                                        | Keeps SW alive across slow loads   | Chrome team has signaled tightening; potential Web Store flag                                                | Never as a designed-in feature; emergency only with a feature flag             |
| Logging full page content + user prompt to console                             | Easy debugging                     | Privacy footgun; CWS reviewer sees PII in `chrome://extensions` console screenshots                          | OK with `__DEV__` guard that strips before bundling                            |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration                   | Common Mistake                                                                | Correct Approach                                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord Web                   | Treat `discord.com/channels/.../...` as a stable URL — navigate, wait, inject | Detect login redirect; wait for channel-specific anchor (not just input element); verify post-send via DOM observer                                                       |
| Discord Lexical editor        | Set `textContent` or `value`, dispatch `input` event                          | Use synthetic `paste` ClipboardEvent with DataTransfer; or main-world bridge to `editor.update()`                                                                         |
| OpenClaw localhost            | Trust `http://localhost:18789` always reachable                               | Probe with a fast `fetch` + 2s timeout before dispatching; clear error if local server isn't running                                                                      |
| Slack / Telegram (v2)         | Reuse Discord adapter wholesale because "they're all React"                   | Each uses a different editor (Slack: Slate, Telegram: own contenteditable). Selector hierarchy + injection technique must be per-platform                                 |
| WhatsApp Web (v2)             | Inject via DOM                                                                | E2E-encrypted clients enforce stricter input integrity; programmatic injection often fails or triggers security warnings. May not be feasible — flag as research-required |
| Signal (v2)                   | Same as above                                                                 | Probably infeasible for v1 of v2 milestone — document as a known limitation                                                                                               |
| Page metadata (`description`) | Read `document.querySelector('meta[name="description"]').content` only        | Fall back through `og:description` → `twitter:description` → first paragraph; many SPAs render meta tags client-side, so read AFTER initial paint                         |
| Page `content` capture        | Use `document.body.innerText` directly                                        | Trim whitespace, normalize newlines, cap at a reasonable size (e.g., 50KB raw → maybe 8KB sent) to avoid Discord's 2000-char message cap                                  |
| `chrome.tabs.create`          | Don't pass `active: false` and assume injection still works                   | Some platforms (Discord) only fully render when tab is focused. Active-tab injection is more reliable                                                                     |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap                                                                                       | Symptoms                                                                   | Prevention                                                                                                                | When It Breaks                                               |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Read-modify-write of full settings object on every storage update                          | Silent loss of concurrent updates (popup + content script writing at once) | Per-key writes; or single-writer pattern via SW; structure history as `history.<id>` keys not one big array               | ~10s of saved prompts/sends with rapid usage                 |
| Saving full page `content` (50KB+) into `chrome.storage.local` history                     | Approaching 10MB quota; slow popup mount; storage warnings                 | Cap stored content per entry; rotate history (keep last N); use `getBytesInUse()` to warn at 80%                          | After ~200 captures of content-heavy pages                   |
| `MutationObserver` watching `document.body` with `subtree: true` for every adapter forever | Browser tab CPU pegged; dropped frames on long Discord sessions            | Disconnect observer immediately on element found; observe smallest stable ancestor; combine with one-shot promise wrapper | After SPA route change leaves a leaked observer per dispatch |
| `waitForElement` polling tight loop instead of MutationObserver                            | High CPU, especially on virtualized chat lists                             | Use MutationObserver with `disconnect()` on resolve; tight `setInterval` polling only as fallback                         | Within minutes of opening Discord with extension active      |
| Storing entire prompt history as a single array re-written on each new entry               | Quadratic write cost; race-loses-history bug                               | Use one storage key per entry (`prompt-<id>`); or append-only log                                                         | After 100+ history items                                     |
| No debounce on draft persistence (write on every keystroke)                                | Storage thrashing; quota events on slow disks                              | Debounce 100–250ms; coalesce multiple keystrokes into one write                                                           | Long prompts; users on Chromebooks with slow eMMC            |
| One MutationObserver per platform always-on (16 adapters)                                  | All observers fire on every DOM mutation across all tabs                   | Adapters register/unregister observers based on active dispatch lifecycle; never always-on                                | When v2 expands beyond 2 platforms                           |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake                                                                           | Risk                                                                                                                                                                                                                    | Prevention                                                                                                                                                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Injecting page-captured content directly into target chat without sanitization    | XSS-equivalent: malicious page can craft "content" that, when injected as text, runs in the chat (e.g., Markdown-injection in OpenClaw, mention-injection on Discord)                                                   | Treat page-captured content as plain text. Never inject as HTML. Strip Discord mention syntax (`@everyone`, `<@id>`) when sending into Discord; let user explicitly opt in to formatted mode |
| Trusting `document.title` / `document.querySelector('meta')` without escaping     | Page can set `<title>](http://evil)</title>` — appears as a clickable link in the chat                                                                                                                                  | Treat as raw text; escape Markdown-significant characters before sending; never embed in URL templates without `encodeURIComponent`                                                          |
| Storing user prompts in `chrome.storage.local` without considering them sensitive | Other extensions with `storage` permission can't read across extensions, but anything that obtains debugger access (e.g., another extension with `debugger` perm) can. Privacy risk if users put credentials in prompts | Document explicitly that prompts may contain sensitive content; never log prompts to console (gate behind `__DEV__`); offer "clear history" option                                           |
| `host_permissions: ["<all_urls>"]` "just to be safe"                              | Massive attack surface; review rejection; users see scary install prompt                                                                                                                                                | Specific patterns only; `activeTab` for page snapshot; opt-in for each new platform via optional permissions                                                                                 |
| Loading any code from a remote URL                                                | Auto-rejection at Web Store; arbitrary code execution risk if a CDN is compromised                                                                                                                                      | All adapter code bundled in the package. No `fetch().then(eval)`, no remote `<script>`, no `new Function(remoteString)`                                                                      |
| Cross-extension messaging without origin validation                               | Other extensions can send fake messages to Web2Chat's SW                                                                                                                                                                | Validate `sender.id` matches the extension's own ID; reject `externally_connectable` messages unless explicitly designed for                                                                 |
| `eval` or `new Function` anywhere in the codebase                                 | CSP rejection; security review flag                                                                                                                                                                                     | ESLint `no-eval` + `no-new-func` rule enforced in CI; if a dependency needs eval, sandbox it via `isolated_world` CSP relaxation only                                                        |
| Logging the page URL in error reports                                             | URL itself can be sensitive (private docs, auth tokens in query string)                                                                                                                                                 | Strip query strings from error reports; let users opt in to "include URL"                                                                                                                    |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall                                                                        | User Impact                                                                               | Better Approach                                                                                                                      |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Silent failures (dispatch "completes" but message never arrives)               | User has no idea something's wrong; loses trust on first failed send                      | Post-send verification observer; explicit "sent" / "failed" badge in popup with retry button                                         |
| No "dispatch in flight" indicator after popup closes                           | User clicks elsewhere, can't tell if it sent                                              | Action-icon badge text ("...") during dispatch; flash green/red on completion; persists until user opens popup                       |
| Re-using "send_to" history without showing target preview                      | User sends to wrong channel because two channels share the same friendly name             | Show channel ID + last-sent timestamp + platform icon in dropdown; freeze recently-used at top                                       |
| Prompt and send_to drift apart (history search returns mismatched pairs)       | User picks "knowledge-base agent" in send_to, system loads a stale generic prompt         | Bind prompt to send_to as a pair; switching send_to swaps prompt; explicit "edit prompt" button                                      |
| Page snapshot shows broken `description` for SPA-heavy sites                   | User sees garbage in popup before sending                                                 | Wait for SPA paint via `requestIdleCallback` before snapshot; fall back through meta tag chain; let user edit fields before sending  |
| Popup width too narrow for full URL preview                                    | Users can't verify the right page captured                                                | Show URL with title-attribute tooltip; truncate middle, not end (so domain stays visible)                                            |
| Keyboard shortcut conflict with target page                                    | `Ctrl+Enter` to send overlaps Discord's native shortcut                                   | Use a unique combo (`Ctrl+Shift+Enter` or `Cmd+Enter`); make it user-configurable; document in onboarding                            |
| No visible indication of which platform is detected for a `send_to` URL        | User pastes a URL, sees nothing change, doesn't know if extension recognized the platform | Show platform icon next to send_to input as user types; show "unrecognized" state so users know to file an issue                     |
| First-run onboarding missing                                                   | User installs, opens popup, sees a blank UI, uninstalls                                   | Provide a one-screen onboarding pointing at OpenClaw + Discord URL examples; link to documentation                                   |
| Dispatch error text is technical ("Error: cannot find element [data-list-id]") | User has no recourse                                                                      | Translate to actionable: "Couldn't find the chat input on Discord. Make sure you're logged in and the channel page is fully loaded." |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Discord adapter:** Often missing post-send verification — verify a new message bubble appears in DOM with matching prefix within 5s of injection.
- [ ] **Discord adapter:** Often missing Lexical-aware injection — verify text persists across one rAF tick (not reconciled away).
- [ ] **Service worker:** Often missing top-level event listener registration — verify by manually killing SW in `chrome://extensions` and reproducing the dispatch path.
- [ ] **Popup state:** Often missing storage-backed restore — verify draft persists across popup close/reopen and across browser restart.
- [ ] **i18n:** Often missing JS-based substitution for HTML body — verify popup renders zh strings (not literal `__MSG_*__`) when user selects zh.
- [ ] **i18n:** Often missing custom locale loader — verify zh ↔ en switch within the extension actually changes UI without browser restart.
- [ ] **Manifest:** Often missing `optional_host_permissions` for v2 platforms — verify users can install with only OpenClaw + Discord granted.
- [ ] **Manifest:** Often missing minimal CSP — verify default CSP isn't relaxed; no `unsafe-eval` anywhere.
- [ ] **Privacy policy:** Often missing or out-of-date — verify the published policy mentions every data field captured (URL, title, description, content) and storage location.
- [ ] **Permissions:** Often `host_permissions` has unused entries — verify each entry maps to an active adapter; remove `<all_urls>` if present.
- [ ] **Capture pipeline:** Often missing fallback for `description` — verify capture works on a SPA that renders meta tags client-side (e.g., Notion public page).
- [ ] **Capture pipeline:** Often missing content size cap — verify capture of a large article (>1MB body) doesn't fill `chrome.storage.local` history.
- [ ] **Dispatch:** Often missing idempotency — verify rapid double-click on Send produces exactly one message.
- [ ] **Dispatch:** Often missing login-wall handling — verify dispatching to Discord while logged out shows a clear "please log in" state, not a hang.
- [ ] **Testing:** Often missing SW-restart test — verify Playwright can kill the SW mid-test and the dispatch path recovers.
- [ ] **Distribution:** Often missing reviewer test creds — verify Web Store submission notes include OpenClaw test endpoint and a Discord test server invite.
- [ ] **Hotkey:** Often missing conflict check — verify `commands` shortcut doesn't override Discord/Slack native shortcuts on the page where popup opens.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall                                                      | Recovery Cost                                                     | Recovery Steps                                                                                                                                                                                                                          |
| ------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord ships a DOM refactor, adapter breaks for all users   | MEDIUM                                                            | Hotfix selector hierarchy with new ARIA fallbacks; ship update; users get fix on next auto-update (1–24h). Add a runtime version check that surfaces "adapter outdated, update Web2Chat" if known-good selectors all miss               |
| Web Store rejection on submission                            | LOW (pre-launch) / HIGH (post-launch)                             | Read structured rejection code; tighten permissions; resubmit; if appeal needed, provide detailed permission-by-permission justification. Pre-launch: 2–5 business days lost. Post-launch with users: hotfix on a separate review queue |
| Service worker dies mid-dispatch in production               | LOW per-user (retry works) / HIGH at scale (looks like flakiness) | Move state from module-scope to `chrome.storage.session`; add resumable state machine; ship update. Users with broken state can be detected via post-send verification failures                                                         |
| Local `chrome.storage.local` quota exceeded                  | LOW                                                               | Surface "storage almost full" warning at 80% via `getBytesInUse()`; offer "clear history older than N days" UI action; cap content size on new captures                                                                                 |
| User account banned on Discord (selfbot detection)           | HIGH (account loss is permanent)                                  | Cannot recover the user's account. Mitigate by rate-limiting, opt-in v2 Bot API, clear ToS disclosure. Document in README that this is a known risk of any user-account automation                                                      |
| Dispatch double-send already shipped to a chat               | LOW (single duplicate) / MEDIUM (cascading retries)               | Add idempotency key in update; one-time apology notification on next popup open; retroactive log inspection if user reports                                                                                                             |
| Privacy policy outdated relative to actual data captured     | MEDIUM                                                            | Update policy + Web Store privacy practices tab; submit update. If the gap is severe (capturing data not disclosed), pull the listing temporarily, fix, resubmit with explanation                                                       |
| Lexical injection technique broken by Lexical version update | MEDIUM                                                            | Fall back to alternative technique (paste → input events → main-world bridge); ship update with cascade. Maintain unit tests against captured Lexical fixture HTML                                                                      |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall                                 | Prevention Phase                   | Verification                                                                                  |
| --------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| 1. React-controlled input setter        | Dispatch Core                      | Unit test: setter helper produces an `onChange`-firing update on a React fixture              |
| 2. Lexical / Slate editor injection     | Discord Adapter (canonical)        | Integration test: synthetic paste survives one rAF tick and produces a sendable Lexical state |
| 3. SW lifecycle / dispatch interruption | Extension Skeleton + Dispatch Core | Test: kill SW via DevTools mid-dispatch; verify pickup on wake from `chrome.storage.session`  |
| 4. Top-level await / importScripts      | Extension Skeleton                 | Lint rule + manifest validation; SW registers without errors after cold install               |
| 5. SPA route race                       | Dispatch Core + per-Adapter        | E2E test: rapid channel-switch on Discord between two consecutive dispatches                  |
| 6. DOM-class brittleness                | OpenClaw Adapter / Discord Adapter | Snapshot fixtures of both platforms; canary check at runtime; selector hierarchy enforced     |
| 7. Login wall                           | Dispatch Core (lifecycle hook)     | E2E test: dispatch to Discord with cookies cleared; verify "please log in" state              |
| 8. Double-send                          | Dispatch Core                      | Integration test: rapid double-click triggers exactly one `executeScript` call                |
| 9. Web Store rejection                  | Distribution + Phase 1 manifest    | Pre-submission checklist; staging reviewer feedback round before public submission            |
| 10. Popup state loss                    | Popup UI                           | E2E test: type draft, close popup, reopen; verify draft and dispatch state persist            |
| 11. i18n limitations                    | i18n Phase                         | E2E test: switch zh ↔ en within extension; verify all UI strings (incl. dynamic) update       |
| 12. Discord ToS / ban risk              | Discord Adapter + Distribution     | Code review: rate limit enforced; README + listing copy includes clear disclosure             |

## Sources

**Chrome MV3 Service Worker Lifecycle:**

- [The extension service worker lifecycle | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Extension service worker basics | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)
- [Migrate to a service worker | Chrome for Developers](https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/)
- [What are the execution time limits for the service worker in Manifest V3?](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/L3EbiNMjIGI)
- [MV3 ServiceWorker implementation is completely unreliable](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/jpFZj1p7mJc)
- [Cannot use importScripts after init in Web Extension](https://issues.chromium.org/issues/40737342)
- [Vibe Engineering: MV3 Service Worker Keepalive — How Chrome Keeps Killing Our AI Agent](https://medium.com/@dzianisv/vibe-engineering-mv3-service-worker-keepalive-how-chrome-keeps-killing-our-ai-agent-9fba3bebdc5b)

**React / Lexical / Editor Injection:**

- [Trigger change events when the value of an input is changed programmatically — facebook/react #1152](https://github.com/facebook/react/issues/1152)
- [onChange not firing on controlled input element — facebook/react #8971](https://github.com/facebook/react/issues/8971)
- [Programmatically filled input does not fire onchange event — facebook/react #11095](https://github.com/facebook/react/issues/11095)
- [Trigger Input Updates with React Controlled Inputs (coryrylan.com)](https://coryrylan.com/blog/trigger-input-updates-with-react-controlled-inputs)
- [Lexical state updates (dio.la)](https://dio.la/article/lexical-state-updates)
- [Lexical Quick Start (Vanilla JS)](https://lexical.dev/docs/getting-started/quick-start)
- [Concordia — Inject JavaScript and CSS into Discord client](https://github.com/ebith/Concordia)

**Content Script Worlds & MutationObserver:**

- [Content scripts | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Manifest content_scripts | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
- [Accessing website's window object in Chrome extension (Krystian Pracuk)](https://kpracuk.dev/articles/accessing-websites-window-object-in-chrome-extension/)
- [WXT Content Scripts guide](https://wxt.dev/guide/essentials/content-scripts)
- [MutationObserver — MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Wait for an element to exist — gist](https://gist.github.com/jwilson8767/db379026efcbd932f64382db4b02853e)

**Storage & State:**

- [chrome.storage API documentation](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Concurrent update of chrome.storage.local](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/y5hxPcavRfU)
- [Discuss limits applied to storage.local API — w3c/webextensions #351](https://github.com/w3c/webextensions/issues/351)
- [Increased quota for storage.local API — Chromium Issue 40264748](https://issues.chromium.org/issues/40264748)
- [Keep state of browser action — chromium-extensions group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/Dn_X_CvMf20)

**i18n:**

- [chrome.i18n API | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [i18n for extensions (Chromium design doc)](https://www.chromium.org/developers/design-documents/extensions/how-the-extension-system-works/i18n/)
- [intl-chrome-i18n — FormatJS-based wrapper](https://github.com/Collaborne/intl-chrome-i18n)
- [How to use i18n in popup.html — chromium-extensions group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/vYRadlkK0oU)

**CSP / Remote Code:**

- [Manifest Content Security Policy | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- [Will eval() be permitted in content scripts under Manifest V3?](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/MPcq-feSK9c/m/8svP70a7BQAJ)
- [chromium-isolated-world-csp-demo](https://github.com/hjanuschka/chromium-isolated-world-csp-demo)

**Web Store Review / Privacy:**

- [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process/)
- [Updated Privacy Policy & Secure Handling Requirements](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Privacy Policies | Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [Limited Use | Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Troubleshooting Chrome Web Store violations](https://developer.chrome.com/docs/webstore/troubleshooting)
- [Chrome Web Store Rejection Codes (Medium)](https://medium.com/@bajajdilip48/chrome-web-store-rejection-codes-b71f817ceaea)
- [Why Chrome Extensions Get Rejected — Extension Radar](https://www.extensionradar.com/blog/chrome-extension-rejected)

**Discord Specifics:**

- [Trust and Safety Investigations on Discord](https://discord.com/safety/360043712132-how-we-investigate)
- [Discord Warning System](https://support.discord.com/hc/en-us/articles/18210965981847-Discord-Warning-System)
- [AutoMod FAQ — Discord](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ)
- [Discord URI Schemes for developers](https://support.discord.com/hc/en-us/community/posts/6555511199895-Discord-URI-Schemes-for-developers)

**Playwright Extension Testing:**

- [Chrome extensions | Playwright](https://playwright.dev/docs/chrome-extensions)
- [Testing service worker code is flaky — microsoft/playwright #12103](https://github.com/microsoft/playwright/issues/12103)
- [How I Built E2E Tests for Chrome Extensions Using Playwright and CDP](https://dev.to/corrupt952/how-i-built-e2e-tests-for-chrome-extensions-using-playwright-and-cdp-11fl)
- [playwright-chrome-extension-testing-template](https://github.com/kelseyaubrecht/playwright-chrome-extension-testing-template)

---

_Pitfalls research for: Chrome MV3 Web Clipper-style extension with multi-IM content-script dispatch (Web2Chat — MVP: OpenClaw + Discord)_
_Researched: 2026-04-28_
