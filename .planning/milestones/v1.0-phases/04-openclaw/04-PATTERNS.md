# Phase 4: OpenClaw Adapter - Pattern Map

**Mapped:** 2026-05-01
**Files analyzed:** 16 (new/modified)
**Analogs found:** 14 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `entrypoints/openclaw.content.ts` | adapter (content script) | event-driven | `entrypoints/mock-platform.content.ts` | exact |
| `shared/dom-injector.ts` | utility | transform | (no analog — new capability) | no-analog |
| `shared/storage/repos/grantedOrigins.ts` | store | CRUD | `shared/storage/repos/history.ts` | role-match |
| `shared/storage/items.ts` | config (extend) | CRUD | `shared/storage/items.ts` lines 75-103 | exact |
| `shared/adapters/registry.ts` | config (extend) | request-response | `shared/adapters/registry.ts` lines 28-50 | exact |
| `shared/messaging/result.ts` | model (extend) | -- | `shared/messaging/result.ts` lines 18-27 | exact |
| `background/dispatch-pipeline.ts` | service (modify) | request-response | `background/dispatch-pipeline.ts` lines 97-170 | exact |
| `entrypoints/popup/components/SendForm.tsx` | component (modify) | event-driven | `entrypoints/popup/components/SendForm.tsx` lines 186-214 | exact |
| `entrypoints/popup/components/ErrorBanner.tsx` | component (extend) | request-response | `entrypoints/popup/components/ErrorBanner.tsx` lines 99-163 | exact |
| `entrypoints/options/App.tsx` | component (modify) | request-response | `entrypoints/options/App.tsx` lines 17-30 | exact |
| `entrypoints/options/components/GrantedOriginsSection.tsx` | component (new) | CRUD | `entrypoints/options/components/ResetSection.tsx` | role-match |
| `locales/en.yml` | config (extend) | -- | `locales/en.yml` lines 106-155 | exact |
| `locales/zh_CN.yml` | config (extend) | -- | `locales/zh_CN.yml` | exact |
| `tests/unit/adapters/openclaw-match.spec.ts` | test | -- | `tests/unit/dispatch/platform-detector.spec.ts` | role-match |
| `tests/unit/repos/grantedOrigins.spec.ts` | test | -- | `tests/unit/repos/history.spec.ts` | exact |
| `tests/e2e/openclaw-dispatch.spec.ts` | test (e2e) | -- | `tests/e2e/dispatch.spec.ts` | exact |

## Pattern Assignments

### `entrypoints/openclaw.content.ts` (adapter, event-driven)

**Analog:** `entrypoints/mock-platform.content.ts`

**Imports pattern** (line 24):
```typescript
import { defineContentScript } from '#imports';
```

**Message type guard pattern** (lines 49-56):
```typescript
function isAdapterDispatch(msg: unknown): msg is AdapterDispatchMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as { type: unknown }).type === 'ADAPTER_DISPATCH'
  );
}
```

**Content script registration pattern** (lines 58-101):
```typescript
export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      // ... async handler ...
      void handleDispatch(msg.payload).then(sendResponse);
      return true; // keep channel open for async response
    });
  },
});
```

**Response shape pattern** (lines 26-47):
```typescript
interface AdapterDispatchResponse {
  ok: boolean;
  code?: 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'INTERNAL';
  message?: string;
  retriable?: boolean;
}
```

---

### `shared/dom-injector.ts` (utility, transform)

**No direct analog.** New file implementing property-descriptor setter per CLAUDE.md convention. Pattern from RESEARCH.md:

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

---

### `shared/storage/repos/grantedOrigins.ts` (store, CRUD)

**Analog:** `shared/storage/repos/history.ts`

**Import pattern** (line 13):
```typescript
import { sendToHistoryItem, promptHistoryItem, type HistoryEntry } from '@/shared/storage/items';
```

**Adapt for grantedOrigins:**
```typescript
import { grantedOriginsItem } from '@/shared/storage/items';
```

**Core CRUD pattern — add with dedupe** (lines 26-46):
```typescript
async function addCore(
  item: typeof sendToHistoryItem | typeof promptHistoryItem,
  value: string,
): Promise<void> {
  if (!value) return;
  const all = await item.getValue();
  const idx = all.findIndex((e) => e.value === value);
  // ... dedupe + cap logic ...
  await item.setValue(all);
}
```

**Remove pattern** (lines 59-65):
```typescript
async function removeCore(
  item: typeof sendToHistoryItem | typeof promptHistoryItem,
  value: string,
): Promise<number> {
  const all = await item.getValue();
  const next = all.filter((e) => e.value !== value);
  await item.setValue(next);
  return next.length;
}
```

**Exported constants for spec assertions** (lines 97-98):
```typescript
export const HISTORY_CAP = CAP;
export const HISTORY_TOP_N = TOP_N;
```

---

### `shared/storage/items.ts` (config extend)

**Analog:** Same file, Phase 3 items pattern (lines 75-103)

**Typed item declaration pattern:**
```typescript
/** D-29: send_to URL history (storage.local; cap=50; ordered by hybrid score in repo). */
export const sendToHistoryItem = storage.defineItem<HistoryEntry[]>('local:sendToHistory', {
  fallback: [],
  version: CURRENT_SCHEMA_VERSION,
  migrations: { 1: (prev) => prev },
});
```

**Adapt for grantedOrigins:**
```typescript
/** D-45: granted origins for dynamic host_permissions (storage.local). */
export const grantedOriginsItem = storage.defineItem<string[]>('local:grantedOrigins', {
  fallback: [],
  version: CURRENT_SCHEMA_VERSION,
  migrations: { 1: (prev) => prev },
});
```

---

### `shared/adapters/registry.ts` (config extend)

**Analog:** Same file, mock entry pattern (lines 28-50)

**Registry entry structure:**
```typescript
{
  id: 'mock',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.host === 'localhost:4321' && u.pathname === '/mock-platform.html';
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/mock-platform.js',
  hostMatches: ['http://localhost/*'],
  iconKey: 'platform_icon_mock',
},
```

**Adapt for openclaw — append before `] as const`:**
```typescript
{
  id: 'openclaw',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return (u.pathname === '/ui/chat' || u.pathname === '/chat') && u.searchParams.has('session');
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/openclaw.js',
  hostMatches: [],  // dynamic permission — no static host
  iconKey: 'platform_icon_openclaw',
},
```

---

### `shared/messaging/result.ts` (model extend)

**Analog:** Same file (lines 18-27)

**ErrorCode union extension pattern:**
```typescript
export type ErrorCode =
  | 'INTERNAL'
  | 'RESTRICTED_URL'
  | 'EXTRACTION_EMPTY'
  | 'EXECUTE_SCRIPT_FAILED'
  | 'NOT_LOGGED_IN'
  | 'INPUT_NOT_FOUND'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'PLATFORM_UNSUPPORTED';
```

**Append two new codes:**
```typescript
  | 'OPENCLAW_OFFLINE'          // OpenClaw 页面 DOM 无特征元素
  | 'OPENCLAW_PERMISSION_DENIED'; // chrome.permissions.request 被用户拒绝
```

---

### `background/dispatch-pipeline.ts` (service modify — permissions guard)

**Analog:** Same file, `startDispatch` function (lines 97-170)

**Insertion point — after findAdapter (Step 2, line 107), before openOrActivateTab (Step 5, line 134):**

```typescript
// Step 2: D-24 platform detection. No adapter -> PLATFORM_UNSUPPORTED.
const adapter = findAdapter(input.send_to);
if (!adapter) {
  return Err('PLATFORM_UNSUPPORTED', input.send_to, false);
}

// ← INSERT PERMISSION CHECK HERE (Phase 4 D-44)
// Step 3: Write 'pending' record.
```

**Error return pattern (line 109):**
```typescript
return Err('PLATFORM_UNSUPPORTED', input.send_to, false);
```

**Also extend `failDispatch` code union (line 271-278) to accept new codes:**
```typescript
async function failDispatch(
  record: DispatchRecord,
  code:
    | 'INTERNAL'
    | 'NOT_LOGGED_IN'
    | 'INPUT_NOT_FOUND'
    | 'TIMEOUT'
    | 'RATE_LIMITED'
    | 'EXECUTE_SCRIPT_FAILED',
  // ...
```

**Extend to include `'OPENCLAW_OFFLINE' | 'OPENCLAW_PERMISSION_DENIED'`.**

---

### `entrypoints/popup/components/SendForm.tsx` (component modify — permission request)

**Analog:** Same file, `handleConfirm` function (lines 186-214)

**Current Confirm handler pattern:**
```typescript
async function handleConfirm() {
  const dispatchId = crypto.randomUUID();
  const input: DispatchStartInput = {
    dispatchId,
    send_to: props.sendTo,
    prompt: props.prompt,
    snapshot: { /* ... */ },
  };
  props.onConfirm(dispatchId);
  try {
    const res = await sendMessage('dispatch.start', input);
    if (res.ok) {
      window.close();
    } else {
      props.onDispatchError(res.code, res.message);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    props.onDispatchError('INTERNAL', msg);
  }
}
```

**Phase 4 inserts permission check BEFORE `props.onConfirm(dispatchId)` — user gesture is active at this point.**

---

### `entrypoints/popup/components/ErrorBanner.tsx` (component extend)

**Analog:** Same file, switch cases (lines 99-163)

**Pattern — add case to each switch function:**
```typescript
function errorHeading(code: ErrorCode): string {
  switch (code) {
    case 'NOT_LOGGED_IN':
      return t('error_code_NOT_LOGGED_IN_heading');
    // ... existing cases ...
    // Phase 4: add these
    case 'OPENCLAW_OFFLINE':
      return t('error_code_OPENCLAW_OFFLINE_heading');
    case 'OPENCLAW_PERMISSION_DENIED':
      return t('error_code_OPENCLAW_PERMISSION_DENIED_heading');
  }
}
```

**RETRIABLE_CODES set extension (line 30-37):**
```typescript
const RETRIABLE_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'NOT_LOGGED_IN',
  'INPUT_NOT_FOUND',
  'TIMEOUT',
  'RATE_LIMITED',
  'EXECUTE_SCRIPT_FAILED',
  'INTERNAL',
  // Phase 4:
  'OPENCLAW_OFFLINE',
  'OPENCLAW_PERMISSION_DENIED',
]);
```

---

### `entrypoints/options/components/GrantedOriginsSection.tsx` (component, CRUD)

**Analog:** `entrypoints/options/components/ResetSection.tsx`

**Imports pattern** (lines 1-4):
```typescript
import { signal } from '@preact/signals';
import { t } from '@/shared/i18n';
import { sendMessage } from '@/shared/messaging';
import { ConfirmDialog } from './ConfirmDialog';
```

**Section card layout pattern** (lines 57-69):
```typescript
<section
  class="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 flex flex-col gap-4"
  data-testid="options-reset-section"
>
  <header class="flex flex-col gap-2">
    <h2 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
      {t('options_reset_heading')}
    </h2>
    <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
      {t('options_reset_explainer')}
    </p>
  </header>
```

**Button styling pattern** (lines 71-79):
```typescript
<button
  type="button"
  class="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-semibold"
  onClick={() => { /* ... */ }}
  data-testid="options-reset-button"
>
  {t('options_reset_button')}
</button>
```

---

### `entrypoints/options/App.tsx` (component modify)

**Analog:** Same file (lines 17-30)

**Replace ReservedSection Phase 4 with real GrantedOriginsSection:**
```typescript
export function App() {
  return (
    <main class="mx-auto max-w-[720px] p-8 flex flex-col gap-4 font-sans" data-testid="options-app">
      <h1 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
        {t('options_page_heading')}
      </h1>
      <ResetSection />
      {/* Phase 4 reserved — Granted origins management */}
      <ReservedSection labelKey="options_reserved_granted_origins" phaseTag="Phase 4" />
      {/* ↑ Replace with <GrantedOriginsSection /> */}
```

---

### `locales/en.yml` (config extend)

**Analog:** Same file, Group D error_code block (lines 106-155)

**Error code key naming convention:**
```yaml
error_code_NOT_LOGGED_IN_heading:
  message: 'Not logged in'
error_code_NOT_LOGGED_IN_body:
  message: 'Sign in to the target platform in your browser, then retry.'
error_code_NOT_LOGGED_IN_retry:
  message: 'Retry'
```

**Options section key convention (Group I, lines 192-217):**
```yaml
options_reset_heading:
  message: 'Reset history'
options_reset_explainer:
  message: 'This permanently deletes all...'
```

---

### `tests/unit/repos/grantedOrigins.spec.ts` (test)

**Analog:** `tests/unit/repos/history.spec.ts`

**Test file structure pattern** (lines 1-14):
```typescript
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  score,
  addSendTo,
  // ...
} from '@/shared/storage/repos/history';
import { sendToHistoryItem, promptHistoryItem } from '@/shared/storage/items';
```

**Setup/teardown pattern** (lines 44-51):
```typescript
describe('repos/history — sendTo CRUD (DSP-02)', () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    await sendToHistoryItem.setValue([]);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
```

---

### `tests/e2e/openclaw-dispatch.spec.ts` (e2e test)

**Analog:** `tests/e2e/dispatch.spec.ts`

**E2E fixture import pattern** (line 13):
```typescript
import { test, expect } from './fixtures';
```

**Page ordering helper pattern** (lines 23-39):
```typescript
async function openArticleAndPopup(
  context: import('@playwright/test').BrowserContext,
  extensionId: string,
) {
  const articlePage = await context.newPage();
  await articlePage.goto(ARTICLE_URL, { waitUntil: 'domcontentloaded' });
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await articlePage.bringToFront();
  await popup.goto(popupUrl);
  await popup.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });
  return { articlePage, popup, popupUrl };
}
```

**Happy path test structure** (lines 41-83):
```typescript
test('dispatch: happy path — Confirm → mock-platform tab visible + popup reopens clean', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);
  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(MOCK_PLATFORM_URL);
  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 1_000 });
  const newPagePromise = context.waitForEvent('page', { timeout: 5_000 });
  await confirm.click();
  const mockPage = await newPagePromise;
  // ... assertions ...
});
```

### `tests/e2e/fixtures/openclaw-stub.html` (fixture)

**Analog:** `tests/e2e/fixtures/mock-platform.html`

**HTML fixture pattern:**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mock Platform Stub — Phase 3 dispatch e2e</title>
  </head>
  <body>
    <main>
      <h1>Mock Platform</h1>
      <div id="mock-platform-target" data-testid="mock-platform-target">Awaiting dispatch...</div>
    </main>
  </body>
</html>
```

---

## Shared Patterns

### Authentication / Authorization (Permission Request)

**Source:** `entrypoints/popup/components/SendForm.tsx` lines 186-214
**Apply to:** `SendForm.tsx` (popup Confirm handler) + `dispatch-pipeline.ts` (defensive guard)

The popup Confirm click handler has user gesture — this is the ONLY valid place to call `chrome.permissions.request()`. The SW uses `chrome.permissions.contains()` as a defensive fallback only.

```typescript
// In popup handleConfirm():
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
// proceed with dispatch...
```

### Error Handling (Result Model)

**Source:** `shared/messaging/result.ts` lines 29-41
**Apply to:** All service + adapter files

```typescript
export type Result<T, E extends ErrorCode = ErrorCode> =
  | { ok: true; data: T }
  | { ok: false; code: E; message: string; retriable: boolean };

export const Ok = <T>(data: T): Result<T, never> => ({ ok: true, data });

export function Err<E extends ErrorCode = ErrorCode>(
  code: E,
  message: string,
  retriable = false,
): Result<never, E> {
  return { ok: false, code, message, retriable };
}
```

### Adapter Content Script Protocol

**Source:** `entrypoints/mock-platform.content.ts` lines 58-101
**Apply to:** `entrypoints/openclaw.content.ts`

```typescript
export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true; // keep channel open for async response
    });
  },
});
```

### Typed Storage Item Declaration

**Source:** `shared/storage/items.ts` lines 75-79
**Apply to:** `shared/storage/items.ts` (new grantedOriginsItem)

```typescript
export const sendToHistoryItem = storage.defineItem<HistoryEntry[]>('local:sendToHistory', {
  fallback: [],
  version: CURRENT_SCHEMA_VERSION,
  migrations: { 1: (prev) => prev },
});
```

### i18n Key Convention for ErrorCodes

**Source:** `locales/en.yml` lines 106-155
**Apply to:** Both locale files (en.yml + zh_CN.yml)

Pattern: `error_code_<CODE>_heading`, `error_code_<CODE>_body`, `error_code_<CODE>_retry`

### Options Page Section Card

**Source:** `entrypoints/options/components/ResetSection.tsx` lines 57-69
**Apply to:** `GrantedOriginsSection.tsx`

```typescript
<section
  class="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 flex flex-col gap-4"
  data-testid="options-origins-section"
>
  <header class="flex flex-col gap-2">
    <h2 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
      {t('options_origins_heading')}
    </h2>
  </header>
  {/* list items here */}
</section>
```

### Unit Test Setup with fake-browser

**Source:** `tests/unit/repos/history.spec.ts` lines 1-51
**Apply to:** All new unit test files

```typescript
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('...', () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    await someItem.setValue(/* default */);
  });
});
```

### E2E Test Fixture Pattern

**Source:** `tests/e2e/fixtures.ts` (full file) + `tests/e2e/dispatch.spec.ts` lines 13-39
**Apply to:** All new E2E spec files

```typescript
import { test, expect } from './fixtures';

// Constants for fixture URLs
const OPENCLAW_STUB_URL = 'http://localhost:4321/openclaw-stub.html?session=agent:main:main';
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `shared/dom-injector.ts` | utility | transform | No existing property-descriptor setter utility in codebase; pattern defined by CLAUDE.md convention + MDN reference |

---

## Metadata

**Analog search scope:** `entrypoints/`, `shared/`, `background/`, `tests/`, `locales/`
**Files scanned:** 22 source files read
**Pattern extraction date:** 2026-05-01
