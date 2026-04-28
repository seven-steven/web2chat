# Roadmap: Web2Chat

## Overview

Web2Chat is a Chrome MV3 extension that captures structured page metadata + content and dispatches it, paired with a user-defined prompt, into a target IM / AI-Agent chat session via content-script DOM injection. The journey is foundation-first: build a correctly-wired MV3 skeleton (with i18n + storage + typed messaging baked in from day one), prove the capture half independently, then layer on the dispatch core + popup UX. Two adapter phases (OpenClaw — friendly target, then Discord — hardest target) validate the full chain end-to-end. i18n hardening + UX polish gather the loose ends; distribution closes with a Web Store-ready package, privacy policy, and bilingual README. Coverage is 46/46 v1 requirements across 7 phases.

## Phases

**Phase Numbering:**

- Integer phases (1–7): Planned milestone work for v1.0
- Decimal phases (e.g., 2.1): Reserved for urgent insertions discovered during execution

- [ ] **Phase 1: Extension Skeleton (Foundation)** - WXT-based MV3 scaffold with typed messaging, storage schema, and i18n wired from day one
- [ ] **Phase 2: Capture Pipeline** - Click-to-popup metadata + Readability content extraction with sanitisation
- [ ] **Phase 3: Dispatch Core + Popup UI** - Tab open/inject orchestration, send_to ↔ prompt binding, draft persistence, lifecycle badge
- [ ] **Phase 4: OpenClaw Adapter** - First end-to-end dispatch chain validated against the friendly local target
- [ ] **Phase 5: Discord Adapter** - Slate/Lexical-aware paste injection, SPA route handling, ToS-aware rate limiter
- [ ] **Phase 6: i18n Hardening + Polish** - Runtime locale switch, ESLint hardcoded-string ban, settings panel, error-message humanisation
- [ ] **Phase 7: Distribution** - Web-Store-ready zip, privacy policy, optional_host_permissions for v2, bilingual README

## Phase Details

### Phase 1: Extension Skeleton (Foundation)

**Goal**: A correctly-wired Chrome MV3 extension that loads in `chrome://extensions`, shows a popup hello-world via i18n, and round-trips a typed message through service-worker ↔ popup with a versioned storage schema in place.
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, STG-01, STG-02
**Success Criteria** (what must be TRUE):

1. The unpacked WXT build loads via `chrome://extensions → Load unpacked` and shows the toolbar action icon, with manifest declaring only `activeTab` + `scripting` + `storage` (no `<all_urls>`); reviewer can read this from `dist/manifest.json`.
2. Clicking the action icon opens a popup that displays a hello-world string sourced from `_locales/en/messages.json` AND `_locales/zh_CN/messages.json` (verified by switching the browser locale and reloading the extension).
3. The popup successfully RPCs the service worker via the typed `zod`-validated message protocol and renders a value read back from `chrome.storage.local` (proves popup ↔ SW ↔ storage chain end-to-end).
4. Killing the service worker via `chrome://extensions → Service worker → Stop` and re-clicking the icon still produces a working RPC (proves listeners are registered at module top-level, no top-level await, no module-scoped state assumed).
5. `vitest` and `@playwright/test` (with `chromium.launchPersistentContext --load-extension`) run green; CI workflow asserts the build artefact has zero references to `<all_urls>` and zero hardcoded user-visible strings in popup TSX.

**Plans**: TBD
**UI hint**: yes

### Phase 2: Capture Pipeline

**Goal**: Clicking the action icon on any web page produces an `ArticleSnapshot` (`title`, `url`, `description`, `create_at`, `content`) that is rendered in the popup with loading / empty / error states clearly distinguished, and the user can edit `title` / `description` / `content` before dispatching.
**Depends on**: Phase 1
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04, CAP-05
**Success Criteria** (what must be TRUE):

1. On clicking the action icon on a representative article URL (e.g., a Wikipedia or blog post), the popup shows all five fields populated within 2s of click; verified by Playwright on a local fixture page.
2. The captured `content` is sanitised by DOMPurify and converted to Markdown by Turndown — Vitest unit test asserts no `<script>` survives and Markdown round-trip preserves headings, code blocks, and links.
3. `description` resolves through the documented fallback chain (`<meta name="description">` → `og:description` → Readability `excerpt`) — three Vitest fixture pages (one per branch) prove each path.
4. `create_at` is generated as an ISO-8601 timestamp by the SW at click time (not derived from the page) — asserted by snapshot test against a frozen `Date.now()` mock.
5. Popup explicitly renders `loading`, `empty` (extractor returned no main content), and `error` (executeScript threw) states; user can edit `title` / `description` / `content` and the edited values appear in the next dispatch payload (proven by Playwright).

**Plans**: TBD
**UI hint**: yes

### Phase 3: Dispatch Core + Popup UI

**Goal**: Popup form (send_to + prompt + send_to ↔ prompt binding + history dropdowns) drives an idempotent, SW-restart-resilient dispatch pipeline that opens/activates the target tab, waits for `complete`, and is ready to hand off to a per-platform adapter; lifecycle is visible via toolbar badge and recoverable across popup close + SW restart.
**Depends on**: Phase 1
**Requirements**: DSP-01, DSP-02, DSP-03, DSP-04, DSP-05, DSP-06, DSP-07, DSP-08, DSP-09, DSP-10, STG-03
**Success Criteria** (what must be TRUE):

1. Typing a URL into the `send_to` input shows the matching platform icon (OpenClaw / Discord / generic-fallback) within one keystroke debounce; Vitest unit test on `platformDetector` covers every adapter regex.
2. The `send_to` history dropdown ranks entries by MRU + frequency; `prompt` switches automatically when the user picks a different `send_to` entry (the binding); user override of `prompt` after switching is preserved into the next history record. Playwright E2E asserts: pick A → prompt = pa → pick B → prompt = pb → pick A again → prompt = pa.
3. Clicking "Confirm" generates a UUID `dispatchId`, writes the payload + status (`pending` → `opening` → `awaiting_complete` → `awaiting_adapter`) to `chrome.storage.session` keyed by `dispatchId`, and surfaces lifecycle progress on the toolbar action icon as a badge (`...` / `ok` / `err`). Killing the SW between `opening` and `awaiting_complete` and reawakening it via the next `tabs.onUpdated` event picks up the same `dispatchId` from `storage.session` (Playwright E2E with `chrome.runtime.reload` proxy).
4. Repeating Confirm for the same `dispatchId` (rapid double-click, popup reopened) refuses to re-inject — exactly one execution recorded in `storage.session` log; verified by Playwright with two consecutive clicks within 200ms.
5. Closing and reopening the popup mid-edit restores `send_to` / `prompt` / edited `content` from a debounced storage-backed draft (DSP-09); structured error codes (`NOT_LOGGED_IN` / `INPUT_NOT_FOUND` / `TIMEOUT` / `RATE_LIMITED`) round-trip to the popup with i18n-localised human messages and a `Retry` button (DSP-07/08); the `commands` shortcut (`Ctrl+Shift+S` default, user-rebindable) opens the popup and triggers capture (DSP-10); settings panel exposes a confirm-dialog "Reset all history" action that empties send_to / prompt / bindings (STG-03).

**Plans**: TBD
**UI hint**: yes

### Phase 4: OpenClaw Adapter

**Goal**: A user clicks the action icon on any page, picks an OpenClaw `http://localhost:18789/chat?session=agent:<a>:<s>` target with a prompt, and a formatted message lands in the live OpenClaw session within 5s, with the popup reflecting success — first end-to-end proof of the dispatch chain against a friendly target.
**Depends on**: Phase 3
**Requirements**: ADO-01, ADO-02, ADO-03, ADO-04, ADO-05, ADO-06
**Success Criteria** (what must be TRUE):

1. `host_permissions` for the OpenClaw bundle contain exactly `http://localhost:18789/*` (asserted by a manifest-validation test); no broader permission introduced.
2. `match()` recognises the OpenClaw URL pattern and parses `agent_name` + `session_name` from the query — Vitest unit test covers valid, malformed, and trailing-slash variants.
3. `compose()` writes the formatted message into the OpenClaw textarea via the property-descriptor setter + bubbling `input` event helper (`shared/dom-injector.ts`); a Vitest test on a JSDOM fixture proves a React-controlled `<textarea>` would also accept this path (forward-compatible).
4. `send()` triggers Enter keydown / send-button click and a `MutationObserver` confirms the new message bubble appears in the OpenClaw conversation stream before resolving — verified by a Playwright E2E test that runs against a locally-stubbed OpenClaw page (or the live server when available); the full chain (popup confirm → message in conversation) completes within 5s on the test fixture.
5. `canDispatch` probe distinguishes "OpenClaw server not running" (connection refused) from "input not found" and surfaces the structured error `OPENCLAW_OFFLINE` with an i18n-localised human message ("OpenClaw is not running on localhost:18789 — start it and retry"); Playwright covers the offline path.

**Plans**: TBD
**UI hint**: no

### Phase 5: Discord Adapter

**Goal**: With the user logged in to Discord in the same browser profile, a dispatch from any page lands a formatted message in the chosen `https://discord.com/channels/<g>/<c>` channel via synthetic ClipboardEvent paste injection, with rate limiting, login-wall detection, and a documented ToS risk disclosure.
**Depends on**: Phase 3 (sequencing recommendation: run after Phase 4 finalises the `IMAdapter` contract; do not parallelise with Phase 4 unless the adapter contract — `match` / `waitForReady` / `compose` / `send` and the `canDispatch` probe shape — is fully frozen)
**Requirements**: ADD-01, ADD-02, ADD-03, ADD-04, ADD-05, ADD-06, ADD-07, ADD-08, ADD-09
**Success Criteria** (what must be TRUE):

1. `host_permissions` for the Discord bundle contain exactly `https://discord.com/*` and `match()` correctly parses `server_id` + `channel_id` from valid URLs while rejecting `/channels/@me/...` DM routes and login redirects.
2. `compose()` injects via synthetic `ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })`; a Vitest unit test against a captured `tests/unit/adapters/discord.fixture.html` proves the ARIA-prioritised selectors (`role="textbox"` + `aria-label`, then `[data-slate-editor="true"]`, then class fragment as last resort) resolve to a single element and the paste survives one `requestAnimationFrame` tick.
3. `waitForReady` listens for `chrome.webNavigation.onHistoryStateUpdated` and resolves on a channel-specific anchor (e.g., `[data-list-id="chat-messages-<channelId>"]`) appearing in the DOM, with a 5s hard timeout that returns a structured `TIMEOUT` error; rapid back-to-back dispatches to two different channels never cross-inject (Playwright E2E with channel switch).
4. The rate-limit guard rejects a second dispatch to the same `channel_id` within 5 seconds with `RATE_LIMITED` and an i18n-localised human message; popup carries a permanent footnote linking to the Discord ToS risk disclosure.
5. The "logged out" path (cookies cleared) detects the `/login?redirect_to=...` redirect and surfaces `NOT_LOGGED_IN` instead of hanging the popup; the README + popup footnote both reference the Discord ToS risk in zh_CN and en.

**Plans**: TBD
**UI hint**: no

### Phase 6: i18n Hardening + Polish

**Goal**: Every user-visible string in the extension flows through the typed i18n facade, the user can switch locale at runtime without reloading the extension, manifest fields are localised, and an ESLint rule prevents any future hardcoded strings from regressing the project.
**Depends on**: Phase 1 (i18n framework already in place since Phase 1; this phase audits coverage and adds runtime switching + lint enforcement)
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04
**Success Criteria** (what must be TRUE):

1. `pnpm test:i18n-coverage` (or equivalent CI check) asserts `_locales/zh_CN/messages.json` and `_locales/en/messages.json` define every key referenced by `t()` calls in the codebase — coverage = 100% for both locales, including all adapter error messages from Phase 4 + Phase 5.
2. The settings panel exposes a "Language" picker (zh_CN / en); switching it updates every popup string immediately on the next render via a custom locale loader (not relying on `chrome.i18n` browser-locked locale), and the choice persists in `chrome.storage.local` across popup reopen and SW restart.
3. `manifest.json` `name`, `description`, and `default_title` use `__MSG_*__` placeholders that resolve correctly in both `chrome.management.getSelf()` and the `chrome://extensions` listing under either locale.
4. The flat-config ESLint rule banning JSX/TSX string-literal user-visible text (CJK + capitalised English heuristic) runs in CI and blocks any future hardcoded string; verified by a fixture commit that intentionally adds `<button>Send</button>` and lints red.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Distribution

**Goal**: A reviewer can install Web2Chat from a packed zip, read a privacy policy that matches the actual data handling, see narrow `host_permissions` (with `optional_host_permissions` reserved for v2 platforms), and follow a bilingual README that documents installation, usage, OpenClaw setup, and the Discord ToS caveat.
**Depends on**: Phase 4, Phase 5, Phase 6
**Requirements**: DST-01, DST-02, DST-03, DST-04
**Success Criteria** (what must be TRUE):

1. `pnpm build && pnpm zip` produces a Chrome-Web-Store-compatible `.zip` that, when uploaded to the dashboard's "Upload draft" or loaded locally via `chrome://extensions → Load unpacked` on the unzipped output, passes manifest validation and runs the Phase 4 + Phase 5 happy-path Playwright E2Es untouched.
2. `PRIVACY.md` (committed in repo and linked from README + Web Store listing description) explicitly enumerates the captured fields (`url` / `title` / `description` / `create_at` / `content` / user-entered `prompt`), states they are stored only in `chrome.storage.local` / `chrome.storage.session`, and never transmitted to any third party except the user-chosen IM via direct browser navigation.
3. `manifest.json` `host_permissions` contains only `http://localhost:18789/*` and `https://discord.com/*`; `optional_host_permissions` is declared as an empty array (or with a documented placeholder) so v2 adapters can request hosts at install/use time without forcing existing users through a permission upgrade prompt.
4. `README.md` in the repo root has both `zh_CN` and `en` sections covering: install (load unpacked + future Web Store link), usage (action icon, popup form, send_to history), platform-specific notes (OpenClaw must run locally; Discord ToS caveat from Phase 5), and a `## Limitations` section listing the v2-deferred platforms with rationale; a markdown lint check verifies both language anchors exist.

**Plans**: TBD
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7. Phase 6 has only Phase 1 as a hard dependency, but the i18n audit requires UI surfaces from Phase 3 + adapter error messages from Phases 4–5 to be exhaustive, so it is sequenced after Phase 5. Phase 4 and Phase 5 can theoretically run in parallel only if the `IMAdapter` contract is frozen at the end of Phase 3 — the recommended ordering keeps them sequential to absorb contract refinements from the OpenClaw learnings.

| Phase                       | Plans Complete | Status      | Completed |
| --------------------------- | -------------- | ----------- | --------- |
| 1. Extension Skeleton       | 0/TBD          | Not started | -         |
| 2. Capture Pipeline         | 0/TBD          | Not started | -         |
| 3. Dispatch Core + Popup UI | 0/TBD          | Not started | -         |
| 4. OpenClaw Adapter         | 0/TBD          | Not started | -         |
| 5. Discord Adapter          | 0/TBD          | Not started | -         |
| 6. i18n Hardening + Polish  | 0/TBD          | Not started | -         |
| 7. Distribution             | 0/TBD          | Not started | -         |

---

_Roadmap created: 2026-04-28_
_Coverage: 46/46 v1 requirements mapped (100%)_
