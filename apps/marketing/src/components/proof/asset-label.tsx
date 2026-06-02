import type { ProofMetadata } from '../../data/site-content';

interface AssetLabelProps {
  metadata: ProofMetadata;
  sourceLabel: string;
  statusLabel: string;
  versionLabel: string;
}

export function AssetLabel({ metadata, sourceLabel, statusLabel, versionLabel }: AssetLabelProps) {
  return (
    <div class="flex flex-col gap-3">
      <span class="inline-flex w-fit items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-[14px] leading-[1.4] text-[var(--color-ink-strong)]">
        {metadata.label}
      </span>
      <dl class="flex flex-wrap gap-x-4 gap-y-2 text-[14px] leading-[1.4] text-[var(--color-ink-muted)]">
        <div class="flex items-center gap-1">
          <dt>{sourceLabel}</dt>
          <dd class="text-[var(--color-ink-strong)]">{metadata.source}</dd>
        </div>
        <div class="flex items-center gap-1">
          <dt>{statusLabel}</dt>
          <dd class="text-[var(--color-ink-strong)]">{metadata.status}</dd>
        </div>
        <div class="flex items-center gap-1">
          <dt>{versionLabel}</dt>
          <dd class="text-[var(--color-ink-strong)]">{metadata.version}</dd>
        </div>
      </dl>
    </div>
  );
}
