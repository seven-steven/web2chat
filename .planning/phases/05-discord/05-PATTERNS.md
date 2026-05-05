# Phase 5: Discord 适配器 - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 15 (new/modified)
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `entrypoints/discord.content.ts` | adapter (content script) | request-response | `entrypoints/openclaw.content.ts` | exact |
| `shared/adapters/discord-format.ts` | utility (pure) | transform | `shared/adapters/openclaw-format.ts` | exact |
| `shared/adapters/registry.ts` | config (registry) | CRUD | self (append entry) | exact |
| `entrypoints/background.ts` | controller (SW) | event-driven | self (append listener) | exact |
| `entrypoints/popup/components/SendForm.tsx` | component (Preact) | request-response | self (add footnote) | exact |
| `entrypoints/popup/components/PlatformIcon.tsx` | component (Preact) | transform | self (replace letterform) | exact |
| `locales/en.yml` | config (i18n) | -- | self (append keys) | exact |
| `locales/zh_CN.yml` | config (i18n) | -- | self (append keys) | exact |
| `scripts/verify-manifest.ts` | utility (CI) | transform | self (update expected set) | exact |
| `wxt.config.ts` | config | -- | self (add permission) | exact |
| `tests/unit/adapters/discord-format.spec.ts` | test | -- | `tests/unit/adapters/openclaw-compose.spec.ts` | exact |
| `tests/unit/adapters/discord-match.spec.ts` | test | -- | `tests/unit/adapters/openclaw-match.spec.ts` | exact |
| `tests/unit/adapters/discord-selector.spec.ts` | test | -- | (no direct analog) | no-analog |
| `tests/unit/adapters/discord.fixture.html` | test fixture | -- | `tests/e2e/fixtures/mock-platform.html` | role-match |
| `tests/e2e/discord-dispatch.spec.ts` | test (E2E) | -- | `tests/e2e/openclaw-dispatch.spec.ts` | exact |

## Pattern Assignments

### `entrypoints/discord.content.ts` (adapter, request-response)

**Analog:** `entrypoints/openclaw.content.ts`

**Imports pattern** (lines 1-3):
```typescript
import { defineContentScript } from '#imports';
// Phase 5: NO import of setInputValue — Discord uses ClipboardEvent paste
import { composeDiscordMarkdown } from '@/shared/adapters/discord-format';
```

**Content script registration** (lines 55-65):
```typescript
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
```

**Message type guard** (lines 23-53):
```typescript
interface AdapterDispatchMessage {
  type: 'ADAPTER_DISPATCH';
  payload: {
    dispatchId: string;
    send_to: string;
    prompt: string;
    snapshot: {
      title: string;
      url: string;
      description: string;
      create_at: string;
      content: string;
    };
  };
}

interface AdapterDispatchResponse {
  ok: boolean;
  code?: 'OPENCLAW_OFFLINE' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'INTERNAL';
  message?: string;
  retriable?: boolean;
}

function isAdapterDispatch(msg: unknown): msg is AdapterDispatchMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as { type: unknown }).type === 'ADAPTER_DISPATCH'
  );
}
```
**Note for Discord:** Replace `code` union with `'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'NOT_LOGGED_IN' | 'INTERNAL'` (no `OPENCLAW_OFFLINE`).

**handleDispatch pattern** (lines 67-115):
```typescript
async function handleDispatch(
  payload: AdapterDispatchMessage['payload'],
): Promise<AdapterDispatchResponse> {
  // 1. canDispatch check
  // 2. waitForReady (waitForElement)
  // 3. compose (format message)
  // 4. inject (setInputValue for OpenClaw; ClipboardEvent paste for Discord)
  // 5. send (Enter keydown)
  // 6. confirm (MutationObserver)
  return { ok: true };
}
```

**waitForElement utility** (lines 117-142):
```typescript
function waitForElement<T extends Element>(selector: string, timeoutMs: number): Promise<T | null> {
  const immediate = document.querySelector<T>(selector);
  if (immediate) return Promise.resolve(immediate);

  return new Promise<T | null>((resolve) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el && !settled) {
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(null);
      }
    }, timeoutMs);
  });
}
```

**waitForNewMessage utility** (lines 144-170):
```typescript
function waitForNewMessage(containerSelector: string, timeoutMs: number): Promise<boolean> {
  const container = document.querySelector(containerSelector);
  if (!container) return Promise.resolve(false);

  const initialCount = container.children.length;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      if (container.children.length > initialCount && !settled) {
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(true);
      }
    });
    observer.observe(container, { childList: true });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(false);
      }
    }, timeoutMs);
  });
}
```

**Enter keydown send pattern** (lines 99-101):
```typescript
textarea.dispatchEvent(
  new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
);
```

---

### `shared/adapters/discord-format.ts` (utility, transform)

**Analog:** `shared/adapters/openclaw-format.ts`

**Full file pattern** (lines 1-29):
```typescript
/**
 * OpenClaw message formatting (D-39, D-40, D-41).
 * Pure utility — no WXT or chrome.* imports.
 * Imported by both the adapter content script and unit tests.
 */

export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}

/**
 * Build prompt-first Markdown per D-39/D-40/D-41.
 * Empty fields are omitted entirely (no empty placeholder lines).
 * No truncation applied (D-41) — OpenClaw has no char limit.
 */
export function composeMarkdown(payload: { prompt: string; snapshot: Snapshot }): string {
  const lines: string[] = [];
  if (payload.prompt) lines.push(payload.prompt, '');
  if (payload.snapshot.title) lines.push(`## ${payload.snapshot.title}`, '');
  if (payload.snapshot.url) lines.push(payload.snapshot.url, '');
  if (payload.snapshot.description) lines.push(`> ${payload.snapshot.description}`, '');
  if (payload.snapshot.create_at) lines.push(`> 采集时间: ${payload.snapshot.create_at}`, '');
  if (payload.snapshot.content) lines.push(payload.snapshot.content);
  return lines.join('\n').trim();
}
```
**Key differences for Discord:**
- `## heading` becomes `**bold**` (D-54)
- Add `escapeMentions()` function (D-57)
- Add `DISCORD_CHAR_LIMIT = 2000` truncation logic (D-55)
- Run `escapeMentions()` on all text fields before formatting

---

### `shared/adapters/registry.ts` (config, CRUD -- modify)

**Analog:** self -- append entry following existing `openclaw` entry pattern

**Existing entry pattern** (lines 48-63):
```typescript
  {
    id: 'openclaw',
    match: (url: string): boolean => {
      try {
        const u = new URL(url);
        return (
          (u.pathname === '/ui/chat' || u.pathname === '/chat') && u.searchParams.has('session')
        );
      } catch {
        return false;
      }
    },
    scriptFile: 'content-scripts/openclaw.js',
    hostMatches: [], // dynamic permission — no static host_permissions
    iconKey: 'platform_icon_openclaw',
  },
  // Phase 5 will append { id: 'discord', ... }
```
**Phase 5 change:** Replace `// Phase 5 will append { id: 'discord', ... }` comment with the actual Discord entry per CONTEXT.md specifics.

---

### `entrypoints/background.ts` (controller, event-driven -- modify)

**Analog:** self -- append listener following existing `chrome.tabs.onUpdated` pattern

**Existing top-level listener registration** (lines 131-133):
```typescript
  chrome.tabs.onUpdated.addListener(onTabComplete);
  chrome.alarms.onAlarm.addListener(onAlarmFired);
});
```
**Phase 5 change:** Add `chrome.webNavigation.onHistoryStateUpdated.addListener(...)` in the same block, BEFORE the closing `});`, following SW discipline (top-level sync registration, no await).

---

### `entrypoints/popup/components/SendForm.tsx` (component -- modify)

**Analog:** self

**Conditional rendering pattern** (lines 308-319) -- soft-overwrite hint:
```tsx
      {showBindingHint && (
        <button
          type="button"
          class="text-left text-xs leading-snug font-normal text-sky-600 dark:text-sky-400 hover:underline underline-offset-2"
          onClick={handleSoftOverwriteAccept}
          data-testid="binding-soft-overwrite"
        >
          {t('binding_use_bound_for_before')}
          <span class="font-mono">{sendToHost}</span>
          {t('binding_use_bound_for_after')}
        </button>
      )}
```
**Phase 5 change:** Add a similar conditional block `{platformId === 'discord' && (<footer>...</footer>)}` after the Confirm button, before the `<hr>` divider (D-59). Use `t('discord_tos_warning')` + `t('discord_tos_details')`.

---

### `entrypoints/popup/components/PlatformIcon.tsx` (component -- modify)

**Analog:** self

**Existing Discord placeholder** (lines 111-115):
```tsx
      {variant === 'discord' && (
        <text x="8" y="17" font-size="16" font-weight="600" fill="currentColor" stroke="none">
          {DISCORD_GLYPH}
        </text>
      )}
```
**Phase 5 change:** Replace the `<text>` letterform with a proper Discord brand SVG path. Follow the same pattern as the `openclaw` variant (lines 70-109): `<g>` group with `stroke="none"` and fill paths.

---

### `wxt.config.ts` (config -- modify)

**Analog:** self

**Existing permissions** (lines 17-18):
```typescript
    permissions:
      mode === 'development'
        ? ['activeTab', 'alarms', 'scripting', 'storage', 'tabs']
        : ['activeTab', 'alarms', 'scripting', 'storage'],
```
**Phase 5 change:** Add `'webNavigation'` to both dev and prod arrays (D-72).

---

### `scripts/verify-manifest.ts` (utility -- modify)

**Analog:** self

**Existing permissions assertion** (lines 65-69):
```typescript
  try {
    expectSet('permissions', manifest.permissions, ['activeTab', 'alarms', 'scripting', 'storage']);
  } catch (e) {
    errors.push((e as Error).message);
  }
```
**Phase 5 change:** Add `'webNavigation'` to the expected array: `['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation']`.

---

### `locales/en.yml` + `locales/zh_CN.yml` (config -- modify)

**Analog:** self

**Existing key group pattern** (en.yml lines 185-193):
```yaml
# Group G — platform icon tooltips
platform_icon_mock:
  message: 'Mock platform (test)'
platform_icon_openclaw:
  message: 'OpenClaw'
platform_icon_discord:
  message: 'Discord'
platform_icon_unsupported:
  message: 'Unsupported platform'
```
**Phase 5 change:** Add new `# Group J — Discord ToS` section:
```yaml
# Group J — Discord ToS (D-59, D-61)
discord_tos_warning:
  message: '...'
discord_tos_details:
  message: '...'
```
Both `en.yml` and `zh_CN.yml` must have 100% key parity.

---

### `tests/unit/adapters/discord-format.spec.ts` (test)

**Analog:** `tests/unit/adapters/openclaw-compose.spec.ts`

**Full file pattern** (lines 1-57):
```typescript
import { describe, it, expect } from 'vitest';
import { composeMarkdown } from '@/shared/adapters/openclaw-format';

describe('adapters/openclaw — composeMarkdown (ADO-01, D-39, D-40, D-41)', () => {
  const fullSnapshot = {
    title: 'Test Article',
    url: 'https://example.com/article',
    description: 'A test description',
    create_at: '2026-05-01T12:00:00.000Z',
    content: '# Content\n\nParagraph here.',
  };

  it('formats prompt-first with all fields', () => {
    const result = composeMarkdown({ prompt: 'Summarize this', snapshot: fullSnapshot });
    const lines = result.split('\n');
    expect(lines[0]).toBe('Summarize this');
    // ...assertions on field order and formatting
  });

  it('omits empty fields entirely (D-40)', () => {
    // ...sparse snapshot test
  });

  it('no truncation applied (D-41)', () => {
    const longContent = 'x'.repeat(10_000);
    // ...verify no truncation for OpenClaw
  });
});
```
**Key differences for Discord test:**
- Import from `@/shared/adapters/discord-format` instead
- Add truncation tests (D-55): content > 2000 chars gets `\n...[truncated]`
- Add `escapeMentions` tests (D-57): `@everyone`, `@here`, `<@id>`, `<#id>`, `<@&id>`
- Verify `**bold**` instead of `## heading`
- Verify prompt-first priority truncation

---

### `tests/unit/adapters/discord-match.spec.ts` (test)

**Analog:** `tests/unit/adapters/openclaw-match.spec.ts`

**Full file pattern** (lines 1-55):
```typescript
import { describe, it, expect } from 'vitest';
import { findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('adapters/openclaw — match (ADO-02)', () => {
  const validUrls = [
    'http://localhost:18789/ui/chat?session=agent:main:main',
    // ...
  ];

  for (const url of validUrls) {
    it(`matches: ${url}`, () => {
      const adapter = findAdapter(url);
      expect(adapter).not.toBeUndefined();
      expect(adapter!.id).toBe('openclaw');
    });
  }

  it('detectPlatformId returns openclaw for valid URL', () => {
    expect(detectPlatformId('...')).toBe('openclaw');
  });

  const invalidUrls = [
    { url: '...', label: 'wrong path' },
    // ...
  ];

  for (const { url, label } of invalidUrls) {
    it(`does NOT match: ${label}`, () => {
      const adapter = findAdapter(url);
      const isOpenclaw = adapter?.id === 'openclaw';
      expect(isOpenclaw).toBe(false);
    });
  }
});
```
**Key differences for Discord test:**
- Valid URLs: `https://discord.com/channels/123/456`, `https://discord.com/channels/123456789/987654321`
- Invalid URLs: `https://discord.com/channels/@me/123` (DM), `https://discord.com/login`, `https://discord.com/`, malformed, empty
- Assert `adapter!.id === 'discord'`

---

### `tests/e2e/discord-dispatch.spec.ts` (test, E2E)

**Analog:** `tests/e2e/openclaw-dispatch.spec.ts`

**Full file pattern** (lines 1-49):
```typescript
import { test, expect } from './fixtures';
import { openArticleAndPopup, ... } from './helpers';

test.describe('openclaw dispatch', () => {
  test.skip(!OPENCLAW_TOKEN, '... env var required');

  test.beforeEach(async ({ context }) => {
    test.setTimeout(60_000);
    // pre-authentication if needed
  });

  test('happy path — Confirm → message appears', async ({ context, extensionId }) => {
    const { articlePage, popup } = await openArticleAndPopup(context, extensionId);
    const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
    await sendToInput.fill(OPENCLAW_URL);
    await popup.waitForTimeout(300);
    const confirm = popup.locator('[data-testid="popup-confirm"]');
    await expect(confirm).toBeEnabled({ timeout: 2_000 });
    // ... dispatch and verify
  });
});
```
**Key differences for Discord test:**
- Use local Discord stub fixture HTML (no external service dependency)
- No `test.skip` for env var -- fixture is self-contained
- Verify message appears in stub's message list container
- Additional tests: channel-switch safety, login redirect

**E2E fixtures pattern** (from `tests/e2e/fixtures.ts` lines 1-64):
```typescript
import { test as base, chromium, type BrowserContext } from '@playwright/test';
// ... launchPersistentContext with --load-extension
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  reloadExtension: () => Promise<void>;
}>({ ... });
```

---

### `tests/unit/adapters/discord.fixture.html` (test fixture)

**Analog:** `tests/e2e/fixtures/mock-platform.html` (role-match -- both are HTML fixtures for adapter testing)

Discord fixture should include:
- `div[role="textbox"][aria-label="Message #general"][data-slate-editor="true"]` -- Slate editor
- `div[data-list-id="chat-messages-12345"][role="list"]` -- message list container
- `div[class*="textArea"]` -- class fragment fallback
- Script simulating Slate paste handler + Enter send (per RESEARCH.md code example)

---

## Shared Patterns

### Content Script Registration Protocol
**Source:** `entrypoints/openclaw.content.ts` lines 55-65
**Apply to:** `entrypoints/discord.content.ts`
```typescript
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
```

### Adapter Registry Entry Shape
**Source:** `shared/adapters/registry.ts` lines 28-65
**Apply to:** Discord entry append
```typescript
{
  id: 'discord' as const,
  match: (url: string): boolean => { /* pure URL test */ },
  scriptFile: 'content-scripts/discord.js',
  hostMatches: ['https://discord.com/*'],
  iconKey: 'platform_icon_discord',
}
```

### MutationObserver + Timeout Pattern
**Source:** `entrypoints/openclaw.content.ts` lines 117-170
**Apply to:** Discord adapter `waitForElement` + `waitForNewMessage`
- Same `settled` flag + `observer.disconnect()` + `clearTimeout` cleanup
- Same 5s timeout constant

### Error Response Shape
**Source:** `entrypoints/openclaw.content.ts` lines 39-44
**Apply to:** Discord adapter responses
```typescript
interface AdapterDispatchResponse {
  ok: boolean;
  code?: string;
  message?: string;
  retriable?: boolean;
}
```

### SW Top-Level Listener Registration
**Source:** `entrypoints/background.ts` lines 71-134
**Apply to:** `webNavigation.onHistoryStateUpdated` listener
- Must be inside `defineBackground(() => { ... })` closure
- Must be synchronous (no `await` before)
- Must appear alongside existing `chrome.tabs.onUpdated` and `chrome.alarms.onAlarm` listeners

### i18n Key Format
**Source:** `locales/en.yml` / `locales/zh_CN.yml`
**Apply to:** Discord ToS keys
- Format: `key_name:\n  message: 'text'`
- 100% key parity between `en.yml` and `zh_CN.yml`
- Group comment header: `# Group J — Discord ToS (D-59, D-61)`

### DOM Injector -- ClipboardEvent (NEW, not from existing code)
**Source:** CLAUDE.md convention + RESEARCH.md Pattern 1
**Apply to:** `entrypoints/discord.content.ts` paste injection
```typescript
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
**Note:** This is the Discord-specific injection method. `shared/dom-injector.ts` (`setInputValue`) is for React controlled inputs (OpenClaw). Discord uses ClipboardEvent paste for Slate editors. Do NOT import `setInputValue` in the Discord adapter.

### Unit Test Structure
**Source:** `tests/unit/adapters/openclaw-compose.spec.ts` + `openclaw-match.spec.ts`
**Apply to:** All Discord unit tests
```typescript
import { describe, it, expect } from 'vitest';
// import from source module
describe('adapters/discord — <feature> (<REQ-IDs>)', () => {
  // test data at top
  // parameterized positive cases with for-of
  // parameterized negative cases with for-of
});
```

### E2E Test Structure
**Source:** `tests/e2e/openclaw-dispatch.spec.ts` + `tests/e2e/fixtures.ts` + `tests/e2e/helpers.ts`
**Apply to:** Discord E2E tests
```typescript
import { test, expect } from './fixtures';
import { openArticleAndPopup } from './helpers';
test.describe('discord dispatch', () => {
  test('happy path', async ({ context, extensionId }) => {
    // 1. openArticleAndPopup
    // 2. fill send_to with Discord URL
    // 3. click Confirm
    // 4. verify message in stub page
  });
});
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/unit/adapters/discord-selector.spec.ts` | test | -- | No existing selector/paste unit tests in the codebase. Use `discord.fixture.html` + Vitest happy-dom. Test the three-tier fallback selector chain and ClipboardEvent paste injection. Follow the `describe/it` structure from `openclaw-compose.spec.ts`. |

## Metadata

**Analog search scope:** `entrypoints/`, `shared/adapters/`, `shared/`, `background/`, `tests/unit/adapters/`, `tests/e2e/`, `locales/`, `scripts/`, root config files
**Files scanned:** 18 analog files read
**Pattern extraction date:** 2026-05-05
