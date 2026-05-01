/**
 * Popup chrome — title bar with settings gear (D-37).
 *
 * Rendered above EVERY popup view: loading skeleton, SendForm, EmptyView,
 * ErrorView, InProgressView. State-specific main content sits below.
 *
 * Settings gear triggers chrome.runtime.openOptionsPage(). Phase 4 may add
 * a status dot showing granted-origin count next to the gear; Phase 6 may
 * surface locale switcher state — those plans modify this file.
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
      class="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-200 dark:border-slate-700"
      data-testid="popup-chrome"
    >
      <h1 class="m-0 text-xs leading-snug font-normal text-slate-500 dark:text-slate-400">
        {t('popup_chrome_title')}
      </h1>
      <button
        type="button"
        class="size-6 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
          stroke-width="2"
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
