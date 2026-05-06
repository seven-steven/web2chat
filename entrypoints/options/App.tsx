import { t } from '@/shared/i18n';
import { LanguageSection } from './components/LanguageSection';
import { ResetSection } from './components/ResetSection';
import { GrantedOriginsSection } from './components/GrantedOriginsSection';

/**
 * Options page — Phase 3 (STG-03). Single column layout @ max-w-720px center.
 *
 * Spacing scale: page padding p-8 (32px), section gap-4 (16px), card p-6 (24px).
 */
export function App() {
  return (
    <main class="mx-auto max-w-[720px] p-8 flex flex-col gap-4 font-sans" data-testid="options-app">
      <h1 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
        {t('options_page_heading')}
      </h1>
      <LanguageSection />
      <ResetSection />
      <GrantedOriginsSection />
    </main>
  );
}
