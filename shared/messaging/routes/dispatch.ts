import { z } from 'zod';
import type { Result } from '../result';
import { ArticleSnapshotSchema } from './capture';

/** dispatch.start input — popup-generated UUID + payload (D-32). */
export const DispatchStartInputSchema = z.object({
  dispatchId: z.string().uuid(),
  send_to: z.string().url().max(2048),
  prompt: z.string().max(10_000),
  snapshot: ArticleSnapshotSchema,
});
export type DispatchStartInput = z.infer<typeof DispatchStartInputSchema>;

export const DispatchStateEnum = z.enum([
  'pending',
  'opening',
  'awaiting_complete',
  'awaiting_adapter',
  'done',
  'error',
  'cancelled',
]);
export type DispatchState = z.infer<typeof DispatchStateEnum>;

export const DispatchStartOutputSchema = z.object({
  dispatchId: z.string().uuid(),
  state: DispatchStateEnum,
});
export type DispatchStartOutput = z.infer<typeof DispatchStartOutputSchema>;

export const DispatchCancelInputSchema = z.object({
  dispatchId: z.string().uuid(),
});
export type DispatchCancelInput = z.infer<typeof DispatchCancelInputSchema>;

export const DispatchCancelOutputSchema = z.object({
  dispatchId: z.string().uuid(),
  state: DispatchStateEnum,
});
export type DispatchCancelOutput = z.infer<typeof DispatchCancelOutputSchema>;

export interface ProtocolDispatch {
  'dispatch.start'(input: DispatchStartInput): Promise<Result<DispatchStartOutput>>;
  'dispatch.cancel'(input: DispatchCancelInput): Promise<Result<DispatchCancelOutput>>;
}

export const dispatchSchemas = {
  'dispatch.start': { input: DispatchStartInputSchema, output: DispatchStartOutputSchema },
  'dispatch.cancel': { input: DispatchCancelInputSchema, output: DispatchCancelOutputSchema },
} as const;
