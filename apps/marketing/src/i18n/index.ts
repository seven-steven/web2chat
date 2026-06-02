import { computed, signal } from '@preact/signals';
import en from './locales/en.json';
import zhCn from './locales/zh_CN.json';

type LocaleKey = string;
type MarketingLocale = 'en' | 'zh_CN';

const fallbackDictionary: Record<string, string> = en;
const dictionaries: Record<MarketingLocale, Record<string, string>> = {
  en: fallbackDictionary,
  zh_CN: zhCn,
};
const LOCALE_ALLOWLIST: MarketingLocale[] = ['en', 'zh_CN'];

export const localeSig = signal<MarketingLocale>('en');
export const localeDictSig = computed<Record<string, string>>(() => dictionaries[localeSig.value]);

export async function setLocale(locale: string): Promise<void> {
  if (!LOCALE_ALLOWLIST.includes(locale as MarketingLocale)) return;
  localeSig.value = locale as MarketingLocale;
}

export function t(key: LocaleKey): string {
  const dict = localeDictSig.value;
  return dict[key] ?? fallbackDictionary[key] ?? key;
}
