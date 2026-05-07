import { signal } from '@preact/signals';
import { t } from '@/shared/i18n';

interface InProgressViewProps {
  dispatchId: string;
  onCancel: () => void;
}

const copiedSig = signal(false);

/**
 * Dispatch in-progress placeholder (D-31, UI-SPEC S-In-progress placeholder).
 * Replaces SendForm + capture preview when storage.session.dispatch:active is in-flight.
 *
 * Editorial entrance: 5 children stagger-revealed at 0/60/120/180/240ms with
 * a 320ms ease-quint translateY+opacity rise. The slow editorial spinner
 * (1.6s linear rotation) replaces the conventional 1.0s anxious spin.
 *
 * dispatchId is rendered as a mono pill so users can copy it for bug reports.
 */
export function InProgressView({ dispatchId, onCancel }: InProgressViewProps) {
  // Three-segment inline accent on "Cancel" word per Pattern S5 / PITFALLS S11
  const before = t('dispatch_in_progress_body_before');
  const inlineCancel = t('dispatch_in_progress_body_icon');
  const after = t('dispatch_in_progress_body_after');

  async function handleCopyDispatchId() {
    try {
      await navigator.clipboard.writeText(dispatchId);
      copiedSig.value = true;
      window.setTimeout(() => {
        copiedSig.value = false;
      }, 2_000);
    } catch {
      // clipboard refused — silent (CLAUDE.md "privacy" — no console disclosure)
    }
  }

  // Truncate dispatchId for display: first 4 chars + ellipsis. Full UUID
  // still copies to clipboard.
  const dispatchIdDisplay = dispatchId.slice(0, 4) + '…';

  return (
    <main
      class="flex flex-col items-center text-center p-4 py-8 gap-4 min-w-[360px] min-h-[240px] font-sans"
      role="status"
      aria-live="polite"
      data-testid="dispatch-in-progress"
    >
      <div class="[animation:w2c-editorial-rise_320ms_var(--ease-quint)_both]">
        <Spinner />
      </div>
      <h2
        class="m-0 font-serif text-base leading-snug font-semibold tracking-tight text-[var(--color-ink-strong)] [animation:w2c-editorial-rise_320ms_var(--ease-quint)_both] [animation-delay:60ms]"
        data-testid="dispatch-in-progress-heading"
      >
        {t('dispatch_in_progress_heading')}
      </h2>
      <p class="m-0 text-sm leading-normal font-normal text-[var(--color-ink-muted)] [animation:w2c-editorial-rise_320ms_var(--ease-quint)_both] [animation-delay:120ms]">
        {before}
        <span class="text-[var(--color-accent)] font-semibold">{inlineCancel}</span>
        {after}
      </p>
      <button
        type="button"
        class="border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] active:translate-y-[0.5px] transition-[background-color,transform] duration-[var(--duration-snap)] px-4 py-2 rounded-[var(--radius-soft)] text-sm font-semibold tracking-[0.04em] [animation:w2c-editorial-rise_320ms_var(--ease-quint)_both] [animation-delay:180ms]"
        onClick={onCancel}
        data-testid="dispatch-cancel"
      >
        {t('dispatch_cancel_label')}
      </button>
      <div class="flex items-center gap-2 [animation:w2c-editorial-rise_320ms_var(--ease-quint)_both] [animation-delay:240ms]">
        <span class="text-[10px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-faint)]">
          {t('dispatch_in_progress_dispatchId_label')}
        </span>
        <button
          type="button"
          class="text-xs leading-snug font-mono text-[var(--color-ink-muted)] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] px-2 py-0.5 rounded-[var(--radius-sharp)] transition-colors duration-[var(--duration-instant)]"
          onClick={handleCopyDispatchId}
          aria-label={dispatchId}
          data-testid="dispatch-id-copy"
        >
          {dispatchIdDisplay}
        </button>
      </div>
      {copiedSig.value && (
        <p class="text-xs leading-snug font-normal italic text-[var(--color-ink-muted)]">
          {t('dispatch_in_progress_copy_toast')}
        </p>
      )}
    </main>
  );
}

/**
 * Editorial arc spinner — 24×24, 1.5px stroke in accent color, 1.6s linear
 * rotation (calmer than typical 1.0s).
 */
function Spinner() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-[var(--color-accent)] [animation:w2c-editorial-spin_1.6s_linear_infinite]"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
