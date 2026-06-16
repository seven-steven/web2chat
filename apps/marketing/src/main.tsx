import { render } from 'preact';
import { signal } from '@preact/signals';
import { App } from './app';
import { setLocale } from './i18n/index';
import './styles/index.css';

const locale = signal('en');

async function init(): Promise<void> {
  const browserLang = navigator.language.replace('-', '_');
  const supported = ['en', 'zh_CN'];
  const detected = supported.includes(browserLang) ? browserLang : 'en';
  locale.value = detected;
  await setLocale(detected);
  // Mirror the langAttr contract from app.tsx onto <html> so AT announces the
  // page language on initial paint (WR-08). Same expression as app.tsx (D4).
  document.documentElement.lang = detected === 'zh_CN' ? 'zh-CN' : 'en';
  render(<App locale={locale} />, document.getElementById('app')!);
}

void init();
