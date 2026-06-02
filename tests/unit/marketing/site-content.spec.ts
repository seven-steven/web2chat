import { beforeEach, describe, expect, it } from 'vitest';

import en from '../../../apps/marketing/src/i18n/locales/en.json';
import zhCn from '../../../apps/marketing/src/i18n/locales/zh_CN.json';
import { setLocale } from '../../../apps/marketing/src/i18n/index';
import {
  getCtaButtons,
  getHero,
  getKnownLimits,
  getLocaleToggle,
  getPayloadExample,
  getProofMetadata,
  getSupportedPlatforms,
  getThreeStepFlow,
  getTrustGroups,
  getUseCases,
} from '../../../apps/marketing/src/data/site-content';

describe('marketing site content', () => {
  beforeEach(async () => {
    await setLocale('en');
  });

  it('returns hero content with CTA link, platform chips, and payload preview metadata', () => {
    const hero = getHero();

    expect(hero.title).toBeTruthy();
    expect(hero.subtitle).toContain('structured');
    expect(hero.primaryCta.href).toBe('https://github.com/nicholaschenai/web2chat');
    expect(hero.primaryCta.label).toBeTruthy();
    expect(hero.platformChips).toEqual(['OpenClaw', 'Discord', 'Slack', 'Telegram']);
    expect(hero.payloadPreviewLabel).toBe('Structured payload preview');
    expect(hero.payloadPreviewMeta).toEqual([
      'title',
      'url',
      'description',
      'create_at',
      'content',
      'prompt',
    ]);
  });

  it('returns payload example fields in the exact public order', () => {
    const payload = getPayloadExample();

    expect(payload.fields.map((field) => field.key)).toEqual([
      'title',
      'url',
      'description',
      'create_at',
      'content',
      'prompt',
    ]);
  });

  it('returns only shipped platforms and marks telegram as live UAT pending known risk', () => {
    const platforms = getSupportedPlatforms();

    expect(platforms.map((platform) => platform.key)).toEqual([
      'openclaw',
      'discord',
      'slack',
      'telegram',
    ]);
    expect(platforms.find((platform) => platform.key === 'telegram')).toMatchObject({
      riskLabel: 'live UAT pending / known risk',
    });
  });

  it('separates privacy facts from permission facts without production tabs or static all_urls host claims', () => {
    const trustGroups = getTrustGroups();

    expect(trustGroups.map((group) => group.key)).toEqual(['privacy', 'permissions']);
    expect(trustGroups[0]?.facts.length).toBeGreaterThan(0);
    expect(trustGroups[1]?.facts.length).toBeGreaterThan(0);

    const allFacts = trustGroups.flatMap((group) => group.facts).join('\n');
    expect(allFacts).not.toContain(' activeTab, alarms, scripting, storage, tabs, webNavigation');
    expect(allFacts).not.toContain('static <all_urls> host permission');
    expect(allFacts).toContain('optional origin grant');
  });

  it('returns proof metadata and both repository and install CTA targets', () => {
    const proof = getProofMetadata();
    const ctas = getCtaButtons();

    expect(proof.label).toBe('mockup');
    expect(proof.source).toBe('code-generated');
    expect(proof.status).toBe('marketing demo aligned to current UI contract');
    expect(proof.version).toBe('current repo state');

    expect(ctas.primary.href).toBe('https://github.com/nicholaschenai/web2chat');
    expect(ctas.secondary.href).toBe('https://github.com/nicholaschenai/web2chat#安装');
  });

  it('keeps locale keys aligned and removes the placeholder nextPhase copy', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhCn).sort());
    expect(Object.keys(en).some((key) => key.startsWith('nextPhase.'))).toBe(false);
    expect(Object.keys(zhCn).some((key) => key.startsWith('nextPhase.'))).toBe(false);
  });

  it('returns the remaining public marketing sections from the data layer', () => {
    expect(getUseCases()).toHaveLength(3);
    expect(getThreeStepFlow()).toHaveLength(3);
    expect(getKnownLimits()).toHaveLength(3);
    expect(getLocaleToggle().label).toBeTruthy();
  });
});
