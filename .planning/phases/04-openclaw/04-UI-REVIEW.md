# Phase 4 -- UI Review

**Audited:** 2026-05-04
**Baseline:** Abstract 6-pillar standards (no UI-SPEC exists for Phase 4)
**Screenshots:** Not captured (no dev server detected on ports 3000, 5173, 8080)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All user-facing strings via i18n; Phase 4 error + options copy is specific and actionable |
| 2. Visuals | 3/4 | Good hierarchy and accessibility, but GrantedOriginsSection remove button lacks confirmation for destructive action |
| 3. Color | 3/4 | Consistent palette (slate/sky/red), but hardcoded hex values in PlatformIcon SVG reduce maintainability |
| 4. Typography | 4/4 | Only 3 sizes (xs/sm/base) and 2 weights (normal/semibold) -- disciplined type scale |
| 5. Spacing | 3/4 | Consistent Tailwind scale, but arbitrary values (min-w-[360px], max-w-[720px]) appear across files |
| 6. Experience Design | 3/4 | Excellent state coverage (loading/error/empty/in-progress), but remove-origin has no disabled state or confirmation |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **GrantedOriginsSection remove button has no confirmation dialog** -- User can accidentally revoke a browser-level permission with one click (destructive, not easily undone since the origin also vanishes from the list) -- Add a ConfirmDialog (already exists in ResetSection pattern at `entrypoints/options/components/ConfirmDialog.tsx`) wrapping the handleRemove action
2. **Hardcoded hex colors in PlatformIcon.tsx** -- `#ff4d4d`, `#991b1b`, `#050810`, `#00e5cc` are not design-token driven; if the brand palette evolves, these must be hunted down manually -- Extract to CSS custom properties or Tailwind theme config
3. **GrantedOriginsSection remove button has no disabled/loading state during async remove** -- User can double-click "Remove" while `chrome.permissions.remove` + storage write are in progress, potentially causing race conditions -- Add a local `removing` signal to disable the button during the async operation

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

**[PASS]** All Phase 4 user-facing strings go through `t()` i18n facade. No hardcoded string literals in JSX.

- **Error copy is actionable**: `OPENCLAW_OFFLINE` tells user "Start the service and retry" (not generic "try again"). `OPENCLAW_PERMISSION_DENIED` says "Click to re-authorize" -- specific action guidance.
- **Empty state handled**: `options_origins_empty` = "No origins authorized yet." -- proper empty-state messaging, not generic "No data".
- **CTA labels are contextual**: "Re-authorize" (not generic "Retry") for permission error; "Remove" (not "Delete") for origin management.
- **i18n parity**: en.yml and zh_CN.yml both have 10 Phase 4 keys (6 error + 4 options). 100% key coverage.
- **Confirm button**: Uses `t('dispatch_confirm_label')` = "Send" -- clear action verb.

Relevant files:
- `locales/en.yml:157-169` -- Phase 4 error codes
- `locales/en.yml:226-233` -- Phase 4 options section
- `entrypoints/popup/components/ErrorBanner.tsx:121-125` -- OPENCLAW_OFFLINE/PERMISSION_DENIED switch cases

### Pillar 2: Visuals (3/4)

**[PASS]** Visual hierarchy is well-structured across Phase 4 components.

Positive findings:
- **ErrorBanner** has clear visual hierarchy: red-600 left border + red-700 heading + body text + underline retry link. Dismiss X button has aria-label.
- **GrantedOriginsSection** uses section/header/content structure matching existing ResetSection card pattern (`bg-slate-100 rounded-lg p-6`).
- **PlatformIcon** provides `role="img"` + `aria-label` for all 4 variants. SVG icons use `aria-hidden="true"` where appropriate.
- **InProgressView** has spinner with `aria-hidden="true"`, `role="status"` + `aria-live="polite"` on container.

**WARNING -- GrantedOriginsSection remove button lacks visual warning treatment**:
- `entrypoints/options/components/GrantedOriginsSection.tsx:54-59`: The "Remove" button uses `text-red-600` which signals danger correctly, but there is no confirmation dialog. The existing `ConfirmDialog` component (used by ResetSection) is available but not utilized here. Removing a granted origin is a destructive action that revokes a browser-level permission.

**Minor -- No loading/skeleton state for GrantedOriginsSection**:
- `entrypoints/options/components/GrantedOriginsSection.tsx:8-12`: Origins load asynchronously via `effect()`, but there is no visual loading indicator during the fetch. The section renders empty then fills in, causing a flash of empty state.

### Pillar 3: Color (3/4)

**[PASS]** Color palette is disciplined and consistent with a clear 60/30/10 pattern:
- **60% neutral**: `text-slate-*` / `bg-slate-*` dominates (>80 instances of slate-* text colors)
- **30% accent**: `text-sky-600` / `bg-sky-600` used for Confirm button, focus rings, inline accent spans (6 unique text-sky instances)
- **10% semantic**: `text-red-600` / `bg-red-50` / `border-red-600` reserved for errors + destructive actions

**[PASS]** Full dark mode coverage: 88 `dark:` class instances across entrypoints. Every light color has a dark counterpart.

**WARNING -- Hardcoded hex values in PlatformIcon SVG**:
- `entrypoints/popup/components/PlatformIcon.tsx:75-108`: 6 hardcoded hex colors (`#ff4d4d`, `#991b1b`, `#050810`, `#00e5cc`) for the OpenClaw lobster icon. These are brand colors for the SVG favicon, so they are justifiable, but they bypass the Tailwind design token system. The comment at line 19-22 documents the intent ("OpenClaw uses hardcoded brand colors"), so this is a conscious decision.
- No other hardcoded hex values found in Phase 4 `.tsx` files outside PlatformIcon.

### Pillar 4: Typography (4/4)

**[PASS]** Disciplined type scale with only 3 sizes and 2 weights:

**Font sizes in use** (across all entrypoint TSX):
| Size | Approximate count | Usage |
|------|------------------|-------|
| `text-xs` | ~8 | Dispatch ID, binding hint, copy toast |
| `text-sm` | ~25 | Body text, button labels, descriptions |
| `text-base` | ~8 | Headings (h1, h2) |

**Font weights in use**:
| Weight | Usage |
|--------|-------|
| `font-normal` | Body text, descriptions, placeholders |
| `font-semibold` | Headings, button labels, section titles |

This is below the 4-size / 2-weight threshold for abstract standards. Clear hierarchy: `text-base font-semibold` for headings, `text-sm font-normal` for body, `text-xs` for metadata. No `font-bold`, `font-medium`, `font-light`, or other weights.

### Pillar 5: Spacing (3/4)

**[PASS]** Spacing uses a consistent Tailwind scale:
- Page-level: `p-4` (popup), `p-8` (options)
- Section gaps: `gap-4` (primary), `gap-2` (inner), `gap-1` (label+field)
- Card padding: `p-6` (options sections)
- Button padding: `px-4 py-2` (consistent across Confirm, Cancel, Remove)

**WARNING -- Arbitrary values**:
- `min-w-[360px]` appears in 5 locations (`SendForm.tsx:265`, `App.tsx:242`, `App.tsx:325`, `App.tsx:383`, `App.tsx:406`, `InProgressView.tsx:45`). This is a popup width constraint, consistent across all views, but should be extracted to a shared constant or Tailwind config token.
- `max-w-[720px]` in `options/App.tsx:19`. Single use for options page max-width.
- `min-h-[240px]` appears in 4 locations. Again consistent but arbitrary.

These arbitrary values are internally consistent (same magic number repeated), which reduces the severity. However, extracting `360px` and `240px` to Tailwind extend config would improve maintainability.

### Pillar 6: Experience Design (3/4)

**[PASS]** Comprehensive state coverage:

| State | Coverage | Evidence |
|-------|----------|----------|
| Loading | Yes | `LoadingSkeleton` with 5 animated pulse rows + `sr-only` label + `aria-busy="true"` (`App.tsx:322-355`) |
| Error (capture) | Yes | `ErrorView` with alert icon + heading + body + inline accent (`App.tsx:401-424`) |
| Error (dispatch) | Yes | `ErrorBanner` with code-specific heading/body/retry across all 11 ErrorCodes (`ErrorBanner.tsx`) |
| Empty (capture) | Yes | `EmptyView` with code-specific heading/body for `RESTRICTED_URL` and `EXTRACTION_EMPTY` (`App.tsx:357-398`) |
| Empty (origins) | Yes | Italic message "No origins authorized yet." (`GrantedOriginsSection.tsx:36-42`) |
| In-progress | Yes | `InProgressView` with spinner + cancel button + dispatch ID (`InProgressView.tsx`) |
| Permission resume | Yes | `App.tsx:67-111` checks pending dispatch on mount, auto-resumes or shows error |
| Disabled state (Confirm) | Yes | `confirmEnabled` logic disables button when no platform detected (`SendForm.tsx:261`) |

**WARNING -- No confirmation for destructive origin removal**:
- `GrantedOriginsSection.tsx:15-18`: `handleRemove` immediately calls `chrome.permissions.remove` + `grantedOriginsRepo.remove` without confirmation. This is a destructive action (revokes browser permission + removes from storage). The existing `ConfirmDialog` pattern from `ResetSection.tsx:60-97` is not used here.
- Severity: The operation is less severe than "Reset all history" (single origin vs. all data), but still involves revoking a browser permission that requires a user gesture to re-grant. A confirmation step is warranted.

**WARNING -- No disabled state on Remove button during async operation**:
- `GrantedOriginsSection.tsx:54-59`: The Remove button has no `disabled` attribute or loading indicator. Rapid clicks could trigger multiple concurrent `chrome.permissions.remove` calls.

---

## Files Audited

Phase 4 created/modified frontend files:
- `entrypoints/options/components/GrantedOriginsSection.tsx` (created in Plan 03)
- `entrypoints/popup/components/ErrorBanner.tsx` (modified in Plan 01, 03)
- `entrypoints/popup/components/SendForm.tsx` (modified in Plan 03, 05)
- `entrypoints/popup/App.tsx` (modified in Plan 03, 05)
- `entrypoints/options/App.tsx` (modified in Plan 01, 03)

Supporting files reviewed for context:
- `entrypoints/popup/components/InProgressView.tsx`
- `entrypoints/popup/components/PlatformIcon.tsx`
- `entrypoints/popup/components/PopupChrome.tsx`
- `locales/en.yml`
- `locales/zh_CN.yml`
