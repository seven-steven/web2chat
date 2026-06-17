/**
 * AssetLabel — visible `mockup` badge + source/status/version metadata row
 * (D-05 / 15-UI-SPEC mockup labeling contract, T-15-04 mitigation).
 *
 * Every proof module must render this so code-generated demos can never be
 * mistaken for real screenshots. Presentation-only; all strings arrive via
 * the ProofMeta getter (site-content.ts), which also records the hidden
 * owner/update-trigger and creation-date provenance in code comments.
 */
import type { ProofMeta } from '../../data/site-content';

export interface AssetLabelProps {
  meta: ProofMeta;
}

export function AssetLabel({ meta }: AssetLabelProps) {
  return (
    <div
      data-testid="asset-label"
      class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-snug text-[var(--color-ink-muted)]"
    >
      <span class="inline-flex items-center rounded-[var(--radius-sharp)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[var(--color-ink-base)]">
        {meta.label}
      </span>
      <span class="font-mono">{`source: ${meta.source}`}</span>
      <span class="font-mono">{`status: ${meta.status}`}</span>
      <span class="font-mono">{`version: ${meta.version}`}</span>
    </div>
  );
}
