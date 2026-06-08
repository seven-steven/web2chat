import en from './locales/en.json';
import zh_CN from './locales/zh_CN.json';

type LocaleKey = string;

const fallback: Record<string, string> = en;

const dictionaries: Record<string, Record<string, string>> = {
  en,
  zh_CN,
};

let currentLocale = 'en';

export async function setLocale(locale: string): Promise<void> {
  currentLocale = locale;
}

export function t(key: LocaleKey): string {
  const dict = dictionaries[currentLocale];
  if (dict) return dict[key] ?? key;
  return fallback[key] ?? key;
}
