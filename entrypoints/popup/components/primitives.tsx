/**
 * Shared popup primitives — extracted from App.tsx (lines 280-299) during
 * Phase 3 Plan 05 so options page (Plan 07) can reuse the same focus-ring
 * chrome and label styling. App.tsx will be refactored in Plan 06 to import
 * from this module.
 *
 * Surgical-changes principle (CLAUDE.md): textareaClass is reproduced
 * VERBATIM from App.tsx — do not modify spacing or color tokens. The Phase 2
 * inherited `px-3 py-2` (12px / 8px) padding stays unchanged inside this
 * extracted constant; new components MUST use {4,8,16,24,32,48,64} spacing
 * scale (UI-SPEC S-Spacing Scale) but the inherited textarea chrome is
 * exempt because Plan 06 keeps Phase 2 capture preview unchanged.
 */
import type { ComponentChildren } from 'preact';

/**
 * Field label using Preact's native `for` attribute (NOT the React-compat
 * `htmlFor` alias). Visible 12px slate-500 text above textareas / comboboxes.
 */
export function FieldLabel({ id, label }: { id: string; label: string }) {
  return (
    <label for={id} class="text-xs leading-snug font-normal text-slate-500 dark:text-slate-400">
      {label}
    </label>
  );
}

/**
 * Textarea chrome — copied verbatim from popup/App.tsx (Phase 2). Used by
 * the editable Title / Description / Content fields in capture preview.
 * Phase 3 components import this for reuse; Plan 06 also imports it from
 * App.tsx (refactor) to avoid duplicating the focus-ring tokens.
 */
export const textareaClass = [
  'w-full px-3 py-2 rounded-md',
  'text-sm leading-normal font-normal',
  'text-slate-900 dark:text-slate-100',
  'bg-white dark:bg-slate-900',
  'border border-slate-200 dark:border-slate-700',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-400',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
  'focus-visible:border-sky-600 dark:focus-visible:border-sky-400',
  'resize-none field-sizing-content',
].join(' ');

/**
 * Single-line input chrome — same focus-ring + border tokens as textareaClass,
 * minus the textarea-only `resize-none field-sizing-content`. Combobox `<input
 * role="combobox">` uses this. Phase 2 inherited `px-3 py-2` padding stays
 * because Combobox sits in the SendForm region whose vertical cadence (Plan 06
 * UI-SPEC) tolerates this pre-existing density.
 */
export const inputClass = [
  'w-full px-3 py-2 rounded-md',
  'text-sm leading-normal font-normal',
  'text-slate-900 dark:text-slate-100',
  'bg-white dark:bg-slate-900',
  'border border-slate-200 dark:border-slate-700',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-400',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
  'focus-visible:border-sky-600 dark:focus-visible:border-sky-400',
].join(' ');

/** Re-export for downstream type consumers. */
export type { ComponentChildren };
