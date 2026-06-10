/**
 * Stepper — fixed three-step capture → target → send flow (D-08 / D-09,
 * T-15-05 mitigation: exactly 3 ordered steps, no interaction state).
 *
 * Semantics: an ordered list (`<ol>`); the visual layout switches between a
 * horizontal row (desktop) and a vertical stack (mobile) purely via utility
 * classes — DOM order never changes. Step markers are CSS circular number
 * badges (no icon dependency); the final "send" step gets accent emphasis
 * per 15-UI-SPEC. Connectors are decorative and aria-hidden.
 */
import type { FlowStep } from '../../data/site-content';

export interface StepperProps {
  /** Exactly three steps in fixed order: capture, target, send (D-08). */
  steps: readonly [FlowStep, FlowStep, FlowStep];
  /** Layout direction; defaults to responsive (vertical mobile, horizontal md+). */
  orientation?: 'horizontal' | 'vertical' | 'responsive';
}

const listClass = {
  horizontal: 'flex flex-row items-stretch gap-6',
  vertical: 'flex flex-col gap-6',
  responsive: 'flex flex-col gap-6 md:flex-row md:items-stretch',
} as const;

export function Stepper({ steps, orientation = 'responsive' }: StepperProps) {
  return (
    <ol class={listClass[orientation]}>
      {steps.map((step, i) => {
        const isFinal = i === steps.length - 1;
        return (
          <li
            key={step.step}
            data-testid={`flow-step-${step.step}`}
            class="relative flex flex-1 items-start gap-3"
          >
            {/* Circular number badge — accent fill on the final (send) step */}
            <span
              aria-hidden="true"
              class={`flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-pill)] text-sm font-semibold tabular-nums ${
                isFinal
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink-base)]'
              }`}
            >
              {step.step}
            </span>
            <div class="min-w-0">
              <h3 class="text-base leading-normal font-semibold text-[var(--color-ink-strong)]">
                {step.title}
              </h3>
              <p class="mt-1 text-sm leading-normal text-[var(--color-ink-muted)]">
                {step.description}
              </p>
            </div>
            {/* Decorative connectors toward the next step (skipped on the last):
                a vertical hairline below the badge for stacked layouts, and a
                horizontal hairline between items for row layouts. */}
            {!isFinal && orientation !== 'horizontal' && (
              <span
                aria-hidden="true"
                class={`absolute top-8 left-3.5 h-[calc(100%-1.25rem)] w-px bg-[var(--color-border-strong)] ${
                  orientation === 'responsive' ? 'md:hidden' : ''
                }`}
              />
            )}
            {!isFinal && orientation !== 'vertical' && (
              <span
                aria-hidden="true"
                class={`absolute top-3.5 right-[-1.125rem] w-3 border-t border-[var(--color-border-strong)] ${
                  orientation === 'responsive' ? 'hidden md:block' : ''
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
