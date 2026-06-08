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

// --- Stubs (TDD RED — implementations to follow in GREEN) ---

export function getHero(): HeroContent {
  return {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    ctaText: t('hero.cta'),
    ctaUrl: '',
    platformChips: [],
    payloadPreviewFields: [],
  };
}

export function getUseCases(): UseCaseItem[] {
  return [];
}

export function getPayloadExample(): PayloadExample {
  return { fields: [] };
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
      hasRiskLabel: false,
      riskLabel: '',
    },
  ];
}

export function getFlowSteps(): FlowStep[] {
  return [];
}

export function getTrustGroups(): TrustGroup[] {
  return [];
}

export function getKnownLimits(): KnownLimit[] {
  return [];
}

export function getProofMetadata(): ProofMetadata {
  return { label: '', source: '', status: '', version: '' };
}

export function getCtaButtons(): CtaButtons {
  return {
    primary: { text: '', url: '' },
    secondary: { text: '', url: '' },
  };
}
