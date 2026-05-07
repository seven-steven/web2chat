import { useState, useRef } from 'preact/hooks';
import { t } from '@/shared/i18n';
import { inputClass } from './primitives';
import { PlatformIcon } from './PlatformIcon';

/**
 * One option in the listbox. `key` is the unique React-key + ARIA-id suffix;
 * `label` is the visible text; `iconVariant` selects PlatformIcon variant for
 * the leading 16x16 icon; `removable` enables the trailing delete button.
 */
export interface ComboboxOption {
  key: string;
  label: string;
  iconVariant: 'mock' | 'openclaw' | 'discord' | 'unsupported' | 'none';
  removable: boolean;
}

interface ComboboxProps {
  id: string; // input id (e.g. 'popup-field-sendTo')
  label: string; // accessible name passed to listbox aria-label
  placeholder?: string;
  value: string; // controlled value
  onChange: (next: string) => void; // called on every input keystroke
  options: ComboboxOption[]; // filtered list ready to render
  onSelect: (key: string) => void; // called on Enter or click of option
  onDelete?: (key: string) => void; // called on delete button click; optional
  onBlur?: () => void; // delegated to parent (e.g. binding upsert debounce)
  emptyStateText?: string; // shown when options.length === 0 and listOpen
  leadingIcon?: 'mock' | 'openclaw' | 'discord' | 'unsupported' | 'none';
  // platform icon left of input (DSP-01)
  disabled?: boolean;
}

/**
 * ARIA 1.2 editable combobox with list autocomplete (D-30).
 * Component-local state via useState (NOT module-level signal — combobox is
 * reused 2x in Plan 06 for send_to + prompt; module-level state would conflate
 * the two instances). SendForm passes filtered options + value + onChange.
 *
 * Keyboard contract (UI-SPEC S-Combobox S-Keyboard contract):
 *   ArrowUp/ArrowDown cycle activeIdx (-1 -> 0 -> ... -> length-1 -> -1)
 *   Enter selects activeOption when activeIdx >= 0
 *   Escape closes listbox keeping current input value
 *   Tab closes listbox, native focus cycle (no preventDefault)
 */
export function Combobox(props: ComboboxProps) {
  const listboxId = `${props.id}-listbox`;
  const [listOpen, setListOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const blurTimerRef = useRef<number | null>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.disabled) return;
    const len = props.options.length;
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!listOpen) {
          setListOpen(true);
          setActiveIdx(0);
          return;
        }
        setActiveIdx((idx) => (idx + 1 >= len ? -1 : idx + 1));
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (!listOpen) {
          setListOpen(true);
          setActiveIdx(len - 1);
          return;
        }
        setActiveIdx((idx) => (idx <= -1 ? len - 1 : idx - 1));
        return;
      }
      case 'Enter': {
        if (activeIdx >= 0 && activeIdx < len) {
          e.preventDefault();
          const opt = props.options[activeIdx];
          if (opt) {
            props.onSelect(opt.key);
            setListOpen(false);
            setActiveIdx(-1);
          }
        }
        return;
      }
      case 'Escape': {
        if (listOpen) {
          e.preventDefault();
          setListOpen(false);
          setActiveIdx(-1);
        }
        return;
      }
      case 'Tab': {
        setListOpen(false);
        setActiveIdx(-1);
        return;
      }
    }
  };

  const handleBlur = () => {
    // Defer close so option onMouseDown fires first (without this the listbox
    // closes before click registers and onSelect never fires).
    blurTimerRef.current = window.setTimeout(() => {
      setListOpen(false);
      setActiveIdx(-1);
      props.onBlur?.();
    }, 150);
  };

  const handleFocus = () => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    if (!props.disabled) setListOpen(true);
  };

  const showEmptyState = listOpen && props.options.length === 0 && !!props.emptyStateText;

  return (
    <div class="relative">
      <div class="flex items-center gap-2">
        {props.leadingIcon && props.leadingIcon !== 'none' && (
          <PlatformIcon variant={props.leadingIcon} size={24} />
        )}
        <input
          id={props.id}
          type="text"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIdx >= 0 && activeIdx < props.options.length
              ? `${listboxId}-opt-${activeIdx}`
              : undefined
          }
          aria-label={props.label}
          class={`${inputClass} flex-1`}
          value={props.value}
          placeholder={props.placeholder}
          disabled={props.disabled}
          onInput={(e) => props.onChange((e.currentTarget as HTMLInputElement).value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          data-testid={`combobox-${props.id}`}
        />
      </div>

      {listOpen && props.options.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={props.label}
          class="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)] z-10 [animation:w2c-listbox-open_var(--duration-base)_var(--ease-quint)]"
        >
          {props.options.map((opt, i) => (
            <li
              key={opt.key}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              class={`flex items-center gap-2 min-h-9 px-2 py-2 cursor-pointer transition-colors duration-[var(--duration-instant)] ${
                i === activeIdx
                  ? 'bg-[var(--color-accent-soft)] border-l-2 border-[var(--color-accent)]'
                  : 'hover:bg-[var(--color-surface-subtle)]'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                props.onSelect(opt.key);
                setListOpen(false);
                setActiveIdx(-1);
              }}
              data-testid={`combobox-${props.id}-option-${i}`}
            >
              {opt.iconVariant !== 'none' && <PlatformIcon variant={opt.iconVariant} size={16} />}
              <span
                class="flex-1 text-sm leading-snug font-mono font-normal text-[var(--color-ink-strong)] truncate"
                title={opt.label}
              >
                {opt.label}
              </span>
              {opt.removable && props.onDelete && (
                <button
                  type="button"
                  class="text-[var(--color-ink-faint)] hover:text-[var(--color-danger)] transition-colors duration-[var(--duration-instant)]"
                  aria-label={t('history_remove_button')}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onDelete?.(opt.key);
                  }}
                  data-testid={`combobox-${props.id}-option-${i}-delete`}
                >
                  {/* Lucide x icon — 16x16 */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {showEmptyState && (
        <div
          class="absolute left-0 right-0 mt-1 px-3 py-2 rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)] text-xs leading-snug font-normal italic text-[var(--color-ink-faint)] z-10 pointer-events-none [animation:w2c-listbox-open_var(--duration-base)_var(--ease-quint)]"
          data-testid={`combobox-${props.id}-empty`}
        >
          {props.emptyStateText}
        </div>
      )}
    </div>
  );
}
