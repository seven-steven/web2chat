/**
 * Shared popup primitives — Editorial / data-dense token-aware classes.
 *
 * inputClass:    bottom-border editorial style for single-line inputs (Combobox).
 * textareaClass: 2px-radius full box for multi-line edits (CapturePreview fields).
 *
 * Both reach for tokens declared in entrypoints/_shared-tokens.css; do not
 * hardcode slate/sky color names here.
 */
import type { ComponentChildren } from 'preact';

/**
 * Field label — 11px UPPERCASE / tracking-[0.06em] / weight-600 in muted ink.
 * Print convention; the editorial signature for the entire UI.
 *
 * Uses Preact's native `for` attribute (not the React-compat `htmlFor` alias).
 */
export function FieldLabel({ id, label }: { id: string; label: string }) {
  return (
    <label
      for={id}
      class="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-muted)]"
    >
      {label}
    </label>
  );
}

/**
 * Multi-line textarea chrome — full-box border with 2px radius for the
 * "manuscript box" feel. Used by Title / Description / Content textareas in
 * CapturePreview where multi-line edit affordance matters.
 */
export const textareaClass = [
  'w-full px-3 py-2 rounded-[var(--radius-sharp)]',
  'text-sm leading-normal font-normal',
  'text-[var(--color-ink-strong)]',
  'bg-transparent',
  'border border-[var(--color-border-strong)]',
  'focus-visible:outline-none',
  'focus-visible:border-[var(--color-accent)]',
  'focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]',
  'resize-none field-sizing-content',
  'transition-[border-color,box-shadow] duration-[var(--duration-snap)]',
].join(' ');

/**
 * Single-line input chrome — bottom-border editorial style. No full box, no
 * rounded corners. Used by Combobox `<input role="combobox">`.
 */
export const inputClass = [
  'w-full px-3 py-1.5',
  'text-sm leading-normal font-normal',
  'text-[var(--color-ink-strong)]',
  'bg-transparent',
  'border-0 border-b-[1.5px] border-[var(--color-border-strong)]',
  'rounded-none',
  'placeholder:text-[var(--color-ink-faint)]',
  'focus-visible:outline-none',
  'focus-visible:border-b-2 focus-visible:border-[var(--color-accent)]',
  'hover:border-[var(--color-ink-faint)]',
  'transition-[border-color] duration-[var(--duration-snap)]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

/** Re-export for downstream type consumers. */
export type { ComponentChildren };
