/**
 * Binding repo (D-27 / D-28 / D-50 closure).
 *
 * Storage shape: Record<send_to, BindingEntry>.
 * One row per send_to. Idle 800ms debounce in popup triggers upsert (D-28).
 * `mark_dispatched: true` sets last_dispatched_at = ISO-8601 now;
 * otherwise it preserves the existing timestamp or 'never-dispatched-marker'.
 */
import { bindingsItem, type BindingEntry } from '@/shared/storage/items';

const NEVER_MARKER = 'never-dispatched-marker';

export async function upsert(
  send_to: string,
  prompt: string,
  options: { mark_dispatched?: boolean } = {},
): Promise<BindingEntry> {
  if (!send_to) throw new Error('binding.upsert: send_to is required');
  const all = await bindingsItem.getValue();
  const existing = all[send_to];
  const nowIso = new Date().toISOString();
  const last_dispatched_at = options.mark_dispatched
    ? nowIso
    : (existing?.last_dispatched_at ?? NEVER_MARKER);
  const entry: BindingEntry = { send_to, prompt, last_dispatched_at };
  all[send_to] = entry;
  await bindingsItem.setValue(all);
  return entry;
}

export async function get(send_to: string): Promise<BindingEntry | null> {
  const all = await bindingsItem.getValue();
  return all[send_to] ?? null;
}

export async function resetAll(): Promise<void> {
  await bindingsItem.setValue({});
}

export const NEVER_DISPATCHED_MARKER = NEVER_MARKER;
