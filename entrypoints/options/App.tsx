import { t } from '@/shared/i18n';
import { LanguageSection } from './components/LanguageSection';
import { ResetSection } from './components/ResetSection';
import { GrantedOriginsSection } from './components/GrantedOriginsSection';

/**
 * Options page — Editorial / data-dense (260507-n86).
 *
 * Single-column 720px container with serif page heading and edge-line
 * (border-only) section cards. Three sections stagger-reveal at 0/80/160ms
 * to anchor the entrance with editorial cadence.
 */
export function App() {
  return (
    <main class="mx-auto max-w-[680px] p-5 flex flex-col gap-3 font-sans" data-testid="options-app">
      <h1 class="m-0 text-[18px] leading-tight font-semibold tracking-tight text-[var(--color-ink-strong)] [animation:w2c-editorial-rise_var(--duration-pageload)_var(--ease-quint)_both]">
        {t('options_page_heading')}
      </h1>
      <div class="[animation:w2c-editorial-rise_var(--duration-pageload)_var(--ease-quint)_both] [animation-delay:80ms]">
        <LanguageSection />
      </div>
      <div class="[animation:w2c-editorial-rise_var(--duration-pageload)_var(--ease-quint)_both] [animation-delay:160ms]">
        <ResetSection />
      </div>
      <div class="[animation:w2c-editorial-rise_var(--duration-pageload)_var(--ease-quint)_both] [animation-delay:240ms]">
        <GrantedOriginsSection />
      </div>
    </main>
  );
}
