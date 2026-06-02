interface CTAButtonProps {
  href: string;
  children: string;
  variant?: 'primary' | 'secondary';
  class?: string;
}

const baseClass =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-soft)] px-6 py-2 text-[16px] leading-[1.5] transition-[background-color,border-color,color,box-shadow,transform,filter] duration-[var(--duration-snap)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]';

const variantClass = {
  primary:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)] active:translate-y-[0.5px] active:brightness-95',
  secondary:
    'border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink-strong)] hover:bg-[var(--color-surface-subtle)]',
} as const;

export function CTAButton({
  href,
  children,
  variant = 'primary',
  class: className = '',
}: CTAButtonProps) {
  return (
    <a
      href={href}
      class={`${baseClass} ${variantClass[variant]} ${className}`.trim()}
      data-variant={variant}
    >
      {children}
    </a>
  );
}
