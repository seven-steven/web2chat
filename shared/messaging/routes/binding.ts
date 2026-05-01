import { z } from 'zod';
import type { Result } from '../result';

export const BindingEntrySchema = z.object({
  send_to: z.string().url().max(2048),
  prompt: z.string().max(10_000),
  last_dispatched_at: z.string(), // 'never-dispatched-marker' or ISO-8601
});
export type BindingEntry = z.infer<typeof BindingEntrySchema>;

/** D-28: idle-debounce upsert from popup. */
export const BindingUpsertInputSchema = z.object({
  send_to: z.string().url().max(2048),
  prompt: z.string().max(10_000),
  mark_dispatched: z.boolean().optional(),
  resetAll: z.boolean().optional(),
});
export type BindingUpsertInput = z.infer<typeof BindingUpsertInputSchema>;
export const BindingUpsertOutputSchema = z.object({
  send_to: z.string().max(2048),
  prompt: z.string().max(10_000),
  reset: z.boolean(),
});
export type BindingUpsertOutput = z.infer<typeof BindingUpsertOutputSchema>;

/** D-27: lookup the bound prompt for a given send_to. */
export const BindingGetInputSchema = z.object({
  send_to: z.string().url().max(2048),
});
export type BindingGetInput = z.infer<typeof BindingGetInputSchema>;
/** Returns null in `entry` when no binding exists. */
export const BindingGetOutputSchema = z.object({
  entry: BindingEntrySchema.nullable(),
});
export type BindingGetOutput = z.infer<typeof BindingGetOutputSchema>;

export interface ProtocolBinding {
  'binding.upsert'(input: BindingUpsertInput): Promise<Result<BindingUpsertOutput>>;
  'binding.get'(input: BindingGetInput): Promise<Result<BindingGetOutput>>;
}

export const bindingSchemas = {
  'binding.upsert': { input: BindingUpsertInputSchema, output: BindingUpsertOutputSchema },
  'binding.get': { input: BindingGetInputSchema, output: BindingGetOutputSchema },
} as const;
