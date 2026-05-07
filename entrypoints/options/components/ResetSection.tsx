import { signal } from '@preact/signals';
import { t } from '@/shared/i18n';
import { sendMessage } from '@/shared/messaging';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * STG-03 Reset section — edge-line card with rust-outline destructive button
 * that escalates to filled-danger on hover (tactile warning escalation).
 *
 * Flow:
 *   1. Click "Reset all history" -> showConfirmSig.value = true
 *   2. ConfirmDialog renders -> Reset clicked -> onConfirm fires
 *   3. onConfirm dispatches 2 RPCs in sequence
 *   4. Both Ok -> toast "History cleared." for 3s; close dialog
 *   5. Any Err -> leave dialog open, show inline error
 *
 * Per UI-SPEC Color Destructive reserved-list: button uses var(--color-danger)
 * for filled-on-hover state; default state is outline only (less aggressive).
 */
const showConfirmSig = signal(false);
const showToastSig = signal(false);
const errorSig = signal<string | null>(null);

export function ResetSection() {
  async function handleConfirm() {
    errorSig.value = null;
    try {
      // Both RPCs run in sequence per Plan 04 handler shapes.
      const histRes = await sendMessage('history.delete', { kind: 'sendTo', resetAll: true });
      if (!histRes.ok) {
        errorSig.value = histRes.message || 'history.delete failed';
        return;
      }
      const bindRes = await sendMessage('binding.upsert', {
        send_to: '',
        prompt: '',
        resetAll: true,
      });
      if (!bindRes.ok) {
        errorSig.value = bindRes.message || 'binding.upsert(resetAll) failed';
        return;
      }
      // Success — close dialog + toast 3s
      showConfirmSig.value = false;
      showToastSig.value = true;
      window.setTimeout(() => {
        showToastSig.value = false;
      }, 3_000);
    } catch (err) {
      errorSig.value = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <section
      class="bg-transparent border border-[var(--color-border-strong)] rounded-[var(--radius-card)] p-3 flex flex-col gap-2"
      data-testid="options-reset-section"
    >
      <header class="flex flex-col gap-1">
        <h2 class="m-0 text-[13px] leading-snug font-semibold text-[var(--color-ink-strong)]">
          {t('options_reset_heading')}
        </h2>
        <p class="m-0 text-[12px] leading-normal font-normal text-[var(--color-ink-muted)]">
          {t('options_reset_explainer')}
        </p>
      </header>
      <div class="flex justify-end">
        <button
          type="button"
          class="border border-[var(--color-danger)] text-[var(--color-danger)] bg-transparent hover:bg-[var(--color-danger)] hover:text-white active:translate-y-[0.5px] transition-[background-color,color,transform] duration-[var(--duration-snap)] px-3 py-1.5 rounded-[var(--radius-soft)] text-[13px] font-semibold tracking-[0.02em]"
          onClick={() => {
            showConfirmSig.value = true;
            errorSig.value = null;
          }}
          data-testid="options-reset-button"
        >
          {t('options_reset_button')}
        </button>
      </div>
      {showConfirmSig.value && (
        <ConfirmDialog
          title={t('options_reset_confirm_title')}
          body={
            errorSig.value
              ? `${t('options_reset_confirm_body')} (${errorSig.value})`
              : t('options_reset_confirm_body')
          }
          cancelLabel={t('options_reset_confirm_cancel')}
          confirmLabel={t('options_reset_confirm_action')}
          variant="destructive"
          onCancel={() => {
            showConfirmSig.value = false;
            errorSig.value = null;
          }}
          onConfirm={handleConfirm}
        />
      )}
      {showToastSig.value && (
        <p
          class="text-[12px] leading-normal font-normal text-[var(--color-ink-muted)]"
          role="status"
          aria-live="polite"
          data-testid="options-reset-toast"
        >
          {t('options_reset_post_toast')}
        </p>
      )}
    </section>
  );
}
