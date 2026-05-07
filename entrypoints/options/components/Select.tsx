/**
 * Custom Select — ARIA combobox + listbox replacing the native <select>.
 *
 * Why custom: native <select> dropdown UI is rendered by the OS / browser
 * shell and does NOT honor `prefers-color-scheme: dark` from the host page
 * on most platforms (Chrome shows a light-mode dropdown on a dark popup).
 * A custom listbox is fully token-driven and integrates with the rest of
 * the design system (emerald accent for active state, surface tokens for
 * background, w2c-listbox-open animation, etc.).
 *
 * Keyboard contract (matches popup/components/Combobox.tsx):
 *   Enter/Space   open + focus current; on open, select active option.
 *   ArrowDown     next option (or open from closed state).
 *   ArrowUp       previous option.
 *   Escape        close, return focus to trigger.
 *   Tab           close, allow native focus to advance.
 *   Click outside close.
 */
import { useState, useRef, useEffect } from 'preact/hooks';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  testId?: string;
}

export function Select(props: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const listboxId = `${props.id}-listbox`;

  const selectedIdx = props.options.findIndex((o) => o.value === props.value);
  const selected = selectedIdx >= 0 ? props.options[selectedIdx] : null;

  // Close on click outside
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        listboxRef.current &&
        !listboxRef.current.contains(target)
      ) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function commit(idx: number) {
    const opt = props.options[idx];
    if (!opt) return;
    props.onChange(opt.value);
    setOpen(false);
    setActiveIdx(-1);
    buttonRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    const len = props.options.length;
    switch (e.key) {
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (open) {
          if (activeIdx >= 0 && activeIdx < len) commit(activeIdx);
          else setOpen(false);
        } else {
          setOpen(true);
          setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0);
        }
        return;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0);
        } else {
          setActiveIdx((idx) => Math.min(idx + 1, len - 1));
        }
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIdx(selectedIdx >= 0 ? selectedIdx : len - 1);
        } else {
          setActiveIdx((idx) => Math.max(idx - 1, 0));
        }
        return;
      }
      case 'Home': {
        if (open) {
          e.preventDefault();
          setActiveIdx(0);
        }
        return;
      }
      case 'End': {
        if (open) {
          e.preventDefault();
          setActiveIdx(len - 1);
        }
        return;
      }
      case 'Escape': {
        if (open) {
          e.preventDefault();
          setOpen(false);
          setActiveIdx(-1);
          buttonRef.current?.focus();
        }
        return;
      }
      case 'Tab': {
        setOpen(false);
        setActiveIdx(-1);
        return;
      }
    }
  }

  return (
    <div class="relative">
      <button
        ref={buttonRef}
        id={props.id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={props.ariaLabel}
        aria-activedescendant={open && activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0);
        }}
        onKeyDown={handleKeyDown}
        class="w-full flex items-center justify-between bg-transparent border-0 border-b-[1.5px] border-[var(--color-border-strong)] rounded-none px-2 py-1.5 pr-8 text-[13px] leading-normal font-normal text-left text-[var(--color-ink-strong)] hover:border-[var(--color-ink-faint)] focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-[var(--color-accent)] transition-[border-color] duration-[var(--duration-snap)]"
        data-testid={props.testId}
      >
        <span class="truncate">{selected?.label ?? ''}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          class={`absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] pointer-events-none transition-transform duration-[var(--duration-snap)] ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={props.ariaLabel}
          class="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)] z-10 [animation:w2c-listbox-open_var(--duration-base)_var(--ease-quint)]"
        >
          {props.options.map((opt, i) => {
            const isSelected = opt.value === props.value;
            const isActive = i === activeIdx;
            return (
              <li
                key={opt.value}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                class={`flex items-center gap-2 min-h-9 px-3 py-2 cursor-pointer text-[13px] leading-snug transition-colors duration-[var(--duration-instant)] ${
                  isActive
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : isSelected
                      ? 'text-[var(--color-ink-strong)]'
                      : 'text-[var(--color-ink-base)] hover:bg-[var(--color-surface-subtle)]'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(i);
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span class="w-3.5 shrink-0 flex items-center justify-center">
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-[var(--color-accent)]"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span class="flex-1 truncate">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
