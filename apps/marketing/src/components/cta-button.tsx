/**
 * CtaButton — shared primary/secondary CTA visual contract (D-12 / D-13).
 *
 * TDD RED stub: props typed, rendering not implemented yet.
 */
import type { ComponentChildren } from 'preact';

export interface CtaButtonProps {
  href: string;
  variant: 'primary' | 'secondary';
  children: ComponentChildren;
}

export function CtaButton(_props: CtaButtonProps) {
  return null;
}
