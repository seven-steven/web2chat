import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { signal } from '@preact/signals';
import { App } from '../../../apps/marketing/src/app';
import { setLocale } from '../../../apps/marketing/src/i18n/index';
import { REPO_URL, INSTALL_URL } from '../../../apps/marketing/src/data/site-content';
import enLocale from '../../../apps/marketing/src/i18n/locales/en.json';
import zhLocale from '../../../apps/marketing/src/i18n/locales/zh_CN.json';

/**
 * Phase 15 Plan 03 — final 8-section page composition regression tests.
 *
 * Locked contracts:
 *   - 15-UI-SPEC section contract: 8 sections in fixed order Hero → Use cases
 *     → Payload → Platforms → Flow → Trust → Limits → CTA (D-01/D-02).
 *   - Semantic outline: exactly one h1 (hero), section headings as h2,
 *     keyboard-reachable locale toggle (T-15-09).
 *   - Hero: 1 primary CTA + inline payload preview; bottom CTA: primary +
 *     secondary sharing the CtaButton visual contract (D-12/D-13).
 *   - Platform truth: only OpenClaw/Discord/Slack/Telegram in the platforms
 *     section; Telegram risk + Feishu/Lark wording confined to risk/limits
 *     copy (T-15-07/T-15-08, CLM-PLATFORM-01, CLM-LIMIT-01/02).
 *   - Locale toggle must re-render the whole page copy (regression for the
 *     reverted stale-dictionary toggle bug).
 *
 * TDD RED: the current skeleton app.tsx renders only hero + platforms inside
 * a bare div — these assertions fail until the GREEN step lands the final
 * 8-section composition.
 */

const en = enLocale as Record<string, string>;
const zh = zhLocale as Record<string, string>;

/** h2 title keys for sections 2-8, in locked order (hero owns the h1). */
const SECTION_H2_KEYS = [
  'useCases.title',
  'payload.title',
  'supportedPlatforms.title',
  'flow.title',
  'trust.title',
  'limits.title',
  'cta.title',
] as const;

let container: HTMLDivElement;

/** Drain microtask/macrotask queue twice — Preact effects + dynamic locale import. */
const flush = () =>
  new Promise<void>((r) => setTimeout(r, 0)).then(() => new Promise<void>((r) => setTimeout(r, 0)));

beforeAll(async () => {
  await setLocale('en');
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(async () => {
  render(null, container);
  container.remove();
  // Reset module-level locale so a toggle test never leaks zh_CN forward.
  await setLocale('en');
});

async function renderApp() {
  const locale = signal('en');
  await act(async () => {
    render(<App locale={locale} />, container);
  });
  await flush();
  return locale;
}

/** Direct children of <main> — hero header + 7 sections, in DOM order. */
function pageBlocks(): Element[] {
  return Array.from(container.querySelectorAll('main > *'));
}

describe('App — 8-section locked order (D-01/D-02, T-15-08)', () => {
  it('renders hero then 7 titled sections in the order use cases, payload, platforms, flow, trust, limits, cta', async () => {
    await renderApp();
    const blocks = pageBlocks();
    expect(blocks).toHaveLength(8);

    // Section 1: hero carries the single h1 value statement.
    expect(blocks[0]?.querySelector('h1')?.textContent).toBe(en['hero.title']);

    // Sections 2-8: each h2 matches the locked title order.
    const h2Texts = blocks.slice(1).map((s) => s.querySelector('h2')?.textContent);
    expect(h2Texts).toEqual(SECTION_H2_KEYS.map((k) => en[k]));
  });

  it('renders the popup mockup in the payload section and the target mockup in the flow section (PROOF-01/PROOF-03)', async () => {
    await renderApp();
    const blocks = pageBlocks();
    expect(blocks[2]?.querySelector('[data-testid="popup-mockup"]')).toBeTruthy();
    expect(blocks[4]?.querySelector('[data-testid="target-mockup"]')).toBeTruthy();
    // Both proof modules keep their visible mockup label + metadata row.
    const assetLabels = container.querySelectorAll('[data-testid="asset-label"]');
    expect(assetLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('no longer renders the skeleton next-phase placeholder section', async () => {
    await renderApp();
    expect(container.textContent).not.toMatch(/what's next|下一步/i);
  });
});

describe('App — semantic outline and locale toggle (T-15-09)', () => {
  it('contains exactly one h1 and seven section-level h2 headings', async () => {
    await renderApp();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h2')).toHaveLength(7);
  });

  it('exposes a keyboard-reachable locale toggle button with visible text', async () => {
    await renderApp();
    const toggle = container.querySelector('[data-testid="locale-toggle"]');
    expect(toggle).toBeTruthy();
    expect(toggle?.tagName).toBe('BUTTON');
    // Native button stays in tab order as long as nothing opts it out
    // (happy-dom does not compute the spec default tabIndex of 0).
    expect(toggle?.getAttribute('tabindex')).toBeNull();
    expect(toggle?.hasAttribute('disabled')).toBe(false);
    expect(toggle?.textContent?.trim()).toBe(en['localeToggle.label']);
  });

  it('locale toggle re-renders the whole page copy (stale-dictionary regression)', async () => {
    await renderApp();
    const toggle = container.querySelector('[data-testid="locale-toggle"]') as HTMLButtonElement;
    await act(async () => {
      toggle.click();
    });
    await flush();

    // Hero headline and a deep section heading must both switch to zh_CN.
    expect(container.querySelector('h1')?.textContent).toBe(zh['hero.title']);
    const blocks = pageBlocks();
    expect(blocks[3]?.querySelector('h2')?.textContent).toBe(zh['supportedPlatforms.title']);
    expect(blocks[7]?.querySelector('h2')?.textContent).toBe(zh['cta.title']);
  });

  it('trust section separates privacy facts and permission facts into two titled groups (TRUST-01/02)', async () => {
    await renderApp();
    const trust = pageBlocks()[5];
    const groupTitles = Array.from(trust?.querySelectorAll('h3') ?? []).map((h) => h.textContent);
    expect(groupTitles).toEqual([en['trust.privacy.title'], en['trust.permissions.title']]);
  });
});

describe('App — CTA placement and shared button contract (CTA-01/CTA-02, D-12/D-13)', () => {
  it('hero contains exactly one primary CTA plus an inline payload preview', async () => {
    await renderApp();
    const hero = pageBlocks()[0];
    expect(hero).toBeTruthy();

    const accentLinks = Array.from(hero?.querySelectorAll('a') ?? []).filter((a) =>
      a.className.includes('bg-[var(--color-accent)]'),
    );
    expect(accentLinks).toHaveLength(1);
    expect(accentLinks[0]?.getAttribute('href')).toBe(REPO_URL);
    expect(accentLinks[0]?.textContent).toBe(en['hero.cta']);
    expect(accentLinks[0]?.className).toContain('min-h-[44px]');

    // Inline payload/proof preview: label + canonical field names visible.
    const heroText = hero?.textContent ?? '';
    expect(heroText).toContain(en['hero.payloadPreviewLabel']);
    expect(heroText).toContain('create_at');
  });

  it('bottom CTA section has primary + secondary buttons sharing the CtaButton contract', async () => {
    await renderApp();
    const blocks = pageBlocks();
    const heroPrimary = Array.from(blocks[0]?.querySelectorAll('a') ?? []).find((a) =>
      a.className.includes('bg-[var(--color-accent)]'),
    );
    const ctaLinks = Array.from(blocks[7]?.querySelectorAll('a') ?? []);
    expect(ctaLinks).toHaveLength(2);

    const [primary, secondary] = ctaLinks;
    expect(primary?.getAttribute('href')).toBe(REPO_URL);
    expect(primary?.textContent).toBe(en['cta.primary']);
    expect(primary?.className).toContain('bg-[var(--color-accent)]');
    // Hero primary and bottom primary must share identical visual styling.
    expect(primary?.className).toBe(heroPrimary?.className);

    expect(secondary?.getAttribute('href')).toBe(INSTALL_URL);
    expect(secondary?.textContent).toBe(en['cta.secondary']);
    expect(secondary?.className).toContain('bg-[var(--color-surface)]');
    expect(secondary?.className).toContain('border');
    expect(secondary?.className).toContain('min-h-[44px]');
  });
});

describe('App — platform truth and risk-copy placement (T-15-07, CLM-LIMIT-01/02)', () => {
  it('platforms section lists exactly OpenClaw, Discord, Slack, Telegram and excludes Feishu/Lark', async () => {
    await renderApp();
    const platforms = pageBlocks()[3];
    const text = platforms?.textContent ?? '';
    for (const name of ['OpenClaw', 'Discord', 'Slack', 'Telegram']) {
      expect(text).toContain(name);
    }
    expect(text).not.toMatch(/feishu|lark|飞书/i);
    // Telegram row carries the warn sublabel as explicit risk copy.
    expect(text).toContain(en['supportedPlatforms.telegramRisk']);
  });

  it('known limits section states Telegram UAT, Feishu/Lark dropped, and Nyquist partial', async () => {
    await renderApp();
    const limits = pageBlocks()[6];
    const text = limits?.textContent ?? '';
    expect(text).toMatch(/live UAT pending/i);
    expect(text).toMatch(/dropped/i);
    expect(text).toMatch(/nyquist/i);
  });

  it('UAT and Feishu/Lark wording never leaks outside risk/limits copy', async () => {
    await renderApp();
    const blocks = pageBlocks();
    // Hero, use cases, payload, flow, trust, CTA must stay free of risk wording.
    for (const idx of [0, 1, 2, 4, 5, 7]) {
      const text = blocks[idx]?.textContent ?? '';
      expect(text).not.toMatch(/live UAT/i);
      expect(text).not.toMatch(/feishu|lark|飞书/i);
    }
  });
});
