import en from './locales/en.json';

type LocaleKey = string;

const dictionaries = {
  en,
  zh_CN: {} as Record<string, string>,
} as const;

// Lazy-load non-default locales
async function loadLocale(locale: string): Promise<void> {
  if (locale === 'en' || (dictionaries as Record<string, Record<string, string>>)[locale]) return;
  if (locale === 'zh_CN') {
    const mod = await import('./locales/zh_CN.json');
    (dictionaries as Record<string, Record<string, string>>)[locale] = mod.default;
  }
}

let currentLocale = 'en';

export async function setLocale(locale: string): Promise<void> {
  await loadLocale(locale);
  currentLocale = locale;
}

export function t(key: LocaleKey): string {
  const dict = (dictionaries as Record<string, Record<string, string>>)[currentLocale];
  if (dict) return dict[key] ?? key;
  return (dictionaries.en as Record<string, string>)[key] ?? key;
}
