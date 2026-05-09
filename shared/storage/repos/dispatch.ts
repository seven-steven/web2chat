/**
 * Dispatch repo — per-key session writes (Pattern 2 race-condition mitigation).
 *
 * Each dispatch record lives at its own key `dispatch:<dispatchId>` in
 * chrome.storage.session. We deliberately do NOT use defineItem<DispatchRecord[]>
 * or defineItem<Record<id, Record>> because chrome.storage has no transactions —
 * concurrent dispatches on a single collection key would race.
 *
 * The `dispatch:active` pointer (single string | null) goes through the
 * typed activeDispatchPointerItem in items.ts.
 */
import { activeDispatchPointerItem } from '@/shared/storage/items';
import type { ArticleSnapshot, ErrorCode, DispatchState } from '@/shared/messaging';
import type { PlatformId } from '@/shared/adapters/types';

/** D-31 state machine record. */
export interface DispatchRecord {
  schemaVersion: 1;
  dispatchId: string;
  state: DispatchState;
  target_tab_id: number | null;
  send_to: string;
  prompt: string;
  snapshot: ArticleSnapshot;
  platform_id: PlatformId;
  started_at: string;
  last_state_at: string;
  error?: { code: ErrorCode; message: string; retriable: boolean };
}

const PREFIX = 'dispatch:';
const ACTIVE_KEY = `${PREFIX}active`;

const recordKey = (id: string): string => `${PREFIX}${id}`;

export async function set(record: DispatchRecord): Promise<void> {
  await chrome.storage.session.set({ [recordKey(record.dispatchId)]: record });
}

export async function get(dispatchId: string): Promise<DispatchRecord | undefined> {
  const k = recordKey(dispatchId);
  const all = await chrome.storage.session.get(k);
  return all[k] as DispatchRecord | undefined;
}

export async function remove(dispatchId: string): Promise<void> {
  await chrome.storage.session.remove(recordKey(dispatchId));
}

export async function listAll(): Promise<DispatchRecord[]> {
  const all = await chrome.storage.session.get(null);
  const out: DispatchRecord[] = [];
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(PREFIX)) continue;
    if (key === ACTIVE_KEY) continue;
    out.push(value as DispatchRecord);
  }
  return out;
}

export async function setActive(dispatchId: string | null): Promise<void> {
  await activeDispatchPointerItem.setValue(dispatchId);
}

export async function getActive(): Promise<string | null> {
  return activeDispatchPointerItem.getValue();
}

export async function clearActive(): Promise<void> {
  await activeDispatchPointerItem.setValue(null);
}

export const DISPATCH_KEY_PREFIX = PREFIX;
export const DISPATCH_ACTIVE_KEY = ACTIVE_KEY;
