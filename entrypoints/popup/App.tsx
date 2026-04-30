/**
 * Phase 2 popup: capture 4-state UI (CAP-05, D-15..D-22).
 *
 * State machine:
 *   loading   — RPC in-flight (initial state; snapshot=null, error=null)
 *   success   — ArticleSnapshot received; 3 editable textareas + 2 read-only outputs
 *   empty     — RESTRICTED_URL or EXTRACTION_EMPTY (no content to show; not an error)
 *   error     — EXECUTE_SCRIPT_FAILED / INTERNAL (retriable; user must re-click toolbar icon)
 *
 * Phase 1 contracts still honoured:
 *   - SW Phase 1 health-probe route stays registered (popup no longer calls it)
 *   - cancelled-flag async IIFE pattern (PATTERNS.md §Pattern 2)
 *   - All user-visible copy via t() — no bare string literals (FND-06, D-12)
 *
 * Security:
 *   - popup never assigns raw HTML; content is bound only as textarea.value
 *     (plain text rendering through Preact text nodes) — see D-20
 *   - Inline accent span composed in JSX, not in i18n YAML (PITFALLS §11)
 *
 * Preact note:
 *   - Labels use the native `for` attribute (not the React-compat alias),
 *     matching project convention; FieldLabel emits `for={id}` directly.
 */

import { useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { sendMessage } from '@/shared/messaging';
import type { ArticleSnapshot, ErrorCode } from '@/shared/messaging';
import { t } from '@/shared/i18n';

// ─── Module-level signals (D-22: editing values live only here; cleared on popup close) ─────

const snapshotSig = signal<ArticleSnapshot | null>(null);
const errorSig = signal<{ code: ErrorCode; message: string } | null>(null);

// Editable field signals — initialised from snapshot on RPC success, cleared on popup close
const titleSig = signal('');
const descriptionSig = signal('');
const contentSig = signal('');

// ─── Component ────────────────────────────────────────────────────────────────

export function App() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await sendMessage('capture.run'); // D-15: auto-trigger on mount
        if (cancelled) return;
        if (result.ok) {
          snapshotSig.value = result.data;
          titleSig.value = result.data.title;
          descriptionSig.value = result.data.description;
          contentSig.value = result.data.content;
        } else {
          errorSig.value = { code: result.code, message: result.message };
        }
      } catch (err) {
        // sendMessage rejects when SW is unreachable / suspended without a wake reason
        // / returns an unrecognised payload. Without this catch the loading skeleton
        // would render forever, breaking the loading→error transition contract.
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        errorSig.value = { code: 'INTERNAL', message };
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const snapshot = snapshotSig.value;
  const error = errorSig.value;

  // State dispatch (D-17, PITFALLS Pitfall 4: EXTRACTION_EMPTY → empty, not error)
  if (snapshot === null && error === null) return <LoadingSkeleton />;
  if (snapshot !== null) return <SuccessView snapshot={snapshot} />;
  if (error?.code === 'RESTRICTED_URL' || error?.code === 'EXTRACTION_EMPTY') {
    return <EmptyView code={error.code} />;
  }
  return <ErrorView />;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <main
      class="flex flex-col gap-3 p-4 min-w-[360px] min-h-[240px] font-sans"
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="capture-loading"
    >
      <span class="sr-only">{t('capture_loading_label')}</span>
      {/* 5 skeleton rows approximate the success layout to prevent layout shift */}
      <div class="flex flex-col gap-1">
        <div class="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div class="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
      <div class="flex flex-col gap-1">
        <div class="h-4 w-1/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div class="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
      <div class="flex flex-col gap-1">
        <div class="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div class="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
      <div class="flex flex-col gap-1">
        <div class="h-4 w-1/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div class="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
      <div class="flex flex-col gap-1">
        <div class="h-4 w-1/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div class="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    </main>
  );
}

// ─── Success View ─────────────────────────────────────────────────────────────

function SuccessView({ snapshot }: { snapshot: ArticleSnapshot }) {
  const formattedDate = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(snapshot.create_at));

  return (
    <main
      class="flex flex-col gap-3 p-4 min-w-[360px] min-h-[240px] font-sans"
      data-testid="capture-success"
    >
      {/* Title — editable textarea */}
      <FieldLabel id="field-title" label={t('capture_field_title')} />
      <textarea
        id="field-title"
        class={textareaClass}
        style="min-height:2.25rem"
        value={titleSig.value}
        onInput={(e) => {
          titleSig.value = (e.target as HTMLTextAreaElement).value;
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
          {snapshot.url}
        </output>
      </div>

      {/* Description — editable textarea */}
      <FieldLabel id="field-description" label={t('capture_field_description')} />
      <textarea
        id="field-description"
        class={textareaClass}
        style="min-height:4.5rem"
        value={descriptionSig.value}
        onInput={(e) => {
          descriptionSig.value = (e.target as HTMLTextAreaElement).value;
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
        value={contentSig.value}
        onInput={(e) => {
          contentSig.value = (e.target as HTMLTextAreaElement).value;
        }}
        spellcheck={false}
        data-testid="capture-field-content"
      />
    </main>
  );
}

// ─── Empty View (RESTRICTED_URL + EXTRACTION_EMPTY) ──────────────────────────

function EmptyView({ code }: { code: 'RESTRICTED_URL' | 'EXTRACTION_EMPTY' }) {
  const variant = code === 'RESTRICTED_URL' ? 'restricted' : 'noContent';
  const heading =
    variant === 'restricted'
      ? t('capture_empty_restricted_heading')
      : t('capture_empty_noContent_heading');

  // Inline accent span pattern (UI-SPEC.md §Copywriting Contract)
  // Three i18n keys per body string: .before / .icon (wrapped) / .after
  const before =
    variant === 'restricted'
      ? t('capture_empty_restricted_body_before')
      : t('capture_empty_noContent_body_before');
  const icon =
    variant === 'restricted'
      ? t('capture_empty_restricted_body_icon')
      : t('capture_empty_noContent_body_icon');
  const after =
    variant === 'restricted'
      ? t('capture_empty_restricted_body_after')
      : t('capture_empty_noContent_body_after');

  return (
    <main
      class="flex flex-col items-center text-center p-4 py-8 gap-2 min-w-[360px] min-h-[240px] font-sans"
      role="status"
      aria-live="polite"
      data-testid="capture-empty"
    >
      <EmptyIcon variant={variant} />
      <h2 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
        {heading}
      </h2>
      <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
        {before}
        <span class="text-sky-600 dark:text-sky-400">{icon}</span>
        {after}
      </p>
    </main>
  );
}

// ─── Error View (EXECUTE_SCRIPT_FAILED / INTERNAL) ───────────────────────────

function ErrorView() {
  return (
    <main
      class="flex flex-col items-center text-center p-4 py-8 gap-2 min-w-[360px] min-h-[240px] font-sans"
      role="alert"
      aria-live="assertive"
      data-testid="capture-error"
    >
      <AlertIcon />
      <h2 class="m-0 text-base leading-snug font-semibold text-red-600 dark:text-red-400">
        {t('capture_error_scriptFailed_heading')}
      </h2>
      <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
        {t('capture_error_scriptFailed_body_before')}
        <span class="text-sky-600 dark:text-sky-400">
          {t('capture_error_scriptFailed_body_icon')}
        </span>
        {t('capture_error_scriptFailed_body_after')}
      </p>
    </main>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

/**
 * Label component using Preact's native `for` attribute (not the React-compat alias).
 * Props: id → the id of the associated input; label → visible text.
 */
function FieldLabel({ id, label }: { id: string; label: string }) {
  return (
    <label for={id} class="text-xs leading-snug font-normal text-slate-500 dark:text-slate-400">
      {label}
    </label>
  );
}

const textareaClass = [
  'w-full px-3 py-2 rounded-md',
  'text-sm leading-normal font-normal',
  'text-slate-900 dark:text-slate-100',
  'bg-white dark:bg-slate-900',
  'border border-slate-200 dark:border-slate-700',
  'focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-400',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
  'focus-visible:border-sky-600 dark:focus-visible:border-sky-400',
  'resize-none field-sizing-content',
].join(' ');

/** Lock-closed glyph for empty:restricted, info-circle glyph for empty:noContent */
function EmptyIcon({ variant }: { variant: 'restricted' | 'noContent' }) {
  if (variant === 'restricted') {
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
        class="text-slate-500 dark:text-slate-400"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
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
      class="text-slate-500 dark:text-slate-400"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/** Alert-triangle SVG for error state */
function AlertIcon() {
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
      class="text-red-600 dark:text-red-400"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
