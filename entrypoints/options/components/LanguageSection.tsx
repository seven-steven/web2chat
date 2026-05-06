import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { t, setLocale } from '@/shared/i18n';
import { localeItem, type LocaleChoice } from '@/shared/storage/items';

type SelectValue = 'en' | 'zh_CN' | '';

const LOCALE_ALLOWLIST: SelectValue[] = ['en', 'zh_CN', ''];

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
      class="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 flex flex-col gap-4"
      data-testid="options-language-section"
    >
      <header class="flex flex-col gap-2">
        <h2 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
          {t('options_language_heading')}
        </h2>
        <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
          {t('options_language_explainer')}
        </p>
      </header>
      <label for="locale-select" class="sr-only">
        {t('options_language_label')}
      </label>
      <select
        id="locale-select"
        data-testid="options-language-select"
        value={selected.value}
        onChange={handleChange}
        class="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md px-4 py-2 text-sm leading-normal font-normal text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
      >
        <option value="">{t('options_language_auto')}</option>
        {/* eslint-disable-next-line local/no-hardcoded-strings */}
        <option value="en">English</option>
        {/* eslint-disable-next-line local/no-hardcoded-strings */}
        <option value="zh_CN">简体中文</option>
      </select>
    </section>
  );
}
