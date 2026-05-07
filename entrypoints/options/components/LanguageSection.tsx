import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { t, setLocale } from '@/shared/i18n';
import { localeItem, type LocaleChoice } from '@/shared/storage/items';
import { Select, type SelectOption } from './Select';

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

  async function handleChange(val: string) {
    const v = val as SelectValue;
    if (!LOCALE_ALLOWLIST.includes(v)) return;
    selected.value = v;
    const locale: LocaleChoice = v === '' ? null : v;
    await setLocale(locale);
  }

  const options: SelectOption[] = [
    { value: '', label: t('options_language_auto') },
    { value: 'en', label: 'English' },
    { value: 'zh_CN', label: '简体中文' },
  ];

  return (
    <section
      class="bg-transparent border border-[var(--color-border-strong)] rounded-[var(--radius-card)] p-3 flex flex-col gap-2"
      data-testid="options-language-section"
    >
      <header class="flex flex-col gap-1">
        <h2 class="m-0 text-[13px] leading-snug font-semibold text-[var(--color-ink-strong)]">
          {t('options_language_heading')}
        </h2>
        <p class="m-0 text-[12px] leading-normal font-normal text-[var(--color-ink-muted)]">
          {t('options_language_explainer')}
        </p>
      </header>
      <label for="locale-select" class="sr-only">
        {t('options_language_label')}
      </label>
      <Select
        id="locale-select"
        value={selected.value}
        onChange={(v) => void handleChange(v)}
        options={options}
        ariaLabel={t('options_language_label')}
        testId="options-language-select"
      />
    </section>
  );
}
