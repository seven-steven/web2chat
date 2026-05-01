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
 * Visual hierarchy: 24x24 sky-600 spinner + heading is the primary anchor.
 * Cancel is the secondary affordance (red-600 outline, NOT filled).
 *
 * dispatchId footer is intentionally surfaced (not hidden) so users can
 * copy-paste it into bug reports (debug aid, UI-SPEC line 475).
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
      <Spinner />
      <h2
        class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100"
        data-testid="dispatch-in-progress-heading"
      >
        {t('dispatch_in_progress_heading')}
      </h2>
      <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
        {before}
        <span class="text-sky-600 dark:text-sky-400">{inlineCancel}</span>
        {after}
      </p>
      <button
        type="button"
        class="border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-4 py-2 rounded-md text-sm font-semibold"
        onClick={onCancel}
        data-testid="dispatch-cancel"
      >
        {t('dispatch_cancel_label')}
      </button>
      <div class="flex items-center gap-2">
        <span class="text-xs leading-snug font-normal text-slate-400 dark:text-slate-500">
          {t('dispatch_in_progress_dispatchId_label')}
        </span>
        <button
          type="button"
          class="text-xs leading-snug font-mono text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline-offset-2 hover:underline"
          onClick={handleCopyDispatchId}
          aria-label={dispatchId}
          data-testid="dispatch-id-copy"
        >
          {dispatchIdDisplay}
        </button>
      </div>
      {copiedSig.value && (
        <p class="text-xs leading-snug font-normal text-slate-500 dark:text-slate-400">
          {t('dispatch_in_progress_copy_toast')}
        </p>
      )}
    </main>
  );
}

/** Lucide loader-2 spinner — 24x24, sky-600, animate-spin (UI-SPEC line 471). */
function Spinner() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-sky-600 dark:text-sky-400 animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
