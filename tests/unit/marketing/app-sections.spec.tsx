import { render } from 'preact';
import { act } from 'preact/test-utils';
import { signal } from '@preact/signals';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App } from '../../../apps/marketing/src/app';
import { setLocale } from '../../../apps/marketing/src/i18n/index';

let container: HTMLDivElement;

const flush = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0)).then(
    () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
  );

async function renderApp(localeValue = 'en') {
  const locale = signal(localeValue);
  await setLocale(localeValue);
  await act(async () => {
    render(<App locale={locale} />, container);
  });
  await flush();
  return { locale };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

describe('marketing app section composition', () => {
  it('renders the eight sections in the locked narrative order', async () => {
    await renderApp();

    const sections = Array.from(container.querySelectorAll('[data-section]')).map((section) =>
      section.getAttribute('data-section'),
    );

    expect(sections).toEqual([
      'hero',
      'use-cases',
      'payload',
      'platforms',
      'flow',
      'trust',
      'limits',
      'cta',
    ]);
  });

  it('keeps a single h1, uses h2 section headings, and exposes a keyboard-reachable locale toggle', async () => {
    await renderApp();

    const h1s = container.querySelectorAll('h1');
    const h2s = Array.from(container.querySelectorAll('h2')).map((heading) =>
      heading.textContent?.trim(),
    );
    const localeToggle = container.querySelector(
      '[data-testid="locale-toggle"]',
    ) as HTMLButtonElement | null;

    expect(h1s).toHaveLength(1);
    expect(h2s).toEqual([
      'Use cases',
      'Structured-payload example',
      'Supported platforms',
      'Three-step core flow',
      'Privacy / permissions trust',
      'Known limits',
      'Get the project',
    ]);
    expect(localeToggle).toBeTruthy();
    expect(localeToggle?.type).toBe('button');
    expect(localeToggle?.textContent?.trim()).toBe('中文');
  });

  it('re-renders localized body copy after toggling locale', async () => {
    await renderApp('en');

    const localeToggle = container.querySelector(
      '[data-testid="locale-toggle"]',
    ) as HTMLButtonElement | null;
    expect(container.textContent).toContain('Structured-payload example');
    expect(container.textContent).not.toContain('结构化载荷示例');

    await act(async () => {
      localeToggle?.click();
      await flush();
    });

    expect(container.textContent).toContain('结构化载荷示例');
    expect(container.textContent).not.toContain('Structured-payload example');
    expect(localeToggle?.textContent?.trim()).toBe('English');
  });

  it('renders hero CTA and payload preview plus shared bottom CTA buttons', async () => {
    await renderApp();

    const heroSection = container.querySelector('[data-section="hero"]');
    const heroLinks = heroSection?.querySelectorAll('a[data-variant="primary"]');
    const heroPayloadPreview = heroSection?.querySelector('[data-testid="hero-payload-preview"]');
    const ctaSection = container.querySelector('[data-section="cta"]');
    const ctaButtons = ctaSection?.querySelectorAll('a[data-variant]');

    expect(heroLinks).toHaveLength(1);
    expect(heroPayloadPreview).toBeTruthy();
    expect(
      Array.from(heroPayloadPreview?.querySelectorAll('[data-payload-key]') ?? []).map((node) =>
        node.getAttribute('data-payload-key'),
      ),
    ).toEqual(['title', 'url', 'description', 'create_at', 'content', 'prompt']);
    expect(
      Array.from(ctaButtons ?? []).map((button) => button.getAttribute('data-variant')),
    ).toEqual(['primary', 'secondary']);
  });

  it('keeps shipped platforms in the platform section and moves risk copy into known limits only', async () => {
    await renderApp();

    const platformsSection = container.querySelector('[data-section="platforms"]');
    const limitsSection = container.querySelector('[data-section="limits"]');
    const platformCards = Array.from(
      platformsSection?.querySelectorAll('[data-platform-key]') ?? [],
    ).map((card) => card.getAttribute('data-platform-key'));
    const platformText = platformsSection?.textContent ?? '';
    const limitsText = limitsSection?.textContent ?? '';

    expect(platformCards).toEqual(['openclaw', 'discord', 'slack', 'telegram']);
    expect(platformText).toContain('OpenClaw');
    expect(platformText).toContain('Discord');
    expect(platformText).toContain('Slack');
    expect(platformText).toContain('Telegram');
    expect(platformText).not.toContain('Feishu/Lark');
    expect(platformText).not.toContain('Nyquist');
    expect(limitsText).toContain(
      'Telegram is shipped, but live session UAT is still pending and remains a known risk.',
    );
    expect(limitsText).toContain(
      'Feishu/Lark was evaluated and dropped from the shipped scope because shared URL targeting was not reliable enough.',
    );
    expect(limitsText).toContain(
      'Phase 11/12 Nyquist closeout is still partial and tracked only as a known risk.',
    );
  });
});
