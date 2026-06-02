import type { ComponentChildren } from 'preact';

interface SectionShellProps {
  id?: string;
  tone?: 'canvas' | 'surface-subtle';
  width?: 'default' | 'wide';
  title?: string;
  intro?: string;
  children: ComponentChildren;
}

const toneClass = {
  canvas: 'bg-[var(--color-canvas)]',
  'surface-subtle': 'bg-[var(--color-surface-subtle)]',
} as const;

const widthClass = {
  default: 'max-w-3xl',
  wide: 'max-w-4xl',
} as const;

export function SectionShell({
  id,
  tone = 'canvas',
  width = 'default',
  title,
  intro,
  children,
}: SectionShellProps) {
  return (
    <section id={id} class={`py-12 md:py-16 ${toneClass[tone]}`}>
      <div class={`mx-auto px-6 sm:px-8 ${widthClass[width]}`}>
        {title ? (
          <div class="flex flex-col gap-4">
            <h2 class="text-[20px] leading-[1.2] font-semibold text-[var(--color-ink-strong)]">
              {title}
            </h2>
            {intro ? (
              <p class="text-[16px] leading-[1.5] text-[var(--color-ink-muted)]">{intro}</p>
            ) : null}
          </div>
        ) : null}
        <div class={title ? 'mt-8' : ''}>{children}</div>
      </div>
    </section>
  );
}
