/**
 * History repo (D-29 + D-50 closure).
 *
 * Hybrid score: score(entry, now) = exp(-Δt/τ) + 0.3·log(use_count+1)
 *   τ = 7 days (recency half-window)
 *   FREQ_WEIGHT = 0.3 (frequency contribution coefficient)
 *
 * Cap: 50 entries per list (DSP-02 — prevents unbounded growth).
 * Top-N: 8 entries returned by topN* (UI-SPEC §Combobox listbox displays up to 8).
 *
 * resetAllHistory() empties both sendTo + prompt lists atomically (STG-03).
 */
import { sendToHistoryItem, promptHistoryItem, type HistoryEntry } from '@/shared/storage/items';

const TAU_MS = 7 * 24 * 3600 * 1000; // 7 days
const FREQ_WEIGHT = 0.3;
const CAP = 50;
const TOP_N = 8;

export function score(entry: HistoryEntry, nowMs: number): number {
  const age = nowMs - new Date(entry.last_used_at).getTime();
  return Math.exp(-age / TAU_MS) + FREQ_WEIGHT * Math.log(entry.use_count + 1);
}

/** Internal: add to a typed item, dedupe + cap. */
async function addCore(
  item: typeof sendToHistoryItem | typeof promptHistoryItem,
  value: string,
): Promise<void> {
  if (!value) return;
  const all = await item.getValue();
  const idx = all.findIndex((e) => e.value === value);
  const nowIso = new Date().toISOString();
  if (idx >= 0) {
    const existing = all[idx]!;
    all[idx] = { ...existing, last_used_at: nowIso, use_count: existing.use_count + 1 };
  } else {
    all.push({ value, last_used_at: nowIso, use_count: 1 });
  }
  if (all.length > CAP) {
    const nowMs = Date.now();
    all.sort((a, b) => score(b, nowMs) - score(a, nowMs));
    all.length = CAP;
  }
  await item.setValue(all);
}

/** Internal: top-N by score desc. */
async function topNCore(
  item: typeof sendToHistoryItem | typeof promptHistoryItem,
  limit: number = TOP_N,
): Promise<HistoryEntry[]> {
  const all = await item.getValue();
  const nowMs = Date.now();
  return [...all].sort((a, b) => score(b, nowMs) - score(a, nowMs)).slice(0, limit);
}

/** Internal: remove by value. */
async function removeCore(
  item: typeof sendToHistoryItem | typeof promptHistoryItem,
  value: string,
): Promise<number> {
  const all = await item.getValue();
  const next = all.filter((e) => e.value !== value);
  await item.setValue(next);
  return next.length;
}

// ─── Public API ──────────────────────────────────────────────────────────

export async function addSendTo(value: string): Promise<void> {
  return addCore(sendToHistoryItem, value);
}
export async function addPrompt(value: string): Promise<void> {
  return addCore(promptHistoryItem, value);
}
export async function topNSendTo(limit?: number): Promise<HistoryEntry[]> {
  return topNCore(sendToHistoryItem, limit);
}
export async function topNPrompt(limit?: number): Promise<HistoryEntry[]> {
  return topNCore(promptHistoryItem, limit);
}
export async function removeSendTo(value: string): Promise<number> {
  return removeCore(sendToHistoryItem, value);
}
export async function removePrompt(value: string): Promise<number> {
  return removeCore(promptHistoryItem, value);
}

/** STG-03 — resets BOTH lists in a single call (options page Reset button). */
export async function resetAllHistory(): Promise<void> {
  await sendToHistoryItem.setValue([]);
  await promptHistoryItem.setValue([]);
}

/** Constants exported for spec assertions. */
export const HISTORY_CAP = CAP;
export const HISTORY_TOP_N = TOP_N;
