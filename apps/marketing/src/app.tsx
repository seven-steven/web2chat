import type { Signal } from '@preact/signals';
import {
  getCtaButtons,
  getFlowHeading,
  getHero,
  getKnownLimits,
  getKnownLimitsHeading,
  getLocaleToggle,
  getPayloadExample,
  getProofLabels,
  getProofMetadata,
  getSupportedPlatforms,
  getSupportedPlatformsHeading,
  getThreeStepFlow,
  getTrustGroups,
  getTrustHeading,
  getUseCases,
  getUseCasesHeading,
} from './data/site-content';
import { localeSig, setLocale } from './i18n/index';
import { CTAButton } from './components/cta-button';
import { Stepper } from './components/flow/stepper';
import { PopupMockup } from './components/proof/popup-mockup';
import { TargetMockup } from './components/proof/target-mockup';
import { SectionShell } from './components/section-shell';

interface AppProps {
  locale?: Signal<string>;
}

export function App(_props: AppProps) {
  const hero = getHero();
  const useCasesHeading = getUseCasesHeading();
  const useCases = getUseCases();
  const payload = getPayloadExample();
  const platformsHeading = getSupportedPlatformsHeading();
  const platforms = getSupportedPlatforms();
  const flowHeading = getFlowHeading();
  const steps = getThreeStepFlow();
  const trustHeading = getTrustHeading();
  const trustGroups = getTrustGroups();
  const limitsHeading = getKnownLimitsHeading();
  const limits = getKnownLimits();
  const proofMetadata = getProofMetadata();
  const proofLabels = getProofLabels();
  const localeToggle = getLocaleToggle();
  const ctas = getCtaButtons();

  const toggleLocale = async () => {
    const next = localeSig.value === 'en' ? 'zh_CN' : 'en';
    await setLocale(next);
  };

  return (
    <div class="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-base)]">
      <SectionShell tone="canvas" width="wide">
        <div class="flex flex-col gap-8" data-section="hero">
          <div class="flex flex-col gap-5">
            <span class="w-fit rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-[14px] leading-[1.4] text-[var(--color-ink-muted)]">
              {hero.payloadPreviewLabel}
            </span>
            <div class="flex flex-col gap-4">
              <h1 class="text-[28px] leading-[1.15] font-semibold text-[var(--color-ink-strong)]">
                {hero.title}
              </h1>
              <p class="max-w-3xl text-[16px] leading-[1.5] text-[var(--color-ink-muted)]">
                {hero.subtitle}
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <CTAButton href={hero.primaryCta.href} target="_blank" rel="noreferrer">
                {hero.primaryCta.label}
              </CTAButton>
            </div>
            <ul class="flex flex-wrap gap-2" aria-label={hero.platformAriaLabel}>
              {hero.platformChips.map((chip) => (
                <li
                  key={chip}
                  class="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-[14px] leading-[1.4] text-[var(--color-ink-muted)]"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </div>
          <div class="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div
              class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5"
              data-testid="hero-payload-preview"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-[20px] leading-[1.2] font-semibold text-[var(--color-ink-strong)]">
                  {payload.title}
                </p>
                <span class="rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-[14px] leading-[1.4] text-[var(--color-ink-muted)]">
                  {proofMetadata.label}
                </span>
              </div>
              <p class="mt-3 text-[16px] leading-[1.5] text-[var(--color-ink-muted)]">
                {payload.description}
              </p>
              <ul class="mt-6 flex flex-col gap-3">
                {payload.fields.map((field) => (
                  <li
                    key={field.key}
                    data-payload-key={field.key}
                    class="rounded-[var(--radius-sharp)] border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 py-3"
                  >
                    <p class="text-[14px] leading-[1.4] text-[var(--color-ink-muted)]">
                      {field.label}
                    </p>
                    <p class="mt-1 line-clamp-2 whitespace-pre-wrap break-words font-mono text-[14px] leading-[1.5] text-[var(--color-ink-strong)]">
                      {field.value}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <TargetMockup
              metadata={proofMetadata}
              platform={platforms[0]?.label ?? ''}
              status={proofMetadata.status}
              message={payload.fields.map((field) => `${field.label}: ${field.value}`).join('\n\n')}
              sourceLabel={proofLabels.source}
              statusLabel={proofLabels.status}
              versionLabel={proofLabels.version}
              helperText={hero.subtitle}
              resultLabel={hero.platformChips[0] ?? ''}
            />
          </div>
        </div>
      </SectionShell>

      <SectionShell
        tone="surface-subtle"
        title={useCasesHeading.title}
        intro={useCasesHeading.intro}
      >
        <div class="grid gap-4 md:grid-cols-3" data-section="use-cases">
          {useCases.map((useCase) => (
            <article
              key={useCase.key}
              class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-5"
            >
              <h3 class="text-[20px] leading-[1.2] font-semibold text-[var(--color-ink-strong)]">
                {useCase.title}
              </h3>
              <p class="mt-3 text-[16px] leading-[1.5] text-[var(--color-ink-muted)]">
                {useCase.description}
              </p>
              <p class="mt-4 text-[14px] leading-[1.4] text-[var(--color-ink-faint)]">
                {useCase.evidence}
              </p>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="canvas" title={payload.title} intro={payload.description}>
        <div data-section="payload">
          <PopupMockup
            title={payload.title}
            fields={payload.fields}
            metadata={proofMetadata}
            sourceLabel={proofLabels.source}
            statusLabel={proofLabels.status}
            versionLabel={proofLabels.version}
          />
        </div>
      </SectionShell>

      <SectionShell
        tone="surface-subtle"
        title={platformsHeading.title}
        intro={platformsHeading.intro}
      >
        <div class="grid gap-4 md:grid-cols-2" data-section="platforms">
          {platforms.map((platform) => (
            <article
              key={platform.key}
              data-platform-key={platform.key}
              class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-5"
            >
              <div class="flex items-start justify-between gap-3">
                <h3 class="text-[20px] leading-[1.2] font-semibold text-[var(--color-ink-strong)]">
                  {platform.label}
                </h3>
                {platform.riskLabel ? (
                  <span class="rounded-full border border-[var(--color-warn)] bg-[var(--color-warn-soft)] px-3 py-1 text-[14px] leading-[1.4] text-[var(--color-warn)]">
                    {platform.riskLabel}
                  </span>
                ) : null}
              </div>
              <p class="mt-3 text-[16px] leading-[1.5] text-[var(--color-ink-muted)]">
                {platform.detail}
              </p>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="canvas" title={flowHeading.title} intro={flowHeading.intro}>
        <div data-section="flow">
          <Stepper steps={steps} />
        </div>
      </SectionShell>

      <SectionShell tone="surface-subtle" title={trustHeading.title} intro={trustHeading.intro}>
        <div class="grid gap-4 md:grid-cols-2" data-section="trust">
          {trustGroups.map((group) => (
            <article
              key={group.key}
              class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-5"
            >
              <h3 class="text-[20px] leading-[1.2] font-semibold text-[var(--color-ink-strong)]">
                {group.title}
              </h3>
              <ul class="mt-4 flex flex-col gap-3">
                {group.facts.map((fact) => (
                  <li key={fact} class="text-[16px] leading-[1.5] text-[var(--color-ink-muted)]">
                    {fact}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="canvas" title={limitsHeading.title} intro={limitsHeading.intro}>
        <div class="flex flex-col gap-3" data-section="limits">
          {limits.map((limit) => (
            <article
              key={limit.key}
              class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-4"
            >
              <p class="text-[16px] leading-[1.5] text-[var(--color-ink-muted)]">{limit.label}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="surface-subtle" title={ctas.title} intro={ctas.description}>
        <div class="flex flex-col gap-4" data-section="cta">
          <div class="flex flex-col gap-3 sm:flex-row">
            <CTAButton href={ctas.primary.href} target="_blank" rel="noreferrer">
              {ctas.primary.label}
            </CTAButton>
            <CTAButton
              href={ctas.secondary.href}
              variant="secondary"
              target="_blank"
              rel="noreferrer"
            >
              {ctas.secondary.label}
            </CTAButton>
          </div>
        </div>
      </SectionShell>

      <footer class="border-t border-[var(--color-rule)] py-6">
        <div class="mx-auto flex max-w-3xl justify-end px-6 sm:px-8">
          <button
            type="button"
            data-testid="locale-toggle"
            class="min-h-11 rounded-[var(--radius-soft)] px-3 text-[16px] leading-[1.5] text-[var(--color-ink-muted)] underline transition-colors hover:text-[var(--color-ink-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
            aria-label={localeToggle.label}
            onClick={toggleLocale}
          >
            {localeSig.value === 'en' ? '中文' : 'English'}
          </button>
        </div>
      </footer>
    </div>
  );
}
