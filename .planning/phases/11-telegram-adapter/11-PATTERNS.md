# Phase 11: Telegram 适配器 - Pattern Map

**Mapped:** 2026-05-16
**Files analyzed:** 14 (4 new source, 4 new test, 6 modify)
**Analogs found:** 10 / 10 (all non-self files have strong matches)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `shared/adapters/telegram-format.ts` | utility | transform | `shared/adapters/slack-format.ts` | exact |
| `shared/adapters/telegram-login-detect.ts` | utility | request-response | `shared/adapters/slack-login-detect.ts` | exact |
| `entrypoints/telegram.content.ts` | component (content script) | request-response | `entrypoints/slack.content.ts` | exact |
| `background/injectors/telegram-main-world.ts` | utility | request-response | `background/injectors/slack-main-world.ts` | exact |
| `shared/adapters/registry.ts` | config | request-response | self | — |
| `background/main-world-registry.ts` | config | request-response | self | — |
| `wxt.config.ts` | config | N/A | self | — |
| `locales/en.yml` | config (i18n) | N/A | self (Slack/Discord ToS keys) | — |
| `locales/zh_CN.yml` | config (i18n) | N/A | self (Slack/Discord ToS keys) | — |
| `scripts/verify-manifest.ts` | test | N/A | self | — |
| `tests/unit/adapters/telegram.fixture.html` | test fixture | N/A | `tests/unit/adapters/discord.fixture.html` | role-match |
| `tests/unit/adapters/telegram-selector.spec.ts` | test | N/A | `tests/unit/adapters/slack-selector.spec.ts` | exact |
| `tests/unit/adapters/telegram-format.spec.ts` | test | N/A | `tests/unit/adapters/slack-format.spec.ts` | exact |
| `tests/unit/adapters/telegram-login.spec.ts` | test | N/A | `tests/unit/adapters/slack-login-detect.spec.ts` | exact |

## Pattern Assignments

### `shared/adapters/telegram-format.ts` (utility, transform)

**Analog:** `shared/adapters/slack-format.ts`

**Imports pattern** (lines 1-5):
```typescript
/**
 * Telegram formatting (D-140..D-145).
 * Pure utility — no WXT or chrome.* imports.
 * Imported by both the adapter content script and unit tests.
 */
```
No external imports — pure function module.

**Snapshot interface** (lines 7-13):
```typescript
export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}
```

**Constants** (lines 15-16):
```typescript
const TRUNCATE_LIMIT = 35000;
```
→ Telegram version: `const TELEGRAM_CHAR_LIMIT = 4096;` + `const TRUNCATION_SUFFIX = '\n...[truncated]';`

**Core compose pattern** (lines 115-145):
```typescript
export function composeSlackMrkdwn(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel: string;
}): string {
  const { prompt, snapshot, timestampLabel } = payload;

  // Escape user-controlled text fields
  const safePrompt = prompt ? escapeSlackMentions(prompt) : '';
  // ...
  // Build lines array — empty fields omitted entirely
  const lines: string[] = [];
  if (safePrompt) lines.push(safePrompt, '');
  if (safeTitle) lines.push(safeTitle, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  // ...
  return lines.join('\n').trim();
}
```

→ Telegram version: no escaping needed (plain text), metadata-first truncation logic. Field order is identical: prompt → title → url → description → timestamp → content.

**Truncation pattern** (lines 128-132 in analog):
```typescript
const truncatedContent =
  rawContent.length > TRUNCATE_LIMIT
    ? rawContent.slice(0, TRUNCATE_LIMIT) + '\n...[truncated]'
    : rawContent;
```
→ Telegram needs structured metadata-first truncation (D-143..D-145): try removing content first, then description, then hard-truncate with suffix.

---

### `shared/adapters/telegram-login-detect.ts` (utility, request-response)

**Analog:** `shared/adapters/slack-login-detect.ts`

**Module header** (lines 1-22):
```typescript
/**
 * Telegram login wall DOM detection (D-152).
 *
 * Lives in `shared/adapters/` so tests (jsdom) and the telegram
 * content-script bundle can import the same implementation. No
 * `chrome.*` APIs — pure DOM lookups.
 *
 * CRITICAL: Telegram Web K uses hash-based routing (`#/auth`).
 * URL-layer `loggedOutPathPatterns` only checks pathname, so
 * DOM-level detection is the primary defense.
 *
 * Detection markers:
 *   1. input[type="tel"], input[name="phone"] — phone number input
 *   2. [class*="auth"], [class*="signin"] — auth container
 *   3. [class*="login"] — login overlay (GUARDED: only when editor absent)
 */
```

**Core detectLoginWall pattern** (lines 24-38 in analog):
```typescript
export function detectLoginWall(): boolean {
  // Unconditional markers
  if (document.querySelector('input[type="email"][name="email"]')) return true;
  if (document.querySelector('button[data-qa="sign_in_button"]')) return true;
  if (document.querySelector('[class*="signin"]')) return true;

  // Guarded marker — only match when editor is NOT present
  if (!document.querySelector('.ql-editor')) {
    if (document.querySelector('[class*="login"]')) return true;
  }

  return false;
}
```

→ Telegram version: replace Slack-specific selectors with Telegram markers (`input[type="tel"]`, `input[name="phone"]`, `[class*="auth"]`), guard with `.input-message-input[contenteditable="true"]`.

---

### `entrypoints/telegram.content.ts` (component, request-response)

**Analog:** `entrypoints/slack.content.ts`

**Header comment** (lines 1-21):
```typescript
/**
 * Telegram adapter content script (TG-03, TG-04).
 *
 * Injected by SW dispatch-pipeline via chrome.scripting.executeScript
 * into the Telegram Web K chat tab. Registers one-shot ADAPTER_DISPATCH
 * message listener.
 *
 * DOM strategy: custom contenteditable three-level fallback selector.
 *   Tier 1: .input-message-input[contenteditable="true"]
 *   Tier 2: .rows-wrapper [contenteditable="true"]
 *   Tier 3: .new-message-wrapper [contenteditable="true"] (low confidence)
 * Injection: MAIN world ClipboardEvent paste (DataTransfer in MAIN world).
 * Send: click .btn-send button, fallback Enter keydown.
 * Confirm: editor textContent clearance polling (300ms x 5).
 * Rate limit: 5s per channel.
 * Login wall: DOM-layer detectLoginWall() (phone input, auth class).
 */
```

**Imports** (lines 22-26):
```typescript
import { defineContentScript } from '#imports';
import { composeTelegramMessage } from '@/shared/adapters/telegram-format';
import { detectLoginWall } from '@/shared/adapters/telegram-login-detect';
import { t } from '@/shared/i18n';
import type { DispatchWarning, SelectorConfirmation } from '@/shared/messaging';
```

**Constants** (lines 28-34):
```typescript
const WAIT_TIMEOUT_MS = 5000;
const LOGIN_WALL_PROBE_MS = 1500;
const RATE_LIMIT_MS = 5000;
const CONFIRM_POLL_INTERVAL_MS = 300;
const CONFIRM_MAX_POLLS = 5;
const PLATFORM_ID = 'telegram';
const MAIN_WORLD_PORT = `WEB2CHAT_MAIN_WORLD:${PLATFORM_ID}`;
```

**Selector types + tier pattern** (lines 36-38):
```typescript
const SELECTOR_LOW_CONFIDENCE = 'SELECTOR_LOW_CONFIDENCE' as const;
type SelectorTier = 'tier1-aria' | 'tier2-data' | 'tier3-class-fragment';
type EditorMatch = { element: HTMLElement; tier: SelectorTier; lowConfidence: boolean };
```

**findEditor** (lines 118-131 in analog):
```typescript
function findEditor(): EditorMatch | null {
  const tier1 = document.querySelector<HTMLElement>(
    '.ql-editor[role="textbox"][contenteditable="true"]',
  );
  if (tier1) return { element: tier1, tier: 'tier1-aria', lowConfidence: false };
  // ... tier2, tier3
  return null;
}
```

→ Telegram version: `.input-message-input[contenteditable="true"]` (tier1), `.rows-wrapper [contenteditable="true"]` (tier2), `.new-message-wrapper [contenteditable="true"]` (tier3).

**handleDispatch** (lines 197-350 in analog): Full state machine pattern — URL login guard → DOM login probe → channel extract + validate → rate limit → waitForReady race → compose → injectMainWorldPaste → confirm send via textContent polling → record rate limit → return `{ ok: true }`.

→ Telegram version: same structure. Replace `extractChannelId` with Telegram chat ID extraction. Replace `composeSlackMrkdwn` with `composeTelegramMessage`.

**defineContentScript entry** (lines 352-368):
```typescript
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

→ Telegram version: flag `__web2chat_telegram_registered`.

**Test export** (lines 370-380):
```typescript
export const __testing = {
  findEditor,
  handleDispatch,
  setMainWorldPasteForTest(fn: typeof injectMainWorldPaste): void {
    mainWorldPasteForTest = fn;
  },
  resetTestOverrides(): void {
    mainWorldPasteForTest = null;
    lastSendTime.clear();
  },
};
```

---

### `background/injectors/telegram-main-world.ts` (utility, request-response)

**Analog:** `background/injectors/slack-main-world.ts`

**Header** (lines 1-8):
```typescript
/**
 * Telegram MAIN world paste injector.
 * Runs in MAIN world context via chrome.scripting.executeScript.
 * Finds Telegram contenteditable editor, dispatches synthetic ClipboardEvent
 * with formatted text, clicks send button.
 */
```

**Core pattern** (lines 9-101 in analog):
```typescript
export async function slackMainWorldPaste(text: string): Promise<boolean> {
  // 1. Find editor (try activeElement first, then querySelector fallbacks)
  const editor = ...

  // 2. Pre-paste cleanup (beforeinput deleteContentBackward)
  if ((editor.textContent ?? '').length > 0) { ... }

  // 3. Create DataTransfer in MAIN world, dispatch ClipboardEvent paste
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));

  // 4. Wait 300ms for render
  await new Promise<void>((resolve) => setTimeout(resolve, 300));

  // 5. Click send button (3 attempts, 150ms apart)
  for (let attempt = 0; attempt < 3; attempt++) {
    const sendBtn = ...; // multiple selector fallbacks
    if (sendBtn) { sendBtn.click(); sent = true; break; }
  }

  // 6. Fallback: synthetic Enter keydown
  if (!sent) { ... }

  // 7. Post-send cleanup (200ms delay, beforeinput if residual text)
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  if ((editor.textContent ?? '').length > 0) { ... }

  return true;
}
```

→ Telegram version: editor selector `.input-message-input[contenteditable="true"]`, send button `.btn-send` / `.btn-icon.send` / `[aria-label*="Send"]`. Same pre-paste cleanup, DataTransfer, ClipboardEvent, post-send cleanup structure.

---

### `shared/adapters/registry.ts` (MODIFY — add telegram entry)

**Append pattern** (after line 108, before line 109):
```typescript
defineAdapter({
  id: 'telegram',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.hostname === 'web.telegram.org' && u.pathname.startsWith('/a/');
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/telegram.js',
  hostMatches: ['https://web.telegram.org/*'],
  iconKey: 'platform_icon_telegram',
  spaNavigationHosts: ['web.telegram.org'],
  loggedOutPathPatterns: ['/', '/login*'],
}),
```

---

### `background/main-world-registry.ts` (MODIFY — add telegram injector)

**Import addition**:
```typescript
import { telegramMainWorldPaste } from '@/background/injectors/telegram-main-world';
```

**Map entry** (after line 19):
```typescript
['telegram', telegramMainWorldPaste],
```

---

### `wxt.config.ts` (MODIFY — add Telegram host_permissions)

**Lines 26-29** (production host_permissions):
```typescript
host_permissions:
  mode === 'development'
    ? ['https://app.slack.com/*', 'https://discord.com/*', 'https://web.telegram.org/*', '<all_urls>']
    : ['https://app.slack.com/*', 'https://discord.com/*', 'https://web.telegram.org/*'],
```

---

### `locales/en.yml` (MODIFY — add Telegram keys)

**Append after line 256** (after Slack ToS keys):
```yaml
# Group M — Telegram ToS (D-146)
telegram_tos_warning:
  message: 'Telegram dispatch uses DOM injection and may violate Telegram Terms of Service.'
telegram_tos_details:
  message: 'Details'

telegram_timestamp_label:
  message: 'Captured at'

# Group G — platform icon (add after line 190)
platform_icon_telegram:
  message: 'Telegram'
```

### `locales/zh_CN.yml` (MODIFY — add Telegram keys)

**Append after line 256** (after Slack ToS keys):
```yaml
# Group M — Telegram ToS (D-146)
telegram_tos_warning:
  message: 'Telegram 投递使用 DOM 注入，可能违反 Telegram 服务条款。'
telegram_tos_details:
  message: '详情'

telegram_timestamp_label:
  message: '采集时间'

# Group G — platform icon (add after line 190)
platform_icon_telegram:
  message: 'Telegram'
```

---

### `scripts/verify-manifest.ts` (MODIFY — add Telegram to host_permissions assertion)

**Lines 79-82** (update expected set):
```typescript
expectSet('host_permissions', manifest.host_permissions, [
  'https://app.slack.com/*',
  'https://discord.com/*',
  'https://web.telegram.org/*',
]);
```

---

### `tests/unit/adapters/telegram.fixture.html` (NEW — test fixture)

**Analog:** `tests/unit/adapters/discord.fixture.html` (contenteditable editor, structurally closer to Telegram than Slack's Quill)

**Pattern:** HTML fixture with Telegram-like contenteditable editor:
```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><title>Telegram Fixture</title></head>
  <body>
    <div class="chat-area">
      <!-- Message list -->
      <div class="messages" role="list">
        <div class="bubble is-out">Existing message</div>
      </div>
      <!-- Editor -->
      <div class="new-message-wrapper">
        <div class="rows-wrapper">
          <div
            class="input-message-input"
            contenteditable="true"
            role="textbox"
            aria-label="Message"
          >
            <br>
          </div>
        </div>
        <!-- Send button -->
        <button class="btn-send" aria-label="Send">Send</button>
      </div>
    </div>
  </body>
</html>
```

---

### `tests/unit/adapters/telegram-selector.spec.ts` (NEW — selector tests)

**Analog:** `tests/unit/adapters/slack-selector.spec.ts`

**Pattern:** Load fixture, test three-tier selectors, test confidence warnings, test paste dispatch, test send confirmation. Same structure as slack-selector.spec.ts:
- `describe('Telegram selector fallback')` — tier1/tier2/tier3/null tests
- `describe('Telegram selector confidence warnings')` — tier3 without/with confirmation
- `describe('Telegram paste injection')` — ClipboardEvent text/plain carries, bubbles
- `describe('Telegram send confirmation')` — ok=true on editor clear, TIMEOUT when not

---

### `tests/unit/adapters/telegram-format.spec.ts` (NEW — format tests)

**Analog:** `tests/unit/adapters/slack-format.spec.ts`

**Pattern:** Test `composeTelegramMessage()`:
- Full snapshot formats correctly with all fields
- Empty fields omitted
- Content < 4096 chars: no truncation
- Content > 4096 chars: truncates with `...[truncated]` suffix
- Metadata-only exceeds 4096: metadata truncated
- Boundary: exactly 4096 chars (should NOT truncate)
- Plain text output (no markdown syntax in result)

---

### `tests/unit/adapters/telegram-login.spec.ts` (NEW — login detection tests)

**Analog:** `tests/unit/adapters/slack-login-detect.spec.ts`

**Pattern:** Import `detectLoginWall` from `@/shared/adapters/telegram-login-detect`, test:
- Returns false when Telegram editor is present
- Returns true when phone input (`input[type="tel"]`) present
- Returns true when auth class present
- Returns true when login class present without editor (guarded)
- Returns false when login class present WITH editor (guard)
- Returns false on empty body
- Returns true even with stray contenteditable alongside login UI

---

## Shared Patterns

### Registry Entry Pattern
**Source:** `shared/adapters/registry.ts` lines 89-108 (Discord/Slack entries)
**Apply to:** Telegram registry entry
- `id` must be `'telegram'` (PlatformId literal)
- `match()` is pure — NO `chrome.*` calls
- `scriptFile` = `'content-scripts/telegram.js'` (WXT build path convention)
- `hostMatches` = `['https://web.telegram.org/*']` (D-149)
- `iconKey` = `'platform_icon_telegram'`
- `spaNavigationHosts` = `['web.telegram.org']` (D-22)
- `loggedOutPathPatterns` = `['/', '/login*']` (pathname only; hash routing handled in content script)

### MAIN World Bridge Pattern
**Source:** `background/main-world-registry.ts` lines 14-20
**Apply to:** Adding Telegram injector
- Import `telegramMainWorldPaste` from `@/background/injectors/telegram-main-world`
- Add `['telegram', telegramMainWorldPaste]` to `mainWorldInjectors` map
- Generic bridge in `background.ts` automatically routes `WEB2CHAT_MAIN_WORLD:telegram` port

### Content Script Pattern
**Source:** `entrypoints/slack.content.ts` lines 352-380
**Apply to:** `entrypoints/telegram.content.ts`
- `defineContentScript({ matches: [], registration: 'runtime' })`
- One-shot `ADAPTER_DISPATCH` listener with injection guard flag
- `__testing` export for test access to `findEditor`, `handleDispatch`, `setMainWorldPasteForTest`

### ToS Warning Pattern
**Source:** `locales/en.yml` lines 247-256 (Discord/Slack ToS keys)
**Apply to:** Telegram ToS keys in both locale files
- `<platform>_tos_warning` and `<platform>_tos_details` keys
- Popup renders these when Telegram platform is selected

### i18n Key Pattern
**Source:** `locales/en.yml` line 258-259, `locales/zh_CN.yml` line 258-259 (Slack timestamp label)
**Apply to:** `telegram_timestamp_label` key in both locales

## No Analog Found

Files with no close match in the codebase:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None — all files have strong analogs from Phase 8/9/10 | — | — | — |

## Metadata

**Analog search scope:** `shared/adapters/`, `entrypoints/`, `background/injectors/`, `tests/unit/adapters/`, `locales/`, `scripts/`
**Files scanned:** 10 analog files
**Pattern extraction date:** 2026-05-16
