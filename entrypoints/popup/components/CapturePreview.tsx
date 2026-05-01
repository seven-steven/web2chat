/**
 * Phase 2 capture-preview region — extracted verbatim from App.tsx SuccessView.
 *
 * The 5 visible fields ALL have explicit data-testid attributes that Phase 2 e2e
 * (tests/e2e/capture.spec.ts) depends on:
 *   - data-testid="capture-success"           (the wrapping <div>)
 *   - data-testid="capture-field-title"       (Title textarea)
 *   - data-testid="capture-field-url"         (URL <output>, read-only)
 *   - data-testid="capture-field-description" (Description textarea)
 *   - data-testid="capture-field-createAt"    (Captured at <output>, read-only)
 *   - data-testid="capture-field-content"     (Content textarea)
 *
 * Spacing: gap-3 + px-3 py-2 inherited from Phase 2 (NOT Phase 3 strict scale).
 * Per UI-SPEC S-Spacing Scale lines 80-90, the inherited density is preserved
 * surgically inside this region; SendForm's outer gap-4 sits OUTSIDE the
 * capture-preview boundary.
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
  const formattedDate = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(props.snapshot.create_at));

  return (
    <div class="flex flex-col gap-3" data-testid="capture-success">
      {/* Title — editable textarea */}
      <FieldLabel id="field-title" label={t('capture_field_title')} />
      <textarea
        id="field-title"
        class={textareaClass}
        style="min-height:2.25rem"
        value={props.titleValue}
        onInput={(e) => {
          props.onTitleChange((e.target as HTMLTextAreaElement).value);
        }}
        spellcheck={false}
        data-testid="capture-field-title"
      />

      {/* URL — read-only output */}
      <div class="flex flex-col gap-1">
        <span class="text-xs leading-snug font-normal text-slate-500 dark:text-slate-400">
          {t('capture_field_url')}
        </span>
        <output
          class="text-xs leading-snug font-mono text-slate-500 dark:text-slate-400 break-all"
          data-testid="capture-field-url"
        >
          {props.snapshot.url}
        </output>
      </div>

      {/* Description — editable textarea */}
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

      {/* Captured at — read-only output */}
      <div class="flex flex-col gap-1">
        <span class="text-xs leading-snug font-normal text-slate-500 dark:text-slate-400">
          {t('capture_field_createAt')}
        </span>
        <output
          class="text-sm leading-normal font-normal text-slate-500 dark:text-slate-400"
          data-testid="capture-field-createAt"
        >
          {formattedDate}
        </output>
      </div>

      {/* Content — editable textarea (tallest) */}
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
