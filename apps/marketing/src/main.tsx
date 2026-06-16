import { render } from 'preact';
import { signal } from '@preact/signals';
import { App } from './app';
import { setLocale } from './i18n/index';
import './styles/index.css';

const locale = signal('en');

/**
 * WR-06: detect the initial locale by matching on language PREFIX rather than
 * an exact `zh_CN` / `en` tag equality. `navigator.language.replace('-', '_')`
 * (the old implementation) produced e.g. `zh_TW`, `zh_HK`, `en_GB` — none of
 * which matched the `['en', 'zh_CN']` supported set, so any Chinese-reading
 * visitor whose browser tag was not exactly `zh-CN` silently got the English
 * page on first paint. The prefix match sends every Chinese variant to the
 * zh_CN copy (the only Chinese bundle we ship) and every English variant to en.
 * `navigator.languages` is preferred when present so the user's full preference
 * order is honored.
 */
function detectLocale(): string {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const norm = l.toLowerCase();
    if (norm.startsWith('zh')) return 'zh_CN'; // any Chinese variant → zh_CN copy
    if (norm.startsWith('en')) return 'en';
  }
  return 'en';
}

async function init(): Promise<void> {
  const detected = detectLocale();
  locale.value = detected;
  await setLocale(detected);
  // Mirror the langAttr contract from app.tsx onto <html> so AT announces the
  // page language on initial paint (WR-08). Same expression as app.tsx (D4).
  document.documentElement.lang = detected === 'zh_CN' ? 'zh-CN' : 'en';
  render(<App locale={locale} />, document.getElementById('app')!);
}

void init();
