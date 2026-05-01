# Phase 3: dispatch-popup - Pattern Map

**Mapped:** 2026-05-01
**Files analyzed:** 38 new + 10 modify = 48
**Analogs found:** 41 / 48 (7 greenfield with no analog)

> 下游 planner 必读：本文件给每个新增/修改文件指了"该抄哪段现有代码"。
> 引用代码片段直接出自 Phase 1+2 已落地的 `entrypoints/`、`background/`、`shared/`、`tests/` —
> planner 在 PLAN.md 的 Action 段落中应直接引用本文件的 file:line 范围。

---

## File Classification

### NEW FILES (38)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `background/dispatch-pipeline.ts` | service / state-machine | event-driven | `background/capture-pipeline.ts` | role-match (capture is request-response, dispatch is event-driven; same SW-side orchestration shape) |
| `background/adapter-registry.ts` | config / lookup-table | request-response (sync) | (none — greenfield) | no analog |
| `shared/messaging/routes/capture.ts` | route schema | request-response | `shared/messaging/protocol.ts` (lines 11-49) | exact (extract existing) |
| `shared/messaging/routes/dispatch.ts` | route schema | request-response | `shared/messaging/protocol.ts` (lines 11-49) | exact |
| `shared/messaging/routes/history.ts` | route schema | request-response | `shared/messaging/protocol.ts` (lines 11-49) | exact |
| `shared/messaging/routes/binding.ts` | route schema | request-response | `shared/messaging/protocol.ts` (lines 11-49) | exact |
| `shared/storage/repos/history.ts` | repo / business-logic | CRUD | `shared/storage/items.ts` + Phase 3 RESEARCH Pattern 6 | role-match |
| `shared/storage/repos/binding.ts` | repo / business-logic | CRUD | `shared/storage/items.ts` + Phase 3 RESEARCH Pattern 6 | role-match |
| `shared/storage/repos/popupDraft.ts` | repo / business-logic | CRUD | `shared/storage/items.ts` (debounced single-item write) | role-match |
| `shared/storage/repos/dispatch.ts` | repo / state-machine | CRUD | `shared/storage/items.ts` (per-key session writes) | role-match |
| `shared/adapters/types.ts` | type definitions | n/a | `shared/messaging/protocol.ts` (interface declaration shape) | role-match |
| `entrypoints/popup/components/SendForm.tsx` | component | form input | `entrypoints/popup/App.tsx` SuccessView (lines 123-203) | role-match |
| `entrypoints/popup/components/Combobox.tsx` | component | combobox | (none — greenfield ARIA combobox) | no analog (use RESEARCH Pattern 5) |
| `entrypoints/popup/components/PlatformIcon.tsx` | component | n/a | `entrypoints/popup/App.tsx` EmptyIcon/AlertIcon (lines 302-365) | exact (inline SVG icon convention) |
| `entrypoints/popup/components/InProgressView.tsx` | component | n/a | `entrypoints/popup/App.tsx` EmptyView (lines 207-247) | exact (centered status-card layout) |
| `entrypoints/popup/components/ErrorBanner.tsx` | component | n/a | `entrypoints/popup/App.tsx` ErrorView (lines 251-272) + UI-SPEC error banner spec | role-match |
| `entrypoints/popup/components/primitives.tsx` | component / utility | n/a | `entrypoints/popup/App.tsx` FieldLabel + textareaClass (lines 280-299) | exact (extracted from existing) |
| `entrypoints/options/index.html` | entrypoint HTML | n/a | `entrypoints/popup/index.html` | exact |
| `entrypoints/options/main.tsx` | entrypoint bootstrap | n/a | `entrypoints/popup/main.tsx` | exact |
| `entrypoints/options/App.tsx` | component | request-response | `entrypoints/popup/App.tsx` (top-level signal + RPC pattern) | role-match |
| `entrypoints/options/components/ResetSection.tsx` | component | request-response | `entrypoints/popup/App.tsx` SuccessView | role-match |
| `entrypoints/options/components/ConfirmDialog.tsx` | component | n/a | (none — greenfield modal dialog) | no analog |
| `entrypoints/options/style.css` | stylesheet | n/a | `entrypoints/popup/style.css` | exact |
| `entrypoints/mock-platform.content.ts` | content-script / stub | event-driven | `entrypoints/extractor.content.ts` | role-match (defineContentScript with `registration: 'runtime'`) |
| `tests/unit/dispatch/state-machine.spec.ts` | test | n/a | `tests/unit/messaging/capture.spec.ts` | role-match (mirror-function pattern + direct stubChrome) |
| `tests/unit/dispatch/platform-detector.spec.ts` | test | n/a | `tests/unit/messaging/protocol.spec.ts` (schemas table tests) | role-match |
| `tests/unit/repos/history.spec.ts` | test | n/a | `tests/unit/storage/items.spec.ts` | role-match (fakeBrowser.reset + getValue/setValue) |
| `tests/unit/repos/binding.spec.ts` | test | n/a | `tests/unit/storage/items.spec.ts` | role-match |
| `tests/unit/repos/popupDraft.spec.ts` | test | n/a | `tests/unit/storage/items.spec.ts` | role-match |
| `tests/unit/messaging/dispatch.spec.ts` | test | n/a | `tests/unit/messaging/capture.spec.ts` | exact (mirror pattern) |
| `tests/unit/messaging/errorCode.spec.ts` (extend) | test | n/a | `tests/unit/messaging/errorCode.spec.ts` (existing — add 5 codes) | exact |
| `tests/e2e/dispatch.spec.ts` | test | n/a | `tests/e2e/capture.spec.ts` + `popup-rpc.spec.ts` | role-match |
| `tests/e2e/draft-recovery.spec.ts` | test | n/a | `tests/e2e/capture.spec.ts` | role-match |
| `tests/e2e/options-reset.spec.ts` | test | n/a | `tests/e2e/popup-rpc.spec.ts` (extension page navigation) | role-match |
| `tests/e2e/fixtures/mock-platform.html` | test fixture HTML | n/a | `tests/e2e/fixtures/article.html` | role-match |
| `locales/en.yml` (extend) | i18n | n/a | `locales/en.yml` (existing) | exact |
| `locales/zh_CN.yml` (extend) | i18n | n/a | `locales/zh_CN.yml` (existing) | exact |
| `.planning/phases/03-dispatch-popup/03-DEVIATIONS.md` | docs | n/a | (none) | no analog |

### MODIFIED FILES (10)

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `entrypoints/background.ts` | service-worker entrypoint | event-driven | itself (lines 48-76) | exact (extend top-level listener block) |
| `entrypoints/popup/App.tsx` | component | request-response | itself (lines 43-82) — extend state machine | exact |
| `entrypoints/popup/main.tsx` | entrypoint bootstrap | n/a | itself (no change expected) | n/a |
| `shared/messaging/protocol.ts` | aggregator (was monolith) | n/a | itself (lines 26-50) — split routes out | exact |
| `shared/messaging/result.ts` | type union | n/a | itself (line 18) — extend `ErrorCode` | exact |
| `shared/messaging/index.ts` | barrel | n/a | itself (lines 1-4) — extend re-exports | exact |
| `shared/storage/items.ts` | repo definitions | CRUD | itself (lines 14-18) — add 5 items | exact |
| `shared/storage/index.ts` | barrel | n/a | itself (lines 1-3) — extend | exact |
| `scripts/verify-manifest.ts` | build-time check | n/a | itself (lines 45-53) — add 2 assertions | exact |
| `wxt.config.ts` | manifest generator | n/a | itself (lines 28-37) — add `commands` field | exact |

---

## Pattern Assignments

### `entrypoints/background.ts` (MODIFY — service-worker entrypoint, event-driven)

**Analog:** itself (Phase 1+2 already establishes the contract).

**Imports pattern** (`entrypoints/background.ts:1-4`):
```ts
import { defineBackground } from '#imports';
import { onMessage, schemas, Ok, Err, type Result } from '@/shared/messaging';
import { metaItem } from '@/shared/storage';
import { runCapturePipeline } from '@/background/capture-pipeline';
```

**SW top-level listener block** (`entrypoints/background.ts:48-76`):
```ts
export default defineBackground(() => {
  // ────────────────────────────────────────────────────────────────────────
  // TOP-LEVEL LISTENER REGISTRATION (sync, no await before this point)
  // ────────────────────────────────────────────────────────────────────────

  onMessage(
    'meta.bumpHello',
    wrapHandler(async () => {
      schemas['meta.bumpHello'].input.parse(undefined);
      const current = await metaItem.getValue();
      const next = { schemaVersion: 1 as const, helloCount: current.helloCount + 1 };
      await metaItem.setValue(next);
      const validated = schemas['meta.bumpHello'].output.parse(next);
      return Ok(validated);
    }),
  );

  onMessage('capture.run', wrapHandler(runCapturePipeline));

  // Future phases register additional listeners here at top level
  // (chrome.runtime.onInstalled, chrome.tabs.onUpdated, chrome.alarms.onAlarm, etc.).
});
```

**`wrapHandler` shape** (`entrypoints/background.ts:36-46`) — **DO NOT REFACTOR**:
```ts
function wrapHandler<T>(fn: () => Promise<Result<T>>): () => Promise<Result<T>> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[bg] handler threw — converting to Err(INTERNAL):', err);
      return Err('INTERNAL', message, false);
    }
  };
}
```

**Phase 3 extension contract:** add 6 `onMessage(...)` + 2 `chrome.*.addListener(...)` lines inside the same `defineBackground(() => { ... })` closure, all SYNCHRONOUSLY (FND-02). Order in file:
1. Phase 1: `meta.bumpHello`
2. Phase 2: `capture.run`
3. Phase 3 dispatch RPCs: `dispatch.start`, `dispatch.cancel`
4. Phase 3 history/binding RPCs: `history.list`, `history.delete`, `binding.upsert`, `binding.get`
5. Phase 3 wake-up listeners: `chrome.tabs.onUpdated.addListener(onTabComplete)`, `chrome.alarms.onAlarm.addListener(onAlarmFired)`

**Critical anti-pattern to avoid:** never put `await` between `defineBackground(() => {` and any listener registration. The capture-pipeline call inside the handler is async, but the `onMessage(..., wrapHandler(runCapturePipeline))` registration itself is synchronous.

---

### `background/dispatch-pipeline.ts` (NEW — service / state-machine, event-driven)

**Analog:** `background/capture-pipeline.ts` (entire file, 124 lines).

**Imports pattern** (`background/capture-pipeline.ts:24-26`):
```ts
import { z } from 'zod';
import { Ok, Err, type Result, ArticleSnapshotSchema } from '@/shared/messaging';
import type { ArticleSnapshot } from '@/shared/messaging';
```

Phase 3 `dispatch-pipeline.ts` adds:
```ts
import { adapterRegistry } from './adapter-registry';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import * as historyRepo from '@/shared/storage/repos/history';
import * as bindingRepo from '@/shared/storage/repos/binding';
import { popupDraftItem } from '@/shared/storage/items';
```

**File-header docblock pattern** (`background/capture-pipeline.ts:1-22`) — copy structure verbatim:
```ts
/**
 * Capture pipeline — SW-side orchestration (CAP-01..CAP-04, D-15..D-17).
 *
 * Invoked by entrypoints/background.ts via the onMessage('capture.run') handler.
 * Never call chrome.scripting.executeScript from popup — only SW has the
 * scripting permission (CLAUDE.md §架构).
 *
 * Pipeline sequence (D-16, D-17, CAP-04):
 *   1. ...
 *   N. ...
 *
 * Step N calls XYZ.safeParse() to validate ... before returning Ok ...
 */
```

Phase 3 dispatch-pipeline header should mirror this format with: `D-23..D-34` IDs, the 8-step state-machine sequence (popup confirm → idempotency check → adapter resolve → opening → awaiting_complete → awaiting_adapter → done|error|cancelled), and SW-restart resilience note.

**Core pipeline pattern** (`background/capture-pipeline.ts:40-124`) — the function returns `Promise<Result<T>>`, uses guard clauses with early `return Err(...)`, never throws across the boundary:
```ts
export async function runCapturePipeline(): Promise<Result<ArticleSnapshot>> {
  // Step 1: ...
  const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
  if (win.id === undefined) {
    return Err('INTERNAL', 'No focused normal window', false);
  }
  // ...
  // Step 4: Inject extractor
  let results: chrome.scripting.InjectionResult[];
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-scripts/extractor.js'],
      world: 'ISOLATED',
    });
  } catch (err) {
    return Err('EXECUTE_SCRIPT_FAILED', String(err), true);
  }
  // ...
  return Ok(parseResult.data);
}
```

**ExecuteScript error mapping** (`background/capture-pipeline.ts:74-82`) — Phase 3 dispatch-pipeline uses the same try/catch wrapper, but extends the regex-based error classification per RESEARCH Pitfall 3:
```ts
try {
  await chrome.scripting.executeScript({ target: { tabId }, files: [adapter.scriptFile] });
} catch (err) {
  const msg = String(err);
  if (/Cannot access|manifest must request permission/.test(msg)) {
    return Err('INPUT_NOT_FOUND', msg, false);
  }
  return Err('EXECUTE_SCRIPT_FAILED', msg, true);
}
```

**Exported listener functions:** `dispatch-pipeline.ts` MUST export plain functions `startDispatch`, `cancelDispatch`, `onTabComplete`, `onAlarmFired` so `entrypoints/background.ts` can reference them at top level (mirrors how `runCapturePipeline` is imported and registered).

---

### `background/adapter-registry.ts` (NEW — config / lookup-table)

**Analog:** none (greenfield). Use RESEARCH.md Pattern 1 + CONTEXT.md D-24 + `<specifics>` IMAdapter sketch as the spec; Phase 1 D-07 protocol-style `as const` array gives the closest stylistic precedent.

**Style precedent — `as const` lookup table** (`shared/messaging/protocol.ts:38-50`):
```ts
export const schemas = {
  'meta.bumpHello': {
    input: z.void(),
    output: z.object({ ... }),
  },
  'capture.run': { input: z.void(), output: ArticleSnapshotSchema },
} as const;
```

Phase 3 adapter-registry uses the same `as const` discipline + `find()` lookup:
```ts
import type { AdapterRegistryEntry } from '@/shared/adapters/types';

export const adapterRegistry: readonly AdapterRegistryEntry[] = [
  {
    id: 'mock',
    match: (url) => url.startsWith('http://localhost:4321/mock-platform.html'),
    scriptFile: 'content-scripts/mock-platform.js',
    hostMatches: ['http://localhost/*'],
    iconKey: 'platform_icon_mock',
  },
  // Phase 4 will append { id: 'openclaw', ... }
  // Phase 5 will append { id: 'discord', ... }
] as const;

export function findAdapter(url: string): AdapterRegistryEntry | undefined {
  return adapterRegistry.find((a) => a.match(url));
}
```

**Critical:** `match()` MUST be a pure function with no chrome.* dependency (popup also calls it for icon display). Test pattern at `tests/unit/dispatch/platform-detector.spec.ts` verifies positive + negative cases per registered adapter.

---

### `shared/messaging/routes/{capture,dispatch,history,binding}.ts` (NEW — route schemas)

**Analog:** `shared/messaging/protocol.ts` lines 11-49 (full route definition pattern).

**Imports pattern** (`shared/messaging/protocol.ts:1-4`):
```ts
import { defineExtensionMessaging } from '@webext-core/messaging';
import { z } from 'zod';
import type { MetaSchema } from '@/shared/storage';
import type { Result } from './result';
```

For per-route files, drop `defineExtensionMessaging` (only `protocol.ts` aggregator calls it):
```ts
// shared/messaging/routes/dispatch.ts
import { z } from 'zod';
import type { Result } from '../result';
import { ArticleSnapshotSchema } from '../protocol'; // or move to a shared types module
```

**Schema declaration pattern** (`shared/messaging/protocol.ts:11-19`):
```ts
export const ArticleSnapshotSchema = z.object({
  title: z.string().max(500),
  url: z.string().url().max(2048),
  description: z.string().max(2000),
  create_at: z.string().datetime(),
  content: z.string().max(200_000),
});

export type ArticleSnapshot = z.infer<typeof ArticleSnapshotSchema>;
```

**ProtocolMap interface entry pattern** (`shared/messaging/protocol.ts:28-31`):
```ts
export interface ProtocolMap {
  'meta.bumpHello'(): Promise<Result<MetaSchema>>;
  'capture.run'(): Promise<Result<ArticleSnapshot>>;
  // Phase 3 routes flow in here from each routes/*.ts file
}
```

**Aggregator pattern (`protocol.ts` after split):**
```ts
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { ProtocolCapture } from './routes/capture';
import type { ProtocolDispatch } from './routes/dispatch';
import type { ProtocolHistory } from './routes/history';
import type { ProtocolBinding } from './routes/binding';
import { schemas as captureSchemas } from './routes/capture';
import { schemas as dispatchSchemas } from './routes/dispatch';
// ...

export type ProtocolMap = ProtocolMeta & ProtocolCapture & ProtocolDispatch
                       & ProtocolHistory & ProtocolBinding;

export const schemas = {
  ...metaSchemas,
  ...captureSchemas,
  ...dispatchSchemas,
  ...historySchemas,
  ...bindingSchemas,
} as const;

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
```

Each `routes/<name>.ts` exports its slice of `ProtocolMap` (as a type) plus a `schemas` constant matching the route names it owns.

---

### `shared/messaging/result.ts` (MODIFY — type union)

**Analog:** itself.

**Current union** (`shared/messaging/result.ts:18-22`):
```ts
export type ErrorCode =
  | 'INTERNAL'
  | 'RESTRICTED_URL'          // URL scheme ∉ {http,https}，retriable=false
  | 'EXTRACTION_EMPTY'        // Readability 返回空，popup 渲染 empty 三态，retriable=false
  | 'EXECUTE_SCRIPT_FAILED';  // chrome.scripting.executeScript 抛错，retriable=true
```

**Phase 3 extension** — append 5 codes inline; preserve the trailing-comment pattern (`// <retriable note>`):
```ts
export type ErrorCode =
  | 'INTERNAL'
  | 'RESTRICTED_URL'
  | 'EXTRACTION_EMPTY'
  | 'EXECUTE_SCRIPT_FAILED'
  | 'NOT_LOGGED_IN'           // adapter probe: 登录墙拦截，retriable=true
  | 'INPUT_NOT_FOUND'         // adapter compose: DOM 未就绪 / host 未授权，retriable=true
  | 'TIMEOUT'                 // dispatch 30s alarm 兜底，retriable=true
  | 'RATE_LIMITED'            // adapter send: 服务端 throttle，retriable=true
  | 'PLATFORM_UNSUPPORTED';   // adapter-registry.match() 全失，retriable=false
```

**File-header docblock** (`shared/messaging/result.ts:1-13`) already lists Phase 3 codes — verify the comment matches the type after edit.

**Helper functions** (`shared/messaging/result.ts:28-36`) — DO NOT touch:
```ts
export const Ok = <T>(data: T): Result<T, never> => ({ ok: true, data });

export function Err<E extends ErrorCode = ErrorCode>(
  code: E,
  message: string,
  retriable = false,
): Result<never, E> {
  return { ok: false, code, message, retriable };
}
```

---

### `shared/storage/items.ts` (MODIFY — repo definitions, CRUD)

**Analog:** itself.

**defineItem pattern** (`shared/storage/items.ts:14-18`):
```ts
export const metaItem = storage.defineItem<MetaSchema>('local:meta', {
  fallback: META_DEFAULT,
  version: CURRENT_SCHEMA_VERSION,
  migrations,
});
```

**Phase 3 new items** — copy this exact shape 5 times. Naming convention:
- `local:sendToHistory`, `local:promptHistory`, `local:bindings`, `local:popupDraft` (storage.local)
- `session:dispatchActive` (storage.session) + per-record keys via repo, NOT defineItem

**Per-record session writes pattern** (NOT a defineItem) — RESEARCH.md Pattern 2 enforces `dispatch:<id>` per-key writes (no big collection object). Implement in `shared/storage/repos/dispatch.ts`:
```ts
const dispatchKey = (id: string) => `dispatch:${id}`;

export async function set(record: DispatchRecord): Promise<void> {
  await chrome.storage.session.set({ [dispatchKey(record.dispatchId)]: record });
}

export async function get(id: string): Promise<DispatchRecord | undefined> {
  const all = await chrome.storage.session.get(dispatchKey(id));
  return all[dispatchKey(id)] as DispatchRecord | undefined;
}
```

**Schema interface pattern** (`shared/storage/items.ts:4-12`):
```ts
export interface MetaSchema {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  helloCount: number;
}

export const META_DEFAULT: MetaSchema = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  helloCount: 0,
};
```

Phase 3 adds `HistoryEntry`, `BindingEntry`, `PopupDraft` (per `<specifics>` shapes); each gets a typed `defineItem` with `fallback` + `version: CURRENT_SCHEMA_VERSION`.

**Important:** Phase 3 does NOT bump `CURRENT_SCHEMA_VERSION` (still 1). New items at version 1 with their own fallback work fine — only when modifying *existing* schema bump version.

---

### `shared/storage/repos/{history,binding,popupDraft,dispatch}.ts` (NEW — repo / business-logic, CRUD)

**Analog:** `shared/storage/items.ts` for defineItem usage; RESEARCH.md Pattern 6 for the business-method layer shape.

**Imports pattern** (mirror `shared/storage/items.ts:1-2` style):
```ts
// shared/storage/repos/history.ts
import { sendToHistoryItem } from '@/shared/storage/items';
import type { HistoryEntry } from '@/shared/storage/items';
```

**Pure-function business logic pattern** (RESEARCH.md Pattern 6, `shared/storage/repos/history.ts` skeleton):
```ts
const TAU_MS = 7 * 24 * 3600 * 1000;     // 7 days (D-29)
const FREQ_WEIGHT = 0.3;
const CAP = 50;
const TOP_N = 8;

export function score(entry: HistoryEntry, now: number): number {
  const age = now - new Date(entry.last_used_at).getTime();
  return Math.exp(-age / TAU_MS) + FREQ_WEIGHT * Math.log(entry.use_count + 1);
}

export async function add(value: string): Promise<void> {
  const all = await sendToHistoryItem.getValue();
  const idx = all.findIndex((e) => e.value === value);
  const now = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = { ...all[idx], last_used_at: now, use_count: all[idx].use_count + 1 };
  } else {
    all.push({ value, last_used_at: now, use_count: 1 });
  }
  if (all.length > CAP) {
    const nowMs = Date.now();
    all.sort((a, b) => score(b, nowMs) - score(a, nowMs));
    all.length = CAP;
  }
  await sendToHistoryItem.setValue(all);
}

export async function topN(): Promise<HistoryEntry[]> { /* ... */ }
export async function remove(value: string): Promise<void> { /* ... */ }
export async function resetAll(): Promise<void> {
  await sendToHistoryItem.setValue([]);
}
```

**Critical:** `popup` and `SW` both go through the repo — never call `chrome.storage.local.set` directly (CLAUDE.md "约定 §storage 写入唯一通过 typed repo").

---

### `entrypoints/popup/App.tsx` (MODIFY — component, request-response)

**Analog:** itself.

**Module-level signal pattern** (`entrypoints/popup/App.tsx:31-39`):
```ts
import { signal } from '@preact/signals';
import { sendMessage } from '@/shared/messaging';
import type { ArticleSnapshot, ErrorCode } from '@/shared/messaging';
import { t } from '@/shared/i18n';

const snapshotSig = signal<ArticleSnapshot | null>(null);
const errorSig = signal<{ code: ErrorCode; message: string } | null>(null);
const titleSig = signal('');
const descriptionSig = signal('');
const contentSig = signal('');
```

Phase 3 adds in the same module-level block:
```ts
const sendToSig = signal('');
const promptSig = signal('');
const dispatchInFlightSig = signal<DispatchRecord | null>(null);
const dispatchErrorSig = signal<{ code: ErrorCode; message: string } | null>(null);
const platformIdSig = signal<string | null>(null); // for icon display
```

**Mount-trigger pattern with `cancelled` flag** (`entrypoints/popup/App.tsx:43-70`) — copy verbatim, extend with parallel reads:
```ts
export function App() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await sendMessage('capture.run'); // D-15: auto-trigger on mount
        if (cancelled) return;
        if (result.ok) {
          snapshotSig.value = result.data;
          titleSig.value = result.data.title;
          descriptionSig.value = result.data.description;
          contentSig.value = result.data.content;
        } else {
          errorSig.value = { code: result.code, message: result.message };
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        errorSig.value = { code: 'INTERNAL', message };
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
```

**Phase 3 mount sequence** (UI-SPEC §6 "Popup mount logic order"):
1. Read `chrome.storage.session.get('dispatch:active')` first → if in-flight, render `InProgressView` and SKIP capture.run
2. Otherwise, parallel: `capture.run` RPC + `popupDraftItem.getValue()` + `last_dispatch_error` read
3. Clear err badge: `chrome.action.setBadgeText({ text: '' })`
4. Render SendForm + capture preview

The `cancelled` flag pattern (lines 45, 50, 62, 67-69) MUST be preserved across all parallel awaits (PATTERNS §Pattern 2 from Phase 1).

**State dispatch order** (`entrypoints/popup/App.tsx:72-82`) — Phase 3 extends with InProgress branch:
```ts
const snapshot = snapshotSig.value;
const error = errorSig.value;
const dispatchInFlight = dispatchInFlightSig.value;

if (dispatchInFlight !== null) return <InProgressView record={dispatchInFlight} />;
if (snapshot === null && error === null) return <LoadingSkeleton />;
if (snapshot !== null) return <SendFormView snapshot={snapshot} />;
if (error?.code === 'RESTRICTED_URL' || error?.code === 'EXTRACTION_EMPTY') {
  return <EmptyView code={error.code} />;
}
return <ErrorView />;
```

---

### `entrypoints/popup/components/PlatformIcon.tsx` (NEW — component, icon)

**Analog:** `entrypoints/popup/App.tsx` EmptyIcon (lines 302-322) + AlertIcon (lines 345-365).

**Inline-SVG icon pattern** (`entrypoints/popup/App.tsx:302-322`):
```tsx
function EmptyIcon({ variant }: { variant: 'restricted' | 'noContent' }) {
  if (variant === 'restricted') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-slate-500 dark:text-slate-400"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  // ...
}
```

**Phase 3 PlatformIcon contract** (UI-SPEC §Iconography):
- Default 24×24 for chrome usage; pass `size={16}` for combobox option usage
- `class="text-slate-500"` for unsupported / generic globe
- `class="text-sky-600"` reserved for accent (NOT default — only the spinner uses sky)
- Preact attribute names: `stroke-width` (not `strokeWidth`), `class` (not `className`), `for` (not `htmlFor`)
- All icons MUST be inline `<svg>` (no `<img>` external) so `currentColor` flows through dark-mode

**Iconography table** (UI-SPEC.md lines 491-499):
| Icon | Use | Source |
|------|-----|--------|
| Generic globe | unsupported | Lucide `globe` |
| Mock platform | mock-platform stub | Lucide `flask-conical` |
| OpenClaw | placeholder | inline SVG with "Oc" letterform |
| Discord | placeholder | inline SVG with "D" letterform |

---

### `entrypoints/popup/components/Combobox.tsx` (NEW — component, ARIA combobox)

**Analog:** none in codebase. Use RESEARCH.md Pattern 5 (lines 539-619) + UI-SPEC.md §Component States §Combobox (lines 404-444) verbatim.

**ARIA attribute set** (RESEARCH.md Pattern 5 + UI-SPEC §Combobox §ARIA):
```tsx
// input attributes
role="combobox"
aria-expanded={listOpen}
aria-controls={`${id}-listbox`}
aria-autocomplete="list"
aria-activedescendant={activeIdx >= 0 ? `${id}-listbox-opt-${activeIdx}` : undefined}

// listbox (<ul>)
role="listbox"
aria-label={fieldLabel}

// option (<li>)
role="option"
aria-selected={i === activeIdx}
id={`${id}-listbox-opt-${i}`}
```

**Reuse from existing popup primitives** — Combobox input MUST inherit the same focus-ring style as `textareaClass` (`entrypoints/popup/App.tsx:288-299`):
```ts
const inputClass = [
  'w-full px-3 py-2 rounded-md',
  'text-sm leading-normal font-normal',
  'text-slate-900 dark:text-slate-100',
  'bg-white dark:bg-slate-900',
  'border border-slate-200 dark:border-slate-700',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-400',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
  'focus-visible:border-sky-600 dark:focus-visible:border-sky-400',
].join(' ');
```

**Keyboard contract** (UI-SPEC.md §Combobox §Keyboard contract, lines 433-438):
- ↑/↓ cycle activeIdx (-1 → 0 → ... → length-1 → -1)
- Enter selects active option, fills input, closes listbox
- Esc closes listbox, keeps current input value
- Tab closes listbox (do NOT preventDefault — native focus cycle)

**Listbox option layout** (UI-SPEC.md §Combobox lines 419-431):
- 36px height (`min-h-9`) — only justified deviation from {4,8,16,24,32} spacing scale
- 16×16 PlatformIcon + truncated text + delete button (16×16)
- Hover bg `slate-100`; active descendant bg `sky-50` + `border-l-2 border-sky-600`

---

### `entrypoints/popup/components/InProgressView.tsx` (NEW — component, status display)

**Analog:** `entrypoints/popup/App.tsx` EmptyView (lines 207-247).

**Centered status-card layout pattern** (`entrypoints/popup/App.tsx:229-247`):
```tsx
return (
  <main
    class="flex flex-col items-center text-center p-4 py-8 gap-2 min-w-[360px] min-h-[240px] font-sans"
    role="status"
    aria-live="polite"
    data-testid="capture-empty"
  >
    <EmptyIcon variant={variant} />
    <h2 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
      {heading}
    </h2>
    <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
      {before}
      <span class="text-sky-600 dark:text-sky-400">{icon}</span>
      {after}
    </p>
  </main>
);
```

**Phase 3 InProgressView differences** (UI-SPEC §Component States §In-progress placeholder, lines 467-476):
- `gap-4` instead of `gap-2` (Phase 3 strict spacing scale)
- Spinner icon: `animate-spin` Tailwind class on Lucide loader-2 SVG
- Heading text: `t('dispatch_in_progress_heading')` ("Sending…" / "正在投递…")
- Body uses three-segment i18n inline accent on "Cancel"
- Outline destructive Cancel button: `border border-red-600 text-red-600 hover:bg-red-50 px-4 py-2 rounded-md`
- dispatchId footer: `text-xs leading-snug font-mono text-slate-400`, click-to-copy

**Three-segment i18n inline accent pattern** (`entrypoints/popup/App.tsx:217-227, 240-244`) — copy this anti-XSS technique verbatim:
```tsx
const before = t('dispatch_in_progress_body_before');
const icon   = t('dispatch_in_progress_body_icon');
const after  = t('dispatch_in_progress_body_after');
// ...
<p class="...">
  {before}
  <span class="text-sky-600 dark:text-sky-400">{icon}</span>
  {after}
</p>
```

NEVER embed user URL in i18n placeholder — three-key split goes in YAML, JSX composes (PITFALLS §11).

---

### `entrypoints/popup/components/ErrorBanner.tsx` (NEW — component, status display)

**Analog:** `entrypoints/popup/App.tsx` ErrorView (lines 251-272).

**Error card pattern** (`entrypoints/popup/App.tsx:251-272`):
```tsx
return (
  <main
    class="flex flex-col items-center text-center p-4 py-8 gap-2 min-w-[360px] min-h-[240px] font-sans"
    role="alert"
    aria-live="assertive"
    data-testid="capture-error"
  >
    <AlertIcon />
    <h2 class="m-0 text-base leading-snug font-semibold text-red-600 dark:text-red-400">
      {t('capture_error_scriptFailed_heading')}
    </h2>
    <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
      {t('capture_error_scriptFailed_body_before')}
      <span class="text-sky-600 dark:text-sky-400">
        {t('capture_error_scriptFailed_body_icon')}
      </span>
      {t('capture_error_scriptFailed_body_after')}
    </p>
  </main>
);
```

**Phase 3 ErrorBanner differences** (UI-SPEC §Component States §Error banner, lines 455-460):
- NOT full-screen — banner sits ABOVE the SendForm
- Container: `bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 p-4 rounded-r-md`
- Heading: `text-sm font-semibold text-red-700`
- Body: `text-sm text-slate-700`
- Retry button: `text-sm font-semibold text-red-600 hover:text-red-700 underline-offset-2 hover:underline`
- Dismiss (✕) top-right
- 5 ErrorCode → 5 (heading, body, retry?) tuples; `PLATFORM_UNSUPPORTED` has no retry button

i18n key pattern: `error_code_<CODE>_heading|_body|_retry` (UI-SPEC §Implementation Notes line 558).

---

### `entrypoints/popup/components/primitives.tsx` (NEW — extract from App.tsx)

**Analog:** `entrypoints/popup/App.tsx` lines 280-299.

**Extract verbatim** — these two are reused by Combobox, SendForm, options page:
```tsx
// FieldLabel (App.tsx:280-286)
function FieldLabel({ id, label }: { id: string; label: string }) {
  return (
    <label for={id} class="text-xs leading-snug font-normal text-slate-500 dark:text-slate-400">
      {label}
    </label>
  );
}

// textareaClass (App.tsx:288-299) — also basis for Combobox inputClass
const textareaClass = [
  'w-full px-3 py-2 rounded-md',
  'text-sm leading-normal font-normal',
  'text-slate-900 dark:text-slate-100',
  'bg-white dark:bg-slate-900',
  'border border-slate-200 dark:border-slate-700',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-400',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
  'focus-visible:border-sky-600 dark:focus-visible:border-sky-400',
  'resize-none field-sizing-content',
].join(' ');
```

After extraction:
- Update `entrypoints/popup/App.tsx` to import from `./components/primitives`
- New components (Combobox, SendForm, ErrorBanner, options page) import from same module
- This is the only "Phase 2 inherited Phase 3 touches" allowed (UI-SPEC §1: "extract into `popup/components/primitives.tsx` during Wave 3 to make them options-page-shareable")

---

### `entrypoints/options/index.html` + `main.tsx` + `App.tsx` (NEW — entrypoint)

**Analog:** `entrypoints/popup/index.html` + `main.tsx`.

**index.html pattern** (`entrypoints/popup/index.html` full file, 16 lines) — copy verbatim, change title:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>__MSG_options_page_title__</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body class="m-0 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
    <div id="app"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**main.tsx pattern** (`entrypoints/popup/main.tsx` full file, 8 lines) — copy verbatim, change `App` import:
```ts
import { render } from 'preact';
import { App } from './App';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('[options] #app root missing');
render(<App />, root);
```

**App.tsx skeleton** — single-column with reserved Phase 4/6 slots (UI-SPEC §Options page layout, lines 348-374):
```tsx
import { signal } from '@preact/signals';
import { t } from '@/shared/i18n';
import { ResetSection } from './components/ResetSection';

export function App() {
  return (
    <main class="mx-auto max-w-[720px] p-8 flex flex-col gap-4 font-sans">
      <h1 class="text-base leading-snug font-semibold">{t('options_page_heading')}</h1>
      <ResetSection />
      {/* Phase 4 reserved: granted origins section */}
      {/* Phase 6 reserved: locale switcher section */}
    </main>
  );
}
```

**Critical:** `entrypoints/options/` is auto-detected by WXT 0.20.x and produces `manifest.options_ui.page` (NOT `options_page` — RESEARCH Pitfall 7). `verify-manifest.ts` must assert `options_ui.page === 'options.html'`.

---

### `entrypoints/options/components/ConfirmDialog.tsx` (NEW — modal dialog)

**Analog:** none in codebase. Use UI-SPEC.md §Layout Contracts §Confirmation dialog (lines 383-398) verbatim.

**Modal contract:**
- Fixed-position overlay: `fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60`
- Centered card: `p-6` (24px) padding
- Button row: `gap-2` (8px) between Cancel + Confirm
- ESC key calls `onCancel`
- Focus trap inside dialog while open
- Cancel = slate outline; Confirm with `variant="destructive"` = `bg-red-600 text-white`

```tsx
interface ConfirmDialogProps {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  variant?: 'destructive' | 'default';
  onCancel: () => void;
  onConfirm: () => void;
}
```

---

### `entrypoints/mock-platform.content.ts` (NEW — content-script stub)

**Analog:** `entrypoints/extractor.content.ts` (full file).

**defineContentScript pattern** (`entrypoints/extractor.content.ts:23, 57-79`):
```ts
import { defineContentScript } from '#imports';

export default defineContentScript({
  registration: 'runtime',
  main(): ExtractorPartial {
    // ... business logic ...
    return { title, description, content };
  },
});
```

**Phase 3 mock-platform usage of `chrome.runtime.onMessage`** — CONTEXT.md "stub adapter 失败注入路径" + RESEARCH.md Code Examples (lines 974-1005):
```ts
import { defineContentScript } from '#imports';

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main(_ctx) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type !== 'ADAPTER_DISPATCH') return;
      const { send_to, prompt } = msg.payload;

      // Failure-injection hooks for e2e (D-23)
      if (send_to.includes('fail=not-logged-in')) {
        sendResponse({ ok: false, code: 'NOT_LOGGED_IN', message: 'mock', retriable: false });
        return true;
      }
      // ... fail=input-not-found, fail=timeout, fail=rate-limited

      console.log('[mock-platform] compose', { send_to, prompt });
      console.log('[mock-platform] send (mocked)');
      sendResponse({ ok: true, data: undefined });
      return true;
    });
  },
});
```

**Critical (RESEARCH Open Question 2):** Use `http://localhost:4321/mock-platform.html?fail=not-logged-in` form, NOT `mock://...` (invalid URL scheme — `chrome.tabs.create` rejects).

**Production exclusion:** `mock-platform.content.ts` is a dev/test artifact. Either configure WXT to bundle it only in dev mode, or guard `main()` with `if (!import.meta.env.DEV) return;` early-exit. Plan stage decides; both paths satisfy CLAUDE.md §约定 §"隐私" (no telemetry).

---

### `tests/unit/dispatch/state-machine.spec.ts` (NEW — unit test, mirror pattern)

**Analog:** `tests/unit/messaging/capture.spec.ts` (full file, 343 lines).

**Mirror-function pattern** (`tests/unit/messaging/capture.spec.ts:25-86`):
```ts
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { Ok, Err, type Result } from '@/shared/messaging';
import type { ArticleSnapshot } from '@/shared/messaging';
import { runCapturePipeline } from '@/background/capture-pipeline';

interface MockDeps { /* ... */ }

async function capturePipelineCore(
  deps: MockDeps,
  nowIso: string = new Date().toISOString(),
): Promise<Result<ArticleSnapshot>> {
  // Mirror branching logic with injectable deps — no chrome.* needed
}

describe('capture pipeline core (CAP-01, CAP-04, D-15..D-17)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('returns RESTRICTED_URL for chrome:// tab (D-16)', async () => {
    const result = await capturePipelineCore({ tabUrl: 'chrome://newtab', tabId: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('RESTRICTED_URL');
      expect(result.retriable).toBe(false);
    }
  });
  // ...
});
```

**Direct stubChrome pattern** (`tests/unit/messaging/capture.spec.ts:210-218, 224-342`):
```ts
interface ChromeStub {
  windows: { getLastFocused: ReturnType<typeof vi.fn> };
  tabs: { query: ReturnType<typeof vi.fn> };
  scripting: { executeScript: ReturnType<typeof vi.fn> };
}

function stubChrome(stub: ChromeStub): void {
  vi.stubGlobal('chrome', stub);
}

describe('runCapturePipeline (direct, WR-04)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns Err(...) when ...', async () => {
    stubChrome({ /* ... */ });
    const result = await runCapturePipeline();
    expect(result.ok).toBe(false);
    // ...
  });
});
```

**Phase 3 dispatch state-machine tests** mirror this structure with:
- `MockDeps` shape: `{ existingDispatchRecord?, adapterMatchResult?, tabsCreateResult?, executeScriptResult?, alarmFires? }`
- Mirror function: `dispatchPipelineCore(deps)` mimics state transitions without chrome.* calls
- Direct tests: `vi.stubGlobal('chrome', { storage: { session: { ... } }, tabs: { create, update, query, onUpdated }, scripting: { executeScript }, alarms: { create, onAlarm }, action: { setBadgeText, setBadgeBackgroundColor } })`
- Test cases: 11-step state machine; idempotency (same dispatchId returns existing state); SW restart resilience (write `awaiting_complete` then re-trigger `onTabComplete`)

---

### `tests/unit/repos/{history,binding,popupDraft}.spec.ts` (NEW — unit tests)

**Analog:** `tests/unit/storage/items.spec.ts` (full file, 43 lines).

**fakeBrowser test pattern** (`tests/unit/storage/items.spec.ts:1-42`):
```ts
import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { metaItem, META_DEFAULT } from '@/shared/storage/items';

describe('storage/items metaItem', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns the default value when storage is empty', async () => {
    const value = await metaItem.getValue();
    expect(value).toEqual(META_DEFAULT);
  });

  it('persists writes via setValue and reads them back', async () => {
    await metaItem.setValue({ schemaVersion: 1, helloCount: 5 });
    const value = await metaItem.getValue();
    expect(value).toEqual({ schemaVersion: 1, helloCount: 5 });
  });

  it('writes to chrome.storage.local (NOT session) per D-04', async () => {
    await metaItem.setValue({ schemaVersion: 1, helloCount: 3 });
    const raw = await fakeBrowser.storage.local.get(null);
    // ...
    expect(hasMetaInLocal).toBe(true);
    expect(hasMetaInSession).toBe(false);
  });
});
```

**Phase 3 repo test cases:**
- `history.spec.ts` — score formula monotonicity; cap 50 truncation; same-value dedupe bumps `use_count`; `topN()` returns at most 8 ordered by score; `resetAll()` empties storage
- `binding.spec.ts` — `upsert()` overwrites existing; `get(send_to)` returns undefined for unknown; dirty flag does not break read path; `resetAll()` empties storage
- `popupDraft.spec.ts` — set/get/remove single item; schema validation rejects malformed; `removeValue()` clears

---

### `tests/unit/messaging/dispatch.spec.ts` (NEW — RPC schema test)

**Analog:** `tests/unit/messaging/protocol.spec.ts` (full file, 37 lines) — schemas table tests.

**Pattern** (`tests/unit/messaging/protocol.spec.ts:4-18`):
```ts
import { describe, it, expect } from 'vitest';
import { schemas, Ok, Err, type Result, type ErrorCode } from '@/shared/messaging';

describe('messaging/protocol', () => {
  it('exposes meta.bumpHello input and output schemas', () => {
    expect(schemas['meta.bumpHello'].input.safeParse(undefined).success).toBe(true);
    expect(schemas['meta.bumpHello'].input.safeParse('hi').success).toBe(false);
  });

  it('output schema enforces schemaVersion=1 and non-negative integer helloCount', () => {
    const out = schemas['meta.bumpHello'].output;
    expect(out.safeParse({ schemaVersion: 1, helloCount: 0 }).success).toBe(true);
    // ...
  });
});
```

**Phase 3 dispatch.spec.ts** — assert all 6 new routes' schemas (input + output for each of `dispatch.start`, `dispatch.cancel`, `history.list`, `history.delete`, `binding.upsert`, `binding.get`).

---

### `tests/unit/messaging/errorCode.spec.ts` (MODIFY — extend)

**Analog:** itself (full file, 35 lines).

**Existing test pattern** (`tests/unit/messaging/errorCode.spec.ts:5-13`):
```ts
it('RESTRICTED_URL is a valid ErrorCode (compile-time + runtime)', () => {
  const code: ErrorCode = 'RESTRICTED_URL';
  const r = Err(code, 'chrome:// URL not supported', false);
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.code).toBe('RESTRICTED_URL');
    expect(r.retriable).toBe(false);
  }
});
```

Phase 3 adds 5 mirror tests for `NOT_LOGGED_IN`, `INPUT_NOT_FOUND`, `TIMEOUT`, `RATE_LIMITED`, `PLATFORM_UNSUPPORTED` — copy the test block 5 times, change the code string and `retriable` flag per the result.ts trailing-comment table.

---

### `tests/e2e/dispatch.spec.ts` (NEW — E2E)

**Analog:** `tests/e2e/capture.spec.ts` + `tests/e2e/popup-rpc.spec.ts`.

**Test fixture import** (`tests/e2e/capture.spec.ts:30`):
```ts
import { test, expect } from './fixtures';
```

**Page-ordering pattern** (`tests/e2e/capture.spec.ts:34-56`) — preserve verbatim:
```ts
test('capture: fixture article page fills 5 fields within 2s', async ({ context, extensionId }) => {
  const articlePage = await context.newPage();
  await articlePage.goto('/article.html', { waitUntil: 'domcontentloaded' });

  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();

  await articlePage.bringToFront();
  await popup.goto(popupUrl);

  await popup.waitForSelector('[data-testid="capture-success"]', { timeout: 2_000 });
  // assertions
});
```

**SW-restart resilience pattern** (`tests/e2e/popup-rpc.spec.ts:50-76`):
```ts
test('popup RPC survives SW restart', async ({ context, extensionId, reloadExtension }) => {
  // baseline state
  // ...
  await reloadExtension();
  // assert state survived
  // ...
});
```

**Phase 3 dispatch.spec.ts test cases:**
1. **Happy path:** open mock-platform.html via `articlePage.goto('/mock-platform.html')`, fill send_to + prompt in popup, click Confirm, assert mock-platform receives `ADAPTER_DISPATCH` message and badge shows `ok` (poll `chrome.action.getBadgeText`)
2. **Failure injection:** `send_to = http://localhost:4321/mock-platform.html?fail=not-logged-in` → assert popup mount on next open shows `[data-testid="error-banner-not-logged-in"]`
3. **Idempotency:** double-click Confirm within 200ms → assert only one `dispatch:<id>` record in storage.session
4. **SW restart:** trigger dispatch, `reloadExtension()` mid-flight, assert dispatch still completes (tabs.onUpdated wakes new SW, sweep finds awaiting_complete record, advances to awaiting_adapter)
5. **Badge ok 30s deviation (RESEARCH A3):** assert badge clears within 35s of dispatch=done — or use fakeBrowser.alarms.onAlarm.trigger in unit test instead (see `tests/unit/dispatch/state-machine.spec.ts`)

---

### `tests/e2e/draft-recovery.spec.ts` (NEW — E2E)

**Analog:** `tests/e2e/capture.spec.ts` (page-ordering + popup edit pattern, lines 83-113).

**Editable textarea verification pattern** (`tests/e2e/capture.spec.ts:101-110`):
```ts
const titleEl = popup.locator('[data-testid="capture-field-title"]');
await titleEl.click();
await titleEl.fill('Edited Title');
await expect(titleEl).toHaveValue('Edited Title');
```

**Phase 3 draft-recovery test sequence:**
1. Open popup → fill `[data-testid="popup-field-sendTo"]` and `[data-testid="popup-field-prompt"]`
2. Wait 1000ms (debounce 800ms + buffer)
3. Close popup (`popup.close()`)
4. Re-open popup (`context.newPage() + goto(popupUrl)`)
5. Assert send_to and prompt fields restored to typed values

---

### `tests/e2e/options-reset.spec.ts` (NEW — E2E)

**Analog:** `tests/e2e/popup-rpc.spec.ts` (extension page navigation pattern, lines 24-31).

**Extension page navigation pattern**:
```ts
const optionsUrl = `chrome-extension://${extensionId}/options.html`;
const page = await context.newPage();
await page.goto(optionsUrl);
```

**Phase 3 options-reset test sequence:**
1. Pre-seed history via popup: open popup, fill send_to with 3 different URLs, dispatch each
2. Open options page directly via `chrome-extension://<id>/options.html`
3. Click `[data-testid="options-reset-button"]` → confirm dialog appears
4. Click `[data-testid="options-reset-confirm"]` → dialog closes
5. Re-open popup, focus send_to combobox → assert listbox shows empty state copy

---

### `tests/e2e/fixtures/mock-platform.html` (NEW — test fixture)

**Analog:** `tests/e2e/fixtures/article.html` (full file, 96 lines).

**Static fixture pattern** — copy minimal HTML skeleton, drop the article markup, add a `<div id="mock-platform-target">` placeholder:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Mock Platform Stub</title>
  </head>
  <body>
    <main>
      <h1>Mock Platform</h1>
      <p>This page is the Phase 3 stub adapter target.</p>
      <div id="mock-platform-target" data-testid="mock-platform-target"></div>
    </main>
  </body>
</html>
```

The mock-platform content script (entrypoints/mock-platform.content.ts) is injected at runtime by the SW dispatch-pipeline's executeScript call — the HTML itself doesn't load it. `data-testid="mock-platform-target"` is what e2e asserts post-dispatch.

---

### `locales/en.yml` + `locales/zh_CN.yml` (MODIFY — i18n)

**Analog:** itself (existing keys at lines 1-69 of en.yml).

**Flat underscore-separated key pattern** (`locales/en.yml:20-69`):
```yaml
capture_field_title:
  message: 'Title'

capture_empty_restricted_heading:
  message: "Can't capture this page"

capture_empty_restricted_body_before:
  message: "Web2Chat doesn't run on browser-internal pages. Open a regular website, then click "

capture_empty_restricted_body_icon:
  message: 'the toolbar icon'

capture_empty_restricted_body_after:
  message: ' again.'
```

**Phase 3 namespaces** (UI-SPEC §Implementation Notes line 555-562 + Copywriting Contract):
- `dispatch_*` — `dispatch_confirm_label`, `dispatch_in_progress_heading`, `dispatch_in_progress_body_{before,icon,after}`, `dispatch_cancel_label`, `dispatch_cancelled_toast`
- `error_code_*` — for each of 5 codes: `error_code_<code>_heading`, `error_code_<code>_body`, `error_code_<code>_retry` (where applicable)
- `history_*` — `history_empty_state`, `history_view_all`, `history_remove_button` (aria-label)
- `binding_*` — `binding_use_bound_for_{before,icon,after}` (three-segment per soft-overwrite link)
- `platform_icon_*` — `platform_icon_{mock,openclaw,discord,unsupported}`
- `options_*` — `options_page_title`, `options_page_heading`, `options_reset_*` family + dialog keys
- `popup_chrome_*` — `popup_chrome_title`, `popup_chrome_settings_tooltip`

**100% en/zh_CN parity:** every key added to en.yml MUST also exist in zh_CN.yml. Phase 1 CI already enforces this (per RESEARCH project constraints).

---

### `scripts/verify-manifest.ts` (MODIFY)

**Analog:** itself (full file, 76 lines).

**Existing assertion pattern** (`scripts/verify-manifest.ts:37-53`):
```ts
const expectSet = (label: string, actual: string[] | undefined, expected: string[]): void => {
  const a = (actual ?? []).slice().sort();
  const e = expected.slice().sort();
  if (JSON.stringify(a) !== JSON.stringify(e)) {
    errors.push(`${label} mismatch: expected ${JSON.stringify(e)}, got ${JSON.stringify(actual)}`);
  }
};

expectSet('permissions', manifest.permissions, ['activeTab', 'scripting', 'storage']);
expectSet('host_permissions', manifest.host_permissions, ['https://discord.com/*']);
expectSet('optional_host_permissions', manifest.optional_host_permissions, ['<all_urls>']);

if ((manifest.host_permissions ?? []).includes('<all_urls>')) {
  errors.push('FATAL: `<all_urls>` present in static host_permissions ...');
}
```

**Phase 3 additions** (RESEARCH Pitfall 7 + Pitfall 8):
1. Extend `Manifest` type with `commands?: { _execute_action?: { suggested_key?: { default?: string } } }` and `options_ui?: { page?: string }`
2. Assert `manifest.commands?._execute_action?.suggested_key?.default === 'Ctrl+Shift+S'`
3. Assert `manifest.options_ui?.page === 'options.html'` (NOT `options_page` — WXT 0.20.x produces `options_ui`)
4. Update dev-mode permission expectation if `tabs` is still dev-only (currently only included in dev mode per `wxt.config.ts:14-18`)

---

### `wxt.config.ts` (MODIFY)

**Analog:** itself (full file, 43 lines).

**Manifest function pattern** (`wxt.config.ts:5-37`):
```ts
manifest: ({ mode }) => ({
  name: '__MSG_extension_name__',
  description: '__MSG_extension_description__',
  default_locale: 'en',
  permissions: mode === 'development'
    ? ['activeTab', 'scripting', 'storage', 'tabs']
    : ['activeTab', 'scripting', 'storage'],
  host_permissions: mode === 'development'
    ? ['https://discord.com/*', '<all_urls>']
    : ['https://discord.com/*'],
  optional_host_permissions: ['<all_urls>'],
  action: {
    default_title: '__MSG_action_default_title__',
    default_icon: { /* ... */ },
  },
}),
```

**Phase 3 additions** (CONTEXT.md D-38 + RESEARCH Pitfall 8):
```ts
commands: {
  _execute_action: {
    suggested_key: {
      default: 'Ctrl+Shift+S',
      mac: 'Command+Shift+S',
    },
    description: '__MSG_command_open_popup__',
  },
},
```

WXT auto-detects `entrypoints/options/index.html` and adds `options_ui.page = 'options.html'` to the generated manifest — no explicit config needed in wxt.config.ts.

**Critical:** do NOT widen static `host_permissions` to include `<all_urls>` in production mode (verify-manifest hardlocks this). The mock-platform fixture URL (`http://localhost:4321/...`) is reached via dev-mode `<all_urls>` only; production never serves the stub adapter.

---

## Shared Patterns

### Pattern S1: SW top-level listener registration (FND-02)

**Source:** `entrypoints/background.ts:48-76`

**Apply to:** any new file that adds a `chrome.*` listener to background.ts (Phase 3: 6 new `onMessage` + `chrome.tabs.onUpdated` + `chrome.alarms.onAlarm`).

**Rule:** every listener MUST register synchronously inside the `defineBackground(() => { ... })` closure, BEFORE any `await`. Handlers themselves can be async; the registration call cannot.

**Concrete excerpt:**
```ts
export default defineBackground(() => {
  // ALL listener registrations here, sync, no await preceding any of them
  onMessage('meta.bumpHello', wrapHandler(/* ... */));
  onMessage('capture.run', wrapHandler(runCapturePipeline));
  // Phase 3: 6 more onMessage + 2 chrome.*.addListener — all here
});
```

### Pattern S2: Result-based error model + wrapHandler

**Source:** `entrypoints/background.ts:36-46`, `shared/messaging/result.ts:24-36`

**Apply to:** every new RPC handler (`startDispatch`, `cancelDispatch`, `historyList`, etc.) and every internal pipeline helper.

**Rule:** business errors return `Err('CODE', message, retriable)`; programmer errors throw and `wrapHandler` converts to `Err('INTERNAL', ...)`.

**Concrete excerpt:**
```ts
export async function startDispatch(payload: DispatchStartInput): Promise<Result<DispatchStartOutput>> {
  // Step N: validation + business logic
  if (!adapter) {
    return Err('PLATFORM_UNSUPPORTED', payload.send_to, false);
  }
  // ...
  return Ok({ dispatchId, state: 'awaiting_complete' });
}
```

Wrap registration in `entrypoints/background.ts`:
```ts
onMessage('dispatch.start', wrapHandler(startDispatch));
```

### Pattern S3: Module-level Preact signal state model

**Source:** `entrypoints/popup/App.tsx:31-39`

**Apply to:** all popup + options page components that hold persistent UI state (Phase 3: SendForm, Combobox, InProgressView, options ResetSection).

**Rule:** module-level `signal<T>(...)` for state that survives across re-renders within one popup mount; module-level `computed(...)` for derived values; signals are reset to default on popup close (popup process dies).

**Concrete excerpt:**
```ts
import { signal } from '@preact/signals';

// Module-level — survives component re-renders, dies with popup
const sendToSig = signal('');
const promptSig = signal('');
const dispatchInFlightSig = signal<DispatchRecord | null>(null);
```

### Pattern S4: Mount-trigger with `cancelled` flag (PATTERNS Phase 1 §Pattern 2)

**Source:** `entrypoints/popup/App.tsx:43-70`

**Apply to:** any popup useEffect that fires async work (Phase 3 mount: parallel capture.run + popupDraft + dispatch:active reads).

**Rule:** capture `let cancelled = false` in scope; check `if (cancelled) return;` after EVERY `await`; cleanup function sets `cancelled = true`.

**Concrete excerpt:**
```ts
useEffect(() => {
  let cancelled = false;
  void (async () => {
    try {
      const result = await sendMessage('capture.run');
      if (cancelled) return;
      // ... mutate signals
    } catch (err) {
      if (cancelled) return;
      // ... handle error
    }
  })();
  return () => { cancelled = true; };
}, []);
```

### Pattern S5: Inline accent span (XSS-safe i18n with user content)

**Source:** `entrypoints/popup/App.tsx:217-244`, PITFALLS §11

**Apply to:** any string that wraps an icon or user-supplied URL/text (Phase 3: error banner, soft-overwrite "Use bound prompt for X" link, in-progress body).

**Rule:** split into 3 i18n keys (`<key>_before`, `<key>_icon`, `<key>_after`); JSX composes `<>{before}<span class="text-sky-600">{icon}</span>{after}</>`. NEVER embed user value in `t(key, { placeholder })` because the placeholder gets text-substituted in YAML at runtime.

**Concrete excerpt:**
```tsx
const before = t('binding_use_bound_for_before');
const icon   = t('binding_use_bound_for_icon');   // OR: pass user value via JSX, not i18n
const after  = t('binding_use_bound_for_after');

<p class="...">
  {before}
  <span class="text-sky-600 dark:text-sky-400">{icon}</span>
  {after}
</p>
```

For dynamic values (e.g. `send_to` host in soft-overwrite link), substitute the icon span content with `{userValue}` rendered as a Preact text node — never via `dangerouslySetInnerHTML`, never via i18n placeholder.

### Pattern S6: Preact attribute naming (NOT React)

**Source:** `entrypoints/popup/App.tsx:282, 137, 311-313`

**Apply to:** every new JSX file in entrypoints/popup/ + entrypoints/options/.

**Rule:**
- `for={id}` (NOT `htmlFor`)
- `class={...}` (NOT `className`)
- `stroke-width="2"` `stroke-linecap="round"` (NOT `strokeWidth={2}`)
- `tabindex={0}` (NOT `tabIndex`)
- `onInput`, `onClick`, `onKeyDown` (camelCase event handlers — same as React)

**Concrete excerpt** (`App.tsx:282`):
```tsx
<label for={id} class="text-xs leading-snug font-normal text-slate-500">
  {label}
</label>
```

### Pattern S7: Tailwind v4 `class` strings + dark variant

**Source:** `entrypoints/popup/App.tsx:288-299` (`textareaClass` constant)

**Apply to:** every new component className. UI-SPEC §Spacing Scale + §Color enforce strict subset.

**Rule:**
- `class="..."` not `className="..."`
- Pair every light bg/text with `dark:` variant
- Multi-line classNames use array `.join(' ')` (NOT template literals — diff-friendly)
- Phase 3 NEW components use spacing scale {4, 8, 16, 24, 32, 48, 64} ONLY (UI-SPEC §Spacing Scale)
- Phase 2 inherited `gap-3` / `px-3 py-2` in `textareaClass` MUST remain — surgical-changes principle

**Concrete excerpt:**
```ts
const inputClass = [
  'w-full px-3 py-2 rounded-md',
  'text-sm leading-normal font-normal',
  'text-slate-900 dark:text-slate-100',
  'bg-white dark:bg-slate-900',
  'border border-slate-200 dark:border-slate-700',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600',
].join(' ');
```

### Pattern S8: zod validation at RPC boundary

**Source:** `shared/messaging/protocol.ts:38-50`, `entrypoints/background.ts:55-67`, `background/capture-pipeline.ts:34-38, 89-96, 112-121`

**Apply to:** every new RPC handler input/output (Phase 3: 6 dispatch/history/binding routes) and every cross-process payload validation (mock-platform sendResponse).

**Rule:** define `schemas[<route>]` with `input` + `output` zod objects; validate input INSIDE handler before business logic, validate output AFTER. Use `safeParse` (not `parse`) for output to keep validation failures inside Result channel.

**Concrete excerpt** (handler input validation):
```ts
schemas['meta.bumpHello'].input.parse(undefined);   // throws if invalid → wrapHandler catches
// business logic
const validated = schemas['meta.bumpHello'].output.parse(next);
return Ok(validated);
```

For dispatch payload (snapshot + prompt + send_to), use `DispatchStartInputSchema.safeParse(payload)` per RESEARCH Code Examples line 891-896.

### Pattern S9: fakeBrowser unit test setup

**Source:** `tests/unit/storage/items.spec.ts:1-7`, `tests/unit/messaging/capture.spec.ts:18-23, 92-97`

**Apply to:** every Phase 3 unit test that touches storage / messaging / chrome.* APIs.

**Rule:**
- `import { fakeBrowser } from 'wxt/testing/fake-browser';`
- `beforeEach(() => { fakeBrowser.reset(); vi.restoreAllMocks(); })`
- For direct chrome.* assertions: `vi.stubGlobal('chrome', stub)` + `afterEach(() => { vi.unstubAllGlobals(); })`

**Concrete excerpt:**
```ts
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('repos/history', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('add() dedupes on same value and bumps use_count', async () => {
    await historyRepo.add('https://example.com');
    await historyRepo.add('https://example.com');
    const all = await historyRepo.topN();
    expect(all).toHaveLength(1);
    expect(all[0].use_count).toBe(2);
  });
});
```

### Pattern S10: E2E page-ordering for tabs.query active-tab semantics

**Source:** `tests/e2e/capture.spec.ts:34-56` (commentary lines 14-28)

**Apply to:** every Phase 3 e2e test that needs a non-popup tab to be active when SW reads `chrome.tabs.query({ active: true })`.

**Rule:**
1. Open the article/mock-platform tab first (`articlePage = await context.newPage(); await articlePage.goto(...)`)
2. Pre-create popup tab as blank (`popup = await context.newPage()` — DO NOT goto yet)
3. `await articlePage.bringToFront()` — restores article as focused window
4. `await popup.goto(popupUrl)` — `goto` does NOT steal focus

**Concrete excerpt:**
```ts
const articlePage = await context.newPage();
await articlePage.goto('/article.html', { waitUntil: 'domcontentloaded' });

const popupUrl = `chrome-extension://${extensionId}/popup.html`;
const popup = await context.newPage();           // blank, pre-created

await articlePage.bringToFront();                 // article is focused
await popup.goto(popupUrl);                       // does NOT steal focus

await popup.waitForSelector('[data-testid="capture-success"]', { timeout: 2_000 });
```

For Phase 3 dispatch e2e: same ordering, replace `/article.html` with `/mock-platform.html?fail=...` for failure-injection cases.

---

## No Analog Found

Files with no close existing analog. Planner should rely on RESEARCH.md patterns + UI-SPEC.md:

| File | Role | Data Flow | Reason | Use Instead |
|------|------|-----------|--------|-------------|
| `background/adapter-registry.ts` | config / lookup | request-response | First registry-style file in repo | RESEARCH §Pattern 1 + CONTEXT D-24 + `<specifics>` IMAdapter sketch; `as const` style precedent from `shared/messaging/protocol.ts:38-50` |
| `entrypoints/popup/components/Combobox.tsx` | component | combobox | First ARIA combobox in repo | RESEARCH §Pattern 5 (lines 539-619) + UI-SPEC §Component States §Combobox (lines 404-444) verbatim; reuse `textareaClass` style for input chrome |
| `entrypoints/options/components/ConfirmDialog.tsx` | component | n/a | First modal dialog in repo | UI-SPEC §Layout Contracts §Confirmation dialog (lines 383-398); ARIA dialog spec from W3C |
| `shared/adapters/types.ts` | types | n/a | First adapter contract | CONTEXT.md `<specifics>` IMAdapter sketch (lines 183-200) + RESEARCH.md §Pattern 1 |
| `entrypoints/mock-platform.content.ts` | content-script (event-handler) | event-driven | extractor.content.ts is run-once-return; mock-platform is listen-and-respond | `entrypoints/extractor.content.ts:23, 57-79` for `defineContentScript` shell; CONTEXT.md `<specifics>` line 974-1005 for the listener body |
| `.planning/phases/03-dispatch-popup/03-DEVIATIONS.md` | docs | n/a | First deviations file (RESEARCH A3 D-34 5s→30s) | gsd template (typical deviations.md format) |
| `entrypoints/popup/components/Spinner` (inside InProgressView) | icon | n/a | No animated icon yet in repo | UI-SPEC §Iconography line 497 (Lucide loader-2 + `animate-spin`); SVG style from `EmptyIcon` |

---

## Metadata

**Analog search scope:**
- `entrypoints/` (5 files: background.ts, extractor.content.ts, popup/{App,main}.tsx, popup/{index.html, style.css})
- `background/` (1 file: capture-pipeline.ts)
- `shared/` (8 files: messaging/{protocol,result,index}.ts, storage/{items,migrate,index}.ts, i18n/index.ts)
- `scripts/` (1 file: verify-manifest.ts)
- `tests/unit/` (8 files including extractor + storage + messaging dirs)
- `tests/e2e/` (3 files: fixtures.ts, capture.spec.ts, popup-rpc.spec.ts)
- `locales/` (en.yml + zh_CN.yml)
- Build/config: wxt.config.ts, vitest.config.ts, playwright.config.ts, tsconfig.json

**Files scanned:** ~28 source files (Phase 1 + Phase 2 baseline)

**Pattern extraction date:** 2026-05-01

**Key inheritance from Phase 1+2:**
- SW top-level listener (FND-02) — extends, never breaks
- Result/ErrorCode model — extends union, helpers untouched
- typed-repo storage discipline — popup + SW both go through `repo.*` business methods
- module-level signal pattern — extends with new signals, no architectural change
- inline-SVG icon convention — extends with platform icons + spinner
- three-segment i18n inline accent — extends with binding/dispatch/error namespaces
- Tailwind v4 utility-first, two weights only — strict spacing scale tightened in Phase 3 NEW
- mirror-function unit test pattern — extended to dispatch state machine
- E2E page-ordering for active-tab — extended to mock-platform fixture
