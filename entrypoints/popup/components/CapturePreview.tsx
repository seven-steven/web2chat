/**
 * Phase 2 capture-preview region — extracted from App.tsx SuccessView.
 *
 * Editorial pattern (260507-n86):
 *   - Title textarea uses serif font (display character — capture-as-headline metaphor)
 *   - URL output is mono with a host chip prefix (e.g. [github.com])
 *   - createdAt shows absolute mono timestamp + relative-time supplement via
 *     Intl.RelativeTimeFormat (browser-native, 0 KB, no new i18n key)
 *   - Description and Content textareas remain sans
 *   - Field labels via shared FieldLabel (11px UPPERCASE tracking-wider)
 *   - Hairline rules between fields via border-t in the label/output blocks
 *
 * The 5 visible fields ALL retain their data-testid attributes that Phase 2
 * e2e (tests/e2e/capture.spec.ts) depends on:
 *   - data-testid="capture-success"
 *   - data-testid="capture-field-title"
 *   - data-testid="capture-field-url"
 *   - data-testid="capture-field-description"
 *   - data-testid="capture-field-createAt"
 *   - data-testid="capture-field-content"
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

export function CapturePreview(props: CapturePreviewProps) {
  const captureDate = new Date(props.snapshot.create_at);
  const formattedDate = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(captureDate);
  const relativeTime = formatRelative(captureDate);

  const host = safeHost(props.snapshot.url);

  return (
    <div class="flex flex-col gap-3" data-testid="capture-success">
      {/* Title — serif display textarea */}
      <FieldLabel id="field-title" label={t('capture_field_title')} />
      <textarea
        id="field-title"
        class={`${textareaClass} font-serif text-[15px] leading-snug tracking-tight`}
        style="min-height:2.25rem"
        value={props.titleValue}
        onInput={(e) => {
          props.onTitleChange((e.target as HTMLTextAreaElement).value);
        }}
        spellcheck={false}
        data-testid="capture-field-title"
      />

      {/* URL — read-only output with host chip + mono full URL */}
      <div class="flex flex-col gap-1">
        <span class="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-muted)]">
          {t('capture_field_url')}
        </span>
        <output
          class="flex items-baseline flex-wrap gap-x-2 gap-y-1 text-xs leading-snug font-mono text-[var(--color-ink-muted)] break-all"
          data-testid="capture-field-url"
        >
          {host && (
            <span class="font-mono text-[10px] uppercase tracking-wide bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] px-1.5 py-0.5 rounded-[var(--radius-sharp)]">
              {host}
            </span>
          )}
          <span class="text-[var(--color-ink-muted)]">{props.snapshot.url}</span>
        </output>
      </div>

      {/* Description — sans textarea */}
      <FieldLabel id="field-description" label={t('capture_field_description')} />
      <textarea
        id="field-description"
        class={textareaClass}
        style="min-height:4.5rem"
        value={props.descriptionValue}
        onInput={(e) => {
          props.onDescriptionChange((e.target as HTMLTextAreaElement).value);
        }}
        spellcheck={false}
        data-testid="capture-field-description"
      />

      {/* Captured at — read-only mono with relative-time supplement */}
      <div class="flex flex-col gap-1">
        <span class="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-muted)]">
          {t('capture_field_createAt')}
        </span>
        <output
          class="flex items-baseline flex-wrap gap-x-2 text-sm leading-normal font-normal text-[var(--color-ink-muted)] tabular-nums"
          data-testid="capture-field-createAt"
        >
          <span class="font-mono text-xs">{formattedDate}</span>
          {relativeTime && (
            <span class="text-[var(--color-ink-faint)] font-mono text-xs">· {relativeTime}</span>
          )}
        </output>
      </div>

      {/* Content — sans textarea (tallest) */}
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
  );
}

/**
 * Best-effort host extraction — returns null when URL is malformed (e.g.
 * extension-internal pages or test fixtures). Caller hides the chip when null.
 */
function safeHost(url: string): string | null {
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

/**
 * Relative-time formatter using Intl.RelativeTimeFormat (browser-native, 0 KB,
 * automatic locale handling — no new i18n key required).
 *
 * Returns a localized string like "5 min ago" / "刚刚" / "2 hr ago" depending
 * on navigator.language.
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
