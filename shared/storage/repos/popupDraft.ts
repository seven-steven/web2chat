/**
 * Popup draft repo (D-35 / D-36).
 *
 * Single storage.local item holds entire draft state. Popup mount reads
 * once → initialises 5 signals; idle 800ms debounce writes back via update().
 * dispatch=done clears the draft (D-36); error / cancelled keeps it.
 *
 * **Public contract**:
 *   get():    Promise<PopupDraft | null>  — null when never written (sentinel matches)
 *   update(): Promise<PopupDraft>          — writes real updated_at, returns merged draft
 *   clear():  Promise<void>                — resets to sentinel; next get() returns null
 */
import {
  popupDraftItem,
  POPUP_DRAFT_DEFAULT,
  pendingDispatchItem,
  type PopupDraft,
} from '@/shared/storage/items';
import type { DispatchStartInput } from '@/shared/messaging';

const NEVER_WRITTEN_SENTINEL_ISO = new Date(0).toISOString();

export async function get(): Promise<PopupDraft | null> {
  const current = await popupDraftItem.getValue();
  if (current.updated_at === NEVER_WRITTEN_SENTINEL_ISO) {
    return null;
  }
  return current;
}

export async function update(
  patch: Partial<Omit<PopupDraft, 'schemaVersion' | 'updated_at'>>,
): Promise<PopupDraft> {
  const current = await popupDraftItem.getValue();
  const next: PopupDraft = {
    ...current,
    ...patch,
    schemaVersion: current.schemaVersion,
    updated_at: new Date().toISOString(),
  };
  await popupDraftItem.setValue(next);
  return next;
}

export async function clear(): Promise<void> {
  await popupDraftItem.setValue(POPUP_DRAFT_DEFAULT);
}

export async function savePendingDispatch(input: DispatchStartInput): Promise<void> {
  await pendingDispatchItem.setValue(input);
}

export async function loadPendingDispatch(): Promise<DispatchStartInput | null> {
  return await pendingDispatchItem.getValue();
}

export async function clearPendingDispatch(): Promise<void> {
  await pendingDispatchItem.setValue(null);
}
