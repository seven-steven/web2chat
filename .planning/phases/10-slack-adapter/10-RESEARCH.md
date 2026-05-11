# Phase 10: Slack Adapter - Research

**Researched:** 2026-05-11
**Domain:** Chrome MV3 extension DOM injection adapter for Slack web client
**Confidence:** HIGH

## Summary

Phase 10 adds a Slack adapter following the established registry-driven pattern from Phase 8/9. Slack uses Quill.js for its message input editor (`.ql-editor[role="textbox"]`), which requires MAIN world ClipboardEvent paste injection -- the same technique used for Discord's Slate editor. The adapter fits entirely within the existing `defineAdapter()` + content script + MAIN world injector architecture with zero changes to the dispatch pipeline or service worker entry point.

Slack mrkdwn formatting differs significantly from Discord markdown: bold uses `*text*` (not `**text**`), blockquote uses `>` (same syntax as Discord but different rendering), links use `<url|text>` angle-bracket syntax, and there is no heading support. The 40,000 character message limit makes truncation unnecessary (D-129). Slack mention patterns (`<!everyone>`, `<@U123>`, `<#C123>`) need escaping to prevent accidental notifications.

**Primary recommendation:** Replicate the Discord adapter pattern (content script + MAIN world injector + format module + login detect + selector fixture tests) with Slack-specific selectors and mrkdwn syntax mapping. No architectural innovation needed -- pure pattern replication.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-128:** New `shared/adapters/slack-format.ts` for Slack mrkdwn formatting. Symmetric with `discord-format.ts` but no shared implementation (syntax too different).
- **D-129:** No character truncation. Slack 40K char limit far exceeds actual web content.
- **D-130:** Implement `escapeSlackMentions()` for `<!everyone>`, `<!here>`, `<@U123>`, `<@W123>`, `<#C123>` patterns. Symmetric with Discord's `escapeMentions()`.
- **D-131:** Field order matches Discord: prompt -> *title* -> url -> description -> timestamp -> content. Only markdown syntax changes.
- **D-132:** Slack reuses Discord ToS warning pattern. New `slack_tos_warning` + `slack_tos_details` i18n keys.
- **D-133:** v1 matches only Slack channel URL: `https://app.slack.com/client/<workspace>/<channel>`. Exact 4-segment path match.
- **D-134:** DM and thread view out of scope for v1.
- **D-135:** `hostMatches: ['https://app.slack.com/*']` in static `host_permissions`.
- **D-136:** Slack Quill editor uses MAIN world ClipboardEvent paste via Phase 8 bridge pattern. New `background/injectors/slack-main-world.ts`.
- **D-137:** Send confirmation strategy deferred to researcher recommendation (this document).
- **D-138:** Login detection strategy deferred to researcher recommendation (this document).
- **D-139:** Editor selector uses ARIA-first three-tier fallback (same as Discord). Specific selectors to be verified.

### Claude's Discretion

- `slack-format.ts` specific mrkdwn syntax mapping (blockquote equivalent, link format, code block handling) -- as long as D-131 field order is maintained.
- `escapeSlackMentions()` specific escape technique (zero-width space vs HTML entity vs removal) -- reference `discord-format.ts` pattern.
- Slack MAIN world injector specific implementation (selectors, pre-paste cleanup, post-Enter cleanup) -- reference `discord-main-world.ts`.
- `slack-login-detect.ts` specific DOM markers and detection logic.
- ToS warning text wording -- reference Discord's `discord_tos_warning` / `discord_tos_details`.

### Deferred Ideas (OUT OF SCOPE)

- DM delivery -- Slack DM URL not in v1 scope.
- Thread view delivery -- complex URL behavior, deferred.
- Slack Block Kit formatting -- future optimization.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SLK-01 | Slack URL pattern matching (`https://app.slack.com/client/<workspace>/<channel>`), registry entry with `hostMatches: ['https://app.slack.com/*']` | URL match function in registry entry; 4-segment path validation. See Pattern 1. |
| SLK-02 | Slack login wall detection (URL layer + DOM layer), `waitForReady` racing login probe | URL patterns: `/check-login`, `/signin`, `slack.com/workspace-signin`. DOM: email input + auth form markers. See Pattern 4. |
| SLK-03 | Slack Quill editor DOM injection via MAIN world ClipboardEvent paste (contenteditable div), MAIN world bridge | Quill editor selector `.ql-editor[role="textbox"][contenteditable="true"]`. ClipboardEvent paste proven for Quill. See Pattern 2. |
| SLK-04 | Slack message send confirmation -- Enter keydown triggers send, then confirmation check | Recommended: editor textContent clear check (same as Discord). Quill clears editor after send. Alternative: MutationObserver on message list. See Research Finding. |
| SLK-05 | Slack platform icon + `platform_icon_slack` i18n key (zh_CN + en 100% coverage) | Follow Discord pattern: add key to both `locales/en.yml` and `locales/zh_CN.yml`. SVG icon in `public/icon/` or inline. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| URL pattern matching | Registry (shared/) | -- | Pure function, no chrome.*, used by both popup and SW |
| Login detection (URL layer) | Pipeline (background/) | Registry `loggedOutPathPatterns` | Pipeline checks URL redirect against registered patterns |
| Login detection (DOM layer) | Content script (entrypoints/) | shared/ `slack-login-detect.ts` | Needs live DOM; detection function in shared/ for testability |
| Editor finding (selectors) | Content script (entrypoints/) | -- | Runs in ISOLATED world context on live Slack DOM |
| ClipboardEvent paste injection | MAIN world injector (background/injectors/) | -- | DataTransfer must be created in MAIN world for Quill to read |
| Message formatting (mrkdwn) | shared/ `slack-format.ts` | -- | Pure function, no chrome.*, shared between content script and tests |
| Platform icon display | Popup (popup/) | Registry `iconKey` | Popup reads iconKey from matched adapter |
| Host permission declaration | wxt.config.ts | -- | Static `host_permissions` for known public domain |
| i18n key coverage | locales/*.yml | -- | 100% key coverage in en + zh_CN |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wxt | 0.20.26 | MV3 extension framework | Project framework, handles content script bundling and manifest generation [VERIFIED: npm registry] |
| zod | 4.4.3 | Schema validation for message payloads | Already in project for DispatchWarningSchema validation [VERIFIED: npm registry] |
| vitest | (existing) | Unit testing | Project test framework, no new dependency needed |

### Supporting

No new dependencies required. Phase 10 is pure pattern replication using existing project infrastructure.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ClipboardEvent paste | `document.execCommand('insertText')` | Both work for Quill; ClipboardEvent is project standard (D-63), execCommand is deprecated |
| Editor textContent clear check | MutationObserver on message list | TextContent check is simpler and matches Discord pattern; MutationObserver adds complexity but is more robust if Quill timing changes |

**Installation:**
```bash
# No new packages needed for Phase 10
```

## Architecture Patterns

### System Architecture Diagram

```
Popup (Preact)                    Service Worker                    Slack Tab
============                      ===============                   ==========

[SendForm]                        [dispatch-pipeline.ts]
    |                                      |
    |-- findAdapter(url) -->               |   (registry-driven, no code change)
    |   matches 'slack' entry              |
    |                                      |
    |-- dispatch.start message --------->  |
                                           |
                                     openOrActivateTab('app.slack.com/client/...')
                                     tabs.onUpdated:complete
                                           |
                                     chrome.scripting.executeScript
                                       { files: ['content-scripts/slack.js'],
                                         world: 'ISOLATED' }
                                           |
                                     chrome.tabs.sendMessage
                                       { type: 'ADAPTER_DISPATCH' }
                                           |
                                           v
                                    [slack.content.ts] -----> composeSlackMrkdwn()
                                           |                      (slack-format.ts)
                                           |
                                     detectLoginWall()?
                                           |
                                     findEditor() -- 3-tier fallback
                                           |
                                     port.connect('WEB2CHAT_MAIN_WORLD:slack')
                                           |
                                           v
                                     [main-world-registry.ts]
                                           |
                                     chrome.scripting.executeScript
                                       { world: 'MAIN',
                                         func: slackMainWorldPaste }
                                           |
                                           v
                                    [slack-main-world.ts]
                                           |
                                     find .ql-editor in MAIN world
                                     DataTransfer + ClipboardEvent paste
                                     KeyboardEvent Enter
                                           |
                                     editor textContent === '' ?
                                           |
                                     respond ok/error
                                           |
                                     <---- response flows back through port
                                           |
                                     chrome.action.setBadge 'ok'/'err'
```

### Recommended Project Structure

```
shared/adapters/
  slack-format.ts          # mrkdwn formatting (NEW)
  slack-login-detect.ts    # DOM login detection (NEW)
  registry.ts              # append slack defineAdapter entry (MODIFY)
  types.ts                 # no change needed

background/injectors/
  slack-main-world.ts      # MAIN world paste injector (NEW)
  discord-main-world.ts    # existing, reference only

background/
  main-world-registry.ts   # append ['slack', slackMainWorldPaste] (MODIFY)

entrypoints/
  slack.content.ts         # Slack adapter content script (NEW)

tests/unit/adapters/
  slack-format.spec.ts     # mrkdwn formatting tests (NEW)
  slack-login-detect.spec.ts # login detection tests (NEW)
  slack-selector.spec.ts   # selector fallback tests (NEW)
  slack-match.spec.ts      # URL match function tests (NEW)
  slack.fixture.html       # DOM fixture for selector tests (NEW)

tests/unit/dispatch/
  (existing tests pass with new registry entry)

locales/
  en.yml                   # add Slack i18n keys (MODIFY)
  zh_CN.yml                # add Slack i18n keys (MODIFY)

wxt.config.ts              # add host_permissions (MODIFY)
scripts/verify-manifest.ts # update assertion (MODIFY)
```

### Pattern 1: Registry Entry (SLK-01)

**What:** Slack adapter descriptor appended to `adapterRegistry`.
**When to use:** New platform registration.
**Example:**
```typescript
// In shared/adapters/registry.ts -- append to adapterRegistry array:
defineAdapter({
  id: 'slack',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return (
        u.hostname === 'app.slack.com' &&
        u.pathname.startsWith('/client/') &&
        u.pathname.split('/').filter(Boolean).length >= 3
      );
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/slack.js',
  hostMatches: ['https://app.slack.com/*'],
  iconKey: 'platform_icon_slack',
  spaNavigationHosts: ['app.slack.com'],
  loggedOutPathPatterns: ['/check-login*', '/signin*', '/workspace-signin*'],
}),
```
[VERIFIED: pattern matches existing discord entry in registry.ts, confirmed hostname and path structure from Slack URLs]

### Pattern 2: MAIN World ClipboardEvent Paste (SLK-03)

**What:** Quill editor injection via synthetic ClipboardEvent in MAIN world.
**When to use:** Quill.js editors (Slack) where DataTransfer must be created in same V8 context.
**Example:**
```typescript
// background/injectors/slack-main-world.ts
export async function slackMainWorldPaste(text: string): Promise<boolean> {
  const editor =
    document.activeElement instanceof HTMLElement &&
    (active.matches('.ql-editor[role="textbox"]') ||
     active.matches('.ql-editor[contenteditable="true"]') ||
     active.matches('[contenteditable="true"]'))
      ? active
      : document.querySelector<HTMLElement>('.ql-editor[role="textbox"]')
        ?? document.querySelector<HTMLElement>('.ql-editor[contenteditable="true"]')
        ?? document.querySelector<HTMLElement>('#msg_input [contenteditable="true"]');

  if (!editor) return false;
  editor.focus();

  // Pre-paste cleanup: clear residual text via InputEvent
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }),
  );
  editor.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );

  // Post-Enter cleanup
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
  }
  return true;
}
```
[VERIFIED: pattern matches discord-main-world.ts, selectors confirmed by Greasy Fork userscript and Quill.js docs]

### Pattern 3: Three-Tier ARIA-First Selector Fallback (SLK-03, D-139)

**What:** Editor finder with three confidence levels matching Discord pattern.
**When to use:** All adapter content scripts for editor element discovery.
**Example:**
```typescript
// In entrypoints/slack.content.ts
function findEditor(): EditorMatch | null {
  // Tier 1: ARIA role + Quill class (highest confidence)
  const tier1 = document.querySelector<HTMLElement>(
    '.ql-editor[role="textbox"][contenteditable="true"]',
  );
  if (tier1) return { element: tier1, tier: 'tier1-aria', lowConfidence: false };

  // Tier 2: Quill class + contenteditable (medium confidence)
  const tier2 = document.querySelector<HTMLElement>(
    '.ql-editor[contenteditable="true"]',
  );
  if (tier2) return { element: tier2, tier: 'tier2-data', lowConfidence: false };

  // Tier 3: ID-based or class fragment (low confidence)
  const tier3 = document.querySelector<HTMLElement>(
    '#msg_input [contenteditable="true"]',
  );
  if (tier3) return { element: tier3, tier: 'tier3-class-fragment', lowConfidence: true };

  return null;
}
```
[VERIFIED: selectors confirmed from Quill.js DOM structure, Slack uses `.ql-editor` class on the editable div]

### Pattern 4: Login Detection (SLK-02, D-138)

**What:** Two-layer login detection: URL patterns (pipeline) + DOM markers (content script).
**When to use:** All adapters for logged-out user protection.

**URL layer (in registry `loggedOutPathPatterns`):**
```typescript
loggedOutPathPatterns: ['/check-login*', '/signin*', '/workspace-signin*'],
```

**DOM layer (in `shared/adapters/slack-login-detect.ts`):**
```typescript
export function detectLoginWall(): boolean {
  return Boolean(
    // Slack workspace signin page has email input
    document.querySelector('input[type="email"][name="email"]') ||
    // Sign-in button on workspace picker
    document.querySelector('button[data-qa="sign_in_button"]') ||
    // Slack workspace sign-in form
    document.querySelector('[class*="signin"]') ||
    // Redirect banner / login overlay
    document.querySelector('[class*="login"]'),
  );
}
```
[ASSUMED: DOM markers based on common Slack login page patterns. The planner should verify these selectors against a real Slack login page before implementation.]

**Research recommendation for D-137 (send confirmation):** Use editor textContent clear check (same as Discord). Slack's Quill editor clears the input after processing Enter -> send, which can be verified by checking `(editor.textContent ?? '').trim().length === 0` after a short delay (200-500ms). This matches the Discord confirmation pattern exactly and avoids the complexity of MutationObserver on the Slack message list (which has a different DOM structure than Discord's `[data-list-id^="chat-messages-"]`). [ASSUMED: based on Quill.js standard behavior. Quill clears its editor after successful text submission. Needs verification against live Slack.]

**Research recommendation for D-138 (login detection):** Use both URL + DOM layers. Slack redirects logged-out users to `slack.com/check-login` (host changes from `app.slack.com` to `slack.com` -- this means `loggedOutPathPatterns` alone will NOT catch it since `isLoggedOutUrlForAdapter` checks `isOnAdapterHost` first). The DOM probe is essential for Slack because the host changes on redirect. [VERIFIED: Slack login redirect behavior confirmed by web search. The host change from `app.slack.com` to `slack.com` means URL-layer `loggedOutPathPatterns` alone is insufficient.]

### Anti-Patterns to Avoid

- **Do not use `innerText=` or `textContent=` on the Quill editor.** Quill maintains an internal document model (Delta). Direct DOM manipulation desyncs the editor. Use ClipboardEvent paste only. [CITED: CLAUDE.md DOM injection constraint]
- **Do not rely solely on `loggedOutPathPatterns` for Slack login detection.** Slack redirects to a different host (`slack.com` vs `app.slack.com`), so `isOnAdapterHost()` will return false and URL patterns will not match. DOM-level detection is mandatory. [VERIFIED: see login detection research above]
- **Do not use `setTimeout`/`setInterval` in the service worker for Slack-specific logic.** Use `chrome.alarms` for any delayed operations. [CITED: CLAUDE.md SW discipline]
- **Do not share formatting code between Discord and Slack.** mrkdwn and markdown syntax are too different (bold `*` vs `**`, links `<url|text>` vs `[text](url)`, no headings in mrkdwn). Each platform has its own format module. [CITED: D-128]
- **Do not put MAIN world injector code in `shared/adapters/`.** MAIN world injectors live in `background/injectors/` (SW-only) to prevent leaking into the popup bundle. [VERIFIED: existing pattern in main-world-registry.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL pattern matching | Custom URL parser | `defineAdapter({ match() })` in registry | Registry drives popup + SW discovery automatically |
| MAIN world bridge routing | Custom message passing | `mainWorldInjectors` map + port `WEB2CHAT_MAIN_WORLD:slack` | Existing bridge infrastructure handles routing |
| Dispatch timeout | Per-adapter timer logic | `resolveAdapterTimeouts(adapter)` from dispatch-policy | Inherit defaults (30s/20s) from registry |
| SPA navigation detection | Custom URL change listener | `spaNavigationHosts: ['app.slack.com']` in registry | `buildSpaUrlFilters()` auto-generates chrome event filters |
| Send confirmation polling | Custom observer framework | Simple textContent check after Enter (200ms delay) | Quill clears editor on send; no MutationObserver needed |
| HTML entity escaping | Custom regex | `&amp;` / `&lt;` / `&gt;` replacement | Only 3 chars need escaping in mrkdwn [CITED: api.slack.com formatting docs] |

**Key insight:** Phase 10 is the first true test of the registry-driven architecture. Every capability that Phase 8/9 generalized should "just work" by appending a registry entry. If the planner finds itself modifying `dispatch-pipeline.ts` or `entrypoints/background.ts`, that is a sign the generalization was incomplete.

## Common Pitfalls

### Pitfall 1: Slack Login Redirect Crosses Host Boundaries

**What goes wrong:** Slack redirects logged-out users from `app.slack.com` to `slack.com/check-login`. The `isLoggedOutUrlForAdapter()` helper checks `isOnAdapterHost()` first, which matches against `app.slack.com`. Since `slack.com` does not match, URL-layer detection silently passes, and the adapter times out waiting for an editor that never loads.
**Why it happens:** Discord's login redirect stays on `discord.com` (same host). Slack's redirect changes the host entirely.
**How to avoid:** (1) DOM-level login detection is essential for Slack. (2) Consider adding a secondary host pattern or modifying `isOnAdapterHost` logic. (3) The content script's DOM probe catches this because the login page has no Quill editor.
**Warning signs:** `INPUT_NOT_FOUND` errors on Slack when user is logged out, instead of `NOT_LOGGED_IN`.

### Pitfall 2: Quill BeforeInput Cleanup Desync

**What goes wrong:** The `InputEvent('beforeinput', { inputType: 'deleteContentBackward' })` used for pre-paste cleanup may not work the same way on Quill as it does on Discord's Slate. Quill handles `beforeinput` differently.
**Why it happens:** Slate and Quill have different internal event handling pipelines.
**How to avoid:** Test the cleanup logic against a real Slack editor. If `beforeinput` desyncs Quill, fall back to `selectAll()` + `deleteContentBackward` or dispatch Backspace keydown.
**Warning signs:** Editor shows concatenated text from previous dispatches; Quill delta model out of sync with DOM.

### Pitfall 3: Slack Send Button State

**What goes wrong:** Slack's send button (`[data-qa="texty_send_button"]`) may be disabled initially and only becomes active after text is entered. If the adapter presses Enter too quickly after paste, the send may fail silently.
**Why it happens:** Quill's internal state update is asynchronous; the send button state depends on Quill's delta model having content.
**How to avoid:** The ClipboardEvent paste + Enter sequence should give Quill enough time to process (paste is synchronous from Quill's perspective). If issues arise, add a small delay (50-100ms) between paste and Enter.
**Warning signs:** Message appears in editor but is not sent; editor retains text after Enter.

### Pitfall 4: SPA Navigation Race Condition

**What goes wrong:** Slack is a SPA. When the dispatch pipeline opens/activates a tab, the SPA may be in the middle of a route transition. The content script injection + `ADAPTER_DISPATCH` message may arrive before the new route's DOM is rendered.
**Why it happens:** `tabs.onUpdated:complete` fires when the HTTP response completes, but SPA rendering happens asynchronously after that.
**How to avoid:** The `spaNavigationHosts: ['app.slack.com']` entry triggers `onSpaHistoryStateUpdated` handling, which re-runs `advanceDispatchForTab`. The content script's `waitForReady()` with MutationObserver handles DOM timing. No special handling needed beyond what Phase 8/9 already provides.
**Warning signs:** `INPUT_NOT_FOUND` on first dispatch to a channel that requires SPA navigation.

### Pitfall 5: verify-manifest Assertion Failure

**What goes wrong:** `scripts/verify-manifest.ts` has a hardcoded assertion `host_permissions === ['https://discord.com/*']`. Adding Slack's host permission without updating this assertion causes build verification to fail.
**Why it happens:** The assertion was written when only Discord existed as a static host permission.
**How to avoid:** Update the assertion to `['https://app.slack.com/*', 'https://discord.com/*']` (sorted). Update the corresponding test in `tests/unit/scripts/verify-manifest.spec.ts`.
**Warning signs:** CI build fails after adding Slack host_permissions.

### Pitfall 6: Quill Editor Multiple Instances

**What goes wrong:** Slack may render multiple Quill editor instances on screen (e.g., message compose + thread reply). The selector might match the wrong instance.
**Why it happens:** Quill creates a `.ql-editor` div for each editor instance.
**How to avoid:** Scope the selector to the primary compose area. `#msg_input .ql-editor` or use the active element check (the focused editor is the one the user was interacting with). The MAIN world injector already checks `document.activeElement` first.
**Warning signs:** Text appears in thread reply box instead of main channel compose.

## Code Examples

Verified patterns from official sources and existing codebase:

### Slack mrkdwn Formatting

```typescript
// Source: https://api.slack.com/reference/surfaces/formatting
// Bold: *text*
// Italic: _text_
// Strikethrough: ~text~
// Code: `code` or ```code block```
// Blockquote: > text
// Link: <url|text> or bare URL (auto-linked)
// No heading support
// Escape: &amp; &lt; &gt;
// Mention: <@U123>, <!here>, <!everyone>, <!channel>
```

### Slack Mention Escaping (D-130)

```typescript
// Pattern follows discord-format.ts escapeMentions() approach
export function escapeSlackMentions(text: string): string {
  let result = text;
  // Break <!everyone>, <!here>, <!channel> with zero-width space after !
  result = result.replace(/<!(everyone|here|channel)>/g, '<!​$1>');
  // Break <@U123>, <@W123> user mentions
  result = result.replace(/<@([UW][A-Z0-9]+)>/g, '<​@$1>');
  // Break <#C123> channel mentions
  result = result.replace(/<#([A-Z0-9]+)>/g, '<​#$1>');
  // Break bare @everyone / @here
  result = result.replace(/(?<!\w)@(everyone|here)\b/g, '@​$1');
  return result;
}
```
[ASSUMED: specific zero-width space insertion points. Reference pattern from discord-format.ts escapeMentions().]

### composeSlackMrkdwn Structure (D-128, D-131)

```typescript
// Source: Based on composeDiscordMarkdown() structure in discord-format.ts
export function composeSlackMrkdwn(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel?: string;
}): string {
  const { prompt, snapshot, timestampLabel = 'Captured at:' } = payload;

  const safePrompt = prompt ? escapeSlackMentions(prompt) : '';
  const safeTitle = snapshot.title ? escapeSlackMentions(snapshot.title) : '';
  const safeDescription = snapshot.description ? escapeSlackMentions(snapshot.description) : '';
  const safeContent = snapshot.content ? escapeSlackMentions(snapshot.content) : '';

  const lines: string[] = [];
  if (safePrompt) lines.push(safePrompt, '');
  if (safeTitle) lines.push(`*${safeTitle}*`, ''); // mrkdwn bold: *text*
  if (snapshot.url) lines.push(snapshot.url, '');
  if (safeDescription) lines.push(`> ${safeDescription}`, ''); // mrkdwn blockquote: > text
  if (snapshot.create_at) lines.push(`> ${timestampLabel} ${snapshot.create_at}`, '');
  if (safeContent) lines.push(safeContent);

  return lines.join('\n').trim();
  // No truncation needed (D-129): Slack 40K char limit
}
```
[VERIFIED: mrkdwn syntax from api.slack.com/reference/surfaces/formatting]

### Content Script Injection Guard

```typescript
// Source: Pattern from entrypoints/discord.content.ts lines 213-224
export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    const guarded = globalThis as typeof globalThis & {
      __web2chat_slack_registered?: boolean;
    };
    if (guarded.__web2chat_slack_registered) return;
    guarded.__web2chat_slack_registered = true;

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true;
    });
  },
});
```
[VERIFIED: exact pattern from discord.content.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-platform pipeline branches | Registry-driven adapter discovery | Phase 8 (2026-05-10) | New platforms need zero pipeline changes |
| Hardcoded Discord MAIN world port | Per-adapter port routing via prefix | Phase 8 (D-99, D-100) | New MAIN world adapters append to injector map |
| Single-level login detection | URL + DOM layered defense | Phase 9 (2026-05-10) | Slack needs both layers due to cross-host redirect |
| No selector confidence | Three-tier ARIA-first + low-confidence warning | Phase 9 (DSPT-04) | Tier3 matches trigger user confirmation popup |

**Deprecated/outdated:**
- `document.execCommand('insertText')`: Still works but deprecated. ClipboardEvent paste is the project standard.
- `innerText=` / `textContent=` on rich text editors: Always broken for Quill/Slate/Lexical. Forbidden by CLAUDE.md.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Slack uses Quill.js with `.ql-editor` class for message input | Pattern 2, Pattern 3 | Selectors fail; need to verify against live Slack DOM |
| A2 | Quill clears editor textContent after Enter triggers send | Pattern 4, Pitfall 2 | Send confirmation logic fails; would need MutationObserver |
| A3 | `beforeinput` deleteContentBackward works for Quill cleanup | Pattern 2, Pitfall 2 | Pre-paste cleanup fails; residual text from prior dispatches |
| A4 | Slack login DOM markers include email input and signin button | Pattern 4 | DOM login detection has false negatives; logged-out users get INPUT_NOT_FOUND instead of NOT_LOGGED_IN |
| A5 | Slack SPA routing uses `onHistoryStateUpdated` like Discord | Pattern 1 | SPA navigation not caught; timing issues on channel switch |

**If this table is empty:** All claims in this research were verified or cited -- no user confirmation needed.

## Open Questions

1. **Slack Quill editor behavior after Enter keydown**
   - What we know: Quill is the editor framework. Enter triggers send in Slack. Discord's Slate editor clears after send.
   - What's unclear: Whether Quill's textContent becomes empty immediately after Enter or requires a delay. Whether Slack has custom Quill configuration that changes this behavior.
   - Recommendation: Planner should implement textContent clear check (Discord pattern) and test against live Slack. If it fails, fall back to MutationObserver watching for new message nodes in the message list container.

2. **Slack login page DOM markers**
   - What we know: Slack redirects to `slack.com/check-login` or `/signin`. These pages have email inputs and sign-in forms.
   - What's unclear: Exact CSS selectors for login form elements. The suggested markers (`input[type="email"]`, `button[data-qa="sign_in_button"]`, `[class*="signin"]`) need verification against a real logged-out Slack page.
   - Recommendation: Planner should create a DOM fixture for the login page and use conservative markers (same approach as `discord-login-detect.ts`). Testing against live Slack during implementation is essential.

3. **Pre-paste cleanup via `beforeinput` on Quill**
   - What we know: This works for Discord's Slate editor. Quill handles `beforeinput` events differently.
   - What's unclear: Whether `InputEvent('beforeinput', { inputType: 'deleteContentBackward' })` correctly clears Quill's internal model.
   - Recommendation: Test this during implementation. If it desyncs Quill, alternative cleanup strategies include: (a) `document.execCommand('selectAll')` + `document.execCommand('delete')`, (b) Quill API `quill.deleteText(0, quill.getLength())`, (c) dispatching Backspace keydown events.

## Environment Availability

Step 2.6: SKIPPED (Phase 10 is pure code/config changes within the existing Chrome extension project. All dependencies are already installed. No external tools, services, or runtimes beyond what the project already uses.)

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + test | Yes | (existing) | -- |
| Vitest | Unit tests | Yes | (existing) | -- |
| WXT | Extension build | Yes | 0.20.26 | -- |
| Chrome (for E2E) | Manual testing | Required | -- | Human-run only |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test:unit -- --reporter=verbose` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SLK-01 | Slack URL pattern matching (positive + negative cases) | unit | `pnpm test:unit -- tests/unit/adapters/slack-match.spec.ts` | Wave 0 |
| SLK-01 | Registry includes slack entry with correct hostMatches | unit | `pnpm test:unit -- tests/unit/dispatch/platform-detector.spec.ts` | Exists |
| SLK-02 | Login detection DOM markers (positive + negative fixtures) | unit | `pnpm test:unit -- tests/unit/adapters/slack-login-detect.spec.ts` | Wave 0 |
| SLK-02 | loggedOutPathPatterns for Slack adapter | unit | `pnpm test:unit -- tests/unit/dispatch/logged-out-paths.spec.ts` | Exists |
| SLK-03 | Editor selector three-tier fallback (fixture-based) | unit | `pnpm test:unit -- tests/unit/adapters/slack-selector.spec.ts` | Wave 0 |
| SLK-03 | MAIN world bridge routes to slack injector | unit | `pnpm test:unit -- tests/unit/dispatch/mainWorldBridge.spec.ts` | Exists |
| SLK-03 | SPA filter includes app.slack.com | unit | `pnpm test:unit -- tests/unit/dispatch/spaFilter.spec.ts` | Exists |
| SLK-04 | Send confirmation (editor clear check) | unit | `pnpm test:unit -- tests/unit/adapters/slack-selector.spec.ts` | Wave 0 |
| SLK-05 | i18n key coverage en + zh_CN 100% | unit | `pnpm test:unit -- tests/unit/adapters/slack-i18n.spec.ts` | Wave 0 |
| SLK-05 | Platform icon tooltip displays | manual | Human UAT | N/A |

### Sampling Rate

- **Per task commit:** `pnpm test:unit -- --reporter=verbose`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/adapters/slack-match.spec.ts` -- covers SLK-01 URL matching
- [ ] `tests/unit/adapters/slack-format.spec.ts` -- covers D-128 mrkdwn formatting + D-130 mention escaping
- [ ] `tests/unit/adapters/slack-login-detect.spec.ts` -- covers SLK-02 DOM detection
- [ ] `tests/unit/adapters/slack-selector.spec.ts` -- covers SLK-03 selector fallback + SLK-04 send confirmation
- [ ] `tests/unit/adapters/slack.fixture.html` -- DOM fixture for selector and injection tests
- [ ] `tests/unit/adapters/slack-i18n.spec.ts` -- covers SLK-05 i18n key coverage

Existing tests that should pass automatically with new registry entry (no new files needed):
- `tests/unit/dispatch/platform-detector.spec.ts` -- registry discovery
- `tests/unit/dispatch/spaFilter.spec.ts` -- SPA filter generation
- `tests/unit/dispatch/logged-out-paths.spec.ts` -- loggedOutPathPatterns
- `tests/unit/dispatch/mainWorldBridge.spec.ts` -- MAIN world routing
- `tests/unit/dispatch/timeout-config.spec.ts` -- timeout inheritance

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Extension does not authenticate users |
| V3 Session Management | no | Extension has no sessions |
| V4 Access Control | no | Extension uses host_permissions, no RBAC |
| V5 Input Validation | yes | zod schema validation on dispatch payloads; escapeSlackMentions prevents mention injection |
| V6 Cryptography | no | No crypto operations in adapter |

### Known Threat Patterns for Chrome Extension DOM Injection

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mention injection (accidental notification) | Tampering | `escapeSlackMentions()` breaks all mention patterns with zero-width spaces |
| XSS via crafted page title/description | Tampering | Content sanitized through `@mozilla/readability` + `dompurify` before formatting; mrkdwn has no HTML rendering |
| Permission scope creep | Elevation of privilege | Static `host_permissions` limited to `https://app.slack.com/*`; no `<all_urls>` in static permissions (verified by `verify-manifest.ts`) |
| Content script re-injection race | Denial of service | Injection guard flag (`__web2chat_slack_registered`) prevents duplicate listeners |

## Sources

### Primary (HIGH confidence)

- Official Slack mrkdwn formatting docs: https://api.slack.com/reference/surfaces/formatting -- syntax reference for bold, italic, links, mentions, escaping
- Existing codebase: `entrypoints/discord.content.ts`, `background/injectors/discord-main-world.ts`, `shared/adapters/discord-format.ts`, `shared/adapters/discord-login-detect.ts` -- pattern reference for all Slack adapter components
- Existing codebase: `shared/adapters/registry.ts`, `shared/adapters/types.ts` -- registry-driven architecture confirmed
- Existing codebase: `shared/adapters/dispatch-policy.ts` -- timeout and login path detection patterns confirmed

### Secondary (MEDIUM confidence)

- Quill.js official docs (quilljs.com) -- `.ql-editor` class, `role="textbox"`, `contenteditable="true"` confirmed as standard Quill DOM structure
- Greasy Fork userscript targeting Slack -- confirmed `.ql-editor[role="textbox"]` selector and `[data-qa="texty_send_button"]` send button selector
- juretrigjav.si article -- confirmed Slack still uses Quill.js (not ProseMirror) for message input

### Tertiary (LOW confidence)

- Slack login redirect destinations (`slack.com/check-login`, `/signin`, `/workspace-signin`) -- from web search, needs verification against live Slack
- Slack login page DOM markers (`input[type="email"]`, `button[data-qa="sign_in_button"]`) -- assumed from common patterns, needs live verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, pure pattern replication
- Architecture: HIGH -- registry-driven pattern proven in Phase 8/9
- Selectors: MEDIUM -- Quill selectors well-known but Slack-specific customizations may differ
- Login detection: MEDIUM -- URL redirect pattern confirmed, DOM markers need live verification
- Send confirmation: MEDIUM -- assumed Quill behavior, needs live testing
- mrkdwn formatting: HIGH -- official Slack API documentation is authoritative

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (Slack DOM structure may change with client updates; mrkdwn syntax is stable)
