import { defineExtensionMessaging } from '@webext-core/messaging';
import { z } from 'zod';
import type { MetaSchema } from '@/shared/storage';
import type { Result } from './result';

// ─── Phase 2: ArticleSnapshot ────────────────────────────────────────────────

// Caps prevent oversize pages from (a) blowing past chrome.scripting.executeScript's
// structuredClone limits and (b) freezing the popup textareas. The pipeline returns
// Err('INTERNAL', 'Invalid snapshot: ...') on overflow — recoverable for the user.
export const ArticleSnapshotSchema = z.object({
  title: z.string().max(500),
  url: z.string().url().max(2048),
  description: z.string().max(2000),
  create_at: z.string().datetime(),
  content: z.string().max(200_000), // ~200KB Markdown — room for very long articles
});

export type ArticleSnapshot = z.infer<typeof ArticleSnapshotSchema>;

/**
 * RPC ProtocolMap (D-07).
 *
 * Phase 1: single route — meta.bumpHello.
 * Phase 3 will split this file into shared/messaging/routes/{capture,dispatch,history,...}.ts
 * once route count > 5; protocol.ts will re-export the union.
 */
export interface ProtocolMap {
  'meta.bumpHello'(): Promise<Result<MetaSchema>>;
  'capture.run'(): Promise<Result<ArticleSnapshot>>;
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
  'capture.run': {
    input: z.void(),
    output: ArticleSnapshotSchema,
  },
} as const;

export type MetaBumpHelloOutput = z.infer<(typeof schemas)['meta.bumpHello']['output']>;

/**
 * Typed extension messaging (D-05). Both popup and SW import sendMessage / onMessage from here.
 * Background entrypoint registers the actual handler at module top level.
 */
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
