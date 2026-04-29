import { useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { sendMessage } from '@/shared/messaging';
import { t } from '@/shared/i18n';

/**
 * Phase 1 popup demo (D-08 + D-09):
 *   - On mount, RPC to SW: meta.bumpHello → Result<MetaSchema>
 *   - Render t('popup_hello', [helloCount]) on success
 *   - Render t('popup_hello', [0]) + raw error message on failure
 *
 * No buttons, no manual triggers — popup re-mounting on each toolbar click
 * IS the increment event (matches ROADMAP success criterion #4 semantics).
 *
 * Future phases will add SendForm, HistoryDropdown, PromptPicker — keep this
 * file minimal so the i18n + RPC + signals patterns are obvious to readers.
 */

const helloCount = signal<number | null>(null);
const errorMessage = signal<string | null>(null);

export function App() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await sendMessage('meta.bumpHello');
      if (cancelled) return;
      if (result.ok) {
        helloCount.value = result.data.helloCount;
        errorMessage.value = null;
      } else {
        helloCount.value = 0;
        errorMessage.value = result.message;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = helloCount.value;
  const error = errorMessage.value;

  // Loading state: RPC in-flight, no decision yet. Render an empty,
  // aria-busy <main> instead of popup_hello with `count=0` — the latter
  // would (a) flash a misleading "×0" to real users for ~50–500ms and
  // (b) make Playwright `locator('[data-testid="popup-hello"]')` race
  // with the RPC completion (a `(×0)` placeholder defeats the locator's
  // implicit wait). Holding the test-id back until we have a real
  // count or a real error is the simplest way to keep both contracts honest.
  if (count === null && error === null) {
    return (
      <main
        class="flex flex-col items-center justify-center gap-2 p-6 font-sans text-base"
        aria-busy="true"
        data-testid="popup-loading"
      />
    );
  }

  return (
    <main class="flex flex-col items-center justify-center gap-2 p-6 font-sans text-base">
      <h1 class="m-0 text-lg font-semibold" data-testid="popup-hello">
        {t('popup_hello', [count ?? 0])}
      </h1>
      {error !== null && (
        <p class="m-0 text-xs text-red-600" data-testid="popup-error">
          {error}
        </p>
      )}
    </main>
  );
}
