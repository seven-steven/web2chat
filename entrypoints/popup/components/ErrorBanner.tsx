import { t } from '@/shared/i18n';
import type { ErrorCode } from '@/shared/messaging';

interface ErrorBannerProps {
  code: ErrorCode;
  onRetry?: () => void;
  onDismiss: () => void;
}

/**
 * Phase 3 dispatch error banner (DSP-07, UI-SPEC S-Error banner lines 455-460).
 * Slim red-600 left-border treatment ABOVE SendForm — NOT full-screen.
 *
 * Five Phase 3 ErrorCodes mapped here:
 *   NOT_LOGGED_IN | INPUT_NOT_FOUND | TIMEOUT | RATE_LIMITED | PLATFORM_UNSUPPORTED
 *
 * Plus Phase 1+2 codes that may surface during dispatch (re-rendered with
 * generic heading + body): INTERNAL | RESTRICTED_URL | EXTRACTION_EMPTY |
 * EXECUTE_SCRIPT_FAILED. The latter four typically only appear in capture flow,
 * but defensive rendering here means a runtime mismatch surfaces a banner
 * rather than silently rendering nothing.
 *
 * IMPORTANT — XSS/T-03-04-03 mitigation: this component does NOT render
 * `error.message` (raw exception text from SW). Only `t('error_code_<CODE>_*')`
 * i18n strings reach the DOM. error.message remains in storage.session for
 * SW-side diagnostics; users get a code-mapped human-readable copy.
 */

/** ErrorCodes whose human-readable `_retry` button MUST exist in i18n. */
const RETRIABLE_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'NOT_LOGGED_IN',
  'INPUT_NOT_FOUND',
  'TIMEOUT',
  'RATE_LIMITED',
  'EXECUTE_SCRIPT_FAILED',
  'INTERNAL',
]);

export function ErrorBanner({ code, onRetry, onDismiss }: ErrorBannerProps) {
  const heading = errorHeading(code);
  const body = errorBody(code);
  const retryLabel = errorRetry(code);
  const showRetry = RETRIABLE_CODES.has(code) && !!onRetry && retryLabel !== '';

  return (
    <div
      class="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 p-4 rounded-r-md flex items-start gap-2"
      role="alert"
      aria-live="assertive"
      data-testid={`error-banner-${code}`}
    >
      <div class="flex-1">
        <h3 class="m-0 text-sm leading-snug font-semibold text-red-700 dark:text-red-300">
          {heading}
        </h3>
        <p class="mt-1 m-0 text-sm leading-normal font-normal text-slate-700 dark:text-slate-300">
          {body}
        </p>
        {showRetry && (
          <button
            type="button"
            class="mt-2 text-sm font-semibold text-red-600 hover:text-red-700 dark:hover:text-red-400 underline-offset-2 hover:underline"
            onClick={onRetry}
            data-testid={`error-banner-${code}-retry`}
          >
            {retryLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        aria-label={t('error_code_dismiss_label')}
        onClick={onDismiss}
        data-testid={`error-banner-${code}-dismiss`}
      >
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
    </div>
  );
}

// --- i18n key resolvers (switch on ErrorCode for typed-key correctness) ---

function errorHeading(code: ErrorCode): string {
  switch (code) {
    case 'NOT_LOGGED_IN':
      return t('error_code_NOT_LOGGED_IN_heading');
    case 'INPUT_NOT_FOUND':
      return t('error_code_INPUT_NOT_FOUND_heading');
    case 'TIMEOUT':
      return t('error_code_TIMEOUT_heading');
    case 'RATE_LIMITED':
      return t('error_code_RATE_LIMITED_heading');
    case 'PLATFORM_UNSUPPORTED':
      return t('error_code_PLATFORM_UNSUPPORTED_heading');
    case 'EXECUTE_SCRIPT_FAILED':
      return t('error_code_EXECUTE_SCRIPT_FAILED_heading');
    case 'INTERNAL':
      return t('error_code_INTERNAL_heading');
    case 'RESTRICTED_URL':
      return t('error_code_RESTRICTED_URL_heading');
    case 'EXTRACTION_EMPTY':
      return t('error_code_EXTRACTION_EMPTY_heading');
  }
}

function errorBody(code: ErrorCode): string {
  switch (code) {
    case 'NOT_LOGGED_IN':
      return t('error_code_NOT_LOGGED_IN_body');
    case 'INPUT_NOT_FOUND':
      return t('error_code_INPUT_NOT_FOUND_body');
    case 'TIMEOUT':
      return t('error_code_TIMEOUT_body');
    case 'RATE_LIMITED':
      return t('error_code_RATE_LIMITED_body');
    case 'PLATFORM_UNSUPPORTED':
      return t('error_code_PLATFORM_UNSUPPORTED_body');
    case 'EXECUTE_SCRIPT_FAILED':
      return t('error_code_EXECUTE_SCRIPT_FAILED_body');
    case 'INTERNAL':
      return t('error_code_INTERNAL_body');
    case 'RESTRICTED_URL':
      return t('error_code_RESTRICTED_URL_body');
    case 'EXTRACTION_EMPTY':
      return t('error_code_EXTRACTION_EMPTY_body');
  }
}

function errorRetry(code: ErrorCode): string {
  switch (code) {
    case 'NOT_LOGGED_IN':
      return t('error_code_NOT_LOGGED_IN_retry');
    case 'INPUT_NOT_FOUND':
      return t('error_code_INPUT_NOT_FOUND_retry');
    case 'TIMEOUT':
      return t('error_code_TIMEOUT_retry');
    case 'RATE_LIMITED':
      return t('error_code_RATE_LIMITED_retry');
    case 'EXECUTE_SCRIPT_FAILED':
      return t('error_code_EXECUTE_SCRIPT_FAILED_retry');
    case 'INTERNAL':
      return t('error_code_INTERNAL_retry');
    // PLATFORM_UNSUPPORTED / RESTRICTED_URL / EXTRACTION_EMPTY have no retry
    default:
      return '';
  }
}
