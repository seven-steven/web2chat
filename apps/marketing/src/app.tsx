/**
 * App — final Phase 15 marketing page: 8 sections in locked order (D-01/D-02).
 *
 * Section order + band alternation (15-UI-SPEC / D-04):
 *   1. Hero (canvas, max-w-3xl) — locale toggle (above the fold), single h1, primary CTA, payload preview
 *   2. Use cases (subtle)      — 3 compact cards
 *   3. Payload example (canvas) — PopupMockup proof module
 *   4. Supported platforms (subtle) — shipped list only, Telegram warn label
 *   5. Three-step flow (canvas) — Stepper + TargetMockup delivered state
 *   6. Trust (subtle)           — privacy facts / permission facts groups
 *   7. Known limits (canvas)    — subdued factual list
 *   8. CTA (subtle)             — primary + secondary CtaButton group
 *
 * All public copy flows through site-content.ts getters (no freeform JSX
 * strings); the locale signal is read during render so toggling locale
 * re-renders the whole page after the dictionary loads (T-15-09 + the
 * stale-dictionary regression fixed in 15-01).
 */
import type { Signal } from '@preact/signals';
import {
  getHero,
  getUseCases,
  getPayloadExample,
  getSupportedPlatforms,
  getFlowSteps,
  getTargetMockup,
  getTrust,
  getKnownLimits,
  getProofMeta,
  getCta,
  getLocaleToggle,
  getFooterTagline,
} from './data/site-content';
import type { FlowStep } from './data/site-content';
import { t, setLocale } from './i18n/index';
import { SectionShell } from './components/section-shell';
import { CtaButton } from './components/cta-button';
import { PopupMockup } from './components/proof/popup-mockup';
import { TargetMockup } from './components/proof/target-mockup';
import { Stepper } from './components/flow/stepper';

interface AppProps {
  locale: Signal<string>;
}

/** getFlowSteps returns exactly 3 steps (PROOF-02); narrow to the Stepper tuple. */
function flowTuple(): readonly [FlowStep, FlowStep, FlowStep] {
  const [s1, s2, s3] = getFlowSteps();
  if (!s1 || !s2 || !s3) throw new Error('expected exactly 3 flow steps');
  return [s1, s2, s3] as const;
}

export function App({ locale }: AppProps) {
  // Reading locale.value subscribes this component to the signal, so the
  // toggle below re-renders every getter-driven section after setLocale.
  const langAttr = locale.value === 'zh_CN' ? 'zh-CN' : 'en';

  const hero = getHero();
  const useCases = getUseCases();
  const payload = getPayloadExample();
  const platforms = getSupportedPlatforms();
  const trust = getTrust();
  const limits = getKnownLimits();
  const proofMeta = getProofMeta();
  const cta = getCta();
  const targetMockup = getTargetMockup();
  const toggle = getLocaleToggle();
  const footer = getFooterTagline();

  return (
    <div lang={langAttr} class="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-base)]">
      <main>
        {/* 1. Hero — canvas band, unified max-w-3xl width rhythm (15-06, D-03) */}
        <section class="bg-[var(--color-canvas)] py-16">
          <div class="mx-auto max-w-3xl px-6 sm:px-8">
            {/* Utility row: locale toggle is discoverable above the fold.
                Restrained text-link affordance only — no navbar, no anchor
                menu, no sticky chrome (D-02). */}
            <div class="flex justify-end">
              <button
                type="button"
                data-testid="locale-toggle"
                class="min-h-[44px] rounded-[var(--radius-soft)] px-3 text-sm text-[var(--color-ink-muted)] underline underline-offset-4 hover:text-[var(--color-ink-strong)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:outline-none"
                onClick={() => {
                  const next = locale.value === 'en' ? 'zh_CN' : 'en';
                  // Load the dictionary first, then flip the signal so the
                  // re-render reads the fully loaded locale (no stale copy).
                  void setLocale(next).then(() => {
                    locale.value = next;
                    // Keep the <html> lang in lockstep with the app-root lang
                    // (WR-08). Same expression as main.tsx init.
                    document.documentElement.lang = next === 'zh_CN' ? 'zh-CN' : 'en';
                  });
                }}
              >
                {toggle.label}
              </button>
            </div>

            <div class="mt-2 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] md:items-center md:gap-8">
              <div>
                <h1 class="text-[28px] leading-[1.15] font-semibold text-[var(--color-ink-strong)]">
                  {hero.title}
                </h1>
                <p class="mt-4 max-w-[40ch] text-base leading-normal text-[var(--color-ink-muted)]">
                  {hero.subtitle}
                </p>
                <div class="mt-8">
                  <CtaButton href={hero.ctaUrl} variant="primary" testId="hero-primary-cta">
                    {hero.cta}
                  </CtaButton>
                </div>
                {/* Low-weight shipped-platform chips — names only, no logo wall */}
                <ul class="mt-6 flex flex-wrap gap-2">
                  {hero.platformChips.map((chip) => (
                    <li
                      key={chip}
                      class="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] px-2.5 py-0.5 text-sm text-[var(--color-ink-muted)]"
                    >
                      {chip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Compact payload preview — field names only, full demo lives in section 3 */}
              <div class="mt-10 md:mt-0">
                <div class="rounded-[calc(var(--radius-card)+8px)] border border-[var(--color-rule)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-4 py-3 shadow-[0_12px_36px_color-mix(in_srgb,var(--color-accent)_10%,transparent)] ring-1 ring-white/55">
                  <p class="text-sm leading-snug text-[var(--color-ink-muted)]">
                    {hero.payloadPreview.label}
                  </p>
                  <ul class="mt-2 flex flex-col">
                    {hero.payloadPreview.fields.map((field) => (
                      <li
                        key={field}
                        class="border-t border-[var(--color-rule)] py-1.5 font-mono text-sm leading-snug text-[var(--color-ink-base)] first:border-t-0"
                      >
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Use cases — exactly 3 (CLM-USE-01) */}
        <SectionShell tone="subtle" width="3xl" title={t('useCases.title')}>
          <div class="grid gap-4 md:grid-cols-3">
            {useCases.map((useCase) => (
              <div
                key={useCase.key}
                class="rounded-[calc(var(--radius-card)+6px)] border border-[var(--color-rule)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-4 py-4 shadow-[0_10px_28px_color-mix(in_srgb,var(--color-ink-strong)_5%,transparent)]"
              >
                <h3 class="text-base leading-normal font-semibold text-[var(--color-ink-strong)]">
                  {useCase.title}
                </h3>
                <p class="mt-1.5 text-sm leading-normal text-[var(--color-ink-muted)]">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* 3. Structured-payload example — popup-style proof module (D-10/D-11) */}
        <SectionShell tone="canvas" width="3xl" title={payload.title} intro={payload.description}>
          <PopupMockup payload={payload} meta={proofMeta} />
        </SectionShell>

        {/* 4. Supported platforms — shipped truth only (T-15-07, CLM-PLATFORM-01) */}
        <SectionShell tone="subtle" width="3xl" title={t('supportedPlatforms.title')}>
          <ul class="grid gap-4 md:grid-cols-2">
            {platforms.map((platform) => (
              <li
                key={platform.key}
                class="rounded-[calc(var(--radius-card)+6px)] border border-[var(--color-rule)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-4 py-3 shadow-[0_10px_28px_color-mix(in_srgb,var(--color-ink-strong)_5%,transparent)]"
              >
                <p class="text-base leading-normal text-[var(--color-ink-base)]">
                  {platform.label}
                </p>
                {platform.riskLabel && (
                  <p class="mt-1.5">
                    <span class="inline-flex items-center rounded-[var(--radius-sharp)] bg-[var(--color-warn-soft)] px-1.5 py-0.5 font-mono text-sm leading-snug text-[var(--color-warn)]">
                      {platform.riskLabel}
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </SectionShell>

        {/* 5. Three-step core flow + delivered-state proof (D-08/D-09, PROOF-02/03) */}
        <SectionShell tone="canvas" width="3xl" title={t('flow.title')}>
          <div class="flex flex-col gap-10">
            <Stepper steps={flowTuple()} />
            <TargetMockup
              meta={proofMeta}
              chatLabel={targetMockup.chatLabel}
              messageLines={targetMockup.messageLines}
              statusLabel={targetMockup.statusLabel}
            />
          </div>
        </SectionShell>

        {/* 6. Privacy / permissions trust — two distinct fact groups (TRUST-01/02) */}
        <SectionShell tone="subtle" width="3xl" title={trust.title}>
          <div class="grid gap-4 md:grid-cols-2">
            {[trust.privacy, trust.permissions].map((group) => (
              <div
                key={group.title}
                class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-4"
              >
                <h3 class="text-base leading-normal font-semibold text-[var(--color-ink-strong)]">
                  {group.title}
                </h3>
                <ul class="mt-3 flex flex-col gap-2">
                  {group.facts.map((fact) => (
                    <li key={fact} class="text-sm leading-normal text-[var(--color-ink-base)]">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* 7. Known limits — factual, lower visual weight than trust (CLM-LIMIT-01/02) */}
        <SectionShell tone="canvas" width="3xl" title={limits.title}>
          <ul class="flex flex-col gap-3">
            {limits.items.map((item) => (
              <li key={item.key} class="text-base leading-normal text-[var(--color-ink-muted)]">
                {item.text}
              </li>
            ))}
          </ul>
        </SectionShell>

        {/* 8. CTA — primary + secondary sharing the Hero button contract (D-12/D-13) */}
        <SectionShell tone="subtle" width="3xl" title={cta.title} intro={cta.subtitle}>
          <div class="mt-2 inline-flex flex-col gap-3 rounded-[calc(var(--radius-card)+10px)] border border-[var(--color-rule)] bg-[color-mix(in_srgb,var(--color-accent-soft)_62%,transparent)] px-5 py-4 shadow-[0_16px_42px_color-mix(in_srgb,var(--color-accent)_12%,transparent)] sm:flex-row">
            <CtaButton href={cta.primary.url} variant="primary" testId="footer-primary-cta">
              {cta.primary.label}
            </CtaButton>
            <CtaButton href={cta.secondary.url} variant="secondary" testId="footer-secondary-cta">
              {cta.secondary.label}
            </CtaButton>
          </div>
        </SectionShell>
      </main>

      <footer class="border-t border-[var(--color-rule)] py-4 text-center">
        <p class="text-sm text-[var(--color-ink-muted)]">{footer.tagline}</p>
      </footer>
    </div>
  );
}
