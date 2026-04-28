# Stack Research

**Domain:** Chrome MV3 Web Clipper extension that injects formatted page content + user prompt into third-party IM / AI-Agent web chat UIs via content-script DOM manipulation
**Researched:** 2026-04-28
**Confidence:** HIGH (all framework / library versions verified against npm + Context7 within the last 30 days)

---

## TL;DR — The 2026 Standard Stack

> **WXT + Vite + TypeScript + Preact + @wxt-dev/i18n + @mozilla/readability + Vitest + Playwright**

This is the prescriptive stack for Web2Chat. Rationale, alternatives, and "do not use" entries follow.

---

## Recommended Stack

### Core Technologies

| Technology           | Version                       | Purpose                                                                                                                              | Why Recommended                                                                                                                                                                                                                                                                          |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WXT**              | `^0.20.25`                    | Extension framework — file-based entrypoints, MV3 manifest generator, Vite-native HMR, cross-browser polyfill, `wxt prepare` typegen | Established 2025–2026 leader for MV3 dev experience. Built on Vite, generates `manifest.json` from typed entrypoints, ships with `browser.*` polyfill (Promise-based), HMR for popup/content/background, and a first-party storage / i18n / messaging module ecosystem. Confidence: HIGH |
| **Vite**             | `^7.0.0` (transitive via WXT) | Bundler + dev server                                                                                                                 | Vite is the build engine WXT, CRXJS, and modern extension tooling have standardized on (Plasmo's reliance on Parcel is the main reason it has fallen behind). No need to install directly — WXT pins it. Confidence: HIGH                                                                |
| **TypeScript**       | `^5.6.0`                      | Static typing across popup, background, content scripts, shared modules                                                              | Mandatory for adapter contracts (each IM platform = one strongly-typed adapter); WXT defaults to TS and generates `.wxt/` types automatically. Confidence: HIGH                                                                                                                          |
| **Preact**           | `^10.29.1`                    | Popup UI rendering                                                                                                                   | Popup ships in <100 KB total bundle (logo + i18n + UI + Readability is the budget). Preact 10.x is stable, gets Jan-2026 security patch (10.28.2+), and exposes the same JSX/hooks API as React with a 4 KB runtime. WXT has a first-party Preact template. Confidence: HIGH             |
| **@preact/signals**  | `^2.0.0`                      | Popup state (send_to history, prompt binding, language)                                                                              | Signals avoid full re-renders for the prompt↔send_to coupling described in PROJECT.md "send_to / prompt 绑定" requirement. Lighter than Zustand for a 3-screen popup. Confidence: HIGH                                                                                                   |
| **@wxt-dev/browser** | `^0.1.40`                     | Cross-browser `browser.*` namespace built on `@types/chrome`                                                                         | Bundled with WXT; gives Promise-based APIs in Chrome, no need to install `webextension-polyfill` separately for v1 (Chrome-only). Confidence: HIGH                                                                                                                                       |

### Supporting Libraries

| Library                   | Version          | Purpose                                                                                                                                                 | When to Use                                                                                                                                                                                                                                                                                         |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **@wxt-dev/i18n**         | `^0.2.5`         | Typed wrapper over `chrome.i18n.getMessage`, generates `_locales/{lang}/messages.json` + `wxt-i18n-structure.d.ts` from a single source file            | Mandatory per PROJECT.md "i18n 国际化：至少支持 zh / en". Loads sync, no extra bundle, typed keys catch missing translations at compile time. Use this over i18next. Confidence: HIGH                                                                                                               |
| **@mozilla/readability**  | `^0.6.0`         | Extract main article `title`, `content`, `excerpt`, `byline`, `publishedTime` from the active tab's DOM                                                 | Mature, zero-dep, Mozilla-maintained, identical algorithm to Firefox Reader View. Run inside the content script against `document.cloneNode(true)` to preserve the live DOM. Confidence: HIGH                                                                                                       |
| **defuddle**              | `^0.17.0`        | Alternative content extractor with richer metadata (schema.org, favicon, image, language) and site-specific extractors (YouTube, Reddit, X, HN, GitHub) | Recommended **fallback / alongside** Readability when richer metadata or non-article pages (Reddit threads, YouTube transcripts) are common targets. Created for Obsidian Web Clipper — same use case as Web2Chat. Use the `defuddle` core bundle in the content script (no deps). Confidence: HIGH |
| **DOMPurify**             | `^3.2.0`         | Sanitize Readability/Defuddle HTML output before storing or formatting for IM                                                                           | Critical: Readability does NOT sanitize. Even though we never re-render this HTML in the popup, sanitizing before serialization keeps stored history safe and avoids accidental script propagation if the format ever switches to HTML preview. Confidence: HIGH                                    |
| **turndown**              | `^7.2.0`         | Convert extracted HTML → Markdown for IM payloads                                                                                                       | OpenClaw + Discord both render Markdown. Storing extracted content as Markdown keeps payloads readable and small. `turndown-plugin-gfm` adds tables/strikethrough. Confidence: MEDIUM (well-known but pin to verify behavior with Readability output)                                               |
| **WxtStorage (built-in)** | bundled with WXT | `chrome.storage.local` typed wrapper with `defineItem`, `watch`, `defaultValue`, `migrations`                                                           | Use `storage.defineItem<T>('local:send_to_history', { fallback: [] })` for every persisted config slot. Satisfies PROJECT.md "全部配置 ... `chrome.storage.local`" + makes adapter history easy to migrate later. Confidence: HIGH                                                                  |
| **zod**                   | `^3.24.0`        | Validate stored config & message payloads between popup ↔ background ↔ content script                                                                   | Adapter contracts must be defensive — content scripts run inside foreign pages and must validate incoming messages. Zod schemas double as runtime guards and TS types. Confidence: HIGH                                                                                                             |
| **clsx**                  | `^2.1.1`         | Conditional className utility for popup                                                                                                                 | Tiny, ergonomic, no opinions. Confidence: HIGH                                                                                                                                                                                                                                                      |
| **tailwindcss**           | `^4.0.0`         | Popup styling                                                                                                                                           | Tailwind v4 (Oxide) is Vite-native, zero config. Keeps popup CSS deterministic and scoped to the popup HTML root (content scripts use Shadow DOM or skip CSS). Confidence: MEDIUM (Tailwind v4 is recent — alternative: vanilla CSS modules)                                                        |

### Development Tools

| Tool                  | Purpose   | Notes                                                                                                                                                 |
| --------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vitest**            | `^3.2.4`  | Unit tests for utility code (URL parsing, history dedup, prompt binding logic, adapter selection by URL)                                              | WXT ships `wxt/testing/vitest-plugin` + `wxt/testing/fake-browser` (in-memory `chrome.storage` / `chrome.runtime`). Use `environment: 'happy-dom'`. Pin Vitest 3.2.x for now; v4 is fresh. |
| **happy-dom**         | `^15.0.0` | DOM impl for Vitest                                                                                                                                   | Faster than jsdom; sufficient for Readability + popup component tests.                                                                                                                     |
| **Playwright**        | `^1.58.0` | E2E tests — load unpacked extension via `chromium.launchPersistentContext` with `--load-extension`, exercise popup → content-script → target tab flow | The official MV3 testing path. WXT's docs explicitly route to Playwright for E2E and emit the build to `.output/chrome-mv3` for `--load-extension`.                                        |
| **@playwright/test**  | `^1.58.0` | Test runner with the fixture pattern from Playwright docs (`context`, `extensionId` fixtures)                                                         | Required for asserting behavior against real Discord / OpenClaw pages or local fixtures of their HTML.                                                                                     |
| **eslint**            | `^9.20.0` | Lint with flat config                                                                                                                                 | WXT's recommended lint setup uses `@antfu/eslint-config` or plain `typescript-eslint`. Pick one.                                                                                           |
| **typescript-eslint** | `^8.20.0` | TS-aware lint rules                                                                                                                                   | Keep `no-floating-promises` enabled — extension async paths are easy to leak.                                                                                                              |
| **prettier**          | `^3.4.0`  | Format                                                                                                                                                | Default settings; integrate with eslint via `eslint-config-prettier`.                                                                                                                      |
| **web-ext**           | `^8.5.0`  | (Optional) Lint manifest, sign Firefox builds when v2 ships                                                                                           | Not needed for v1 (Chrome-only), keep in roadmap notes for the deferred Firefox port.                                                                                                      |

---

## Installation

```bash
# Scaffold
pnpm dlx wxt@latest init web2chat -t preact-ts
cd web2chat

# Core (WXT pulls Vite/Preact/TS in via the template)
pnpm add @wxt-dev/i18n @preact/signals
pnpm add @mozilla/readability defuddle dompurify turndown turndown-plugin-gfm
pnpm add zod clsx

# Dev
pnpm add -D vitest happy-dom @playwright/test
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add -D eslint typescript-eslint prettier eslint-config-prettier
pnpm add -D @types/dompurify @types/turndown
```

After install, run `pnpm wxt prepare` to generate `.wxt/` types and `wxt-i18n-structure.d.ts`.

---

## Stack Wiring Notes (Web2Chat-specific)

### MV3 Entrypoints (WXT file convention)

```
entrypoints/
  background.ts               # service worker — message broker between popup and content scripts
  popup/
    index.html
    main.tsx                  # Preact mount point
  content-scripts/
    extract.content.ts        # runs on the SOURCE tab (host_permissions ['<all_urls>']) → Readability/Defuddle
    discord.content.ts        # matches: ['https://discord.com/channels/*'] → Slate adapter
    openclaw.content.ts       # matches: ['http://localhost:18789/chat*'] → injects into OpenClaw input
```

### Content-Script Injection into React Editors (Slate / Lexical / contenteditable)

Critical for the Discord adapter — cannot use `innerText = ...` because Slate maintains state in React, not the DOM.

**Required pattern:**

1. Focus the editor element
2. Set `Selection`/`Range` to caret position
3. Dispatch a real `InputEvent` with `inputType: 'insertText'` + `data` (Slate's `onDOMBeforeInput` only honors native InputEvent instances)
4. For paste-style insertion (preferred for multi-line payloads), dispatch `ClipboardEvent('paste')` with a populated `DataTransfer` — Lexical's paste handler explicitly checks `event.clipboardData`
5. Then dispatch synthetic `KeyboardEvent('keydown', { key: 'Enter', ... })` to trigger send (Discord), or click the platform's send button

This pattern goes into a shared `packages/dom-injector/` module — every IM adapter consumes it.

### i18n Boundary (per PROJECT.md constraint "禁止硬编码字符串")

- Source of truth: `locales/en.yml`, `locales/zh_CN.yml` (YAML — supported by `@wxt-dev/i18n`)
- Generated: `public/_locales/{lang}/messages.json` + `wxt-i18n-structure.d.ts` (regenerated on `wxt prepare`)
- Manifest fields use `__MSG_extName__` syntax; popup code uses `i18n.t('extName')` with full type safety
- ESLint rule: ban string literals matching `/[一-龥]|[A-Z][a-z]+ [A-Z]/` in JSX children (custom rule or `eslint-plugin-i18n-keys`)

### Storage Layer

```ts
// shared/storage.ts
import { storage } from "#imports";
export const sendToHistory = storage.defineItem<SendToEntry[]>(
  "local:send_to_history",
  { fallback: [] },
);
export const promptBindings = storage.defineItem<Record<string, string>>(
  "local:prompt_bindings",
  { fallback: {} },
);
export const language = storage.defineItem<"en" | "zh_CN">("local:language", {
  fallback: "en",
});
```

All persisted state goes through `defineItem` so adapters never touch raw `chrome.storage.local`.

---

## Alternatives Considered

| Recommended                           | Alternative                            | When to Use Alternative                                                                                                                                                                                                                                      |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **WXT**                               | **CRXJS Vite plugin**                  | If you want to hand-write `manifest.json` and own the file structure. CRXJS is a thinner layer — good for someone who's already deeply opinionated about extension layout. WXT does more for you.                                                            |
| **WXT**                               | **Plasmo**                             | Avoid for new 2026 projects. Plasmo uses Parcel (slower HMR, smaller plugin ecosystem) and has slowed in maintenance velocity vs WXT. Only pick it if you specifically need Plasmo's React-component-as-content-UI ergonomics and accept the Parcel debt.    |
| **WXT**                               | **Hand-rolled Vite + manifest.json**   | Don't. You'll re-implement HMR for content scripts, manifest generation, and cross-browser polyfilling for no benefit.                                                                                                                                       |
| **Preact**                            | **React 19**                           | Use React only if you need a specific React-19-only library (e.g., `use()` hook, server components — neither applies here). React adds ~30 KB gz over Preact. Popup performance budget says no.                                                              |
| **Preact**                            | **Svelte 5**                           | Svelte 5 with runes is excellent and produces smaller bundles than Preact for some workloads. Pick it only if the team already knows Svelte. WXT supports it (`-t svelte`). Default to Preact because the React ecosystem of icon/component libs is broader. |
| **Preact**                            | **Vanilla TS + lit-html**              | Viable for an extreme bundle budget (<20 KB popup). Adds friction for the multi-screen popup with history/prompt forms.                                                                                                                                      |
| **@wxt-dev/i18n**                     | **i18next 26.x**                       | Use only if you outgrow plural-form needs (Arabic few/many) before `@wxt-dev/i18n` adds them. Cost: i18next bundles its data into the popup, doesn't localize manifest fields, and requires async init.                                                      |
| **@mozilla/readability**              | **defuddle (alone)**                   | Defuddle is more forgiving and ships richer metadata. Use it as the primary extractor if MVP test pages skew toward Reddit / YouTube / X. Both can run side-by-side at low cost — Readability for "article" mode, Defuddle for "page" mode.                  |
| **@mozilla/readability**              | **postlight/parser (Mercury Parser)**  | Largely abandoned, requires Node-style fetch. Don't.                                                                                                                                                                                                         |
| **WxtStorage (`storage.defineItem`)** | **@webext-core/storage**               | Equivalent typed wrapper not bundled with WXT. Use only on non-WXT projects.                                                                                                                                                                                 |
| **WxtStorage**                        | **Zustand (`charltoons/wxt-zustand`)** | If popup state grows enough to need cross-tab sync + reactive subscriptions in multiple windows. Overkill for v1.                                                                                                                                            |
| **Vitest + Playwright**               | **Jest + Puppeteer**                   | Don't. Jest has worse Vite/ESM compat; Puppeteer's MV3 extension story lags Playwright's.                                                                                                                                                                    |

---

## What NOT to Use

| Avoid                                                                                   | Why                                                                                                                                                                                  | Use Instead                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manifest V2** (`"manifest_version": 2`)                                               | Removed from Chrome Stable in mid-2024. Will not pass Web Store review.                                                                                                              | MV3 — `service_worker` background, `chrome.action`, `chrome.scripting.executeScript`                                                                                                                                      |
| **Persistent background pages** (`"background": { "page": "...", "persistent": true }`) | MV2-only; doesn't exist in MV3.                                                                                                                                                      | MV3 service worker (`background.service_worker`) — non-persistent, designed to wake on events. Use `chrome.alarms` for periodic work, never `setInterval`.                                                                |
| **`chrome.tabs.executeScript`** (MV2 API)                                               | Deprecated.                                                                                                                                                                          | `chrome.scripting.executeScript({ target: { tabId }, func / files })` (MV3) — exposed via WXT's `injectScript` helper.                                                                                                    |
| **`chrome.extension.getBackgroundPage()`**                                              | MV3 service workers have no persistent global; this returns `null`.                                                                                                                  | Message-passing via `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`, or `chrome.storage.local` as the source of truth.                                                                                          |
| **`webextension-polyfill` (npm package, manual install)** for Chrome-only v1            | Adds runtime + bundle for a problem WXT already solves with `@wxt-dev/browser`. Also has known limitations (`tabs.executeScript` returns `undefined` for Promise results on Chrome). | `@wxt-dev/browser` — installed transitively by WXT. Re-evaluate `webextension-polyfill` when v2 adds Firefox.                                                                                                             |
| **Plasmo Framework**                                                                    | Parcel-based, slower HMR, smaller plugin ecosystem, slowing maintenance. Documented as accruing technical debt vs WXT/CRXJS in 2025–2026 framework comparisons.                      | WXT                                                                                                                                                                                                                       |
| **`postlight/parser` (Mercury)**                                                        | Maintenance largely halted, Node-fetch based, doesn't fit a content-script DOM extraction use case.                                                                                  | Readability + Defuddle                                                                                                                                                                                                    |
| **`element.innerText = "..."` to inject into Slate / Lexical / Discord input**          | Bypasses React's controlled-component model; the editor's internal state stays empty, send button stays disabled, and Ctrl-Z is broken.                                              | Dispatch real `InputEvent({ inputType: 'insertText', data })` after focusing and setting Selection. For multi-line, dispatch `ClipboardEvent('paste')` with `DataTransfer`. See "Content-Script Injection" section above. |
| **`document.execCommand('insertText', ...)`** as the only mechanism                     | Deprecated, inconsistent across React editors, may stop working.                                                                                                                     | Use as a _fallback_ when InputEvent dispatch fails on a specific platform; don't make it the primary path.                                                                                                                |
| **`postMessage` to Discord/OpenClaw windows from the popup** to trigger send            | Same-origin policy + Discord's CSP block this. The popup is `chrome-extension://`, the IM session is `discord.com`.                                                                  | Use a content script registered for the target origin + `chrome.tabs.sendMessage` from background after opening/activating the tab.                                                                                       |
| **Storing config in `localStorage`** (popup origin)                                     | `localStorage` per-extension works but is not synced across popup/background/content-script contexts and has no `watch()` API.                                                       | `chrome.storage.local` exclusively, accessed via `storage.defineItem`.                                                                                                                                                    |
| **i18next + `react-i18next` for the popup**                                             | Async init, larger bundle, can't localize `manifest.json` fields, duplicates work `chrome.i18n` already does.                                                                        | `@wxt-dev/i18n`                                                                                                                                                                                                           |
| **`postlight/parser` + jsdom in the content script**                                    | jsdom is a Node module, won't run in browser context, ~3 MB bundle if you tried.                                                                                                     | Use the live `document` directly with Readability/Defuddle (both browser-first).                                                                                                                                          |
| **`chrome.identity` / OAuth for IM platforms**                                          | Out of scope per PROJECT.md ("不使用平台官方 Bot API").                                                                                                                              | The injection-via-tab strategy avoids tokens entirely.                                                                                                                                                                    |

---

## Stack Patterns by Variant

**If a target IM uses Slate (Discord):**

- Use `InputEvent('beforeinput', { inputType: 'insertText', data })` then `InputEvent('input', ...)` on the contentEditable root
- For multi-paragraph content prefer `ClipboardEvent('paste')` with `DataTransfer.setData('text/plain', ...)`
- Wait for `[data-slate-editor="true"]` to appear (SPA navigation) — use `MutationObserver`, not `setTimeout`

**If a target IM uses Lexical (Meta-family apps, possibly v2 platforms):**

- Same `InputEvent` pattern, but Lexical's paste path _requires_ `event.clipboardData` to be a real `DataTransfer` (not null) → always use ClipboardEvent for Lexical
- Selector: `[contenteditable="true"][data-lexical-editor="true"]`

**If a target IM uses a plain `<textarea>` or `<input>` (OpenClaw — likely):**

- Set `.value`, then dispatch `Event('input', { bubbles: true })` so React's `onChange` fires
- For React-controlled inputs use `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text)` before dispatching, otherwise React's tracker swallows the change

**If MVP scope expands to Firefox (deferred per PROJECT.md):**

- WXT already handles MV2/MV3 + Chrome/Firefox builds from the same source; add `webextension-polyfill` _only_ if non-WXT helpers need it
- Add `web-ext` for Firefox AMO signing

**If popup grows beyond ~5 screens:**

- Add a router — `wouter` (~1 KB, hooks API, Preact-compatible) over `preact-iso`. Skip React Router (too heavy).

---

## Version Compatibility

| Package A                     | Compatible With                                                           | Notes                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `wxt@^0.20.25`                | `vite@^7`, `typescript@^5.6`, `node@>=20.19`                              | WXT pre-1.0: minor (0.X.0) bumps may break — pin caret-minor not caret-major.                                              |
| `@wxt-dev/i18n@^0.2.5`        | `wxt@^0.20.0`                                                             | Generates types via `wxt prepare`; integrate as a WXT module.                                                              |
| `@mozilla/readability@^0.6.0` | Browser DOM, jsdom, happy-dom                                             | Pass `document.cloneNode(true)` — `parse()` mutates the tree. Sanitize output with DOMPurify.                              |
| `defuddle@^0.17.0`            | Browser, Node 20+ via `defuddle/node` (linkedom now preferred over jsdom) | Use the `defuddle` browser bundle in the content script — zero deps.                                                       |
| `preact@^10.29`               | `@preact/signals@^2`, `@preact/preset-vite`                               | Preact 11 beta exists but is not production-ready as of Apr 2026 — stay on 10.x. Apply Jan-2026 security patch (10.28.2+). |
| `vitest@^3.2.4`               | `wxt/testing/vitest-plugin`, `happy-dom@^15`                              | Vitest 4 is fresh — wait one cycle before upgrading.                                                                       |
| `@playwright/test@^1.58`      | Chromium channel via `chromium.launchPersistentContext`                   | Headed Chromium required for `--load-extension`; cannot run in headless mode.                                              |
| `tailwindcss@^4`              | `@tailwindcss/vite`, Vite 7                                               | v4's Oxide engine drops the postcss plugin path. Don't mix v3 + v4 configs.                                                |

---

## Sources

### Context7 (verified within last 30 days)

- `/wxt-dev/wxt` — WXT entrypoints, background, content scripts, storage, i18n, testing (Vitest plugin + Playwright E2E guidance)
- `/websites/wxt_dev` — `@wxt-dev/i18n` typed translation API, version notes
- `/crxjs/chrome-extension-tools` — CRXJS Vite plugin manifest patterns, content-script `world: 'MAIN' | 'ISOLATED'`
- `/mozilla/readability` — `Readability(document).parse()` API surface, response shape
- `/kepano/defuddle` — Defuddle parsing API, browser/Node bundles, metadata fields
- `/mozilla/webextension-polyfill` — known Chrome limitations (`tabs.executeScript` Promise handling)
- `/microsoft/playwright` — `chromium.launchPersistentContext` + `--load-extension` MV3 fixture pattern, service worker discovery for `extensionId`
- `/preactjs/preact` — Preact 10 hooks API + signals integration
- `/i18next/i18next` — context for the alternative-not-recommended path
- `/facebook/lexical` — editor architecture (state-driven, paste handler relies on `ClipboardEvent.clipboardData`)

### Official documentation

- [Chrome MV3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate) — service worker requirement, deprecated APIs (verified for "Do NOT use" list)
- [WXT — Next-gen Web Extension Framework](https://wxt.dev/) — primary framework docs
- [WXT i18n module](https://wxt.dev/i18n) — `@wxt-dev/i18n` integration
- [Playwright — Chrome Extensions](https://playwright.dev/docs/chrome-extensions) — `launchPersistentContext` MV3 fixture pattern

### npm registry (versions verified 2026-04)

- [`wxt`](https://www.npmjs.com/package/wxt) — 0.20.25, last published <1 day ago at research time
- [`@wxt-dev/browser`](https://www.npmjs.com/package/@wxt-dev/browser) — 0.1.40, ~12 days
- [`@wxt-dev/i18n`](https://www.npmjs.com/package/@wxt-dev/i18n) — 0.2.5
- [`@mozilla/readability`](https://www.npmjs.com/package/@mozilla/readability) — 0.6.0
- [`defuddle`](https://www.npmjs.com/package/defuddle) — 0.17.0, last published <1 day
- [`preact`](https://www.npmjs.com/package/preact) — 10.29.1; Jan-2026 security patch (10.28.2+) applied
- [`@types/chrome`](https://www.npmjs.com/package/@types/chrome) — 0.1.40
- [`i18next`](https://www.npmjs.com/package/i18next) — 26.0.8 (alternative)
- [`vitest`](https://www.npmjs.com/package/vitest) — 3.2.4 (4.0.7 also released)
- [`playwright`](https://www.npmjs.com/package/playwright) — 1.58.2

### WebSearch (cross-referenced; MEDIUM confidence on framework-comparison claims, HIGH on version numbers)

- [The 2025 State of Browser Extension Frameworks (Plasmo vs WXT vs CRXJS)](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) — establishes WXT as 2026 leader
- [Building AI-Powered Browser Extensions With WXT (Marmelab, 2025-04)](https://marmelab.com/blog/2025/04/15/browser-extension-form-ai-wxt.html)
- [What's New in Preact for 2026](https://blog.openreplay.com/whats-new-preact-2026/) — Preact 10 vs 11 beta status
- [Slate.js Editable docs](https://docs.slatejs.org/libraries/slate-react/editable) + [Slate issue #5603 (`onInput` not fired at offset 0)](https://github.com/ianstormtaylor/slate/issues/5603) — confirms native InputEvent requirement for Slate (Discord)
- [Lexical issue #4595 (keyboard events not registering)](https://github.com/facebook/lexical/issues/4595) — confirms ClipboardEvent + DataTransfer pattern for Lexical paste

---

## Confidence Summary

| Recommendation                                                   | Confidence      | Rationale                                                                                                            |
| ---------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| WXT as the framework                                             | **HIGH**        | Verified via Context7 + npm + multiple 2025–2026 framework comparison articles                                       |
| Preact 10.x for popup                                            | **HIGH**        | Version + security patch verified on npm and Preact's own 2026 changelog                                             |
| `@wxt-dev/i18n` over i18next                                     | **HIGH**        | Official WXT recommendation, only solution that localizes manifest + CSS without async init                          |
| `@mozilla/readability` + `defuddle` dual extraction              | **HIGH**        | Both verified current; Defuddle was created for the exact same use case (Obsidian Web Clipper)                       |
| InputEvent + ClipboardEvent dispatch for Slate/Lexical injection | **HIGH**        | Cross-referenced via Slate source, Lexical source, GitHub issues, and editor framework comparison articles           |
| Vitest + WxtVitest plugin + Playwright fixtures                  | **HIGH**        | First-party WXT docs + first-party Playwright docs                                                                   |
| Tailwind v4 for popup                                            | **MEDIUM**      | v4 is recent (2025); falling back to vanilla CSS modules is a safe alternative                                       |
| Turndown for HTML→Markdown                                       | **MEDIUM**      | Mature library, but verify output quality with Readability's HTML before committing                                  |
| Avoid `webextension-polyfill` for v1                             | **HIGH**        | WXT bundles `@wxt-dev/browser` which supersedes it on Chrome-only builds; polyfill has documented Chrome limitations |
| Avoid Plasmo for new projects                                    | **MEDIUM-HIGH** | Multiple 2025–2026 comparisons converge on this; Plasmo isn't unsafe, just losing momentum                           |

---

_Stack research for: Chrome MV3 Web Clipper extension with content-script DOM injection into third-party IM web UIs_
_Researched: 2026-04-28_
