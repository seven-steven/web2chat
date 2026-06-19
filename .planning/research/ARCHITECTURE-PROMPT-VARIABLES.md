# Architecture: Prompt Template Variable References (v2.0 feature)

**Domain:** Chrome MV3 web-clipper — adding variable references to user prompts
**Researched:** 2026-06-19
**Overall confidence:** HIGH (grounded in current codebase; integration points read directly)

> Feature-scoped architecture study for the upcoming milestone "prompt
> template variable references." The prior `ARCHITECTURE.md` (v1.1
> multi-adapter research) was renamed to `ARCHITECTURE-v1.1.md` to
> preserve the delivered milestone record; this file is the current
> architecture reference. The capture → popup → SW → adapter data flow
> is summarized below only as integration context.

## Executive Summary

The feature lets users write prompts containing **variable references**
(e.g. `Summarize this for {{audience}}: {{title}}`) that resolve against
the captured `ArticleSnapshot` plus a small set of prompt-scoped user
variables at dispatch time. Today, prompts are treated as an opaque
string that flows unchanged through `DispatchStartInput.prompt` into each
platform adapter, where the per-platform `*-format.ts` composer appends
title/url/description/content around it.

The cleanest integration is a **single substitution layer placed in the
service worker at `dispatch.start` time**, producing a fully-resolved
`prompt` string that the existing pipeline and adapters consume
**unchanged**. This preserves the registry-driven adapter isolation that
the project has proven across 5 adapters (OpenClaw / Discord / Slack /
Telegram / mock) — no platform-specific code learns that variables exist.

Preview (popup) and dispatch (SW) **must share one substitution
function** so the user sees exactly what will be sent. That function is
pure TypeScript with zero `chrome.*` imports, so it bundles into both the
popup and the SW with no MV3 complications. Composing that resolved
prompt into final per-platform send text continues to live in the
existing `shared/adapters/<platform>-format.ts` composers — preview
should render via the active adapter's composer to avoid drift.

## Existing Architecture (integration context)

Two SW-mediated pipelines (`background/capture-pipeline.ts`,
`background/dispatch-pipeline.ts`). Data shapes:

```
popup ──capture.run──▶ SW ──executeScript(extractor)──▶ tab
                                                 ◀── ArticleSnapshot {title,url,description,create_at,content}

popup ──dispatch.start({dispatchId, send_to, prompt, snapshot})──▶ SW
SW: findAdapter(send_to) → open/activate tab → executeScript(adapter.js)
SW: tabs.sendMessage(ADAPTER_DISPATCH, {prompt, snapshot, ...})
adapter: compose*/composeDiscordMarkdown/composeSlackMrkdwn/composeTelegramMessage({prompt, snapshot}) → inject+send
```

Key files and their current responsibilities:

| File | Current role | Variable feature impact |
|------|-------------|------------------------|
| `shared/messaging/routes/capture.ts` | `ArticleSnapshotSchema` (5 fields) | Source of built-in variable values |
| `shared/messaging/routes/dispatch.ts` | `DispatchStartInputSchema` — `prompt: z.string().max(10_000)` | Add `promptVariables?` field (see below) |
| `background/dispatch-pipeline.ts` | Orchestrates open/activate/inject/send | Insert substitution step in `startDispatch` |
| `shared/adapters/*-format.ts` (4) | Per-platform `compose*({prompt, snapshot})` | **Unchanged** — receives resolved prompt |
| `shared/adapters/registry.ts` | Pure `findAdapter(url)` | Unchanged; `match()` stays pure |
| `entrypoints/<platform>.content.ts` | DOM compose+inject+send | Unchanged |
| `entrypoints/popup/components/SendForm.tsx` | Prompt combobox + `buildDispatchInput()` | Add substitution for live preview + pass variables |
| `entrypoints/popup/components/CapturePreview.tsx` | Shows raw snapshot fields | Add resolved-prompt preview (read-only) |
| `shared/storage/repos/binding.ts` | `send_to ↔ prompt` binding | Consider storing prompt-scoped variables per binding |
| `shared/storage/items.ts` | Typed storage items | Add `promptVariablesItem` (and/or binding extension) |
| `shared/storage/migrate.ts` | `CURRENT_SCHEMA_VERSION = 1` | Bump schema + add migration if storage shape changes |

## Recommended Architecture

### New module: `shared/prompt-template/` (pure, no chrome.*)

```
shared/prompt-template/
  variables.ts      — variable catalog (built-in + user-defined), typed
  substitute.ts     — pure render(prompt, context) → {text, missing[]}
  schema.ts         — zod schemas for variable defs + resolved result
  index.ts          — barrel
```

**Built-in variables** (resolve from `ArticleSnapshot`, zero-config):

| Reference | Source |
|-----------|--------|
| `{{title}}` | snapshot.title |
| `{{url}}` | snapshot.url |
| `{{description}}` | snapshot.description |
| `{{content}}` | snapshot.content |
| `{{create_at}}` | snapshot.create_at (ISO-8601) |

**User-defined variables** (per-binding or global, stored locally): a
small named string map, e.g. `{{audience}}`, `{{tone}}`. Resolution
priority: user-defined vs built-in — and whether shadowing a built-in
name is allowed — is a product decision flagged for requirements.

### Substitution layer placement: SW at `dispatch.start`

```typescript
// background/dispatch-pipeline.ts :: startDispatch (Step 2, after findAdapter)
const resolved = substitutePrompt(input.prompt, {
  snapshot: input.snapshot,
  variables: input.promptVariables ?? {},
});
input = { ...input, prompt: resolved.text };
// resolved.missing[] can attach as a DispatchWarning (SELECTOR-style)
```

**Why SW, not the adapter:** the adapters are intentionally ignorant of
prompt semantics; they receive a final `prompt` string and compose
platform-specific send text around it. Running substitution once in the
SW means all 4 (and future) adapters benefit for free, and the
`DispatchRecord` persisted to `storage.session` holds the *resolved*
prompt — which is what actually matters for replay/debug after SW restart.

**Why not the popup:** the popup already computes a preview via the same
pure function (next section); it does *not* mutate `prompt` before
sending. The `DispatchStartInput.prompt` sent over the wire is the
**template**; the SW owns final resolution. This keeps the two contexts
honest: popup preview = `substitute(template)`, SW dispatch =
`substitute(template)` — same function, same input.

### Decision: render (substitute) in the SW, NOT in the content script

The natural-looking alternative — letting each platform adapter resolve
`{{...}}` inside its content script, right before/inside the existing
`compose*` call — is rejected. Comparison:

| Criterion | SW render (chosen) | Content-script render (rejected) |
|-----------|--------------------|----------------------------------|
| Code duplication | One call site (`startDispatch`) | N call sites (every `<platform>.content.ts`) |
| Adapter isolation | Adapters stay string-in/string-out | Each adapter must learn template semantics |
| Preview ↔ actual parity | popup + SW share one pure fn; trivially equal | popup would need a 2nd impl → drift risk |
| Future adapters | Zero change to support variables | Each new adapter must re-implement resolution |
| `DispatchRecord` fidelity | Persists the **resolved** prompt (true replay/debug) | Persists only the template; replay can't reproduce what was sent |
| Per-platform composition | Composer still runs in adapter (unchanged) — substitution ≠ composition | Conflates two concerns in one file |
| SW-restart resilience | Resolved prompt already in `storage.session`; replay is exact | Template-only record; resolve state lost on restart |
| Bundle surface | Pure `shared/` module, bundles into popup + SW cleanly | Same pure module would also need bundling into every adapter bundle |

The decisive arguments: (1) the project has a proven invariant that
adapters are dumb string-in/string-out composers (Slack/Telegram shipped
without touching the SW mainline specifically because of this); (2)
persistence fidelity — what gets stored in `DispatchRecord.prompt` must
be what actually got composed and injected, which is the resolved string,
which only the SW can guarantee before the message crosses the
SW→content-script boundary. Composition (`composeMarkdown`,
`composeDiscordMarkdown`, …) **does** stay in the content script — that
is platform-specific final-text assembly, not variable substitution.
The two are deliberately separated: substitution is context-generic
(SW), composition is platform-specific (content script).

### Preview ↔ dispatch rendering contract (quality gate)

The popup must render **exactly** what each platform will send, or users
will be surprised. Two rendering concerns, separated:

1. **Variable substitution** → shared pure function
   `substitutePrompt(template, context)`. Popup calls it for preview;
   SW calls it before compose. Identical input → identical output.
2. **Per-platform composition** → the existing `compose*({prompt, snapshot})`
   functions already produce the final send text. Preview should call the
   **active adapter's composer** (looked up via `findAdapter(send_to)`).

```
Popup preview =
  activeAdapter
    ? composeForAdapter(activeAdapter.id, { prompt: substitutePrompt(template, ctx), snapshot })
    : substitutePrompt(template, ctx)   // no adapter yet → show resolved template only
```

This means the popup needs to import the composer map. Today composers
live in `shared/adapters/*-format.ts` and are **already chrome.*-free**
(verified: openclaw/discord/slack/telegram-format.ts all declare
"Pure utility — no WXT or chrome.* imports"). A small
`shared/adapters/compose.ts` dispatcher keyed by `PlatformId` exposes
the right composer; the popup bundles it (it already bundles
`shared/adapters/registry.ts`).

### Data Flow (with variables)

```
1. capture.run → ArticleSnapshot (unchanged)
2. popup: SendForm binds prompt template + optional promptVariables
3. popup preview = composeForAdapter(adapter.id, { prompt: substitute(template, {snapshot, vars}), snapshot })
4. confirm → dispatch.start({ ..., prompt: <TEMPLATE>, promptVariables: {...}, snapshot })
5. SW startDispatch Step 2: substitute(template, {snapshot, vars}) → resolved.prompt + resolved.missing
6. SW persists DispatchRecord.prompt = resolved.prompt (resolved, not template) — aids replay/debug
7. SW executeScript + ADAPTER_DISPATCH { prompt: resolved.prompt, snapshot } (unchanged payload)
8. adapter compose*(resolved.prompt, snapshot) → inject + send (unchanged)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `shared/prompt-template/` (new) | Variable catalog + pure substitution + zod schemas | popup (preview), SW (resolve), tests |
| `shared/adapters/compose.ts` (new) | `composeForAdapter(id, payload)` dispatcher | popup (preview only) |
| `shared/adapters/*-format.ts` | Per-platform final-text composition (unchanged) | adapter content scripts, popup preview, tests |
| `background/dispatch-pipeline.ts` | Insert substitution at `startDispatch` Step 2 | `shared/prompt-template/`, `shared/storage/repos/dispatch.ts` |
| `shared/storage/repos/binding.ts` | Optionally carry promptVariables with binding | `shared/storage/items.ts` (new item or BindingEntry extension) |
| `shared/messaging/routes/dispatch.ts` | Extend `DispatchStartInputSchema` | popup, SW |
| `entrypoints/popup/components/SendForm.tsx` | Variable UI + preview wiring | `shared/prompt-template/`, `shared/adapters/compose.ts` |

## Patterns to Follow

### Pattern 1: Substitution is a pure function returning a result envelope
```typescript
// shared/prompt-template/substitute.ts
export interface SubstitutionContext {
  snapshot: ArticleSnapshot;
  variables: Record<string, string>;
}
export interface SubstitutionResult {
  text: string;
  missing: string[];   // unknown {{refs}} not in catalog/vars
}
export function substitutePrompt(template: string, ctx: SubstitutionContext): SubstitutionResult {
  // walk template, replace known refs, collect unknown → missing[]
}
```
**Why:** callers (popup, SW) need both the resolved string *and* the
unknown-reference report. The popup shows "⚠ unknown: {{foo}}" inline;
the SW decides whether missing → soft-fail (send anyway) or
`DispatchWarning`. Returning an envelope avoids re-parsing.

### Pattern 2: `DispatchWarning` is the right channel for "missing variable"
The codebase already has `DispatchWarningSchema`
(`SELECTOR_LOW_CONFIDENCE`) driving a `needs_confirmation` popup flow.
Add a `MISSING_VARIABLE` warning code so a prompt referencing an unknown
variable surfaces identically: user confirms or fixes, no silent
misdelivery. This reuses proven plumbing rather than inventing a new
error channel.

### Pattern 3: Persist resolved prompt in `DispatchRecord`
`DispatchRecord.prompt` currently holds what the user typed. After this
feature it holds the **resolved** string. This is the value that
actually got composed and sent, so it's the correct thing to persist for
post-mortem and for the existing retry path (which re-reads the record).
Storing the template too is optional (could add `prompt_template` field)
but not required for correctness.

### Pattern 4: Separate substitution (context-generic) from composition (platform-specific)
Substitution resolves `{{...}}` against snapshot + user vars — identical
for every platform, so it lives in the SW before the message crosses the
SW→content-script boundary. Composition (`composeMarkdown`,
`composeDiscordMarkdown`, …) assembles platform-specific final text
(markdown vs mrkdwn vs plain, truncation, mention-escaping) — so it
stays in each adapter's content script as today. Do not merge them:
merging is what the rejected content-script-render approach would force.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-adapter variable resolution
**What:** each `*-format.ts` learns about `{{...}}` and resolves inline.
**Why bad:** duplicates substitution logic across 4+ files; any adapter
maintainer can introduce drift; violates the proven "adapter = dumb
composer" isolation. Future adapters inherit the bug surface.
**Instead:** resolve once in SW; adapters stay string-in/string-out.

### Anti-Pattern 2: Popup mutates `prompt` before send
**What:** popup sends the *resolved* prompt, not the template.
**Why bad:** the SW no longer has the template, so resubmit/preview on
re-open can't re-resolve against a refreshed snapshot; binding history
stores resolved strings, polluting the prompt combobox with snapshot-
specific text.
**Instead:** send the template + variable map; SW resolves.

### Anti-Pattern 3: Two substitution implementations
**What:** popup hand-rolls a regex for preview; SW has the "real" one.
**Why bad:** preview vs actual divergence — exactly the quality gate
this milestone exists to satisfy. A `{{title}}` rendered as `[title]` in
preview but sent as the real title erodes trust.
**Instead:** one pure function, imported by both.

### Anti-Pattern 4: Introducing `chrome.*` into `shared/prompt-template/`
**What:** substitution reads storage or i18n directly.
**Why bad:** breaks the `shared/` purity contract that lets the module
bundle into both popup and SW and be unit-tested with `fake-browser`.
**Instead:** pass `variables` in via the context; the caller (popup/SW)
reads storage and hands values over.

### Anti-Pattern 5: Resolving inside the content script
**What:** defer substitution to the adapter, "where the snapshot is
finally used."
**Why bad:** loses persistence fidelity (template-only record), breaks
adapter isolation, and forces every adapter to import + call the
resolver. See the SW-vs-content-script decision table above.
**Instead:** SW resolves before `ADAPTER_DISPATCH`; the adapter's
`ADAPTER_DISPATCH` payload already carries the resolved prompt.

## Storage / Schema Considerations

- **Prompt history** (`promptHistoryItem`): storing **templates** is
  correct (reuse across pages). No change to the combobox semantics.
- **Binding** (`BindingEntry`): currently `{send_to, prompt,
  last_dispatched_at}`. If user-defined variables are *per-binding*
  (most intuitive — `{{audience}}` differs per channel), extend
  `BindingEntry` with `variables?: Record<string,string>` and bump
  `CURRENT_SCHEMA_VERSION` to 2 with a migration that defaults existing
  rows to `{}`. If variables are *global* (simpler MVP), add a new
  `local:promptVariables` item and leave bindings alone — **recommend
  global-first** for MVP scope.
- **`DispatchStartInputSchema`**: add
  `promptVariables: z.record(z.string(), z.string()).optional()`. Keeps
  existing call sites valid.

## i18n Considerations

- Variable **names** are identifiers, not localized — `{{title}}` is
  the same in en and zh_CN. Do not route names through `t()`.
- Variable **labels** in the picker UI (e.g. "Article title") must go
  through `t()`. Add keys to both `en` and `zh_CN` locale files
  (100% coverage rule, enforced by `scripts/i18n-coverage.ts` and the
  ESLint no-hardcoded-strings gate).
- The existing `timestampLabel` ("采集时间:") hardcoded in composers is a
  pre-existing locale debt surfaced by preview; consider folding it into
  `t()` as part of this milestone (low effort since composers are pure).

## Scalability / Adapter Growth

The substitution layer is O(prompts × variables) per dispatch — trivial
cost. The decisive property is **adapter isolation**: a 6th, 7th, Nth
adapter (`entrypoints/<platform>.content.ts` + registry entry) requires
**zero** changes to support variables, because it only ever sees the
resolved `prompt` string. This matches the registry-driven pattern that
let Slack / Telegram ship without touching the SW mainline.

## Phase Build Order (for roadmapper)

1. **Pure substitution module** — `shared/prompt-template/` + zod schemas + unit tests. No UI, no SW wiring yet. Foundation everything else depends on.
2. **Extend protocol + SW resolve** — add `promptVariables` to `DispatchStartInputSchema`; insert `substitutePrompt` in `startDispatch`; persist resolved prompt; add `MISSING_VARIABLE` warning code (or soft-fail decision). Validate via existing E2E dispatch specs extended with a template prompt.
3. **Shared composer dispatcher + popup preview** — `shared/adapters/compose.ts`; wire `SendForm`/`CapturePreview` to render `composeForAdapter(...)` so preview matches send. This is the quality-gate phase.
4. **Variable picker UI** — popup affordance to insert `{{...}}` and (if per-binding) edit user variables. Storage item / binding extension + migration if needed. i18n keys.
5. **Hardening** — `MISSING_VARIABLE` confirmation flow parity with `SELECTOR_LOW_CONFIDENCE`; replay correctness across SW restart; tests for template-in-binding-history; locale coverage.

**Ordering rationale:** substitution must exist before either preview or
dispatch can use it (phase 1 blocks 2+3). SW resolution should land
before preview so the *contract* (template on the wire) is fixed before
the popup invests in matching it (phase 2 before 3). UI last because it
is pure presentation once the data flow is proven.

## Key Files Likely Touched

**New:**
- `shared/prompt-template/variables.ts`
- `shared/prompt-template/substitute.ts`
- `shared/prompt-template/schema.ts`
- `shared/prompt-template/index.ts`
- `shared/adapters/compose.ts`

**Modified:**
- `shared/messaging/routes/dispatch.ts` (input schema + warning code)
- `background/dispatch-pipeline.ts` (substitution step, resolved-prompt persistence)
- `shared/storage/items.ts` + `shared/storage/migrate.ts` (if per-binding variables → schema bump)
- `shared/storage/repos/binding.ts` (optional variable carry-through)
- `entrypoints/popup/components/SendForm.tsx` (variable UI, preview wiring)
- `entrypoints/popup/components/CapturePreview.tsx` (resolved-prompt preview)
- locale files `en.*` / `zh_CN.*` (picker labels + warning copy)

**Untouched (by design — proves adapter isolation):**
- `entrypoints/<platform>.content.ts` (all adapters)
- `shared/adapters/<platform>-format.ts` (all composers)
- `shared/adapters/registry.ts`
- `entrypoints/extractor.content.ts`
- `background/capture-pipeline.ts`

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Integration points | HIGH | Read capture/dispatch pipelines, dispatch schema, all four composers, SendForm, CapturePreview directly |
| Adapter isolation preserved | HIGH | Composers verified chrome.*-free; adapters receive only resolved `prompt` string |
| SW-vs-content-script render decision | HIGH | Content scripts (`discord.content.ts` read) already call `compose*` then MAIN-world inject; deferring substitution there loses record fidelity + breaks isolation |
| Preview↔dispatch sharing | HIGH | Both contexts can import the same pure `shared/` module (proven by registry.ts already bundling into popup+SW) |
| Storage schema approach | MEDIUM | Global-vs-per-binding variable scope is a product decision; recommended global-first but flagged for requirements |
| `MISSING_VARIABLE` warning reuse | HIGH | `DispatchWarning`/`needs_confirmation` flow already proven (Phase 9) |
| Phase ordering | MEDIUM | Depends on product decision about variable scope affecting phase 4 storage work |

## Gaps / Decisions for Requirements Phase

- **Variable scope:** global (one `{{audience}}` for all) vs per-binding
  (different per send_to). Recommend **global-first** MVP; per-binding is
  a later phase. Affects storage schema migration.
- **Missing-variable behavior:** hard block, soft send, or confirmation
  warning. Recommend **confirmation warning** (reuse `DispatchWarning`)
  for parity with selector-confidence flow.
- **Shadowing:** may a user variable named `title` shadow the built-in?
  Recommend **disallow** (built-ins reserved) to avoid confusion.
- **Variable syntax:** `{{name}}` vs `${name}` vs `%name%`. Recommend
  `{{name}}` (Obsidian/Mustache-recognizable, low collision with
  Markdown).
- **Per-platform preview fidelity:** some platforms (Discord) truncate
  and escape mentions. Preview should reflect that. The composer
  dispatcher already encodes it — just confirm in UAT.

## Sources

- Codebase (read directly, HIGH confidence):
  - `background/capture-pipeline.ts`, `background/dispatch-pipeline.ts`
  - `shared/messaging/routes/capture.ts`, `shared/messaging/routes/dispatch.ts`
  - `shared/adapters/types.ts`, `shared/adapters/registry.ts`
  - `shared/adapters/openclaw-format.ts`, `shared/adapters/discord-format.ts`,
    `shared/adapters/slack-format.ts`, `shared/adapters/telegram-format.ts`
  - `entrypoints/discord.content.ts` (content-script compose+inject flow),
    `entrypoints/popup/components/SendForm.tsx`,
    `entrypoints/popup/components/CapturePreview.tsx`
  - `shared/storage/items.ts`, `shared/storage/repos/binding.ts`,
    `shared/storage/migrate.ts`
  - `.planning/PROJECT.md`, `.planning/ROADMAP.md`, project `CLAUDE.md`
