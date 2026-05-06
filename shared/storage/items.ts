import { storage } from 'wxt/utils/storage';
import { CURRENT_SCHEMA_VERSION, migrations } from './migrate';
import type { DispatchStartInput } from '@/shared/messaging';

export interface MetaSchema {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  helloCount: number;
}

export const META_DEFAULT: MetaSchema = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  helloCount: 0,
};

export const metaItem = storage.defineItem<MetaSchema>('local:meta', {
  fallback: META_DEFAULT,
  version: CURRENT_SCHEMA_VERSION,
  migrations,
});

// ─── Phase 3 schema interfaces (D-29 / D-35) ──────────────────────────────

/** Single history entry — applies to both sendTo URL list and prompt list (D-29). */
export interface HistoryEntry {
  value: string;
  last_used_at: string; // ISO-8601
  use_count: number;
}

/** send_to ↔ prompt binding (D-27, D-28). One row per send_to. */
export interface BindingEntry {
  send_to: string;
  prompt: string;
  /** ISO-8601 OR the literal 'never-dispatched-marker' (D-28 idle upsert before any dispatch). */
  last_dispatched_at: string;
}

/** Single popupDraft record (D-35). Empty strings = no draft for that field.
 *  The sentinel `updated_at === new Date(0).toISOString()` indicates "never written" —
 *  the popupDraft repo's get() business method (repos/popupDraft.ts) returns null in
 *  that case so callers (Plan 06 popup mount) can `if (draftRes) { ... }` cleanly.
 *
 *  `url` records the captured-page URL when title/description/content were last
 *  written, so popup mount can scope draft restoration of capture fields to the
 *  same page (popup-stale-capture fix). Empty string = no URL recorded
 *  (legacy drafts written before the URL field was introduced).
 */
export interface PopupDraft {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  send_to: string;
  prompt: string;
  title: string;
  description: string;
  content: string;
  url: string;
  /** Optional in-flight dispatchId hint — popup writes here before window.close (D-35). */
  dispatch_id_hint?: string;
  updated_at: string; // ISO-8601 — sentinel new Date(0).toISOString() means "never written"
}

/** Sentinel default for popupDraft. The `updated_at` epoch-zero value distinguishes
 *  "never persisted" from "valid draft" — repos/popupDraft.ts reads this sentinel and
 *  returns null from get() so Plan 06 mount logic stays clean. */
export const POPUP_DRAFT_DEFAULT: PopupDraft = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  send_to: '',
  prompt: '',
  title: '',
  description: '',
  content: '',
  url: '',
  updated_at: new Date(0).toISOString(),
};

// ─── Phase 3 typed items (D-50 storage discipline) ────────────────────────
//
// All four storage.local items pass `migrations: { 1: (prev) => prev }` (no-op identity
// migration) for parity with Phase 1's metaItem. This eliminates the WXT 0.20.x
// "migration is required when version is set" runtime warning and gives us a future-proof
// hook when v2 schema changes ship.

/** D-29: send_to URL history (storage.local; cap=50; ordered by hybrid score in repo). */
export const sendToHistoryItem = storage.defineItem<HistoryEntry[]>('local:sendToHistory', {
  fallback: [],
  version: CURRENT_SCHEMA_VERSION,
  migrations: { 1: (prev) => prev },
});

/** D-29: prompt text history (storage.local; cap=50; ordered by hybrid score in repo). */
export const promptHistoryItem = storage.defineItem<HistoryEntry[]>('local:promptHistory', {
  fallback: [],
  version: CURRENT_SCHEMA_VERSION,
  migrations: { 1: (prev) => prev },
});

/** D-27/D-28: send_to ↔ prompt bindings (storage.local; map keyed by send_to). */
export const bindingsItem = storage.defineItem<Record<string, BindingEntry>>('local:bindings', {
  fallback: {},
  version: CURRENT_SCHEMA_VERSION,
  migrations: { 1: (prev) => prev },
});

/** D-35: single popupDraft record (storage.local; survives popup close + SW restart).
 *  The fallback uses the epoch-zero sentinel — repos/popupDraft.ts get() returns null
 *  when this sentinel matches, distinguishing "never written" from "valid empty draft". */
export const popupDraftItem = storage.defineItem<PopupDraft>('local:popupDraft', {
  fallback: POPUP_DRAFT_DEFAULT,
  version: CURRENT_SCHEMA_VERSION,
  migrations: { 1: (prev) => prev },
});

/** D-31: pointer to currently-active dispatchId (storage.session). null when idle.
 *  Note: per-record dispatch:<id> writes go through repos/dispatch.ts directly,
 *  NOT through defineItem (Pattern 2 — avoid race-condition collection).
 *  Session storage has no migration semantics, so no `migrations` field. */
export const activeDispatchPointerItem = storage.defineItem<string | null>(
  'session:dispatchActive',
  {
    fallback: null,
  },
);

/** D-45: granted origins for dynamic host_permissions (storage.local).
 *  Phase 4 — OpenClaw self-deployed origins authorized via chrome.permissions.request. */
export const grantedOriginsItem = storage.defineItem<string[]>('local:grantedOrigins', {
  fallback: [],
  version: CURRENT_SCHEMA_VERSION,
  migrations: { 1: (prev) => prev },
});

/** Pending dispatch intent — saved before chrome.permissions.request so
 *  popup can resume on reopen if closed by the permission dialog or new tab.
 *  null = no pending intent. */
export const pendingDispatchItem = storage.defineItem<DispatchStartInput | null>(
  'local:pendingDispatch',
  { fallback: null },
);
