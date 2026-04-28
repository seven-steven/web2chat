# Feature Research

**Domain:** Chrome MV3 Web Clipper extension that captures structured page data + user-defined prompt and dispatches to IM / AI-Agent web chat sessions
**Researched:** 2026-04-28
**Confidence:** HIGH (table stakes, anti-features, MVP), MEDIUM (per-platform DOM feasibility — depends on whether each platform’s editor changes between versions)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or unusable.

| Feature                                                                                           | Why Expected                                                                                                                                   | Complexity | Notes                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click-to-popup with current page metadata preview (`title` / `url` / `description` / `create_at`) | Pattern set by Notion / Pocket / Obsidian Web Clipper — popup is the universal UX of this category                                             | LOW        | Read OG/Twitter/JSON-LD/`<meta name="description">` from content script; fallback chain `og:title → <title>`, `og:description → <meta name="description">`, `article:published_time → page-load time`                       |
| Quality main-content extraction (Readability)                                                     | Obsidian, MarkDownload, Joplin, Pocket all run Mozilla Readability — without it the clipped `content` is full of nav/ads/footer                | LOW        | `@mozilla/readability` is the de-facto standard, MIT, runs entirely client-side, ~120KB. Same engine as Firefox Reader View. Required: an `iframe` clone of `document` to feed Readability without polluting the live page  |
| `send_to` input with platform recognition by URL pattern + matching icon                          | User must see at-a-glance "this destination is Discord / OpenClaw / Telegram"; otherwise they fear sending to the wrong place                  | LOW        | Simple URL regex registry mapping `https://discord.com/channels/*` → Discord, `http://localhost:18789/chat?session=*` → OpenClaw, etc. Each platform adapter contributes one entry                                          |
| `send_to` history with autocomplete dropdown (MRU + frequency)                                    | Users pick the same 3–5 destinations 95% of the time — typing the URL each time is a non-starter                                               | LOW        | Spotlight-style ranking: hybrid recency + selection-frequency-per-prefix. Show top 5–10 on focus (zero-state). Disable browser autofill (`autocomplete="off"` + random `id`) to prevent double-dropdown                     |
| `send_to` ↔ `prompt` binding with auto-switch                                                     | Listed as MVP in PROJECT.md; matches the "save to X with template Y" pattern of Save to Notion / Bookmark Assistant                            | LOW        | Storage shape: `{ send_to_url: { prompt: string, lastUsed: ts, useCount: int } }`. Switching `send_to` triggers `prompt` field replacement                                                                                  |
| `prompt` field with history autocomplete                                                          | Users repeat the same prompts ("summarize this", "save to KB"); typing them every time defeats the value prop                                  | LOW        | Same MRU pattern as `send_to`. Independent history table — also exposed when `send_to` is brand-new                                                                                                                         |
| i18n (zh / en minimum)                                                                            | Author is zh_CN; modern extensions ship 4+ locales (Obsidian Clipper added pt-BR, id, ko, zh-Hant in v1.x); zh-only or en-only feels parochial | LOW        | `chrome.i18n` + `_locales/{en,zh_CN}/messages.json`. Use named placeholders (`$URL$`), not positional. UI templates must use `__MSG_xxx__` or `chrome.i18n.getMessage()` — no hardcoded strings (per PROJECT.md constraint) |
| Local-only storage (`chrome.storage.local`)                                                       | PROJECT.md hard constraint; matches Obsidian Clipper "100% private, all clipped content stored locally" positioning                            | LOW        | All config / history / templates in `chrome.storage.local`. No `chrome.storage.sync`, no remote endpoints                                                                                                                   |
| Graceful failure when target tab can't accept injection                                           | If user's Discord tab is logged-out, in a voice channel, or a DM picker — extension must say so, not silently fail                             | MEDIUM     | Each adapter exposes a `canDispatch(tab) → {ready: bool, reason: string}` probe. Surface reason in popup with retry button. Common cases: editor not mounted, user not logged in, channel ID mismatch                       |
| Dispatch confirmation feedback                                                                    | After clicking "Confirm", users need to see success/failure within ~2s — Notion shows a toast, Obsidian opens the saved note, etc.             | LOW        | Adapter returns a `Result<{messageNode, ts}, Error>`. Popup shows ✓ + auto-close after 1s on success, error banner with retry on failure                                                                                    |
| Manifest V3 service-worker compliant                                                              | Chrome Web Store no longer accepts MV2 (per official docs)                                                                                     | MEDIUM     | `manifest_version: 3`, no persistent background, all timers via `chrome.alarms`, all DOM work in content scripts. Use `chrome.scripting.executeScript({world:"MAIN"})` for editors that need page-context access            |
| Keyboard shortcut to open popup                                                                   | All major clippers expose one (Obsidian: configurable; Notion: ⌥⇧C). Users who clip 20+ times/day demand it                                    | LOW        | `commands` API in manifest with `_execute_action` default suggested keybinding                                                                                                                                              |

### Differentiators (Competitive Advantage)

Features that set Web2Chat apart. These align with the Core Value: "one click → format + prompt → IM/Agent session".

| Feature                                                                               | Value Proposition                                                                                                                                                                                                           | Complexity | Notes                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `send_to` ↔ `prompt` binding (above) — but with **per-destination message templates** | The big diff vs Notion (which only has database picker) and Obsidian (which has site-pattern templates but no IM dispatch). Lets user say "to Discord channel X, format as `**[{title}]({url})**\n{prompt}\n>>> {summary}`" | MEDIUM     | Template engine like Obsidian Clipper's `{{title}}`, `{{url}}`, `{{content}}`, `{{description}}`, `{{date}}`, `{{prompt}}` variables. Per-platform default templates shipped (Discord uses markdown, Slack uses mrkdwn, OpenClaw uses raw text + JSON-fenced metadata) |
| Smart prompt suggestions based on detected page type                                  | Recipe page → "save to recipes Agent"; news article → "summarize and post"; GitHub repo → "add to dev notes". Felt magical when Obsidian Clipper's "auto-apply templates by URL pattern" landed                             | MEDIUM     | Page-type detection via Schema.org `@type` + URL heuristics. Suggests prompts the user has used before for the same page-type, sorted by frequency. Strictly local — no LLM call (per PROJECT.md anti-feature)                                                         |
| Multi-target fan-out (one clip → N destinations)                                      | None of the reference clippers do this well. Killer for "share this article with both my AI Agent and the team Discord"                                                                                                     | MEDIUM     | UI: checkable list of saved destinations. Background queues N dispatches sequentially (parallel fan-out risks rate-limits and tab-thrash). User sees per-target progress                                                                                               |
| Queue + retry on dispatch failure                                                     | Web app DOMs are fragile (Discord re-renders Slate tree, Slack swaps editors, Telegram K vs Z mismatches). Without retry the experience is "click, fail silently, lose the clip"                                            | MEDIUM     | Background service-worker holds a queue of `{clipId, target, attempts}`. Exponential backoff (1s, 4s, 16s, dead-letter at 3). Persisted in `chrome.storage.local` so a SW restart doesn't drop the clip                                                                |
| Page-region clipping (selection / element picker)                                     | Pocket "save selection", Obsidian highlight + clip — table-stakes for clipping but **differentiator** in send-to-chat space because none of the chat-share extensions support it                                            | MEDIUM     | Two modes: (a) `window.getSelection()` if user pre-selected; (b) "pick element" overlay similar to React DevTools / Obsidian highlighter. Region replaces `content` field, full-page metadata still attached                                                           |
| Native app deep-linking fallback                                                      | When user prefers `tg://resolve?domain=foo` or `slack://channel?team=T&id=C` over web injection. Some IMs (Telegram especially) have flaky web auth                                                                         | MEDIUM     | Per-adapter optional `deepLink(target)` returning a custom-scheme URL. Open via `chrome.tabs.create({url})`. Note: cannot pre-fill message body for most native protocols — degrades to "open chat, paste manually"                                                    |
| Bulk export of history (JSON / Markdown)                                              | "I want my data" — common ask in privacy-first clipper communities. Cheap to ship and signals trust                                                                                                                         | LOW        | Single button → blob download of `chrome.storage.local` shape, or rendered Markdown (`# {title}\n{url}\n{date}\n\n{content}`)                                                                                                                                          |
| Per-platform diagnostics ("Why didn't it send?")                                      | DOM injection fails for opaque reasons (Slate ignored event, channel ID stale, login expired). A built-in diagnostic page that shows the last 5 failures with the captured reason builds enormous user trust                | LOW        | Adapter errors carry a `code` (e.g., `EDITOR_NOT_FOUND`, `LOGIN_REQUIRED`, `CSP_BLOCKED`); surfaced in an "About / Status" popup tab                                                                                                                                   |
| Self-hosted / OpenClaw first-class support                                            | OpenClaw isn't a household name — being its native clipper from day 1 captures that audience entirely. The URL pattern is documented in PROJECT.md and stable                                                               | LOW        | Ship a default OpenClaw adapter with the well-known port `18789` and a discoverable session URL pattern. Other clippers don't even know OpenClaw exists                                                                                                                |
| Adapter SDK / pluggable platform packs                                                | Lets users (or community) add `Mattermost`, `RocketChat`, `Element/Matrix` without forking the extension                                                                                                                    | HIGH       | Stable adapter contract: `{matchUrl(url), canDispatch(tab), dispatch(tab, payload), deepLink?(target)}`. v1.x candidate; not MVP                                                                                                                                       |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but conflict with the Core Value, privacy posture, or MV3 constraints. PROJECT.md explicitly excludes most of these — the table documents _why_.

| Feature                                                                                 | Why Requested                          | Why Problematic                                                                                                                                                                                                                                                                                                                                                                              | Alternative                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud sync of config / history                                                          | "I use 3 machines"                     | Adds account system + backend + GDPR surface; PROJECT.md hard-rules it out; users can roll their own via export/import                                                                                                                                                                                                                                                                       | Export/import JSON manually (a v1.x differentiator above). Future v2 may add user-owned WebDAV / Nextcloud sync — never our cloud                                                                                                                             |
| AI summarization inside the extension                                                   | "Just summarize before sending"        | Pulls extension into LLM-key-management hell, raises privacy red flags, duplicates downstream Agent's job (Core Value: "user-supplied prompt → downstream Agent does the AI work")                                                                                                                                                                                                           | Let the destination Agent (OpenClaw, Claude, ChatGPT) summarize. Extension just delivers raw content + prompt                                                                                                                                                 |
| Server-side bot accounts / official Bot APIs                                            | "Reliable, won't break on DOM changes" | Requires token management, OAuth flows, server infrastructure → violates "no backend" constraint. WhatsApp, Slack, Teams, Feishu, WeCom all demand verified app registration with corp-domain-bound credentials. WhatsApp specifically bans accounts using unofficial automation — but the risk applies to bulk/spam patterns; a user-driven single-message clipper is in a different regime | Stay with content-script injection + tab-driven UX. For platforms where injection is impossible (WhatsApp without massive risk, Signal — no web client at all), explicitly mark them unsupported and recommend deep-link "open chat, paste yourself" fallback |
| OCR / image content extraction                                                          | "I want to clip Twitter screenshots"   | OCR pipeline is huge (Tesseract WASM ~10MB), accuracy is mediocre, and image clipping is a v2 problem; PROJECT.md excludes                                                                                                                                                                                                                                                                   | v2: pass image URLs through unchanged; downstream Agent does vision processing                                                                                                                                                                                |
| RSS aggregation / scheduled clipping                                                    | "Clip the front page every hour"       | This is a feed reader, not a clipper. Massive scope creep; collides with `chrome.alarms` quotas and "user actively clicked" privacy posture                                                                                                                                                                                                                                                  | Out of scope. Refer users to dedicated readers (Inoreader, Feedbin)                                                                                                                                                                                           |
| Bulk-send to many contacts / channels                                                   | "I want to broadcast"                  | Triggers WhatsApp anti-spam ML (per Malwarebytes 2025 report on 131 banned extensions); puts the entire product in a "spamware" category and risks Chrome Web Store removal                                                                                                                                                                                                                  | Multi-target fan-out is fine (3–5 destinations) but explicitly cap and document non-spam intent. No CSV-of-contacts UI, no scheduling                                                                                                                         |
| Server-to-server send via official APIs (Discord webhook, Feishu open API, WeCom robot) | "More reliable than DOM"               | Each platform requires per-user secret management; PROJECT.md constraint is "no token management". Also defeats the simple zero-config UX                                                                                                                                                                                                                                                    | Not for v1. Could be a v2 opt-in _power-user_ mode where the user pastes their own webhook URL — but never default                                                                                                                                            |
| Firefox / Safari port (v1)                                                              | "I use Firefox"                        | PROJECT.md explicitly v1=Chromium-only to avoid splitting effort. Manifest V3 differences between Chrome and Firefox are non-trivial in 2026 (background scripts vs service workers, `scripting.executeScript` parity gaps)                                                                                                                                                                  | v2 candidate after MV3 dust settles. WebExtension API is mostly compatible — port effort is moderate, not zero                                                                                                                                                |

## Feature Dependencies

```
[Click-to-popup]
    ├─requires─> [MV3 service worker + manifest]
    └─requires─> [Content script for DOM read]
                       │
                       ├─requires─> [Readability extraction]
                       └─requires─> [OG/Schema.org/JSON-LD parser]

[send_to input + platform recognition]
    └─requires─> [Platform adapter registry] ── matchUrl()
                       │
                       └─enables──> [Per-platform message templates]
                                          │
                                          └─enables──> [Smart prompt suggestions]

[send_to history MRU]
    ├─requires─> [chrome.storage.local schema]
    └─enables──> [send_to ↔ prompt binding]
                       │
                       └─enables──> [Auto-switch prompt on send_to change]

[Confirm / dispatch]
    ├─requires─> [Adapter.dispatch(tab, payload)]
    │                  │
    │                  ├─requires─> [Tab activation / new tab logic]
    │                  └─requires─> [chrome.scripting.executeScript world:MAIN]
    │
    ├─enables──> [Dispatch confirmation UI]
    └─enables──> [Queue + retry on failure]
                       │
                       └─enables──> [Multi-target fan-out]
                                          │
                                          └─enables──> [Per-target diagnostics]

[i18n]
    └─requires─> [_locales/{en,zh_CN}/messages.json + manifest default_locale]
                       │
                       └─required-by─> [ALL UI text — popup, options, errors, history]

[Page-region clipping]
    ├─enhances──> [content extraction]
    └─requires─> [content script overlay UI for element picker]

[Native app deep-link]
    └─alternative-to──> [Adapter.dispatch via DOM injection]
        (mutually exclusive per dispatch — fall back to deep-link if dispatch unsupported)

[Bulk export]
    └─requires─> [chrome.storage.local schema stable]

[Adapter SDK]
    └─requires─> [Stable Adapter contract] ── frozen after 3+ first-party adapters
```

### Dependency Notes

- **Platform recognition requires a registry pattern, not hardcoded if/else** — adding Telegram in v2 should mean adding one adapter file, not editing 4 places. This decision is load-bearing for the v2 IM list (Feishu, Lark, Google Chat, LINE, Teams, Nextcloud Talk, Signal, Slack, Telegram, WhatsApp, Zalo, QQ, WeCom).
- **Per-platform templates depend on the adapter registry** — each adapter contributes its default template; user overrides live in `chrome.storage.local` keyed by adapter ID.
- **Queue + retry must persist to storage** — service workers terminate after ~30s idle in MV3; in-memory queues lose clips. Use `chrome.storage.local` as the queue backing store and wake via `chrome.alarms`.
- **Multi-target fan-out conflicts with rate-limit detection** — sending to 5 Discord channels in 5 seconds will trip Discord's client-side rate guards. Sequence dispatches with ≥1.5s gap. Don't ship parallel fan-out.
- **i18n is foundational** — adding it later means rewriting every popup string; PROJECT.md mandates it. Bake into v1.0 from day 1.
- **Content script ↔ service worker messaging is required everywhere** — popup → SW (`chrome.runtime.sendMessage`), SW → content script (`chrome.tabs.sendMessage`), content script → MAIN-world inject (`window.postMessage` with origin validation). All three legs are needed for any non-trivial dispatch (confirmed by Chrome MV3 docs and Duo Security message-passing advisory).

## Per-IM-Platform Feasibility (V2 Roadmap Reality Check)

The MVP targets **OpenClaw** + **Discord** because their URL patterns are stable and their editors are well-documented. The v2 list is harder than it looks. This table tells the roadmap which platforms are cheap, expensive, or impossible.

Definitions:

- **DOM injection** — content-script + MAIN-world injection sets text in the message editor and triggers send. No tokens.
- **Native protocol / deep-link only** — opens the chat window with the user pasting; no automated send.
- **Official API** — requires per-user token / webhook / OAuth — explicitly out of scope per PROJECT.md.

| Platform                                        | URL Pattern                                                                         | Editor Tech                                           | Content-Script Injection?                | Complexity      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **OpenClaw**                                    | `http://localhost:18789/chat?session=agent:<a>:<s>`                                 | Author-controlled (likely contenteditable / textarea) | **YES** — first-party app, stable        | **LOW**         | MVP. We control the page, can ship a tiny postMessage handshake to make injection trivially reliable                                                                                                                                                                                                                                                                                                                           |
| **Discord**                                     | `https://discord.com/channels/<server>/<channel>`                                   | Slate (React)                                         | **YES** — well-documented                | **MEDIUM**      | MVP. Slate requires `InputEvent` with `inputType:"insertText"` dispatched from MAIN world; class names obfuscated, must use `role="textbox"` / `aria-label="Send Message"` selectors. Self-bot territory — single user-triggered messages are tolerated; bulk is bannable                                                                                                                                                      |
| **Telegram Web (K + Z)**                        | `https://web.telegram.org/k/#@<peer>` (K) / `/z/#@<peer>` (Z)                       | Custom contenteditable (K), MTProto-bound             | **YES** — userscripts confirmed working  | **MEDIUM**      | Two clients (K and Z) with different DOMs — adapter must detect which one. `.input-message-input` element + InputEvent + Enter keydown is the established pattern                                                                                                                                                                                                                                                              |
| **Slack**                                       | `https://app.slack.com/client/<team>/<channel>`                                     | Quill (per Slack Markdown Proxy ext)                  | **YES** — Slack Markdown Proxy proves it | **MEDIUM**      | Use Quill Delta API in MAIN world (`editor.clipboard.dangerouslyPasteHTML` or `editor.insertText`). Send via Enter keydown. Note: prior assumptions of "Slack uses Lexical" were wrong per current evidence                                                                                                                                                                                                                    |
| **Microsoft Teams**                             | `https://teams.microsoft.com/v2/...` and `https://teams.live.com/v2/...`            | Fluent UI rich-text (proprietary)                     | **YES, painful**                         | **HIGH**        | Editor is heavily encapsulated, frequent re-renders. Microsoft's officially sanctioned path is "Message Extensions" (a server-side app) — explicitly anti-feature per PROJECT.md. DOM path is fragile; budget extra QA                                                                                                                                                                                                         |
| **Google Chat**                                 | `https://chat.google.com/u/0/#chat/dm/<id>` or `/space/<id>`                        | Custom contenteditable                                | **MAYBE**                                | **HIGH**        | Heavy CSP and frequent DOM churn. Google's recommended path is the Workspace Add-on (server side). DOM injection works in practice (e.g., Chat Plus extension) but breaks often. Mark as "best effort"                                                                                                                                                                                                                         |
| **Feishu / Lark**                               | `https://www.feishu.cn/messenger/...` (CN) / `https://www.larksuite.com/...` (intl) | Custom rich-text                                      | **MAYBE**                                | **HIGH**        | No public evidence of community DOM-injection extensions; all docs/SDKs route through official Open Platform API. Will require reverse engineering. Two URL hosts (feishu.cn vs larksuite.com) and identical editors. Test on both regions                                                                                                                                                                                     |
| **LINE**                                        | `https://line.me/...` (web client coverage limited)                                 | —                                                     | **NO** (effectively)                     | —               | LINE has no full-featured web client — `line.me` is mostly marketing/login. Real chat is on the native apps. Defer to deep-link `line://msg/text/...` (URL scheme, opens native app, no auto-send)                                                                                                                                                                                                                             |
| **WhatsApp Web**                                | `https://web.whatsapp.com/`                                                         | Lexical-like custom editor                            | **TECHNICALLY YES, POLITICALLY NO**      | **HIGH (risk)** | DOM injection works (well-documented). But WhatsApp's 2025 enforcement actively detects extension DOM mutations — Malwarebytes/Socket reported 131 extensions banned. Single-user user-triggered sends are lower-risk than bulk, but still flagged. **Recommend: deep-link only (`https://wa.me/<num>?text=<encoded>`) — opens chat with text pre-filled, user clicks send manually.** Document the choice as anti-ban posture |
| **Zalo**                                        | `https://chat.zalo.me/`                                                             | Custom contenteditable                                | **YES**                                  | **MEDIUM**      | Confirmed by `zlapi` reference; cookie/IMEI handshake exists for full automation but DOM injection works without it. ToS warns against unofficial automation — same posture as WhatsApp, recommend deep-link if available, DOM injection as opt-in                                                                                                                                                                             |
| **Telegram (native via deep-link)**             | `tg://resolve?domain=<peer>`                                                        | —                                                     | **NO** (native)                          | **LOW**         | Cannot pre-fill text universally — only `https://t.me/<peer>?text=<msg>` works for some link types. Useful as fallback when Web fails                                                                                                                                                                                                                                                                                          |
| **Signal**                                      | None (no web client by design)                                                      | —                                                     | **IMPOSSIBLE**                           | —               | Signal explicitly does not ship a web client (security posture — no remotely-loaded JS). Desktop Electron app is unreachable from a browser extension. **Mark as unsupported, document why.** Recommend `signal://` deep-link or "copy to clipboard, paste in Signal Desktop" — that's the ceiling                                                                                                                             |
| **Nextcloud Talk**                              | `https://<host>/call/<token>`                                                       | Custom contenteditable                                | **MAYBE**                                | **MEDIUM**      | Self-hosted → DOM varies less per release. But the _officially blessed_ path is the bot/webhook REST API at `/ocs/v2.php/apps/spreed/api/v1/chat/{token}` — out of scope. DOM injection is feasible; ship as best effort                                                                                                                                                                                                       |
| **WeCom (企业微信)**                            | Web client largely deprecated; users use the native app                             | Custom rich-text                                      | **NO** (effectively)                     | —               | The web client has been gradually retired in favour of native + JS-SDK-in-iframe-host model. JS-SDK only works on ICP-filed trusted domains. Mark unsupported in v2; document via "use native app + clipboard" fallback                                                                                                                                                                                                        |
| **QQ**                                          | No first-party web chat client (`qzone.qq.com` is feed-only)                        | —                                                     | **NO**                                   | —               | Tencent never shipped a true web QQ chat. Native-only. Mark unsupported                                                                                                                                                                                                                                                                                                                                                        |
| **Mattermost / Rocket.Chat / Element (Matrix)** | Self-hosted URLs vary                                                               | Custom (varies)                                       | **YES**                                  | **MEDIUM**      | Not in PROJECT.md v2 list, but natural community-adapter candidates. All three have well-documented DOM and stable selectors. Defer to community adapter SDK (v1.x differentiator)                                                                                                                                                                                                                                             |

### Feasibility Summary

- **Confirmed shippable via DOM injection (V1 / early V2):** OpenClaw, Discord, Telegram Web, Slack, Zalo
- **Possible but high-effort / fragile:** Microsoft Teams, Google Chat, Feishu/Lark, Nextcloud Talk
- **Recommend deep-link only (not auto-send):** WhatsApp Web (ban risk), LINE (no web), Telegram native fallback
- **Unsupported, document why:** Signal (no web client), WeCom (deprecated web), QQ (no web chat)
- **Implication for roadmap:** v2 should be split into two tiers — "Tier-A Confirmed DOM" (Telegram + Slack first, since they have the largest user bases with documented automation patterns) and "Tier-B Best-Effort" (Teams, Google Chat, Feishu/Lark — schedule sequentially, not in parallel, to manage QA load).

## MVP Definition

### Launch With (v1.0)

Minimum viable product — what's needed to validate the Core Value (one click → format + prompt → IM/Agent session).

- [ ] **MV3 manifest + service worker + popup + content-script skeleton** — load-bearing for everything
- [ ] **Click-to-popup with metadata preview** (`title` / `url` / `description` / `create_at` / `content` via Readability) — the popup IS the product
- [ ] **`send_to` input** with platform-icon recognition by URL pattern (OpenClaw + Discord registered)
- [ ] **`send_to` history** with MRU autocomplete dropdown
- [ ] **`prompt` input** with history autocomplete
- [ ] **`send_to` ↔ `prompt` binding** (auto-switch prompt on send_to change) — Core Value differentiator
- [ ] **OpenClaw adapter** — `http://localhost:18789/chat?session=agent:<a>:<s>` injection
- [ ] **Discord adapter** — `https://discord.com/channels/<g>/<c>` injection (Slate editor)
- [ ] **Confirm-button dispatch** — open/activate target tab, run adapter, show success/error
- [ ] **Graceful failure handling** — adapter `canDispatch` probe, error reasons surfaced in popup
- [ ] **i18n: en + zh_CN** — `chrome.i18n` + `_locales`
- [ ] **All persistence in `chrome.storage.local`** — schema versioned for migration
- [ ] **Keyboard shortcut** (default suggestion, user-rebindable)

### Add After Validation (v1.x)

Features to add once core dispatch is reliable.

- [ ] **Per-platform message templates** (default + user override) — once we have 2 adapters we have a real signal of template variance
- [ ] **Queue + retry on dispatch failure** — trigger: any user reports of silent failures
- [ ] **Multi-target fan-out (≤5 destinations)** — trigger: user requests "send to my Agent and team Discord"
- [ ] **Page-region clipping** (selection mode + element picker) — trigger: clipping news articles or long pages where full-page noise is high
- [ ] **Bulk export of history** (JSON / Markdown) — trivial to ship, builds privacy trust
- [ ] **Diagnostics page** ("why didn't it send?") — trigger: support questions accumulate
- [ ] **More i18n locales** — at minimum: ja, ko, pt-BR (Obsidian Clipper added these and saw uptake)
- [ ] **Smart prompt suggestions by page-type** — once history has signal (Schema.org @type → prior prompts)
- [ ] **Native deep-link fallback per adapter** — for platforms where DOM injection is unreliable

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Tier-A IM platforms via DOM injection:** Telegram Web, Slack, Zalo
- [ ] **Tier-B IM platforms (best-effort):** Microsoft Teams, Google Chat, Feishu/Lark, Nextcloud Talk
- [ ] **Deep-link-only platforms:** WhatsApp Web (deep-link `https://wa.me/...?text=`), LINE (`line://...`)
- [ ] **Adapter SDK** for community-contributed platforms (Mattermost, Rocket.Chat, Element/Matrix)
- [ ] **Custom template editor UI** (PROJECT.md deferred section)
- [ ] **History search / favorites view** (PROJECT.md deferred section)
- [ ] **Config import/export** (PROJECT.md deferred section)
- [ ] **Firefox / Edge port** (post WebExtension parity audit)
- [ ] **User-managed webhook send** (opt-in power-user mode for Discord webhook, Feishu robot, Nextcloud bot — only when user explicitly opts in and supplies their own URL)

## Feature Prioritization Matrix

| Feature                                    | User Value                  | Implementation Cost | Priority |
| ------------------------------------------ | --------------------------- | ------------------- | -------- |
| MV3 skeleton + popup + content script      | HIGH (foundation)           | MEDIUM              | **P1**   |
| Metadata preview (Readability + OG/Schema) | HIGH                        | LOW                 | **P1**   |
| `send_to` platform recognition + icon      | HIGH                        | LOW                 | **P1**   |
| `send_to` history + MRU autocomplete       | HIGH                        | LOW                 | **P1**   |
| `prompt` history + autocomplete            | HIGH                        | LOW                 | **P1**   |
| `send_to` ↔ `prompt` binding               | HIGH (Core Value)           | LOW                 | **P1**   |
| OpenClaw adapter                           | HIGH                        | LOW                 | **P1**   |
| Discord adapter                            | HIGH                        | MEDIUM              | **P1**   |
| Dispatch confirm + error UX                | HIGH                        | MEDIUM              | **P1**   |
| i18n (en + zh_CN)                          | HIGH (constraint)           | LOW                 | **P1**   |
| Local-only storage                         | HIGH (constraint)           | LOW                 | **P1**   |
| Keyboard shortcut                          | MEDIUM                      | LOW                 | **P1**   |
| Per-platform message templates             | HIGH                        | MEDIUM              | **P2**   |
| Queue + retry                              | HIGH                        | MEDIUM              | **P2**   |
| Multi-target fan-out                       | MEDIUM                      | MEDIUM              | **P2**   |
| Page-region clipping                       | MEDIUM                      | MEDIUM              | **P2**   |
| Bulk export of history                     | MEDIUM                      | LOW                 | **P2**   |
| Diagnostics page                           | MEDIUM                      | LOW                 | **P2**   |
| Smart prompt suggestions                   | MEDIUM                      | MEDIUM              | **P2**   |
| Native deep-link fallback                  | MEDIUM                      | MEDIUM              | **P2**   |
| Telegram Web adapter                       | HIGH                        | MEDIUM              | **P2**   |
| Slack adapter                              | HIGH                        | MEDIUM              | **P2**   |
| Microsoft Teams adapter                    | MEDIUM                      | HIGH                | **P3**   |
| Google Chat adapter                        | MEDIUM                      | HIGH                | **P3**   |
| Feishu / Lark adapter                      | MEDIUM (CN market)          | HIGH                | **P3**   |
| WhatsApp deep-link only                    | MEDIUM                      | LOW                 | **P3**   |
| Adapter SDK                                | LOW (until adapters stable) | HIGH                | **P3**   |
| Custom template editor UI                  | MEDIUM                      | MEDIUM              | **P3**   |
| Firefox / Edge port                        | LOW (v1 audience)           | MEDIUM              | **P3**   |

**Priority key:**

- **P1**: Must have for v1 launch — defined by PROJECT.md MVP
- **P2**: Should have, add when v1 is stable and validated (v1.x)
- **P3**: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature                          | Notion Web Clipper                   | Obsidian Web Clipper                        | Pocket / Save to Pocket        | MarkDownload               | Web2Chat (our plan)                                 |
| -------------------------------- | ------------------------------------ | ------------------------------------------- | ------------------------------ | -------------------------- | --------------------------------------------------- |
| Popup metadata preview           | Minimal (workspace + DB picker only) | Rich (title/byline/date from Readability)   | Tags + title preview           | Title + Markdown preview   | **Rich preview + send_to + prompt — IM-targeted**   |
| Main-content extraction          | Yes (proprietary)                    | **Mozilla Readability**                     | Yes (proprietary, with images) | Mozilla Readability        | **Mozilla Readability** (de-facto winner)           |
| Custom templates per destination | No                                   | **Yes (auto-apply by URL pattern)**         | No                             | No                         | **Yes (per-platform default + user override)**      |
| Send-to-IM destinations          | None (Notion DB only)                | None (Obsidian vault only)                  | None (Pocket only)             | Clipboard / Obsidian       | **Multiple IM/Agent destinations** ← differentiator |
| Multi-target fan-out             | No                                   | No                                          | No                             | No                         | **Yes (≤5)** ← differentiator                       |
| Cloud sync                       | Yes (Notion account)                 | No (vault is local but vault-sync optional) | Yes (Pocket account)           | No                         | **No (anti-feature)**                               |
| AI summarization                 | No                                   | Yes (Interpreter, opt-in, BYO key)          | No                             | No                         | **No (anti-feature — downstream Agent's job)**      |
| Page-region clipping             | Yes (selection)                      | Yes (highlights + selection)                | Yes (selection)                | Yes (selection)            | v1.x — selection mode                               |
| i18n                             | Yes (~15 locales)                    | Yes (en/pt-BR/id/ko/zh-Hant + more)         | Yes                            | Limited                    | **Yes (en/zh_CN at v1.0, more later)**              |
| Keyboard shortcut                | Yes                                  | Yes                                         | Yes                            | Yes                        | Yes                                                 |
| Diagnostics on failure           | Limited                              | Limited                                     | Limited                        | Limited                    | **Yes (per-target diagnostics)** ← differentiator   |
| Bulk export                      | No (Notion handles)                  | Native (it's Markdown files)                | Yes (Pocket export)            | N/A (output is the export) | **Yes (JSON / Markdown)** ← v1.x                    |

**Where Web2Chat wins:** Send-to-IM as the primary verb. Every other clipper is "save somewhere"; Web2Chat is "**dispatch to a conversation**". The send_to-↔-prompt binding is the UX moat — no competitor in either category (clippers or share-to-chat tools) implements it.

**Where Web2Chat will not compete:** Cloud sync (Notion / Pocket own that lane). AI summarization (Obsidian Clipper has it; we explicitly don't). Cross-browser at v1 (everyone supports Firefox/Safari; we'll catch up in v2).

## Sources

### Reference Products Analyzed

- [Notion Web Clipper – Chrome Web Store](https://chromewebstore.google.com/detail/notion-web-clipper/knheggckgoiihginacbkhaalnibhilkk)
- [Notion Web Clipper Help](https://www.notion.com/help/web-clipper)
- [Save to Notion (third-party comparison)](https://chromewebstore.google.com/detail/save-to-notion/ldmmifpegigmeammaeckplhnjbbpccmm)
- [Obsidian Web Clipper – obsidianmd/obsidian-clipper](https://github.com/obsidianmd/obsidian-clipper)
- [Obsidian Web Clipper – stephango.com](https://stephango.com/obsidian-web-clipper)
- [Obsidian Web Clipper – obsidian.md/clipper](https://obsidian.md/clipper)
- [Slack Markdown Proxy – Chrome Web Store (proves Slack uses Quill)](https://chromewebstore.google.com/detail/slack-markdown-proxy/llanfnajlpjggcklilogepheehdfdgnd)
- [Slack Markdown Proxy – GitHub](https://github.com/monzou/slack-markdown-proxy)
- [Hackable Slack Client (CSS/JS injection patterns)](https://github.com/bhuga/hackable-slack-client)
- [Telegram Media Downloader (userscript DOM injection reference)](https://deepwiki.com/Neet-Nestor/Telegram-Media-Downloader)
- [zlapi – Zalo Web automation reference](https://github.com/Its-VrxxDev/zlapi)
- [WhatsApp Web Chrome extension reference](https://github.com/bioenable/whatsapp-web-chrome-extension)
- [How to Build a Chrome Extension for WhatsApp Web (Medium)](https://medium.com/swlh/how-to-build-a-chrome-extension-to-spam-on-whatsapp-using-vanilla-javascript-1c00faa6a2f7)
- [Chat Plus for Google Chat – Chrome Web Store](https://chromewebstore.google.com/detail/chat-plus-for-google-chat/njkkenehdklkfdkmonkagaicllmnfcda)

### Platform & Technical Documentation

- [Chrome MV3 content scripts – developer.chrome.com](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome MV3 message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [chrome.scripting API (MAIN world injection)](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [chrome.i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [Chrome MV3 i18n message formats](https://developer.chrome.com/docs/extensions/mv3/i18n-messages/)
- [Inject a Global with Web Extensions in Manifest V3 – David Walsh](https://davidwalsh.name/inject-global-mv3)
- [Discord webhooks (alternative path) – DEV community](https://dev.to/oskarcodes/send-automated-discord-messages-through-webhooks-using-javascript-1p01)
- [Microsoft Teams – platform docs (officially-blessed Message Extensions, anti-feature for us)](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions)
- [Feishu Open Platform – Send Message API (official path, anti-feature)](https://open.feishu.cn/document/server-docs/im-v1/message/create)
- [WeCom Developer Center – message send (official path, anti-feature)](https://developer.work.weixin.qq.com/document/path/90236)
- [Nextcloud Talk Bots & Webhooks (official path, anti-feature)](https://nextcloud-talk.readthedocs.io/en/latest/bots/)
- [Signal Desktop – why no web client (security posture)](https://aboutsignal.com/blog/signal-web/)
- [Signal Desktop – Standalone Signal Desktop blog](https://signal.org/blog/standalone-signal-desktop/)

### Risk & Anti-Pattern Sources

- [Over 100 Chrome extensions break WhatsApp's anti-spam rules (Malwarebytes 2025)](https://www.malwarebytes.com/blog/news/2025/10/over-100-chrome-extensions-break-whatsapps-anti-spam-rules)
- [WhatsApp API vs Unofficial Tools – risk analysis](https://www.bot.space/blog/whatsapp-api-vs-unofficial-tools-a-complete-risk-reward-analysis-for-2025)
- [WhatsApp Help Center – Unauthorized automated/bulk messaging](https://faq.whatsapp.com/5957850900902049)
- [Chrome extension message-passing security – Duo Labs](https://duo.com/labs/tech-notes/message-passing-and-security-considerations-in-chrome-extensions)

### UX Pattern Sources

- [Smart Interface Design Patterns – autocomplete UX](https://smart-interface-design-patterns.com/articles/autocomplete-ux/)
- [Baymard – 9 UX best practices for autocomplete](https://baymard.com/blog/autocomplete-design)
- [UX Patterns for Developers – autocomplete pattern](https://uxpatterns.dev/patterns/forms/autocomplete)

---

_Feature research for: Chrome MV3 Web Clipper extension dispatching to IM / AI-Agent web sessions_
_Researched: 2026-04-28_
