import { z } from 'zod';
import type { Result } from '../result';

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

export interface ProtocolCapture {
  'capture.run'(): Promise<Result<ArticleSnapshot>>;
}

export const captureSchemas = {
  'capture.run': { input: z.void(), output: ArticleSnapshotSchema },
} as const;
