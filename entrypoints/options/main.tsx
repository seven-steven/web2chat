import { render } from 'preact';
import { App } from './App';
import { localeItem } from '@/shared/storage/items';
import { localeSig } from '@/shared/i18n';
import './style.css';

async function main() {
  const savedLocale = await localeItem.getValue();
  if (savedLocale !== null) {
    localeSig.value = savedLocale;
  }
  const root = document.getElementById('app');
  if (!root) throw new Error('[options] #app root missing');
  render(<App />, root);
}

void main();
