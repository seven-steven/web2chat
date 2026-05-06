import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Injection guard tests.
 *
 * Each dispatch calls chrome.scripting.executeScript to inject the content script,
 * which re-runs main() and registers a new onMessage listener.
 * After N dispatches, N listeners accumulate — all respond to ADAPTER_DISPATCH,
 * causing N concurrent handleDispatch calls (N pastes, N Enters, N confirmations).
 *
 * The guard (globalThis.__web2chat_<adapter>_registered) prevents duplicate
 * listener registration so only one handleDispatch runs per message.
 */

function createMockChrome() {
  const listeners: Array<(msg: any, sender: any, sendResponse: any) => boolean> = [];
  return {
    onMessage: {
      addListener: vi.fn((fn: (msg: any, sender: any, sendResponse: any) => boolean) => {
        listeners.push(fn);
      }),
    },
    runtime: {
      onMessage: {
        addListener: vi.fn((fn: (msg: any, sender: any, sendResponse: any) => boolean) => {
          listeners.push(fn);
        }),
      },
      connect: vi.fn(),
    },
    _listeners: listeners,
  };
}

/**
 * Simulates the guard pattern used in content scripts.
 * This mirrors the actual code in each adapter's main() function.
 */
function simulateMain(
  globalThis: Record<string, any>,
  chrome: ReturnType<typeof createMockChrome>,
) {
  const GUARD = '__web2chat_discord_registered';
  if (globalThis[GUARD]) return;
  globalThis[GUARD] = true;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== 'ADAPTER_DISPATCH') return false;
    // Simulate handleDispatch — just respond ok
    sendResponse({ ok: true });
    return true;
  });
}

describe('content script injection guard', () => {
  let mockGlobalThis: Record<string, any>;
  let mockChrome: ReturnType<typeof createMockChrome>;

  beforeEach(() => {
    mockGlobalThis = {};
    mockChrome = createMockChrome();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers exactly one listener when main() is called once', () => {
    simulateMain(mockGlobalThis, mockChrome);
    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
  });

  it('does NOT register a second listener when main() is called again (simulates re-injection)', () => {
    // First injection (first dispatch)
    simulateMain(mockGlobalThis, mockChrome);
    // Second injection (second dispatch — same tab, no refresh)
    simulateMain(mockGlobalThis, mockChrome);
    // Still only one listener registered
    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
  });

  it('allows re-registration after globalThis flag is cleared (simulates tab refresh)', () => {
    simulateMain(mockGlobalThis, mockChrome);
    // Tab refresh destroys the ISOLATED world context
    delete mockGlobalThis.__web2chat_discord_registered;
    simulateMain(mockGlobalThis, mockChrome);
    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(2);
  });

  it('only ONE handleDispatch fires per ADAPTER_DISPATCH message', () => {
    simulateMain(mockGlobalThis, mockChrome);

    const responses: any[] = [];
    const sendResponse = (resp: any) => responses.push(resp);

    // Dispatch the message to all registered listeners
    for (const listener of mockChrome._listeners) {
      listener({ type: 'ADAPTER_DISPATCH', payload: {} }, {}, sendResponse);
    }

    // Only one response (from the single listener)
    expect(responses).toEqual([{ ok: true }]);
  });

  it('WITHOUT the guard, N injections cause N concurrent handleDispatch calls', () => {
    // Simulate the BUG: no guard, main() registers a listener every time
    for (let i = 0; i < 3; i++) {
      mockChrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type !== 'ADAPTER_DISPATCH') return false;
        sendResponse({ ok: true, listenerIndex: i });
        return true;
      });
    }

    const responses: any[] = [];
    const sendResponse = (resp: any) => responses.push(resp);

    for (const listener of mockChrome._listeners) {
      listener({ type: 'ADAPTER_DISPATCH', payload: {} }, {}, sendResponse);
    }

    // BUG: 3 responses instead of 1 — triple paste+Enter
    expect(responses).toHaveLength(3);
  });
});
