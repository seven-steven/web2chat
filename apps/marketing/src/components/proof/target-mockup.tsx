import type { ProofMetadata } from '../../data/site-content';
import { AssetLabel } from './asset-label';

interface TargetMockupProps {
  metadata: ProofMetadata;
  platform: string;
  status: string;
  message: string;
  sourceLabel: string;
  statusLabel: string;
  versionLabel: string;
  helperText: string;
  resultLabel: string;
}

export function TargetMockup({
  metadata,
  platform,
  status,
  message,
  sourceLabel,
  statusLabel,
  versionLabel,
  helperText,
  resultLabel,
}: TargetMockupProps) {
  return (
    <section
      class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-sm"
      data-testid="target-mockup"
    >
      <div class="flex items-center justify-between border-b border-[var(--color-border-strong)] px-4 py-3">
        <h3 class="text-[20px] leading-[1.2] font-semibold text-[var(--color-ink-strong)]">
          {platform}
        </h3>
        <div class="flex items-center gap-2 text-[14px] leading-[1.4] text-[var(--color-ink-muted)]">
          <span class="size-2 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
          <span>{status}</span>
        </div>
      </div>
      <div class="px-4 py-4">
        <AssetLabel
          metadata={metadata}
          sourceLabel={sourceLabel}
          statusLabel={statusLabel}
          versionLabel={versionLabel}
        />
        <div class="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-canvas)] p-4">
          <div class="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
            <p class="text-[14px] leading-[1.4] text-[var(--color-ink-muted)]">{helperText}</p>
            <span class="rounded-full border border-[var(--color-border-strong)] px-2 py-1 text-[14px] leading-[1.4] text-[var(--color-ink-muted)]">
              {resultLabel}
            </span>
          </div>
          <div class="mt-4 rounded-[var(--radius-sharp)] bg-[var(--color-surface)] px-3 py-3">
            <p class="whitespace-pre-wrap text-[16px] leading-[1.5] text-[var(--color-ink-strong)]">
              {message}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
