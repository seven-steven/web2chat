import { t } from '../i18n/index';

const REPOSITORY_URL = 'https://github.com/nicholaschenai/web2chat';
const README_INSTALL_URL = 'https://github.com/nicholaschenai/web2chat#安装';

export interface HeroCta {
  label: string;
  href: string;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  primaryCta: HeroCta;
  platformChips: string[];
  platformAriaLabel: string;
  payloadPreviewLabel: string;
  payloadPreviewMeta: string[];
}

export interface UseCaseEntry {
  key: string;
  title: string;
  description: string;
  evidence: string;
}

export interface PayloadField {
  key: string;
  label: string;
  value: string;
}

export interface PayloadExampleContent {
  title: string;
  description: string;
  fields: PayloadField[];
}

export interface PlatformEntry {
  key: string;
  label: string;
  detail: string;
  riskLabel?: string;
}

export interface FlowStep {
  key: string;
  title: string;
  description: string;
}

export interface TrustGroup {
  key: 'privacy' | 'permissions';
  title: string;
  facts: string[];
}

export interface KnownLimitEntry {
  key: string;
  label: string;
}

export interface ProofMetadata {
  label: string;
  source: string;
  status: string;
  version: string;
}

export interface ProofLabels {
  source: string;
  status: string;
  version: string;
}

export interface LocaleToggleContent {
  label: string;
}

export interface CtaButton {
  label: string;
  href: string;
}

export interface CtaButtonsContent {
  title: string;
  description: string;
  primary: CtaButton;
  secondary: CtaButton;
}

export interface SectionHeading {
  title: string;
  intro?: string;
}

export function getHero(): HeroContent {
  return {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    primaryCta: {
      label: t('hero.cta.primary'),
      href: REPOSITORY_URL,
    },
    platformChips: [
      t('hero.platformChips.openclaw'),
      t('hero.platformChips.discord'),
      t('hero.platformChips.slack'),
      t('hero.platformChips.telegram'),
    ],
    platformAriaLabel: t('hero.platformChips.ariaLabel'),
    payloadPreviewLabel: t('hero.payloadPreview.label'),
    payloadPreviewMeta: ['title', 'url', 'description', 'create_at', 'content', 'prompt'],
  };
}

export function getUseCasesHeading(): SectionHeading {
  return {
    title: t('useCases.section.title'),
    intro: t('useCases.section.intro'),
  };
}

export function getUseCases(): UseCaseEntry[] {
  return [
    {
      key: 'personal-knowledge',
      title: t('useCases.personalKnowledge.title'),
      description: t('useCases.personalKnowledge.description'),
      evidence: t('useCases.personalKnowledge.evidence'),
    },
    {
      key: 'team-sharing',
      title: t('useCases.teamSharing.title'),
      description: t('useCases.teamSharing.description'),
      evidence: t('useCases.teamSharing.evidence'),
    },
    {
      key: 'agent-workflows',
      title: t('useCases.agentWorkflows.title'),
      description: t('useCases.agentWorkflows.description'),
      evidence: t('useCases.agentWorkflows.evidence'),
    },
  ];
}

export function getPayloadExample(): PayloadExampleContent {
  return {
    title: t('payload.title'),
    description: t('payload.description'),
    fields: [
      { key: 'title', label: t('payload.fields.title'), value: t('payload.values.title') },
      { key: 'url', label: t('payload.fields.url'), value: t('payload.values.url') },
      {
        key: 'description',
        label: t('payload.fields.description'),
        value: t('payload.values.description'),
      },
      {
        key: 'create_at',
        label: t('payload.fields.create_at'),
        value: t('payload.values.create_at'),
      },
      { key: 'content', label: t('payload.fields.content'), value: t('payload.values.content') },
      { key: 'prompt', label: t('payload.fields.prompt'), value: t('payload.values.prompt') },
    ],
  };
}

export function getSupportedPlatformsHeading(): SectionHeading {
  return {
    title: t('supportedPlatforms.title'),
    intro: t('supportedPlatforms.intro'),
  };
}

export function getSupportedPlatforms(): PlatformEntry[] {
  return [
    {
      key: 'openclaw',
      label: t('supportedPlatforms.openclaw.label'),
      detail: t('supportedPlatforms.openclaw.detail'),
    },
    {
      key: 'discord',
      label: t('supportedPlatforms.discord.label'),
      detail: t('supportedPlatforms.discord.detail'),
    },
    {
      key: 'slack',
      label: t('supportedPlatforms.slack.label'),
      detail: t('supportedPlatforms.slack.detail'),
    },
    {
      key: 'telegram',
      label: t('supportedPlatforms.telegram.label'),
      detail: t('supportedPlatforms.telegram.detail'),
      riskLabel: t('supportedPlatforms.telegram.riskLabel'),
    },
  ];
}

export function getFlowHeading(): SectionHeading {
  return {
    title: t('flow.section.title'),
    intro: t('flow.section.intro'),
  };
}

export function getThreeStepFlow(): FlowStep[] {
  return [
    {
      key: 'capture',
      title: t('flow.capture.title'),
      description: t('flow.capture.description'),
    },
    {
      key: 'choose-target',
      title: t('flow.chooseTarget.title'),
      description: t('flow.chooseTarget.description'),
    },
    {
      key: 'send-to-chat',
      title: t('flow.sendToChat.title'),
      description: t('flow.sendToChat.description'),
    },
  ];
}

export function getTrustHeading(): SectionHeading {
  return {
    title: t('trust.section.title'),
    intro: t('trust.section.intro'),
  };
}

export function getTrustGroups(): TrustGroup[] {
  return [
    {
      key: 'privacy',
      title: t('trust.privacy.title'),
      facts: [
        t('trust.privacy.facts.userTriggeredCapture'),
        t('trust.privacy.facts.localStorage'),
        t('trust.privacy.facts.directBrowserDelivery'),
        t('trust.privacy.facts.noRemoteServer'),
        t('trust.privacy.facts.noTelemetry'),
        t('trust.privacy.facts.noThirdPartyAnalytics'),
      ],
    },
    {
      key: 'permissions',
      title: t('trust.permissions.title'),
      facts: [
        t('trust.permissions.facts.productionPermissions'),
        t('trust.permissions.facts.productionHosts'),
        t('trust.permissions.facts.optionalOriginGrant'),
      ],
    },
  ];
}

export function getKnownLimitsHeading(): SectionHeading {
  return {
    title: t('knownLimits.title'),
    intro: t('knownLimits.intro'),
  };
}

export function getKnownLimits(): KnownLimitEntry[] {
  return [
    { key: 'telegram', label: t('knownLimits.telegram') },
    { key: 'feishu-lark', label: t('knownLimits.feishuLark') },
    { key: 'nyquist', label: t('knownLimits.nyquist') },
  ];
}

export function getProofMetadata(): ProofMetadata {
  return {
    label: t('proof.label'),
    source: t('proof.source'),
    status: t('proof.status'),
    version: t('proof.version'),
  };
}

export function getProofLabels(): ProofLabels {
  return {
    source: t('proof.meta.sourceLabel'),
    status: t('proof.meta.statusLabel'),
    version: t('proof.meta.versionLabel'),
  };
}

export function getLocaleToggle(): LocaleToggleContent {
  return {
    label: t('localeToggle.label'),
  };
}

export function getCtaButtons(): CtaButtonsContent {
  return {
    title: t('cta.title'),
    description: t('cta.description'),
    primary: {
      label: t('cta.primary'),
      href: REPOSITORY_URL,
    },
    secondary: {
      label: t('cta.secondary'),
      href: README_INSTALL_URL,
    },
  };
}
