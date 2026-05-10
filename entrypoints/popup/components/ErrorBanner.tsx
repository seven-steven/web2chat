import { t } from '@/shared/i18n';
import type { ErrorCode } from '@/shared/messaging';

interface ErrorBannerProps {
  code: ErrorCode;
  retriable: boolean;
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

export function ErrorBanner({ code, retriable, onRetry, onDismiss }: ErrorBannerProps) {
  const heading = errorHeading(code);
  const body = errorBody(code);
  const retryLabel = errorRetry(code);
  const showRetry = retriable && !!onRetry;

  return (
    <div
      class="bg-transparent border-l-[3px] border-[var(--color-danger)] pl-3 py-2 rounded-r-[var(--radius-sharp)] flex items-start gap-2 hover:bg-[var(--color-danger-soft)] transition-colors duration-[var(--duration-instant)] [animation:w2c-margin-note-in_var(--duration-base)_var(--ease-quint)]"
      role="alert"
      aria-live="assertive"
      data-testid={`error-banner-${code}`}
    >
      <div class="flex-1">
        <h3 class="m-0 text-sm leading-snug font-semibold text-[var(--color-danger)]">{heading}</h3>
        <p class="mt-1 m-0 text-sm leading-normal font-normal text-[var(--color-ink-base)]">
          {body}
        </p>
        {showRetry && (
          <button
            type="button"
            class="mt-2 text-sm font-semibold text-[var(--color-danger)] hover:underline underline-offset-2"
            onClick={onRetry}
            data-testid={`error-banner-${code}-retry`}
          >
            {retryLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        class="text-[var(--color-ink-faint)] hover:text-[var(--color-ink-strong)] transition-colors duration-[var(--duration-instant)]"
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
    case 'OPENCLAW_OFFLINE':
      return t('error_code_OPENCLAW_OFFLINE_heading');
    case 'OPENCLAW_PERMISSION_DENIED':
      return t('error_code_OPENCLAW_PERMISSION_DENIED_heading');
    default:
      return t('error_code_INTERNAL_heading');
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
    case 'OPENCLAW_OFFLINE':
      return t('error_code_OPENCLAW_OFFLINE_body');
    case 'OPENCLAW_PERMISSION_DENIED':
      return t('error_code_OPENCLAW_PERMISSION_DENIED_body');
    default:
      return t('error_code_INTERNAL_body');
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
    case 'OPENCLAW_OFFLINE':
      return t('error_code_OPENCLAW_OFFLINE_retry');
    case 'OPENCLAW_PERMISSION_DENIED':
      return t('error_code_OPENCLAW_PERMISSION_DENIED_retry');
    // PLATFORM_UNSUPPORTED / RESTRICTED_URL / EXTRACTION_EMPTY have no retry
    default:
      return '';
  }
}
