/**
 * Phase 3 popup: 6-state UI (CAP-05, D-15..D-22 + DSP-01..09, D-27..D-35).
 *
 * State machine:
 *   loading       — RPC in-flight (initial state; snapshot=null, error=null)
 *   success       — ArticleSnapshot received; SendForm with capture preview
 *   empty         — RESTRICTED_URL or EXTRACTION_EMPTY (no content to show; not an error)
 *   error         — EXECUTE_SCRIPT_FAILED / INTERNAL (retriable; user must re-click toolbar icon)
 *   inProgress    — dispatch in-flight; InProgressView with cancel + dispatchId
 *   dispatchError — last dispatch failed; ErrorBanner above SendForm
 *
 * Phase 1 contracts still honoured:
 *   - SW Phase 1 health-probe route stays registered (popup no longer calls it)
 *   - cancelled-flag async IIFE pattern (PATTERNS.md Pattern S4)
 *   - All user-visible copy via t() — no bare string literals (FND-06, D-12)
 *
 * Security:
 *   - popup never assigns raw HTML; content is bound only as textarea.value
 *     (plain text rendering through Preact text nodes) — see D-20
 *   - Inline accent span composed in JSX, not in i18n YAML (PITFALLS S11)
 *
 * Preact note:
 *   - Labels use the native `for` attribute (not the React-compat alias),
 *     matching project convention; FieldLabel emits `for={id}` directly.
 */

import { useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { sendMessage } from '@/shared/messaging';
import type { ArticleSnapshot, ErrorCode } from '@/shared/messaging';
import { t } from '@/shared/i18n';
import * as draftRepo from '@/shared/storage/repos/popupDraft';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import type { DispatchRecord } from '@/shared/storage/repos/dispatch';
import * as grantedOriginsRepo from '@/shared/storage/repos/grantedOrigins';
import { findAdapter } from '@/shared/adapters/registry';
import { PopupChrome } from './components/PopupChrome';
import { SendForm } from './components/SendForm';
import { InProgressView } from './components/InProgressView';
import { ErrorBanner } from './components/ErrorBanner';
import { LanguageSection } from '../options/components/LanguageSection';
import { ResetSection } from '../options/components/ResetSection';
import { GrantedOriginsSection } from '../options/components/GrantedOriginsSection';

// ─── Module-level signals (D-22: editing values live only here; cleared on popup close) ─────

// Phase 2 (preserved):
const snapshotSig = signal<ArticleSnapshot | null>(null);
const errorSig = signal<{ code: ErrorCode; message: string } | null>(null);

// Editable field signals — initialised from snapshot on RPC success, cleared on popup close
const titleSig = signal('');
const descriptionSig = signal('');
const contentSig = signal('');

// Phase 3 NEW:
const sendToSig = signal('');
const promptSig = signal('');
const promptDirtySig = signal(false);
const dispatchInFlightSig = signal<DispatchRecord | null>(null);
const dispatchErrorSig = signal<{ code: ErrorCode; message: string } | null>(null);

// Settings toggle
const viewModeSig = signal<'send' | 'settings'>('send');

// ─── Component ────────────────────────────────────────────────────────────────

export function App() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // ─── Step 0: Check for pending dispatch intent (popup closed during permission request)
        const pendingIntent = await draftRepo.loadPendingDispatch();
        if (!cancelled && pendingIntent) {
          const adapter = findAdapter(pendingIntent.send_to);
          if (adapter && adapter.requiresDynamicPermission === true) {
            const targetOrigin = new URL(pendingIntent.send_to).origin;
            const nowGranted = await chrome.permissions.contains({
              origins: [targetOrigin + '/*'],
            });
            if (nowGranted) {
              await draftRepo.clearPendingDispatch();
              await grantedOriginsRepo.add(targetOrigin).catch(() => {});

              dispatchInFlightSig.value = {
                schemaVersion: 1,
                dispatchId: pendingIntent.dispatchId,
                state: 'pending',
                target_tab_id: null,
                send_to: pendingIntent.send_to,
                prompt: pendingIntent.prompt,
                snapshot: pendingIntent.snapshot,
                platform_id: adapter.id,
                started_at: new Date().toISOString(),
                last_state_at: new Date().toISOString(),
              };

              try {
                const res = await sendMessage('dispatch.start', pendingIntent);
                if (!res.ok) {
                  dispatchInFlightSig.value = null;
                  dispatchErrorSig.value = { code: res.code, message: res.message };
                }
              } catch (err) {
                dispatchInFlightSig.value = null;
                const msg = err instanceof Error ? err.message : String(err);
                dispatchErrorSig.value = { code: 'INTERNAL', message: msg };
              }
            } else {
              await draftRepo.clearPendingDispatch();
              dispatchErrorSig.value = {
                code: 'OPENCLAW_PERMISSION_DENIED',
                message: targetOrigin,
              };
            }
          }
        }

        // ─── Step 1: Check for in-flight dispatch FIRST (UI-SPEC S6 step 1) ─────────
        const activeId = await dispatchRepo.getActive();
        if (cancelled) return;
        let wasInFlight = false;
        if (activeId) {
          const rec = await dispatchRepo.get(activeId);
          if (cancelled) return;
          if (rec && rec.state === 'error') {
            // Last dispatch failed — show error banner above SendForm
            dispatchErrorSig.value = {
              code: (rec.error?.code as ErrorCode) ?? 'INTERNAL',
              message: rec.error?.message ?? '',
            };
          } else if (rec && rec.state !== 'done' && rec.state !== 'cancelled') {
            wasInFlight = true;
          }
        }

        // ─── Step 2: Parallel reads — always load capture (needed for SendForm render) ──
        const [captureRes, draftRes] = await Promise.all([
          sendMessage('capture.run').catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            return { ok: false as const, code: 'INTERNAL' as ErrorCode, message, retriable: false };
          }),
          draftRepo.get().catch(() => null),
        ]);
        if (cancelled) return;

        if (captureRes.ok) {
          snapshotSig.value = captureRes.data;
          titleSig.value = captureRes.data.title;
          descriptionSig.value = captureRes.data.description;
          contentSig.value = captureRes.data.content;
          if (draftRes) {
            // send_to / prompt are URL-independent — always restore (DSP-09)
            sendToSig.value = draftRes.send_to || '';
            promptSig.value = draftRes.prompt || '';
            promptDirtySig.value = (draftRes.prompt || '') !== '';
            // Draft overrides capture fields ONLY when the draft was recorded
            // for the same page. Without this URL guard, navigating to a new
            // page would render the previous page's capture (popup-stale-capture).
            if (draftRes.url && draftRes.url === captureRes.data.url) {
              if (draftRes.title) titleSig.value = draftRes.title;
              if (draftRes.description) descriptionSig.value = draftRes.description;
              if (draftRes.content) contentSig.value = draftRes.content;
            }
          }
        } else {
          if (!dispatchErrorSig.value) {
            errorSig.value = { code: captureRes.code, message: captureRes.message };
          }
        }

        // Step 3: mark InProgressView AFTER snapshot loaded (listener can transition to error)
        if (wasInFlight && activeId) {
          const rec = await dispatchRepo.get(activeId);
          if (
            !cancelled &&
            rec &&
            rec.state !== 'done' &&
            rec.state !== 'error' &&
            rec.state !== 'cancelled'
          ) {
            dispatchInFlightSig.value = rec;
          }
        }

        // ─── Step 4: Clear err badge (UI-SPEC S6 step 3 + D-34) ──────────────────
        await chrome.action.setBadgeText({ text: '' }).catch(() => {});
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        errorSig.value = { code: 'INTERNAL', message };
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const snapshot = snapshotSig.value;
  const error = errorSig.value;
  const dispatchInFlight = dispatchInFlightSig.value;
  const showSettings = viewModeSig.value === 'settings';
  const toggleSettings = () => {
    viewModeSig.value = viewModeSig.value === 'settings' ? 'send' : 'settings';
  };

  // ─── Real-time dispatch state listener ─────────────────────────
  // When InProgressView is shown, poll storage for dispatch state changes.
  // Without this, the popup never updates from InProgressView → error/done.
  const activeDispatchId = dispatchInFlightSig.value?.dispatchId;
  useEffect(() => {
    if (!activeDispatchId) return;
    const key = `dispatch:${activeDispatchId}`;
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'session') return;
      if (!(key in changes)) return;
      const rec = changes[key]?.newValue as DispatchRecord | undefined;
      if (!rec) return;
      if (rec.state === 'error') {
        dispatchInFlightSig.value = null;
        dispatchErrorSig.value = {
          code: (rec.error?.code as ErrorCode) ?? 'INTERNAL',
          message: rec.error?.message ?? '',
        };
      } else if (rec.state === 'done' || rec.state === 'cancelled') {
        dispatchInFlightSig.value = null;
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [activeDispatchId]);

  // 6-state dispatch (UI-SPEC S-Implementation Notes S8 — InProgressView is mutually exclusive)
  if (dispatchInFlight !== null) {
    return (
      <>
        <PopupChrome showSettings={showSettings} onToggleSettings={toggleSettings} />
        <InProgressView
          dispatchId={dispatchInFlight.dispatchId}
          onCancel={async () => {
            try {
              await sendMessage('dispatch.cancel', { dispatchId: dispatchInFlight.dispatchId });
            } finally {
              dispatchInFlightSig.value = null;
            }
          }}
        />
      </>
    );
  }
  if (showSettings) {
    return (
      <>
        <PopupChrome showSettings={showSettings} onToggleSettings={toggleSettings} />
        <main
          class="flex flex-col gap-3 p-3 min-w-[360px] max-h-[460px] overflow-y-auto font-sans"
          data-testid="popup-settings"
        >
          <div class="relative z-20">
            <LanguageSection />
          </div>
          <div>
            <GrantedOriginsSection />
          </div>
          <div>
            <ResetSection />
          </div>
        </main>
      </>
    );
  }

  if (snapshot === null && error === null) {
    const dErr = dispatchErrorSig.value;
    return (
      <>
        <PopupChrome showSettings={showSettings} onToggleSettings={toggleSettings} />
        <main class="flex flex-col p-4 gap-4 min-w-[360px] font-sans" data-testid="popup-loading">
          {dErr && (
            <ErrorBanner
              code={dErr.code}
              onDismiss={() => {
                dispatchErrorSig.value = null;
                void dispatchRepo.clearActive();
              }}
            />
          )}
          <LoadingSkeleton />
        </main>
      </>
    );
  }
  if (snapshot !== null) {
    return (
      <>
        <PopupChrome showSettings={showSettings} onToggleSettings={toggleSettings} />
        <SendForm
          snapshot={snapshot}
          titleValue={titleSig.value}
          onTitleChange={(v) => {
            titleSig.value = v;
          }}
          descriptionValue={descriptionSig.value}
          onDescriptionChange={(v) => {
            descriptionSig.value = v;
          }}
          contentValue={contentSig.value}
          onContentChange={(v) => {
            contentSig.value = v;
          }}
          sendTo={sendToSig.value}
          onSendToChange={(v) => {
            sendToSig.value = v;
          }}
          prompt={promptSig.value}
          onPromptChange={(v) => {
            promptSig.value = v;
          }}
          promptDirty={promptDirtySig.value}
          onPromptDirtyChange={(d) => {
            promptDirtySig.value = d;
          }}
          dispatchError={dispatchErrorSig.value}
          onDismissError={() => {
            dispatchErrorSig.value = null;
            void dispatchRepo.clearActive();
          }}
          onConfirm={(_dispatchId) => {
            // popup will close on Ok per SendForm.handleConfirm; if Err, SendForm
            // calls onDispatchError which writes dispatchErrorSig (below).
          }}
          onDispatchError={(code, message) => {
            dispatchErrorSig.value = { code, message };
          }}
        />
      </>
    );
  }
  // Capture-flow empty / error states (Phase 2 preserved verbatim)
  if (error?.code === 'RESTRICTED_URL' || error?.code === 'EXTRACTION_EMPTY') {
    return (
      <>
        <PopupChrome showSettings={showSettings} onToggleSettings={toggleSettings} />
        <EmptyView code={error.code} />
      </>
    );
  }
  return (
    <>
      <PopupChrome showSettings={showSettings} onToggleSettings={toggleSettings} />
      <ErrorView />
    </>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  // 5 horizontal rule lines with linear-gradient shimmer — typeset-line metaphor
  // replaces the conventional pulsing-rectangle skeleton.
  const shimmerBar =
    'h-1.5 rounded-[var(--radius-sharp)] bg-gradient-to-r from-[var(--color-surface-subtle)] via-[var(--color-border-strong)] to-[var(--color-surface-subtle)] bg-[length:200%_100%] [animation:w2c-shimmer_1.6s_infinite_ease-in-out]';
  return (
    <main
      class="flex flex-col gap-4 p-4 min-w-[360px] min-h-[240px] font-sans"
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="capture-loading"
    >
      <span class="sr-only">{t('capture_loading_label')}</span>
      <div class="flex flex-col gap-2">
        <div class={`${shimmerBar} w-1/3`} />
        <div class={`${shimmerBar} w-full`} />
      </div>
      <div class="flex flex-col gap-2">
        <div class={`${shimmerBar} w-1/4`} />
        <div class={`${shimmerBar} w-full`} />
      </div>
      <div class="flex flex-col gap-2">
        <div class={`${shimmerBar} w-1/3`} />
        <div class={`${shimmerBar} w-full`} />
        <div class={`${shimmerBar} w-5/6`} />
      </div>
    </main>
  );
}

// ─── Empty View (RESTRICTED_URL + EXTRACTION_EMPTY) ──────────────────────────

function EmptyView({ code }: { code: 'RESTRICTED_URL' | 'EXTRACTION_EMPTY' }) {
  const variant = code === 'RESTRICTED_URL' ? 'restricted' : 'noContent';
  const heading =
    variant === 'restricted'
      ? t('capture_empty_restricted_heading')
      : t('capture_empty_noContent_heading');

  // Inline accent span pattern (UI-SPEC.md SCopywriting Contract)
  // Three i18n keys per body string: .before / .icon (wrapped) / .after
  const before =
    variant === 'restricted'
      ? t('capture_empty_restricted_body_before')
      : t('capture_empty_noContent_body_before');
  const icon =
    variant === 'restricted'
      ? t('capture_empty_restricted_body_icon')
      : t('capture_empty_noContent_body_icon');
  const after =
    variant === 'restricted'
      ? t('capture_empty_restricted_body_after')
      : t('capture_empty_noContent_body_after');

  return (
    <main
      class="flex flex-col items-center text-center p-4 py-8 gap-3 min-w-[360px] min-h-[240px] font-sans"
      role="status"
      aria-live="polite"
      data-testid="capture-empty"
    >
      <div class="[animation:w2c-drift_4s_infinite_ease-in-out]">
        <EmptyIcon variant={variant} />
      </div>
      <h2 class="m-0 text-[14px] leading-snug font-semibold text-[var(--color-ink-strong)]">
        {heading}
      </h2>
      <p class="m-0 text-sm leading-normal font-normal text-[var(--color-ink-muted)] max-w-[280px]">
        {before}
        <span class="text-[var(--color-accent)] font-semibold">{icon}</span>
        {after}
      </p>
    </main>
  );
}

// ─── Error View (EXECUTE_SCRIPT_FAILED / INTERNAL) ───────────────────────────

function ErrorView() {
  return (
    <main
      class="flex flex-col items-center text-center p-4 py-8 gap-3 min-w-[360px] min-h-[240px] font-sans"
      role="alert"
      aria-live="assertive"
      data-testid="capture-error"
    >
      <div class="[animation:w2c-drift_4s_infinite_ease-in-out]">
        <AlertIcon />
      </div>
      <h2 class="m-0 text-[14px] leading-snug font-semibold text-[var(--color-danger)]">
        {t('capture_error_scriptFailed_heading')}
      </h2>
      <p class="m-0 text-sm leading-normal font-normal text-[var(--color-ink-muted)] max-w-[280px]">
        {t('capture_error_scriptFailed_body_before')}
        <span class="text-[var(--color-accent)] font-semibold">
          {t('capture_error_scriptFailed_body_icon')}
        </span>
        {t('capture_error_scriptFailed_body_after')}
      </p>
    </main>
  );
}

// ─── Inline SVG icons ────────────────────────────────────────────────────────

/** Lock-closed glyph for empty:restricted, info-circle glyph for empty:noContent */
function EmptyIcon({ variant }: { variant: 'restricted' | 'noContent' }) {
  if (variant === 'restricted') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-[var(--color-ink-muted)]"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-[var(--color-ink-muted)]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/** Alert-triangle SVG for error state */
function AlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-[var(--color-danger)]"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
