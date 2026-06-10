/**
 * TargetMockup — code-generated target-chat proof module showing a delivered
 * message state (D-06, T-15-04 mitigation). Never claims live delivery proof.
 *
 * TDD RED stub: props typed, rendering not implemented yet.
 */
import type { ProofMeta } from '../../data/site-content';

export interface TargetMockupProps {
  meta: ProofMeta;
  /** Chat surface label, e.g. a channel name shown in the mockup chrome. */
  chatLabel: string;
  /** Message body lines rendered inside the delivered-message bubble. */
  messageLines: string[];
  /** Visible delivery/result copy, e.g. "delivered to chat input". */
  statusLabel: string;
}

export function TargetMockup(_props: TargetMockupProps) {
  return null;
}
