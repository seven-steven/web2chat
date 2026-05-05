import { defineBackground } from '#imports';
import { onMessage, schemas, Ok, Err, type Result } from '@/shared/messaging';
import { metaItem } from '@/shared/storage';
import { runCapturePipeline } from '@/background/capture-pipeline';
// ─── Phase 3 imports ──────────────────────────────────────────────────────
import {
  startDispatch,
  cancelDispatch,
  onTabComplete,
  onAlarmFired,
} from '@/background/dispatch-pipeline';
import { historyList, historyDelete } from '@/background/handlers/history';
import { bindingUpsert, bindingGet } from '@/background/handlers/binding';

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
 * Two shapes supported:
 *   wrapHandler(fn)            -> fn: () => Promise<Result<T>>          (Phase 1+2, no input)
 *   wrapHandler(fn)            -> fn: (input: I) => Promise<Result<T>>  (Phase 3, with input)
 *
 * @webext-core/messaging v2.3.0 delivers a Message envelope to handlers:
 *   onMessage<TType>(type, (message: { id, data, type, timestamp, sender }) => ...)
 *
 * Phase 3 registration sites use:
 *   onMessage('dispatch.start', wrapHandler((msg: { data: I }) => myHandler(msg.data)))
 *
 * Verified against `node_modules/@webext-core/messaging/lib/generic-683db69b.d.ts`
 * (see interfaces section at top of this plan).
 */
function wrapHandler<T>(fn: () => Promise<Result<T>>): () => Promise<Result<T>>;
function wrapHandler<I, T>(fn: (input: I) => Promise<Result<T>>): (input: I) => Promise<Result<T>>;
function wrapHandler<I, T>(
  fn: ((input: I) => Promise<Result<T>>) | (() => Promise<Result<T>>),
): ((input: I) => Promise<Result<T>>) | (() => Promise<Result<T>>) {
  return async (...args: [I] | []) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (fn as any)(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[bg] handler threw — converting to Err(INTERNAL):', err);
      return Err('INTERNAL', message, false);
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

  // ───────── Phase 3: dispatch RPCs (DSP-05..DSP-09) ─────────
  // @webext-core/messaging passes the message envelope { data, sender, ... } to
  // handlers; we extract data and forward to the typed handler. (Per the v2.3.0
  // .d.ts cited above.)
  onMessage(
    'dispatch.start',
    wrapHandler((msg: { data: Parameters<typeof startDispatch>[0] }) => startDispatch(msg.data)),
  );
  onMessage(
    'dispatch.cancel',
    wrapHandler((msg: { data: Parameters<typeof cancelDispatch>[0] }) => cancelDispatch(msg.data)),
  );

  // ───────── Phase 3: history + binding RPCs (DSP-02..DSP-04, STG-03) ─────────
  onMessage(
    'history.list',
    wrapHandler((msg: { data: Parameters<typeof historyList>[0] }) => historyList(msg.data)),
  );
  onMessage(
    'history.delete',
    wrapHandler((msg: { data: Parameters<typeof historyDelete>[0] }) => historyDelete(msg.data)),
  );
  onMessage(
    'binding.upsert',
    wrapHandler((msg: { data: Parameters<typeof bindingUpsert>[0] }) => bindingUpsert(msg.data)),
  );
  onMessage(
    'binding.get',
    wrapHandler((msg: { data: Parameters<typeof bindingGet>[0] }) => bindingGet(msg.data)),
  );

  // ───────── Phase 3: SW wake-up entries (D-33) ─────────
  // Both listeners must be registered top-level. tabs.onUpdated wakes SW after
  // navigation; alarms.onAlarm wakes for timeouts + badge clears. The handler
  // functions read from chrome.storage.session (no module-scope state).
  chrome.tabs.onUpdated.addListener(onTabComplete);
  chrome.alarms.onAlarm.addListener(onAlarmFired);

  // ───────── Phase 5: Discord SPA routing (D-66) ─────────
  // Discord is a SPA — channel switches use history.pushState, not full navigation.
  // This listener fires for pushState on discord.com, allowing the dispatch pipeline
  // to detect that the target channel has loaded after a SPA transition.
  chrome.webNavigation.onHistoryStateUpdated.addListener(
    (details) => {
      // Re-use the same handler as tabs.onUpdated — it reads dispatch state from
      // storage.session and checks if the tab + URL match a pending dispatch.
      void onTabComplete(details.tabId, { status: 'complete' }, { url: details.url } as chrome.tabs.Tab);
    },
    { url: [{ hostSuffix: 'discord.com' }] },
  );
});
