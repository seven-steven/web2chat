import { useEffect, useRef } from 'preact/hooks';

interface ConfirmDialogProps {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  variant?: 'destructive' | 'default';
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Reusable destructive-confirmation modal — UI-SPEC Confirmation dialog.
 * Phase 3 caller: ResetSection (STG-03). Phase 4 may reuse for grant revoke.
 * Phase 6 may reuse for locale unbind.
 *
 * Behavior:
 *   - Fixed overlay click-through prevented; clicks on overlay call onCancel
 *   - ESC key calls onCancel (added/removed via useEffect)
 *   - Focus trap: confirm button auto-focuses on mount; Tab cycles within dialog
 *   - When variant='destructive', confirm button uses bg-red-600 + text-white
 *   - When variant='default' (or unset), confirm button uses bg-sky-600 + text-white
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Auto-focus the confirm button so keyboard users can immediately Enter.
    // For destructive actions this is debatable (could foot-gun); UI-SPEC line
    // 396 says "ESC closes" but doesn't mandate initial focus. Auto-focus
    // confirm because it is the primary positive action visually; if user
    // wanted to bail, they would press ESC, click overlay, or click Cancel.
    confirmRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        props.onCancel();
      }
      // Focus trap — if Tab cycles past last focusable element, wrap to first
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

  const confirmClass =
    props.variant === 'destructive'
      ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-semibold'
      : 'bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white px-4 py-2 rounded-md text-sm font-semibold';

  return (
    <div
      class="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60 flex items-center justify-center z-50"
      onClick={(e) => {
        // Overlay click (target === currentTarget) cancels; bubbled clicks from card don't
        if (e.target === e.currentTarget) props.onCancel();
      }}
      data-testid="confirm-dialog-overlay"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        class="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 flex flex-col gap-4"
        data-testid="confirm-dialog"
      >
        <h2
          id="confirm-dialog-title"
          class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100"
        >
          {props.title}
        </h2>
        <p
          id="confirm-dialog-body"
          class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400"
        >
          {props.body}
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-md text-sm font-semibold"
            onClick={props.onCancel}
            data-testid="confirm-dialog-cancel"
          >
            {props.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            class={confirmClass}
            onClick={props.onConfirm}
            data-testid="confirm-dialog-confirm"
          >
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
