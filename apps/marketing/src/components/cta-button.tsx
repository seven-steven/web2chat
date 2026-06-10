/**
 * CtaButton — shared primary/secondary CTA visual contract (D-12 / D-13).
 *
 * Hero CTA and bottom CTA must reuse this exact component so their primary
 * styling stays identical (15-UI-SPEC CTA visual contract):
 *   - primary: accent fill, white text, hover/active accent tokens;
 *   - secondary: surface background, strong border, ink-strong text;
 *   - both: 44px minimum touch height, 24px horizontal padding, visible
 *     2px focus ring on the accent ring token (not color-only).
 *
 * Rendered as a link (`<a>`) — both CTA targets are external GitHub URLs.
 */
import type { ComponentChildren } from 'preact';

export interface CtaButtonProps {
  href: string;
  variant: 'primary' | 'secondary';
  children: ComponentChildren;
}

const baseClass = [
  'inline-flex items-center justify-center',
  'min-h-[44px] px-6',
  'rounded-[var(--radius-soft)]',
  'text-base font-semibold tracking-[0.01em] whitespace-nowrap',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-offset-1',
  'active:translate-y-[0.5px]',
  'transition-[background-color,transform] duration-[var(--duration-snap)]',
].join(' ');

const variantClass = {
  primary: [
    'bg-[var(--color-accent)] text-white',
    'hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)]',
  ].join(' '),
  secondary: [
    'bg-[var(--color-surface)] text-[var(--color-ink-strong)]',
    'border border-[var(--color-border-strong)]',
    'hover:bg-[var(--color-surface-subtle)]',
  ].join(' '),
} as const;

export function CtaButton({ href, variant, children }: CtaButtonProps) {
  return (
    <a href={href} class={`${baseClass} ${variantClass[variant]}`}>
      {children}
    </a>
  );
}
