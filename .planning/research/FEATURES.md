# Feature Landscape — Prompt Template Variable References (`{{field}}`)

**Domain:** Chrome MV3 web clipper — existing extension, new milestone feature
**Researched:** 2026-06-19
**Scope:** User-facing behavior ONLY of the NEW `{{field}}` template variable feature, layered on top of the already-shipped capture → preview → dispatch pipeline (v1.2, OpenClaw / Discord / Slack / Telegram).

> Confidence note: This is a feature-design research, not an ecosystem survey. All behavioral recommendations are derived from reading the actual shipped code (`shared/adapters/*-format.ts`, `SendForm.tsx`, `CapturePreview.tsx`, `binding.ts`, `dispatch.ts` route schema). Recommendations are marked by the code reality they must respect. Where a behavior is a genuine product decision (not derivable from code), it is flagged as such.

---

## Current Pipeline (what `{{field}}` plugs into)

Before defining features, the constraints the feature must respect — confirmed from source:

1. **Prompt is persisted as raw text.** `binding.ts` stores `prompt` verbatim keyed by `send_to`; popup history (`history.list kind:'prompt'`) also stores raw values. So a prompt like `总结 {{title}}` is saved and restored as-is — the variable survives across sessions and must be re-substituted on every use.
2. **Substitution does NOT happen in the popup today.** The popup only renders the editable snapshot fields + the raw prompt combobox (`SendForm.tsx`, `CapturePreview.tsx`). The 4 platform `compose*` functions are the only place prompt + snapshot merge into final text, and they run inside the **adapter content script at dispatch time** (`entrypoints/<platform>.content.ts`), not in the popup.
3. **Each platform has its own field-level escaping/transformation.** Discord/Slack `escapeMentions`, Slack `convertMarkdownToMrkdwn`, Telegram plain-text, OpenClaw raw Markdown. These operate per-field AFTER assembly. This is the critical ordering constraint (see ARCHITECTURE implication below).
4. **`create_at` is `z.string().datetime()`** (ISO-8601, e.g. `2026-06-19T08:30:00.000Z`). The popup displays it via `Intl.DateTimeFormat`, but the field value sent to compose is the raw ISO string.
5. **Dispatch payload (`DispatchStartInputSchema`) carries `prompt` (max 10_000 chars) + full `ArticleSnapshot`.** The snapshot already includes user-edited field values (popup lets users edit title/description/content before dispatch). So substitution must use the **edited** values, not the originally-extracted ones.

**Architecture implication (informs many behaviors below):** `{{field}}` substitution is a **pure function** `renderPrompt(prompt, snapshot) → string` that must run in BOTH (a) the popup for live preview, and (b) inside each adapter before `compose*`. To keep preview ≡ dispatch (the quality gate), this function must be in `shared/`, imported by both, and the adapter must substitute **before** its platform-specific escaping so that substituted content is itself escaped.

---

## Variable Namespace (the contract)

The available snapshot fields (from `ArticleSnapshot` / `Snapshot` interface, shared identically across all 4 format files):

| Token | Resolves to | Source |
|-------|-------------|--------|
| `{{title}}` | Page title (user-editable in popup) | extractor / popup edit |
| `{{url}}` | Page URL (read-only in popup) | active tab |
| `{{description}}` | Meta description (user-editable) | extractor / popup edit |
| `{{create_at}}` | Capture timestamp (read-only) | SW, ISO-8601 |
| `{{content}}` | Article body as Markdown (user-editable) | Readability + Turndown |

These five are the only first-class variables. The naming mirrors the existing field keys users already see labeled in the popup's Properties panel — no new vocabulary to learn.

---

## Table Stakes

Behaviors users will assume work. Missing any = the feature feels broken or unsafe.

| # | Feature / Behavior | Why Expected | Complexity | Testable behavior (spec-ready) |
|---|--------------------|--------------|------------|--------------------------------|
| TS-1 | **Substitution of all 5 known variables** | The whole point of the feature. A user typing `{{title}} — {{url}}` must see them replaced. | Low | `renderPrompt('Read {{title}} at {{url}}', snap)` → `'Read <title> at <url>'`. All 5 tokens (`title/url/description/create_at/content`) each resolve to their snapshot value. |
| TS-2 | **Unknown / typo'd variables left verbatim** | Silent corruption of a typo'd `{{dedcription}}` into empty string would destroy the user's intent invisibly. Leaving it literal is the only safe default. | Low | `renderPrompt('See {{dedcription}}', snap)` → `'See {{dedcription}}'` (token preserved character-for-character). No throw, no empty, no warning banner required for table stakes. |
| TS-3 | **Empty snapshot field → empty substitution (token removed)** | Matches the existing format-layer rule ("empty fields omitted entirely"). Consistent with how `composeMarkdown` already drops empty fields. | Low | `renderPrompt('Desc: {{description}}', {description:'', ...})` → `'Desc: '` (the `{{description}}` is replaced by `''`, leaving the literal prefix). The token itself disappears; surrounding literal text is untouched. |
| TS-4 | **Variables work regardless of surrounding text** | Users embed variables mid-sentence, with Markdown, with multiple occurrences. | Low | Multiple occurrences: `renderPrompt('{{title}} ({{title}})', snap)` → both replaced. Literal braces in content are not mistaken for tokens. |
| TS-5 | **Preview in popup reflects substitution live** | Users adjust the prompt and expect to see the resolved text before committing. This is the preview/dispatch-consistency quality gate. | Medium | Given snapshot `{title:'X'}`, typing prompt `Send {{title}}` shows a preview containing `Send X`. Editing the title field in the Properties panel updates the preview to match. |
| TS-6 | **Dispatched message ≡ preview** | If preview shows `Send X` but Discord receives `Send {{title}}`, trust is destroyed. Must share one substitution function. | Medium | For each platform adapter, after dispatch the message text equals `renderPrompt(prompt, editedSnapshot)` fed through that platform's `compose*` — i.e. substitution happens once, before platform escaping. No platform sees a raw `{{...}}`. |
| TS-7 | **Substituted content gets platform-escaped** | If `{{content}}` injects `@everyone` into Discord and it isn't escaped, that's a regression of the existing `escapeMentions` safety. Substitution must precede escaping. | Medium | A snapshot whose `title` contains `@everyone`, used via `{{title}}` in Discord, must be neutralized by `escapeMentions` exactly as a literal title is today. (Ensured by ordering: render → then escape.) |
| TS-8 | **Prompt history + binding carry variables** | Since prompt is stored raw, switching `send_to` (soft-overwrite, `SendForm.tsx` D-27) must restore a templated prompt and still substitute correctly. | Low | Save binding prompt `总结 {{title}}`; reopen popup, select same `send_to`, the prompt field shows `总结 {{title}}` (raw, as authored); preview shows resolved text. |
| TS-9 | **i18n: any UI surface for variables is localized** | Project constraint: no hardcoded user-facing strings. | Low | If a variable picker / hint / docs surface is shown, its labels go through `t()`. zh_CN + en both 100% covered. (Does not apply to the tokens themselves — `{{title}}` is fixed syntax, not localized.) |

---

## Differentiators

Features that elevate the feature beyond "works". Not expected, but valued. Choose based on how much the user base actually composes prompts.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| DIF-1 | **Unknown-variable warning in preview** | Catches typos (`{{dedcription}}`) before dispatch by flagging unresolved tokens visually. | Medium | Optional: a subtle inline highlight or a one-line "unresolved variable: {{dedcription}}" hint under the prompt. Must not block dispatch (user may intend a literal `{{...}}`). This is the "nice" version of TS-2. |
| DIF-2 | **Variable picker / insert button** | Reduces typos and teaches the namespace. A small "insert variable" affordance next to the prompt combobox inserting `{{title}}` etc. | Medium | New UI in `SendForm.tsx`. Could be a tiny dropdown or chip row of the 5 tokens. Improves discoverability for users who don't know the syntax. |
| DIF-3 | **`create_at` formatting token variant** | Raw ISO `2026-06-19T08:30:00.000Z` is ugly inside a sentence. Offering e.g. `{{create_at}}` (raw) vs a locale-formatted variant lets users put a human date in prose. | Medium | **Product decision, not derivable from code.** Options: keep raw ISO only (simplest, table-stakes), or add a second token like `{{create_at_date}}` for locale-formatted. Recommend deferring unless users ask — the popup already shows a formatted date, so raw ISO in the message may surprise. Flag for requirements. |
| DIF-4 | **Re-substitution on field edit in popup** | When the user edits title/description/content after typing the prompt, the preview updates live (already required by TS-5, but as a perceptible feature it's a selling point: "edit once, prompt follows"). | Low | Comes free if preview is reactive on snapshot signals. |
| DIF-5 | **Persistence of "template" prompts as named entities** | Today prompts are an MRU list. Letting users name/save a template (`"Daily summary"`) separate from MRU is a step toward a template library. | High | Out of scope for this milestone — `PROJECT.md` already lists "自定义模板编辑器" (custom template editor) as a **v2 deferred candidate**. This feature should NOT introduce named templates; that's its own milestone. |

---

## Anti-Features

Things to explicitly NOT build. Stating them prevents scope creep in requirements.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|--------------------|
| AF-1 | **Silent coercion / autocorrect of unknown tokens** | Turning `{{dedcription}}` into empty or into `{{description}}` invisibly changes user intent and is impossible to debug. (Contradicts TS-2.) | Leave unknown tokens verbatim; optionally warn (DIF-1) but never mutate. |
| AF-2 | **Throwing / blocking dispatch on unresolved variable** | A literal `{{example}}` the user genuinely wants in the message would break dispatch. | Substitution never throws; unknown tokens pass through as literal text. |
| AF-3 | **Variable syntax beyond `{{name}}`** (e.g. `${name}`, `%name%`, filters `{{title\|upper}}`, conditionals) | Explodes the parser, escapes into template-engine territory, and conflicts with Markdown/LaTeX content. The project explicitly avoids LLM/templating complexity. | Exactly one syntax: `{{` + identifier + `}}`. No filters, no pipes, no control flow. |
| AF-4 | **Variable values reformatted / summarized by the extension** | "AI summarize `{{content}}`" violates the no-LLM constraint (`PROJECT.md` Out of Scope). Substitution is a literal string splice. | Token resolves to the exact snapshot field value, untouched except by platform escaping (TS-7). |
| AF-5 | **New snapshot fields introduced only for templating** | Adds surface area; the 5 existing fields already cover title/url/description/time/content. | Reuse the 5 existing `ArticleSnapshot` fields only. |
| AF-6 | **Per-platform variable namespaces** | Discord-only `{{channel}}` etc. would fragment the mental model and re-introduce platform-specific logic into the prompt (violates the adapter-pattern boundary). | One shared namespace across all platforms. |
| AF-7 | **Named template library / template editor UI** | That's a separate v2 milestone (`PROJECT.md` deferred). Mixing it in inflates this milestone. | This feature treats prompts as text; persistence stays MRU + binding as-is. |

---

## Feature Dependencies

```
TS-1 (substitute 5 vars)
 ├─ requires: shared renderPrompt() pure fn  ── used by ──┐
 │                                                        ├─ TS-5 (popup preview)
 │                                                        └─ TS-6 (dispatch ≡ preview)
 TS-2 (unknown verbatim) ── independent of TS-1 parsing but same parser
 TS-3 (empty → removed)  ── same parser
 TS-7 (escape substituted) ── requires renderPrompt() runs BEFORE compose* escaping
 TS-8 (history/binding carry vars) ── free, prompt stored raw already
 TS-6 ── blocks ── ship (no ship without preview≡dispatch)
 DIF-1 (warn) ── depends on TS-2 (must know which tokens are unresolved)
 DIF-2 (picker) ── depends on TS-1 namespace existing
```

**Critical path:** define `renderPrompt` in `shared/` → wire into popup preview (TS-5) → wire into all 4 adapters before escape (TS-6/TS-7) → verify equivalence via unit tests. Everything else is independent.

---

## Edge-Case Behavior Matrix (the quality gate)

Explicit, testable decisions for the cases the team-lead named. These are the acceptance criteria.

| Case | Input (`prompt` / `snapshot`) | Expected output | Rationale |
|------|-------------------------------|-----------------|-----------|
| Unknown variable | `'X {{unknown}} Y'` / any | `'X {{unknown}} Y'` | TS-2 — verbatim, no throw |
| Typo of real field | `'{{dedcription}}'` / `{description:'D'}` | `'{{dedcription}}'` | TS-2 — typo ≠ field, stays literal |
| Empty field | `'D: {{description}}'` / `{description:''}` | `'D: '` | TS-3 — token → empty string |
| Whitespace in token | `'{{ title }}'` / `{title:'T'}` | **DECISION NEEDED** (recommend: resolve → `'T'`, tolerant of whitespace) | Lenient parsing improves UX; flag for requirements |
| Wrong case | `'{{Title}}'` / `{title:'T'}` | **DECISION NEEDED** (recommend: verbatim `'{{Title}}'`, case-sensitive) | Case-sensitive avoids ambiguity; cheaper than case-folding. Flag for requirements. |
| Literal braces user wants | `'Use {{literal}}'` intending literal | `'Use {{literal}}'` | Naturally correct (unknown token stays). No escape syntax needed — if a field were literally named `literal` it'd resolve, otherwise it stays. Acceptable. |
| Multiple occurrences | `'{{title}} {{title}}'` / `{title:'T'}` | `'T T'` | TS-4 — all occurrences replaced |
| Variable at start/end | `'{{title}}end'`, `'start{{url}}'` | replaced at boundaries | Boundary correctness |
| `{{content}}` with Discord-unsafe text | content contains `@everyone` | `escapeMentions` neutralizes it | TS-7 — substitution precedes escape |
| Token inside Markdown | prompt has `**{{title}}**` | `**<title>**` then platform handles bold | Literal Markdown around token is fine |
| `create_at` raw ISO | `'At {{create_at}}'` | `'At 2026-06-19T08:30:00.000Z'` | TS-1 — raw field value (DIF-3 is the optional pretty variant) |
| Edit field after typing prompt | change title in popup | preview re-renders with new title | TS-5/DIF-4 — reactive |
| Binding restore | reopen, select send_to with templated prompt | prompt field shows raw `{{title}}`; preview resolved | TS-8 |
| No variables at all | `'Just text'` / any | `'Just text'` unchanged | Zero-cost passthrough, no behavior change for existing users |

The two **DECISION NEEDED** rows (`{{ title }}` whitespace tolerance, `{{Title}}` case sensitivity) are genuine product choices not determinable from code — they must be settled in requirements. Recommendation: whitespace-tolerant + case-sensitive (lowest surprise, simplest regex).

---

## MVP Recommendation

**Build (this milestone):**
1. TS-1 through TS-9 (the full table-stakes set) — especially the shared `renderPrompt` pure function and the preview≡dispatch guarantee (TS-5/TS-6). This is the non-negotiable core.
2. **Defer the two DECISION NEEDED** parsing rules to requirements sign-off, but implement them as single-regex choices (trivial either way).

**Defer (explicitly):**
- DIF-1 (unknown-variable warning): nice-to-have; only add if requirements time permits. Cheap once TS-2's "which tokens are unresolved" is exposed.
- DIF-2 (variable picker): defer unless discoverability is a stated goal.
- DIF-3 (`create_at` formatted variant): defer; surface the raw-ISO surprise in requirements instead.
- DIF-5 (named templates): out of scope — separate v2 milestone per `PROJECT.md`.

**Hard guardrails (non-negotiable, from shipped architecture):**
- `renderPrompt` lives in `shared/`, no `chrome.*`, imported by both popup and all 4 adapters.
- Substitution runs **before** platform escaping in every adapter (TS-7) — otherwise `escapeMentions`/`convertMarkdownToMrkdwn` regress.
- Dispatch payload (`DispatchStartInputSchema`) is unchanged in shape — substitution is applied to the prompt string using the already-present snapshot; no new schema field needed.
- No new storage schema/migration for table stakes (prompt stays raw text in binding/history). A migration is only needed if named templates (DIF-5) ship — which they don't here.

---

## Implications for Requirements Writer (downstream consumer)

- **Categories to define requirements under:**
  1. Substitution semantics (TS-1, TS-2, TS-3, TS-4 + the 2 DECISION NEEDED rules)
  2. Preview behavior (TS-5)
  3. Dispatch consistency (TS-6, TS-7)
  4. Persistence interaction (TS-8)
  5. i18n surface (TS-9)
- **Testable user behaviors:** every TS-* and edge-case row is written as a concrete input→output — directly translatable to Vitest unit specs on `renderPrompt` and to adapter format specs asserting post-substitution escaping.
- **Deferred scope (state explicitly in requirements "Out of Scope"):** DIF-1..DIF-5, AF-1..AF-7, named template library.
- **Open questions for requirements sign-off (flag, don't decide silently):**
  1. `{{ title }}` whitespace tolerance — on or off?
  2. `{{Title}}` case sensitivity — strict or case-insensitive?
  3. Is a preview of the **resolved** message required (TS-5), or only the raw prompt as today? (Recommend: resolved preview — it's the consistency guarantee.)
  4. Should `{{create_at}}` resolve to raw ISO (default) — acceptable to users?

---

## Sources

- `shared/adapters/openclaw-format.ts`, `discord-format.ts`, `slack-format.ts`, `telegram-format.ts` — field-level escaping + empty-field-omission rule + prompt-first assembly (TS-3, TS-7 ordering basis). HIGH confidence (source code).
- `entrypoints/popup/components/SendForm.tsx` — prompt combobox, binding soft-overwrite (D-27), popupDraft debounce, `buildDispatchInput` carrying edited snapshot. HIGH confidence.
- `entrypoints/popup/components/CapturePreview.tsx` — confirms popup does NOT render resolved message today (only raw fields + raw prompt). HIGH confidence.
- `shared/storage/repos/binding.ts` — prompt persisted raw, keyed by send_to. HIGH confidence.
- `shared/messaging/routes/dispatch.ts` — `DispatchStartInputSchema`: prompt max 10_000 chars + full snapshot, no resolved-prompt field. HIGH confidence.
- `shared/messaging/routes/capture.ts` — `create_at: z.string().datetime()` (ISO-8601). HIGH confidence.
- `.planning/PROJECT.md` — no-LLM constraint, custom-template-editor deferred to v2, i18n/local-first constraints. HIGH confidence.
