import { describe, it, expect, beforeAll } from 'vitest';
import { setLocale } from '../../../apps/marketing/src/i18n/index';
import {
  getHero,
  getUseCases,
  getPayloadExample,
  getSupportedPlatforms,
  getFlowSteps,
  getTrust,
  getKnownLimits,
  getProofMeta,
  getCta,
  getLocaleToggle,
  REPO_URL,
  INSTALL_URL,
  PAYLOAD_FIELD_ORDER,
  PAYLOAD_EXAMPLE_URL,
  PAYLOAD_EXAMPLE_CREATE_AT,
} from '../../../apps/marketing/src/data/site-content';
import enLocale from '../../../apps/marketing/src/i18n/locales/en.json';
import zhLocale from '../../../apps/marketing/src/i18n/locales/zh_CN.json';

/**
 * Phase 15 Plan 01 — marketing content truth regression tests.
 *
 * Truth sources:
 *   - 13-CONTENT-SOURCES.md claims matrix (CLM-HERO-01 .. CLM-LIMIT-02)
 *   - 15-CONTEXT.md decisions D-01/D-03/D-05/D-06/D-07/D-10/D-11/D-12/D-13
 *   - PRIVACY.md (privacy facts), wxt.config.ts production manifest (permission facts)
 *
 * TDD RED: site-content.ts only exposes type stubs — these assertions fail
 * until the GREEN step implements the full content API + locale keys.
 */

const en = enLocale as Record<string, string>;
const zh = zhLocale as Record<string, string>;

beforeAll(async () => {
  await setLocale('en');
});

describe('getHero — D-01/D-03/D-12/D-13 hero contract', () => {
  it('returns value statement, supporting sentence, CTA URL, chips, payload preview', () => {
    const hero = getHero();
    expect(hero.title).toBeTruthy();
    expect(hero.title).not.toBe('hero.title');
    expect(hero.subtitle).toBeTruthy();
    expect(hero.subtitle).not.toBe('hero.subtitle');
    expect(hero.cta).toBeTruthy();
    expect(hero.ctaUrl).toBe(REPO_URL);
    // Low-weight platform chips: exactly the 4 shipped platforms (D-03)
    expect(hero.platformChips).toHaveLength(4);
    expect(hero.platformChips).toEqual(
      expect.arrayContaining(['OpenClaw', 'Discord', 'Slack', 'Telegram']),
    );
    // Compact payload preview metadata mirrors the canonical field order (D-10)
    expect(hero.payloadPreview.label).toBeTruthy();
    expect([...hero.payloadPreview.fields]).toEqual([...PAYLOAD_FIELD_ORDER]);
  });
});

describe('getPayloadExample — D-10/D-11 + MSG-03 field order', () => {
  it('exposes fields in exact order title, url, description, create_at, content, prompt', () => {
    const payload = getPayloadExample();
    expect(payload.fields.map((f) => f.key)).toEqual([
      'title',
      'url',
      'description',
      'create_at',
      'content',
      'prompt',
    ]);
  });

  it('uses deterministic hardcoded example values for url and create_at (D-11)', () => {
    const payload = getPayloadExample();
    const urlField = payload.fields.find((f) => f.key === 'url');
    const createAtField = payload.fields.find((f) => f.key === 'create_at');
    expect(urlField?.value).toBe(PAYLOAD_EXAMPLE_URL);
    expect(createAtField?.value).toBe(PAYLOAD_EXAMPLE_CREATE_AT);
    for (const field of payload.fields) {
      expect(field.label).toBeTruthy();
      expect(field.value).toBeTruthy();
    }
    expect(payload.title).toBeTruthy();
    expect(payload.description).toBeTruthy();
  });
});

describe('getSupportedPlatforms — D-03 + CLM-PLATFORM-01 platform truth', () => {
  it('returns only OpenClaw, Discord, Slack, Telegram in order', () => {
    const platforms = getSupportedPlatforms();
    expect(platforms.map((p) => p.key)).toEqual(['openclaw', 'discord', 'slack', 'telegram']);
  });

  it('marks Telegram with live UAT pending / known risk and no one else', () => {
    const platforms = getSupportedPlatforms();
    const telegram = platforms.find((p) => p.key === 'telegram');
    expect(telegram?.riskLabel).toBeTruthy();
    expect(telegram?.riskLabel).toMatch(/live UAT pending/i);
    expect(telegram?.riskLabel).toMatch(/known risk/i);
    for (const p of platforms.filter((p) => p.key !== 'telegram')) {
      expect(p.riskLabel).toBeUndefined();
    }
  });

  it('never claims Feishu/Lark as a supported platform (CLM-LIMIT-02)', () => {
    const platforms = getSupportedPlatforms();
    for (const p of platforms) {
      expect(p.label).not.toMatch(/feishu|lark|飞书/i);
    }
  });
});

describe('getTrust — TRUST-01/TRUST-02 privacy and permission facts', () => {
  it('separates privacy facts from permission facts', () => {
    const trust = getTrust();
    expect(trust.privacy.title).toBeTruthy();
    expect(trust.permissions.title).toBeTruthy();
    expect(trust.privacy.facts).toHaveLength(6);
    expect(trust.permissions.facts.length).toBeGreaterThanOrEqual(3);
  });

  it('privacy facts cover the PRIVACY.md mechanisms (CLM-PRIVACY-01)', () => {
    const joined = getTrust().privacy.facts.join(' ');
    expect(joined).toMatch(/click/i); // user-triggered capture
    expect(joined).toMatch(/local/i); // local storage
    expect(joined).toMatch(/direct browser/i); // direct browser delivery
    expect(joined).toMatch(/remote server/i); // no remote server
    expect(joined).toMatch(/telemetry/i); // no telemetry
    expect(joined).toMatch(/third-party analytics/i); // no third-party analytics
  });

  it('permission facts match the production manifest and never claim tabs or <all_urls> (CLM-PERM-01)', () => {
    const joined = getTrust().permissions.facts.join(' ');
    for (const perm of ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation']) {
      expect(joined).toContain(perm);
    }
    expect(joined).toContain('discord.com');
    expect(joined).toContain('app.slack.com');
    expect(joined).toContain('web.telegram.org');
    // Forbidden production claims per TRUST-02
    expect(joined).not.toMatch(/(^|[^a-zA-Z])tabs([^a-zA-Z]|$)/);
    expect(joined).not.toContain('<all_urls>');
  });
});

describe('getKnownLimits — CLM-LIMIT-01/CLM-LIMIT-02', () => {
  it('lists Telegram UAT, Feishu/Lark dropped, and Nyquist partial as known risks', () => {
    const limits = getKnownLimits();
    expect(limits.items.map((i) => i.key)).toEqual(['telegram', 'feishu', 'nyquist']);
    const byKey = Object.fromEntries(limits.items.map((i) => [i.key, i.text]));
    expect(byKey['telegram']).toMatch(/live UAT pending/i);
    expect(byKey['feishu']).toMatch(/dropped/i);
    expect(byKey['nyquist']).toMatch(/known risk/i);
  });
});

describe('getProofMeta — D-05 mockup labeling contract', () => {
  it('exposes mockup label, source, status, version', () => {
    const proof = getProofMeta();
    expect(proof.label).toBe('mockup');
    expect(proof.source).toContain('code-generated');
    expect(proof.status).toBeTruthy();
    expect(proof.version).toBeTruthy();
  });
});

describe('getCta — D-12/D-13 CTA targets', () => {
  it('exposes repository-root primary and README install secondary targets', () => {
    const cta = getCta();
    expect(cta.primary.url).toBe(REPO_URL);
    expect(cta.secondary.url).toBe(INSTALL_URL);
    expect(INSTALL_URL.startsWith(REPO_URL)).toBe(true);
    expect(INSTALL_URL).toContain('#');
    expect(cta.primary.label).toBeTruthy();
    expect(cta.secondary.label).toBeTruthy();
    expect(cta.title).toBeTruthy();
    expect(cta.subtitle).toBeTruthy();
  });
});

describe('getUseCases / getFlowSteps / getLocaleToggle — section completeness', () => {
  it('returns exactly 3 use cases: personal, team, agent (CLM-USE-01)', () => {
    const useCases = getUseCases();
    expect(useCases.map((u) => u.key)).toEqual(['personal', 'team', 'agent']);
    for (const u of useCases) {
      expect(u.title).toBeTruthy();
      expect(u.description).toBeTruthy();
    }
  });

  it('returns exactly 3 flow steps in fixed order (PROOF-02)', () => {
    const steps = getFlowSteps();
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3]);
    for (const s of steps) {
      expect(s.title).toBeTruthy();
      expect(s.description).toBeTruthy();
    }
  });

  it('exposes a locale toggle label', () => {
    expect(getLocaleToggle().label).toBeTruthy();
  });
});

describe('locale files — bilingual parity and forbidden claims', () => {
  it('en and zh_CN contain identical key sets with no nextPhase.* keys', () => {
    const enKeys = Object.keys(en).sort();
    const zhKeys = Object.keys(zh).sort();
    expect(enKeys).toEqual(zhKeys);
    expect(enKeys.filter((k) => k.startsWith('nextPhase.'))).toEqual([]);
  });

  it('neither locale contains forbidden permission or platform claims', () => {
    const allValues = [...Object.values(en), ...Object.values(zh)].join(' ');
    expect(allValues).not.toContain('<all_urls>');
    expect(allValues).not.toMatch(/fully verified/i);
    expect(allValues).not.toMatch(/支持所有聊天平台|完全验证|云端存储|cloud sync/i);
  });

  it('zh_CN locale drives getters after setLocale', async () => {
    await setLocale('zh_CN');
    expect(getHero().title).toBe(zh['hero.title']);
    expect(getHero().ctaUrl).toBe(REPO_URL);
    await setLocale('en');
  });
});
