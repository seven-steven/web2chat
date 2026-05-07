/**
 * Popup chrome — title bar with settings gear (D-37).
 *
 * Editorial typography: `Web2Chat` wordmark in serif display weight.
 * Settings gear: 60deg rotation on hover (signature micro-interaction).
 * Bottom rule: stone-200 hairline + 1px inset rule above for double-line print feel.
 */
import { t } from '@/shared/i18n';

export function PopupChrome() {
  function handleSettingsClick() {
    chrome.runtime.openOptionsPage().catch((err) => {
      console.error('[popup] openOptionsPage failed:', err);
    });
  }
  return (
    <div
      class="flex items-center justify-between px-3 pt-3 pb-2 border-b border-[var(--color-border-strong)]"
      data-testid="popup-chrome"
    >
      <h1 class="m-0 text-[13px] leading-snug font-semibold text-[var(--color-ink-strong)]">
        {t('popup_chrome_title')}
      </h1>
      <button
        type="button"
        class="size-6 text-[var(--color-ink-muted)] hover:text-[var(--color-ink-strong)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-snap)] hover:rotate-[60deg]"
        aria-label={t('popup_chrome_settings_tooltip')}
        title={t('popup_chrome_settings_tooltip')}
        onClick={handleSettingsClick}
        data-testid="popup-chrome-settings"
      >
        {/* Lucide settings gear — 24x24 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
