/**
 * Phase 3 popup primary view: error banner slot + send_to + prompt comboboxes
 * + soft-overwrite hint + Confirm button + capture preview (D-27, D-28, D-32, D-35).
 *
 * Component receives all signals via PROPS — App.tsx owns the module-level signals.
 * SendForm is a pure functional view (easier to test, easier to extract).
 *
 * History fetched on mount via 2 sendMessage('history.list', ...) calls; results
 * held in component-local useState. Binding fetched WHEN send_to changes via
 * sendMessage('binding.get', { send_to }).
 *
 * 200ms debounce on platform-detection (DSP-01).
 * 800ms debounce on popupDraft + binding.upsert (D-28 + D-35).
 */
import { useState, useEffect, useRef } from 'preact/hooks';
import { t } from '@/shared/i18n';
import { sendMessage } from '@/shared/messaging';
import type {
  ArticleSnapshot,
  ErrorCode,
  HistoryListOutput,
  DispatchStartInput,
} from '@/shared/messaging';
import { detectPlatformId, findAdapter } from '@/shared/adapters/registry';
import * as grantedOriginsRepo from '@/shared/storage/repos/grantedOrigins';
import * as draftRepo from '@/shared/storage/repos/popupDraft';
import { Combobox, type ComboboxOption } from './Combobox';
import { ErrorBanner } from './ErrorBanner';
import { CapturePreview } from './CapturePreview';
import { FieldLabel } from './primitives';

interface SendFormProps {
  // Capture state from App.tsx — forwarded into CapturePreview unchanged
  snapshot: ArticleSnapshot;
  titleValue: string;
  onTitleChange: (next: string) => void;
  descriptionValue: string;
  onDescriptionChange: (next: string) => void;
  contentValue: string;
  onContentChange: (next: string) => void;
  // SendForm own state from App.tsx
  sendTo: string;
  onSendToChange: (next: string) => void;
  prompt: string;
  onPromptChange: (next: string) => void;
  promptDirty: boolean;
  onPromptDirtyChange: (dirty: boolean) => void;
  // Dispatch error display
  dispatchError: { code: ErrorCode; message: string } | null;
  onDismissError: () => void;
  // Confirm submission
  onConfirm: (dispatchId: string) => void;
  // Dispatch failure callback (App.tsx writes dispatchErrorSig)
  onDispatchError: (code: ErrorCode, message: string) => void;
}

export function SendForm(props: SendFormProps) {
  // ─── Local state for combobox options + binding lookup ─────────
  const [sendToOptions, setSendToOptions] = useState<ComboboxOption[]>([]);
  const [promptOptions, setPromptOptions] = useState<ComboboxOption[]>([]);
  const [boundPrompt, setBoundPrompt] = useState<string | null>(null);
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Refs for debounce timers (popup is the safe context for setTimeout — see CLAUDE.md)
  const platformDetectTimer = useRef<number | null>(null);
  const draftTimer = useRef<number | null>(null);
  const bindingUpsertTimer = useRef<number | null>(null);

  // ─── On mount: fetch history once ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sendToRes = await sendMessage('history.list', { kind: 'sendTo' });
        if (cancelled) return;
        if (sendToRes.ok) setSendToOptions(toOptions(sendToRes.data, 'sendTo'));
        const promptRes = await sendMessage('history.list', { kind: 'prompt' });
        if (cancelled) return;
        if (promptRes.ok) setPromptOptions(toOptions(promptRes.data, 'prompt'));
      } catch {
        // silent — empty list is acceptable initial state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Platform detection debounce (DSP-01: 200ms) ───────────────
  useEffect(() => {
    if (platformDetectTimer.current !== null) {
      window.clearTimeout(platformDetectTimer.current);
    }
    platformDetectTimer.current = window.setTimeout(() => {
      setPlatformId(detectPlatformId(props.sendTo));
    }, 200);
    return () => {
      if (platformDetectTimer.current !== null) {
        window.clearTimeout(platformDetectTimer.current);
      }
    };
  }, [props.sendTo]);

  // ─── popupDraft debounce (D-35: 800ms after any field change) ──
  useEffect(() => {
    if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      void draftRepo.update({
        send_to: props.sendTo,
        prompt: props.prompt,
        title: props.titleValue,
        description: props.descriptionValue,
        content: props.contentValue,
      });
    }, 800);
    return () => {
      if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
    };
  }, [props.sendTo, props.prompt, props.titleValue, props.descriptionValue, props.contentValue]);

  // ─── Binding upsert debounce (D-28: 800ms after prompt idle) ───
  useEffect(() => {
    // Only upsert when BOTH fields non-empty (binding requires both keys)
    if (!props.sendTo || !props.prompt) return;
    if (bindingUpsertTimer.current !== null) {
      window.clearTimeout(bindingUpsertTimer.current);
    }
    bindingUpsertTimer.current = window.setTimeout(() => {
      void sendMessage('binding.upsert', {
        send_to: props.sendTo,
        prompt: props.prompt,
        mark_dispatched: false,
      });
    }, 800);
    return () => {
      if (bindingUpsertTimer.current !== null) {
        window.clearTimeout(bindingUpsertTimer.current);
      }
    };
  }, [props.sendTo, props.prompt]);

  // ─── Soft-overwrite (D-27): when send_to changes, fetch binding ──
  useEffect(() => {
    if (!props.sendTo) {
      setBoundPrompt(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await sendMessage('binding.get', { send_to: props.sendTo });
        if (cancelled) return;
        const bound = res.ok && res.data.entry ? res.data.entry.prompt : null;
        setBoundPrompt(bound);
        // D-27 soft-overwrite semantics: only auto-fill prompt if NOT user-dirty
        if (bound && !props.promptDirty) {
          props.onPromptChange(bound);
        }
      } catch {
        // silent — no binding is acceptable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.sendTo]);

  // ─── handlers ─────────────────────────────────────────────────
  function handleSendToSelect(key: string) {
    // key === HistoryEntry.value — same as the visible label
    props.onSendToChange(key);
  }
  function handlePromptInput(next: string) {
    props.onPromptChange(next);
    if (!props.promptDirty) props.onPromptDirtyChange(true);
  }
  function handlePromptSelect(key: string) {
    props.onPromptChange(key);
    props.onPromptDirtyChange(true);
  }
  function handleSoftOverwriteAccept() {
    if (boundPrompt) {
      props.onPromptChange(boundPrompt);
      props.onPromptDirtyChange(false);
    }
  }
  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    const dispatchId = crypto.randomUUID();
    const input: DispatchStartInput = {
      dispatchId,
      send_to: props.sendTo,
      prompt: props.prompt,
      snapshot: {
        ...props.snapshot,
        title: props.titleValue,
        description: props.descriptionValue,
        content: props.contentValue,
      },
    };
    // Phase 4 D-42/D-44: Permission request in user-gesture context.
    // Only for adapters with no static hostMatches (openclaw = dynamic permission).
    const adapter = findAdapter(props.sendTo);
    if (adapter && adapter.hostMatches.length === 0) {
      const targetOrigin = new URL(props.sendTo).origin;
      const alreadyGranted = await grantedOriginsRepo.has(targetOrigin);
      if (!alreadyGranted) {
        const granted = await chrome.permissions.request({ origins: [targetOrigin + '/*'] });
        if (!granted) {
          setSubmitting(false);
          props.onDispatchError('OPENCLAW_PERMISSION_DENIED', targetOrigin);
          return;
        }
        await grantedOriginsRepo.add(targetOrigin);
      }
    }
    // Notify App so it can render InProgressView immediately
    props.onConfirm(dispatchId);
    try {
      const res = await sendMessage('dispatch.start', input);
      if (res.ok) {
        window.close();
      } else {
        setSubmitting(false);
        props.onDispatchError(res.code, res.message);
      }
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : String(err);
      props.onDispatchError('INTERNAL', msg);
    }
  }

  // ─── Soft-overwrite hint visibility ────────────────────────────
  const showBindingHint =
    boundPrompt !== null &&
    props.promptDirty &&
    props.prompt !== boundPrompt &&
    props.sendTo !== '';

  const sendToHost = (() => {
    try {
      return new URL(props.sendTo).host;
    } catch {
      return props.sendTo;
    }
  })();

  // ─── Confirm enable/disable ────────────────────────────────────
  const confirmEnabled = platformId !== null && props.sendTo !== '' && !submitting;
  const confirmTooltip = confirmEnabled ? undefined : t('error_code_PLATFORM_UNSUPPORTED_body');

  return (
    <main class="flex flex-col p-4 gap-4 min-w-[360px] font-sans" data-testid="popup-sendform">
      {/* Error banner — above everything else */}
      {props.dispatchError && (
        <ErrorBanner
          code={props.dispatchError.code}
          onRetry={() => {
            props.onDismissError();
          }}
          onDismiss={props.onDismissError}
        />
      )}

      {/* Send to combobox */}
      <div class="flex flex-col gap-1">
        <FieldLabel id="popup-field-sendTo" label={t('combobox_send_to_label')} />
        <Combobox
          id="popup-field-sendTo"
          label={t('combobox_send_to_label')}
          value={props.sendTo}
          onChange={props.onSendToChange}
          onSelect={handleSendToSelect}
          options={sendToOptions}
          placeholder={t('combobox_send_to_placeholder')}
          leadingIcon={iconForPlatformId(platformId)}
          emptyStateText={t('history_empty_state')}
        />
      </div>

      {/* Prompt combobox */}
      <div class="flex flex-col gap-1">
        <FieldLabel id="popup-field-prompt" label={t('combobox_prompt_label')} />
        <Combobox
          id="popup-field-prompt"
          label={t('combobox_prompt_label')}
          value={props.prompt}
          onChange={handlePromptInput}
          onSelect={handlePromptSelect}
          options={promptOptions}
          placeholder={t('combobox_prompt_placeholder')}
          emptyStateText={t('history_empty_state')}
        />
      </div>

      {/* Soft-overwrite hint (D-27) — three-segment inline accent on host (Pattern S5) */}
      {showBindingHint && (
        <button
          type="button"
          class="text-left text-xs leading-snug font-normal text-sky-600 dark:text-sky-400 hover:underline underline-offset-2"
          onClick={handleSoftOverwriteAccept}
          data-testid="binding-soft-overwrite"
        >
          {t('binding_use_bound_for_before')}
          <span class="font-mono">{sendToHost}</span>
          {t('binding_use_bound_for_after')}
        </button>
      )}

      {/* Confirm button */}
      <div class="flex justify-end">
        <button
          type="button"
          class={
            confirmEnabled
              ? 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white px-4 py-2 rounded-md text-sm font-semibold'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed px-4 py-2 rounded-md text-sm font-semibold'
          }
          disabled={!confirmEnabled}
          title={confirmTooltip}
          onClick={handleConfirm}
          data-testid="popup-confirm"
        >
          {t('dispatch_confirm_label')}
        </button>
      </div>

      {/* Divider before Phase 2 capture preview region */}
      <hr class="border-slate-200 dark:border-slate-700" />

      {/* Phase 2 capture preview — extracted verbatim into CapturePreview component.
          Spacing kept at gap-3 / px-3 py-2 (Phase 2 inheritance, surgical-changes principle).
          SendForm owns the gap-4 outer layout. */}
      <CapturePreview
        snapshot={props.snapshot}
        titleValue={props.titleValue}
        onTitleChange={props.onTitleChange}
        descriptionValue={props.descriptionValue}
        onDescriptionChange={props.onDescriptionChange}
        contentValue={props.contentValue}
        onContentChange={props.onContentChange}
      />
    </main>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function toOptions(data: HistoryListOutput, kind: 'sendTo' | 'prompt'): ComboboxOption[] {
  return data.entries.map((e) => ({
    key: e.value,
    label: e.value,
    iconVariant: kind === 'sendTo' ? variantFromUrl(e.value) : 'none',
    removable: true,
  }));
}

function variantFromUrl(url: string): ComboboxOption['iconVariant'] {
  const id = detectPlatformId(url);
  if (id === 'mock') return 'mock';
  if (id === 'openclaw') return 'openclaw';
  if (id === 'discord') return 'discord';
  return 'unsupported';
}

function iconForPlatformId(id: string | null): ComboboxOption['iconVariant'] {
  if (id === null) return 'unsupported';
  if (id === 'mock') return 'mock';
  if (id === 'openclaw') return 'openclaw';
  if (id === 'discord') return 'discord';
  return 'unsupported';
}
