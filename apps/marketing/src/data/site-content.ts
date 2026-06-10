import { t } from '../i18n/index';

// --- Constants (truth anchors asserted by tests) -----------------------------

/** Canonical GitHub repository root (D-12 primary CTA target). */
export const REPO_URL = '';

/** README installation section anchor (D-12 secondary CTA target). */
export const INSTALL_URL = '';

/** Canonical structured payload field order per CLM-PAYLOAD-01 / MSG-03. */
export const PAYLOAD_FIELD_ORDER = [
  'title',
  'url',
  'description',
  'create_at',
  'content',
  'prompt',
] as const;

/** Deterministic hardcoded payload example values (D-11). */
export const PAYLOAD_EXAMPLE_URL = '';
export const PAYLOAD_EXAMPLE_CREATE_AT = '';

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

export interface NextPhaseContent {
  title: string;
  description: string;
}

// --- Getters (RED stubs — implemented in the GREEN step) ----------------------

export function getHero(): HeroContent {
  return {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    cta: t('hero.cta'),
    ctaUrl: '',
    platformChips: [],
    payloadPreview: { label: '', fields: [] },
  };
}

export function getUseCases(): UseCaseEntry[] {
  return [];
}

export function getPayloadExample(): PayloadExample {
  return { title: '', description: '', fields: [] };
}

export function getSupportedPlatforms(): PlatformEntry[] {
  return [
    { key: 'openclaw', label: t('supportedPlatforms.openclaw') },
    { key: 'discord', label: t('supportedPlatforms.discord') },
    { key: 'slack', label: t('supportedPlatforms.slack') },
    { key: 'telegram', label: t('supportedPlatforms.telegram') },
  ];
}

export function getFlowSteps(): FlowStep[] {
  return [];
}

export function getTrust(): TrustContent {
  return {
    privacy: { title: '', facts: [] },
    permissions: { title: '', facts: [] },
  };
}

export function getKnownLimits(): KnownLimits {
  return { title: '', items: [] };
}

export function getProofMeta(): ProofMeta {
  return { label: '', source: '', status: '', version: '' };
}

export function getCta(): CtaContent {
  return {
    title: '',
    subtitle: '',
    primary: { label: '', url: '' },
    secondary: { label: '', url: '' },
  };
}

export function getLocaleToggle(): LocaleToggle {
  return { label: '' };
}

export function getNextPhase(): NextPhaseContent {
  return {
    title: t('nextPhase.title'),
    description: t('nextPhase.description'),
  };
}
