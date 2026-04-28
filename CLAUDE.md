# CLAUDE.md

> Project-level guidance for Claude Code working on Web2Chat.
> Auto-generated section markers below allow targeted updates by `gsd-tools`.

<!-- GSD:project-start source:PROJECT.md -->

## Project

**Web2Chat** — Chrome MV3 web-clipper extension that captures structured page metadata (`title` / `url` / `description` / `create_at` / `content`) and dispatches it together with a user-bound prompt into a target IM or AI-Agent web chat session via content-script DOM injection.

**Core Value:** 让用户用一次点击，把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话——主链路必须稳定可用。

**MVP scope (v1):** OpenClaw Web UI (`http://localhost:18789/chat?session=agent:<a>:<s>`) + Discord (`https://discord.com/channels/<g>/<c>`).

See `.planning/PROJECT.md` for full context, constraints, and key decisions.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

- **Framework:** WXT 0.20.x (MV3-first, Vite-native, typed i18n + storage, Playwright wiring)
- **UI:** Preact 10.29 + `@preact/signals` (≈4 KB runtime; popup-friendly)
- **Language:** TypeScript 5.6+
- **i18n:** `@wxt-dev/i18n` 0.2.5 (typed message keys, manifest localization, no async init)
- **Content extraction:** `@mozilla/readability` 0.6 (+ `defuddle` 0.17 for non-article pages)
- **Sanitization:** `dompurify` 3.2
- **HTML→Markdown:** `turndown` 7.2 + `turndown-plugin-gfm`
- **Validation:** `zod` 3.24 (cross-context message payloads)
- **Storage:** `WxtStorage.defineItem<T>` over `chrome.storage.local` / `.session`
- **Testing:** Vitest 3 + `wxt/testing/fake-browser` (unit) + Playwright 1.58 `launchPersistentContext + --load-extension` (E2E)
- **Styling:** Tailwind v4 (fallback to CSS modules if v4 issues)

**Do NOT use:** Plasmo, `webextension-polyfill`, `i18next`, `<all_urls>`, `localStorage`, `innerText=` / `document.execCommand` for editor injection.

See `.planning/research/STACK.md` and `.planning/research/SUMMARY.md` for rationale and confidence levels.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

**Service worker discipline:**

- Register all event listeners synchronously at module top level. Never `await` before `chrome.runtime.onMessage.addListener(...)` etc.
- Treat the SW as stateless: read all state from `chrome.storage.local` / `.session` inside handlers; do not assume module-scope variables survive a wake.
- Use `chrome.alarms` for deferred work, never `setInterval` / `setTimeout` for cross-event scheduling.

**Permissions:** Declare only `activeTab` + `scripting` + `storage` + per-adapter `host_permissions` in `manifest.json`. Never use `<all_urls>` (Web Store rejection risk). Reserve future-platform permissions for `optional_host_permissions`.

**Adapter pattern:** Every IM platform is one file under `content/adapters/<platform>.ts`, implementing the shared `IMAdapter` interface (`match` / `waitForReady` / `compose` / `send`). Never hardcode platform-specific logic in dispatch core.

**DOM injection (React-controlled inputs):** Use the property-descriptor setter trick — `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, text)` followed by `el.dispatchEvent(new Event('input', { bubbles: true }))`. Centralize in `shared/dom-injector.ts`.

**DOM injection (Slate / Lexical editors, e.g., Discord):** Use synthetic `ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })`. Never `textContent =` / `innerText =`.

**i18n:** Every user-visible string flows through `t(...)`; manifest fields use `__MSG_*__`. ESLint blocks hardcoded JSX/TSX strings. Both `en` and `zh_CN` locale files must achieve 100% key coverage.

**Storage:** All writes go through the typed repo (no direct `chrome.storage.local.set` from popup or SW). Schema includes a `version` field; migrations live next to the schema definition.

**Privacy:** Captured data (URL / title / description / content / user prompt) is stored only locally and only transmitted to the user-chosen IM via direct browser navigation. Never to third-party analytics or telemetry.

**Testing:** Unit tests with Vitest + `fake-browser`; E2E with Playwright loading the unpacked extension. Adapter selectors validated against committed DOM fixtures (`tests/unit/adapters/<platform>.fixture.html`), not live targets.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Single-hub service worker as the privileged coordinator for two pipelines:

1. **Capture pipeline:** popup → SW → `chrome.scripting.executeScript(extractor)` on active tab → `ArticleSnapshot` returned to popup.
2. **Dispatch pipeline:** popup → SW → open/activate target tab → wait `tabs.onUpdated: complete` (+ `webNavigation.onHistoryStateUpdated` for SPA routes) → `executeScript(adapter)` → adapter `compose` + `send` → result relayed back to popup.

**Layered modules:**

- `shared/` — pure TS types, `zod`-validated typed messaging, storage repo, `t()` i18n facade
- `background/` — service-worker.ts (top-level listeners only), capture-pipeline, dispatch-pipeline, adapter-registry
- `content/extractor.ts` — Readability + DOMPurify + Turndown, runs on `document.cloneNode(true)`
- `content/adapters/<platform>.ts` — one bundle per IM platform; programmatically injected only at dispatch
- `popup/` — Preact SPA, reads from storage via `onChanged`, RPCs the SW

**Dispatch state machine:** payload + status keyed by `dispatchId` in `chrome.storage.session`, idempotent on re-confirm, survives SW restart.

See `.planning/research/ARCHITECTURE.md` for ASCII diagrams, full directory layout, and the typed `IMAdapter` interface.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.

<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work
- `/gsd-discuss-phase <N>` then `/gsd-plan-phase <N>` to enter a new phase

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.

**Current state:** v1 milestone, 7 phases planned, ready to begin Phase 1 (Extension Skeleton). See `.planning/STATE.md` for live progress.

<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` — do not edit manually.

<!-- GSD:profile-end -->
