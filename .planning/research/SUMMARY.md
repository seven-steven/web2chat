# Project Research Summary

**Project:** Web2Chat
**Domain:** Chrome MV3 Web Clipper + multi-IM dispatch automation
**Researched:** 2026-04-28
**Confidence:** HIGH

## Executive Summary

Web2Chat is a Chrome MV3 extension that captures structured page metadata and dispatches it — combined with a user-defined prompt — into IM or AI-Agent chat sessions via content-script DOM injection. The category has established patterns (Mozilla Readability for extraction, WXT for MV3 scaffolding, Preact for lightweight popup UI), but the dispatch half is what no existing clipper does: instead of "save to a vault", Web2Chat's verb is "dispatch to a conversation". The `send_to` ↔ `prompt` binding — where switching the target destination automatically swaps the associated prompt — is the UX moat. No competitor implements it.

The recommended approach is: WXT 0.20.x as the extension framework (Vite-native, MV3-first, typed i18n, built-in storage), Preact for the popup, `@mozilla/readability` for content extraction, and a strongly-typed `IMAdapter` interface backed by per-platform content-script bundles that are programmatically injected only at dispatch time. The service worker acts as the single privileged hub — popup and content scripts never communicate directly. All state lives in `chrome.storage.local` (or `.session` for in-flight dispatch lifecycle); nothing in module-scope survives a SW restart.

The dominant risks are: (1) the SW dying mid-dispatch on a slow-loading SPA tab, (2) React-controlled or Lexical/Slate editors silently discarding injected text, and (3) Chrome Web Store rejection from broad `host_permissions`. All three have well-documented mitigations that must be baked in from Phase 1, not retrofitted.

---

## Key Findings

### Recommended Stack

WXT is the unambiguous 2026 choice for MV3 development. It generates the manifest, provides HMR for all entrypoints, ships a typed storage and i18n layer, and has first-party Playwright integration for E2E testing. Preact keeps the popup under the ~100 KB budget (4 KB runtime vs React's ~30 KB). `@wxt-dev/i18n` is mandatory: it is the only solution that localizes `manifest.json` fields, generates typed message keys, and requires no async init.

**Core technologies:**

- `wxt@^0.20.25` — extension framework (manifest gen, HMR, storage, i18n, Playwright wiring)
- `vite@^7` (transitive) — bundler; do not install directly
- `typescript@^5.6` — typed adapter contracts; WXT generates `.wxt/` types automatically
- `preact@^10.29.1` + `@preact/signals@^2` — popup UI and reactive state; 4 KB runtime
- `@wxt-dev/i18n@^0.2.5` — typed `chrome.i18n` wrapper; use over i18next (which can't localize manifest fields)
- `@mozilla/readability@^0.6.0` — main-content extraction; pass `document.cloneNode(true)`, never the live document
- `defuddle@^0.17.0` — supplementary extractor for non-article pages (Reddit, YouTube, GitHub); zero deps in browser bundle
- `dompurify@^3.2.0` — sanitize Readability/Defuddle output before storage; Readability does NOT sanitize
- `turndown@^7.2.0` + `turndown-plugin-gfm` — HTML to Markdown for IM payloads
- `zod@^3.24.0` — runtime validation on all cross-context message payloads
- `WxtStorage` (bundled) — typed `chrome.storage.local` wrapper; use `storage.defineItem<T>`
- `vitest@^3.2.4` + `happy-dom@^15` — unit tests; WXT ships `wxt/testing/fake-browser`
- `@playwright/test@^1.58.0` — E2E tests via `chromium.launchPersistentContext + --load-extension`
- `tailwindcss@^4` — popup styling (MEDIUM confidence; vanilla CSS modules is the safe fallback)

**Do not use:** Plasmo (Parcel-based, slowing), `webextension-polyfill` (WXT already bundles `@wxt-dev/browser`), `i18next` (async init, can't localize manifest), `innerText=` or `document.execCommand` for editor injection, `<all_urls>` host permission, `localStorage` in popup.

### Expected Features

**Must have — table stakes (v1.0):**

- Click-to-popup with metadata preview: `title`, `url`, `description`, `create_at`, `content` via Readability
- `send_to` input with platform-icon recognition by URL pattern (adapter registry, not hardcoded if/else)
- `send_to` history with MRU autocomplete dropdown (hybrid recency + frequency ranking)
- `prompt` input with independent history autocomplete
- `send_to` ↔ `prompt` binding: switching target auto-swaps prompt
- OpenClaw adapter: `http://localhost:18789/chat?session=agent:<a>:<s>` (plain input injection)
- Discord adapter: `https://discord.com/channels/<g>/<c>` (Slate/React-controlled editor)
- Dispatch confirm with graceful failure: `canDispatch` probe, error reasons, retry button
- Keyboard shortcut (`commands` API, user-rebindable)
- i18n: `en` + `zh_CN` from day 1 (`@wxt-dev/i18n`, no hardcoded strings)
- All state in `chrome.storage.local` with schema versioning

**Should have — differentiators (v1.x after validation):**

- Per-destination message templates with `{{title}}`, `{{url}}`, `{{content}}`, `{{prompt}}` variables
- Queue + retry on dispatch failure (persisted to `chrome.storage.local`, `chrome.alarms` wakeup)
- Multi-target fan-out (sequential, max 5, ≥1.5s gap between sends — avoid Discord rate guards)
- Page-region clipping (selection + element picker)
- Bulk export of history (JSON / Markdown blob download)
- Diagnostics page ("why didn't it send?" — structured error codes surfaced per dispatch)
- Smart prompt suggestions by detected page type (Schema.org `@type` + URL heuristics, fully local)

**Defer to v2+:**

- Tier-A IM platforms (DOM injection confirmed): Telegram Web, Slack (Quill editor), Zalo
- Tier-B IM platforms (best-effort / fragile): Microsoft Teams, Google Chat, Feishu/Lark, Nextcloud Talk
- Deep-link-only platforms: WhatsApp (`https://wa.me/...?text=` — DOM injection is ban risk), LINE (no real web client)
- Unsupported (document why): Signal (no web client by design), WeCom (deprecated web), QQ (no web chat)
- Adapter SDK for community-contributed platforms
- Firefox/Edge port (post WebExtension parity audit)
- Custom template editor UI, history search, config import/export

**Anti-features (explicit non-goals):**

- Cloud sync / user accounts — local-first is the privacy positioning
- AI summarization inside the extension — downstream Agent's job
- Server-side Bot APIs / OAuth token management — no backend, ever
- OCR / image attachment extraction — v2 at earliest
- RSS / scheduled clipping — out of scope, different product category
- Bulk-broadcast to contacts CSV — spam risk, Web Store removal risk

### Architecture Approach

The architecture is a single-hub service worker acting as the privileged coordinator for two pipelines: (1) capture (popup → SW → `executeScript(extractor)` → `ArticleSnapshot`) and (2) dispatch (popup → SW → open/activate tab → wait `onUpdated: complete` → `executeScript(adapter)` → `tabs.sendMessage` → compose+send → result). The popup is a thin view over `chrome.storage.local` — it holds no state that must survive a close. Content scripts are programmatically injected at dispatch time (not declared in `content_scripts`), keeping each adapter isolated and `host_permissions` narrow.

**IMAdapter contract (canonical TypeScript interface):**

```ts
export interface IMAdapter {
  readonly id: PlatformId;
  match(url: string): boolean;
  waitForReady(timeoutMs?: number): Promise<void>;
  compose(message: string): Promise<void>;
  send(): Promise<void>;
}
```

**Major components:**

1. `background/service-worker.ts` — top-level listener registration only; all async work inside handlers
2. `background/capture-pipeline.ts` — orchestrates extractor injection + snapshot return
3. `background/dispatch-pipeline.ts` — tab open/activate, `onUpdated` wait, adapter inject, result relay; uses `chrome.storage.session` to survive SW restarts
4. `background/adapter-registry.ts` — array of `{ id, match(url), scriptFile, hostMatches }`; SW never imports adapter bundles directly
5. `content/extractor.ts` — standalone IIFE injected on source tab; runs Readability on `document.cloneNode(true)`
6. `content/adapters/<platform>.ts` — one bundle per platform implementing `IMAdapter`; injected only at dispatch time
7. `shared/` — pure TS types, typed messaging wrappers, storage repo, `t()` i18n facade; no `chrome.*` at module top level
8. `popup/` — Preact SPA; reads from storage via `onChanged`, RPCs the SW for capture and dispatch

**Permissions (v1):** `activeTab` + `scripting` + `storage` + exact `host_permissions` per adapter. Never `<all_urls>`.

### Top 5 Pitfalls

1. **React-controlled input setter** — `input.value =` fires no `onChange`. Prevention: use `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, text)` then dispatch `new Event('input', { bubbles: true })`. Put this in a shared `dom-injector` helper used by every adapter.

2. **Lexical/Slate editors ignore DOM mutations (Discord)** — direct `textContent` assignment is reconciled away. Prevention: dispatch `new ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })` with `dt.setData('text/plain', text)`. Verify injection survived one rAF tick via `MutationObserver` before declaring compose complete. Never trust a single technique — cascade paste → InputEvent → main-world bridge.

3. **Service worker dies mid-dispatch** — SW terminates after ~30s idle; in-flight closures vanish. Prevention: write dispatch payload to `chrome.storage.session` keyed by `tabId` before opening the tab. Re-register all listeners at module top level on every SW wake. Use `chrome.alarms` for deferred work, never `setInterval`.

4. **Top-level `await` in the SW** — disabled in MV3 SWs; causes silent registration failure or race on first event. Prevention: treat SW as stateless on every wake; read from storage inside handlers, not at module scope; wrap shared init behind a memoized `getReady()` awaited inside each listener body.

5. **SPA route race on Discord** — `chrome.tabs.onUpdated` does not fire for `history.pushState` navigations; adapter injects before channel state catches up. Prevention: `waitForReady` must wait for a channel-specific anchor (e.g., `[data-list-id="chat-messages-<channelId>"]`) via `MutationObserver`, not just the input element. Use `chrome.webNavigation.onHistoryStateUpdated` to detect SPA transitions.

**Bonus — Web Store rejection** — `<all_urls>`, missing privacy policy, or any remote code path triggers rejection. Prevention: `activeTab` for capture + explicit `host_permissions` per adapter + privacy policy from day 1 (page URL/title/description/body captured, stored locally, never transmitted except to user-chosen IM via direct navigation).

---

## Implications for Roadmap

### Phase 1: Extension Skeleton

**Rationale:** Everything depends on a correctly-wired MV3 skeleton. SW lifecycle traps (Pitfalls 3, 4) must be designed out before any feature code is written on top. Fixing these later requires rewriting every listener registration site.
**Delivers:** WXT scaffold, manifest with `activeTab + scripting + storage`, top-level listener registration pattern, typed messaging protocol, storage schema v1, `@wxt-dev/i18n` wired with `en` + `zh_CN`, popup hello-world that successfully RPCs the SW and reads back from storage.
**Avoids:** Pitfall 4 (top-level await), Pitfall 9 (broad permissions), Pitfall 11 (i18n retrofit).

### Phase 2: Capture Pipeline

**Rationale:** The "popup shows the page" half of Core Value must be independently shippable and testable before dispatch is built. Readability extraction and OG/Schema.org metadata parsing are low-risk, well-documented, and validate the popup ↔ SW ↔ content-script messaging chain.
**Delivers:** `content/extractor.ts` (Readability + DOMPurify + Turndown), `capture-pipeline.ts`, popup metadata preview with `title / url / description / create_at / content`, Vitest unit tests for extraction logic.
**Uses:** `@mozilla/readability`, `defuddle`, `dompurify`, `turndown`.

### Phase 3: Dispatch Core + Popup UI

**Rationale:** The dispatch pipeline and popup form are co-dependent: popup sends the dispatch RPC; dispatch pipeline must handle tab open/activate, SW-restart-safe state, idempotency, login-wall detection, and graceful failure. Building the popup `send_to` + `prompt` forms at the same time locks in the storage-backed draft persistence pattern (Pitfall 10) and the `send_to` ↔ `prompt` binding (Core Value).
**Delivers:** `dispatch-pipeline.ts` with `chrome.storage.session` state machine and idempotency key, `adapter-registry.ts`, `SendForm` + `HistoryDropdown` + `PromptPicker` components, `send_to` ↔ `prompt` binding via `@preact/signals`, storage-backed draft restore on popup reopen, dispatch lifecycle badge on toolbar icon.
**Avoids:** Pitfall 3 (SW death), Pitfall 7 (login wall), Pitfall 8 (double-send), Pitfall 10 (popup state loss).

### Phase 4: OpenClaw Adapter

**Rationale:** OpenClaw is user-controlled, uses a plain textarea/input, and has a stable URL pattern — the simplest possible dispatch target. Shipping it first proves the full capture → dispatch → confirm chain end-to-end before tackling Discord's complex editor. Establishes the selector hierarchy and `canDispatch` probe pattern for all future adapters.
**Delivers:** `content/adapters/openclaw.ts`, property-descriptor setter + bubbling `input` event helper in `_base.ts`, Playwright E2E test covering the full send chain, `canDispatch` probe with "server not running" error state.
**Research flag:** None — OpenClaw is user-controlled; URL pattern is documented in PROJECT.md.

### Phase 5: Discord Adapter

**Rationale:** Discord is the hardest MVP target (Slate-backed editor, obfuscated classes, SPA routing, login wall, self-bot ToS). It gets its own phase because it needs DOM fixture captures, synthetic paste verification, and SPA route-change handling that would dilute Phase 4.
**Delivers:** `content/adapters/discord.ts` with ClipboardEvent paste injection, ARIA-first selector hierarchy, SPA `onHistoryStateUpdated` handling, post-send DOM verification, 5s hard timeout with structured error, rate-limit guard (reject < 5s cadence), Discord-specific risk disclosure in README.
**Avoids:** Pitfall 2 (Lexical/Slate injection), Pitfall 5 (SPA race), Pitfall 6 (class brittleness), Pitfall 12 (Discord ToS).
**Research flag:** Discord ships weekly; adapter selectors should be re-verified against a fresh DOM snapshot before release.

### Phase 6: Polish, i18n Hardening, and Accessibility

**Rationale:** i18n setup exists from Phase 1, but all UI copy must be audited against the `__MSG_*__` HTML limitation (Pitfall 11) and the no-plural-rules constraint. First-run onboarding, error message humanization, keyboard shortcut conflict check, and popup layout polish belong here.
**Delivers:** JS-based `data-i18n` substitution helper, custom locale loader for runtime zh↔en switch, ESLint rule banning hardcoded strings in JSX, first-run onboarding screen, human-readable error messages for all adapter error codes, action-icon badge state.

### Phase 7: Distribution

**Rationale:** Web Store submission requires manifest correctness, a published privacy policy, and a reviewer test environment — none of which can be retrofitted after submission.
**Delivers:** packed `.zip` build verified locally, privacy policy (URL/title/description/content captured locally, never transmitted), Web Store listing with test server credentials, `optional_host_permissions` in manifest for future v2 platforms, pre-submission checklist from PITFALLS.md §Pitfall 9.
**Avoids:** Pitfall 9 (Web Store rejection).

### Phase 8+: V2 Platforms

**Rationale:** After MVP is validated, add Tier-A platforms (Telegram Web, Slack, Zalo) sequentially — each needs its own adapter file, host permission, and DOM fixture set. Tier-B (Teams, Google Chat, Feishu/Lark) requires scoped research before committing.
**Note on Slack editor conflict:** FEATURES.md has source-code evidence (Slack Markdown Proxy extension) that Slack uses Quill, not Lexical as stated elsewhere. Go with Quill (`editor.clipboard.dangerouslyPasteHTML` or `editor.insertText` in MAIN world).

### Phase Ordering Rationale

- **Shared types and storage schema first** — every layer imports them; changing the schema later forces migration code across all contexts.
- **i18n wired in Phase 1, not bolted on** — retrofitting i18n means touching every UI string; PITFALLS.md and PROJECT.md both call this out explicitly.
- **OpenClaw before Discord** — validates the full dispatch chain against a friendly target before the hardest DOM target.
- **Discord in its own phase** — the Slate injection problem, SPA race, and ToS disclosure together justify the isolation.
- **Distribution last but manifest correct from Phase 1** — `host_permissions` architecture must be right from day 1; `<all_urls>` even temporarily will require a permission-upgrade prompt to existing users (spikes uninstall rate).

### Research Flags

Phases needing deeper research during planning:

- **Phase 5 (Discord Adapter):** Verify current selector hierarchy against a fresh Discord DOM before implementing. Discord ships weekly. Capture a fixture HTML at planning time.
- **Phase 8+ Tier-B (Teams, Google Chat, Feishu/Lark):** All three are marked HIGH complexity in FEATURES.md; each needs a dedicated research spike before roadmap commitment.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Skeleton):** WXT scaffold, MV3 manifest, listener registration — fully documented in WXT + Chrome docs.
- **Phase 2 (Capture):** Readability + OG extraction — mature, well-documented, no unknowns.
- **Phase 4 (OpenClaw):** User-controlled app; URL pattern known; plain input injection documented.
- **Phase 7 (Distribution):** Chrome Web Store process is well-documented; follow the pre-submission checklist.

---

## Confidence Assessment

| Area         | Confidence                              | Notes                                                                                                                          |
| ------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Stack        | HIGH                                    | All versions verified on npm and Context7 within 30 days; WXT/Preact/Vitest/Playwright are the unambiguous community consensus |
| Features     | HIGH (MVP) / MEDIUM (v2 IM feasibility) | Table stakes and differentiators are well-grounded; per-platform DOM feasibility depends on vendor DOM changes                 |
| Architecture | HIGH                                    | Chrome MV3 APIs are authoritative; SW lifecycle, message passing, and adapter pattern are documented with official sources     |
| Pitfalls     | HIGH                                    | All critical pitfalls sourced from official Chrome docs, verified GitHub issues, and multiple independent confirmations        |

**Overall confidence:** HIGH for MVP scope; MEDIUM for v2 IM platform specifics (DOM contracts drift).

### Gaps to Address

- **OpenClaw editor type:** PROJECT.md says "likely contenteditable / textarea" — confirm at Phase 4 planning by inspecting the actual OpenClaw Web UI source. If it is a React-controlled input, apply the property-descriptor setter; if a plain textarea, standard `.value=` + `Event('input')` works.
- **Discord adapter selectors:** Must be re-verified against a live Discord DOM snapshot at Phase 5 planning time. The ARCHITECTURE.md fixture pattern (capture DOM snapshot into `tests/unit/adapters/discord.fixture.html`) is the right mitigation.
- **Tailwind v4 stability:** MEDIUM confidence — if integration issues surface during Phase 1 scaffold, fall back to vanilla CSS modules with zero rework.
- **Slack editor (Quill vs Lexical):** FEATURES.md has source-code evidence for Quill (Slack Markdown Proxy). Go with Quill for the v2 Slack adapter. Note in the adapter README.

---

## Sources

### Primary (HIGH confidence)

- Chrome MV3 official docs — service worker lifecycle, messaging, scripting API, activeTab, storage, i18n
- `/wxt-dev/wxt` (Context7) — entrypoints, storage, i18n, testing plugin
- `/mozilla/readability` (Context7) — parse API, document clone requirement
- `/microsoft/playwright` (Context7) — `launchPersistentContext` MV3 fixture pattern
- `/facebook/lexical` (Context7) — paste handler, ClipboardEvent.clipboardData requirement
- npm registry (2026-04) — version verification for all pinned packages

### Secondary (MEDIUM confidence)

- Slate GitHub issues #5603, #5721 — InputEvent and clipboard simulation patterns
- Slack Markdown Proxy extension source — confirms Slack uses Quill, not Lexical
- Framework comparison articles (2025-2026) — WXT vs Plasmo vs CRXJS consensus
- `defuddle@^0.17.0` (Context7/kepano) — Obsidian Web Clipper use case alignment

### Tertiary (context-dependent)

- Per-IM platform feasibility assessments — based on community extensions and reverse engineering; DOM contracts drift and must be re-verified per phase

---

_Research completed: 2026-04-28_
_Ready for roadmap: yes_
