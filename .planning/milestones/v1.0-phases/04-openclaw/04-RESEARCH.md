# Phase 4: OpenClaw 适配器 - Research

**Researched:** 2026-05-01
**Domain:** Chrome MV3 adapter implementation — DOM injection, runtime permissions, MutationObserver confirmation
**Confidence:** HIGH (adapter patterns established in Phase 3; permissions API well-documented)

## Summary

Phase 4 implements the first real adapter (OpenClaw), validating the full dispatch pipeline end-to-end. The codebase from Phase 3 provides a complete adapter registration pattern (mock-platform), a dispatch state machine, and an ErrorBanner system that Phase 4 extends with 2 new error codes and a permission-grant UX.

The most critical architectural discovery is that `chrome.permissions.request()` **requires a user-gesture context** and CANNOT be called from the service worker's `startDispatch` handler. D-44's intent (check in dispatch-pipeline before openOrActivateTab) must be implemented as a two-step pattern: (1) popup calls `chrome.permissions.request` in its Confirm click handler (user gesture present), (2) SW's `startDispatch` calls `chrome.permissions.contains` as a defensive guard. This is the only viable MV3 approach.

OpenClaw's built-in WebChat UI uses React with a standard `<textarea>` element inside `.agent-chat__input > textarea`. The URL pattern is `http://localhost:18789/ui/chat?session=agent:<agent>:<session>` (with colons URL-encoded as `%3A` in some browsers). The `setInputValue` helper (property-descriptor setter + bubbling input event) will work correctly for this React-controlled textarea.

**Primary recommendation:** Implement permissions.request in the popup's Confirm handler (satisfying user-gesture requirement), then proceed with adapter implementation following mock-platform patterns exactly. Use a local HTML fixture for E2E (not a live OpenClaw instance).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-39:** Prompt-first Markdown format. compose() output: prompt first, blank line, then snapshot fields (title/url/description/create_at/content)
- **D-40:** All 5 fields included; empty fields omitted entirely
- **D-41:** No truncation for OpenClaw (unlimited)
- **D-42:** Permission request on Confirm click (not on input); 800ms debounce indicator for ungranted origin
- **D-43:** ErrorBanner + re-authorize button on permission deny
- **D-44:** dispatch-pipeline checks permission before openOrActivateTab; content script cannot call chrome.permissions
- **D-45:** Independent `grantedOrigins` storage item (`string[]`)
- **D-46:** Options page simple list + remove button for granted origins
- **D-47:** CSS selector priority for OpenClaw textarea
- **D-48:** Generic `setInputValue` helper in `shared/dom-injector.ts`
- **D-49:** Enter keydown triggers send
- **D-50:** MutationObserver confirms message appeared (5s timeout)
- **D-51:** waitForReady 5s timeout via MutationObserver
- **D-52:** canDispatch within adapter content script
- **D-53:** DOM check distinguishes OPENCLAW_OFFLINE vs INPUT_NOT_FOUND

### Claude's Discretion

- OpenClaw textarea CSS selector (research phase determines)
- compose Markdown template exact format
- OPENCLAW_OFFLINE vs INPUT_NOT_FOUND DOM feature detection logic
- grantedOrigins schema version (whether to bump)
- Options page granted origins UI layout details
- E2E fixture strategy (local stub vs live service)
- dispatch-pipeline permissions.request call site structure

### Deferred Ideas (OUT OF SCOPE)

- Discord adapter, Slate/Lexical paste, Discord ToS (Phase 5)
- Runtime locale switch, ESLint hardcoded-string (Phase 6)
- PRIVACY.md, README (Phase 7)
- Retry queue, fan-out, custom templates (v1.x)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADO-01 | OpenClaw adapter implementing IMAdapter interface | Mock-platform reference + registry pattern fully documented |
| ADO-02 | match() identifies `localhost:18789/chat?session=agent:<a>:<s>` pattern | URL pattern research: `/ui/chat?session=agent:...` confirmed |
| ADO-03 | React-controlled-input injection via property-descriptor setter | setInputValue helper pattern + `.agent-chat__input > textarea` selector |
| ADO-04 | Enter keydown + MutationObserver send confirmation | Standard DOM event synthesis + observer pattern documented |
| ADO-05 | Playwright E2E full chain | Fixture-based approach + dev-mode permission bypass strategy |
| ADO-06 | No static OpenClaw URL in manifest; dynamic runtime permission | optional_host_permissions + chrome.permissions.request user-gesture constraint |
| ADO-07 | Permission request UX on Confirm + persistence + retry | Popup-side request (user gesture) + SW-side contains guard + grantedOrigins storage |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Permission request UX | Popup (browser) | SW (guard) | `chrome.permissions.request` requires user gesture = popup click handler; SW only does `contains` check |
| Adapter content script (compose/send) | Content Script (target tab) | -- | Adapter runs in OpenClaw page's isolated world |
| Dispatch orchestration | SW (background) | -- | Opens tab, injects script, relays messages |
| Storage (grantedOrigins) | SW + Popup | Options page | All access via typed repo; any context reads |
| Options granted origins UI | Options page | -- | Static display + remove action |

## Standard Stack

### Core (no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wxt | 0.20.25+ | Extension framework | Already installed; content script `registration: 'runtime'` pattern proven |
| preact | 10.29.x | Options page UI | Already used for popup + options |
| @preact/signals | 2.x | Reactive state | Options page component state |
| zod | 3.24.x | Schema validation | Validate adapter dispatch payload |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 3.2.x | Unit tests | Adapter match/compose unit tests |
| @playwright/test | 1.58.x | E2E tests | Full dispatch chain verification |
| fake-browser (wxt/testing) | -- | Chrome API mocking | Unit tests for permission logic |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Property-descriptor setter | el.value = text + event | React ignores plain assignment; descriptor setter is the only reliable path |
| MutationObserver for send confirm | setTimeout polling | MO is event-driven, more reliable, no arbitrary delays |
| Local HTML fixture for E2E | Live OpenClaw instance | Fixture is deterministic, no external dependency |

**Installation:**
```bash
# No new packages needed — Phase 4 uses only existing dependencies
```

## Architecture Patterns

### System Architecture Diagram

```
User clicks Confirm in Popup
         │
         ├─ [1] popup: chrome.permissions.request({ origins: [origin+'/*'] })
         │         ├─ DENIED → ErrorBanner('OPENCLAW_PERMISSION_DENIED') + "Re-authorize" btn
         │         └─ GRANTED → grantedOriginsRepo.add(origin)
         │
         ├─ [2] popup: sendMessage('dispatch.start', { dispatchId, send_to, prompt, snapshot })
         │
         ▼
    SW dispatch-pipeline.startDispatch()
         │
         ├─ [3] chrome.permissions.contains({ origins: [origin+'/*'] })  ← defensive guard
         │         └─ FALSE → Err('OPENCLAW_PERMISSION_DENIED')  ← shouldn't happen normally
         │
         ├─ [4] openOrActivateTab(send_to)
         │         └─ tab created/activated → onUpdated:complete
         │
         ├─ [5] chrome.scripting.executeScript({ target:{tabId}, files:['content-scripts/openclaw.js'] })
         │
         ├─ [6] chrome.tabs.sendMessage(tabId, { type:'ADAPTER_DISPATCH', payload })
         │
         ▼
    OpenClaw Adapter Content Script
         │
         ├─ [7] canDispatch(): check textarea exists + OpenClaw feature DOM
         │         ├─ No feature DOM → Err('OPENCLAW_OFFLINE')
         │         └─ No textarea   → Err('INPUT_NOT_FOUND')
         │
         ├─ [8] compose(message): setInputValue(textarea, formattedMarkdown)
         │
         ├─ [9] send(): KeyboardEvent('keydown', { key:'Enter' }) + MutationObserver confirm
         │         └─ 5s timeout → Err('TIMEOUT')
         │
         └─ [10] sendResponse({ ok: true })
```

### Recommended Project Structure

```
shared/
├── adapters/
│   ├── types.ts              # IMAdapter, AdapterRegistryEntry (extend PlatformId union — already done)
│   └── registry.ts           # append openclaw entry
├── dom-injector.ts           # NEW: setInputValue(el, text)
├── messaging/
│   └── result.ts             # extend ErrorCode union: + OPENCLAW_OFFLINE + OPENCLAW_PERMISSION_DENIED
├── storage/
│   ├── items.ts              # NEW: grantedOriginsItem
│   └── repos/
│       └── grantedOrigins.ts # NEW: list/add/remove/has

entrypoints/
├── openclaw.content.ts       # NEW: adapter content script
├── popup/components/
│   ├── SendForm.tsx          # MODIFY: add permission request in handleConfirm
│   └── ErrorBanner.tsx       # MODIFY: add OPENCLAW_* codes to switch cases
├── options/
│   ├── App.tsx               # MODIFY: replace ReservedSection with GrantedOriginsSection
│   └── components/
│       └── GrantedOriginsSection.tsx  # NEW

background/
└── dispatch-pipeline.ts      # MODIFY: add permissions.contains guard after findAdapter

locales/
├── en.yml                    # ADD: error_code_OPENCLAW_* + options_origins_* + adapter_openclaw_*
└── zh_CN.yml                 # ADD: same keys

tests/
├── unit/
│   ├── adapters/
│   │   └── openclaw-match.spec.ts     # NEW: URL pattern matching
│   ├── dom-injector/
│   │   └── setInputValue.spec.ts      # NEW: property-descriptor setter
│   └── repos/
│       └── grantedOrigins.spec.ts     # NEW: add/remove/has/list
├── e2e/
│   ├── fixtures/
│   │   └── openclaw-stub.html         # NEW: stub page mimicking OpenClaw textarea
│   ├── openclaw-dispatch.spec.ts      # NEW: happy path e2e
│   ├── openclaw-offline.spec.ts       # NEW: target not running
│   └── openclaw-permission.spec.ts    # NEW: grant/deny paths
```

### Pattern 1: Adapter Registration (established Phase 3)

**What:** Each adapter = one registry entry + one `entrypoints/<platform>.content.ts`
**When to use:** Adding any new IM platform
**Example:**
```typescript
// shared/adapters/registry.ts — append to adapterRegistry array
{
  id: 'openclaw',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      // Match any host (user self-deployed) + path /ui/chat + session param
      return u.pathname === '/ui/chat' && u.searchParams.has('session');
    } catch { return false; }
  },
  scriptFile: 'content-scripts/openclaw.js',
  hostMatches: [],  // no static host — dynamic permission
  iconKey: 'platform_icon_openclaw',
}
```
[VERIFIED: codebase — shared/adapters/registry.ts mock entry pattern]

### Pattern 2: Property-Descriptor Setter for React Controlled Inputs

**What:** React tracks input value internally; direct `.value =` assignment is ignored. Must use the native setter to bypass React's synthetic event system.
**When to use:** Any React-controlled `<input>` or `<textarea>`
**Example:**
```typescript
// shared/dom-injector.ts
export function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setter) throw new Error('Cannot find native value setter');
  setter.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
```
[CITED: CLAUDE.md DOM injection convention + MDN Object.getOwnPropertyDescriptor]

### Pattern 3: Permission Request in Popup (User Gesture)

**What:** `chrome.permissions.request` must be called in a context where user gesture is active
**When to use:** Any optional/runtime permission request
**Example:**
```typescript
// In popup SendForm.tsx handleConfirm():
const targetOrigin = new URL(props.sendTo).origin;
const granted = await grantedOriginsRepo.has(targetOrigin);
if (!granted) {
  const ok = await chrome.permissions.request({ origins: [targetOrigin + '/*'] });
  if (!ok) {
    props.onDispatchError('OPENCLAW_PERMISSION_DENIED', targetOrigin);
    return;
  }
  await grantedOriginsRepo.add(targetOrigin);
}
// Proceed with dispatch.start RPC...
```
[VERIFIED: Chrome API docs + Extension.Ninja blog — user gesture requirement]

### Pattern 4: Adapter Content Script Protocol

**What:** Content script registers one-shot message listener for ADAPTER_DISPATCH
**When to use:** Every adapter implementation
**Example:**
```typescript
// entrypoints/openclaw.content.ts
export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true; // async response
    });
  },
});
```
[VERIFIED: codebase — entrypoints/mock-platform.content.ts follows this exact pattern]

### Anti-Patterns to Avoid

- **Calling `chrome.permissions.request` from SW message handler:** User gesture is lost during message passing. Always call from popup.
- **Using `el.value = text` for React inputs:** React ignores direct value assignment; must use native property descriptor setter.
- **Using `textContent =` or `innerText =` for editors:** Only works for plain DOM; breaks React reconciliation. (This is the Slate/Lexical anti-pattern for Phase 5, but noting here to be explicit.)
- **Static `host_permissions` for OpenClaw:** User-deployed origins are unknowable at install time. Must use `optional_host_permissions` + runtime grant.
- **Polling for message confirmation instead of MutationObserver:** Brittle, wastes CPU, arbitrary timing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| React input value injection | Custom event dispatch only | Property-descriptor setter pattern | React's internal fiber tree doesn't update from plain DOM manipulation |
| Permission state persistence | Raw chrome.storage.local.get/set | Typed repo via WxtStorage.defineItem | Consistency with project conventions (typed, migration-ready) |
| DOM ready detection | setTimeout/polling | MutationObserver with disconnect | Event-driven, deterministic, cancellable |
| URL pattern matching | Regex | new URL() + property checks | Handles edge cases (encoding, ports, trailing slashes) reliably |
| Error i18n mapping | Inline strings | Existing ErrorBanner + t() switch pattern | Established in Phase 3, just extend the switch cases |

**Key insight:** The adapter implementation is almost entirely composition of existing patterns (registry entry, content script protocol, ErrorBanner extension). The only genuinely new code is the `setInputValue` helper and the permission UX flow.

## Common Pitfalls

### Pitfall 1: `chrome.permissions.request` User Gesture Requirement

**What goes wrong:** Calling `chrome.permissions.request()` from the service worker (after receiving a message from popup) silently fails or throws "This function must be called during a user gesture."
**Why it happens:** Message passing is async; user gesture context is lost when crossing the popup→SW boundary.
**How to avoid:** Call `chrome.permissions.request` directly in the popup's Confirm click handler (synchronous gesture chain). SW only uses `chrome.permissions.contains` as a defensive check.
**Warning signs:** Permission dialog never appears; `chrome.permissions.request` always resolves `false`.

### Pitfall 2: OpenClaw URL Pattern Ambiguity

**What goes wrong:** match() is too broad (matches non-OpenClaw pages) or too narrow (misses user-deployed instances).
**Why it happens:** OpenClaw can run on any host:port. The distinguishing features are the `/ui/chat` path and `session` query parameter.
**How to avoid:** Match on `pathname === '/ui/chat'` + `searchParams.has('session')`. Don't match on host/port (that's the user's choice).
**Warning signs:** Random pages being identified as OpenClaw; or user's custom domain not being recognized.

### Pitfall 3: Dev-Mode Permission Bypass Invalidating E2E

**What goes wrong:** In dev mode, `host_permissions: ['<all_urls>']` means `chrome.permissions.request` auto-grants without showing a dialog. The permission UX path is never actually tested.
**Why it happens:** Dev mode `wxt.config.ts` adds `<all_urls>` to `host_permissions` for Playwright test convenience.
**How to avoid:** Accept that dev-mode E2E tests verify the code PATH (popup calls request → proceeds on true) but NOT the actual user dialog. Document this as a known limitation. Production behavior (optional_host_permissions only) shows the real dialog.
**Warning signs:** Tests pass in dev but permission fails in production builds.

### Pitfall 4: MutationObserver Never Disconnects

**What goes wrong:** Observer leaks memory or fires callbacks after adapter has already responded.
**Why it happens:** Missing `observer.disconnect()` in timeout/success paths.
**How to avoid:** Always disconnect in both resolve and reject paths. Use a wrapper that auto-disconnects after first match or timeout.
**Warning signs:** Console warnings about detached DOM nodes; multiple success responses.

### Pitfall 5: OpenClaw Offline vs Page Load Error

**What goes wrong:** When OpenClaw isn't running, browser shows an error page (ERR_CONNECTION_REFUSED). `tabs.onUpdated:complete` still fires. Adapter is injected into the error page.
**Why it happens:** Chrome considers error pages "complete" for tab lifecycle purposes.
**How to avoid:** Adapter's `canDispatch` checks for OpenClaw-specific DOM features (not just textarea existence). No OpenClaw feature DOM = `OPENCLAW_OFFLINE`. Has OpenClaw DOM but no textarea = `INPUT_NOT_FOUND`.
**Warning signs:** Getting `INPUT_NOT_FOUND` when the real issue is the service not running.

### Pitfall 6: ErrorCode Union Type Exhaustiveness

**What goes wrong:** Adding new ErrorCodes breaks existing switch statements that don't handle them.
**Why it happens:** TypeScript's discriminated union + `never` type enforcement.
**How to avoid:** After extending ErrorCode, run `pnpm typecheck` — it will flag any non-exhaustive switches in ErrorBanner and dispatch-pipeline.
**Warning signs:** TS2322 errors in ErrorBanner.tsx switch cases.

## Code Examples

### OpenClaw Adapter Content Script (core structure)

```typescript
// entrypoints/openclaw.content.ts
// Source: Based on entrypoints/mock-platform.content.ts pattern
import { defineContentScript } from '#imports';

// OpenClaw-specific DOM feature check
const OPENCLAW_FEATURE_SELECTOR = '[data-openclaw-app]'; // or app root identifier
const TEXTAREA_SELECTOR = '.agent-chat__input > textarea';
const MESSAGE_LIST_SELECTOR = '.agent-chat__messages'; // message container

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true;
    });
  },
});

async function handleDispatch(payload: AdapterPayload): Promise<AdapterResponse> {
  // canDispatch check
  const featureEl = document.querySelector(OPENCLAW_FEATURE_SELECTOR);
  if (!featureEl) {
    return { ok: false, code: 'OPENCLAW_OFFLINE', message: 'OpenClaw UI not detected', retriable: true };
  }
  // waitForReady — textarea may not be immediately available
  const textarea = await waitForElement<HTMLTextAreaElement>(TEXTAREA_SELECTOR, 5000);
  if (!textarea) {
    return { ok: false, code: 'INPUT_NOT_FOUND', message: 'textarea not found', retriable: true };
  }
  // compose
  const message = composeMarkdown(payload);
  setInputValue(textarea, message);
  // send
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  // confirm
  const confirmed = await waitForNewMessage(MESSAGE_LIST_SELECTOR, 5000);
  if (!confirmed) {
    return { ok: false, code: 'TIMEOUT', message: 'message not confirmed within 5s', retriable: true };
  }
  return { ok: true };
}
```
[VERIFIED: codebase mock-platform pattern + CONTEXT.md D-47..D-53]

### grantedOrigins Storage Repo

```typescript
// shared/storage/repos/grantedOrigins.ts
// Source: Based on shared/storage/repos/history.ts pattern
import { grantedOriginsItem } from '@/shared/storage/items';

export async function list(): Promise<string[]> {
  return await grantedOriginsItem.getValue();
}

export async function add(origin: string): Promise<void> {
  const current = await grantedOriginsItem.getValue();
  if (!current.includes(origin)) {
    await grantedOriginsItem.setValue([...current, origin]);
  }
}

export async function remove(origin: string): Promise<void> {
  const current = await grantedOriginsItem.getValue();
  await grantedOriginsItem.setValue(current.filter((o) => o !== origin));
}

export async function has(origin: string): Promise<boolean> {
  const current = await grantedOriginsItem.getValue();
  return current.includes(origin);
}
```
[VERIFIED: codebase — follows same pattern as shared/storage/repos/history.ts]

### compose Markdown Template

```typescript
// Compose output format (D-39, D-40, D-41)
function composeMarkdown(payload: { prompt: string; snapshot: ArticleSnapshot }): string {
  const { prompt, snapshot } = payload;
  const lines: string[] = [];
  
  if (prompt) lines.push(prompt, '');
  if (snapshot.title) lines.push(`## ${snapshot.title}`, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  if (snapshot.description) lines.push(`> ${snapshot.description}`, '');
  if (snapshot.create_at) lines.push(`> 采集时间: ${snapshot.create_at}`, '');
  if (snapshot.content) lines.push(snapshot.content);
  
  return lines.join('\n').trim();
}
```
[VERIFIED: CONTEXT.md D-39/D-40/D-41 + specifics section template]

### OpenClaw Stub Fixture for E2E

```html
<!-- tests/e2e/fixtures/openclaw-stub.html -->
<!doctype html>
<html lang="en">
<head><title>OpenClaw Stub</title></head>
<body>
  <div data-openclaw-app>
    <div class="agent-chat__messages" data-testid="message-list"></div>
    <div class="agent-chat__input">
      <textarea data-testid="chat-input"></textarea>
    </div>
  </div>
  <script>
    // Simulate React-controlled textarea + Enter-to-send + message append
    const textarea = document.querySelector('textarea');
    const messageList = document.querySelector('.agent-chat__messages');
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const msg = document.createElement('div');
        msg.className = 'message';
        msg.textContent = textarea.value;
        messageList.appendChild(msg);
        textarea.value = '';
      }
    });
  </script>
</body>
</html>
```
[ASSUMED: fixture structure based on discovered `.agent-chat__input > textarea` selector]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 background page (persistent) | MV3 service worker (ephemeral) | 2022 | `chrome.permissions.request` can't be called from SW after async message |
| Static content_scripts in manifest | `registration: 'runtime'` + `chrome.scripting.executeScript` | WXT 0.20.x | Adapters only load when needed; no global page matching |
| `el.value = text` for inputs | Property-descriptor setter | React 16+ fiber architecture | React reconciliation ignores direct DOM writes |

**Deprecated/outdated:**
- `webextension-polyfill`: Not needed with WXT + `@wxt-dev/browser` (project convention)
- `document.execCommand('insertText')`: Removed from spec; use synthetic events instead

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OpenClaw WebChat textarea selector is `.agent-chat__input > textarea` | Architecture Patterns | Adapter selector breaks — LOW risk since fixture-based E2E uses stub; real selector tuning is a config change |
| A2 | OpenClaw URL path is `/ui/chat` with `session` query param | Phase Requirements (ADO-02) | match() fails for real OpenClaw — MEDIUM risk; user can test locally and selector is trivially fixable |
| A3 | OpenClaw has a distinguishable app-root DOM element (e.g. `[data-openclaw-app]`) for offline detection | Pitfall 5 | OPENCLAW_OFFLINE vs INPUT_NOT_FOUND distinction may be unreliable — LOW risk since fallback is INPUT_NOT_FOUND |
| A4 | Enter key (not Ctrl+Enter) submits messages in OpenClaw WebChat | Locked Decisions (D-49) | Send doesn't fire — LOW risk, D-49 already has "adjust if research discovers Ctrl+Enter" caveat |
| A5 | Dev-mode `<all_urls>` host_permissions causes `chrome.permissions.request` to auto-grant | Pitfall 3 | E2E permission path untestable — actually POSITIVE for testing since it means the code path executes without dialog |

## Open Questions

1. **OpenClaw DOM feature selector for offline detection**
   - What we know: When OpenClaw is not running, browser shows ERR_CONNECTION_REFUSED error page. Adapter needs to distinguish "error page" from "OpenClaw page without textarea."
   - What's unclear: The exact DOM feature that reliably identifies an OpenClaw page (could be a specific class, data attribute, or title pattern).
   - Recommendation: Use a fallback chain: check `document.title` contains "OpenClaw" OR check for app root container OR check for any `.agent-chat__*` class. If none found, return OPENCLAW_OFFLINE.

2. **OpenClaw URL path: `/chat` vs `/ui/chat`**
   - What we know: GitHub issue #45086 shows URL as `http://localhost:18789/ui/chat?session=agent%3Amain%3Amain`. CONTEXT.md says `http://localhost:18789/chat?session=agent:<a>:<s>`.
   - What's unclear: Whether both paths work or only one is canonical. Recent versions may have changed.
   - Recommendation: Match BOTH patterns (`/chat` and `/ui/chat`) in the adapter's `match()` function. This is defensive and costs nothing.

3. **Session parameter encoding**
   - What we know: The session value is `agent:<agent_name>:<session_name>`. GitHub issues show it URL-encoded as `agent%3Amain%3Amain`.
   - What's unclear: Whether the parameter is always URL-encoded or sometimes raw colons.
   - Recommendation: `URLSearchParams.get('session')` handles both — it auto-decodes. Just check `.startsWith('agent:')` on the decoded value.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| OpenClaw local instance | Optional live E2E | Unknown | -- | Local HTML stub fixture (primary approach) |
| Chromium (Playwright) | E2E tests | Likely installed from Phase 1 | 1217+ | `pnpm exec playwright install chromium` |
| serve (npm) | Fixture server | Already in devDependencies | 14.2.x | -- |

**Missing dependencies with no fallback:**
- None — Phase 4 has no hard external dependency.

**Missing dependencies with fallback:**
- OpenClaw instance: not required. E2E uses stub HTML fixture.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.x (unit) + Playwright 1.58.x (E2E) |
| Config file | `vitest.config.ts` + `playwright.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm typecheck && pnpm test && pnpm lint` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADO-01 | Adapter implements IMAdapter interface + registers | unit | `pnpm test -- tests/unit/adapters/openclaw-match.spec.ts -x` | Wave 0 |
| ADO-02 | match() recognizes OpenClaw URL patterns | unit | `pnpm test -- tests/unit/adapters/openclaw-match.spec.ts -x` | Wave 0 |
| ADO-03 | setInputValue property-descriptor setter works | unit | `pnpm test -- tests/unit/dom-injector/setInputValue.spec.ts -x` | Wave 0 |
| ADO-04 | compose + send + MutationObserver confirm | e2e | `pnpm test:e2e -- openclaw-dispatch.spec.ts` | Wave 0 |
| ADO-05 | Full pipeline E2E green | e2e | `pnpm test:e2e -- openclaw-dispatch.spec.ts` | Wave 0 |
| ADO-06 | No static host_permissions for OpenClaw | unit | `pnpm test -- tests/unit/scripts/verify-manifest.spec.ts -x` | Exists (extend) |
| ADO-07 | Permission request + persist + deny path | e2e+unit | `pnpm test:e2e -- openclaw-permission.spec.ts` + unit grantedOrigins repo | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm typecheck && pnpm test`
- **Per wave merge:** `pnpm typecheck && pnpm test && pnpm lint`
- **Phase gate:** Full suite green + `pnpm test:e2e` (headed, local)

### Wave 0 Gaps

- [ ] `tests/unit/adapters/openclaw-match.spec.ts` -- covers ADO-01, ADO-02
- [ ] `tests/unit/dom-injector/setInputValue.spec.ts` -- covers ADO-03
- [ ] `tests/unit/repos/grantedOrigins.spec.ts` -- covers ADO-07 storage
- [ ] `tests/e2e/fixtures/openclaw-stub.html` -- fixture for ADO-04, ADO-05
- [ ] `tests/e2e/openclaw-dispatch.spec.ts` -- covers ADO-04, ADO-05
- [ ] `tests/e2e/openclaw-offline.spec.ts` -- covers error paths
- [ ] `tests/e2e/openclaw-permission.spec.ts` -- covers ADO-07 UX

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | yes | `chrome.permissions.request` + `grantedOrigins` storage = principle of least privilege; never inject into pages without explicit user grant |
| V5 Input Validation | yes | URL validated via `new URL()` constructor; snapshot fields rendered as text nodes (never innerHTML); zod validates dispatch payload |
| V6 Cryptography | no | -- |

### Known Threat Patterns for Chrome MV3 + DOM Injection

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious origin granted permission | Elevation of Privilege | User explicitly grants per-origin; options page shows all grants with remove |
| XSS via injected content | Tampering | Content injected via textarea.value (text only, never innerHTML); setInputValue writes plain text |
| Extension code injection into wrong page | Information Disclosure | Adapter's canDispatch verifies OpenClaw feature DOM before composing |
| Storage poisoning (grantedOrigins) | Tampering | Typed repo with zod-validated string[] prevents non-string injection |

## Sources

### Primary (HIGH confidence)

- **Codebase:** `shared/adapters/registry.ts`, `shared/adapters/types.ts`, `entrypoints/mock-platform.content.ts`, `background/dispatch-pipeline.ts`, `shared/messaging/result.ts`, `shared/storage/items.ts` — all directly inspected
- **Chrome API docs** — `chrome.permissions.request` user gesture requirement
- **Extension.Ninja blog** — "This function must be called during a user gesture" resolution
- **CLAUDE.md** — DOM injection pattern (property-descriptor setter), adapter convention, permission model

### Secondary (MEDIUM confidence)

- **GitHub openclaw/openclaw#45513** — `.agent-chat__input > textarea` selector mentioned in bug report
- **GitHub openclaw/openclaw#45086** — URL pattern `http://localhost:18789/ui/chat?session=agent%3Amain%3Amain`
- **GitHub openclaw/openclaw#51549** — Confirms React for WebChat UI

### Tertiary (LOW confidence)

- **OpenClaw DOM feature selector** — No official documentation on app-root identifiers; `[data-openclaw-app]` is speculative
- **Enter vs Ctrl+Enter submission** — Not explicitly documented; assumed from CONTEXT.md D-49

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all patterns established
- Architecture: HIGH — adapter registration + dispatch pipeline fully understood from Phase 3 code
- Permissions UX: HIGH — user-gesture requirement is well-documented Chrome constraint
- OpenClaw DOM selectors: MEDIUM — based on bug reports, not official docs; mitigated by fixture-based E2E
- Pitfalls: HIGH — user-gesture is the #1 pitfall, clearly documented

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable — Chrome permissions API rarely changes; OpenClaw selectors may drift)
