/**
 * Mock platform stub adapter (D-23).
 *
 * Phase 3 only — Phase 4/5 replace with real OpenClaw / Discord adapters by
 * appending entries to shared/adapters/registry.ts and creating their own
 * entrypoints/<platform>.content.ts files.
 *
 * This stub:
 *   1. Registers a one-shot chrome.runtime.onMessage listener for ADAPTER_DISPATCH
 *   2. Parses the send_to URL's query string for failure-injection hooks:
 *      ?fail=not-logged-in       -> Err('NOT_LOGGED_IN')
 *      ?fail=input-not-found     -> Err('INPUT_NOT_FOUND')
 *      ?fail=timeout             -> Err('TIMEOUT')
 *      ?fail=rate-limited        -> Err('RATE_LIMITED')
 *      no ?fail param            -> Ok(void) — happy path
 *   3. On success: console.log compose + send (NOT real DOM injection — Phase 4/5 only)
 *
 * CRITICAL — Production exclusion: mock-platform is a dev/test artifact.
 * Guard main() with `if (!import.meta.env.DEV) return;` to ensure even if WXT
 * bundles this entrypoint into production, the listener never registers.
 * verify-manifest does NOT need to assert this (the bundle file existing in
 * dist is harmless — only its runtime activation matters).
 */
import { defineContentScript } from '#imports';

interface AdapterDispatchMessage {
  type: 'ADAPTER_DISPATCH';
  payload: {
    dispatchId: string;
    send_to: string;
    prompt: string;
    snapshot: {
      title: string;
      url: string;
      description: string;
      create_at: string;
      content: string;
    };
  };
}

interface AdapterDispatchResponse {
  ok: boolean;
  code?: 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'INTERNAL';
  message?: string;
  retriable?: boolean;
}

function isAdapterDispatch(msg: unknown): msg is AdapterDispatchMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as { type: unknown }).type === 'ADAPTER_DISPATCH'
  );
}

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    // Production exclusion: refuse to register listener in non-dev builds.
    if (!import.meta.env.DEV) return;

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      const { send_to, prompt, dispatchId } = msg.payload;

      // Failure-injection hooks for Phase 3 e2e (CONTEXT.md "stub adapter failure injection path")
      let failParam: string | null = null;
      try {
        failParam = new URL(send_to).searchParams.get('fail');
      } catch {
        // malformed URL -> treat as success path
      }

      let response: AdapterDispatchResponse;
      switch (failParam) {
        case 'not-logged-in':
          response = { ok: false, code: 'NOT_LOGGED_IN', message: 'mock', retriable: false };
          break;
        case 'input-not-found':
          response = { ok: false, code: 'INPUT_NOT_FOUND', message: 'mock', retriable: true };
          break;
        case 'timeout':
          response = { ok: false, code: 'TIMEOUT', message: 'mock', retriable: true };
          break;
        case 'rate-limited':
          response = { ok: false, code: 'RATE_LIMITED', message: 'mock', retriable: true };
          break;
        default:
          // Happy path — log compose + send, return Ok.
          console.log('[mock-platform] compose', { dispatchId, send_to, prompt });
          console.log('[mock-platform] send (mocked)');
          response = { ok: true };
      }

      sendResponse(response);
      return true; // keep channel open for async response
    });
  },
});
