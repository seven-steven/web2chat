/**
 * PopupMockup — code-generated popup proof module showing the structured
 * payload fields + prompt (D-06 / D-10, T-15-04 mitigation).
 *
 * Reuses the real popup's visual language (CapturePreview field rows:
 * 14px labels, mono value surfaces, hairline divider before the content
 * block) rather than a raw `<pre>` dump. Field order is locked to
 * title / url / description / create_at / content / prompt (MSG-03);
 * the order arrives pre-sorted from getPayloadExample().
 *
 * Every instance renders the AssetLabel metadata row so the demo can never
 * be mistaken for a real screenshot (15-UI-SPEC mockup labeling contract).
 */
import type { PayloadExample, ProofMeta } from '../../data/site-content';
import { AssetLabel } from './asset-label';

export interface PopupMockupProps {
  payload: PayloadExample;
  meta: ProofMeta;
}

/** Fields rendered as compact one-line rows; content/prompt get block rows. */
const COMPACT_FIELDS = new Set(['title', 'url', 'description', 'create_at']);

/** Brand wordmark shown in the mockup chrome — not localized (15-01 decision). */
const BRAND_WORDMARK = 'Web2Chat';

export function PopupMockup({ payload, meta }: PopupMockupProps) {
  const compact = payload.fields.filter((f) => COMPACT_FIELDS.has(f.key));
  const blocks = payload.fields.filter((f) => !COMPACT_FIELDS.has(f.key));

  return (
    <figure class="m-0 flex flex-col gap-2" data-testid="popup-mockup">
      <div class="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[0_1px_2px_var(--color-rule)]">
        {/* Compact popup chrome — low-contrast title bar like the real popup */}
        <div
          aria-hidden="true"
          class="flex items-center justify-between border-b border-[var(--color-border-strong)] px-4 py-2"
        >
          <span class="text-sm font-semibold text-[var(--color-ink-strong)]">{BRAND_WORDMARK}</span>
          <span class="flex gap-1.5">
            <span class="size-2 rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)]" />
            <span class="size-2 rounded-[var(--radius-pill)] bg-[var(--color-surface-sunken)]" />
          </span>
        </div>

        <dl class="m-0 flex flex-col gap-0 px-4 py-3">
          {/* Property rows — label column + mono value, popup style */}
          {compact.map((field) => (
            <div
              key={field.key}
              data-field-key={field.key}
              class="grid grid-cols-[6.5rem_1fr] items-start gap-x-2 py-1"
            >
              <dt class="text-sm leading-snug text-[var(--color-ink-muted)]">{field.label}</dt>
              <dd class="m-0 min-w-0 font-mono text-sm leading-snug break-all text-[var(--color-ink-base)]">
                {field.value}
              </dd>
            </div>
          ))}

          <hr class="my-2 border-0 border-t border-[var(--color-rule)]" />

          {/* Content + prompt — block rows with bounded preview height */}
          {blocks.map((field) => (
            <div key={field.key} data-field-key={field.key} class="flex flex-col gap-1 py-1">
              <dt class="text-sm leading-snug text-[var(--color-ink-muted)]">{field.label}</dt>
              <dd
                class={`m-0 rounded-[var(--radius-sharp)] border border-[var(--color-border-soft)] bg-[var(--color-surface-subtle)] px-2 py-1.5 font-mono text-sm leading-normal whitespace-pre-wrap text-[var(--color-ink-base)] ${
                  field.key === 'content' ? 'max-h-28 overflow-hidden text-ellipsis' : ''
                }`}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <figcaption>
        <AssetLabel meta={meta} />
      </figcaption>
    </figure>
  );
}
