import { signal, computed } from '@preact/signals';
import enDict from '../../locales/en.yml';
import zhCNDict from '../../locales/zh_CN.yml';
import { localeItem, type LocaleChoice } from '../storage/items';

// ─── Locale dicts (build-time YAML→JS via yamlLocalePlugin) ───────────────
const DICTS: Record<NonNullable<LocaleChoice>, Record<string, string>> = {
  en: enDict as Record<string, string>,
  zh_CN: zhCNDict as Record<string, string>,
};

// ─── Locale signal ─────────────────────────────────────────────────────────
function inferLocaleFromBrowser(): NonNullable<LocaleChoice> {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return lang.startsWith('zh') ? 'zh_CN' : 'en';
}

/** D-76: Current active locale. null = follow browser (navigator.language). */
export const localeSig = signal<LocaleChoice>(null);

/** Resolved effective locale (never null). */
const resolvedLocaleSig = computed<NonNullable<LocaleChoice>>(
  () => localeSig.value ?? inferLocaleFromBrowser(),
);

/** Current active locale dict — Preact components reading this via t() auto-track. */
export const localeDictSig = computed<Record<string, string>>(() => DICTS[resolvedLocaleSig.value]);

// ─── Public API ────────────────────────────────────────────────────────────
const LOCALE_ALLOWLIST: LocaleChoice[] = ['en', 'zh_CN', null];

/**
 * Switch locale. null = revert to browser-inferred.
 * Only accepts allowlisted values; writes to chrome.storage.local.
 */
export async function setLocale(locale: LocaleChoice): Promise<void> {
  if (!LOCALE_ALLOWLIST.includes(locale)) return;
  localeSig.value = locale;
  await localeItem.setValue(locale);
}

/**
 * Translate a key. When called inside Preact components, auto-tracks
 * localeDictSig dependency — switching locale triggers immediate re-render.
 *
 * Supports positional placeholders: t('key', ['val0', 'val1']) replaces {0}, {1}.
 * Returns plain string — never HTML.
 */
export function t(key: string, substitutions?: (string | number)[]): string {
  const dict = localeDictSig.value;
  let msg = dict[key] ?? key;
  if (substitutions && substitutions.length > 0) {
    msg = msg.replace(/\{(\d+)\}/g, (_, idx: string) => {
      const i = parseInt(idx, 10);
      return i < substitutions.length ? String(substitutions[i]) : `{${idx}}`;
    });
  }
  return msg;
}

export type T = typeof t;
