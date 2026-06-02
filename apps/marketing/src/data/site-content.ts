import { t } from '../i18n/index';

export interface HeroContent {
  title: string;
  subtitle: string;
  cta: string;
}

export interface PlatformEntry {
  key: string;
  label: string;
}

export interface NextPhaseContent {
  title: string;
  description: string;
}

export function getHero(): HeroContent {
  return {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    cta: t('hero.cta'),
  };
}

export function getSupportedPlatforms(): PlatformEntry[] {
  return [
    { key: 'openclaw', label: t('supportedPlatforms.openclaw') },
    { key: 'discord', label: t('supportedPlatforms.discord') },
    { key: 'slack', label: t('supportedPlatforms.slack') },
    { key: 'telegram', label: t('supportedPlatforms.telegram') },
  ];
}

export function getNextPhase(): NextPhaseContent {
  return {
    title: t('nextPhase.title'),
    description: t('nextPhase.description'),
  };
}
