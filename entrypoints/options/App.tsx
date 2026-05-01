import { t } from '@/shared/i18n';
import { ResetSection } from './components/ResetSection';
import { GrantedOriginsSection } from './components/GrantedOriginsSection';

/**
 * Options page — Phase 3 (STG-03). Single column layout @ max-w-720px center.
 * Reserved insertion points (rendered as muted "coming later" placeholders):
 *   - Phase 6: Language switcher (I18N-02)
 *
 * Why single-column with reserved slots vs sidebar nav (UI-SPEC line 376-379):
 *   v1 has only 2 active sections (Reset + Granted origins). Phase 6 adds one more.
 *   3 sections at v1 close = single column remains the right shape.
 *   Sidebar would be premature abstraction.
 *
 * Spacing scale: page padding p-8 (32px), section gap-4 (16px), card p-6 (24px).
 */
export function App() {
  return (
    <main class="mx-auto max-w-[720px] p-8 flex flex-col gap-4 font-sans" data-testid="options-app">
      <h1 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
        {t('options_page_heading')}
      </h1>
      <ResetSection />
      <GrantedOriginsSection />
      {/* Phase 6 reserved — Language switcher */}
      <ReservedSection labelKey="options_reserved_language" phaseTag="Phase 6" />
    </main>
  );
}

/**
 * Muted placeholder for sections that will be filled by future phases.
 * Visible so the v1 layout already shows the eventual visual hierarchy
 * (UI-SPEC Layout Contracts Options page lines 364-374) but rendered
 * with grayed-out treatment so users don't try to interact.
 */
function ReservedSection({
  labelKey,
  phaseTag,
}: {
  labelKey: 'options_reserved_language';
  phaseTag: string;
}) {
  const heading = t('options_reserved_language_label');
  return (
    <section
      class="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 opacity-60"
      aria-disabled="true"
      data-testid={`options-reserved-${labelKey}`}
    >
      <h2 class="m-0 text-base leading-snug font-semibold text-slate-700 dark:text-slate-300">
        {heading}
      </h2>
      <p class="mt-2 m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
        {t('options_reserved_placeholder_body')} <span class="font-mono">{phaseTag}</span>
      </p>
    </section>
  );
}
