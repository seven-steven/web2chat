/**
 * Capture-preview region — Obsidian-style Properties row-list + standalone
 * Content block (260507-n86 revision).
 *
 * Two-section layout matching the Obsidian Web Clipper Properties panel:
 *   1. Properties block: title / source / description / created — each row
 *      is `[14px icon, auto-width label, 1fr value]`. The label column auto-
 *      sizes to the longest label across rows via CSS subgrid, so it scales
 *      with the active locale (CN labels are 2–4 chars; EN labels can be
 *      longer like "Captured at"). Avoids the 88px fixed-width gap that
 *      looked sparse in CN.
 *   2. Content block: standalone large textarea below a hairline rule.
 *
 * Each editable value is a textarea with NO box border — the surrounding
 * row-hover bg + focus ring serve as the affordance, matching Obsidian's
 * inline-editable Properties pattern.
 *
 * The 6 visible fields ALL retain their data-testid attributes:
 *   - data-testid="capture-success"            (wrapper)
 *   - data-testid="capture-field-title"        (Title textarea)
 *   - data-testid="capture-field-url"          (URL output)
 *   - data-testid="capture-field-description"  (Description textarea)
 *   - data-testid="capture-field-createAt"     (CreatedAt output)
 *   - data-testid="capture-field-content"      (Content textarea)
 */
import { t } from '@/shared/i18n';
import type { ArticleSnapshot } from '@/shared/messaging';
import { FieldLabel, textareaClass } from './primitives';

interface CapturePreviewProps {
  snapshot: ArticleSnapshot;
  titleValue: string;
  onTitleChange: (next: string) => void;
  descriptionValue: string;
  onDescriptionChange: (next: string) => void;
  contentValue: string;
  onContentChange: (next: string) => void;
}

/**
 * Inline-editable textarea class — for use inside PropertyRow value column.
 * No box border (the surrounding row-hover bg provides the affordance);
 * focus shows an emerald ring instead of a hard border so the row alignment
 * stays clean.
 */
const inlineEditableClass = [
  'w-full px-2 py-1 rounded-[var(--radius-sharp)]',
  'leading-snug',
  'text-[var(--color-ink-strong)]',
  'bg-transparent',
  'border-0',
  'focus-visible:outline-none',
  'focus-visible:bg-[var(--color-surface)]',
  'focus-visible:shadow-[inset_0_0_0_1px_var(--color-accent)]',
  'resize-none field-sizing-content',
  'transition-[background-color,box-shadow] duration-[var(--duration-instant)]',
].join(' ');

export function CapturePreview(props: CapturePreviewProps) {
  const captureDate = new Date(props.snapshot.create_at);
  const formattedDate = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(captureDate);
  const relativeTime = formatRelative(captureDate);

  return (
    <div class="flex flex-col gap-3" data-testid="capture-success">
      {/* Properties block — subgrid: all rows share label-column width */}
      <div class="grid grid-cols-[14px_auto_1fr] items-start gap-x-2 gap-y-0">
        {/* Title row */}
        <PropertyRow icon={<TypeIcon />} labelFor="field-title" label={t('capture_field_title')}>
          <textarea
            id="field-title"
            class={`${inlineEditableClass} font-serif text-[14px] tracking-tight`}
            value={props.titleValue}
            onInput={(e) => {
              props.onTitleChange((e.target as HTMLTextAreaElement).value);
            }}
            spellcheck={false}
            data-testid="capture-field-title"
            rows={1}
          />
        </PropertyRow>

        {/* Source (URL) row — bare URL, no host chip (Obsidian convention) */}
        <PropertyRow icon={<LinkIcon />} label={t('capture_field_url')}>
          <output
            class="block px-2 py-1 text-[12px] leading-snug font-mono text-[var(--color-ink-base)] break-all"
            data-testid="capture-field-url"
          >
            {props.snapshot.url}
          </output>
        </PropertyRow>

        {/* Description row */}
        <PropertyRow
          icon={<TextIcon />}
          labelFor="field-description"
          label={t('capture_field_description')}
        >
          <textarea
            id="field-description"
            class={`${inlineEditableClass} text-[13px]`}
            style="max-height:5.5rem"
            value={props.descriptionValue}
            onInput={(e) => {
              props.onDescriptionChange((e.target as HTMLTextAreaElement).value);
            }}
            spellcheck={false}
            data-testid="capture-field-description"
            rows={2}
          />
        </PropertyRow>

        {/* Created row — mono date + relative-time supplement */}
        <PropertyRow icon={<ClockIcon />} label={t('capture_field_createAt')}>
          <output
            class="block px-2 py-1 text-[12px] leading-snug font-mono text-[var(--color-ink-base)] tabular-nums break-words"
            data-testid="capture-field-createAt"
          >
            <span>{formattedDate}</span>
            {relativeTime && <span class="text-[var(--color-ink-faint)]"> · {relativeTime}</span>}
          </output>
        </PropertyRow>
      </div>

      {/* Hairline divider */}
      <hr class="border-0 border-t border-[var(--color-rule)]" />

      {/* Content block — standalone textarea (full width, large) */}
      <div class="flex flex-col gap-1">
        <FieldLabel id="field-content" label={t('capture_field_content')} />
        <textarea
          id="field-content"
          class={textareaClass}
          style="min-height:9rem"
          value={props.contentValue}
          onInput={(e) => {
            props.onContentChange((e.target as HTMLTextAreaElement).value);
          }}
          spellcheck={false}
          data-testid="capture-field-content"
        />
      </div>
    </div>
  );
}

// ─── Property row primitive ──────────────────────────────────────────────────

interface PropertyRowProps {
  icon: preact.JSX.Element;
  /** When provided, label becomes a <label for=id>; otherwise a plain <span>. */
  labelFor?: string;
  label: string;
  children: preact.ComponentChildren;
}

/**
 * Subgrid row — `display: grid` with `grid-cols-subgrid` so all rows
 * inherit the parent grid's column track sizes. Hover tints the entire
 * row (icon column → value column) with surface-subtle.
 */
function PropertyRow({ icon, labelFor, label, children }: PropertyRowProps) {
  return (
    <div class="col-span-3 grid grid-cols-subgrid items-start py-1 rounded-[var(--radius-sharp)] hover:bg-[var(--color-surface-subtle)] transition-colors duration-[var(--duration-instant)]">
      <span class="text-[var(--color-ink-faint)] mt-1.5 flex items-center justify-center">
        {icon}
      </span>
      {labelFor ? (
        <label
          for={labelFor}
          class="self-start mt-1.5 text-[12px] leading-snug font-normal text-[var(--color-ink-muted)] whitespace-nowrap"
        >
          {label}
        </label>
      ) : (
        <span class="self-start mt-1.5 text-[12px] leading-snug font-normal text-[var(--color-ink-muted)] whitespace-nowrap">
          {label}
        </span>
      )}
      <div class="min-w-0">{children}</div>
    </div>
  );
}

// ─── Lucide-style icons (14×14, stroke 1.5) ──────────────────────────────────

const ICON_PROPS = {
  width: '14',
  height: '14',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '1.5',
  'stroke-linecap': 'round' as const,
  'stroke-linejoin': 'round' as const,
  'aria-hidden': true,
};

function TypeIcon() {
  // Lucide type — for Title row
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function LinkIcon() {
  // Lucide link — for URL row
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TextIcon() {
  // Lucide align-left — for Description row
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
      <line x1="17" y1="10" x2="3" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="17" y1="18" x2="3" y2="18" />
    </svg>
  );
}

function ClockIcon() {
  // Lucide clock — for Created row
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Relative-time formatter using Intl.RelativeTimeFormat (browser-native, 0 KB,
 * automatic locale handling — no new i18n key required).
 */
function formatRelative(date: Date): string {
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(navigator.language, { numeric: 'auto' });
  if (absSec < 60) return rtf.format(diffSec, 'second');
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (absSec < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  return '';
}
