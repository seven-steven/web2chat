/**
 * TargetMockup — code-generated target-chat proof module showing a delivered
 * message state (D-06, T-15-04 mitigation).
 *
 * Presents a low-contrast chat surface (PopupChrome-style header + hairline
 * borders) with the composed message sitting in the chat input area and an
 * explicit delivery/result copy line. It deliberately renders as a mockup,
 * never claiming live delivery evidence — the AssetLabel metadata row is
 * always visible (15-UI-SPEC mockup labeling contract).
 *
 * All strings arrive via props so the mockup copy follows the active locale
 * (D-07) and stays out of this presentation-only component.
 */
import type { ProofMeta } from '../../data/site-content';
import { AssetLabel } from './asset-label';

export interface TargetMockupProps {
  meta: ProofMeta;
  /** Chat surface label, e.g. a channel name shown in the mockup chrome. */
  chatLabel: string;
  /** Message body lines rendered inside the delivered-message bubble. */
  messageLines: string[];
  /** Visible delivery/result copy, e.g. "delivered to chat input". */
  statusLabel: string;
}

export function TargetMockup({ meta, chatLabel, messageLines, statusLabel }: TargetMockupProps) {
  return (
    <figure class="m-0 flex flex-col gap-2" data-testid="target-mockup">
      <div class="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[0_1px_2px_var(--color-rule)]">
        {/* Chat chrome — channel label in a low-contrast header */}
        <div class="flex items-center gap-2 border-b border-[var(--color-border-strong)] px-4 py-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="text-[var(--color-ink-faint)]"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span class="font-mono text-sm text-[var(--color-ink-base)]">{chatLabel}</span>
        </div>

        {/* Chat body — faded prior-history strokes + the delivered message */}
        <div class="flex flex-col gap-3 px-4 py-3">
          <div aria-hidden="true" class="flex flex-col gap-1.5">
            <span class="h-2 w-3/5 rounded-[var(--radius-pill)] bg-[var(--color-surface-subtle)]" />
            <span class="h-2 w-2/5 rounded-[var(--radius-pill)] bg-[var(--color-surface-subtle)]" />
          </div>

          <div class="rounded-[var(--radius-soft)] border border-[var(--color-accent-ring)] bg-[var(--color-accent-soft)] px-3 py-2">
            {messageLines.map((line) => (
              <p
                key={line}
                class="m-0 font-mono text-sm leading-normal break-all text-[var(--color-ink-strong)]"
              >
                {line}
              </p>
            ))}
          </div>

          {/* Delivery/result copy — explicit text, not color-only state */}
          <p class="m-0 flex items-center gap-1.5 text-sm leading-snug text-[var(--color-ink-muted)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              class="text-[var(--color-accent)]"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {statusLabel}
          </p>
        </div>
      </div>

      <figcaption>
        <AssetLabel meta={meta} />
      </figcaption>
    </figure>
  );
}
