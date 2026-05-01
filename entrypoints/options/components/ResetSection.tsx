import { signal } from '@preact/signals';
import { t } from '@/shared/i18n';
import { sendMessage } from '@/shared/messaging';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * STG-03 Reset section — section card with destructive button.
 *
 * Flow:
 *   1. User clicks "Reset all history" -> showConfirmSig.value = true
 *   2. ConfirmDialog renders -> user clicks Reset -> onConfirm fires
 *   3. onConfirm dispatches 2 RPCs in sequence (history.delete{kind:'sendTo',resetAll:true}
 *      and binding.upsert{resetAll:true,...})
 *   4. On both Ok -> toast "History cleared." for 3s; close dialog
 *   5. On any Err -> leave dialog open, show inline error in dialog body
 *
 * Per UI-SPEC Color Destructive reserved-list: button uses bg-red-600 text-white
 * (high-severity destructive — CONTEXT D-37 + STG-03).
 */
const showConfirmSig = signal(false);
const showToastSig = signal(false);
const errorSig = signal<string | null>(null);

export function ResetSection() {
  async function handleConfirm() {
    errorSig.value = null;
    try {
      // Both RPCs run in sequence per Plan 04 handler shapes.
      // history.delete with kind:'sendTo'+resetAll:true clears BOTH history lists
      // (the handler signature accepts kind for the response shape but resetAll
      // ignores kind — see Plan 04 historyDelete which calls resetAllHistory).
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
      class="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 flex flex-col gap-4"
      data-testid="options-reset-section"
    >
      <header class="flex flex-col gap-2">
        <h2 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
          {t('options_reset_heading')}
        </h2>
        <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
          {t('options_reset_explainer')}
        </p>
      </header>
      <div class="flex justify-end">
        <button
          type="button"
          class="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-semibold"
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
          class="text-sm leading-normal font-normal text-slate-700 dark:text-slate-300"
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
