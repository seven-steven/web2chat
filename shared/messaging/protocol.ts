import { defineExtensionMessaging } from '@webext-core/messaging';
import { z } from 'zod';
import type { MetaSchema } from '@/shared/storage';
import type { Result } from './result';

/**
 * RPC ProtocolMap (D-07).
 *
 * Phase 1: single route — meta.bumpHello.
 * Phase 3 will split this file into shared/messaging/routes/{capture,dispatch,history,...}.ts
 * once route count > 5; protocol.ts will re-export the union.
 */
export interface ProtocolMap {
  'meta.bumpHello'(): Promise<Result<MetaSchema>>;
}

/**
 * zod schemas for runtime validation at the SW handler boundary (FND-03).
 *  - input  validated INSIDE the handler before business logic
 *  - output validated AFTER business logic in tests / contract checks
 */
export const schemas = {
  'meta.bumpHello': {
    input: z.void(),
    output: z.object({
      schemaVersion: z.literal(1),
      helloCount: z.number().int().nonnegative(),
    }),
  },
} as const;

export type MetaBumpHelloOutput = z.infer<(typeof schemas)['meta.bumpHello']['output']>;

/**
 * Typed extension messaging (D-05). Both popup and SW import sendMessage / onMessage from here.
 * Background entrypoint registers the actual handler at module top level.
 */
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
