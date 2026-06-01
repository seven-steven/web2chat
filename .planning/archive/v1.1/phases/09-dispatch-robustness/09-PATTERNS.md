# Phase 9: 投递鲁棒性 - Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 19
**Analogs found:** 19 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `shared/adapters/types.ts` | model / contract | request-response | `shared/adapters/types.ts` | exact |
| `shared/adapters/registry.ts` | config / registry | request-response | `shared/adapters/registry.ts` | exact |
| `shared/adapters/dispatch-policy.ts` (new, optional) | utility | transform | `shared/adapters/registry.ts` + `background/dispatch-pipeline.ts` | role-match |
| `shared/adapters/selector-confidence.ts` (new, optional) | utility / model | transform | `entrypoints/discord.content.ts` + `tests/unit/adapters/discord-selector.spec.ts` | role-match |
| `shared/messaging/result.ts` | model / contract | request-response | `shared/messaging/result.ts` | exact |
| `shared/messaging/routes/dispatch.ts` | route / schema | request-response | `shared/messaging/routes/dispatch.ts` | exact |
| `shared/messaging/index.ts` | config / barrel | transform | `shared/messaging/index.ts` | exact |
| `shared/storage/repos/dispatch.ts` | repository / model | CRUD | `shared/storage/repos/dispatch.ts` | exact |
| `background/dispatch-pipeline.ts` | service | event-driven request-response | `background/dispatch-pipeline.ts` | exact |
| `entrypoints/discord.content.ts` | content adapter | event-driven request-response | `entrypoints/discord.content.ts` | exact |
| `entrypoints/popup/App.tsx` | component / provider | event-driven request-response | `entrypoints/popup/App.tsx` | exact |
| `entrypoints/popup/components/SendForm.tsx` | component | request-response | `entrypoints/popup/components/SendForm.tsx` | exact |
| `entrypoints/popup/components/ErrorBanner.tsx` | component | request-response | `entrypoints/popup/components/ErrorBanner.tsx` | exact |
| `entrypoints/popup/components/SelectorWarningDialog.tsx` (new, optional) | component | event-driven request-response | `entrypoints/options/components/ConfirmDialog.tsx` | role-match |
| `locales/en.yml` | config / i18n | transform | `locales/en.yml` | exact |
| `locales/zh_CN.yml` | config / i18n | transform | `locales/zh_CN.yml` | exact |
| `tests/unit/dispatch/timeout-config.spec.ts` (new) | test | request-response | `tests/unit/dispatch/state-machine.spec.ts` | role-match |
| `tests/unit/dispatch/adapter-response-timeout.spec.ts` (new) | test | request-response | `tests/unit/dispatch/state-machine.spec.ts` + `tests/unit/dispatch/dispatch-timeout.spec.ts` | role-match |
| `tests/unit/dispatch/logged-out-paths.spec.ts` / revise `login-detection.spec.ts` | test | request-response | `tests/unit/dispatch/login-detection.spec.ts` | exact |
| `tests/unit/popup/retry-retriable.spec.tsx` (new) | test | event-driven request-response | `tests/unit/options/select.spec.tsx` | role-match |
| `tests/unit/adapters/discord-selector.spec.ts` / `tests/unit/dispatch/selector-warning.spec.ts` | test | event-driven request-response | `tests/unit/adapters/discord-selector.spec.ts` | exact |

## Pattern Assignments

### `shared/adapters/types.ts` (model / contract, request-response)

**Analog:** `shared/adapters/types.ts`

**Imports pattern** (lines 13-14):
```typescript
import type { Result, ErrorCode } from '@/shared/messaging';
```

**Registry contract pattern** (lines 42-64):
```typescript
/** Static descriptor stored in shared/adapters/registry.ts (no chrome.* dependency). */
export interface AdapterRegistryEntry {
  readonly id: PlatformId;
  /** Pure URL matcher — popup + SW both invoke. No chrome.* allowed. */
  match(url: string): boolean;
  /** Path of the WXT-built adapter bundle, passed to chrome.scripting.executeScript({ files: [...] }). */
  readonly scriptFile: string;
  /** host_permissions glob list — used by scripts/verify-manifest.ts to cross-check. */
  readonly hostMatches: readonly string[];
  /** i18n key for the platform's tooltip alt text (e.g. `platform_icon_mock`). */
  readonly iconKey: string;

  // Phase 8 additions:

  /** MAIN world injector function. If present, SW routes port messages to this. */
  readonly mainWorldInjector?: (text: string) => Promise<boolean>;
  /** Exact hostnames that trigger SPA history listener. Empty/absent = no SPA handling. Per D-104. */
  readonly spaNavigationHosts?: readonly string[];
  /** Platform-specific error codes declared by this adapter. Per D-110. */
  readonly errorCodes?: readonly string[];
  /** True for adapters that need runtime origin permission (e.g. self-hosted platforms). */
  readonly requiresDynamicPermission?: boolean;
}
```

**Helper construction pattern** (lines 68-76):
```typescript
export function defineAdapter(
  entry: Omit<AdapterRegistryEntry, 'id'> & { id: string },
): AdapterRegistryEntry {
  return { ...entry, id: definePlatformId(entry.id) };
}
```

**Apply:** Add optional `dispatchTimeoutMs`, `adapterResponseTimeoutMs`, `loggedOutPathPatterns`, and dispatch-warning types here or in a nearby pure shared module. Keep `chrome.*` out of this file.

---

### `shared/adapters/registry.ts` (config / registry, request-response)

**Analog:** `shared/adapters/registry.ts`

**Imports pattern** (lines 29-30):
```typescript
import { defineAdapter } from './types';
import type { AdapterRegistryEntry, PlatformId } from './types';
```

**Entry pattern** (lines 69-87):
```typescript
defineAdapter({
  id: 'discord',
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
  spaNavigationHosts: ['discord.com'],
}),
```

**Pure resolver pattern** (lines 90-101):
```typescript
export function findAdapter(url: string): AdapterRegistryEntry | undefined {
  return adapterRegistry.find((a) => a.match(url));
}

/** Return the registered PlatformId for a URL, or null if unsupported. */
export function detectPlatformId(url: string): PlatformId | null {
  return findAdapter(url)?.id ?? null;
}
```

**Apply:** Add timeout defaults/overrides through pure data; set Discord `loggedOutPathPatterns` for `/`, `/login*`, `/register*`. Do not add platform branching outside registry.

---

### `shared/adapters/dispatch-policy.ts` (new utility, transform)

**Analogs:** `background/dispatch-pipeline.ts`, `shared/adapters/registry.ts`

**Host matching helper pattern** (from `background/dispatch-pipeline.ts` lines 65-81):
```typescript
function isOnAdapterHost(adapter: AdapterRegistryEntry, actualUrl: string): boolean {
  return adapter.hostMatches.some((pattern) => {
    try {
      const patternHost = new URL(pattern.replace(/\*/g, 'x')).hostname;
      const actualHost = new URL(actualUrl).hostname;
      return actualHost === patternHost || actualHost.endsWith('.' + patternHost);
    } catch {
      return false;
    }
  });
}
```

**Registry pure-function constraint** (from `shared/adapters/registry.ts` lines 22-24):
```typescript
 * CRITICAL: match() is a pure function — NO chrome.* calls. WXT inlines this module
 * into popup + SW + content-script bundles; chrome.* dependencies would break popup-side
 * bundling.
```

**Apply:** Place `resolveAdapterTimeouts`, `assertValidDispatchTimeout`, `isLoggedOutUrlForAdapter`, and `pathMatches` here if planner wants a separate helper. Keep it pure and importable by tests.

---

### `shared/adapters/selector-confidence.ts` (new utility / model, transform)

**Analogs:** `entrypoints/discord.content.ts`, `tests/unit/adapters/discord-selector.spec.ts`

**Three-tier selector pattern** (from `entrypoints/discord.content.ts` lines 102-114):
```typescript
/**
 * ARIA-first three-level fallback editor selector (D-62).
 * Tier 1: role=textbox + aria-label containing "Message"
 * Tier 2: data-slate-editor attribute
 * Tier 3: class fragment textArea + contenteditable
 */
function findEditor(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]') ??
    document.querySelector<HTMLElement>('[data-slate-editor="true"]') ??
    document.querySelector<HTMLElement>('div[class*="textArea"] [contenteditable="true"]')
  );
}
```

**Fixture mirror test pattern** (from `tests/unit/adapters/discord-selector.spec.ts` lines 13-20):
```typescript
// Three-tier ARIA-first editor selector (mirrors discord.content.ts logic)
function findEditor(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]') ??
    document.querySelector<HTMLElement>('[data-slate-editor="true"]') ??
    document.querySelector<HTMLElement>('div[class*="textArea"] [contenteditable="true"]')
  );
}
```

**Apply:** Refactor return shape from `HTMLElement | null` to `{ element, tier, lowConfidence } | null`. Tier3 class-fragment must produce warning before compose/send unless one-shot confirmation is present.

---

### `shared/messaging/result.ts` (model / contract, request-response)

**Analog:** `shared/messaging/result.ts`

**Error-code type pattern** (lines 15-31):
```typescript
export type CommonErrorCode =
  | 'INTERNAL'
  | 'RESTRICTED_URL'
  | 'EXTRACTION_EMPTY'
  | 'EXECUTE_SCRIPT_FAILED'
  | 'NOT_LOGGED_IN'
  | 'INPUT_NOT_FOUND'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'PLATFORM_UNSUPPORTED';

export type ErrorCode = CommonErrorCode | PlatformErrorCode;
```

**Result helper pattern** (lines 55-67):
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

**Apply:** Do not add `SELECTOR_LOW_CONFIDENCE` to `ErrorCode`. Prefer a dispatch-specific warning channel unless planner deliberately changes generic `Result<T>`.

---

### `shared/messaging/routes/dispatch.ts` (route / schema, request-response)

**Analog:** `shared/messaging/routes/dispatch.ts`

**Zod input schema pattern** (lines 1-12):
```typescript
import { z } from 'zod';
import type { Result } from '../result';
import { ArticleSnapshotSchema } from './capture';

/** dispatch.start input — popup-generated UUID + payload (D-32). */
export const DispatchStartInputSchema = z.object({
  dispatchId: z.string().uuid(),
  send_to: z.string().url().max(2048),
  prompt: z.string().max(10_000),
  snapshot: ArticleSnapshotSchema,
});
export type DispatchStartInput = z.infer<typeof DispatchStartInputSchema>;
```

**State enum pattern** (lines 14-23):
```typescript
export const DispatchStateEnum = z.enum([
  'pending',
  'opening',
  'awaiting_complete',
  'awaiting_adapter',
  'done',
  'error',
  'cancelled',
]);
export type DispatchState = z.infer<typeof DispatchStateEnum>;
```

**Protocol export pattern** (lines 42-50):
```typescript
export interface ProtocolDispatch {
  'dispatch.start'(input: DispatchStartInput): Promise<Result<DispatchStartOutput>>;
  'dispatch.cancel'(input: DispatchCancelInput): Promise<Result<DispatchCancelOutput>>;
}

export const dispatchSchemas = {
  'dispatch.start': { input: DispatchStartInputSchema, output: DispatchStartOutputSchema },
  'dispatch.cancel': { input: DispatchCancelInputSchema, output: DispatchCancelOutputSchema },
} as const;
```

**Apply:** Add optional one-shot selector confirmation schema here. If adding a warning/confirmation-needed state, extend `DispatchStateEnum` and tests together.

---

### `shared/messaging/index.ts` (barrel config, transform)

**Analog:** `shared/messaging/index.ts`

**Dispatch route exports pattern** (lines 6-21):
```typescript
// Phase 3 route exports — dispatch
export type {
  DispatchStartInput,
  DispatchStartOutput,
  DispatchCancelInput,
  DispatchCancelOutput,
  DispatchState,
  ProtocolDispatch,
} from './routes/dispatch';
export {
  DispatchStartInputSchema,
  DispatchStartOutputSchema,
  DispatchCancelInputSchema,
  DispatchCancelOutputSchema,
  DispatchStateEnum,
} from './routes/dispatch';
```

**Apply:** If new dispatch warning/confirmation types are exported from `routes/dispatch.ts`, add them in the same grouped dispatch export block.

---

### `shared/storage/repos/dispatch.ts` (repository / model, CRUD)

**Analog:** `shared/storage/repos/dispatch.ts`

**Imports pattern** (lines 13-15):
```typescript
import { activeDispatchPointerItem } from '@/shared/storage/items';
import type { ArticleSnapshot, ErrorCode, DispatchState } from '@/shared/messaging';
import type { PlatformId } from '@/shared/adapters/types';
```

**Record schema pattern** (lines 17-30):
```typescript
/** D-31 state machine record. */
export interface DispatchRecord {
  schemaVersion: 1;
  dispatchId: string;
  state: DispatchState;
  target_tab_id: number | null;
  send_to: string;
  prompt: string;
  snapshot: ArticleSnapshot;
  platform_id: PlatformId;
  started_at: string;
  last_state_at: string;
  error?: { code: ErrorCode; message: string; retriable: boolean };
}
```

**Session storage CRUD pattern** (lines 32-72):
```typescript
const PREFIX = 'dispatch:';
const recordKey = (id: string): string => `${PREFIX}${id}`;

export async function set(record: DispatchRecord): Promise<void> {
  await chrome.storage.session.set({ [recordKey(record.dispatchId)]: record });
}

export async function get(dispatchId: string): Promise<DispatchRecord | undefined> {
  const k = recordKey(dispatchId);
  const all = await chrome.storage.session.get(k);
  return all[k] as DispatchRecord | undefined;
}

export async function clearActive(): Promise<void> {
  await activeDispatchPointerItem.setValue(null);
}
```

**Apply:** Add optional warning/confirmation-needed fields backward-compatibly. Session storage has no durable migration; keep per-dispatch-key write pattern.

---

### `background/dispatch-pipeline.ts` (service, event-driven request-response)

**Analog:** `background/dispatch-pipeline.ts`

**Imports pattern** (lines 35-48):
```typescript
import { Ok, Err, isErrorCode, type Result, type ErrorCode } from '@/shared/messaging';
import type {
  DispatchStartInput,
  DispatchStartOutput,
  DispatchCancelInput,
  DispatchCancelOutput,
} from '@/shared/messaging';
import { findAdapter } from '@/shared/adapters/registry';
import type { AdapterRegistryEntry } from '@/shared/adapters/types';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import * as historyRepo from '@/shared/storage/repos/history';
import * as bindingRepo from '@/shared/storage/repos/binding';
import * as draftRepo from '@/shared/storage/repos/popupDraft';
import type { DispatchRecord } from '@/shared/storage/repos/dispatch';
```

**Start/idempotency/platform detection pattern** (lines 119-132):
```typescript
export async function startDispatch(
  input: DispatchStartInput,
): Promise<Result<DispatchStartOutput>> {
  // Step 1: D-32 idempotency check — same dispatchId returns current state.
  const existing = await dispatchRepo.get(input.dispatchId);
  if (existing) {
    return Ok({ dispatchId: existing.dispatchId, state: existing.state });
  }

  // Step 2: D-24 platform detection. No adapter -> PLATFORM_UNSUPPORTED.
  const adapter = findAdapter(input.send_to);
  if (!adapter) {
    return Err('PLATFORM_UNSUPPORTED', input.send_to, false);
  }
```

**Alarm timeout pattern to replace with registry-derived value** (lines 57-60, 197-200):
```typescript
export const BADGE_OK_CLEAR_MINUTES = 0.5;
export const DISPATCH_TIMEOUT_MINUTES = 0.5;

await chrome.alarms.create(`${ALARM_PREFIX_TIMEOUT}${input.dispatchId}`, {
  delayInMinutes: DISPATCH_TIMEOUT_MINUTES,
});
```

**Adapter injection + response pattern** (lines 228-260):
```typescript
try {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [scriptFile],
    world: 'ISOLATED',
  });
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Cannot access|manifest must request permission/i.test(msg)) {
    await failDispatch(updated, 'INPUT_NOT_FOUND', msg, false);
  } else {
    await failDispatch(updated, 'EXECUTE_SCRIPT_FAILED', msg, true);
  }
  return;
}

let response: { ok: boolean; code?: string; message?: string; retriable?: boolean };
try {
  response = await chrome.tabs.sendMessage(tabId, {
    type: 'ADAPTER_DISPATCH',
    payload: {
      dispatchId: updated.dispatchId,
      send_to: updated.send_to,
      prompt: updated.prompt,
      snapshot: updated.snapshot,
    },
  });
```

**Error persistence pattern** (lines 348-364):
```typescript
async function failDispatch(
  record: DispatchRecord,
  code: ErrorCode,
  message: string,
  retriable: boolean,
): Promise<void> {
  const failed: DispatchRecord = {
    ...record,
    state: 'error',
    last_state_at: new Date().toISOString(),
    error: { code, message, retriable },
  };
  await dispatchRepo.set(failed);
  await chrome.action.setBadgeText({ text: 'err' });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.err });
  await chrome.alarms.clear(`${ALARM_PREFIX_TIMEOUT}${failed.dispatchId}`);
}
```

**Listener-safe event pattern** (lines 415-432):
```typescript
export async function onTabComplete(
  tabId: number,
  changeInfo: chrome.tabs.OnUpdatedInfo,
  _tab: chrome.tabs.Tab,
): Promise<void> {
  if (changeInfo.status !== 'complete') return;
  await advanceDispatchForTab(tabId);
}

export function onSpaHistoryStateUpdated(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails,
): void {
  void advanceDispatchForTab(details.tabId);
}
```

**Apply:** Keep service worker top-level listener discipline. Replace hard-coded timeout with registry resolver. Replace `!adapter.match(actualUrl)` login remaps with one helper. Add adapter response timeout wrapper around only `chrome.tabs.sendMessage`. Add warning handling path before success/failure terminal handling.

---

### `entrypoints/discord.content.ts` (content adapter, event-driven request-response)

**Analog:** `entrypoints/discord.content.ts`

**Adapter message shape pattern** (lines 37-58):
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
  code?: 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'NOT_LOGGED_IN' | 'INTERNAL';
  message?: string;
  retriable?: boolean;
}
```

**One-shot listener guard pattern** (lines 190-210):
```typescript
export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    const guarded = globalThis as typeof globalThis & {
      __web2chat_discord_registered?: boolean;
    };
    if (guarded.__web2chat_discord_registered) return;
    guarded.__web2chat_discord_registered = true;

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true;
    });
  },
});
```

**Pre-send guard sequence pattern** (lines 215-308):
```typescript
if (isLoggedOutPath(window.location.pathname)) {
  return { ok: false, code: 'NOT_LOGGED_IN', message: 'Discord login required', retriable: true };
}

if (detectLoginWall()) {
  return {
    ok: false,
    code: 'NOT_LOGGED_IN',
    message: 'Discord login required (login UI detected)',
    retriable: true,
  };
}

const expectedChannelId = extractChannelId(payload.send_to);
if (!expectedChannelId) {
  return { ok: false, code: 'INPUT_NOT_FOUND', message: 'Invalid Discord channel URL', retriable: false };
}
```

**Compose/send confirmation pattern** (lines 310-351):
```typescript
const message = composeDiscordMarkdown({ prompt: payload.prompt, snapshot: payload.snapshot });

let pasteOk = false;
let pasteError = 'Paste injection timed out';
try {
  pasteOk = await injectMainWorldPaste(editor, message);
} catch (err) {
  pasteError = err instanceof Error ? err.message : String(err);
}
if (!pasteOk) {
  return { ok: false, code: 'TIMEOUT', message: pasteError, retriable: true };
}

let confirmed = (editor.textContent ?? '').trim().length === 0;
if (!confirmed) {
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  confirmed = (editor.textContent ?? '').trim().length === 0;
}
```

**Apply:** Insert low-confidence branch after ready/editor match and before `composeDiscordMarkdown` / `injectMainWorldPaste`. The first tier3 dispatch must return a warning and must not call MAIN world paste/send.

---

### `entrypoints/popup/App.tsx` (component / provider, event-driven request-response)

**Analog:** `entrypoints/popup/App.tsx`

**Signal state pattern** (lines 47-62):
```typescript
const snapshotSig = signal<ArticleSnapshot | null>(null);
const errorSig = signal<{ code: ErrorCode; message: string } | null>(null);

const titleSig = signal('');
const descriptionSig = signal('');
const contentSig = signal('');

const sendToSig = signal('');
const promptSig = signal('');
const promptDirtySig = signal(false);
const dispatchInFlightSig = signal<DispatchRecord | null>(null);
const dispatchErrorSig = signal<{ code: ErrorCode; message: string } | null>(null);
```

**Stored dispatch error mount pattern** (lines 120-135):
```typescript
const activeId = await dispatchRepo.getActive();
if (cancelled) return;
let wasInFlight = false;
if (activeId) {
  const rec = await dispatchRepo.get(activeId);
  if (cancelled) return;
  if (rec && rec.state === 'error') {
    // Last dispatch failed — show error banner above SendForm
    dispatchErrorSig.value = {
      code: (rec.error?.code as ErrorCode) ?? 'INTERNAL',
      message: rec.error?.message ?? '',
    };
  } else if (rec && rec.state !== 'done' && rec.state !== 'cancelled') {
    wasInFlight = true;
  }
}
```

**Storage change listener pattern** (lines 212-232):
```typescript
useEffect(() => {
  if (!activeDispatchId) return;
  const key = `dispatch:${activeDispatchId}`;
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area !== 'session') return;
    if (!(key in changes)) return;
    const rec = changes[key]?.newValue as DispatchRecord | undefined;
    if (!rec) return;
    if (rec.state === 'error') {
      dispatchInFlightSig.value = null;
      dispatchErrorSig.value = {
        code: (rec.error?.code as ErrorCode) ?? 'INTERNAL',
        message: rec.error?.message ?? '',
      };
    } else if (rec.state === 'done' || rec.state === 'cancelled') {
      dispatchInFlightSig.value = null;
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}, [activeDispatchId]);
```

**In-progress mutually exclusive rendering pattern** (lines 234-250):
```typescript
if (dispatchInFlight !== null) {
  return (
    <>
      <PopupChrome showSettings={showSettings} onToggleSettings={toggleSettings} />
      <InProgressView
        dispatchId={dispatchInFlight.dispatchId}
        onCancel={async () => {
          try {
            await sendMessage('dispatch.cancel', { dispatchId: dispatchInFlight.dispatchId });
          } finally {
            dispatchInFlightSig.value = null;
          }
        }}
      />
    </>
  );
}
```

**Apply:** Preserve `retriable` in `dispatchErrorSig`; add warning/confirmation signal or state branch. Warning prompt must be mutually exclusive with SendForm and InProgressView per UI spec.

---

### `entrypoints/popup/components/SendForm.tsx` (component, request-response)

**Analog:** `entrypoints/popup/components/SendForm.tsx`

**Imports pattern** (lines 15-30):
```typescript
import { useState, useEffect, useRef } from 'preact/hooks';
import { t } from '@/shared/i18n';
import { sendMessage } from '@/shared/messaging';
import type {
  ArticleSnapshot,
  ErrorCode,
  HistoryListOutput,
  DispatchStartInput,
} from '@/shared/messaging';
import { detectPlatformId, findAdapter, adapterRegistry } from '@/shared/adapters/registry';
import * as grantedOriginsRepo from '@/shared/storage/repos/grantedOrigins';
import * as draftRepo from '@/shared/storage/repos/popupDraft';
```

**Current payload construction pattern** (lines 191-207):
```typescript
async function handleConfirm() {
  if (submitting) return;
  setSubmitting(true);
  try {
    const dispatchId = crypto.randomUUID();
    const input: DispatchStartInput = {
      dispatchId,
      send_to: props.sendTo,
      prompt: props.prompt,
      snapshot: {
        ...props.snapshot,
        title: props.titleValue,
        description: props.descriptionValue,
        content: props.contentValue,
      },
    };
```

**Dynamic permission pattern** (lines 208-231):
```typescript
const adapter = findAdapter(props.sendTo);
if (adapter && adapter.requiresDynamicPermission === true) {
  const targetOrigin = new URL(props.sendTo).origin;
  const alreadyGranted = await chrome.permissions.contains({
    origins: [targetOrigin + '/*'],
  });

  if (!alreadyGranted) {
    await draftRepo.savePendingDispatch(input);
    const granted = await chrome.permissions.request({
      origins: [targetOrigin + '/*'],
    });
```

**Dispatch start + error callback pattern** (lines 233-245):
```typescript
props.onConfirm(dispatchId);
const res = await sendMessage('dispatch.start', input);
if (res.ok) {
  window.close();
} else {
  setSubmitting(false);
  props.onDispatchError(res.code, res.message);
}
```

**ErrorBanner slot pattern** (lines 269-279):
```typescript
{props.dispatchError && (
  <ErrorBanner
    code={props.dispatchError.code}
    onRetry={() => {
      props.onDismissError();
      void handleConfirm();
    }}
    onDismiss={props.onDismissError}
  />
)}
```

**Apply:** Extract reusable “build current dispatch input” path for Confirm, Retry, and low-confidence confirm. Add retriable propagation in callbacks. Retry must clear old active/error before creating a fresh dispatch. Confirmation flag must be one-shot and not persisted to draft/history.

---

### `entrypoints/popup/components/ErrorBanner.tsx` (component, request-response)

**Analog:** `entrypoints/popup/components/ErrorBanner.tsx`

**Imports and props pattern** (lines 1-8):
```typescript
import { t } from '@/shared/i18n';
import type { ErrorCode } from '@/shared/messaging';

interface ErrorBannerProps {
  code: ErrorCode;
  onRetry?: () => void;
  onDismiss: () => void;
}
```

**Current retry anti-pattern to replace** (lines 29-45):
```typescript
/** ErrorCodes whose human-readable `_retry` button MUST exist in i18n. */
const RETRIABLE_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'NOT_LOGGED_IN',
  'INPUT_NOT_FOUND',
  'TIMEOUT',
  'RATE_LIMITED',
  'EXECUTE_SCRIPT_FAILED',
  'INTERNAL',
  'OPENCLAW_OFFLINE',
  'OPENCLAW_PERMISSION_DENIED',
]);

export function ErrorBanner({ code, onRetry, onDismiss }: ErrorBannerProps) {
  const heading = errorHeading(code);
  const body = errorBody(code);
  const retryLabel = errorRetry(code);
  const showRetry = RETRIABLE_CODES.has(code) && !!onRetry && retryLabel !== '';
```

**Visual + a11y pattern** (lines 47-69):
```typescript
return (
  <div
    class="bg-transparent border-l-[3px] border-[var(--color-danger)] pl-3 py-2 rounded-r-[var(--radius-sharp)] flex items-start gap-2 hover:bg-[var(--color-danger-soft)] transition-colors duration-[var(--duration-instant)] [animation:w2c-margin-note-in_var(--duration-base)_var(--ease-quint)]"
    role="alert"
    aria-live="assertive"
    data-testid={`error-banner-${code}`}
  >
    <div class="flex-1">
      <h3 class="m-0 text-sm leading-snug font-semibold text-[var(--color-danger)]">{heading}</h3>
      <p class="mt-1 m-0 text-sm leading-normal font-normal text-[var(--color-ink-base)]">
        {body}
      </p>
      {showRetry && (
        <button
          type="button"
          class="mt-2 text-sm font-semibold text-[var(--color-danger)] hover:underline underline-offset-2"
```

**Typed i18n switch pattern** (lines 157-179):
```typescript
function errorRetry(code: ErrorCode): string {
  switch (code) {
    case 'NOT_LOGGED_IN':
      return t('error_code_NOT_LOGGED_IN_retry');
    case 'INPUT_NOT_FOUND':
      return t('error_code_INPUT_NOT_FOUND_retry');
    case 'TIMEOUT':
      return t('error_code_TIMEOUT_retry');
    case 'RATE_LIMITED':
      return t('error_code_RATE_LIMITED_retry');
    case 'EXECUTE_SCRIPT_FAILED':
      return t('error_code_EXECUTE_SCRIPT_FAILED_retry');
    case 'INTERNAL':
      return t('error_code_INTERNAL_retry');
    case 'OPENCLAW_OFFLINE':
      return t('error_code_OPENCLAW_OFFLINE_retry');
    case 'OPENCLAW_PERMISSION_DENIED':
      return t('error_code_OPENCLAW_PERMISSION_DENIED_retry');
    default:
      return '';
  }
}
```

**Apply:** Add `retriable: boolean` prop. `showRetry` should be `retriable && !!onRetry`; retry label can still come from code-specific switch with fallback key.

---

### `entrypoints/popup/components/SelectorWarningDialog.tsx` (new optional component, event-driven request-response)

**Analog:** `entrypoints/options/components/ConfirmDialog.tsx`

**Focus/a11y behavior pattern** (lines 25-63):
```typescript
export function ConfirmDialog(props: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        props.onCancel();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
```

**Dialog visual pattern** (lines 70-121):
```typescript
return (
  <div
    class="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50"
    onClick={(e) => {
      if (e.target === e.currentTarget) props.onCancel();
    }}
    data-testid="confirm-dialog-overlay"
  >
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-body"
      class="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 max-w-md w-full mx-4 flex flex-col gap-4 border border-[var(--color-border-strong)] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)] [animation:w2c-dialog-open_var(--duration-base)_var(--ease-quint)]"
      data-testid="confirm-dialog"
    >
```

**Apply:** Either reuse `ConfirmDialog` directly or create a popup-local wrapper. Use warning copy keys from UI spec. Confirm starts a new dispatch with one-shot selector confirmation. Cancel clears actionable warning and returns to SendForm without ErrorBanner.

---

### `locales/en.yml` and `locales/zh_CN.yml` (i18n config, transform)

**Analogs:** `locales/en.yml`, `locales/zh_CN.yml`

**Existing dispatch/error grouping pattern** (from `locales/en.yml` lines 78-95):
```yaml
# Group C — dispatch interactions
dispatch_confirm_label:
  message: 'Send'
dispatch_in_progress_heading:
  message: 'Sending…'
dispatch_in_progress_body_before:
  message: 'web2chat is opening the target tab. Click '
dispatch_in_progress_body_icon:
  message: 'Cancel'
dispatch_in_progress_body_after:
  message: ' to abort.'
```

**Error retry key pattern** (from `locales/en.yml` lines 97-114):
```yaml
error_code_NOT_LOGGED_IN_heading:
  message: 'Not logged in'
error_code_NOT_LOGGED_IN_body:
  message: 'Sign in to the target platform in your browser, then retry.'
error_code_NOT_LOGGED_IN_retry:
  message: 'Retry'
```

**Chinese matching key pattern** (from `locales/zh_CN.yml` lines 97-114):
```yaml
error_code_NOT_LOGGED_IN_heading:
  message: '未登录'
error_code_NOT_LOGGED_IN_body:
  message: '请先在浏览器中登录目标平台，然后重试。'
error_code_NOT_LOGGED_IN_retry:
  message: '重试'
```

**Apply:** Add the four UI-spec keys in both files with identical key coverage:
- `selector_low_confidence_heading`
- `selector_low_confidence_body`
- `selector_low_confidence_cancel`
- `selector_low_confidence_confirm`

If a generic retry fallback key is added, add it to both locales and ensure `test:i18n-coverage` passes.

---

### `tests/unit/dispatch/timeout-config.spec.ts` and `adapter-response-timeout.spec.ts` (tests, request-response)

**Analogs:** `tests/unit/dispatch/state-machine.spec.ts`, `tests/unit/dispatch/dispatch-timeout.spec.ts`

**Vitest + fakeBrowser setup pattern** (from `tests/unit/dispatch/state-machine.spec.ts` lines 11-21):
```typescript
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  startDispatch,
  cancelDispatch,
  onTabComplete,
  onAlarmFired,
  BADGE_COLORS,
  BADGE_OK_CLEAR_MINUTES,
  DISPATCH_TIMEOUT_MINUTES,
} from '@/background/dispatch-pipeline';
```

**Chrome stub pattern** (from `tests/unit/dispatch/state-machine.spec.ts` lines 48-76):
```typescript
function buildChromeStub(overrides: Record<string, unknown> = {}) {
  const tabsCreate = vi.fn().mockResolvedValue({ id: 42 });
  const tabsUpdate = vi.fn().mockResolvedValue({ id: 42 });
  const tabsQuery = vi.fn().mockResolvedValue([]);
  const tabsSendMessage = vi.fn().mockResolvedValue({ ok: true });
  const windowsUpdate = vi.fn().mockResolvedValue(undefined);
  const executeScript = vi.fn().mockResolvedValue([{ result: undefined }]);
  const setBadgeText = vi.fn().mockResolvedValue(undefined);
  const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);
  const alarmsCreate = vi.fn().mockResolvedValue(undefined);
  const alarmsClear = vi.fn().mockResolvedValue(true);
  return {
    tabs: {
      create: tabsCreate,
      update: tabsUpdate,
      query: tabsQuery,
      sendMessage: tabsSendMessage,
      onUpdated: { addListener: vi.fn() },
    },
```

**Existing timeout test to revise** (from `tests/unit/dispatch/dispatch-timeout.spec.ts` lines 14-26):
```typescript
describe('dispatch-pipeline SW discipline (CR-02: no setTimeout)', () => {
  it('contains no setTimeout calls in executable code', () => {
    const src = fs.readFileSync(pipelinePath, 'utf-8');
    const codeOnly = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeOnly).not.toContain('setTimeout');
  });

  it('does not export ADAPTER_RESPONSE_TIMEOUT_MS', () => {
    const src = fs.readFileSync(pipelinePath, 'utf-8');
    expect(src).not.toContain('ADAPTER_RESPONSE_TIMEOUT_MS');
  });
});
```

**Apply:** Replace the whole-file `setTimeout` ban with scoped assertions. New tests should assert: defaults are 30s/20s, `dispatchTimeoutMs < 30_000` fails, alarm delay comes from registry, adapter response timeout maps to `TIMEOUT` + `retriable: true`.

---

### `tests/unit/dispatch/logged-out-paths.spec.ts` / `login-detection.spec.ts` (tests, request-response)

**Analog:** `tests/unit/dispatch/login-detection.spec.ts`

**Current login remap fixture pattern** (lines 20-23):
```typescript
const DISCORD_CHANNEL_URL = 'https://discord.com/channels/123/456';
const DISCORD_LOGIN_URL = 'https://discord.com/login?redirect_to=%2Fchannels%2F123%2F456';
const DISCORD_ROOT_URL = 'https://discord.com/';
const OPENCLAW_URL = 'http://localhost:18789/chat?session=agent:test:s1';
```

**Dispatch record factory pattern** (lines 27-47):
```typescript
function makeRecord(overrides: Partial<DispatchRecord> = {}): DispatchRecord {
  return {
    schemaVersion: 1,
    dispatchId: 'test-dispatch-001',
    state: 'awaiting_complete',
    target_tab_id: TAB_ID,
    send_to: DISCORD_CHANNEL_URL,
    prompt: 'hello',
    snapshot: {
      title: 'Test',
      url: 'https://example.com',
      description: 'desc',
      create_at: '2026-05-05T00:00:00Z',
      content: 'body',
    },
    platform_id: definePlatformId('discord'),
```

**Current behavior to narrow** (lines 83-105):
```typescript
it('calls failDispatch with NOT_LOGGED_IN when tab URL is discord.com/login', async () => {
  const record = makeRecord();
  await dispatchRepo.set(record);

  (chrome.tabs.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: TAB_ID,
    url: DISCORD_LOGIN_URL,
  });

  await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

  const updated = await dispatchRepo.get(record.dispatchId);
  expect(updated?.state).toBe('error');
  expect(updated?.error?.code).toBe('NOT_LOGGED_IN');
```

**Apply:** Update tests to assert only configured `loggedOutPathPatterns` remap. Add negative cases: same host but non-matching non-logged-out path no longer remaps; unconfigured OpenClaw no URL-layer remap.

---

### `tests/unit/popup/retry-retriable.spec.tsx` (new test, event-driven request-response)

**Analog:** `tests/unit/options/select.spec.tsx`

**Preact render + act pattern** (lines 1-8, 19-27):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

vi.mock('@/shared/i18n', () => ({
  t: (key: string, ..._args: unknown[]) => key,
}));

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});
```

**Effect flush pattern** (lines 12-17):
```typescript
/** Drain the microtask/macrotask queue — Preact useEffect registration
 *  may need 2 ticks to complete after a state change that triggers a render. */
const flush = () =>
  new Promise<void>((r) => setTimeout(r, 0)).then(
    () => new Promise<void>((r) => setTimeout(r, 0)),
  );
```

**Interaction assertion pattern** (lines 63-80):
```typescript
it('mousedown on option calls onChange and closes dropdown', async () => {
  const { onChange } = await renderSelect();

  const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;
  button.click();
  await flush();

  const listbox = container.querySelector('[role="listbox"]');
  expect(listbox).toBeTruthy();

  const options = container.querySelectorAll('[role="option"]');
  const englishOption = options[1]!;
  englishOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  await flush();

  expect(onChange).toHaveBeenCalledWith('en');
```

**Apply:** Mock `sendMessage('dispatch.start')`, render `SendForm` or `App`, assert retry visible only when `retriable === true`, clicking retry clears error and calls dispatch with a new UUID and current field values.

---

### `tests/unit/adapters/discord-selector.spec.ts` / `tests/unit/dispatch/selector-warning.spec.ts` (tests, event-driven request-response)

**Analog:** `tests/unit/adapters/discord-selector.spec.ts`

**Fixture loading pattern** (lines 1-11):
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixtureHtml = readFileSync(
  resolve(__dirname, 'discord.fixture.html'),
  'utf-8',
);
const bodyMatch = fixtureHtml.match(/<body>([\s\S]*)<\/body>/);
const fixtureBody = bodyMatch?.[1]?.trim() ?? '';
```

**Tier assertions pattern** (lines 36-67):
```typescript
describe('Discord selector fallback (ADD-05, D-62)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixtureBody;
  });

  it('tier-1: finds editor via role=textbox + aria-label', () => {
    const editor = findEditor();
    expect(editor).not.toBeNull();
    expect(editor!.getAttribute('role')).toBe('textbox');
    expect(editor!.getAttribute('aria-label')).toContain('Message');
  });

  it('tier-2: falls back to data-slate-editor when aria-label removed', () => {
    const el = document.querySelector('[role="textbox"][aria-label*="Message"]')!;
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
```

**Paste event pattern** (lines 23-34, 89-99):
```typescript
function pasteText(editor: HTMLElement, text: string): void {
  editor.focus();
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }),
  );
}

it('ClipboardEvent paste dispatches and carries text/plain data', () => {
  const editor = findEditor()!;
  let received = '';
  editor.addEventListener('paste', (e: Event) => {
    const ce = e as ClipboardEvent;
    received = ce.clipboardData?.getData('text/plain') ?? '';
  });
```

**Apply:** Extend tier tests to assert tier metadata. Add no-send-before-confirm test by spying on MAIN-world paste/port call or extracted send helper. Confirmed second dispatch should bypass warning once and send normally.

## Shared Patterns

### Pure shared registry and helpers
**Source:** `shared/adapters/registry.ts` lines 22-24, 90-117
**Apply to:** `shared/adapters/types.ts`, `shared/adapters/registry.ts`, optional `shared/adapters/dispatch-policy.ts`
```typescript
 * CRITICAL: match() is a pure function — NO chrome.* calls. WXT inlines this module
 * into popup + SW + content-script bundles; chrome.* dependencies would break popup-side
 * bundling.

export function findAdapter(url: string): AdapterRegistryEntry | undefined {
  return adapterRegistry.find((a) => a.match(url));
}
```

### Service worker state and alarm discipline
**Source:** `background/dispatch-pipeline.ts` lines 149-200, 434-441
**Apply to:** `background/dispatch-pipeline.ts`, timeout helper tests
```typescript
const nowIso = new Date().toISOString();
let rec: DispatchRecord = {
  schemaVersion: 1,
  dispatchId: input.dispatchId,
  state: 'pending',
  target_tab_id: null,
  send_to: input.send_to,
  prompt: input.prompt,
  snapshot: input.snapshot,
  platform_id: adapter.id,
  started_at: nowIso,
  last_state_at: nowIso,
};
await dispatchRepo.set(rec);
await dispatchRepo.setActive(input.dispatchId);

await chrome.alarms.create(`${ALARM_PREFIX_TIMEOUT}${input.dispatchId}`, {
  delayInMinutes: DISPATCH_TIMEOUT_MINUTES,
});
```

### Result/error handling
**Source:** `shared/messaging/result.ts` lines 55-67; `background/dispatch-pipeline.ts` lines 348-364
**Apply to:** dispatch warning/error contract, retry UI
```typescript
export type Result<T, E extends ErrorCode = ErrorCode> =
  | { ok: true; data: T }
  | { ok: false; code: E; message: string; retriable: boolean };

const failed: DispatchRecord = {
  ...record,
  state: 'error',
  last_state_at: new Date().toISOString(),
  error: { code, message, retriable },
};
```

### Popup copy and XSS-safe error display
**Source:** `entrypoints/popup/components/ErrorBanner.tsx` lines 23-26, 99-179
**Apply to:** `ErrorBanner`, selector warning dialog, retry UI
```typescript
 * IMPORTANT — XSS/T-03-04-03 mitigation: this component does NOT render
 * `error.message` (raw exception text from SW). Only `t('error_code_<CODE>_*')`
 * i18n strings reach the DOM. error.message remains in storage.session for
 * SW-side diagnostics; users get a code-mapped human-readable copy.
```

### Dialog accessibility and focus trap
**Source:** `entrypoints/options/components/ConfirmDialog.tsx` lines 29-63, 70-121
**Apply to:** low-confidence selector confirmation prompt
```typescript
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    props.onCancel();
  }
  if (e.key === 'Tab' && dialogRef.current) {
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
```

### i18n key coverage
**Source:** `locales/en.yml` lines 78-95, `locales/zh_CN.yml` lines 78-95
**Apply to:** new selector warning and retry fallback keys
```yaml
dispatch_confirm_label:
  message: 'Send'
dispatch_in_progress_heading:
  message: 'Sending…'
dispatch_cancel_label:
  message: 'Cancel'
```

### Test stubbing pattern
**Source:** `tests/unit/dispatch/state-machine.spec.ts` lines 48-76; `tests/unit/options/select.spec.tsx` lines 12-27
**Apply to:** all Phase 9 unit tests
```typescript
function buildChromeStub(overrides: Record<string, unknown> = {}) {
  const tabsCreate = vi.fn().mockResolvedValue({ id: 42 });
  const tabsSendMessage = vi.fn().mockResolvedValue({ ok: true });
  const executeScript = vi.fn().mockResolvedValue([{ result: undefined }]);
  return {
    tabs: { create: tabsCreate, sendMessage: tabsSendMessage, onUpdated: { addListener: vi.fn() } },
    scripting: { executeScript },
    storage: fakeBrowser.storage,
    ...overrides,
  };
}
```

## No Analog Found

None. Every Phase 9 new or modified file has an existing same-role or close-role analog in the codebase.

## Metadata

**Analog search scope:** `shared/`, `background/`, `entrypoints/`, `tests/unit/`, `locales/`
**Files scanned:** 59 relevant source/test/locale files listed
**Project skills:** No `.claude/skills/` or `.agents/skills/` directory found in project; followed checked-in `CLAUDE.md`
**Pattern extraction date:** 2026-05-10
