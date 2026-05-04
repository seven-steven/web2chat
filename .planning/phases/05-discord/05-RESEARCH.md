# Phase 5: Discord 适配器 - Research

**Researched:** 2026-05-05
**Domain:** Discord Web App DOM injection (Slate editor paste), SPA routing, webNavigation API, Chrome MV3 content scripts
**Confidence:** MEDIUM (DOM structure based on known patterns but not live-verified; ClipboardEvent injection path needs runtime confirmation)

## Summary

Phase 5 delivers the Discord adapter -- the second IM pipeline after OpenClaw. The adapter injects formatted messages into Discord's Slate-based rich text editor via synthetic `ClipboardEvent('paste')`, detects SPA channel switches via `chrome.webNavigation.onHistoryStateUpdated`, and guards against rate-limiting and login redirects.

The primary technical risk is the ClipboardEvent paste injection path. Discord uses a **fork of Slate.js** (older, pre-0.50 API, built on React + Immutable.js) [CITED: github.com/discord/slate]. Slate intercepts paste events, calls `event.preventDefault()`, and processes `event.clipboardData.getData('text/plain')` through its own `insertData` pipeline [CITED: docs.slatejs.org/libraries/slate-react/event-handling]. This means synthetic paste events carrying data via `DataTransfer.setData()` **should** work because Slate reads from the event payload, not the system clipboard. However, there is a world-boundary risk: the existing dispatch pipeline injects adapters in `ISOLATED` world, and DOM events dispatched from ISOLATED world may not propagate correctly through React's event delegation system (React 17+ attaches to root container, not `document`). The adapter should be tested in ISOLATED world first; if `clipboardData` doesn't cross the boundary, fall back to MAIN world injection.

**Primary recommendation:** Implement the Discord adapter following the established OpenClaw pattern (one-shot `ADAPTER_DISPATCH` listener, `defineContentScript({ registration: 'runtime' })`), with the paste injection as the key differentiation. Use ISOLATED world initially (consistent with OpenClaw), but architect the paste function as an isolatable unit so it can be moved to a MAIN world helper if needed. Build the DOM fixture HTML first, then validate selectors and paste injection against it before wiring the full pipeline.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-54: Same field order as OpenClaw + Discord Markdown dialect (`**bold**` not `## heading`)
- D-55: Single message + prompt-first truncation to 2000 chars
- D-56: Multi-message split deferred to v1.x
- D-57: Escape mention patterns only (`@everyone`, `@here`, `<@id>`, `<#channel>`, `<@&role>`) via zero-width space
- D-58: Escape function in `shared/adapters/discord-format.ts`
- D-59: Conditional popup footnote when platformId === 'discord'
- D-60: README ToS chapter deferred to Phase 7
- D-61: i18n namespace `discord.tos.*`
- D-62: ARIA-first three-level fallback selector: (1) `[role="textbox"][aria-label*="Message"]` (2) `[data-slate-editor="true"]` (3) `div[class*="textArea"]`
- D-63: ClipboardEvent paste injection with `DataTransfer.setData('text/plain', message)`
- D-64: Enter keydown triggers send
- D-65: MutationObserver confirms message appearance in chat list
- D-66: `webNavigation.onHistoryStateUpdated` top-level listener in `entrypoints/background.ts`
- D-67: waitForReady = channel anchor DOM appears (e.g., `[data-list-id="chat-messages-<channelId>"]`)
- D-68: Channel-switch safety: re-verify channelId before compose
- D-69: 5s same-channel rate limit via in-memory `Map<string, number>`
- D-70: Login detection = URL redirect to `/login`
- D-71: Reuse existing ErrorCode union (no new codes)
- D-72: Add `webNavigation` permission to manifest

### Claude's Discretion
- Exact ARIA selector `aria-label` value pattern
- Exact channel anchor DOM selector pattern
- Compose Markdown template precise formatting
- Discord DOM fixture acquisition method (manual snapshot recommended)
- Popup footnote visual style details
- Whether WXT auto-detects `webNavigation` permission
- E2E fixture form (local stub with Slate editor mock)

### Deferred Ideas (OUT OF SCOPE)
- Phase 6: runtime locale switch, ESLint hardcoded-string detector, ToS footnote copy polish
- Phase 7: README Discord ToS chapter file, PRIVACY.md
- v1.x: multi-message split, failure queue + retry, multi-target fan-out, custom message templates
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADD-01 | Discord adapter implementing IMAdapter interface | OpenClaw adapter reference pattern; registry append; `defineContentScript({ registration: 'runtime' })` |
| ADD-02 | match() parses `https://discord.com/channels/<server_id>/<channel_id>` | URL parsing via `new URL()`, path segment extraction, DM path rejection |
| ADD-03 | ClipboardEvent paste injection for Slate/Lexical editor | DataTransfer + ClipboardEvent constructor pattern; ISOLATED vs MAIN world analysis |
| ADD-04 | waitForReady via webNavigation + MutationObserver | `chrome.webNavigation.onHistoryStateUpdated` filter + DOM anchor polling |
| ADD-05 | ARIA-first selector with 5s timeout | Three-level fallback; `role="textbox"` + `aria-label` + `data-slate-editor` + class fragment |
| ADD-06 | Structured error codes for injection failure / login | `NOT_LOGGED_IN` via URL redirect detection; `INPUT_NOT_FOUND` / `TIMEOUT` via existing codes |
| ADD-07 | 5s rate limit + ToS risk statement | In-memory `Map<channelId, timestamp>`; conditional popup footnote with i18n |
| ADD-08 | `host_permissions` includes only `https://discord.com/*` | Already declared in Phase 1 manifest; verify-manifest.ts validates |
| ADD-09 | Unit tests on DOM fixture HTML | Discord DOM fixture with Slate-like structure; selector validation + paste injection test |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Discord URL matching | Shared (popup + SW) | -- | Pure function in `shared/adapters/registry.ts`, imported by both popup and SW |
| Message formatting + truncation | Shared (pure module) | -- | `shared/adapters/discord-format.ts` -- no chrome.* dependency |
| Mention escaping | Shared (pure module) | -- | Same file as formatting, pure function |
| ClipboardEvent paste injection | Content script (Discord tab) | -- | Runs in Discord page context, accesses DOM directly |
| Channel readiness detection | Content script + Background SW | -- | SW registers `webNavigation.onHistoryStateUpdated`; adapter content script polls DOM |
| Rate limiting | Content script | -- | Module-scope `Map<string, number>` in adapter (content script lifetime = tab lifetime) |
| Login detection | Background SW | -- | Dispatch pipeline detects URL mismatch after `tabs.onUpdated:complete` |
| ToS footnote | Popup (Preact) | -- | Conditional JSX in `SendForm.tsx` |
| Permission declaration | Manifest | -- | Static `webNavigation` in `permissions` array |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.25 | Extension framework | [VERIFIED: pnpm list] Project standard |
| Preact | 10.29.x | Popup UI (ToS footnote) | [VERIFIED: pnpm list] Project standard |
| Vitest | 3.2.4 | Unit testing | [VERIFIED: pnpm list] Project standard |
| Playwright | 1.59.1 | E2E testing | [VERIFIED: pnpm list] Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @wxt-dev/i18n | 0.2.5 | i18n for ToS footnote keys | All user-facing strings |
| zod | 3.24.x | Payload validation | Already used for cross-context messaging |

No new dependencies needed for Phase 5.

## Architecture Patterns

### System Architecture Diagram

```
User clicks "Send" in popup (platformId = discord)
       │
       ▼
┌─────────────────────────────────────────────────┐
│  SW dispatch-pipeline (background)              │
│  ┌──────────────────────────────────────────┐   │
│  │ 1. findAdapter('discord') → registry hit │   │
│  │ 2. chrome.tabs.create/update(discord URL)│   │
│  │ 3. tabs.onUpdated:complete               │   │
│  │    OR webNavigation.onHistoryStateUpdated │   │
│  │ 4. chrome.scripting.executeScript         │   │
│  │    { files: ['content-scripts/discord.js']│   │
│  │      world: 'ISOLATED' }                 │   │
│  │ 5. chrome.tabs.sendMessage               │   │
│  │    { type: 'ADAPTER_DISPATCH', payload } │   │
│  └──────────────┬───────────────────────────┘   │
└─────────────────┼───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Discord adapter content script                 │
│  ┌──────────────────────────────────────────┐   │
│  │ handleDispatch(payload)                  │   │
│  │  ├─ canDispatch: URL channelId check     │   │
│  │  ├─ rateLimitGuard: 5s same-channel      │   │
│  │  ├─ waitForReady: MutationObserver       │   │
│  │  │   wait for [role="textbox"] DOM       │   │
│  │  ├─ compose: escapeMentions +            │   │
│  │  │   composeDiscordMarkdown +            │   │
│  │  │   truncate to 2000 chars              │   │
│  │  ├─ paste: ClipboardEvent('paste') with  │   │
│  │  │   DataTransfer('text/plain', msg)     │   │
│  │  ├─ send: KeyboardEvent('keydown',       │   │
│  │  │   { key: 'Enter' })                   │   │
│  │  └─ confirm: MutationObserver on         │   │
│  │      message list container              │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                  │
                  ▼
    Response { ok: true } or { ok: false, code, message }
```

### Recommended Project Structure (new/modified files)

```
shared/adapters/
├── discord-format.ts        # NEW: compose + truncate + escapeMentions (pure)
├── registry.ts              # MODIFY: append discord entry
├── types.ts                 # UNCHANGED (PlatformId already has 'discord')
entrypoints/
├── background.ts            # MODIFY: add webNavigation.onHistoryStateUpdated listener
├── discord.content.ts       # NEW: Discord adapter content script
├── popup/components/
│   ├── SendForm.tsx          # MODIFY: add conditional ToS footnote
│   └── PlatformIcon.tsx      # MODIFY: replace 'D' letterform with Discord brand SVG
locales/
├── en.yml                   # MODIFY: add discord.tos.* keys
├── zh_CN.yml                # MODIFY: add discord.tos.* keys
wxt.config.ts                # MODIFY: add 'webNavigation' to permissions
scripts/
├── verify-manifest.ts       # MODIFY: add 'webNavigation' to expected permissions set
tests/
├── unit/adapters/
│   ├── discord-format.spec.ts     # NEW: compose + truncate + escape
│   ├── discord-match.spec.ts      # NEW: URL matching
│   ├── discord-selector.spec.ts   # NEW: selector + paste on fixture
│   └── discord.fixture.html       # NEW: Discord DOM fixture
├── e2e/fixtures/
│   └── discord/
│       └── index.html             # NEW: Discord stub page with Slate-like editor
├── e2e/
│   ├── discord-dispatch.spec.ts   # NEW: happy path E2E
│   ├── discord-channel-switch.spec.ts  # NEW: channel safety E2E
│   └── discord-login.spec.ts     # NEW: login redirect E2E
```

### Pattern 1: ClipboardEvent Paste Injection
**What:** Synthetic paste event with embedded DataTransfer payload
**When to use:** Injecting text into Slate/Lexical contenteditable editors that intercept paste events
**Key insight:** Slate calls `event.preventDefault()` and reads `event.clipboardData.getData('text/plain')` -- it does NOT rely on the browser's native paste behavior. Therefore, a synthetic event carrying data via `DataTransfer.setData()` should work because the data is in the event itself, not from the system clipboard. [CITED: docs.slatejs.org/libraries/slate-react/event-handling, w3.org/TR/clipboard-apis/]
**Example:**
```typescript
// Source: MDN ClipboardEvent + W3C Clipboard API spec synthesis
function pasteText(editor: HTMLElement, text: string): void {
  editor.focus();
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: dt,
    bubbles: true,
    cancelable: true,
  }));
}
```

### Pattern 2: ARIA-First Selector Fallback
**What:** Three-level selector chain with immediate-return on first hit
**When to use:** Finding Discord's message input which may change class names but maintains ARIA attributes
**Example:**
```typescript
// Source: CONTEXT.md D-62
function findEditor(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]') ??
    document.querySelector<HTMLElement>('[data-slate-editor="true"]') ??
    document.querySelector<HTMLElement>('div[class*="textArea"] [contenteditable="true"]')
  );
}
```

### Pattern 3: SPA Channel Switch Detection
**What:** `webNavigation.onHistoryStateUpdated` listener for Discord SPA routing
**When to use:** Detecting when Discord navigates between channels via `history.pushState()`
**Example:**
```typescript
// Source: Chrome webNavigation docs
// In entrypoints/background.ts — top-level sync registration
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    // details.tabId, details.url — advance dispatch state machine
  },
  { url: [{ hostSuffix: 'discord.com' }] }
);
```

### Anti-Patterns to Avoid
- **`textContent =` / `innerText =` on Slate editor:** Bypasses Slate's internal data model; editor won't register the change (character counter stays at 0, send button stays disabled). [CITED: dev.to/hirehawk_devops/...slate article]
- **`document.execCommand('insertText')` for Slate:** Inserts raw text without creating proper Slate nodes; document state becomes inconsistent. [CITED: github.com/ianstormtaylor/slate/discussions/5721]
- **Module-scope mutable state in SW:** Rate limit `Map` belongs in content script (tab lifetime), not SW (ephemeral). SW must be stateless per CLAUDE.md contract.
- **`setInterval` / `setTimeout` in SW:** Use `chrome.alarms` for SW scheduling. Popup and content scripts can use `setTimeout`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message formatting | Custom string builder | `composeDiscordMarkdown()` pure function | Parallel to existing `openclaw-format.ts` |
| URL parsing | Regex-based URL match | `new URL()` + path segment extraction | Edge cases in URL parsing (encoding, trailing slash) |
| Mention escaping | Per-field inline escape | Centralized `escapeMentions()` function | Must run on ALL user-provided fields; single point of maintenance |
| Element waiting | `setInterval` polling loop | `MutationObserver` + `setTimeout` cleanup | Already established pattern in OpenClaw adapter |
| Error codes | New Discord-specific codes | Existing `ErrorCode` union | D-71 locked: `NOT_LOGGED_IN` / `INPUT_NOT_FOUND` / `TIMEOUT` / `RATE_LIMITED` suffice |

**Key insight:** Phase 5 follows Phase 4's established patterns exactly -- the IMAdapter contract, content script protocol, and error handling are already proven. The only new technique is ClipboardEvent paste (vs property-descriptor setter in Phase 4).

## Common Pitfalls

### Pitfall 1: ISOLATED World ClipboardEvent May Not Reach Slate
**What goes wrong:** Synthetic `ClipboardEvent` dispatched from ISOLATED world content script may not propagate correctly through React's event delegation system. React 17+ attaches event listeners to the root container, and DOM events from ISOLATED world share the DOM but not the JS context. The `DataTransfer` object may not serialize across the world boundary.
**Why it happens:** Chrome's ISOLATED world shares DOM access but isolates JS execution. `DataTransfer` objects created in ISOLATED world may appear as empty or null when read by React handlers in MAIN world. [CITED: developer.chrome.com/docs/extensions/develop/concepts/content-scripts]
**How to avoid:** Test paste injection in unit tests first (using DOM fixture in Vitest happy-dom environment). If that works, test in E2E. If ISOLATED world fails at runtime, the adapter script can be split: keep the message listener and control flow in ISOLATED world (for `chrome.runtime.onMessage` access), but inject a minimal MAIN world helper script that only handles the DOM paste event dispatch.
**Warning signs:** Text appears in DOM but Discord doesn't register it; character counter stays at 0; send button remains disabled after paste.

### Pitfall 2: Discord Class Names Are Unstable
**What goes wrong:** CSS class selectors like `div[class*="textArea-xyz123"]` break on Discord updates because Discord uses CSS Modules with random suffixes. [CITED: docs.betterdiscord.app/plugins/tutorials/dom]
**Why it happens:** CSS Modules append unique hashes to class names at build time. Discord deploys frequently.
**How to avoid:** D-62 locks ARIA-first selector strategy. Class-based selector is tier-3 fallback only. Unit tests on fixture validate all three tiers. Add comments noting which selectors are stable vs fragile.
**Warning signs:** `INPUT_NOT_FOUND` errors appearing in production after no code changes.

### Pitfall 3: SPA Channel Switch Race Condition
**What goes wrong:** User dispatches to channel A, then quickly switches to channel B. Adapter injects message into channel B instead of A.
**Why it happens:** Discord is an SPA -- channel switches don't reload the page. The adapter's DOM references may point to the new channel's elements.
**How to avoid:** D-68 locks channel-switch safety: re-verify `channelId` from current URL before compose. If mismatch, return `Err('INPUT_NOT_FOUND', 'Channel mismatch')`.
**Warning signs:** Messages appearing in wrong channels during rapid navigation.

### Pitfall 4: `webNavigation` Permission Missing from Manifest
**What goes wrong:** `chrome.webNavigation.onHistoryStateUpdated` throws at runtime because `webNavigation` is not in the manifest `permissions` array.
**Why it happens:** WXT does NOT auto-detect permission requirements from API usage in code [VERIFIED: WXT docs -- permissions are declared in `wxt.config.ts` manifest callback, not auto-inferred]. [CITED: wxt.dev/guide/essentials/entrypoints]
**How to avoid:** Manually add `'webNavigation'` to the `permissions` array in `wxt.config.ts`. Update `scripts/verify-manifest.ts` expected set to include `'webNavigation'`.
**Warning signs:** Console error "Cannot read properties of undefined (reading 'addListener')" at SW startup.

### Pitfall 5: `aria-label` Language Sensitivity
**What goes wrong:** Selector `[aria-label*="Message"]` fails for users who have Discord set to a non-English language, because `aria-label` value changes with Discord's locale (e.g., "Message #general" in English vs localized equivalent). [CITED: docs.betterdiscord.app/plugins/tutorials/dom]
**Why it happens:** Discord localizes ARIA labels.
**How to avoid:** Selector tier-1 uses `aria-label*="Message"` as a hint; tier-2 `[data-slate-editor="true"]` is language-independent. The three-level fallback ensures at least one selector works regardless of locale. The fixture HTML should test with English labels; the fallback chain handles non-English.
**Warning signs:** Adapter works for English Discord users but fails for non-English users.

### Pitfall 6: Rate Limit Map Survives Tab Reload
**What goes wrong:** The in-memory `Map<channelId, timestamp>` in the content script is cleared when the content script is re-injected (e.g., after tab reload or navigation), losing rate limit state.
**Why it happens:** Content scripts are ephemeral -- they're injected fresh each time via `chrome.scripting.executeScript`.
**How to avoid:** This is actually acceptable for Phase 5. The rate limit is a UX safeguard against double-clicks, not a security mechanism. Fresh injection = fresh Map = no stale rate limits. D-69 specifies "adapter 内维护" (adapter-maintained), confirming in-memory is intentional.
**Warning signs:** None -- this is expected behavior.

## Code Examples

### Discord Message Compose + Truncation
```typescript
// Source: CONTEXT.md D-54/D-55/D-57 synthesis
const DISCORD_CHAR_LIMIT = 2000;
const TRUNCATION_SUFFIX = '\n...[truncated]';

export function escapeMentions(text: string): string {
  return text
    .replace(/@(everyone|here)/g, '@​$1')           // zero-width space
    .replace(/<@[!&]?\d+>/g, (m) => m[0] + '​' + m.slice(1))
    .replace(/<#\d+>/g, (m) => m[0] + '​' + m.slice(1));
}

export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}

export function composeDiscordMarkdown(payload: {
  prompt: string;
  snapshot: Snapshot;
}): string {
  const s = {
    title: escapeMentions(payload.snapshot.title),
    url: payload.snapshot.url,
    description: escapeMentions(payload.snapshot.description),
    create_at: payload.snapshot.create_at,
    content: escapeMentions(payload.snapshot.content),
  };
  const prompt = escapeMentions(payload.prompt);

  const lines: string[] = [];
  if (prompt) lines.push(prompt, '');
  if (s.title) lines.push(`**${s.title}**`, '');
  if (s.url) lines.push(s.url, '');
  if (s.description) lines.push(`> ${s.description}`, '');
  if (s.create_at) lines.push(`> 采集时间: ${s.create_at}`, '');
  if (s.content) lines.push(s.content);

  let result = lines.join('\n').trim();

  if (result.length > DISCORD_CHAR_LIMIT) {
    result = truncateWithPriority(payload, prompt, s, DISCORD_CHAR_LIMIT);
  }
  return result;
}
```

### Discord Adapter Registry Entry
```typescript
// Source: CONTEXT.md §adapter registry entry
{
  id: 'discord' as const,
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return (
        u.hostname === 'discord.com' &&
        u.pathname.startsWith('/channels/') &&
        !u.pathname.startsWith('/channels/@me/')
      );
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/discord.js',
  hostMatches: ['https://discord.com/*'],
  iconKey: 'platform_icon_discord',
}
```

### webNavigation Listener Registration
```typescript
// Source: Chrome webNavigation docs + CLAUDE.md SW discipline
// In entrypoints/background.ts — inside defineBackground() closure, top-level sync
chrome.webNavigation.onHistoryStateUpdated.addListener(
  onHistoryStateUpdated,  // imported from dispatch-pipeline or local handler
  { url: [{ hostSuffix: 'discord.com' }] }
);
```

### Discord DOM Fixture (for unit + E2E tests)
```html
<!-- Source: Slate.js Editable component docs + BetterDiscord DOM docs synthesis -->
<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>Discord Stub</title></head>
<body>
  <div id="app-mount">
    <div class="chat-xyz123">
      <!-- Message list container -->
      <div data-list-id="chat-messages-12345" role="list">
        <div class="message-abc" data-testid="message-bubble">
          <span>Existing message</span>
        </div>
      </div>
      <!-- Slate editor -->
      <div class="textArea-def456">
        <div
          role="textbox"
          aria-label="Message #general"
          contenteditable="true"
          data-slate-editor="true"
          data-slate-node="value"
          aria-multiline="true"
        >
          <div data-slate-node="element">
            <span data-slate-node="text">
              <span data-slate-leaf="true">
                <span data-slate-zero-width="z" data-slate-length="0">&#xFEFF;</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    // Simulate Slate paste handling + Enter send
    const editor = document.querySelector('[data-slate-editor="true"]');
    const messageList = document.querySelector('[role="list"]');

    editor.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (text) {
        // Simulate Slate inserting text into its data model
        editor.querySelector('[data-slate-node="text"]').textContent = text;
        editor.dataset.slateValue = text;
      }
    });

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = editor.dataset.slateValue || editor.textContent.trim();
        if (text) {
          const msg = document.createElement('div');
          msg.className = 'message';
          msg.setAttribute('data-testid', 'message-bubble');
          msg.textContent = text;
          messageList.appendChild(msg);
          // Clear editor
          editor.querySelector('[data-slate-node="text"]').textContent = '﻿';
          delete editor.dataset.slateValue;
        }
      }
    });
  </script>
</body>
</html>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('insertText')` | ClipboardEvent paste or InputEvent | Deprecated since 2020 | execCommand still works in some browsers but unreliable for Slate [CITED: github.com/ianstormtaylor/slate/discussions/5721] |
| React event handlers on `document` | React 17+ delegates to root container | React 17 (2020) | Events must bubble up to React root, not document [ASSUMED] |
| Accessing Slate editor via React fiber | Synthetic events on DOM | Ongoing | Fiber access is fragile and breaks on React updates [CITED: github.com/ianstormtaylor/slate/discussions/5721] |
| Hash-based SPA routing (#) | history.pushState SPA routing | Standard | Discord uses pushState; `onHistoryStateUpdated` (not `onReferenceFragmentUpdated`) is the correct listener [CITED: developer.chrome.com/docs/extensions/reference/api/webNavigation] |

**Deprecated/outdated:**
- `document.execCommand('paste')`: Deprecated, requires `clipboardRead` permission, reads from system clipboard (not what we want)
- Accessing React internal fibers: Unstable across React versions; Discord upgraded to React 19 in 2025 [CITED: discord.com/blog/discord-patch-notes-june-3-2025]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Discord's Slate editor uses `role="textbox"` with `aria-label` containing "Message" | Architecture Patterns, Pattern 2 | Tier-1 selector fails; tier-2 `data-slate-editor` should catch it |
| A2 | Discord channel message list uses `data-list-id="chat-messages-<channelId>"` | CONTEXT.md D-67 | waitForReady anchor selector fails; need to discover actual attribute via live inspection |
| A3 | Synthetic ClipboardEvent with DataTransfer works from ISOLATED world in Chrome MV3 | Pitfall 1 | Adapter paste injection fails entirely; must switch to MAIN world or dual-world approach |
| A4 | Discord SPA routing uses `history.pushState()` (not hash routing) | Architecture Patterns, Pattern 3 | `onHistoryStateUpdated` doesn't fire; would need `onReferenceFragmentUpdated` instead |
| A5 | Discord does not check `event.isTrusted` on paste events | Pattern 1 | Synthetic paste events silently rejected; would need to use alternative injection method |
| A6 | `aria-label*="Message"` pattern works for English locale Discord | Pitfall 5 | Non-English users hit tier-2/3 fallback selectors |
| A7 | React 17+ event delegation at root container applies to Discord's current React 19 | Pitfall 1 | Event bubbling path may differ from expected |

## Open Questions (RESOLVED)

1. **Does synthetic ClipboardEvent paste work from ISOLATED world?** (RESOLVED)
   - Resolution: Proceed with ISOLATED world (consistent with OpenClaw adapter). Unit tests validate paste injection via DOM fixture in Vitest happy-dom environment. E2E tests validate in real Chromium. If ISOLATED world fails at runtime (DataTransfer doesn't serialize across world boundary), the fallback is documented: inject a minimal MAIN world helper via `chrome.scripting.executeScript({ func, args, world: 'MAIN' })` that only dispatches the paste event. The adapter content script's `pasteText()` function is architected as an isolatable unit for this purpose.

2. **Exact Discord channel anchor DOM selector** (RESOLVED)
   - Resolution: Using `[data-list-id^="chat-messages-"]` pattern per D-67. Validated against committed DOM fixture. If live Discord uses a different attribute, the selector is a single constant in `discord.content.ts` that can be updated without architecture changes. Treated as a maintained constant.

3. **Does WXT auto-add `webNavigation` to manifest permissions?** (RESOLVED)
   - Resolution: No, WXT does NOT auto-detect permission requirements from API usage [VERIFIED: WXT docs]. Plan 01 manually adds `'webNavigation'` to the `permissions` array in `wxt.config.ts` and updates `scripts/verify-manifest.ts` expected set. Verified by build + manifest inspection.


## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + Playwright 1.59.1 |
| Config file | `vitest.config.ts` + `playwright.config.ts` |
| Quick run command | `pnpm test -- --run tests/unit/adapters/discord` |
| Full suite command | `pnpm test && pnpm build && pnpm test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADD-01 | Discord adapter implements IMAdapter | unit | `pnpm test -- --run tests/unit/adapters/discord-match.spec.ts` | Wave 0 |
| ADD-02 | match() parses Discord channel URLs | unit | `pnpm test -- --run tests/unit/adapters/discord-match.spec.ts` | Wave 0 |
| ADD-03 | ClipboardEvent paste injection | unit + e2e | `pnpm test -- --run tests/unit/adapters/discord-selector.spec.ts` | Wave 0 |
| ADD-04 | waitForReady via webNavigation + MutationObserver | e2e | `pnpm test:e2e -- discord-dispatch.spec.ts` | Wave 0 |
| ADD-05 | ARIA-first selector 5s timeout | unit | `pnpm test -- --run tests/unit/adapters/discord-selector.spec.ts` | Wave 0 |
| ADD-06 | Error codes for injection failure / login | e2e | `pnpm test:e2e -- discord-login.spec.ts` | Wave 0 |
| ADD-07 | 5s rate limit + ToS footnote | unit + e2e | `pnpm test -- --run tests/unit/adapters/discord-format.spec.ts` | Wave 0 |
| ADD-08 | host_permissions verification | unit | `pnpm test -- --run tests/unit/scripts/verify-manifest.spec.ts` | Already exists |
| ADD-09 | Selectors validated on fixture | unit | `pnpm test -- --run tests/unit/adapters/discord-selector.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- --run` (focused)
- **Per wave merge:** `pnpm test && pnpm typecheck`
- **Phase gate:** `pnpm test && pnpm build && pnpm test:e2e -- discord`

### Wave 0 Gaps
- [ ] `tests/unit/adapters/discord-format.spec.ts` -- covers ADD-07 (compose + truncation + escape)
- [ ] `tests/unit/adapters/discord-match.spec.ts` -- covers ADD-01, ADD-02 (URL matching)
- [ ] `tests/unit/adapters/discord-selector.spec.ts` -- covers ADD-03, ADD-05, ADD-09 (selector + paste on fixture)
- [ ] `tests/unit/adapters/discord.fixture.html` -- Discord DOM fixture
- [ ] `tests/e2e/fixtures/discord/index.html` -- Discord stub page for E2E
- [ ] `tests/e2e/discord-dispatch.spec.ts` -- covers ADD-04
- [ ] `tests/e2e/discord-login.spec.ts` -- covers ADD-06
- [ ] `tests/e2e/discord-channel-switch.spec.ts` -- covers D-68

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- adapter relies on user's existing Discord session |
| V3 Session Management | No | N/A -- no session tokens managed by extension |
| V4 Access Control | Yes | Static `host_permissions: ["https://discord.com/*"]` -- no `<all_urls>` in static permissions |
| V5 Input Validation | Yes | `escapeMentions()` sanitizes user content before injection; zod schema for message payload |
| V6 Cryptography | No | N/A |

### Known Threat Patterns for Discord Adapter

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mention injection (`@everyone`) | Tampering | `escapeMentions()` inserts zero-width space to break mention patterns (D-57) |
| Cross-channel message injection | Tampering | channelId verification before compose (D-68) |
| Content script in MAIN world exposes extension internals | Information Disclosure | Keep adapter in ISOLATED world; only move paste helper to MAIN if needed, with minimal surface |
| ToS violation / account ban | Compliance | Popup footnote + README disclaimer (D-59/D-60) |
| Error message information leak | Information Disclosure | Reuse existing ErrorBanner pattern (i18n text only, no raw error messages) -- per Phase 2 decision |

## Sources

### Primary (HIGH confidence)
- [WXT docs via Context7](/llmstxt/wxt_dev_llms_txt) -- content script `world: 'MAIN'` support, `registration: 'runtime'`
- [Chrome webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) -- permission requirements, `onHistoryStateUpdated` behavior
- [Chrome content scripts docs](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) -- ISOLATED vs MAIN world behavior
- [MDN ClipboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event) -- synthetic paste event limitations
- [W3C Clipboard API spec](https://www.w3.org/TR/clipboard-apis/) -- DataTransfer on synthetic events
- [Slate.js Event Handling docs](https://docs.slatejs.org/libraries/slate-react/event-handling) -- Slate's onPaste handler behavior

### Secondary (MEDIUM confidence)
- [Discord's Slate fork (GitHub)](https://github.com/discord/slate) -- older Slate API, React + Immutable.js based
- [BetterDiscord DOM docs](https://docs.betterdiscord.app/plugins/tutorials/dom) -- Discord CSS Modules randomization, DOM structure insights
- [Discord Markdown Guide (Gist)](https://gist.github.com/matthewzring/9f7bbfd102003963f9be7dbcf7d40e51) -- supported Markdown subset
- [Discord Support: Markdown](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline) -- official formatting reference
- [Slate Discussion #5721](https://github.com/ianstormtaylor/slate/discussions/5721) -- Chrome extension + Slate programmatic text insertion

### Tertiary (LOW confidence)
- [DEV.to article on Slate programmatic insert](https://dev.to/hirehawk_devops/how-to-programmatically-insert-text-into-a-slatejs-contenteditable-so-it-registers-as-user-input-52h6) -- unanswered question, confirms the problem space
- [JavaSpring article on React event forcing](https://www.javaspring.net/blog/force-react-to-fire-event-through-injected-javascript/) -- React event delegation from MAIN world
- [Discord Patch Notes June 2025](https://discord.com/blog/discord-patch-notes-june-3-2025) -- React 19 upgrade confirmation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all project standard
- Architecture: MEDIUM -- follows proven OpenClaw pattern, but ClipboardEvent injection is unverified at runtime
- Pitfalls: MEDIUM-HIGH -- well-documented issues; primary risk (world boundary) has clear fallback strategy
- Discord DOM structure: LOW -- based on Slate docs + BetterDiscord community knowledge, not live inspection
- webNavigation behavior: HIGH -- official Chrome docs

**Research date:** 2026-05-05
**Valid until:** 2026-05-19 (Discord DOM structure may change on any deploy; selectors treated as maintained constants)
