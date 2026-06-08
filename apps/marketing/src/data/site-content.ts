import { t } from '../i18n/index';

// --- Interfaces ---

export interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  platformChips: string[];
  payloadPreviewFields: string[];
}

export interface PlatformEntry {
  key: string;
  label: string;
  hasRiskLabel: boolean;
  riskLabel: string;
}

export interface UseCaseItem {
  title: string;
  description: string;
}

export interface PayloadField {
  name: string;
  value: string;
}

export interface PayloadExample {
  fields: PayloadField[];
}

export interface FlowStep {
  title: string;
  description: string;
}

export interface TrustGroup {
  key: string;
  title: string;
  facts: string[];
}

export interface KnownLimit {
  text: string;
}

export interface ProofMetadata {
  label: string;
  source: string;
  status: string;
  version: string;
}

export interface CtaButton {
  text: string;
  url: string;
}

export interface CtaButtons {
  primary: CtaButton;
  secondary: CtaButton;
}

// --- Constants ---

const REPO_URL = 'https://github.com/nichochar/web2chat';
const README_INSTALL_URL =
  'https://github.com/nichochar/web2chat/blob/main/README.md#%E5%AE%89%E8%A3%85';
const PAYLOAD_FIELD_NAMES = [
  'title',
  'url',
  'description',
  'create_at',
  'content',
  'prompt',
] as const;

// --- Getters ---

export function getHero(): HeroContent {
  return {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    ctaText: t('hero.ctaText'),
    ctaUrl: REPO_URL,
    platformChips: getSupportedPlatforms().map((p) => p.label.split(' — ')[0]!),
    payloadPreviewFields: [...PAYLOAD_FIELD_NAMES],
  };
}

export function getUseCases(): UseCaseItem[] {
  return [
    { title: t('useCases.knowledge.title'), description: t('useCases.knowledge.description') },
    { title: t('useCases.team.title'), description: t('useCases.team.description') },
    { title: t('useCases.agent.title'), description: t('useCases.agent.description') },
  ];
}

export function getPayloadExample(): PayloadExample {
  return {
    fields: PAYLOAD_FIELD_NAMES.map((name) => ({
      name,
      value: t(`payloadExample.${name}`),
    })),
  };
}

export function getSupportedPlatforms(): PlatformEntry[] {
  return [
    {
      key: 'openclaw',
      label: t('supportedPlatforms.openclaw'),
      hasRiskLabel: false,
      riskLabel: '',
    },
    { key: 'discord', label: t('supportedPlatforms.discord'), hasRiskLabel: false, riskLabel: '' },
    { key: 'slack', label: t('supportedPlatforms.slack'), hasRiskLabel: false, riskLabel: '' },
    {
      key: 'telegram',
      label: t('supportedPlatforms.telegram'),
      hasRiskLabel: true,
      riskLabel: t('supportedPlatforms.telegramRisk'),
    },
  ];
}

export function getFlowSteps(): FlowStep[] {
  return [
    { title: t('flowSteps.capture.title'), description: t('flowSteps.capture.description') },
    { title: t('flowSteps.choose.title'), description: t('flowSteps.choose.description') },
    { title: t('flowSteps.send.title'), description: t('flowSteps.send.description') },
  ];
}

export function getTrustGroups(): TrustGroup[] {
  return [
    {
      key: 'privacy',
      title: t('trust.privacy.title'),
      facts: [
        t('trust.privacy.fact1'),
        t('trust.privacy.fact2'),
        t('trust.privacy.fact3'),
        t('trust.privacy.fact4'),
        t('trust.privacy.fact5'),
      ],
    },
    {
      key: 'permissions',
      title: t('trust.permissions.title'),
      facts: [
        t('trust.permissions.fact1'),
        t('trust.permissions.fact2'),
        t('trust.permissions.fact3'),
      ],
    },
  ];
}

export function getKnownLimits(): KnownLimit[] {
  return [
    { text: t('knownLimits.telegram') },
    { text: t('knownLimits.feishu') },
    { text: t('knownLimits.nyquist') },
  ];
}

export function getProofMetadata(): ProofMetadata {
  return {
    label: 'mockup',
    source: t('proof.source'),
    status: t('proof.status'),
    version: t('proof.version'),
  };
}

export function getCtaButtons(): CtaButtons {
  return {
    primary: { text: t('cta.primary'), url: REPO_URL },
    secondary: { text: t('cta.secondary'), url: README_INSTALL_URL },
  };
}
