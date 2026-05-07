# Design System for Web2Chat

> Editorial / data-dense design language for the Web2Chat Chrome extension.
> Written 2026-05-07. Authoritative source for tokens, typography, components,
> and motion across `popup` and `options` entrypoints.

## 1. Visual Theme & Atmosphere

Web2Chat is a precision instrument for sending the current web page — title, URL, description, content, and a bound prompt — to an IM or AI agent in one click. The interface should feel less like an SaaS dashboard and more like a printed broadsheet: dense, considered, and trustworthy. We call this **Editorial / data-dense**.

The canvas is a warm off-white (`#fafaf7`) — paper, not screen. Type sits on it the way ink sits on uncoated stock: ink-strong (`#0f0f0e`) for headings, ink-base (`#3f3f3a`) for body, ink-muted (`#6b6b62`) for metadata. The single chromatic accent is **rust** (`#c2410c`) — a fired-clay orange that points at the OpenClaw lobster lineage without being literal, and is unmistakably _not_ the default Tailwind sky-blue that signals "AI-generated UI." Status colors (danger, warn, success, info) are reserved for state, never for hierarchy.

The signature move is **three-typeface separation**: a system serif (`ui-serif`) for display headings and capture titles, a system sans (`ui-sans-serif`) for body and form chrome, and a system monospace (`ui-monospace`) for every piece of structured data — URLs, hosts, timestamps, dispatch IDs, origins. This ships zero font bytes (extension cold-start matters) but produces the layered typographic voice you find in Stripe Docs, NYT engineering pages, and Linear's blog. Inter and Roboto are deliberately avoided — they are the most common AI-generated UI tells.

Borders carry the layout, not shadows. Cards use 1px stone borders with no fill (edge-line treatment); only modal dialogs and dropdowns earn a real shadow. Hairline rules (`rgb(26 26 23 / 0.08)`) divide content the way a printed sidebar divides paragraphs. Form labels are 10px UPPERCASE with tracking-wider — a print convention that immediately reads as deliberate rather than templated.

Motion is restrained and meaningful. Buttons press 0.5px on `:active`. The settings gear rotates 60° on hover. The InProgressView reveals its five children with 60ms staggered offsets. The error banner slides down 6px as a margin-note rather than expanding as a full-bleed alert. Everything sits behind `prefers-reduced-motion: no-preference` so accessibility users see static states.

**Key Characteristics:**

- Warm stone canvas (`#fafaf7`) — paper-like, not screen-grey
- Three-typeface layering: serif display + sans body + mono meta — all from system stacks (0 KB shipped)
- Rust accent (`#c2410c`) as the only chromatic UI signal — sky-blue and indigo deliberately rejected
- Edge-line cards (1px border, transparent fill) — shadows reserved for modals/dropdowns only
- 10px UPPERCASE labels with `tracking-[0.06em]` — print convention
- Margin-note error banners (`border-l-[3px]`) instead of full alert bars
- Sidenote-style soft hints (left stripe + indent + italic mono)
- Footnote `¹` markers for advisory copy (e.g. Discord ToS warning)
- Asterism (`∗ ∗ ∗`) decoration on empty/error states
- Tabular numerals globally (`font-feature-settings: "tnum" 1`) for data alignment
- Press-style buttons with 0.5px active-translate + brightness-95
- Slow editorial spinner — 1.6s ease-in-out (calm, not anxious)
- Stagger reveal: 60–80ms cascades for state-change moments
- Dark mode is a real mode, not a theme — surfaces step from `#0c0c0b` (canvas) to `#16161a` (surface) to `#1f1f23` (subtle), with rust shifting to `#fb923c` for luminance against dark

## 2. Color Palette & Roles

### Surfaces

| Token                    | Light                  | Dark                      | Role                                                                                                            |
| ------------------------ | ---------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--color-canvas`         | `#fafaf7`              | `#0c0c0b`                 | Page background — paper / carbon. The warmth is intentional; pure `#ffffff` reads as "form" rather than "page." |
| `--color-surface`        | `#ffffff`              | `#16161a`                 | Pure white card / first-elevation surface.                                                                      |
| `--color-surface-subtle` | `#f5f5f1`              | `#1f1f23`                 | Inline tinted regions — chip backgrounds, hover states on listbox options, dispatch-ID pills.                   |
| `--color-surface-sunken` | `#efefe9`              | `#0a0a0a`                 | Recessed regions; rarely used.                                                                                  |
| `--color-border-strong`  | `#e7e5de`              | `#2e2e33`                 | Default border for cards, inputs, dividers.                                                                     |
| `--color-border-soft`    | `#f0efe9`              | `#27272a`                 | Subtler border for low-weight separation.                                                                       |
| `--color-rule`           | `rgb(26 26 23 / 0.08)` | `rgb(250 250 247 / 0.12)` | Hairline rules between paragraphs / list rows.                                                                  |

### Ink (text)

| Token                | Light     | Dark      | Role                                                                                                                               |
| -------------------- | --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--color-ink-strong` | `#0f0f0e` | `#fafaf7` | Headings, primary editable text. Not pure black — the warm tint prevents the harsh tunnel that pure `#000` creates on warm canvas. |
| `--color-ink-base`   | `#3f3f3a` | `#d6d3cb` | Body text, default UI.                                                                                                             |
| `--color-ink-muted`  | `#6b6b62` | `#9a968b` | Labels, metadata, help.                                                                                                            |
| `--color-ink-faint`  | `#9a968b` | `#6b6b62` | Disabled hints, placeholder, dingbat decoration.                                                                                   |

### Accent (rust — single brand signal)

| Token                   | Light                   | Dark                     | Role                                                                                          |
| ----------------------- | ----------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| `--color-accent`        | `#c2410c`               | `#fb923c`                | Primary action, focus border, inline accent on body copy. Replaces Tailwind sky-600 globally. |
| `--color-accent-hover`  | `#9a330a`               | `#fdba74`                | Primary button hover.                                                                         |
| `--color-accent-active` | `#7c2d12`               | `#fed7aa`                | Primary button active (paired with 0.5px translate).                                          |
| `--color-accent-soft`   | `rgb(194 65 12 / 0.10)` | `rgb(251 146 60 / 0.12)` | Listbox option hover bg, sidenote bg.                                                         |
| `--color-accent-ring`   | `rgb(194 65 12 / 0.20)` | `rgb(251 146 60 / 0.28)` | Focus ring on primary inputs / textareas.                                                     |

### Status

| Token                 | Light                   | Dark                      | Role                                                                                                               |
| --------------------- | ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `--color-danger`      | `#b91c1c`               | `#f87171`                 | Destructive actions, error banner stripe. Visually distinct from rust — danger is cool red, accent is warm orange. |
| `--color-danger-soft` | `rgb(185 28 28 / 0.08)` | `rgb(248 113 113 / 0.12)` | ErrorBanner hover bg; ResetSection button hover bg.                                                                |
| `--color-warn`        | `#a16207`               | `#fbbf24`                 | Discord ToS warning copy, footnote markers.                                                                        |
| `--color-warn-soft`   | `rgb(161 98 7 / 0.10)`  | `rgb(251 191 36 / 0.10)`  | Reserved.                                                                                                          |
| `--color-success`     | `#15803d`               | `#4ade80`                 | Reserved (dispatch success indicator if added later).                                                              |
| `--color-info`        | `#0f766e`               | `#5eead4`                 | Reserved.                                                                                                          |

### Brand colors (hardcoded — outside the token system)

`PlatformIcon` keeps a hardcoded gradient for the OpenClaw lobster mascot (`#ff4d4d` → `#991b1b` with `#00e5cc` eye specs). These are brand assets, not UI tokens — they should not adapt to theme.

Discord icon uses `currentColor` and inherits the surrounding text color.

## 3. Typography Rules

### Font Stacks

| Token          | Stack                                                                                                                 | Use                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `--font-sans`  | `ui-sans-serif, system-ui, -apple-system, "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif` | Body, form, default UI. Resolves to SF Pro on macOS, Segoe UI Variable on Windows 11+, Roboto on Android. |
| `--font-serif` | `ui-serif, "Iowan Old Style", "Apple Garamond", Baskerville, Georgia, "Times New Roman", "Source Serif Pro", serif`   | Display headings, capture title, page heading on options.                                                 |
| `--font-mono`  | `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", "JetBrains Mono", monospace`            | URLs, hosts, timestamps, dispatch IDs, origins, host chips.                                               |

**Inter and Roboto are deliberately avoided.** Tailwind's default `font-sans` would resolve to a stack that includes them; we override it via `@theme inline` in `entrypoints/_shared-tokens.css` so the system font is the _first_ candidate.

### Type Scale (modular 1.25 — major third)

| Role          | px   | line-height | weight | tracking | Use                                                                 |
| ------------- | ---- | ----------- | ------ | -------- | ------------------------------------------------------------------- |
| Display       | 22px | 1.2         | 600    | -0.015em | Options page heading. Serif.                                        |
| Title         | 16px | 1.3         | 600    | -0.01em  | Popup chrome wordmark, ConfirmDialog title. Serif.                  |
| Heading       | 14px | 1.35        | 600    | -0.005em | Section heading inside cards. Serif on options, sans on popup form. |
| Body          | 13px | 1.5         | 400    | 0        | Default body. Sans.                                                 |
| Body-emphasis | 13px | 1.5         | 600    | 0        | Inline emphasis, button text. Sans.                                 |
| Meta          | 12px | 1.4         | 400    | 0.005em  | Timestamp, URL, dispatch ID, help. Mono for data, sans for UI.      |
| Label         | 11px | 1.3         | 600    | 0.06em   | UPPERCASE form labels — print convention. Sans.                     |
| Micro         | 10px | 1.2         | 600    | 0.08em   | Chip / badge text (host chip, platform pill).                       |

### Principles

- **UPPERCASE labels are the editorial signature.** Every form field label uses 11px / weight-600 / `tracking-[0.06em]` in `text-[var(--color-ink-muted)]`. They read as deliberate rather than templated, and immediately differentiate the UI from generic Tailwind admin templates.
- **Three-typeface separation is non-negotiable.** Headings serif, body sans, data mono. Mixing these inside a single field is fine — e.g., a body sentence with a mono `host` chip — but choosing serif for body would dilute the editorial voice.
- **Tabular numerals are global.** `font-feature-settings: "tnum" 1` is set on `html, body` so dispatch IDs, timestamps, origin indices, and any numeric data align across rows without effort.
- **Compress at display sizes.** `tracking-tight` (-0.015em) on Display and Title gives the headlines an engineered, set-in-print feel. Body and below use normal tracking.
- **Italics earn their keep.** Used for editorial body copy on EmptyView / ErrorView, the soft-overwrite sidenote, and section descriptions in options. Never used for emphasis in form chrome.

## 4. Component Stylings

### Buttons

**Primary button (Confirm)**

- Background: `bg-[var(--color-accent)]`
- Hover: `hover:bg-[var(--color-accent-hover)]`
- Active: `active:bg-[var(--color-accent-active)] active:translate-y-[0.5px] active:brightness-95`
- Text: `text-white font-semibold tracking-[0.04em]`
- Padding: `px-4 py-2`
- Radius: `rounded-[var(--radius-soft)]` (4px)
- Disabled: `bg-[var(--color-surface-subtle)] text-[var(--color-ink-faint)] cursor-not-allowed` — no hover/active

**Secondary / outlined button (Cancel, dispatch cancel)**

- Background: `bg-transparent`
- Border: `border border-[var(--color-danger)]` (for destructive cancel) or `border-[var(--color-border-strong)]` (for neutral)
- Text: `text-[var(--color-danger)]` or `text-[var(--color-ink-strong)]`
- Hover: `hover:bg-[var(--color-danger-soft)]` for destructive
- Padding: `px-4 py-2`
- Radius: `rounded-[var(--radius-soft)]`

**Settings gear button**

- Size: `size-6`
- Color: `text-[var(--color-ink-muted)] hover:text-[var(--color-ink-strong)]`
- Micro-interaction: `transition-transform duration-[var(--duration-base)] ease-[var(--ease-snap)] hover:rotate-[60deg]`
- No background; SVG inherits `currentColor`.

**Text-link button (retry, dispatch-id copy, soft-overwrite sidenote)**

- No background, no border
- Color: `text-[var(--color-accent)]` or `text-[var(--color-danger)]` depending on context
- Hover: underline + `underline-offset-2`
- Used inside ErrorBanner retry, InProgressView dispatch-id copy.

### Inputs & Forms

**Single-line input (`inputClass` — Combobox)**

- Background: `bg-transparent`
- Border: `border-0 border-b-[1.5px] border-[var(--color-border-strong)]`
- Radius: `rounded-none` (bottom-border editorial style — no full box)
- Padding: `px-3 py-1.5`
- Text: `text-sm leading-normal text-[var(--color-ink-strong)]`
- Focus: `focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-[var(--color-accent)]`
- Hover: `hover:border-[var(--color-ink-faint)]`
- Transition: `transition-[border-color] duration-[var(--duration-snap)]`

**Multi-line textarea (`textareaClass` — CapturePreview fields)**

- Background: `bg-transparent`
- Border: `border border-[var(--color-border-strong)]` (full box — multi-line edits need clear field affordance)
- Radius: `rounded-[var(--radius-sharp)]` (2px — tighter than input box, matches print "manuscript box" feel)
- Padding: `px-3 py-2`
- Text: `text-sm leading-normal text-[var(--color-ink-strong)]`
- Focus: `focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]`
- Auto-size: `resize-none field-sizing-content`

**Select (LanguageSection)**

- Same bottom-border pattern as `inputClass`, with custom inline-SVG arrow icon as background-image (no chevron unicode — clean SVG).

**Field label (`FieldLabel`)**

- Class: `text-[10px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-muted)]`
- Always paired with `for=` to its target input.

### Cards & Containers

**Edge-line card (options sections)**

- Background: `bg-transparent` (no fill — print sidebar feel)
- Border: `border border-[var(--color-border-strong)]`
- Radius: `rounded-[var(--radius-card)]` (6px)
- Padding: `p-6`
- Shadow: none (shadows reserved for modals)

### Badges & Pills

**Host chip (CapturePreview URL prefix)**

- Background: `bg-[var(--color-surface-subtle)]`
- Text: `text-[10px] uppercase tracking-wide font-mono text-[var(--color-ink-muted)]`
- Padding: `px-1.5 py-0.5`
- Radius: `rounded-[var(--radius-sharp)]`
- Use: prepend the host before the full URL in the URL output line.

**Dispatch ID pill (InProgressView)**

- Background: `bg-[var(--color-surface-subtle)]`
- Text: `font-mono text-xs text-[var(--color-ink-muted)]`
- Padding: `px-2 py-0.5`
- Radius: `rounded-[var(--radius-sharp)]`
- Pattern: `<span>ID</span> <pill>4f3a…</pill>` — label outside, value inside the pill.

**Index pill (GrantedOriginsSection row number)**

- Plain mono text, no background — `font-mono text-[10px] tracking-wider text-[var(--color-ink-faint)] tabular-nums`
- Format: `01`, `02`, … (zero-padded to 2 digits).

### Banners & Notes

**Error banner (margin-note style)**

- Background: `bg-transparent` default; `hover:bg-[var(--color-danger-soft)]` (200ms)
- Left stripe: `border-l-[3px] border-[var(--color-danger)]`
- Padding: `pl-3 py-2`
- Heading: serif, `text-sm font-semibold text-[var(--color-danger)]`
- Body: sans, `text-sm text-[var(--color-ink-base)]`
- Retry: text-link in danger color
- Dismiss: muted ink x icon
- Enter animation: `[animation:w2c-margin-note-in_var(--duration-base)_var(--ease-quint)]`

**Soft-overwrite sidenote (SendForm hint)**

- Left stripe: `border-l-2 border-[var(--color-accent)]`
- Padding: `pl-3 py-1`
- Text: italic mono, `text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]`
- Enter animation: same `w2c-margin-note-in`

**Footnote (Discord ToS warning)**

- Marker: `<sup>¹</sup>` with `text-[var(--color-warn)] font-semibold mr-0.5`
- Body: muted ink, `text-xs text-[var(--color-ink-muted)]`
- Link: `text-[var(--color-warn)] underline underline-offset-2`

### Modals (ConfirmDialog)

- Overlay: `fixed inset-0 bg-black/40 dark:bg-black/60`
- Dialog: `bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 max-w-md w-full mx-4`
- Shadow: `shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)]` (only modal earns shadow)
- Enter: `[animation:w2c-dialog-open_var(--duration-base)_var(--ease-quint)]`
- Title: serif, `text-base font-semibold tracking-tight text-[var(--color-ink-strong)]`
- Body: sans, `text-sm text-[var(--color-ink-base)]`
- Confirm button (destructive variant): `bg-[var(--color-danger)] text-white`
- Confirm button (default variant): `bg-[var(--color-accent)] text-white`

### Spinner (InProgressView)

- 24×24 SVG, stroke `currentColor`, `text-[var(--color-accent)]`
- Stroke-width: 1.5
- Animation: `[animation:w2c-editorial-spin_1.6s_linear_infinite]` — slower than typical 1s spin, reads as "calm processing" rather than "anxious loading."

### Loading skeleton

- 5 rows of 1.5px-tall horizontal bars
- Background: `bg-gradient-to-r from-[var(--color-surface-subtle)] via-[var(--color-border-strong)] to-[var(--color-surface-subtle)]`
- `bg-[length:200%_100%]`
- Animation: `[animation:w2c-shimmer_1.6s_infinite_ease-in-out]`
- Reads as "type-block lines being typeset," not pulsing rectangles.

## 5. Layout Principles

### Containers

- **popup**: `min-w-[360px] min-h-[120px]` (extension popup hard limits). Most success states grow to full width naturally.
- **options**: `mx-auto max-w-[720px] p-8` (single-column, page-width centered).

### Spacing scale

`{4, 8, 12, 16, 20, 24, 32}` px — Tailwind's default 4px grid. The 12 and 20 steps are intentional anchors for editorial cadence (between Tailwind 8 and 16, between 16 and 24).

| Use                       | Token               |
| ------------------------- | ------------------- |
| Inline gap, badge padding | 4 (`gap-1`, `px-1`) |
| Form row gap              | 8 (`gap-2`)         |
| Section internal gap      | 12 (`gap-3`)        |
| Section between gap       | 16 (`gap-4`)        |
| Card padding (vertical)   | 24 (`p-6`)          |
| Page padding              | 32 (`p-8`)          |

### Whitespace philosophy

The canvas is paper. Empty space inside a popup or option page is _quiet_ — it's the breathing room between paragraphs in a printed page. Avoid filling space with decorative chrome.

Asymmetry over symmetry where possible: the InProgressView centers the spinner but its dispatch-ID pill sits at the bottom-left, not centered, like a printer's mark.

### Border radius scale

- `--radius-sharp` (2px): Inline badges, host chips, textarea boxes (manuscript-box feel).
- `--radius-soft` (4px): Buttons, single-line inputs.
- `--radius-card` (6px): Cards, dropdowns, modals. (Tighter than the conventional 8px to reinforce print rigor.)
- `--radius-pill` (9999px): Status pills, count badges (used sparingly).

## 6. Depth & Elevation

Editorial design prefers borders to shadows. Web2Chat has three elevation levels:

| Level | Treatment                                                                      | Use                                    |
| ----- | ------------------------------------------------------------------------------ | -------------------------------------- |
| Flat  | No border, no shadow                                                           | Page canvas, plain text regions        |
| Edge  | `border border-[var(--color-border-strong)]` (1px), no shadow                  | Cards, inputs, listboxes, code regions |
| Pop   | `shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)]` + edge border | Modals, dropdowns (Combobox listbox)   |

**Shadow philosophy:** drop shadows on flat surfaces are a digital affectation; on a paper canvas they're jarring. We restrict shadows to true overlays (modals, dropdowns) and use 1px borders for everything else. This creates a composed, considered visual stack without the "card lifted off the page" cliché.

## 7. Do's and Don'ts

### Do

- **Use stone neutrals** (`var(--color-canvas)`, `var(--color-ink-*)`, `var(--color-border-strong)`) for all surface and text. Stone is warmer than slate; the warmth is what makes the canvas feel like paper.
- **Use rust accent** (`var(--color-accent)`) for primary actions, focus borders, and inline emphasis on body. Sky-blue is forbidden in this system.
- **Use serif for display headings** (page heading on options, popup chrome wordmark, capture title, ConfirmDialog title). The serif is `ui-serif` — system serif, no font file.
- **Use monospace for all data** (URLs, hosts, timestamps, dispatch IDs, origins). Tabular numerals are global so columns of data align.
- **Use UPPERCASE 11px tracking-wider for form labels** — this is the print signature.
- **Use bottom-border on single-line inputs.** Combobox `<input>` should have only `border-b-[1.5px]`, never a full box.
- **Use edge-line cards on options.** No `bg-slate-100` fill — `bg-transparent` + 1px border.
- **Use margin-note style for inline alerts.** Left stripe + indent, not full bg-red-50 banner.
- **Stagger reveal multi-element state changes.** InProgressView, options sections — 60–80ms cascades.
- **Press buttons.** `active:translate-y-[0.5px] active:brightness-95` on every primary button.
- **Guard motion.** Wrap keyframes in `@media (prefers-reduced-motion: no-preference)`.

### Don't

- **Don't use sky-600 anywhere.** It's the most common AI-generated UI color signal. Use rust accent.
- **Don't use slate-100/200/700/900 hardcoded.** Use the ink/surface/border tokens — they include warm tone and dark-mode equivalents.
- **Don't use Inter or Roboto.** Override Tailwind's default `font-sans` via `@theme inline` so `ui-sans-serif` is the first candidate.
- **Don't use drop shadows on flat surfaces.** Shadow is for modals/dropdowns only.
- **Don't use full-bleed alert banners** (`bg-red-50 border-l-4`). Use margin-note style — transparent bg + 3px left stripe.
- **Don't use full box borders on single-line inputs.** Bottom-border is the editorial signature.
- **Don't introduce new fonts.** 0 KB font budget. Use `ui-serif`, `ui-sans-serif`, `ui-monospace` only.
- **Don't introduce animation libraries** (motion, auto-animate, framer-motion). Plain CSS keyframes via `@keyframes w2c-*` cover everything we need.
- **Don't add color decoratively.** Status colors (danger / warn / success / info) are reserved for state. Hierarchy is communicated by typography weight and spacing, not color.
- **Don't add `dark:` classnames for tokenized colors.** The `var(--color-*)` references resolve through the `@media (prefers-color-scheme: dark)` block automatically.
- **Don't change DOM structure when restyling.** All `data-testid`, `role`, `aria-*`, `for=id` relationships are testing/accessibility contracts.

## 8. Responsive Behavior

Web2Chat is a Chrome MV3 extension. The popup runs at a fixed `min-w-[360px]` (Chrome's enforced popup minimum). Options pages are desktop-only (Chrome's options page is not designed for handhelds). There is no mobile target.

| Surface | Width                                                  | Behavior                                                                                               |
| ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| popup   | 360px–500px (browser-determined)                       | Always single column, full-width main content. Content density unchanged across the popup width range. |
| options | up to `max-w-[720px]` centered with `p-8` page padding | Single column on every viewport. Sections stack vertically with `gap-4` between.                       |

**No breakpoints.** The Editorial cadence — type scale, spacing, density — is identical across the popup width range and the options page. Density is consistent because the entire UI is "near-print," not "responsive layout."

## 9. Agent Prompt Guide

### Quick Token Reference

- Page canvas: `var(--color-canvas)` (warm off-white / dark carbon)
- Primary text: `var(--color-ink-strong)`
- Body text: `var(--color-ink-base)`
- Muted text: `var(--color-ink-muted)`
- Faint text (placeholders, decoration): `var(--color-ink-faint)`
- Primary action: `var(--color-accent)` (rust)
- Focus ring: `var(--color-accent-ring)`
- Destructive: `var(--color-danger)` (cool red — visually distinct from rust accent)
- Border: `var(--color-border-strong)`
- Hairline rule: `var(--color-rule)`
- Display font: `font-serif` (resolves to `ui-serif`)
- Body font: `font-sans` (resolves to `ui-sans-serif`, no Inter)
- Data font: `font-mono` (resolves to `ui-monospace`)
- Label class: `text-[10px] uppercase tracking-[0.06em] font-semibold`

### Example Component Prompts

> "Build a SendForm field. Wrap it in `<div class="flex flex-col gap-1">`. Label is a `<FieldLabel>` (auto applies the 11px UPPERCASE class). Input uses the `inputClass` from `primitives.tsx` — bottom-border, no full box, `border-b-[1.5px] border-[var(--color-border-strong)]`, `focus-visible:border-b-2 focus-visible:border-[var(--color-accent)]`."

> "Create an InProgressView. Wrap five children in a flex-column with center alignment. Each child gets `[animation:w2c-editorial-rise_320ms_var(--ease-quint)_both]` plus a stagger `[animation-delay:0/60/120/180/240ms]`. Spinner uses `[animation:w2c-editorial-spin_1.6s_linear_infinite]` and stroke `var(--color-accent)`. Dispatch ID pill: `<span class="font-mono text-xs text-[var(--color-ink-muted)] bg-[var(--color-surface-subtle)] px-2 py-0.5 rounded-[var(--radius-sharp)]">…</span>`."

> "Convert this alert banner into margin-note style: `bg-transparent border-l-[3px] border-[var(--color-danger)] pl-3 py-2 hover:bg-[var(--color-danger-soft)] transition-colors duration-[var(--duration-instant)]`. Heading uses `font-serif font-semibold text-sm text-[var(--color-danger)]`. Retry button is a text-link: `text-[var(--color-danger)] hover:underline underline-offset-2 font-semibold text-sm`."

> "Render a host chip in front of a URL: `<span class="font-mono text-[10px] uppercase tracking-wide bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] px-1.5 py-0.5 rounded-[var(--radius-sharp)] mr-2">{new URL(url).host}</span><span class="font-mono text-xs text-[var(--color-ink-muted)] break-all">{url}</span>`."

> "Build an options edge-line card. Wrap in `<section class="bg-transparent border border-[var(--color-border-strong)] rounded-[var(--radius-card)] p-6 flex flex-col gap-4">`. Heading is `font-serif text-sm font-semibold tracking-tight text-[var(--color-ink-strong)]`. Description is `text-sm text-[var(--color-ink-muted)] italic`."

### Iteration Guide

1. Always reach for the token (`var(--color-*)` or the Tailwind utility resolving to it), never a Tailwind palette name (`text-slate-900` / `bg-sky-600`).
2. Three-typeface rule: heading → `font-serif`, body → `font-sans`, data → `font-mono`. If a string represents a URL / timestamp / ID / origin / host / dispatchId, it is `font-mono`.
3. Labels are 11px UPPERCASE — non-negotiable.
4. Single-line input → bottom-border. Multi-line textarea → 2px-radius full box.
5. Buttons press: every primary button has `active:translate-y-[0.5px] active:brightness-95`.
6. Banners are margin-notes: 3px left stripe + indent, transparent bg with hover-soft.
7. Cards are edge-line: 1px border, no fill. Shadows are reserved for modals.
8. Animations live in `_shared-tokens.css` as `w2c-*` keyframes; reference via `[animation:w2c-name_duration_ease]` in className.
9. When in doubt, look at `entrypoints/popup/components/SendForm.tsx` and `entrypoints/options/components/LanguageSection.tsx` — these are the canonical samples.
