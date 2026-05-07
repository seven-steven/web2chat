# Design System for Web2Chat

> Charcoal + emerald design language for the Web2Chat Chrome extension.
> Inspired by the Obsidian Web Clipper Properties-panel layout — compact,
> data-dense, console-leaning. Authoritative source for tokens, typography,
> components, and motion across `popup` and `options` entrypoints.
> Last revised: 2026-05-07

## 1. Visual Theme & Atmosphere

Web2Chat is a precision instrument for sending the current web page — title, URL, description, content, and a bound prompt — to an IM or AI agent in one click. The interface should feel less like a marketing landing page and more like a developer-grade utility panel: dense, ordered, and trustworthy.

The canvas in dark mode is a calm charcoal (`#1e1e1e`) with surfaces stepping up by background luminance (`#262626` → `#2a2a2a`), the Linear / Obsidian convention for elevation on dark. In light mode the canvas is a near-white (`#fafafa`) with cool-gray neutrals (zinc), avoiding warm tones because warmth competes with the data-density signal — readers should feel like they're inspecting structured data, not reading a magazine.

The chromatic accent is **emerald** (`#10b981` light / `#34d399` dark) — a single distinctive color reserved for the primary action ("Send"), focus rings, and inline emphasis. Emerald is deliberate: it is neither the AI-generated cliche sky-blue nor the generic indigo of Obsidian's brand palette, and it carries the right semantic for a "send / dispatch / go" affordance. Status colors (danger, warn, info, success) are reserved for state, never for hierarchy.

The CapturePreview region is the center of gravity. It uses the **Obsidian-style Properties row layout**: each metadata field rendered as `[icon, label, value]` on a single row, with Lucide-style line icons (14×14, stroke 1.5) anchoring the left, a fixed-width muted label in the middle, and the value (textarea or read-only output) flowing to the right. Hovering a row tints it with `--color-surface-subtle`. A hairline rule separates the Properties block from the standalone Content block below.

The signature contrasts:

- **Three-typeface layering**: a system serif (`ui-serif`) **only** for the editable Title field — communicating "this is the document you're capturing"; system sans (`ui-sans-serif`) for body and form chrome; system monospace (`ui-monospace`) for every piece of structured data — URLs, hosts, timestamps, dispatch IDs, origins. Inter and Roboto are deliberately avoided.
- **11px UPPERCASE labels for form fields** in `tracking-[0.06em]` — print convention that immediately differentiates this UI from generic Tailwind admin templates.
- **Edge-line over shadow** for cards: `bg-transparent` + 1px border instead of filled bg. Shadows are reserved for true overlays (Combobox dropdown, ConfirmDialog modal).
- **Margin-note error banners** (3px left stripe + transparent bg + hover-soft) instead of full-bleed `bg-red-50` alerts.
- **Press-style buttons** with 0.5px active-translate + brightness-95 — tactile feedback on the primary CTA.

Motion is restrained and meaningful. The settings gear rotates 60° on hover. The InProgressView reveals its five children with 60ms staggered offsets. The error banner slides down 6px. Combobox listbox fades + slides 4px on open. Everything sits behind `prefers-reduced-motion: no-preference`, with a global `prefers-reduced-motion: reduce` reset that collapses every animation/transition to ~0ms.

**Key Characteristics:**

- Cool zinc canvas (light) / charcoal (dark) — Obsidian-style
- Emerald accent (`#10b981` / `#34d399`) — sky-blue and indigo cliches deliberately rejected
- Properties row-list for CapturePreview metadata (icon + label + value)
- Three-typeface layering: serif **only on Title**; sans body; mono data
- 11px UPPERCASE labels with `tracking-[0.06em]`
- Edge-line cards (1px border, transparent fill); shadows for modal/dropdown only
- Margin-note error banners
- Lucide-style line icons, stroke 1.5, 14px in row context
- Tabular numerals globally (`font-feature-settings: "tnum" 1`)
- Press-style buttons (0.5px translate + brightness-95 on active)
- Slow editorial spinner — 1.6s linear (calm, not anxious)
- Stagger reveal: 60–80ms cascades for state-change moments

## 2. Color Palette & Roles

### Surfaces

| Token                    | Light                    | Dark                          | Role                                                                                                              |
| ------------------------ | ------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `--color-canvas`         | `#fafafa` (zinc-50 cool) | `#1e1e1e` (Obsidian charcoal) | Page background.                                                                                                  |
| `--color-surface`        | `#ffffff`                | `#262626`                     | First-elevation card surface.                                                                                     |
| `--color-surface-subtle` | `#f4f4f5` (zinc-100)     | `#2a2a2a`                     | Inline tinted regions: chip backgrounds, listbox option hover, dispatch-ID pill, row-hover bg.                    |
| `--color-surface-sunken` | `#e4e4e7` (zinc-200)     | `#161616`                     | Recessed regions; rarely used.                                                                                    |
| `--color-border-strong`  | `#e4e4e7`                | `rgb(255 255 255 / 0.10)`     | Default border for cards, inputs, dividers. Dark mode uses semi-transparent white (Linear / Obsidian convention). |
| `--color-border-soft`    | `#f4f4f5`                | `rgb(255 255 255 / 0.05)`     | Subtler border.                                                                                                   |
| `--color-rule`           | `rgb(24 24 27 / 0.08)`   | `rgb(255 255 255 / 0.06)`     | Hairline rules between sections.                                                                                  |

### Ink (text)

| Token                | Light                | Dark      | Role                                                                             |
| -------------------- | -------------------- | --------- | -------------------------------------------------------------------------------- |
| `--color-ink-strong` | `#18181b` (zinc-900) | `#e7e7e7` | Headings, primary editable text. Not pure black/white — softened against canvas. |
| `--color-ink-base`   | `#3f3f46` (zinc-700) | `#a8a8a8` | Body text, default UI.                                                           |
| `--color-ink-muted`  | `#71717a` (zinc-500) | `#71717a` | Labels, metadata, help. Same value both modes — anchors the muted layer.         |
| `--color-ink-faint`  | `#a1a1aa` (zinc-400) | `#52525b` | Disabled hints, placeholder, decorative icons.                                   |

### Accent (emerald — single brand signal)

| Token                   | Light                    | Dark                     | Role                                                        |
| ----------------------- | ------------------------ | ------------------------ | ----------------------------------------------------------- |
| `--color-accent`        | `#10b981`                | `#34d399`                | Primary action (Send), focus border, inline accent on body. |
| `--color-accent-hover`  | `#059669`                | `#6ee7b7`                | Primary button hover.                                       |
| `--color-accent-active` | `#047857`                | `#a7f3d0`                | Primary button active (paired with 0.5px translate).        |
| `--color-accent-soft`   | `rgb(16 185 129 / 0.10)` | `rgb(52 211 153 / 0.14)` | Listbox option active bg.                                   |
| `--color-accent-ring`   | `rgb(16 185 129 / 0.22)` | `rgb(52 211 153 / 0.32)` | Focus ring on primary inputs / textareas.                   |

### Status

| Token                 | Light                   | Dark                      | Role                                                |
| --------------------- | ----------------------- | ------------------------- | --------------------------------------------------- |
| `--color-danger`      | `#dc2626`               | `#f87171`                 | Destructive actions, error banner stripe.           |
| `--color-danger-soft` | `rgb(220 38 38 / 0.08)` | `rgb(248 113 113 / 0.12)` | ErrorBanner hover bg; ResetSection button hover bg. |
| `--color-warn`        | `#d97706`               | `#fbbf24`                 | Discord ToS warning copy.                           |
| `--color-warn-soft`   | `rgb(217 119 6 / 0.10)` | `rgb(251 191 36 / 0.10)`  | Reserved.                                           |
| `--color-success`     | `#15803d`               | `#4ade80`                 | Reserved.                                           |
| `--color-info`        | `#0284c7`               | `#38bdf8`                 | Reserved.                                           |

### Brand colors (hardcoded — outside the token system)

`PlatformIcon` keeps a hardcoded gradient for the OpenClaw lobster mascot (`#ff4d4d` → `#991b1b` with `#00e5cc` eye specs). These are brand assets, not UI tokens — they should not adapt to theme.

Discord icon uses `currentColor` and inherits the surrounding text color.

## 3. Typography Rules

### Font Stacks

| Token          | Stack                                                                                                                 | Use                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `--font-sans`  | `ui-sans-serif, system-ui, -apple-system, "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif` | Body, form, default UI. SF Pro on macOS, Segoe UI Variable on Windows 11+, Roboto on Android. |
| `--font-serif` | `ui-serif, "Iowan Old Style", "Apple Garamond", Baskerville, Georgia, "Times New Roman", "Source Serif Pro", serif`   | **Only** the CapturePreview Title field.                                                      |
| `--font-mono`  | `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", "JetBrains Mono", monospace`            | URLs, hosts, timestamps, dispatch IDs, origins, host chips.                                   |

**Inter and Roboto are deliberately avoided.** Tailwind's default `font-sans` would resolve to a stack including them; we override `--font-sans` via `@theme inline` so `ui-sans-serif` is the first candidate.

### Type Scale

| Role            | px   | line-height | weight | tracking | Use                                                               |
| --------------- | ---- | ----------- | ------ | -------- | ----------------------------------------------------------------- |
| Page heading    | 20px | 1.2         | 600    | -0.015em | Options page heading. Sans.                                       |
| Title           | 14px | 1.3         | 600    | -0.005em | CapturePreview Title. **Serif** (the only serif use).             |
| Section heading | 14px | 1.35        | 600    | 0        | Card section heading on options. Sans.                            |
| Body            | 13px | 1.5         | 400    | 0        | Default body. Sans.                                               |
| Body-emphasis   | 13px | 1.5         | 600    | 0        | Inline emphasis, button text. Sans.                               |
| Meta            | 12px | 1.4         | 400    | 0        | Property-row label, help, soft hints. Mono for data, sans for UI. |
| Label           | 11px | 1.3         | 600    | 0.06em   | UPPERCASE form labels — print convention. Sans.                   |
| Micro           | 10px | 1.2         | 600    | 0.08em   | Chip / badge text (host chip, origin index).                      |

### Principles

- **UPPERCASE 11px labels are the editorial signature.** Every form field label uses 11px / weight-600 / `tracking-[0.06em]` in `text-[var(--color-ink-muted)]`.
- **Serif is reserved for the editable Title.** Only `capture-field-title` textarea gets `font-serif` — it visually separates the user's editable headline from the surrounding chrome.
- **Three-typeface separation** by data type: heading sans, body sans, data mono. Mixing inside a single field is fine — e.g., a body sentence with a mono `host` chip.
- **Tabular numerals are global.** `font-feature-settings: "tnum" 1` is set on `html, body` so dispatch IDs, timestamps, and indices align across rows.
- **Compress at display sizes.** `tracking-tight` (-0.015em) on the page heading. Body and below use normal tracking.

## 4. Component Stylings

### CapturePreview Properties row (the signature pattern)

Each metadata row is a CSS Grid: `[14px icon, 88px label, 1fr value]`.

```html
<div
  class="grid grid-cols-[14px_88px_1fr] items-start gap-2 px-1 py-1 rounded-[var(--radius-sharp)] hover:bg-[var(--color-surface-subtle)] transition-colors"
>
  <span class="text-[var(--color-ink-faint)] mt-1.5 flex items-center justify-center"
    ><Icon
  /></span>
  <label
    for="field-title"
    class="self-center text-[12px] font-normal text-[var(--color-ink-muted)] truncate"
    >Title</label
  >
  <textarea id="field-title" data-testid="capture-field-title" class="font-serif ..." />
</div>
```

- Icon: 14×14 Lucide-style (`type` for title, `link` for source, `align-left` for description, `clock` for created), stroke 1.5, color `--color-ink-faint`.
- Label: 12px sans, muted, fixed-width 88px, truncate.
- Value: textarea (editable) or output (read-only); textarea uses `textareaClass` from `primitives.tsx`.
- Row hover: tints background with `--color-surface-subtle` over 120ms.

### Buttons

**Primary button (Confirm / Send)**

- Background: `bg-[var(--color-accent)]` (emerald)
- Hover: `hover:bg-[var(--color-accent-hover)]`
- Active: `active:bg-[var(--color-accent-active)] active:translate-y-[0.5px] active:brightness-95`
- Text: `text-white font-semibold tracking-[0.02em]`
- Padding: `px-5 py-2`
- Radius: `rounded-[var(--radius-soft)]` (4px)
- Transition: `background-color, transform, filter` 180ms
- Disabled: `bg-[var(--color-surface-subtle)] text-[var(--color-ink-faint)] cursor-not-allowed`

**Secondary / outlined (Dispatch cancel)**

- Background: `bg-transparent`
- Border: `border border-[var(--color-danger)]`
- Text: `text-[var(--color-danger)]`
- Hover: `hover:bg-[var(--color-danger-soft)]`

**Settings gear button**

- Size: `size-6`
- Color: `text-[var(--color-ink-muted)] hover:text-[var(--color-ink-strong)]`
- Micro-interaction: `transition-transform duration-[var(--duration-base)] ease-[var(--ease-snap)] hover:rotate-[60deg]`

**Text-link button (retry, dispatch-id copy, soft-overwrite hint)**

- No background, no border
- Color: `text-[var(--color-accent)]` or `text-[var(--color-danger)]`
- Hover: underline + `underline-offset-2`

### Inputs & Forms

**Single-line input (`inputClass` — Combobox)** — bottom-border editorial style:

```
w-full px-3 py-1.5
bg-transparent
border-0 border-b-[1.5px] border-[var(--color-border-strong)]
rounded-none
focus-visible:border-b-2 focus-visible:border-[var(--color-accent)]
hover:border-[var(--color-ink-faint)]
```

**Multi-line textarea (`textareaClass`)** — full box at 2px radius:

```
px-3 py-2 rounded-[var(--radius-sharp)]
bg-transparent
border border-[var(--color-border-strong)]
focus-visible:border-[var(--color-accent)]
focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]
resize-none field-sizing-content
```

In Property-row context, textareas use compact `py-1 px-2` overrides to fit row height.

**Select (LanguageSection)**

- Same bottom-border pattern as `inputClass`, with an inline `<svg>` chevron arrow positioned absolute (inherits color via `currentColor` so it tracks the ink token across light/dark).

**Field label (`FieldLabel`)**

- Class: `text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-muted)]`
- Always paired with `for=` to its target input.

### Cards & Containers

**Edge-line card (options sections)**

- Background: `bg-transparent` (no fill)
- Border: `border border-[var(--color-border-strong)]`
- Radius: `rounded-[var(--radius-card)]` (6px)
- Padding: `p-6`
- Shadow: none

### Badges & Pills

**Host chip (CapturePreview URL prefix)**

- Background: `bg-[var(--color-surface-subtle)]`
- Text: `font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]`
- Padding: `px-1.5 py-0.5`
- Radius: `rounded-[var(--radius-sharp)]`

**Dispatch ID pill (InProgressView)**

- Background: `bg-[var(--color-surface-subtle)]`
- Text: `font-mono text-xs text-[var(--color-ink-muted)]`
- Padding: `px-2 py-0.5`
- Radius: `rounded-[var(--radius-sharp)]`

**Index pill (GrantedOriginsSection row number)**

- Plain mono text, no background — `font-mono text-[10px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-faint)] tabular-nums`
- Format: `01`, `02`, … (zero-padded).

### Banners

**Error banner (margin-note style)**

- Background: `bg-transparent` default; `hover:bg-[var(--color-danger-soft)]` (120ms)
- Left stripe: `border-l-[3px] border-[var(--color-danger)]`
- Padding: `pl-3 py-2`
- Heading: sans, `text-sm font-semibold text-[var(--color-danger)]`
- Body: sans, `text-sm text-[var(--color-ink-base)]`
- Retry: text-link in danger color
- Enter animation: `[animation:w2c-margin-note-in_var(--duration-base)_var(--ease-quint)]`

### Modals (ConfirmDialog)

- Overlay: `fixed inset-0 bg-black/40 dark:bg-black/60`
- Dialog: `bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 max-w-md`
- Shadow: `shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)]` (only modal earns shadow)
- Enter: `[animation:w2c-dialog-open_var(--duration-base)_var(--ease-quint)]`
- Title: sans, `text-base font-semibold tracking-tight text-[var(--color-ink-strong)]`
- Confirm button (destructive variant): `bg-[var(--color-danger)] text-white`
- Confirm button (default variant): `bg-[var(--color-accent)] text-white`

### Spinner (InProgressView)

- 24×24 SVG, stroke `currentColor`, `text-[var(--color-accent)]`
- Stroke-width: 1.5
- Animation: `[animation:w2c-editorial-spin_1.6s_linear_infinite]` — slower than the conventional 1s spin.

### Loading skeleton

- 5 rows of 1.5px-tall horizontal bars with linear-gradient shimmer (`from-[var(--color-surface-subtle)] via-[var(--color-border-strong)] to-[var(--color-surface-subtle)]` on `bg-[length:200%_100%]`).
- Animation: `[animation:w2c-shimmer_1.6s_infinite_ease-in-out]`.

## 5. Layout Principles

### Containers

- **popup**: `min-w-[360px] min-h-[120px]`. SendForm uses `p-3 gap-3` (compact). PopupChrome uses `px-3 pt-3 pb-2`.
- **options**: `mx-auto max-w-[720px] p-8` (single-column, page-width centered, `gap-6` between sections).

### Spacing scale

`{2, 4, 8, 12, 16, 20, 24, 32}` px — Tailwind 4px grid.

| Use                                           | Token                       |
| --------------------------------------------- | --------------------------- |
| Property-row inner gap (icon → label → value) | 8 (`gap-2`)                 |
| Property-row vertical gap (between rows)      | 2 (`gap-0.5`)               |
| Section internal gap                          | 12 (`gap-3`)                |
| Section between gap                           | 16 / 24 (`gap-4` / `gap-6`) |
| Card padding                                  | 24 (`p-6`)                  |
| Page padding (options)                        | 32 (`p-8`)                  |

### Whitespace philosophy

The canvas is a console. Empty space is the rule, not a feature — Properties rows sit close together at `gap-0.5` (2px) so the whole capture preview reads as a structured table. Density is the point.

### Border radius scale

- `--radius-sharp` (2px): inline badges, host chips, textarea boxes, property-row hover background.
- `--radius-soft` (4px): buttons, single-line inputs.
- `--radius-card` (6px): cards, dropdowns, modals.
- `--radius-pill` (9999px): status pills (used sparingly).

## 6. Depth & Elevation

Borders carry the layout. Three elevation levels:

| Level | Treatment                                                                      | Use                             |
| ----- | ------------------------------------------------------------------------------ | ------------------------------- |
| Flat  | No border, no shadow                                                           | Page canvas, plain text regions |
| Edge  | `border border-[var(--color-border-strong)]` (1px), no shadow                  | Cards, inputs, listboxes        |
| Pop   | `shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)]` + edge border | Modals, Combobox dropdown       |

In dark mode borders use semi-transparent white (`rgb(255 255 255 / 0.10)`) — the Linear/Obsidian convention for visibility on dark surfaces without harsh contrast.

## 7. Do's and Don'ts

### Do

- **Use zinc neutrals** (`var(--color-canvas)`, `var(--color-ink-*)`, `var(--color-border-strong)`) for all surface and text. Cool-leaning, console-grade.
- **Use emerald accent** (`var(--color-accent)`) for primary actions and focus borders. Sky-blue and indigo are forbidden.
- **Use serif only on the editable Title field.** Everywhere else is sans.
- **Use monospace for all data** (URLs, hosts, timestamps, dispatch IDs, origins). Tabular numerals are global.
- **Use UPPERCASE 11px tracking-wider for form labels.**
- **Use Property-row layout for CapturePreview metadata.** `[icon, 88px label, value]` grid; row-hover tints with surface-subtle.
- **Use bottom-border on single-line inputs.** Combobox `<input>` should have only `border-b-[1.5px]`.
- **Use edge-line cards on options.** No `bg-slate-100` fill.
- **Use margin-note style for inline alerts.** Left stripe + indent, not full bg-red-50 banner.
- **Stagger reveal multi-element state changes.** InProgressView, options sections — 60–80ms cascades.
- **Press buttons.** `active:translate-y-[0.5px] active:brightness-95` on every primary button.
- **Guard motion.** All keyframes inside `prefers-reduced-motion: no-preference`; global `prefers-reduced-motion: reduce` reset zeroes durations.

### Don't

- **Don't use sky-600 anywhere.** Use emerald accent.
- **Don't use Tailwind palette names hardcoded** (`text-slate-900`, `bg-zinc-100`). Use the ink/surface/border tokens.
- **Don't use Inter or Roboto.** Override Tailwind's default `font-sans` via `@theme inline`.
- **Don't use serif for headings other than the Title field.** Section headings, page heading, dialog titles are all sans.
- **Don't use drop shadows on flat surfaces.** Shadow is for modals/dropdowns only.
- **Don't use full-bleed alert banners** (`bg-red-50 border-l-4`). Use margin-note style.
- **Don't use full box borders on single-line inputs.**
- **Don't introduce new fonts.** 0 KB font budget — `ui-serif`, `ui-sans-serif`, `ui-monospace` only.
- **Don't introduce animation libraries.** Plain CSS keyframes via `@keyframes w2c-*`.
- **Don't add asterism / footnote / sidenote decorations.** This system is console, not editorial.
- **Don't add color decoratively.** Status colors are reserved for state.
- **Don't add `dark:` classnames for tokenized colors.** The `var(--color-*)` references resolve through the dark media query automatically.
- **Don't change DOM structure when restyling.** All `data-testid`, `role`, `aria-*`, `for=id` relationships are testing/accessibility contracts.

## 8. Responsive Behavior

Web2Chat is a Chrome MV3 extension. Popup runs at `min-w-[360px]` (Chrome's enforced popup minimum). Options pages are desktop-only.

| Surface | Width                                     | Behavior                                                   |
| ------- | ----------------------------------------- | ---------------------------------------------------------- |
| popup   | 360px–500px                               | Single column, full-width main. Density unchanged.         |
| options | up to `max-w-[720px]` centered with `p-8` | Single column on every viewport; `gap-6` between sections. |

**No breakpoints.** Density is consistent because the entire UI is "console-grade," not "responsive layout."

## 9. Agent Prompt Guide

### Quick Token Reference

- Page canvas: `var(--color-canvas)` (zinc-50 / charcoal #1e1e1e)
- Primary text: `var(--color-ink-strong)`
- Body text: `var(--color-ink-base)`
- Muted text: `var(--color-ink-muted)`
- Faint text: `var(--color-ink-faint)`
- Primary action: `var(--color-accent)` (emerald)
- Focus ring: `var(--color-accent-ring)`
- Destructive: `var(--color-danger)`
- Border: `var(--color-border-strong)`
- Hairline rule: `var(--color-rule)`
- Sans font: default `font-sans`
- Title (only) font: `font-serif`
- Data font: `font-mono`
- Label class: `text-[11px] uppercase tracking-[0.06em] font-semibold`

### Example Component Prompts

> "Build a Property row in CapturePreview. Use a CSS grid `grid-cols-[14px_88px_1fr] items-start gap-2 px-1 py-1 rounded-[var(--radius-sharp)] hover:bg-[var(--color-surface-subtle)] transition-colors`. Left: 14×14 lucide icon, `text-[var(--color-ink-faint)]`. Middle: 12px sans label, muted ink, truncate. Right: textarea (editable) or output (read-only). Textarea uses textareaClass with compact `py-1 px-2` override."

> "Create the InProgressView. Wrap five children in a flex-column with center alignment. Each child gets `[animation:w2c-editorial-rise_320ms_var(--ease-quint)_both]` plus a stagger `[animation-delay:0/60/120/180/240ms]`. Spinner uses `[animation:w2c-editorial-spin_1.6s_linear_infinite]` and stroke `var(--color-accent)`. Heading is sans 14px semibold. Cancel button is outlined danger. Dispatch ID pill: `<span class="font-mono text-xs text-[var(--color-ink-muted)] bg-[var(--color-surface-subtle)] px-2 py-0.5 rounded-[var(--radius-sharp)]">…</span>`."

> "Convert this alert banner into margin-note style: `bg-transparent border-l-[3px] border-[var(--color-danger)] pl-3 py-2 hover:bg-[var(--color-danger-soft)] transition-colors duration-[var(--duration-instant)]`. Heading uses sans `text-sm font-semibold text-[var(--color-danger)]`. Retry button is a text-link: `text-[var(--color-danger)] hover:underline underline-offset-2 font-semibold text-sm`."

> "Render a host chip in front of a URL: `<span class="font-mono text-[10px] uppercase tracking-wide bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] px-1.5 py-0.5 rounded-[var(--radius-sharp)]">{host}</span><span class="font-mono text-xs text-[var(--color-ink-muted)] break-all">{url}</span>`."

> "Build an options edge-line card. Wrap in `<section class="bg-transparent border border-[var(--color-border-strong)] rounded-[var(--radius-card)] p-6 flex flex-col gap-4">`. Heading is sans `text-[14px] font-semibold text-[var(--color-ink-strong)]`. Description is sans `text-sm text-[var(--color-ink-muted)]`."

### Iteration Guide

1. Always reach for the token (`var(--color-*)`), never a Tailwind palette name (`text-slate-900` / `bg-sky-600`).
2. Three-typeface rule: Title → `font-serif`; everything else → `font-sans`; data (URL / timestamp / ID / origin / host) → `font-mono`.
3. Form labels: 11px UPPERCASE — non-negotiable.
4. Single-line input → bottom-border. Multi-line textarea → 2px-radius full box.
5. Buttons press: every primary button has `active:translate-y-[0.5px] active:brightness-95`.
6. Banners are margin-notes: 3px left stripe + indent, transparent bg with hover-soft.
7. Cards are edge-line: 1px border, no fill. Shadows only on modal/dropdown.
8. Animations live in `_shared-tokens.css` as `w2c-*` keyframes; reference via `[animation:w2c-name_duration_ease]`.
9. CapturePreview metadata always uses Property-row layout (icon + label + value).
10. When in doubt, look at `entrypoints/popup/components/CapturePreview.tsx` and `entrypoints/popup/components/SendForm.tsx` — these are the canonical samples.
