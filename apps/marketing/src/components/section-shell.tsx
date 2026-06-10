/**
 * SectionShell — banded single-column section wrapper (D-01 / D-04).
 *
 * Encodes the 15-UI-SPEC layout contract:
 *   - band tone alternation via explicit `tone` prop (canvas / surface-subtle),
 *     never auto-derived from position;
 *   - inner width via explicit `width` prop (`max-w-4xl` hero, `max-w-3xl` rest);
 *   - non-hero outer padding `py-12 md:py-16`; page shell `px-6 sm:px-8`;
 *   - section title (h2, 20px/600) to body spacing 16px.
 *
 * Presentation-only: owns no content fetching or state.
 */
import type { ComponentChildren } from 'preact';

export interface SectionShellProps {
  /** Background band tone — canvas (page) or subtle (alternating surface). */
  tone: 'canvas' | 'subtle';
  /** Inner content max width; hero uses 4xl, all other sections 3xl. */
  width: '3xl' | '4xl';
  /** Section heading rendered as h2. Omit for the hero (which owns the h1). */
  title?: string;
  /** Optional one-line intro copy under the title. */
  intro?: string;
  children: ComponentChildren;
}

export function SectionShell({ tone, width, title, intro, children }: SectionShellProps) {
  const toneClass =
    tone === 'subtle' ? 'bg-[var(--color-surface-subtle)]' : 'bg-[var(--color-canvas)]';
  const widthClass = width === '4xl' ? 'max-w-4xl' : 'max-w-3xl';

  return (
    <section class={`${toneClass} py-12 md:py-16`}>
      <div class={`mx-auto ${widthClass} px-6 sm:px-8`}>
        {title && (
          <h2 class="text-xl leading-tight font-semibold text-[var(--color-ink-strong)]">
            {title}
          </h2>
        )}
        {intro && (
          <p class="mt-4 text-base leading-normal text-[var(--color-ink-muted)]">{intro}</p>
        )}
        <div class={title || intro ? 'mt-4' : ''}>{children}</div>
      </div>
    </section>
  );
}
