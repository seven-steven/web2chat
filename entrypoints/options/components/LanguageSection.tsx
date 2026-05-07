import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { t, setLocale } from '@/shared/i18n';
import { localeItem, type LocaleChoice } from '@/shared/storage/items';

type SelectValue = 'en' | 'zh_CN' | '';

const LOCALE_ALLOWLIST: SelectValue[] = ['en', 'zh_CN', ''];

/**
 * Editorial card: edge-line (1px stone border, no fill), serif heading,
 * italic explainer, custom-arrow bottom-border select.
 */
export function LanguageSection() {
  // '' = Auto (follow browser)
  const selected = useSignal<SelectValue>('');

  useEffect(() => {
    void localeItem.getValue().then((stored) => {
      selected.value = stored ?? '';
    });
  }, []);

  async function handleChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as SelectValue;
    if (!LOCALE_ALLOWLIST.includes(val)) return;
    selected.value = val;
    const locale: LocaleChoice = val === '' ? null : val;
    await setLocale(locale);
  }

  return (
    <section
      class="bg-transparent border border-[var(--color-border-strong)] rounded-[var(--radius-card)] p-6 flex flex-col gap-4"
      data-testid="options-language-section"
    >
      <header class="flex flex-col gap-2">
        <h2 class="m-0 font-serif text-[15px] leading-snug font-semibold tracking-tight text-[var(--color-ink-strong)]">
          {t('options_language_heading')}
        </h2>
        <p class="m-0 text-sm leading-normal font-normal italic text-[var(--color-ink-muted)]">
          {t('options_language_explainer')}
        </p>
      </header>
      <label for="locale-select" class="sr-only">
        {t('options_language_label')}
      </label>
      <div class="relative">
        <select
          id="locale-select"
          data-testid="options-language-select"
          value={selected.value}
          onChange={handleChange}
          class="w-full bg-transparent border-0 border-b-[1.5px] border-[var(--color-border-strong)] rounded-none px-3 py-2 pr-8 text-sm leading-normal font-normal text-[var(--color-ink-strong)] hover:border-[var(--color-ink-faint)] focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-[var(--color-accent)] transition-[border-color] duration-[var(--duration-snap)] appearance-none"
        >
          <option value="">{t('options_language_auto')}</option>
          {/* eslint-disable-next-line local/no-hardcoded-strings */}
          <option value="en">English</option>
          {/* eslint-disable-next-line local/no-hardcoded-strings */}
          <option value="zh_CN">简体中文</option>
        </select>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] pointer-events-none"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
