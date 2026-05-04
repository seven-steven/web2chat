import { signal, effect } from '@preact/signals';
import { t } from '@/shared/i18n';
import * as grantedOriginsRepo from '@/shared/storage/repos/grantedOrigins';
import { ConfirmDialog } from './ConfirmDialog';

const originsSig = signal<string[]>([]);
const pendingOriginSig = signal<string | null>(null);
const removingOriginSig = signal<string | null>(null);

// Load origins on first render
effect(() => {
  void grantedOriginsRepo.list().then((origins) => {
    originsSig.value = origins;
  });
});

export function GrantedOriginsSection() {
  async function handleConfirmRemove() {
    const origin = pendingOriginSig.value;
    if (!origin) return;

    pendingOriginSig.value = null;
    removingOriginSig.value = origin;
    try {
      await chrome.permissions.remove({ origins: [origin + '/*'] });
      await grantedOriginsRepo.remove(origin);
      originsSig.value = await grantedOriginsRepo.list();
    } finally {
      removingOriginSig.value = null;
    }
  }

  const origins = originsSig.value;
  const pendingOrigin = pendingOriginSig.value;
  const removingOrigin = removingOriginSig.value;

  return (
    <section
      class="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 flex flex-col gap-4"
      data-testid="options-origins-section"
    >
      <header class="flex flex-col gap-2">
        <h2 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
          {t('options_origins_heading')}
        </h2>
        <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
          {t('options_origins_explainer')}
        </p>
      </header>
      {origins.length === 0 ? (
        <p
          class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400 italic"
          data-testid="options-origins-empty"
        >
          {t('options_origins_empty')}
        </p>
      ) : (
        <ul class="list-none m-0 p-0 flex flex-col gap-2">
          {origins.map((origin) => (
            <li
              key={origin}
              class="flex items-center justify-between bg-white dark:bg-slate-700 px-4 py-2 rounded-md"
              data-testid={`options-origin-item-${origin}`}
            >
              <span class="text-sm font-mono text-slate-700 dark:text-slate-200 truncate">
                {origin}
              </span>
              <button
                type="button"
                class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-semibold ml-4 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={removingOrigin === origin}
                onClick={() => {
                  pendingOriginSig.value = origin;
                }}
                data-testid={`options-origin-remove-${origin}`}
              >
                {t('options_origins_remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pendingOrigin && (
        <ConfirmDialog
          title={t('options_origins_confirm_title')}
          body={t('options_origins_confirm_body', [pendingOrigin])}
          cancelLabel={t('options_origins_confirm_cancel')}
          confirmLabel={t('options_origins_confirm_action')}
          variant="destructive"
          onCancel={() => {
            pendingOriginSig.value = null;
          }}
          onConfirm={() => void handleConfirmRemove()}
        />
      )}
    </section>
  );
}
