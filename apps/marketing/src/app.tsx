import type { Signal } from '@preact/signals';
import { getHero, getLocaleToggle, getSupportedPlatforms } from './data/site-content';
import { t } from './i18n/index';

interface AppProps {
  locale: Signal<string>;
}

export function App({ locale }: AppProps) {
  const hero = getHero();
  const platforms = getSupportedPlatforms();
  const localeToggle = getLocaleToggle();

  return (
    <div class="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-base)]">
      <header class="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 class="text-3xl font-bold text-[var(--color-ink-strong)]">{hero.title}</h1>
        <p class="mt-4 text-lg text-[var(--color-ink-muted)]">{hero.subtitle}</p>
        <a
          href={hero.primaryCta.href}
          class="mt-8 inline-block rounded-[var(--radius-soft)] bg-[var(--color-accent)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          {hero.primaryCta.label}
        </a>
      </header>

      <section class="mx-auto max-w-3xl px-6 pb-16">
        <h2 class="mb-6 text-xl font-semibold text-[var(--color-ink-strong)]">
          {platforms[0] && t('supportedPlatforms.title')}
        </h2>
        <ul class="space-y-3">
          {platforms.map((p) => (
            <li
              key={p.key}
              class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3"
            >
              {p.label}
            </li>
          ))}
        </ul>
      </section>

      <section class="mx-auto max-w-3xl px-6 pb-20 text-center">
        <h2 class="mb-3 text-xl font-semibold text-[var(--color-ink-strong)]">
          {locale.value === 'en' ? 'Locale' : '语言'}
        </h2>
        <p class="text-[var(--color-ink-muted)]">{localeToggle.label}</p>
      </section>

      <footer class="border-t border-[var(--color-rule)] py-6 text-center text-sm text-[var(--color-ink-faint)]">
        <button
          type="button"
          class="underline hover:text-[var(--color-ink-muted)]"
          onClick={() => {
            const next = locale.value === 'en' ? 'zh_CN' : 'en';
            locale.value = next;
            void import('./i18n/index')
              .then((m) => m.setLocale(next))
              .then(() => {
                // Force re-render by dispatching a custom event
                window.dispatchEvent(new CustomEvent('locale-changed'));
              });
          }}
        >
          {locale.value === 'en' ? '中文' : 'English'}
        </button>
      </footer>
    </div>
  );
}
