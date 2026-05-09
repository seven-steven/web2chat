# Phase 8: 架构泛化 - Research

**Researched:** 2026-05-09
**Domain:** TypeScript type system (branded types), Chrome MV3 service worker event model, adapter registry architecture
**Confidence:** HIGH

## Summary

Phase 8 is a pure refactoring phase: no new features, no new platform adapters, no UI changes. The goal is to restructure four subsystems -- PlatformId typing, MAIN world bridge routing, SPA navigation filters, and ErrorCode organization -- so that subsequent phases (9-12) can add new platforms by adding files + registry entries without touching the dispatch pipeline or SW entrypoint.

The codebase is well-structured for this transformation. The `adapterRegistry` array in `shared/adapters/registry.ts` already serves as the single source of truth for platform detection in both popup and SW. Phase 8 extends this role to cover MAIN world injection dispatch, SPA history filters, and platform-scoped error codes. The main risk is bundle contamination: putting MAIN world injector functions directly on registry entries would pull platform-specific DOM code into the popup bundle. The solution is to store only a reference (the injector function) on entries used exclusively by the SW, with proper tree-shaking by keeping the heavy MAIN world functions in platform-specific modules.

**Primary recommendation:** Layer changes bottom-up: branded PlatformId first (foundation), then ErrorCode namespace (depends on PlatformId), then MAIN world bridge generalization (depends on registry entry expansion), then SPA filter builder (depends on registry entry expansion). Each layer is independently testable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-95:** Keep `mock` as a real registry platform entry (not test-only).
- **D-96:** `PlatformId` uses branded string type; `DispatchRecord.platform_id` becomes branded `PlatformId`.
- **D-97:** Branded `PlatformId` created only through registry construction helpers (`definePlatformId()` / `defineAdapter()`); no scattered raw `as PlatformId` casts.
- **D-98:** Platform display metadata stays on `AdapterRegistryEntry`.
- **D-99:** MAIN world injection uses per-adapter `mainWorldInjector`, not a generic paste/enter DSL.
- **D-100:** `mainWorldInjector` stored on registry entry; new platforms only need adapter file + registry entry.
- **D-101:** Port naming: `WEB2CHAT_MAIN_WORLD:<platformId>`.
- **D-102:** MAIN bridge payload fixed as `{ text }`; platform differences live inside each injector.
- **D-103:** SPA history route uses explicit opt-in field, not inferred from `hostMatches`.
- **D-104:** Registry field is exact host list (e.g., `spaNavigationHosts: ['discord.com']`); builder converts to Chrome `UrlFilter[]`.
- **D-105:** SPA hosts default to exact host match only; no automatic subdomain inclusion.
- **D-106:** `onHistoryStateUpdated` uses a dedicated handler (`onSpaHistoryStateUpdated`), not direct `onTabComplete` reuse.
- **D-107:** ErrorCode uses mixed common + platform-specific model; common string values stay stable.
- **D-108:** No `COMMON_*` prefix migration for existing codes.
- **D-109:** Platform ErrorCodes are strict additions only.
- **D-110:** ErrorCode type/runtime validation aggregated from registry/adapter declarations; no circular deps.

### Claude's Discretion
- `Brand<T, Name>`, `definePlatformId()`, `defineAdapter()` naming and file location.
- `AdapterRegistryEntry` new field names (`mainWorldInjector`, `spaNavigationHosts`, `errorCodes`).
- Whether `onSpaHistoryStateUpdated` shares internal helpers with `onTabComplete`.
- How to avoid popup bundle pulling in MAIN world code from registry.
- ErrorCode registry aggregation type technique.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | PlatformId branded string type, registry `id` constrains legal values, no merge conflicts | Branded type pattern with `declare unique symbol`; `definePlatformId()` construction helper; registry entries use helper |
| ARCH-02 | MAIN world paste bridge per-adapter routing via `port.name` prefix, SW has no platform-specific DOM logic | Port format `WEB2CHAT_MAIN_WORLD:<platformId>`, registry carries `mainWorldInjector`, SW parses prefix and dispatches generically |
| ARCH-03 | SPA route filter dynamically built from `adapterRegistry`, new SPA platform = registry entry only | `spaNavigationHosts` field on registry entry, builder function produces `chrome.events.UrlFilter[]` at module top level (synchronous) |
| ARCH-04 | ErrorCode namespaced (common + platform), new platform appends codes without affecting existing handling | Common codes as base type, platform codes declared per-adapter with `as const`, aggregated via union type; no `COMMON_*` prefix migration |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PlatformId branded type | Shared (types) | -- | Used by popup (icon display), SW (dispatch), and storage (DispatchRecord) |
| Registry entry expansion | Shared (registry) | -- | Single source of truth consumed by all tiers |
| MAIN world bridge routing | Background (SW) | Content script (adapter) | SW owns port listener + executeScript; content script connects port |
| SPA filter construction | Background (SW) | Shared (registry) | Filter built from registry data, registered in SW; registry provides data |
| ErrorCode namespace | Shared (messaging) | Shared (adapters) | Base codes in messaging/result.ts; platform codes declared alongside adapters, aggregated back into messaging |

## Standard Stack

No new libraries needed. Phase 8 uses only TypeScript type system features and existing Chrome extension APIs.

### Core (no changes)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| TypeScript | 5.9.3 | Branded types, `as const`, union aggregation | Already installed [VERIFIED: `npx tsc --version`] |
| WXT | 0.20.x | Extension framework, content script bundling | Already installed |
| Vitest | 3.x | Unit testing | Already installed |

### External API Constraints
| API | Property Used | Purpose |
|-----|--------------|---------|
| `chrome.events.UrlFilter` | `hostEquals` | Exact host matching for SPA filter (D-105) [CITED: developer.chrome.com/docs/extensions/reference/api/events] |
| `chrome.webNavigation.onHistoryStateUpdated` | URL filter parameter | SPA history detection [CITED: developer.chrome.com/docs/extensions/reference/api/webNavigation] |
| `chrome.runtime.onConnect` | `port.name` parsing | MAIN world bridge routing [CITED: developer.chrome.com/docs/extensions/develop/concepts/messaging] |

## Architecture Patterns

### System Architecture Diagram

```
                    Adapter Module (e.g., discord)
                    ┌──────────────────────────────┐
                    │ defineAdapter({              │
                    │   id: definePlatformId('...'),│
                    │   match: (url) => ...,        │
                    │   mainWorldInjector?: fn,     │
                    │   spaNavigationHosts?: [...], │
                    │   errorCodes?: [...],         │
                    │   ...                         │
                    │ })                            │
                    └──────────┬───────────────────┘
                               │ returns AdapterRegistryEntry
                               ▼
                    ┌──────────────────────────────┐
                    │ shared/adapters/registry.ts   │
                    │ adapterRegistry: readonly     │
                    │   AdapterRegistryEntry[]      │
                    └──┬────────┬────────┬─────────┘
                       │        │        │
            ┌──────────┘  ┌─────┘  ┌─────┘
            ▼             ▼        ▼
    ┌───────────┐  ┌──────────┐  ┌─────────────────┐
    │ Popup     │  │ SW       │  │ SW               │
    │ (icon,    │  │ (MAIN    │  │ (SPA filter      │
    │ platform  │  │ bridge   │  │ builder + handler)│
    │ detect)   │  │ routing) │  │                   │
    └───────────┘  └──────────┘  └─────────────────┘
```

Data flow for MAIN world bridge:
```
Content script (ISOLATED)
  │ port = chrome.runtime.connect({ name: 'WEB2CHAT_MAIN_WORLD:discord' })
  │ port.postMessage({ text })
  ▼
SW onConnect listener
  │ parse port.name → extract platformId
  │ lookup registry → entry.mainWorldInjector
  │ chrome.scripting.executeScript({ func: entry.mainWorldInjector, world: 'MAIN', args: [text] })
  ▼
MAIN world (same tab)
  │ injector function runs: find editor, paste, send
  │ return boolean
  ▼
SW posts result back to port
```

Data flow for SPA filter:
```
Module load (synchronous)
  │ import { adapterRegistry } from registry
  │ buildSpaFilters(adapterRegistry) → UrlFilter[]
  ▼
SW top-level registration
  │ chrome.webNavigation.onHistoryStateUpdated.addListener(
  │   onSpaHistoryStateUpdated,
  │   { url: spaFilters }
  │ )
  ▼
Runtime: SPA navigation on discord.com
  │ Chrome wakes SW, calls onSpaHistoryStateUpdated
  │ handler reads dispatch records from storage.session
  │ advances matching record
```

### Recommended Project Structure

No new directories. Changes are to existing files + one new helper file.

```
shared/
├── adapters/
│   ├── types.ts           # PlatformId branded type, AdapterRegistryEntry expanded
│   ├── registry.ts        # defineAdapter() helper, adapterRegistry array
│   ├── platform-errors.ts # (NEW) per-platform error code declarations + aggregation
│   ├── discord-format.ts  # unchanged
│   └── discord-login-detect.ts # unchanged
├── messaging/
│   └── result.ts          # ErrorCode = CommonErrorCode | PlatformErrorCode
└── storage/
    └── repos/dispatch.ts  # platform_id: PlatformId (branded)

entrypoints/
├── background.ts          # generic MAIN bridge + SPA filter (no Discord-specific code)
└── discord.content.ts     # uses generic port prefix WEB2CHAT_MAIN_WORLD:<platformId>

background/
└── dispatch-pipeline.ts   # failDispatch uses ErrorCode (unchanged signature)
```

### Pattern 1: Branded PlatformId with Construction Helper

**What:** A branded string type that prevents raw string assignment while remaining a string at runtime.
**When to use:** When you need compile-time distinction between validated and unvalidated platform identifiers.

```typescript
// Source: TypeScript branded types pattern [CITED: learningtypescript.com/articles/branded-types]
// File: shared/adapters/types.ts

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type PlatformId = Brand<string, 'PlatformId'>;

/** Create a branded PlatformId. Only called inside defineAdapter(). */
export function definePlatformId(raw: string): PlatformId {
  return raw as PlatformId;
}
```

**Key constraint:** `definePlatformId()` should only be called inside `defineAdapter()` or registry construction. Grep for `as PlatformId` in CI to enforce no raw casts. [ASSUMED]

### Pattern 2: Registry Entry with Optional MAIN World Injector

**What:** `AdapterRegistryEntry` gains optional fields for MAIN world injection, SPA hosts, and error codes.
**When to use:** When a platform needs MAIN world execution (Slate/Lexical editors) or is a SPA.

```typescript
// File: shared/adapters/types.ts

export interface AdapterRegistryEntry {
  readonly id: PlatformId;
  match(url: string): boolean;
  readonly scriptFile: string;
  readonly hostMatches: readonly string[];
  readonly iconKey: string;

  // Phase 8 additions:
  /** MAIN world injector function. If present, SW routes port messages to this. */
  readonly mainWorldInjector?: (text: string) => Promise<boolean>;
  /** Exact hostnames that trigger SPA history listener. Empty/absent = no SPA handling. */
  readonly spaNavigationHosts?: readonly string[];
  /** Platform-specific error codes declared by this adapter. */
  readonly errorCodes?: readonly string[];
}
```

### Pattern 3: SPA Filter Builder (Synchronous, Top-Level Safe)

**What:** Build `chrome.events.UrlFilter[]` from registry at module import time.
**When to use:** Required because MV3 listeners must be registered synchronously at top level.

```typescript
// File: shared/adapters/registry.ts (or a new builder file)

export function buildSpaUrlFilters(
  registry: readonly AdapterRegistryEntry[]
): chrome.events.UrlFilter[] {
  return registry
    .filter((e) => e.spaNavigationHosts && e.spaNavigationHosts.length > 0)
    .flatMap((e) => e.spaNavigationHosts!.map((host) => ({ hostEquals: host })));
}
```

```typescript
// File: entrypoints/background.ts — top-level synchronous registration

import { adapterRegistry, buildSpaUrlFilters } from '@/shared/adapters/registry';

const spaFilters = buildSpaUrlFilters(adapterRegistry);

export default defineBackground(() => {
  // ... existing listeners ...

  if (spaFilters.length > 0) {
    chrome.webNavigation.onHistoryStateUpdated.addListener(
      onSpaHistoryStateUpdated,
      { url: spaFilters },
    );
  }
});
```

**Critical constraint:** `buildSpaUrlFilters` must be a pure synchronous function. `adapterRegistry` is a module-level constant. No async reads. This satisfies MV3's requirement that all event listeners are registered synchronously at the top level. [VERIFIED: Chrome docs confirm no synchronous data providers in SW; our registry is a compile-time import, not async storage] [CITED: developer.chrome.com/docs/extensions/develop/concepts/service-workers/events]

### Pattern 4: ErrorCode Namespace Aggregation

**What:** Common error codes stay in `shared/messaging/result.ts`. Platform-specific codes are declared alongside their adapters. The final `ErrorCode` type is a union of both.
**When to use:** When you need extensible error codes without circular dependencies.

```typescript
// File: shared/messaging/result.ts
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

// File: shared/adapters/platform-errors.ts (NEW)
// Dependency direction: platform-errors -> messaging (one-way, same as types.ts)
export const OPENCLAW_ERROR_CODES = ['OPENCLAW_OFFLINE', 'OPENCLAW_PERMISSION_DENIED'] as const;
export type OpenclawErrorCode = (typeof OPENCLAW_ERROR_CODES)[number];

// Future: export const SLACK_ERROR_CODES = [...] as const;

export type PlatformErrorCode = OpenclawErrorCode; // | SlackErrorCode | ...

// File: shared/messaging/result.ts (updated)
import type { PlatformErrorCode } from '@/shared/adapters/platform-errors';
export type ErrorCode = CommonErrorCode | PlatformErrorCode;
```

**Circular dependency analysis:** Currently `shared/adapters/types.ts` imports from `shared/messaging` (types only). Adding `shared/messaging/result.ts` importing from `shared/adapters/platform-errors.ts` creates a cross-module dependency, BUT `platform-errors.ts` is a NEW file that does NOT import from `shared/messaging` -- it only exports `as const` arrays and derived types. So there is no cycle: `messaging/result.ts -> adapters/platform-errors.ts` (one-way). The existing `adapters/types.ts -> messaging/result.ts` is the other direction through a different file. No circular dependency. [VERIFIED: grep confirmed `shared/messaging/` does not import from `shared/adapters/`]

**Alternative (simpler):** Keep all ErrorCode declarations in `result.ts` but organize them with type comments / namespace grouping. This avoids the new file and cross-import entirely. The tradeoff: adding a platform error code still requires editing `result.ts` (a shared file), but since it is an additive-only union member, merge conflicts are unlikely if new codes are appended at the end.

**Recommendation:** Use the simpler approach -- keep ErrorCode in `result.ts` with clear comment sections for common vs platform codes. The `as const` + aggregation pattern is elegant but over-engineered for the current scale (3 platforms, 2 platform-specific codes). Revisit if platform count exceeds 5. [ASSUMED]

### Anti-Patterns to Avoid

- **Putting `mainWorldInjector` function body in registry.ts:** Would bundle all platform MAIN world code into popup. Instead, the function should be defined in the adapter's own module and only imported into registry.ts -- Vite tree-shakes unused code per-bundle, but only if the popup bundle never reaches the import path. Solution: conditional dynamic import in SW, or separate the registry into a "core registry" (popup-safe) and "sw registry" (has injectors).
- **Using `hostSuffix` instead of `hostEquals` for SPA filter:** `hostSuffix: 'discord.com'` would also match `evil-discord.com`. D-105 explicitly requires exact host matching. Use `hostEquals`. [VERIFIED: Chrome events.UrlFilter supports `hostEquals`] [CITED: developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/events/UrlFilter]
- **Async filter construction for webNavigation:** MV3 service workers have no synchronous data providers. Building filters from `chrome.storage` would require async, which means the listener registration cannot happen at top level. The registry-driven approach avoids this entirely.
- **Raw `as PlatformId` casts scattered in code:** D-97 explicitly prohibits this. All PlatformId values must come through `definePlatformId()` or `defineAdapter()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Branded string type | Custom class wrapper with toString() | `Brand<string, 'PlatformId'>` intersection type | Zero runtime overhead; TypeScript-only construct; well-established community pattern |
| URL filter construction | Manual `chrome.events` filter object assembly | `buildSpaUrlFilters()` pure function from registry | Single source of truth; prevents forgetting to update filters when adding platforms |
| Port name parsing | Ad-hoc string splitting | Named constant prefix + `port.name.startsWith(PREFIX)` + `slice()` | Consistent, testable, type-safe extraction |

## Common Pitfalls

### Pitfall 1: Bundle Contamination via mainWorldInjector

**What goes wrong:** Putting the `mainWorldInjector` function directly on registry entries means popup imports the function body (which references DOM APIs like `document.querySelector`, `ClipboardEvent`, etc.) even though popup never calls it.
**Why it happens:** `shared/adapters/registry.ts` is imported by both popup and SW. WXT/Vite bundles all reachable code.
**How to avoid:** Two viable approaches:
1. **Lazy import in SW only:** Registry stores the injector function, but the function is defined in a module that only the SW's background.ts imports. Since popup never imports background.ts, the injector code is not reachable from popup.
2. **Registry split:** A "core" registry (popup-safe, no injectors) and an "extended" registry (SW-only, adds injectors). More files, but clearest separation.
**Recommendation:** Approach 1 is simpler. The `discordMainWorldPaste` function is already defined in `entrypoints/background.ts` (SW-only). Moving it to a dedicated module like `background/injectors/discord.ts` and importing it only in `background.ts` where registry entries are augmented keeps popup clean. Registry entries in `shared/adapters/registry.ts` have `mainWorldInjector: undefined`; the SW-side code overlays the actual function at startup.
**Warning signs:** Popup bundle size suddenly increases; popup crashes with `document is not defined` (SW environment).

### Pitfall 2: SPA Filter Empty Array Registration

**What goes wrong:** If no platform has `spaNavigationHosts`, `buildSpaUrlFilters()` returns `[]`. Passing `{ url: [] }` to `addListener` may cause Chrome to not filter at all (fires for ALL URLs) or throw.
**Why it happens:** Chrome's `events.UrlFilter` spec says: "If you include this parameter, then the event fires only for transitions to URLs which match at least one UrlFilter in the array."
**How to avoid:** Guard: `if (spaFilters.length > 0)` before registering the listener. If no platforms need SPA handling, skip registration entirely.
**Warning signs:** SW wakes up on every history.pushState on every site.

### Pitfall 3: Losing Switch Exhaustiveness on PlatformId

**What goes wrong:** Current code in popup (`variantFromUrl`, `iconForPlatformId`) uses `if (id === 'mock') ... else if (id === 'discord')` chains. With branded PlatformId, these string comparisons still work (branded string IS a string at runtime), but TypeScript can no longer exhaustively check coverage.
**Why it happens:** Branded string is structurally `string & { __brand: 'PlatformId' }` -- TypeScript cannot enumerate all possible values of a branded string.
**How to avoid:** This is an accepted tradeoff (D-96). Use registry-driven lookup instead of switch/if chains. The `iconKey` field on `AdapterRegistryEntry` already provides the icon information. Refactor `iconForPlatformId` to use registry lookup: `findAdapter(url)?.iconKey ?? 'unsupported'`.
**Warning signs:** New platform added but popup shows "unsupported" icon because if/switch wasn't updated.

### Pitfall 4: DispatchRecord Storage Compatibility

**What goes wrong:** Changing `platform_id: string` to `platform_id: PlatformId` in `DispatchRecord` interface is type-only; runtime data in `chrome.storage.session` is untyped JSON. Existing in-flight dispatches (if any) still have raw string `platform_id`. Reading them back and assigning to branded type would require a cast.
**Why it happens:** `chrome.storage.session` stores plain JSON; branded types only exist in TypeScript's type system.
**How to avoid:** Since `storage.session` data does not persist across browser restarts (and dispatch records are short-lived), there is no migration concern. The `as DispatchRecord` cast in `dispatchRepo.get()` already exists. Just ensure the interface change propagates cleanly.
**Warning signs:** TypeScript errors in `dispatchRepo.get()` return type.

### Pitfall 5: ErrorBanner Exhaustive Switch on ErrorCode

**What goes wrong:** `ErrorBanner.tsx` has three `switch (code)` blocks that exhaustively cover all current `ErrorCode` values. When Phase 10-12 add new platform error codes (e.g., `SLACK_*`), these switches will be non-exhaustive, but TypeScript may not warn because the functions return `string` (no `never` check on default).
**Why it happens:** Functions return `string`, not relying on TypeScript's exhaustive switch checking.
**How to avoid:** Add a default case that returns a generic fallback message using the error code itself as a key pattern: `t(\`error_code_${code}_heading\`)`. New platform codes that follow the `error_code_<CODE>_heading/body/retry` i18n key convention will automatically work. Phase 8 should add this default case.
**Warning signs:** New error code shows empty or crashed ErrorBanner.

## Code Examples

### Example 1: definePlatformId and defineAdapter

```typescript
// Source: community branded types pattern [CITED: learningtypescript.com/articles/branded-types]
// File: shared/adapters/types.ts

declare const __platformIdBrand: unique symbol;
export type PlatformId = string & { readonly [__platformIdBrand]: never };

export function definePlatformId(raw: string): PlatformId {
  return raw as PlatformId;
}

export function defineAdapter(
  entry: Omit<AdapterRegistryEntry, 'id'> & { id: string }
): AdapterRegistryEntry {
  return { ...entry, id: definePlatformId(entry.id) } as AdapterRegistryEntry;
}
```

### Example 2: Generic Port Routing in SW

```typescript
// File: entrypoints/background.ts
// Replaces: Discord-specific DISCORD_MAIN_WORLD_PASTE_PORT listener

const MAIN_WORLD_PORT_PREFIX = 'WEB2CHAT_MAIN_WORLD:';

chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith(MAIN_WORLD_PORT_PREFIX)) return;
  const platformId = port.name.slice(MAIN_WORLD_PORT_PREFIX.length);

  port.onMessage.addListener((msg, senderPort) => {
    const tabId = senderPort.sender?.tab?.id;
    const text = typeof msg?.text === 'string' ? msg.text : null;
    if (typeof tabId !== 'number' || text === null) {
      port.postMessage({ ok: false, message: 'Invalid request' });
      port.disconnect();
      return;
    }

    // Look up injector from registry
    const entry = adapterRegistry.find((e) => e.id === platformId);
    const injector = entry?.mainWorldInjector;
    if (!injector) {
      port.postMessage({ ok: false, message: `No injector for platform: ${platformId}` });
      port.disconnect();
      return;
    }

    void chrome.scripting
      .executeScript({
        target: { tabId },
        world: 'MAIN',
        func: injector,
        args: [text],
      })
      .then((results) => {
        port.postMessage({ ok: results[0]?.result === true });
        port.disconnect();
      })
      .catch((err: unknown) => {
        port.postMessage({
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
        port.disconnect();
      });
  });
});
```

**Important note on `entry.id === platformId` comparison:** With branded PlatformId, `entry.id` is `PlatformId` (branded string) and `platformId` extracted from port name is a raw `string`. TypeScript allows `===` comparison between branded string and raw string (branded string extends string). This comparison works at runtime because the brand is type-only.

### Example 3: Content Script Using Generic Port Prefix

```typescript
// File: entrypoints/discord.content.ts (updated)
const PLATFORM_ID = 'discord';
const MAIN_WORLD_PORT = `WEB2CHAT_MAIN_WORLD:${PLATFORM_ID}`;

async function injectMainWorldPaste(editor: HTMLElement, text: string): Promise<boolean> {
  editor.focus();
  const response = await new Promise<{ ok: boolean; message?: string }>((resolve) => {
    const port = chrome.runtime.connect({ name: MAIN_WORLD_PORT });
    // ... same listener pattern as before ...
  });
  return response.ok;
}
```

### Example 4: SPA Handler Sharing Internal Helper

```typescript
// File: background/dispatch-pipeline.ts

/** Shared helper: advance a dispatch record after tab/SPA load completes. */
async function advanceDispatchForTab(tabId: number): Promise<void> {
  const all = await dispatchRepo.listAll();
  for (const record of all) {
    if (record.state !== 'awaiting_complete') continue;
    if (record.target_tab_id !== tabId) continue;
    const adapter = findAdapter(record.send_to);
    if (!adapter) { /* ... fail ... */ continue; }
    // Login redirect check ...
    await advanceToAdapterInjection(record, adapter.scriptFile);
  }
}

// File: entrypoints/background.ts
export function onSpaHistoryStateUpdated(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
): void {
  void advanceDispatchForTab(details.tabId);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PlatformId = 'mock' \| 'openclaw' \| 'discord'` literal union | `PlatformId = Brand<string, 'PlatformId'>` branded type | Phase 8 | Enables parallel platform development without merge conflicts on the union definition |
| Discord-specific `DISCORD_MAIN_WORLD_PASTE_PORT` constant | Generic `WEB2CHAT_MAIN_WORLD:<platformId>` prefix routing | Phase 8 | New MAIN world platforms auto-route through SW |
| Hardcoded `{ url: [{ hostSuffix: 'discord.com' }] }` SPA filter | `buildSpaUrlFilters(adapterRegistry)` dynamic construction | Phase 8 | New SPA platforms = registry entry only |
| Monolithic `ErrorCode` union in one file | Common + platform namespace organization | Phase 8 | New platform codes appendable without touching common set |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `definePlatformId()` only needs to be called inside `defineAdapter()`; CI grep for `as PlatformId` is sufficient enforcement | Pattern 1 | Low -- worst case is a raw cast that bypasses validation, but values still work at runtime |
| A2 | Keeping ErrorCode in `result.ts` with comment sections is sufficient at current scale (vs. `as const` aggregation) | Pattern 4 / Recommendation | Medium -- if platform count exceeds 5, the monolithic file becomes unwieldy; but migration to split approach is straightforward |
| A3 | Moving `discordMainWorldPaste` to `background/injectors/discord.ts` and overlaying onto registry at SW startup avoids popup bundle contamination | Pitfall 1 | Medium -- needs verification that WXT/Vite tree-shakes properly; if not, fallback to registry split approach |

## Open Questions

1. **mainWorldInjector bundle isolation: overlay vs split**
   - What we know: Registry is imported by popup and SW. MAIN world injectors use DOM APIs. Popup must not bundle injector code.
   - What's unclear: Whether WXT/Vite reliably tree-shakes `mainWorldInjector` when it's `undefined` on the registry entry and only assigned in the SW-side import.
   - Recommendation: Start with the overlay approach (registry has `mainWorldInjector?: undefined`, SW code imports and attaches injectors). If build output analysis shows contamination, fall back to split registry.

2. **PlatformId comparison in port name routing**
   - What we know: `port.name.slice(PREFIX.length)` yields a raw `string`. Registry entry `id` is branded `PlatformId`. `===` comparison works at runtime.
   - What's unclear: Whether TypeScript will accept `===` comparison between `PlatformId` and `string` without complaint. Need to verify.
   - Recommendation: TypeScript should allow it since `PlatformId extends string`. If not, a simple helper `isPlatformId(raw: string, id: PlatformId): boolean` resolves it.

3. **ErrorBanner default case pattern**
   - What we know: Current ErrorBanner has exhaustive switch cases for all 11 error codes. Phase 8 changes ErrorCode to be extensible.
   - What's unclear: Whether the i18n key pattern `error_code_${code}_heading` should be added in Phase 8 or deferred to the platform phases.
   - Recommendation: Add default case in Phase 8 to prevent future breakage. The actual i18n keys for new platform codes will be added when those phases land.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + happy-dom |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | PlatformId is branded; raw string assignment fails at compile time | unit (type-level) | `npx vitest run tests/unit/dispatch/platform-detector.spec.ts -x` | Exists (update needed) |
| ARCH-01 | defineAdapter() produces branded PlatformId on entries | unit | `npx vitest run tests/unit/dispatch/platform-detector.spec.ts -x` | Exists (update needed) |
| ARCH-01 | DispatchRecord.platform_id accepts PlatformId, rejects raw string | unit (type-level) | Type check: `npx tsc --noEmit` | N/A (compile-time) |
| ARCH-02 | Generic port listener routes to correct injector by platformId | unit | `npx vitest run tests/unit/dispatch/mainWorldBridge.spec.ts -x` | Wave 0 |
| ARCH-02 | Port name parsing extracts platformId correctly | unit | Same as above | Wave 0 |
| ARCH-02 | Port with unknown platformId gets error response | unit | Same as above | Wave 0 |
| ARCH-03 | buildSpaUrlFilters produces correct UrlFilter[] from registry | unit | `npx vitest run tests/unit/dispatch/spaFilter.spec.ts -x` | Wave 0 |
| ARCH-03 | Empty spaNavigationHosts produces empty filter array | unit | Same as above | Wave 0 |
| ARCH-03 | Multiple platforms with SPA hosts produce combined filters | unit | Same as above | Wave 0 |
| ARCH-04 | All existing ErrorCode values remain valid | unit | `npx vitest run tests/unit/messaging/errorCode.spec.ts -x` | Exists (update needed) |
| ARCH-04 | Platform-specific codes are valid ErrorCode members | unit | Same as above | Exists (update needed) |
| ARCH-04 | isErrorCode runtime check validates both common and platform codes | unit | Same as above | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green + `npx tsc --noEmit` clean

### Wave 0 Gaps
- [ ] `tests/unit/dispatch/mainWorldBridge.spec.ts` -- covers ARCH-02 (generic port routing)
- [ ] `tests/unit/dispatch/spaFilter.spec.ts` -- covers ARCH-03 (SPA filter builder)
- [ ] Update `tests/unit/dispatch/platform-detector.spec.ts` -- covers ARCH-01 (branded PlatformId)
- [ ] Update `tests/unit/messaging/errorCode.spec.ts` -- covers ARCH-04 (namespace model)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A (no auth in extension) |
| V3 Session Management | No | N/A |
| V4 Access Control | Yes (permissions) | Manifest permission model unchanged; verify-manifest.ts enforces no `<all_urls>` in static host_permissions |
| V5 Input Validation | Yes (port name) | Port name prefix validation before dispatching; payload schema `{ text: string }` enforced |
| V6 Cryptography | No | N/A |

### Known Threat Patterns for Chrome MV3 Extension

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious port name injection | Spoofing | Validate port.name format `WEB2CHAT_MAIN_WORLD:<platformId>`; reject unknown platformIds via registry lookup |
| MAIN world code execution in wrong tab | Elevation of Privilege | `chrome.scripting.executeScript` target is sender tab only (`senderPort.sender?.tab?.id`); never user-supplied tabId |
| SPA filter too broad, waking SW unnecessarily | Denial of Service | Use `hostEquals` (exact), not `hostContains`/`hostSuffix`; D-105 enforces narrowest filter |

## Project Constraints (from CLAUDE.md)

- SW listeners must be registered synchronously at top level of `defineBackground()` -- SPA filter builder must be synchronous
- No `await` before listener registration -- `buildSpaUrlFilters()` must be a pure synchronous function using compile-time `adapterRegistry`
- Adapter pattern: `content/adapters/<platform>.ts` implements `IMAdapter` interface -- Phase 8 does not change this, only adds registry metadata
- DOM injection: only synthetic ClipboardEvent/DataTransfer for Slate/Lexical -- MAIN world injectors follow this rule
- `host_permissions` must not contain `<all_urls>` -- Phase 8 does not change permissions
- All user-visible strings via `t(...)` -- ErrorBanner default case must use `t()` for new codes
- Tests: Vitest + `fake-browser` for unit; Playwright for E2E

## File Impact Analysis

### Files Modified

| File | Change | Risk |
|------|--------|------|
| `shared/adapters/types.ts` | Add `PlatformId` branded type, `definePlatformId()`, expand `AdapterRegistryEntry` | LOW -- additive, no behavioral change |
| `shared/adapters/registry.ts` | Add `defineAdapter()` helper, `buildSpaUrlFilters()`, migrate entries to use helper | MEDIUM -- touches single source of truth for platform detection |
| `shared/messaging/result.ts` | Reorganize `ErrorCode` into common + platform sections; add `isErrorCode()` runtime guard | MEDIUM -- all error handling depends on this type |
| `shared/storage/repos/dispatch.ts` | Change `platform_id: string` to `platform_id: PlatformId` | LOW -- type-only change |
| `entrypoints/background.ts` | Replace Discord-specific port/SPA/injector with generic registry-driven versions | HIGH -- most complex change; must preserve exact runtime behavior |
| `entrypoints/discord.content.ts` | Update port name constant from `DISCORD_MAIN_WORLD_PASTE_PORT` to `WEB2CHAT_MAIN_WORLD:discord` | LOW -- string constant swap |
| `entrypoints/popup/components/SendForm.tsx` | Refactor `variantFromUrl`/`iconForPlatformId` to use registry lookup instead of hardcoded if/else | LOW -- UI behavior unchanged |
| `entrypoints/popup/components/ErrorBanner.tsx` | Add default case to switch statements for future ErrorCodes | LOW -- additive |
| `background/dispatch-pipeline.ts` | Extract shared helper for `advanceDispatchForTab`; change `failDispatch` code parameter to `ErrorCode` | MEDIUM -- refactoring internal function |

### Files Created

| File | Purpose |
|------|---------|
| `tests/unit/dispatch/mainWorldBridge.spec.ts` | Unit tests for generic MAIN world port routing |
| `tests/unit/dispatch/spaFilter.spec.ts` | Unit tests for SPA filter builder |

### Files Unchanged (verified)

| File | Why |
|------|-----|
| `shared/adapters/discord-format.ts` | Message formatting not affected by registry changes |
| `shared/adapters/discord-login-detect.ts` | Login detection logic stays in content script |
| `scripts/verify-manifest.ts` | Permissions unchanged; existing assertions still valid |
| `entrypoints/extractor.content.ts` | Capture pipeline unrelated |
| `entrypoints/openclaw.content.ts` | OpenClaw uses property-descriptor setter (ISOLATED world), no MAIN world bridge |
| `entrypoints/mock-platform.content.ts` | Mock adapter needs no MAIN world bridge |

### Tests Requiring Updates

| Test File | Change Needed |
|-----------|--------------|
| `tests/unit/dispatch/platform-detector.spec.ts` | Update for branded PlatformId; verify `defineAdapter()` produces valid entries |
| `tests/unit/dispatch/discordMainWorldPaste.spec.ts` | Mirror function unchanged (behavior preserved); may need import path update if function moves |
| `tests/unit/dispatch/login-detection.spec.ts` | `platform_id: 'discord'` in test records may need branded value |
| `tests/unit/messaging/errorCode.spec.ts` | Add tests for platform-specific error codes and `isErrorCode()` |
| `tests/unit/scripts/verify-manifest.spec.ts` | Unchanged (permissions not modified) |

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `shared/adapters/types.ts`, `shared/adapters/registry.ts`, `shared/messaging/result.ts`, `entrypoints/background.ts`, `entrypoints/discord.content.ts`, `background/dispatch-pipeline.ts` -- direct file reads
- Chrome Events API: `events.UrlFilter` properties including `hostEquals` -- [CITED: developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/events/UrlFilter]
- Chrome MV3 service worker event registration: listeners must be synchronous top-level -- [CITED: developer.chrome.com/docs/extensions/develop/concepts/service-workers/events]
- TypeScript 5.9.3 version confirmed -- [VERIFIED: `npx tsc --version`]
- All 239 existing tests pass -- [VERIFIED: `npx vitest run`]

### Secondary (MEDIUM confidence)
- TypeScript branded types pattern: `declare unique symbol` + intersection type -- [CITED: learningtypescript.com/articles/branded-types]
- Chrome `webNavigation.onHistoryStateUpdated` URL filter behavior -- [CITED: developer.chrome.com/docs/extensions/reference/api/webNavigation]
- Chrome runtime messaging port pattern -- [CITED: developer.chrome.com/docs/extensions/develop/concepts/messaging]

### Tertiary (LOW confidence)
- None. All findings verified against codebase or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, pure TypeScript refactoring
- Architecture: HIGH -- all patterns verified against existing codebase and Chrome API docs
- Pitfalls: HIGH -- identified from direct code analysis and MV3 documentation

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (stable -- pure refactoring, no external API changes expected)
