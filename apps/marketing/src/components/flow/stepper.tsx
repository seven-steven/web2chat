import type { FlowStep } from '../../data/site-content';

interface StepperProps {
  steps: FlowStep[];
}

type StepKey = 'capture' | 'choose-target' | 'send-to-chat';

const STEP_ORDER: readonly StepKey[] = ['capture', 'choose-target', 'send-to-chat'];

const stepIndex = new Map<StepKey, number>(STEP_ORDER.map((key, index) => [key, index]));

export function Stepper({ steps }: StepperProps) {
  const orderedSteps = [...steps].sort(
    (a, b) =>
      (stepIndex.get(a.key as StepKey) ?? STEP_ORDER.length) -
      (stepIndex.get(b.key as StepKey) ?? STEP_ORDER.length),
  );

  return (
    <ol class="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-6" data-testid="marketing-stepper">
      {orderedSteps.map((step, index) => {
        const isLast = index === orderedSteps.length - 1;
        return (
          <li key={step.key} class="flex items-stretch gap-3 md:flex-col">
            <div class="flex flex-col items-center" aria-hidden="true">
              <span
                class={`flex size-10 items-center justify-center rounded-full border text-[14px] leading-[1.4] ${
                  isLast
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink-strong)]'
                }`}
              >
                {index + 1}
              </span>
              {!isLast ? (
                <span class="mt-2 h-8 w-px bg-[var(--color-border-strong)] md:hidden" />
              ) : null}
            </div>
            <div class="flex min-w-0 flex-1 items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-4 md:min-h-[12rem] md:flex-col md:gap-4">
              <div class="min-w-0 flex-1">
                <h3 class="mt-1 text-[20px] leading-[1.2] font-semibold text-[var(--color-ink-strong)]">
                  {step.title}
                </h3>
                <p class="mt-2 text-[16px] leading-[1.5] text-[var(--color-ink-muted)]">
                  {step.description}
                </p>
              </div>
              {!isLast ? (
                <span
                  class="hidden self-center text-[var(--color-accent)] md:inline-flex"
                  aria-hidden="true"
                >
                  →
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
