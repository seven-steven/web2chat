/**
 * History RPC handlers (DSP-02 / DSP-03 / STG-03).
 * Thin wrappers around shared/storage/repos/history.
 */
import { Ok, Err, type Result } from '@/shared/messaging';
import type {
  HistoryListInput,
  HistoryListOutput,
  HistoryDeleteInput,
  HistoryDeleteOutput,
} from '@/shared/messaging';
import * as historyRepo from '@/shared/storage/repos/history';

export async function historyList(input: HistoryListInput): Promise<Result<HistoryListOutput>> {
  const entries =
    input.kind === 'sendTo'
      ? await historyRepo.topNSendTo(input.limit)
      : await historyRepo.topNPrompt(input.limit);
  return Ok({ kind: input.kind, entries });
}

export async function historyDelete(
  input: HistoryDeleteInput,
): Promise<Result<HistoryDeleteOutput>> {
  if (input.resetAll) {
    // STG-03 — single call resets BOTH lists per repo signature.
    await historyRepo.resetAllHistory();
    return Ok({ kind: input.kind, remaining: 0 });
  }
  if (typeof input.value !== 'string' || input.value.length === 0) {
    return Err('INTERNAL', 'history.delete requires `value` when resetAll is not set', false);
  }
  const remaining =
    input.kind === 'sendTo'
      ? await historyRepo.removeSendTo(input.value)
      : await historyRepo.removePrompt(input.value);
  return Ok({ kind: input.kind, remaining });
}
