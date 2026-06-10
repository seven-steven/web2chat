/**
 * Stepper — fixed three-step capture → target → send flow (D-08 / D-09,
 * T-15-05 mitigation: exactly 3 ordered steps, no interaction state).
 *
 * TDD RED stub: props typed, rendering not implemented yet.
 */
import type { FlowStep } from '../../data/site-content';

export interface StepperProps {
  /** Exactly three steps in fixed order: capture, target, send (D-08). */
  steps: readonly [FlowStep, FlowStep, FlowStep];
  /** Layout direction; defaults to horizontal (desktop), vertical on mobile. */
  orientation?: 'horizontal' | 'vertical';
}

export function Stepper(_props: StepperProps) {
  return null;
}
