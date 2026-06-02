import en from './locales/en.json';

type LocaleKey = string;

const fallbackDictionary: Record<string, string> = en;
const dictionaries: Record<string, Record<string, string> | undefined> = {
  en: fallbackDictionary,
};

// Lazy-load non-default locales
async function loadLocale(locale: string): Promise<void> {
  if (locale === 'en' || dictionaries[locale]) return;
  if (locale === 'zh_CN') {
    const mod = await import('./locales/zh_CN.json');
    dictionaries[locale] = mod.default;
  }
}

let currentLocale = 'en';

export async function setLocale(locale: string): Promise<void> {
  await loadLocale(locale);
  currentLocale = locale;
}

export function t(key: LocaleKey): string {
  const dict = dictionaries[currentLocale];
  if (dict) return dict[key] ?? key;
  return fallbackDictionary[key] ?? key;
}
