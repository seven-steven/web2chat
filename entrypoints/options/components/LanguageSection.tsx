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
      <select
        id="locale-select"
        data-testid="options-language-select"
        value={selected.value}
        onChange={handleChange}
        class="w-full bg-transparent border-0 border-b-[1.5px] border-[var(--color-border-strong)] rounded-none px-3 py-2 pr-8 text-sm leading-normal font-normal text-[var(--color-ink-strong)] hover:border-[var(--color-ink-faint)] focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-[var(--color-accent)] transition-[border-color] duration-[var(--duration-snap)] appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:14px] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b6b62%22%20stroke-width%3D%221.75%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')]"
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
