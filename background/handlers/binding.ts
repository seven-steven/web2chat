/**
 * Binding RPC handlers (DSP-04 / STG-03).
 * Thin wrappers around shared/storage/repos/binding.
 */
import { Ok, type Result } from '@/shared/messaging';
import type {
  BindingUpsertInput,
  BindingUpsertOutput,
  BindingGetInput,
  BindingGetOutput,
} from '@/shared/messaging';
import * as bindingRepo from '@/shared/storage/repos/binding';

export async function bindingUpsert(
  input: BindingUpsertInput,
): Promise<Result<BindingUpsertOutput>> {
  if (input.resetAll) {
    // STG-03 — empty bindings map.
    await bindingRepo.resetAll();
    return Ok({ send_to: input.send_to, prompt: input.prompt, reset: true });
  }
  const opts =
    input.mark_dispatched !== undefined ? { mark_dispatched: input.mark_dispatched } : undefined;
  const entry = await bindingRepo.upsert(input.send_to, input.prompt, opts);
  return Ok({ send_to: entry.send_to, prompt: entry.prompt, reset: false });
}

export async function bindingGet(input: BindingGetInput): Promise<Result<BindingGetOutput>> {
  const entry = await bindingRepo.get(input.send_to);
  return Ok({ entry });
}
