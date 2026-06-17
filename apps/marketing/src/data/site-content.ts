import { t } from '../i18n/index';

// --- Constants (truth anchors asserted by tests) -----------------------------

/** Canonical GitHub repository root (D-12 primary CTA target). */
export const REPO_URL = 'https://github.com/seven-steven/web2chat';

/** README installation section anchor (D-12 secondary CTA target). */
export const INSTALL_URL = `${REPO_URL}#%E5%AE%89%E8%A3%85`;

/** Canonical structured payload field order per CLM-PAYLOAD-01 / MSG-03. */
export const PAYLOAD_FIELD_ORDER = [
  'title',
  'url',
  'description',
  'create_at',
  'content',
  'prompt',
] as const;

/**
 * Deterministic hardcoded payload example values (D-11).
 * Simulates clipping the MDN structuredClone() page — stable, public, neutral.
 */
export const PAYLOAD_EXAMPLE_URL =
  'https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone';
export const PAYLOAD_EXAMPLE_CREATE_AT = '2026-06-02T10:30:00+08:00';

// --- Types -------------------------------------------------------------------

export interface HeroContent {
  title: string;
  subtitle: string;
  cta: string;
  ctaUrl: string;
  platformChips: string[];
  payloadPreview: {
    label: string;
    fields: readonly string[];
  };
}

export interface UseCaseEntry {
  key: string;
  title: string;
  description: string;
}

export interface PayloadField {
  key: string;
  label: string;
  value: string;
}

export interface PayloadExample {
  title: string;
  description: string;
  fields: PayloadField[];
}

export interface PlatformEntry {
  key: string;
  label: string;
  riskLabel?: string;
}

export interface FlowStep {
  step: number;
  title: string;
  description: string;
}

export interface TrustGroup {
  title: string;
  facts: string[];
}

export interface TrustContent {
  title: string;
  privacy: TrustGroup;
  permissions: TrustGroup;
}

export interface KnownLimitItem {
  key: string;
  text: string;
}

export interface KnownLimits {
  title: string;
  items: KnownLimitItem[];
}

export interface ProofMeta {
  label: string;
  source: string;
  status: string;
  version: string;
}

export interface CtaButton {
  label: string;
  url: string;
}

export interface CtaContent {
  title: string;
  subtitle: string;
  primary: CtaButton;
  secondary: CtaButton;
}

export interface LocaleToggle {
  label: string;
}

/**
 * Footer content — a single restrained tagline line that closes the page.
 * Replaces the former footer-only locale toggle (15-06): locale switching
 * now lives above the fold in the hero utility row, so the footer carries
 * only a calm project tagline.
 */
export interface FooterContent {
  tagline: string;
}

/** Target-chat mockup copy (D-06 / D-07) — locale-following demo strings. */
export interface TargetMockupContent {
  chatLabel: string;
  messageLines: string[];
  statusLabel: string;
}

// --- Getters -------------------------------------------------------------------

export function getHero(): HeroContent {
  return {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    cta: t('hero.cta'),
    ctaUrl: REPO_URL,
    // Low-weight shipped platform chips (D-03); brand names are not localized.
    platformChips: ['OpenClaw', 'Discord', 'Slack', 'Telegram'],
    payloadPreview: {
      label: t('hero.payloadPreviewLabel'),
      fields: PAYLOAD_FIELD_ORDER,
    },
  };
}

export function getUseCases(): UseCaseEntry[] {
  return [
    {
      key: 'personal',
      title: t('useCases.personal.title'),
      description: t('useCases.personal.description'),
    },
    {
      key: 'team',
      title: t('useCases.team.title'),
      description: t('useCases.team.description'),
    },
    {
      key: 'agent',
      title: t('useCases.agent.title'),
      description: t('useCases.agent.description'),
    },
  ];
}

export function getPayloadExample(): PayloadExample {
  return {
    title: t('payload.title'),
    description: t('payload.description'),
    fields: [
      { key: 'title', label: t('payload.field.title'), value: t('payload.value.title') },
      { key: 'url', label: t('payload.field.url'), value: PAYLOAD_EXAMPLE_URL },
      {
        key: 'description',
        label: t('payload.field.description'),
        value: t('payload.value.description'),
      },
      {
        key: 'create_at',
        label: t('payload.field.createAt'),
        value: PAYLOAD_EXAMPLE_CREATE_AT,
      },
      { key: 'content', label: t('payload.field.content'), value: t('payload.value.content') },
      { key: 'prompt', label: t('payload.field.prompt'), value: t('payload.value.prompt') },
    ],
  };
}

export function getSupportedPlatforms(): PlatformEntry[] {
  return [
    { key: 'openclaw', label: t('supportedPlatforms.openclaw') },
    { key: 'discord', label: t('supportedPlatforms.discord') },
    { key: 'slack', label: t('supportedPlatforms.slack') },
    {
      key: 'telegram',
      label: t('supportedPlatforms.telegram'),
      // CLM-LIMIT-01: Telegram ships with live UAT pending / known risk.
      riskLabel: t('supportedPlatforms.telegramRisk'),
    },
  ];
}

export function getFlowSteps(): FlowStep[] {
  return [
    { step: 1, title: t('flow.step1.title'), description: t('flow.step1.description') },
    { step: 2, title: t('flow.step2.title'), description: t('flow.step2.description') },
    { step: 3, title: t('flow.step3.title'), description: t('flow.step3.description') },
  ];
}

export function getTrust(): TrustContent {
  return {
    title: t('trust.title'),
    // CLM-PRIVACY-01: facts sourced from PRIVACY.md only.
    privacy: {
      title: t('trust.privacy.title'),
      facts: [
        t('trust.privacy.fact1'),
        t('trust.privacy.fact2'),
        t('trust.privacy.fact3'),
        t('trust.privacy.fact4'),
        t('trust.privacy.fact5'),
        t('trust.privacy.fact6'),
      ],
    },
    // CLM-PERM-01: facts mirror the production wxt.config.ts manifest only —
    // no `tabs`, no static `<all_urls>` host permission claims.
    permissions: {
      title: t('trust.permissions.title'),
      facts: [
        t('trust.permissions.fact1'),
        t('trust.permissions.fact2'),
        t('trust.permissions.fact3'),
      ],
    },
  };
}

export function getKnownLimits(): KnownLimits {
  return {
    title: t('limits.title'),
    items: [
      { key: 'telegram', text: t('limits.telegram') },
      { key: 'feishu', text: t('limits.feishu') },
      { key: 'nyquist', text: t('limits.nyquist') },
    ],
  };
}

/**
 * Mockup labeling contract (D-05 / 15-UI-SPEC):
 * - owner/update trigger: maintained alongside site-content.ts; update whenever
 *   the popup or dispatch UI contract changes (Phase 15 marketing data layer).
 * - capture/creation date: 2026-06-10 (Phase 15 Plan 01 implementation).
 */
export function getProofMeta(): ProofMeta {
  return {
    label: t('proof.label'),
    source: t('proof.source'),
    status: t('proof.status'),
    version: t('proof.version'),
  };
}

export function getCta(): CtaContent {
  return {
    title: t('cta.title'),
    subtitle: t('cta.subtitle'),
    primary: { label: t('cta.primary'), url: REPO_URL },
    secondary: { label: t('cta.secondary'), url: INSTALL_URL },
  };
}

export function getLocaleToggle(): LocaleToggle {
  return { label: t('localeToggle.label') };
}

/** Footer tagline (15-06) — calm project close line, locale-following. */
export function getFooterTagline(): FooterContent {
  return { tagline: t('footer.tagline') };
}

/**
 * Target-chat mockup content (D-06 / D-07): message lines reuse the canonical
 * payload example so the popup mockup and the delivered-message mockup tell
 * one consistent story. All strings flow through t() and follow the locale.
 */
export function getTargetMockup(): TargetMockupContent {
  return {
    chatLabel: t('targetMockup.chatLabel'),
    messageLines: [t('payload.value.title'), PAYLOAD_EXAMPLE_URL, t('payload.value.prompt')],
    statusLabel: t('targetMockup.statusLabel'),
  };
}
