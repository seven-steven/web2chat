import { useEffect, useRef } from 'preact/hooks';
import { t } from '@/shared/i18n';

interface SelectorWarningDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function SelectorWarningDialog(props: SelectorWarningDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        props.onCancel();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      class="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
      data-testid="selector-warning-dialog-overlay"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="selector-warning-dialog-title"
        aria-describedby="selector-warning-dialog-body"
        class="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 max-w-md w-full mx-4 flex flex-col gap-4 border border-[var(--color-border-strong)] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)] [animation:w2c-dialog-open_var(--duration-base)_var(--ease-quint)]"
        data-testid="selector-warning-dialog"
      >
        <h2
          id="selector-warning-dialog-title"
          class="m-0 text-base leading-snug font-semibold text-[var(--color-ink-strong)]"
        >
          {t('selector_low_confidence_heading')}
        </h2>
        <p
          id="selector-warning-dialog-body"
          class="m-0 text-sm leading-normal font-normal text-[var(--color-ink-base)]"
        >
          {t('selector_low_confidence_body')}
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="border border-[var(--color-border-strong)] text-[var(--color-ink-strong)] hover:bg-[var(--color-surface-subtle)] active:translate-y-[0.5px] transition-[background-color,transform] duration-[var(--duration-snap)] px-4 py-2 rounded-[var(--radius-soft)] text-sm font-semibold tracking-[0.04em]"
            onClick={props.onCancel}
            data-testid="selector-warning-dialog-cancel"
          >
            {t('selector_low_confidence_cancel')}
          </button>
          <button
            ref={confirmRef}
            type="button"
            class="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)] active:translate-y-[0.5px] active:brightness-95 transition-[background-color,transform,filter] duration-[var(--duration-snap)] text-white px-4 py-2 rounded-[var(--radius-soft)] text-sm font-semibold tracking-[0.04em]"
            onClick={props.onConfirm}
            data-testid="selector-warning-dialog-confirm"
          >
            {t('selector_low_confidence_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
