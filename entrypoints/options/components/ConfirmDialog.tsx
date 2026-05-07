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
 *   - When variant='destructive', confirm button uses var(--color-danger) bg + white text
 *   - When variant='default' (or unset), confirm button uses var(--color-accent) bg + white text
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
      ? 'bg-[var(--color-danger)] hover:brightness-95 active:translate-y-[0.5px] transition-[transform,filter] duration-[var(--duration-snap)] text-white px-4 py-2 rounded-[var(--radius-soft)] text-sm font-semibold tracking-[0.04em]'
      : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)] active:translate-y-[0.5px] active:brightness-95 transition-[background-color,transform,filter] duration-[var(--duration-snap)] text-white px-4 py-2 rounded-[var(--radius-soft)] text-sm font-semibold tracking-[0.04em]';

  return (
    <div
      class="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50"
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
        class="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-6 max-w-md w-full mx-4 flex flex-col gap-4 border border-[var(--color-border-strong)] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)] [animation:w2c-dialog-open_var(--duration-base)_var(--ease-quint)]"
        data-testid="confirm-dialog"
      >
        <h2
          id="confirm-dialog-title"
          class="m-0 text-base leading-snug font-semibold text-[var(--color-ink-strong)]"
        >
          {props.title}
        </h2>
        <p
          id="confirm-dialog-body"
          class="m-0 text-sm leading-normal font-normal text-[var(--color-ink-base)]"
        >
          {props.body}
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="border border-[var(--color-border-strong)] text-[var(--color-ink-strong)] hover:bg-[var(--color-surface-subtle)] active:translate-y-[0.5px] transition-[background-color,transform] duration-[var(--duration-snap)] px-4 py-2 rounded-[var(--radius-soft)] text-sm font-semibold tracking-[0.04em]"
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
