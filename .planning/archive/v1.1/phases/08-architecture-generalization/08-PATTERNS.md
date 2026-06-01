# Phase 8: 架构泛化 - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 11 (9 modified + 2 created)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `shared/adapters/types.ts` | model | transform | self (current version) | exact |
| `shared/adapters/registry.ts` | service | request-response | self (current version) | exact |
| `shared/messaging/result.ts` | model | transform | self (current version) | exact |
| `shared/storage/repos/dispatch.ts` | service | CRUD | self (current version) | exact |
| `entrypoints/background.ts` | controller | event-driven | self (current version) | exact |
| `entrypoints/discord.content.ts` | controller | event-driven | self (current version) | exact |
| `entrypoints/popup/components/SendForm.tsx` | component | request-response | self (current version) | exact |
| `entrypoints/popup/components/ErrorBanner.tsx` | component | request-response | self (current version) | exact |
| `background/dispatch-pipeline.ts` | service | event-driven | self (current version) | exact |
| `tests/unit/dispatch/mainWorldBridge.spec.ts` (NEW) | test | -- | `tests/unit/dispatch/discordMainWorldPaste.spec.ts` | role-match |
| `tests/unit/dispatch/spaFilter.spec.ts` (NEW) | test | -- | `tests/unit/dispatch/platform-detector.spec.ts` | role-match |

## Pattern Assignments

### `shared/adapters/types.ts` (model, transform)

**Analog:** Self -- this is the file being modified.

**Imports pattern** (lines 1-12):
```typescript
import type { Result, ErrorCode } from '@/shared/messaging';
```

**Core type definition pattern** (lines 14-37):
```typescript
// Current PlatformId -- to be replaced with branded type
export type PlatformId = 'mock' | 'openclaw' | 'discord';

// AdapterRegistryEntry -- to be expanded with new optional fields
export interface AdapterRegistryEntry {
  readonly id: PlatformId;
  match(url: string): boolean;
  readonly scriptFile: string;
  readonly hostMatches: readonly string[];
  readonly iconKey: string;
}
```

**New branded type pattern** (from RESEARCH.md Pattern 1):
```typescript
declare const __platformIdBrand: unique symbol;
export type PlatformId = string & { readonly [__platformIdBrand]: never };

export function definePlatformId(raw: string): PlatformId {
  return raw as PlatformId;
}
```

**New registry entry fields** (from RESEARCH.md Pattern 2):
```typescript
// Phase 8 additions to AdapterRegistryEntry:
readonly mainWorldInjector?: (text: string) => Promise<boolean>;
readonly spaNavigationHosts?: readonly string[];
readonly errorCodes?: readonly string[];
```

---

### `shared/adapters/registry.ts` (service, request-response)

**Analog:** Self -- this is the file being modified.

**Imports pattern** (line 26):
```typescript
import type { AdapterRegistryEntry, PlatformId } from './types';
```

**Registry array construction pattern** (lines 28-82):
```typescript
export const adapterRegistry: readonly AdapterRegistryEntry[] = [
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
  // ... more entries
] as const;
```

**Lookup functions pattern** (lines 84-95):
```typescript
export function findAdapter(url: string): AdapterRegistryEntry | undefined {
  return adapterRegistry.find((a) => a.match(url));
}

export function detectPlatformId(url: string): PlatformId | null {
  return findAdapter(url)?.id ?? null;
}
```

**New: `defineAdapter()` helper** will wrap each entry, producing branded PlatformId via `definePlatformId()`. Each entry in the array will use `defineAdapter({...})` instead of raw object literals.

**New: `buildSpaUrlFilters()` function** (from RESEARCH.md Pattern 3):
```typescript
export function buildSpaUrlFilters(
  registry: readonly AdapterRegistryEntry[]
): chrome.events.UrlFilter[] {
  return registry
    .filter((e) => e.spaNavigationHosts && e.spaNavigationHosts.length > 0)
    .flatMap((e) => e.spaNavigationHosts!.map((host) => ({ hostEquals: host })));
}
```

---

### `shared/messaging/result.ts` (model, transform)

**Analog:** Self -- this is the file being modified.

**Current ErrorCode union** (lines 18-29):
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
  | 'PLATFORM_UNSUPPORTED'
  | 'OPENCLAW_OFFLINE'
  | 'OPENCLAW_PERMISSION_DENIED';
```

**Result/Ok/Err pattern** (lines 31-43):
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

**Phase 8 change:** Reorganize ErrorCode into `CommonErrorCode | PlatformErrorCode` with comment sections, keeping all existing string values stable (D-108). RESEARCH.md recommends the simpler approach: keep all codes in this file with comment grouping, add `isErrorCode()` runtime guard.

---

### `shared/storage/repos/dispatch.ts` (service, CRUD)

**Analog:** Self -- type-only change.

**Current `platform_id` field** (line 24):
```typescript
platform_id: string;
```

**Phase 8 change:** Replace with branded type import:
```typescript
import type { PlatformId } from '@/shared/adapters/types';
// ...
platform_id: PlatformId;
```

**Key/value repo pattern** (lines 35-58 -- unchanged, reference only):
```typescript
export async function set(record: DispatchRecord): Promise<void> {
  await chrome.storage.session.set({ [recordKey(record.dispatchId)]: record });
}

export async function get(dispatchId: string): Promise<DispatchRecord | undefined> {
  const k = recordKey(dispatchId);
  const all = await chrome.storage.session.get(k);
  return all[k] as DispatchRecord | undefined;
}
```

---

### `entrypoints/background.ts` (controller, event-driven)

**Analog:** Self -- the PRIMARY modification target.

**Imports pattern** (lines 1-13):
```typescript
import { defineBackground } from '#imports';
import { onMessage, schemas, Ok, Err, type Result } from '@/shared/messaging';
import { metaItem } from '@/shared/storage';
import { runCapturePipeline } from '@/background/capture-pipeline';
import {
  startDispatch,
  cancelDispatch,
  onTabComplete,
  onAlarmFired,
} from '@/background/dispatch-pipeline';
import { historyList, historyDelete } from '@/background/handlers/history';
import { bindingUpsert, bindingGet } from '@/background/handlers/binding';
```

**Discord-specific port constant + MAIN world function** (lines 38-109) -- TO BE REMOVED and replaced with generic registry-driven routing:
```typescript
const DISCORD_MAIN_WORLD_PASTE_PORT = 'WEB2CHAT_DISCORD_MAIN_WORLD_PASTE';

async function discordMainWorldPaste(text: string): Promise<boolean> {
  // ... Discord-specific Slate editor paste logic
}
```

**Port listener pattern** (lines 166-201) -- TO BE GENERALIZED:
```typescript
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== DISCORD_MAIN_WORLD_PASTE_PORT) return;
  port.onMessage.addListener((msg, senderPort) => {
    const tabId = senderPort.sender?.tab?.id;
    const text = typeof msg?.text === 'string' ? msg.text : null;
    if (typeof tabId !== 'number') { /* error */ }
    if (text === null) { /* error */ }
    void chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: discordMainWorldPaste,
      args: [text],
    }).then((results) => {
      port.postMessage({ ok: results[0]?.result === true });
      port.disconnect();
    }).catch((err: unknown) => {
      port.postMessage({ ok: false, message: ... });
      port.disconnect();
    });
  });
});
```

**Generic replacement pattern** (from RESEARCH.md Example 2):
```typescript
const MAIN_WORLD_PORT_PREFIX = 'WEB2CHAT_MAIN_WORLD:';

chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith(MAIN_WORLD_PORT_PREFIX)) return;
  const platformId = port.name.slice(MAIN_WORLD_PORT_PREFIX.length);
  // lookup entry.mainWorldInjector from registry, then executeScript
});
```

**SPA filter -- current hardcoded** (lines 245-258) -- TO BE REPLACED:
```typescript
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    void onTabComplete(details.tabId, { status: 'complete' }, {
      url: details.url,
    } as chrome.tabs.Tab);
  },
  { url: [{ hostSuffix: 'discord.com' }] },
);
```

**Generic SPA replacement** (from RESEARCH.md Pattern 3):
```typescript
import { adapterRegistry, buildSpaUrlFilters } from '@/shared/adapters/registry';

const spaFilters = buildSpaUrlFilters(adapterRegistry);

// Inside defineBackground():
if (spaFilters.length > 0) {
  chrome.webNavigation.onHistoryStateUpdated.addListener(
    onSpaHistoryStateUpdated,
    { url: spaFilters },
  );
}
```

**Synchronous top-level listener registration** (lines 144-258 -- the `defineBackground(() => { ... })` body):
All listener registrations MUST remain synchronous at module top level within `defineBackground`. No `await` before any `addListener` call.

---

### `entrypoints/discord.content.ts` (controller, event-driven)

**Analog:** Self -- minimal string constant swap.

**Current port constant** (line 31):
```typescript
const DISCORD_MAIN_WORLD_PASTE_PORT = 'WEB2CHAT_DISCORD_MAIN_WORLD_PASTE';
```

**Phase 8 replacement** (from RESEARCH.md Example 3):
```typescript
const PLATFORM_ID = 'discord';
const MAIN_WORLD_PORT = `WEB2CHAT_MAIN_WORLD:${PLATFORM_ID}`;
```

**Port connection usage** (line 174):
```typescript
const port = chrome.runtime.connect({ name: DISCORD_MAIN_WORLD_PASTE_PORT });
```
Changes to:
```typescript
const port = chrome.runtime.connect({ name: MAIN_WORLD_PORT });
```

---

### `entrypoints/popup/components/SendForm.tsx` (component, request-response)

**Analog:** Self -- minor refactoring of helper functions.

**Current hardcoded platform if/else chains** (lines 392-406):
```typescript
function variantFromUrl(url: string): ComboboxOption['iconVariant'] {
  const id = detectPlatformId(url);
  if (id === 'mock') return 'mock';
  if (id === 'openclaw') return 'openclaw';
  if (id === 'discord') return 'discord';
  return 'unsupported';
}

function iconForPlatformId(id: string | null): ComboboxOption['iconVariant'] {
  if (id === null) return 'unsupported';
  if (id === 'mock') return 'mock';
  if (id === 'openclaw') return 'openclaw';
  if (id === 'discord') return 'discord';
  return 'unsupported';
}
```

**Phase 8 replacement:** Use registry `iconKey` lookup instead of hardcoded if/else. The `AdapterRegistryEntry.iconKey` field already exists (e.g., `'platform_icon_mock'`). Refactor to:
```typescript
function iconForPlatformId(id: PlatformId | null): ComboboxOption['iconVariant'] {
  if (id === null) return 'unsupported';
  const entry = adapterRegistry.find((e) => e.id === id);
  return entry ? (entry.iconKey.replace('platform_icon_', '') as ComboboxOption['iconVariant']) : 'unsupported';
}
```

Note: Exact approach is Claude's discretion. The goal is registry-driven lookup.

---

### `entrypoints/popup/components/ErrorBanner.tsx` (component, request-response)

**Analog:** Self -- additive default case.

**Current exhaustive switch pattern** (lines 99-174):
```typescript
function errorHeading(code: ErrorCode): string {
  switch (code) {
    case 'NOT_LOGGED_IN':
      return t('error_code_NOT_LOGGED_IN_heading');
    // ... 10 more cases, no default
  }
}
```

**Phase 8 change:** Add default case to each switch function for future extensibility:
```typescript
default:
  return t('error_code_INTERNAL_heading'); // or a generic fallback
```

---

### `background/dispatch-pipeline.ts` (service, event-driven)

**Analog:** Self -- refactoring internal helpers.

**Current `failDispatch` signature** (lines 371-394):
```typescript
async function failDispatch(
  record: DispatchRecord,
  code:
    | 'INTERNAL'
    | 'NOT_LOGGED_IN'
    | 'INPUT_NOT_FOUND'
    | 'TIMEOUT'
    | 'RATE_LIMITED'
    | 'EXECUTE_SCRIPT_FAILED'
    | 'OPENCLAW_OFFLINE'
    | 'OPENCLAW_PERMISSION_DENIED',
  message: string,
  retriable: boolean,
): Promise<void> { /* ... */ }
```

**Phase 8 change:** Replace hardcoded code union with `ErrorCode` type:
```typescript
async function failDispatch(
  record: DispatchRecord,
  code: ErrorCode,
  message: string,
  retriable: boolean,
): Promise<void> { /* ... */ }
```

**`onTabComplete` pattern** (lines 405-446) -- to be shared with new `onSpaHistoryStateUpdated`:
```typescript
export async function onTabComplete(
  tabId: number,
  changeInfo: chrome.tabs.OnUpdatedInfo,
  _tab: chrome.tabs.Tab,
): Promise<void> {
  if (changeInfo.status !== 'complete') return;
  const all = await dispatchRepo.listAll();
  for (const record of all) {
    if (record.state !== 'awaiting_complete') continue;
    if (record.target_tab_id !== tabId) continue;
    const adapter = findAdapter(record.send_to);
    // ... login detection + advanceToAdapterInjection
  }
}
```

**Phase 8 extracts `advanceDispatchForTab(tabId)` helper** (from RESEARCH.md Example 4):
```typescript
async function advanceDispatchForTab(tabId: number): Promise<void> {
  const all = await dispatchRepo.listAll();
  for (const record of all) {
    if (record.state !== 'awaiting_complete') continue;
    if (record.target_tab_id !== tabId) continue;
    const adapter = findAdapter(record.send_to);
    if (!adapter) { /* fail */ continue; }
    // Login redirect check...
    await advanceToAdapterInjection(record, adapter.scriptFile);
  }
}
```

Then `onTabComplete` and `onSpaHistoryStateUpdated` both call `advanceDispatchForTab(tabId)`.

---

### `tests/unit/dispatch/mainWorldBridge.spec.ts` (NEW test)

**Analog:** `tests/unit/dispatch/discordMainWorldPaste.spec.ts`

**Test file structure pattern** (lines 1-11):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

**Test setup pattern** -- from `login-detection.spec.ts` (lines 49-80) as a better analog since it tests SW-side dispatch behavior with `fakeBrowser` + chrome stub:
```typescript
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('...', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: { ...chrome.tabs, get: vi.fn(), sendMessage: vi.fn().mockResolvedValue({ ok: true }) },
      scripting: { ...chrome.scripting, executeScript: vi.fn().mockResolvedValue([{ result: undefined }]) },
      action: { ...chrome.action, setBadgeText: vi.fn().mockResolvedValue(undefined), setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined) },
      alarms: { ...chrome.alarms, create: vi.fn().mockResolvedValue(undefined), clear: vi.fn().mockResolvedValue(true) },
      storage: chrome.storage,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
```

**Test should cover:** Generic port routing with `WEB2CHAT_MAIN_WORLD:<platformId>` prefix, platformId extraction, registry lookup for injector, unknown platformId error response.

---

### `tests/unit/dispatch/spaFilter.spec.ts` (NEW test)

**Analog:** `tests/unit/dispatch/platform-detector.spec.ts`

**Pure function test pattern** (lines 1-43):
```typescript
import { describe, it, expect } from 'vitest';
import { adapterRegistry, findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('shared/adapters/registry (D-24 / D-26)', () => {
  it('registry contains mock, openclaw, and discord entries', () => {
    expect(adapterRegistry).toHaveLength(3);
    expect(adapterRegistry[0]?.id).toBe('mock');
  });

  it('match function is pure (no chrome.* dependency -- popup-safe)', () => {
    expect(() =>
      adapterRegistry[0]?.match('http://localhost:4321/mock-platform.html'),
    ).not.toThrow();
  });
});
```

**Test should cover:** `buildSpaUrlFilters()` produces correct `UrlFilter[]`, empty when no platforms have `spaNavigationHosts`, combines multiple SPA platforms correctly, uses `hostEquals` (not `hostSuffix`).

---

## Shared Patterns

### Synchronous Top-Level Listener Registration
**Source:** `entrypoints/background.ts` lines 144-258
**Apply to:** All SW-level listener registration changes (MAIN bridge, SPA filter)
```typescript
export default defineBackground(() => {
  // ALL listeners registered synchronously here, no await before any addListener
  chrome.runtime.onConnect.addListener(/* ... */);
  chrome.tabs.onUpdated.addListener(onTabComplete);
  chrome.alarms.onAlarm.addListener(onAlarmFired);
  chrome.webNavigation.onHistoryStateUpdated.addListener(/* ... */);
});
```

### Registry-Pure Match Functions
**Source:** `shared/adapters/registry.ts` lines 28-82
**Apply to:** All registry entry definitions, `buildSpaUrlFilters()`, `findAdapter()`
```typescript
// CRITICAL: match() is pure -- NO chrome.* calls.
// Registry is imported into popup + SW + content-script bundles.
match: (url: string): boolean => {
  try {
    const u = new URL(url);
    return /* pure URL check */;
  } catch {
    return false;
  }
},
```

### Error Model (Ok/Err)
**Source:** `shared/messaging/result.ts` lines 31-43
**Apply to:** All service functions, dispatch pipeline, handlers
```typescript
export type Result<T, E extends ErrorCode = ErrorCode> =
  | { ok: true; data: T }
  | { ok: false; code: E; message: string; retriable: boolean };

export const Ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
export function Err<E extends ErrorCode>(code: E, message: string, retriable = false): Result<never, E> {
  return { ok: false, code, message, retriable };
}
```

### Test Setup Pattern (fakeBrowser + chrome stub)
**Source:** `tests/unit/dispatch/login-detection.spec.ts` lines 49-80
**Apply to:** All new test files (`mainWorldBridge.spec.ts`, `spaFilter.spec.ts`)
```typescript
import { fakeBrowser } from 'wxt/testing/fake-browser';

beforeEach(() => {
  fakeBrowser.reset();
  vi.stubGlobal('chrome', {
    ...chrome,
    // stub only the chrome APIs used by the code under test
    storage: chrome.storage,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### DispatchRecord Factory Pattern
**Source:** `tests/unit/dispatch/login-detection.spec.ts` lines 26-46
**Apply to:** Any test that needs DispatchRecord instances
```typescript
function makeRecord(overrides: Partial<DispatchRecord> = {}): DispatchRecord {
  return {
    schemaVersion: 1,
    dispatchId: 'test-dispatch-001',
    state: 'awaiting_complete',
    target_tab_id: TAB_ID,
    send_to: DISCORD_CHANNEL_URL,
    prompt: 'hello',
    snapshot: { title: 'Test', url: 'https://example.com', description: 'desc', create_at: '2026-05-05T00:00:00Z', content: 'body' },
    platform_id: 'discord',
    started_at: '2026-05-05T00:00:00Z',
    last_state_at: '2026-05-05T00:00:00Z',
    ...overrides,
  };
}
```
Note: After Phase 8, `platform_id` values in test records must go through `definePlatformId()` or use registry entry `id` values.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| -- | -- | -- | All files have direct analogs (self or existing test peers) |

## Metadata

**Analog search scope:** `shared/`, `entrypoints/`, `background/`, `tests/unit/`
**Files scanned:** 11 source + test files
**Pattern extraction date:** 2026-05-09
