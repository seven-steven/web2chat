import type { PayloadField, ProofMetadata } from '../../data/site-content';
import { AssetLabel } from './asset-label';

interface PopupMockupProps {
  title: string;
  fields: PayloadField[];
  metadata: ProofMetadata;
  sourceLabel: string;
  statusLabel: string;
  versionLabel: string;
}

export function PopupMockup({
  title,
  fields,
  metadata,
  sourceLabel,
  statusLabel,
  versionLabel,
}: PopupMockupProps) {
  return (
    <section
      class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-sm"
      data-testid="popup-mockup"
    >
      <div class="flex items-center justify-between border-b border-[var(--color-border-strong)] px-4 py-3">
        <h3 class="text-[20px] leading-[1.2] font-semibold text-[var(--color-ink-strong)]">
          {title}
        </h3>
        <span class="size-3 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
      </div>
      <div class="px-4 py-4">
        <AssetLabel
          metadata={metadata}
          sourceLabel={sourceLabel}
          statusLabel={statusLabel}
          versionLabel={versionLabel}
        />
        <div class="mt-6 flex flex-col gap-3" data-testid="popup-mockup-fields">
          {fields.map((field) => (
            <div
              key={field.key}
              class="rounded-[var(--radius-sharp)] border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 py-3"
              data-field-key={field.key}
            >
              <p class="text-[14px] leading-[1.4] text-[var(--color-ink-muted)]">{field.label}</p>
              <output class="mt-1 block whitespace-pre-wrap break-words font-mono text-[14px] leading-[1.5] text-[var(--color-ink-strong)]">
                {field.value}
              </output>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
