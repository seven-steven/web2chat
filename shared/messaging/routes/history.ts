import { z } from 'zod';
import type { Result } from '../result';

/** Which history list — send_to URLs or prompt strings. */
export const HistoryKindEnum = z.enum(['sendTo', 'prompt']);
export type HistoryKind = z.infer<typeof HistoryKindEnum>;

export const HistoryEntrySchema = z.object({
  value: z.string().max(10_000),
  last_used_at: z.string().datetime(),
  use_count: z.number().int().nonnegative(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

/** D-29 score-ordered top-N list (default N=8 by repo). */
export const HistoryListInputSchema = z.object({
  kind: HistoryKindEnum,
  limit: z.number().int().positive().max(50).optional(),
});
export type HistoryListInput = z.infer<typeof HistoryListInputSchema>;
export const HistoryListOutputSchema = z.object({
  kind: HistoryKindEnum,
  entries: z.array(HistoryEntrySchema),
});
export type HistoryListOutput = z.infer<typeof HistoryListOutputSchema>;

/** Single-entry delete OR full reset (STG-03). resetAll=true ignores `value`. */
export const HistoryDeleteInputSchema = z.object({
  kind: HistoryKindEnum,
  value: z.string().max(10_000).optional(),
  resetAll: z.boolean().optional(),
});
export type HistoryDeleteInput = z.infer<typeof HistoryDeleteInputSchema>;
export const HistoryDeleteOutputSchema = z.object({
  kind: HistoryKindEnum,
  remaining: z.number().int().nonnegative(),
});
export type HistoryDeleteOutput = z.infer<typeof HistoryDeleteOutputSchema>;

export interface ProtocolHistory {
  'history.list'(input: HistoryListInput): Promise<Result<HistoryListOutput>>;
  'history.delete'(input: HistoryDeleteInput): Promise<Result<HistoryDeleteOutput>>;
}

export const historySchemas = {
  'history.list': { input: HistoryListInputSchema, output: HistoryListOutputSchema },
  'history.delete': { input: HistoryDeleteInputSchema, output: HistoryDeleteOutputSchema },
} as const;
