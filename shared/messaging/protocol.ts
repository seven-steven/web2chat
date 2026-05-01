import { defineExtensionMessaging } from '@webext-core/messaging';
import { z } from 'zod';
import type { MetaSchema } from '@/shared/storage';
import type { Result } from './result';
import type { ProtocolCapture } from './routes/capture';
import type { ProtocolDispatch } from './routes/dispatch';
import type { ProtocolHistory } from './routes/history';
import type { ProtocolBinding } from './routes/binding';
import { captureSchemas } from './routes/capture';
import { dispatchSchemas } from './routes/dispatch';
import { historySchemas } from './routes/history';
import { bindingSchemas } from './routes/binding';

interface ProtocolMeta {
  'meta.bumpHello'(): Promise<Result<MetaSchema>>;
}

export type ProtocolMap = ProtocolMeta &
  ProtocolCapture &
  ProtocolDispatch &
  ProtocolHistory &
  ProtocolBinding;

const metaSchemas = {
  'meta.bumpHello': {
    input: z.void(),
    output: z.object({
      schemaVersion: z.literal(1),
      helloCount: z.number().int().nonnegative(),
    }),
  },
} as const;

export const schemas = {
  ...metaSchemas,
  ...captureSchemas,
  ...dispatchSchemas,
  ...historySchemas,
  ...bindingSchemas,
} as const;

export type MetaBumpHelloOutput = z.infer<(typeof schemas)['meta.bumpHello']['output']>;

/** Re-export ArticleSnapshot from capture route to preserve Phase 1+2 import paths. */
export { ArticleSnapshotSchema } from './routes/capture';
export type { ArticleSnapshot } from './routes/capture';

/**
 * Typed extension messaging (D-05). Both popup and SW import sendMessage / onMessage from here.
 * Background entrypoint registers the actual handler at module top level.
 */
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
