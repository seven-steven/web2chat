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
  onSpaHistoryStateUpdated,
} from '@/background/dispatch-pipeline';
import { historyList, historyDelete } from '@/background/handlers/history';
import { bindingUpsert, bindingGet } from '@/background/handlers/binding';
// ─── Phase 8 imports: registry-driven MAIN bridge + SPA filter ───────────
import { adapterRegistry, buildSpaUrlFilters } from '@/shared/adapters/registry';
import { mainWorldInjectors } from '@/background/main-world-registry';

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

/** Port name prefix for generic MAIN world bridge (D-101). */
const MAIN_WORLD_PORT_PREFIX = 'WEB2CHAT_MAIN_WORLD:';

/** SPA URL filters built from registry (D-103, D-104, D-105). */
const spaFilters = buildSpaUrlFilters(adapterRegistry);

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

  // ───────── Phase 8: Generic MAIN world bridge (D-99..D-102) ─────────
  // Routes by WEB2CHAT_MAIN_WORLD:<platformId> prefix. Injector function
  // looked up from registry-driven mainWorldInjectors map.
  chrome.runtime.onConnect.addListener((port) => {
    if (!port.name.startsWith(MAIN_WORLD_PORT_PREFIX)) return;
    const platformId = port.name.slice(MAIN_WORLD_PORT_PREFIX.length);

    port.onMessage.addListener((msg, senderPort) => {
      const tabId = senderPort.sender?.tab?.id;
      const text = typeof msg?.text === 'string' ? msg.text : null;
      if (typeof tabId !== 'number') {
        port.postMessage({ ok: false, message: 'Missing sender tab id' });
        port.disconnect();
        return;
      }
      if (text === null) {
        port.postMessage({ ok: false, message: 'Missing paste text' });
        port.disconnect();
        return;
      }

      // Look up injector from registry-driven map (D-100)
      const injector = mainWorldInjectors.get(platformId);
      if (!injector) {
        port.postMessage({ ok: false, message: `No injector for platform: ${platformId}` });
        port.disconnect();
        return;
      }

      void chrome.scripting
        .executeScript({
          target: { tabId },
          world: 'MAIN',
          func: injector,
          args: [text],
        })
        .then((results) => {
          port.postMessage({ ok: results[0]?.result === true });
          port.disconnect();
        })
        .catch((err: unknown) => {
          port.postMessage({
            ok: false,
            message: err instanceof Error ? err.message : String(err),
          });
          port.disconnect();
        });
    });
  });

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

  // ───────── Phase 8: Dynamic SPA routing from registry (D-103..D-106) ─────────
  // SPA filter dynamically built from adapterRegistry entries with spaNavigationHosts.
  // Uses dedicated onSpaHistoryStateUpdated handler (D-106), not direct onTabComplete reuse.
  if (spaFilters.length > 0) {
    chrome.webNavigation.onHistoryStateUpdated.addListener(
      onSpaHistoryStateUpdated,
      { url: spaFilters },
    );
  }
});
