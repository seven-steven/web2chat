# Architecture Research

**Domain:** Chrome MV3 browser extension — Web Clipper + multi-IM dispatch automation
**Researched:** 2026-04-28
**Confidence:** HIGH (Chrome.\* APIs, manifest, message passing) / MEDIUM (per-platform IM injection mechanics — DOM contracts vary and drift)

## Standard Architecture

### System Overview

Web2Chat is a Manifest V3 extension. MV3 mandates a non-persistent **service worker** as the single privileged event hub; all other surfaces (popup, content scripts) are isolated, ephemeral processes that talk to it via `chrome.runtime` / `chrome.tabs` messaging. Three logical pipelines must coexist on this seam:

1. **Capture pipeline** — popup asks SW to extract metadata + readable content from the active tab.
2. **Dispatch pipeline** — popup confirms a target, SW opens/activates the IM tab, waits for it to load, injects a per-platform adapter, and round-trips success.
3. **Persistence + i18n pipeline** — `chrome.storage.local` and `chrome.i18n` accessed from any surface.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           USER SURFACES (UI)                             │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐                          ┌──────────────────────┐  │
│  │  popup/index.html│                          │  options/index.html  │  │
│  │  (React SPA)     │                          │  (deferred, v2)      │  │
│  │  - SendForm      │                          └──────────────────────┘  │
│  │  - HistoryDrop   │                                                    │
│  │  - PromptPicker  │                                                    │
│  └────────┬─────────┘                                                    │
│           │ chrome.runtime.connect({name:"popup"})  (long-lived port)    │
│           │ chrome.runtime.sendMessage (one-shot RPCs)                   │
├───────────┼──────────────────────────────────────────────────────────────┤
│           ▼                  EXTENSION CORE (privileged)                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │              background/service-worker.ts                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │ MessageRouter│  │CapturePipeln │  │ DispatchPipeline         │  │  │
│  │  │ (port + RPC) │  │              │  │  - tab open/activate     │  │  │
│  │  │              │  │              │  │  - tabs.onUpdated wait   │  │  │
│  │  │              │  │              │  │  - adapter selection     │  │  │
│  │  │              │  │              │  │  - executeScript inject  │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │  │
│  │         │                 │                     │                  │  │
│  │  ┌──────┴────────┐ ┌──────┴────────┐    ┌───────┴──────────┐       │  │
│  │  │ StorageRepo   │ │ AdapterRegistry│   │ PlatformDetector │       │  │
│  │  │ (typed)       │ │  match(url)    │   │ url → platformId │       │  │
│  │  └───────────────┘ └────────────────┘   └──────────────────┘       │  │
│  └─────────────┬────────────────────────────────────┬─────────────────┘  │
│                │ chrome.scripting.executeScript     │ chrome.tabs.*      │
├────────────────┼────────────────────────────────────┼────────────────────┤
│                ▼                                    ▼                    │
│         CONTENT SCRIPTS (page-isolated, ephemeral, per-tab)              │
│  ┌──────────────────────────────┐    ┌─────────────────────────────────┐ │
│  │ content/extractor.ts         │    │ content/adapters/<platform>.ts  │ │
│  │ (injected on source tab,     │    │ (injected on target IM tab,     │ │
│  │  programmatically, ad-hoc)   │    │  one of N adapters)             │ │
│  │  - DOM scrape                │    │  - waitForReady()               │ │
│  │  - Readability.parse()       │    │  - compose(message)             │ │
│  │  - return ArticleSnapshot    │    │  - send()                       │ │
│  └──────────────────────────────┘    └─────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│                         BROWSER-PROVIDED STORES                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐     │
│  │chrome.storage    │  │ chrome.i18n      │  │ chrome.tabs /      │     │
│  │  .local          │  │  _locales/{zh,en}│  │  chrome.scripting  │     │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component                          | Responsibility                                                                                                                                                                                                                | Typical Implementation                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **popup/** (React SPA)             | All user-facing forms (send_to, prompt, history). Renders preview of captured snapshot. Holds **transient UI state only** — popup DOM is destroyed on close.                                                                  | Vite + React + TypeScript, `chrome-extension://<id>/popup.html`                                                        |
| **background/service-worker.ts**   | Single source of truth. Owns capture orchestration, dispatch orchestration, adapter registry, storage repo, platform detection. Stateless across SW restarts — all state lives in `chrome.storage`.                           | ES module service worker (`"type": "module"`), top-level listener registration                                         |
| **content/extractor.ts**           | Runs in source page's isolated world. Scrapes `title`, `url`, `description` (meta og/twitter), `create_at` (article:published_time, JSON-LD), and main article content via Readability. Returns `ArticleSnapshot` JSON to SW. | Programmatically injected via `chrome.scripting.executeScript({ files: [...] })` on demand. Not statically registered. |
| **content/adapters/<platform>.ts** | Runs in target IM page's isolated world. Implements the `IMAdapter` contract: `waitForReady`, `compose`, `send`. One adapter per platform.                                                                                    | Programmatically injected per-dispatch by SW after `tabs.onUpdated.status === 'complete'`.                             |
| **shared/types**                   | TypeScript types for messages, snapshots, targets, adapter contract. Imported by every other layer; **never bundled into a bundle that contains DOM-dependent code in the wrong direction**.                                  | Pure `.d.ts` / no runtime                                                                                              |
| **shared/messaging**               | Typed wrappers around `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`. Discriminated-union message types.                                                                                                          | Plain TS module, used by popup, SW, content scripts                                                                    |
| **shared/storage**                 | Typed repo over `chrome.storage.local`. Schema versioning, migration hook, listeners.                                                                                                                                         | Plain TS module                                                                                                        |
| **shared/i18n**                    | `t(key, ...subs)` wrapper over `chrome.i18n.getMessage`. `_locales/{zh_CN,en}/messages.json` source.                                                                                                                          | Plain TS module + locale JSON                                                                                          |

## Recommended Project Structure

```
web2chat/
├── public/
│   ├── icons/                          # 16/32/48/128 PNG, plus per-IM platform icons
│   ├── _locales/
│   │   ├── zh_CN/messages.json         # default_locale
│   │   └── en/messages.json
│   └── manifest.json                   # MV3 manifest (or generated by CRXJS)
├── src/
│   ├── shared/                         # ← built FIRST; no chrome.* runtime calls allowed at module top-level
│   │   ├── types/
│   │   │   ├── snapshot.ts             # ArticleSnapshot
│   │   │   ├── target.ts               # SendTarget, TargetKey, PlatformId
│   │   │   ├── messages.ts             # discriminated-union message protocol
│   │   │   └── storage.ts              # StorageSchema (versioned)
│   │   ├── messaging/
│   │   │   ├── rpc.ts                  # typed sendMessage / onMessage wrapper
│   │   │   └── port.ts                 # typed chrome.runtime.connect wrapper
│   │   ├── storage/
│   │   │   ├── repo.ts                 # typed get/set/onChanged
│   │   │   └── migrations.ts
│   │   ├── i18n/
│   │   │   └── t.ts                    # chrome.i18n.getMessage facade
│   │   └── platform/
│   │       ├── detect.ts               # url → PlatformId
│   │       └── registry.ts             # PlatformId → manifest entry (icon, label, host_perm)
│   │
│   ├── background/                     # ← built second; depends on shared/
│   │   ├── service-worker.ts           # entry; top-level listener registration only
│   │   ├── capture-pipeline.ts
│   │   ├── dispatch-pipeline.ts
│   │   ├── adapter-registry.ts         # AdapterRegistry: PlatformId → file path + match
│   │   └── tab-utils.ts                # openOrActivate, waitForComplete
│   │
│   ├── popup/                          # ← built third; depends on shared/
│   │   ├── index.html
│   │   ├── main.tsx                    # React mount
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── SendForm.tsx
│   │   │   ├── HistoryDropdown.tsx
│   │   │   ├── PromptPicker.tsx
│   │   │   └── PlatformBadge.tsx
│   │   └── hooks/
│   │       ├── useCapture.ts           # SW RPC: REQUEST_CAPTURE
│   │       ├── useDispatch.ts          # SW RPC: REQUEST_DISPATCH
│   │       └── useStorage.ts           # subscribes via chrome.storage.onChanged
│   │
│   ├── content/                        # ← built fourth; depends on shared/
│   │   ├── extractor.ts                # standalone IIFE-style entry; runs once per injection
│   │   └── adapters/
│   │       ├── _base.ts                # IMAdapter interface + helpers (waitForSelector, simulatePaste)
│   │       ├── openclaw.ts             # MVP
│   │       ├── discord.ts              # MVP
│   │       └── README.md               # how to add a new adapter (v2 platforms)
│   │
│   └── manifest.config.ts              # generates manifest.json (CRXJS) — or kept static
│
├── tests/
│   ├── unit/
│   │   ├── platform-detect.spec.ts
│   │   ├── storage-repo.spec.ts
│   │   └── adapters/
│   │       ├── discord.fixture.html    # captured DOM snapshot
│   │       ├── discord.spec.ts         # JSDOM-based adapter unit test
│   │       └── openclaw.spec.ts
│   └── e2e/
│       ├── fixtures.ts                 # Playwright launchPersistentContext + extensionId
│       ├── capture.spec.ts
│       └── dispatch-discord.spec.ts
│
├── vite.config.ts                      # multi-entry: popup, background, content scripts
├── tsconfig.json
├── package.json
└── playwright.config.ts
```

### Structure Rationale

- **`shared/` first, no `chrome.*` at top level.** Top-level `chrome.*` calls in shared modules will throw in test (JSDOM) and risk wedging the SW lifecycle. Keep shared modules pure; have callers pass in `chrome.storage.local` only inside functions.
- **`background/` separated from `shared/`** — only the SW entry registers listeners. Pipelines are factored into modules that take dependencies as args (testable without spinning up a real SW).
- **`content/extractor.ts` and `content/adapters/*.ts` are independent bundles** — Vite must produce one output file per content script (cannot share a runtime chunk; each is injected into a different page world).
- **`adapters/` is the single growth point** for v2 platforms. Each adapter is a self-contained file implementing one interface. Adding LINE / Slack / Telegram = adding one file + a registry entry + one host_permission.
- **`tests/e2e/fixtures.ts`** loads the built `dist/` directory with `chromium.launchPersistentContext`, in headed (or `channel: 'chromium'` headless) mode; resolves `extensionId` from the SW URL.

## Architectural Patterns

### Pattern 1: Single Privileged Hub (Service Worker as Coordinator)

**What:** Popup never talks directly to content scripts. All cross-context communication goes popup → SW → content script (via `chrome.tabs.sendMessage` or `chrome.scripting.executeScript`).

**When to use:** Always, for MV3. The popup is destroyed on close; if it owned a `chrome.tabs.sendMessage` round-trip, the response would land on a dead listener.

**Trade-offs:**

- ✅ Survives popup close, SW restart, tab navigation
- ✅ Single place to enforce permissions and rate limits
- ❌ One extra hop for every message (acceptable; this is the convention)

**Example:**

```ts
// popup/hooks/useDispatch.ts
const result = await rpc.send({
  type: "REQUEST_DISPATCH",
  target,
  snapshot,
  prompt,
});
// rpc.send wraps chrome.runtime.sendMessage with typed responses

// background/service-worker.ts (top level — MUST be top level for MV3)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "REQUEST_DISPATCH") {
    dispatchPipeline.run(msg).then(sendResponse);
    return true; // keep channel open for async response
  }
});
```

### Pattern 2: Adapter Pattern for Multi-IM Support

**What:** Each IM platform implements a uniform `IMAdapter` interface. SW selects the adapter by URL, injects it into the target tab, and calls a stable RPC surface.

**When to use:** Whenever the project supports more than one external surface with similar verbs but divergent DOM/UI. v1 has 2 adapters; v2 has ~14. The seam is mandatory from day one.

**Trade-offs:**

- ✅ New platform = one new file, no changes to capture/dispatch core
- ✅ Each adapter unit-testable against captured DOM fixtures (JSDOM)
- ❌ Each adapter is a maintenance liability — IM vendors ship UI changes (esp. Discord, Slack)
- ❌ Cannot fully share runtime code across adapters (each is a separate content-script bundle)

**Adapter contract (canonical TS interface):**

```ts
// shared/types/adapter.ts
export interface IMAdapter {
  /** Stable identifier matching PlatformId in the registry. */
  readonly id: PlatformId;

  /** URL test. Returns true if this adapter handles the given target URL. */
  match(url: string): boolean;

  /**
   * Resolve when the chat UI is ready to accept input
   * (composer mounted, channel/agent context loaded).
   * Reject after timeout. Implemented with MutationObserver + waitForSelector.
   */
  waitForReady(timeoutMs?: number): Promise<void>;

  /**
   * Place the formatted message into the composer.
   * MUST handle React-controlled editors (Slate/Lexical) via simulated
   * paste / InputEvent — direct .value assignment is silently overwritten.
   */
  compose(message: string): Promise<void>;

  /** Submit the composed message (Enter keydown, send-button click, etc.). */
  send(): Promise<void>;
}

// content/adapters/_base.ts — execution glue (each adapter file is its own bundle)
export async function runAdapter(adapter: IMAdapter, message: string) {
  await adapter.waitForReady();
  await adapter.compose(message);
  await adapter.send();
}
```

The SW does **not** import adapter modules at build time (they live in different bundles / different page worlds). It holds a _registry of file paths and `match` predicates_:

```ts
// background/adapter-registry.ts
type AdapterEntry = {
  id: PlatformId;
  match: (url: string) => boolean; // runs in SW
  scriptFile: string; // path relative to extension root
  hostMatches: string[]; // for manifest host_permissions
};

export const ADAPTERS: AdapterEntry[] = [
  {
    id: "openclaw",
    match: (u) => u.includes("localhost:18789/chat"),
    scriptFile: "content/adapters/openclaw.js",
    hostMatches: ["http://localhost:18789/*"],
  },
  {
    id: "discord",
    match: (u) => /^https:\/\/discord\.com\/channels\//.test(u),
    scriptFile: "content/adapters/discord.js",
    hostMatches: ["https://discord.com/*"],
  },
];
```

### Pattern 3: Programmatic Injection over Static `content_scripts`

**What:** Use `chrome.scripting.executeScript({ target: { tabId }, files: [...] })` rather than declaring adapters in `manifest.json` `content_scripts`.

**When to use:** When the script must run _only when the user dispatches_ (not on every Discord visit), and when the set of host_permissions should remain auditable per platform.

**Trade-offs:**

- ✅ Zero per-page overhead — adapter only loads when the user actually sends
- ✅ User sees `permissions: ["scripting"]` + named hosts, never `<all_urls>`
- ✅ Easier debugging: each invocation is a discrete event
- ❌ Slightly later run-time than `run_at: document_idle` static injection — must `waitForReady` defensively
- ❌ Requires the `scripting` permission (which we need anyway)

**Example:**

```ts
// background/dispatch-pipeline.ts
async function injectAdapter(
  tabId: number,
  entry: AdapterEntry,
  message: string,
) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [entry.scriptFile],
    world: "ISOLATED", // default; explicit for clarity
  });
  // Adapter file self-registers a one-shot listener; we then send the payload:
  return chrome.tabs.sendMessage(tabId, { type: "ADAPTER_RUN", message });
}
```

### Pattern 4: Top-Level Listener Registration in the Service Worker

**What:** All `chrome.*.on*.addListener` calls live at the SW module's top level. No `await` or callbacks before listener registration.

**When to use:** Always. MV3 service workers are killed after ~30s of inactivity and _re-spawned_ when an event fires. If the listener wasn't registered synchronously at top level, the event is dropped.

**Trade-offs:**

- ✅ Works correctly with SW restarts
- ❌ Forces a discipline of "no async work before registration" — sometimes annoying when bootstrapping

```ts
// background/service-worker.ts — CORRECT
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.runtime.onInstalled.addListener(handleInstall);

// then async setup:
storage.bootstrap(); // does its own awaits internally; doesn't block listener registration
```

### Pattern 5: Long-Lived Port for Popup ↔ SW (Optional)

**What:** Use `chrome.runtime.connect({ name: 'popup' })` for the popup-to-SW channel during a single popup session; fall back to `sendMessage` for one-shot RPCs.

**When to use:** When the popup needs streaming progress updates from a long-running dispatch (`opening tab → waiting → injecting → sending → done`). One-shot `sendMessage` cannot push intermediate states.

**Trade-offs:**

- ✅ Progress UI without polling
- ✅ Auto-detects popup close (`port.onDisconnect`) so SW can cancel work
- ❌ Slightly more boilerplate than `sendMessage`

## Data Flow

### Capture Flow

```
User clicks toolbar icon
        │
        ▼
popup.html mounts, React renders SendForm
        │
        │ rpc.send({ type: 'REQUEST_CAPTURE' })
        ▼
SW: capture-pipeline.run()
   1. tabs.query({ active: true, lastFocusedWindow: true }) → activeTab
   2. scripting.executeScript({ target: { tabId }, files: ['content/extractor.js'] })
   3. tabs.sendMessage(tabId, { type: 'CAPTURE_REQUEST' }) → ArticleSnapshot
        │
        ▼
content/extractor.ts (in active tab, isolated world)
   - reads document.title, og:* meta, article:published_time, JSON-LD
   - runs new Readability(document.cloneNode(true)).parse()
   - returns { title, url, description, createdAt, content, excerpt }
        │
        ▼
SW returns ArticleSnapshot to popup
        │
        ▼
popup renders preview; user fills/picks send_to + prompt
```

### Dispatch Flow

```
popup: user clicks "Confirm"
        │
        │ rpc.send({ type: 'REQUEST_DISPATCH', target, snapshot, prompt })
        ▼
SW: dispatch-pipeline.run()
   1. PlatformDetector(target.url) → platformId
   2. AdapterRegistry.lookup(platformId) → entry
   3. tabs.query for existing tab matching target.url
       3a. if found → tabs.update({ tabId, active: true })
       3b. else    → tabs.create({ url: target.url, active: true })
   4. await waitForComplete(tabId):
        new Promise(resolve =>
          chrome.tabs.onUpdated.addListener(function fn(id, info, tab) {
            if (id === tabId && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(fn);
              resolve(tab);
            }
          })
        )
   5. scripting.executeScript({ target:{tabId}, files:[entry.scriptFile] })
   6. tabs.sendMessage(tabId, { type: 'ADAPTER_RUN', message: format(snapshot, prompt) })
        │
        ▼
content/adapters/<platform>.ts (in target tab)
   - adapter.waitForReady()  // MutationObserver on composer
   - adapter.compose(message) // simulated paste / InputEvent dispatch
   - adapter.send()          // dispatchEvent('keydown', { key:'Enter' }) or click send btn
   - sendResponse({ ok: true })
        │
        ▼
SW relays { ok, error? } to popup → popup shows toast → close
```

### State Management

Web2Chat has **no in-memory shared state** that survives the SW lifecycle. Everything user-relevant lives in `chrome.storage.local`. Components subscribe via `chrome.storage.onChanged`.

```
chrome.storage.local (single source of truth)
    │
    │  onChanged event
    ▼
[popup hooks]   [SW pipelines]   [adapter content scripts read on demand]
    │
    ↓ (dispatch via SW RPC)
SW writes back via shared/storage/repo.ts
    │
    ↓
chrome.storage.local
```

**StorageSchema (typed, versioned):**

```ts
// shared/types/storage.ts
export interface StorageSchema {
  schemaVersion: 1;
  history: SendTarget[]; // recent send_to entries (LRU)
  promptsByTarget: Record<TargetKey, string[]>; // prompt history scoped per target
  settings: {
    locale: "zh_CN" | "en" | "auto";
    defaultPlatformId?: PlatformId;
  };
}

export type TargetKey = string; // canonicalized URL or platform-specific key
export interface SendTarget {
  key: TargetKey;
  url: string;
  platformId: PlatformId;
  label?: string; // optional user-friendly name
  lastUsedAt: number;
}
```

### Key Data Flows

1. **Capture flow:** `popup → SW → executeScript(extractor) → tabs.sendMessage → ArticleSnapshot → popup`
2. **Dispatch flow:** `popup → SW → tabs.create/update → wait onUpdated complete → executeScript(adapter) → tabs.sendMessage → adapter compose+send → result → popup`
3. **History/prompt persistence:** `popup → SW → storage.local.set` ; popup re-reads via `storage.onChanged` subscription
4. **Platform detection:** synchronous, pure-function in `shared/platform/detect.ts`; called by both popup (for icon preview) and SW (for adapter selection)
5. **i18n:** every UI surface calls `t('key')` → `chrome.i18n.getMessage('key')` → `_locales/<browser_locale>/messages.json`. No runtime locale switching in v1 (browser determines locale at extension load).

## Build Order Implications

The **build order = dependency order** = the order phases should ship.

```
1. shared/types          ──┐
2. shared/messaging       ─┼─ pure TS, no chrome.* at module top level
3. shared/storage          │  (testable in JSDOM, no extension context)
4. shared/i18n             │
5. shared/platform        ─┘
              │
              ▼
6. background/             (depends on all of shared/)
              │
              ▼
7. popup/                  (depends on shared/, talks to background via RPC)
              │
              ▼
8. content/extractor.ts    (depends on shared/types only — kept tiny)
              │
              ▼
9. content/adapters/_base.ts
10. content/adapters/openclaw.ts   ──┐  parallel; each adapter is independent
11. content/adapters/discord.ts    ──┘
              │
              ▼
12. _locales/{zh_CN,en}/messages.json   (driven by t() call sites in 6+7)
              │
              ▼
13. e2e tests              (must run against built dist/, not src/)
```

**Phase-roadmap implications:**

- Phase 1 (foundations): items 1–5 + manifest skeleton + a hello-world popup that successfully RPCs the SW. This is the smallest end-to-end shell.
- Phase 2 (capture): item 6 (capture pipeline only) + item 8 + popup wired to display snapshot. Lands the capture half of Core Value.
- Phase 3 (dispatch + first adapter): item 6 (dispatch pipeline) + items 9, 10 (OpenClaw is the simpler target — known plain-input contract) + popup confirm flow. Lands MVP for OpenClaw.
- Phase 4 (Discord adapter): item 11 — separate phase because Discord/Slate is the hardest DOM target and needs its own research + fixtures.
- Phase 5 (i18n hardening + polish): item 12 + accessibility + history/prompt UX.
- Phase 6+ (v2 platforms): each new adapter = +1 file + +1 host_permission + +1 fixture set.

## Permissions: Principle of Least Privilege

**Required (v1 MVP):**

```json
{
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["http://localhost:18789/*", "https://discord.com/*"]
}
```

- **`activeTab`** — grants temporary host access to the active tab on user gesture (toolbar click). Lets `executeScript(extractor)` run on _any_ page the user invokes us on, without `<all_urls>`. The trick: `activeTab` is sufficient for the **capture** half because the user clicked the toolbar icon (the gesture).
- **`scripting`** — required for `chrome.scripting.executeScript` (MV3).
- **`storage`** — for `chrome.storage.local`.
- **Per-IM `host_permissions`** — required for the **dispatch** half, because we navigate to/inject in a tab the user did _not_ click the icon on. Each new v2 platform adds exactly one entry here. Avoid `<all_urls>` at all costs (Web Store review friction, user-trust friction).

**Not needed:**

- ❌ `tabs` (full Tab object access) — `activeTab` + `host_permissions` cover what we need
- ❌ `<all_urls>`
- ❌ `webNavigation` — `tabs.onUpdated` is sufficient for "navigation complete" detection
- ❌ `nativeMessaging`, `cookies`, `downloads`, `notifications`

**`i18n` permission:** none required (`chrome.i18n` is always available; `default_locale` in manifest is the trigger).

## Scaling Considerations

This is a single-user, single-device extension; "scale" means _codebase scale_ (number of platforms, locales, adapter complexity) rather than user scale.

| Scale                                    | Architecture Adjustments                                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 user, 2 IM platforms (MVP)             | Static adapter registry array. Hand-curated `host_permissions`.                                                                                                 |
| 1 user, ~14 IM platforms (v2)            | Same registry array. Consider grouping `host_permissions` by category in docs. Add `optional_host_permissions` for less-common platforms; request at first use. |
| Future power-user (custom URL templates) | Adapter registry becomes data-driven (read from storage). User-defined target = generic adapter that just does selector-based composition.                      |

### Scaling Priorities

1. **First bottleneck: adapter maintenance churn.** As IM vendors ship UI updates, adapters break silently. Mitigation: each adapter ships with a captured-DOM fixture in `tests/unit/adapters/<id>.fixture.html`. CI runs adapter unit tests. Add an in-popup "test adapter" diagnostic to catch breakage in production.
2. **Second bottleneck: popup bundle size.** Every new locale and every new platform-icon eats KB. Mitigation: import locales lazily; use SVG sprite for platform icons; tree-shake aggressively (Vite default).
3. **Third bottleneck: SW cold-start latency.** First click after browser idle wakes the SW (~200ms). Mitigation: keep the SW entry import graph tiny — defer-load pipelines via dynamic `import()`. Pre-warm only if measurements show user-visible delay.

## Anti-Patterns

### Anti-Pattern 1: Calling `chrome.tabs.sendMessage` directly from the popup

**What people do:** popup queries the active tab and pings the content script directly to grab content.
**Why it's wrong:** popup closes the moment another window gets focus or the user clicks anywhere outside it. Long-running tab message round-trips will land on a dead listener. Also breaks the security boundary (popup ends up needing to know about content-script lifecycles).
**Do this instead:** popup → SW (RPC) → SW does `tabs.sendMessage`. SW is the only privileged caller of `tabs.*`.

### Anti-Pattern 2: Setting `value` / `textContent` on a React-managed composer

**What people do:** `document.querySelector('[role=textbox]').textContent = msg`.
**Why it's wrong:** Discord (Slate), Slack (Lexical), and most modern IMs control the composer via React state. Direct DOM mutation is overwritten on the next render, or worse, accepted visually but discarded on send.
**Do this instead:** Simulate user input. Two reliable techniques:

1. **Clipboard + paste:** `navigator.clipboard.writeText(msg)` then `editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }))`.
2. **Native input setter + InputEvent:** for `<textarea>`-backed editors, use the descriptor trick — `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, msg)` then dispatch `new InputEvent('input', { bubbles: true })`.
   Each adapter picks the technique that matches that platform's editor (documented per-adapter in `content/adapters/_base.ts`).

### Anti-Pattern 3: `<all_urls>` host permission "to keep things simple"

**What people do:** declare `"host_permissions": ["<all_urls>"]` so the dev never has to think about which sites the extension touches.
**Why it's wrong:** Chrome Web Store review friction; install-time warning lists "read all your data on all websites" which crashes install rate; violates MV3's least-privilege ethos.
**Do this instead:** `activeTab` for capture (user-gesture-scoped) + explicit per-IM `host_permissions` for dispatch. Each new platform = one new host entry that the user explicitly approves.

### Anti-Pattern 4: Doing async work _before_ registering SW listeners

**What people do:** `await storage.bootstrap(); chrome.runtime.onMessage.addListener(...)`.
**Why it's wrong:** SW restarts mid-session lose the listener registration; dispatched events are dropped silently. Hard to reproduce, hard to debug.
**Do this instead:** register all listeners synchronously at module top level. Bootstrap inside the listener (lazy) or in a separate, fire-and-forget async block.

### Anti-Pattern 5: Treating the popup as a long-lived state container

**What people do:** keep send history, prompt cache, etc. in popup React state and serialize on unmount.
**Why it's wrong:** popup unmount can be abrupt (focus loss, tab switch). State updates may not flush. Reopening the popup spawns a fresh context.
**Do this instead:** popup is a thin view over `chrome.storage.local`. Every meaningful user action either RPCs the SW or writes to storage immediately. Subscribe via `storage.onChanged`.

### Anti-Pattern 6: Sharing one giant content-script bundle across all adapters

**What people do:** ship a single `content.js` that contains all adapters and runs `if (location.host === 'discord.com') ...`.
**Why it's wrong:** every visit to _any_ of the 14 platforms loads code for the other 13. Doubles your `host_permissions` because the bundle is registered for all hosts. Breaks tree-shaking. Couples adapters together (one breaking adapter breaks all).
**Do this instead:** one bundle per adapter, programmatically injected only at dispatch time on the matched host.

## Integration Points

### External Services (per-IM web targets)

| Service                                                         | Integration Pattern                                            | Notes                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenClaw Web UI (`http://localhost:18789/chat?session=...`)     | Programmatic `executeScript` → adapter → composer DOM          | Local-only; user-controlled UI; expected to be the simplest target. Composer is likely a plain `<textarea>` or a known-stable React form.                                                                                                |
| Discord Web (`https://discord.com/channels/<server>/<channel>`) | Programmatic `executeScript` → adapter → Slate-backed composer | Hard target. Slate intercepts direct DOM writes. Use clipboard-paste simulation; submit via Enter `keydown` event. UI is unstable across Discord redesigns — adapter must use semantic selectors (`role`, `aria-label`) not class names. |
| (v2: Slack, Telegram, Lark, Feishu, Teams, …)                   | Same pattern, one adapter file each                            | Each will have its own editor framework (Lexical, ProseMirror, Quill, plain textarea). Document per-adapter strategy in `content/adapters/<id>.ts` header comment.                                                                       |

### Internal Boundaries

| Boundary                        | Communication                                                                                                        | Notes                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| popup ↔ SW                      | `chrome.runtime.sendMessage` (one-shot RPC) **or** `chrome.runtime.connect` (long-lived port for streaming progress) | Typed by `Message` discriminated union in `shared/types/messages.ts`. Never `chrome.tabs.sendMessage` from popup.                                                       |
| SW ↔ content script (extractor) | `chrome.scripting.executeScript` to inject; `chrome.tabs.sendMessage` for the data round-trip                        | Extractor is single-use; injected on demand; replies once and the script context goes idle until next injection.                                                        |
| SW ↔ content script (adapter)   | Same as extractor: `executeScript` then `tabs.sendMessage(tabId, { type: 'ADAPTER_RUN', message })`                  | Adapter listens for exactly one message, performs `compose+send`, replies, exits.                                                                                       |
| popup → storage                 | Indirect: popup RPCs SW; SW owns `chrome.storage.local` writes                                                       | Read-side: popup may read directly from `chrome.storage.local` (no permission boundary), but **writes** funnel through SW for invariants (LRU history, schema version). |
| any layer → i18n                | Direct `chrome.i18n.getMessage` (synchronous, available everywhere)                                                  | Wrapped in `shared/i18n/t.ts` for type-safety on message keys.                                                                                                          |

## Sources

- [Chrome Extensions Docs — Service Worker Events (top-level listener registration)](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events) — HIGH
- [Chrome Extensions Docs — Messaging (sendMessage, ports, content-script communication)](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) — HIGH
- [Chrome Extensions Docs — chrome.scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) — HIGH
- [Chrome Extensions Docs — chrome.tabs API (onUpdated, query, create, update)](https://developer.chrome.com/docs/extensions/reference/api/tabs) — HIGH
- [Chrome Extensions Docs — chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) — HIGH
- [Chrome Extensions Docs — chrome.i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n) — HIGH
- [Chrome Extensions Docs — Content Scripts manifest configuration (worlds, run_at)](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts) — HIGH
- [Chrome Extensions Docs — activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) — HIGH
- [Mozilla Readability.js (`@mozilla/readability`)](https://github.com/mozilla/readability) — HIGH
- [Slate Editor Discussion #5721 — programmatic text insertion via clipboard simulation](https://github.com/ianstormtaylor/slate/discussions/5721) — MEDIUM (community solution; technique is canonical but adapter-specific)
- [Discord's Slate fork](https://github.com/discord/slate) — MEDIUM (confirms editor framework, informs Discord adapter strategy)
- [Playwright Docs — Chrome extensions testing](https://playwright.dev/docs/chrome-extensions) — HIGH
- [DEV — E2E tests for Chrome extensions with Playwright + CDP](https://dev.to/corrupt952/how-i-built-e2e-tests-for-chrome-extensions-using-playwright-and-cdp-11fl) — MEDIUM (community write-up; technique aligns with official docs)
- [CRXJS Vite plugin — multi-entry bundling for MV3](https://github.com/crxjs/chrome-extension-tools) — MEDIUM (recommended tooling; not strictly required)
- [Chrome Extensions Docs — Migrating to Service Workers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers) — HIGH

---

_Architecture research for: Chrome MV3 Web Clipper + multi-IM dispatch extension_
_Researched: 2026-04-28_
