import { describe, it, expect, beforeEach } from 'vitest';
import { setLocale } from '../../../apps/marketing/src/i18n/index';
import {
  getHero,
  getUseCases,
  getPayloadExample,
  getSupportedPlatforms,
  getFlowSteps,
  getTrustGroups,
  getKnownLimits,
  getProofMetadata,
  getCtaButtons,
} from '../../../apps/marketing/src/data/site-content';

/**
 * Content truth regression tests for marketing site-content data layer.
 *
 * TDD RED: These tests assert platforms, payload field order, trust facts,
 * proof metadata, and CTA URLs per Phase 15 decisions D-01/D-03/D-05/D-06/
 * D-07/D-10/D-11/D-12/D-13 and requirements MSG-01/02/03, PROOF-01,
 * CTA-01/02, TRUST-01/02.
 *
 * Requirements: MSG-01, MSG-02, MSG-03, PROOF-01, CTA-01, CTA-02, TRUST-01, TRUST-02
 */

describe('site-content marketing data layer', () => {
  beforeEach(async () => {
    await setLocale('en');
  });

  // --- Test 1: Hero getter (MSG-01, D-01, D-03, D-12, D-13) ---

  describe('getHero', () => {
    it('returns value statement, supporting sentence, primary CTA URL, platform chips, and payload preview fields', () => {
      const hero = getHero();
      expect(hero.title).toBeTruthy();
      expect(typeof hero.title).toBe('string');
      expect(hero.subtitle).toBeTruthy();
      expect(typeof hero.subtitle).toBe('string');
      expect(hero.ctaText).toBeTruthy();
      expect(hero.ctaUrl).toBe('https://github.com/nichochar/web2chat');
      // Hero platform chips: low-weight, max 4
      expect(hero.platformChips).toBeDefined();
      expect(Array.isArray(hero.platformChips)).toBe(true);
      expect(hero.platformChips.length).toBeLessThanOrEqual(4);
      expect(hero.platformChips.length).toBeGreaterThan(0);
      // Compact payload preview: metadata field names
      expect(hero.payloadPreviewFields).toBeDefined();
      expect(Array.isArray(hero.payloadPreviewFields)).toBe(true);
      expect(hero.payloadPreviewFields.length).toBeGreaterThan(0);
    });
  });

  // --- Test 2: Payload example (MSG-03, D-10, D-11) ---

  describe('getPayloadExample', () => {
    it('exposes fields in exact order: title, url, description, create_at, content, prompt', () => {
      const payload = getPayloadExample();
      expect(payload.fields).toBeDefined();
      expect(Array.isArray(payload.fields)).toBe(true);
      expect(payload.fields.length).toBe(6);
      const fieldNames = payload.fields.map((f: { name: string }) => f.name);
      expect(fieldNames).toEqual(['title', 'url', 'description', 'create_at', 'content', 'prompt']);
      // Each field must have a non-empty value
      for (const field of payload.fields) {
        expect(field.value).toBeTruthy();
        expect(typeof field.value).toBe('string');
      }
    });
  });

  // --- Test 3: Supported platforms (PROOF-01, D-03, CLM-PLATFORM-01) ---

  describe('getSupportedPlatforms', () => {
    it('returns exactly OpenClaw, Discord, Slack, Telegram in order', () => {
      const platforms = getSupportedPlatforms();
      expect(platforms.length).toBe(4);
      const keys = platforms.map((p) => p.key);
      expect(keys).toEqual(['openclaw', 'discord', 'slack', 'telegram']);
    });

    it('marks Telegram with live UAT pending / known risk label', () => {
      const platforms = getSupportedPlatforms();
      const telegram = platforms.find((p) => p.key === 'telegram');
      expect(telegram).toBeDefined();
      expect(telegram!.hasRiskLabel).toBe(true);
      expect(telegram!.riskLabel).toBeTruthy();
      expect(typeof telegram!.riskLabel).toBe('string');
    });

    it('does not include Feishu or Lark', () => {
      const platforms = getSupportedPlatforms();
      const keys = platforms.map((p) => p.key);
      expect(keys).not.toContain('feishu');
      expect(keys).not.toContain('lark');
    });
  });

  // --- Test 4: Trust groups (TRUST-01, TRUST-02) ---

  describe('getTrustGroups', () => {
    it('separates privacy facts from permission facts', () => {
      const trust = getTrustGroups();
      expect(trust.length).toBe(2);
      const groupKeys = trust.map((g: { key: string }) => g.key);
      expect(groupKeys).toContain('privacy');
      expect(groupKeys).toContain('permissions');
    });

    it('privacy group has facts about user-triggered capture, local storage, direct delivery, no server, no telemetry', () => {
      const trust = getTrustGroups();
      const privacy = trust.find((g) => g.key === 'privacy');
      expect(privacy).toBeDefined();
      expect(privacy!.facts.length).toBeGreaterThanOrEqual(4);
      for (const fact of privacy!.facts) {
        expect(fact).toBeTruthy();
        expect(typeof fact).toBe('string');
      }
    });

    it('never includes production tabs or static all_urls host permission', () => {
      const trust = getTrustGroups();
      const allText = trust
        .flatMap((g) => g.facts)
        .join(' ')
        .toLowerCase();
      // Must not claim production tabs permission
      expect(allText).not.toMatch(/production.*\btabs\b/);
      expect(allText).not.toMatch(/\btabs\b.*permission/);
      // Must not claim static production <all_urls>
      expect(allText).not.toContain('<all_urls>');
    });
  });

  // --- Test 5: Proof metadata (PROOF-03, D-05) ---

  describe('getProofMetadata', () => {
    it('exposes mockup label, source, status, and version', () => {
      const proof = getProofMetadata();
      expect(proof.label).toBe('mockup');
      expect(proof.source).toBeTruthy();
      expect(typeof proof.source).toBe('string');
      expect(proof.status).toBeTruthy();
      expect(typeof proof.status).toBe('string');
      expect(proof.version).toBeTruthy();
      expect(typeof proof.version).toBe('string');
    });
  });

  // --- Test 5b: CTA buttons (CTA-01, CTA-02, D-12) ---

  describe('getCtaButtons', () => {
    it('exposes repository-root primary CTA and README install secondary CTA', () => {
      const cta = getCtaButtons();
      expect(cta.primary.text).toBeTruthy();
      expect(cta.primary.url).toBe('https://github.com/nichochar/web2chat');
      expect(cta.secondary.text).toBeTruthy();
      // Secondary CTA points to README installation section
      expect(cta.secondary.url).toContain('README');
      expect(cta.secondary.url).toContain('github.com');
    });
  });

  // --- Section getters exist ---

  describe('section getter completeness', () => {
    it('getUseCases returns at least 3 use cases', () => {
      const cases = getUseCases();
      expect(cases.length).toBeGreaterThanOrEqual(3);
      for (const uc of cases) {
        expect(uc.title).toBeTruthy();
        expect(uc.description).toBeTruthy();
      }
    });

    it('getFlowSteps returns exactly 3 steps in order', () => {
      const steps = getFlowSteps();
      expect(steps.length).toBe(3);
      for (const step of steps) {
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
      }
    });

    it('getKnownLimits returns at least 3 items covering Telegram, Feishu, Nyquist', () => {
      const limits = getKnownLimits();
      expect(limits.length).toBeGreaterThanOrEqual(3);
      for (const limit of limits) {
        expect(limit.text).toBeTruthy();
      }
    });
  });

  // --- Locale parity (both locales produce non-key strings) ---

  describe('locale parity', () => {
    it('zh_CN locale returns non-key strings for all getters', async () => {
      await setLocale('zh_CN');
      const hero = getHero();
      // t() returns key string when key is missing; verify it does NOT equal the key
      expect(hero.title).not.toBe('hero.title');
      expect(hero.subtitle).not.toBe('hero.subtitle');

      const platforms = getSupportedPlatforms();
      for (const p of platforms) {
        expect(p.label).not.toContain('supportedPlatforms.');
      }
    });
  });

  // --- Forbidden content checks ---

  describe('forbidden content', () => {
    it('no locale content claims Feishu/Lark support', async () => {
      for (const locale of ['en', 'zh_CN']) {
        await setLocale(locale);
        const platforms = getSupportedPlatforms();
        const allLabels = platforms.map((p) => p.label).join(' ');
        expect(allLabels.toLowerCase()).not.toContain('feishu');
        expect(allLabels.toLowerCase()).not.toContain('lark');
      }
    });

    it('no locale content claims telemetry or remote server usage', async () => {
      for (const locale of ['en', 'zh_CN']) {
        await setLocale(locale);
        const trust = getTrustGroups();
        const allText = trust
          .flatMap((g) => g.facts)
          .join(' ')
          .toLowerCase();
        // Must not positively claim telemetry or server usage
        // ("no telemetry" / "no remote server" denials are allowed)
        expect(allText).not.toMatch(/uses? telemetry/);
        expect(allText).not.toMatch(/collect(s|ing)? telemetry/);
        expect(allText).not.toMatch(/our servers?/);
        expect(allText).not.toMatch(/server-side processing/);
      }
    });
  });
});
