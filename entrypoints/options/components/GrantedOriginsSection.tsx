import { signal, effect } from '@preact/signals';
import { t } from '@/shared/i18n';
import * as grantedOriginsRepo from '@/shared/storage/repos/grantedOrigins';
import { ConfirmDialog } from './ConfirmDialog';

const originsSig = signal<string[]>([]);
const pendingOriginSig = signal<string | null>(null);
const removingOriginSig = signal<string | null>(null);

// Load origins on first render
effect(() => {
  void grantedOriginsRepo.list().then((origins) => {
    originsSig.value = origins;
  });
});

/**
 * Granted-origins section — edge-line card with table-row layout:
 *   01  https://example.org   Remove
 *   02  https://other.io      Remove
 *
 * Origin numbers are zero-padded mono indices (10px tracking-wider) — print
 * convention for an inventory list. Hairline rules separate rows.
 */
export function GrantedOriginsSection() {
  async function handleConfirmRemove() {
    const origin = pendingOriginSig.value;
    if (!origin) return;

    pendingOriginSig.value = null;
    removingOriginSig.value = origin;
    try {
      await chrome.permissions.remove({ origins: [origin + '/*'] });
      await grantedOriginsRepo.remove(origin);
      originsSig.value = await grantedOriginsRepo.list();
    } finally {
      removingOriginSig.value = null;
    }
  }

  const origins = originsSig.value;
  const pendingOrigin = pendingOriginSig.value;
  const removingOrigin = removingOriginSig.value;

  return (
    <section
      class="bg-transparent border border-[var(--color-border-strong)] rounded-[var(--radius-card)] p-6 flex flex-col gap-4"
      data-testid="options-origins-section"
    >
      <header class="flex flex-col gap-2">
        <h2 class="m-0 font-serif text-[15px] leading-snug font-semibold tracking-tight text-[var(--color-ink-strong)]">
          {t('options_origins_heading')}
        </h2>
        <p class="m-0 text-sm leading-normal font-normal italic text-[var(--color-ink-muted)]">
          {t('options_origins_explainer')}
        </p>
      </header>
      {origins.length === 0 ? (
        <div class="flex flex-col items-center gap-2 py-2">
          <p
            class="m-0 text-sm leading-normal font-normal italic text-[var(--color-ink-muted)]"
            data-testid="options-origins-empty"
          >
            {t('options_origins_empty')}
          </p>
          <span
            class="text-[var(--color-ink-faint)] tracking-[0.5em] text-xs select-none"
            aria-hidden="true"
          >
            ∗ ∗ ∗
          </span>
        </div>
      ) : (
        <ul class="list-none m-0 p-0 flex flex-col">
          {origins.map((origin, idx) => (
            <li
              key={origin}
              class="flex items-center gap-3 px-1 py-2 border-b border-[var(--color-rule)] last:border-b-0"
              data-testid={`options-origin-item-${origin}`}
            >
              <span class="font-mono text-[10px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-faint)] tabular-nums">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span class="flex-1 font-mono text-sm text-[var(--color-ink-base)] truncate">
                {origin}
              </span>
              <button
                type="button"
                class="text-[var(--color-danger)] hover:underline underline-offset-2 text-sm font-semibold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-instant)]"
                disabled={removingOrigin === origin}
                onClick={() => {
                  pendingOriginSig.value = origin;
                }}
                data-testid={`options-origin-remove-${origin}`}
              >
                {t('options_origins_remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pendingOrigin && (
        <ConfirmDialog
          title={t('options_origins_confirm_title')}
          body={t('options_origins_confirm_body', [pendingOrigin])}
          cancelLabel={t('options_origins_confirm_cancel')}
          confirmLabel={t('options_origins_confirm_action')}
          variant="destructive"
          onCancel={() => {
            pendingOriginSig.value = null;
          }}
          onConfirm={() => void handleConfirmRemove()}
        />
      )}
    </section>
  );
}
