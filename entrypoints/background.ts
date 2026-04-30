import { defineBackground } from '#imports';
import { onMessage, schemas, Ok, Err } from '@/shared/messaging';
import { metaItem } from '@/shared/storage';
import { runCapturePipeline } from '@/background/capture-pipeline';

/**
 * Service Worker entrypoint.
 *
 * MV3 + WXT contract (FND-02 + PITFALLS §陷阱 3/4):
 *   - All chrome.runtime.* listeners are registered SYNCHRONOUSLY at module top level
 *     of the function passed to defineBackground.
 *   - NO `await` appears before listener registration.
 *   - handlers READ state from chrome.storage.local each invocation — they do NOT
 *     rely on module-scope variables (which vanish on SW restart).
 *
 * Mixed error model (D-06):
 *   - Business errors return Err(code, message, retriable)
 *   - Programmer errors / chrome.* surprises throw — wrapHandler catches and
 *     converts to Err('INTERNAL', err.message, false).
 *
 * Phase 1 ErrorCode is just 'INTERNAL'. Future phases (DSP-07, ADO-05, etc.)
 * extend the union and may map specific business errors here.
 *
 * Import path note: WXT 0.20.x exposes `defineBackground` via `#imports`
 * (auto-imports). The older `wxt/sandbox` module path used in earlier WXT minors
 * is NOT valid on 0.20.25 and will fail at build time.
 */

/**
 * Wraps a handler so any thrown error becomes an Err('INTERNAL', ...).
 *
 * Generic over the Result<T> the handler resolves to. Phase 1's single route
 * resolves to Result<MetaSchema>; future phases follow the same pattern.
 */
function wrapHandler<R>(fn: () => Promise<R>): () => Promise<R> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[bg] handler threw — converting to Err(INTERNAL):', err);
      return Err('INTERNAL', message, false) as R;
    }
  };
}

export default defineBackground(() => {
  // ────────────────────────────────────────────────────────────────────────
  // TOP-LEVEL LISTENER REGISTRATION (sync, no await before this point)
  // ────────────────────────────────────────────────────────────────────────

  onMessage(
    'meta.bumpHello',
    wrapHandler(async () => {
      // (FND-03) Validate input — bumpHello takes no args, so just assert.
      schemas['meta.bumpHello'].input.parse(undefined);

      // (D-08) Read → +1 → write → return.
      const current = await metaItem.getValue();
      const next = { schemaVersion: 1 as const, helloCount: current.helloCount + 1 };
      await metaItem.setValue(next);

      // (FND-03) Validate output before returning.
      const validated = schemas['meta.bumpHello'].output.parse(next);
      return Ok(validated);
    }),
  );

  // Phase 2 (CAP-01..CAP-04, D-15..D-17): SW-side capture orchestration.
  // Listener registered synchronously at module top level — no await before this.
  onMessage('capture.run', wrapHandler(runCapturePipeline));

  // Future phases register additional listeners here at top level
  // (chrome.runtime.onInstalled, chrome.tabs.onUpdated, chrome.alarms.onAlarm, etc.).
});
