/**
 * OpenClaw adapter content script (ADO-01..ADO-04, D-39..D-53).
 *
 * Injected by SW dispatch-pipeline via chrome.scripting.executeScript
 * into the OpenClaw WebChat tab. Registers one-shot ADAPTER_DISPATCH
 * message listener following the same protocol as mock-platform.
 *
 * DOM strategy (D-47): CSS selector for textarea.
 * Injection (D-48): setInputValue property-descriptor setter.
 * Send (D-49): Enter keydown.
 * Confirm (D-50): MutationObserver watches for new message node.
 * Timeout: 5s for waitForReady + 5s for send confirmation (D-51).
 */
import { defineContentScript } from '#imports';
import { setInputValue } from '@/shared/dom-injector';
import { composeMarkdown } from '@/shared/adapters/openclaw-format';

const OPENCLAW_FEATURE_SELECTOR =
  '[data-testid="openclaw-app"], .agent-chat__messages, [class*="agent-chat"]';
const TEXTAREA_SELECTOR = '.agent-chat__input textarea, textarea[data-testid="chat-input"]';
const MESSAGE_LIST_SELECTOR = '.agent-chat__messages, [data-testid="message-list"]';
const WAIT_TIMEOUT_MS = 5000;

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
  code?: 'OPENCLAW_OFFLINE' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'INTERNAL';
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
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true;
    });
  },
});

async function handleDispatch(
  payload: AdapterDispatchMessage['payload'],
): Promise<AdapterDispatchResponse> {
  // canDispatch check (D-52, D-53): verify OpenClaw feature DOM exists
  const hasFeatureDom =
    document.querySelector(OPENCLAW_FEATURE_SELECTOR) !== null ||
    document.title.toLowerCase().includes('openclaw');
  if (!hasFeatureDom) {
    return {
      ok: false,
      code: 'OPENCLAW_OFFLINE',
      message: 'OpenClaw UI not detected on this page',
      retriable: true,
    };
  }

  // waitForReady (D-51): wait for textarea to appear
  const textarea = await waitForElement<HTMLTextAreaElement>(TEXTAREA_SELECTOR, WAIT_TIMEOUT_MS);
  if (!textarea) {
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Chat input textarea not found',
      retriable: true,
    };
  }

  // compose (D-39, D-40, D-41): format + inject message
  const message = composeMarkdown(payload);
  setInputValue(textarea, message);

  // send (D-49): dispatch Enter keydown
  textarea.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );

  // confirm (D-50): MutationObserver watches for new message node
  const confirmed = await waitForNewMessage(MESSAGE_LIST_SELECTOR, WAIT_TIMEOUT_MS);
  if (!confirmed) {
    return {
      ok: false,
      code: 'TIMEOUT',
      message: 'Message not confirmed within 5s',
      retriable: true,
    };
  }

  return { ok: true };
}

function waitForElement<T extends Element>(selector: string, timeoutMs: number): Promise<T | null> {
  const immediate = document.querySelector<T>(selector);
  if (immediate) return Promise.resolve(immediate);

  return new Promise<T | null>((resolve) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el && !settled) {
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(null);
      }
    }, timeoutMs);
  });
}

function waitForNewMessage(containerSelector: string, timeoutMs: number): Promise<boolean> {
  const container = document.querySelector(containerSelector);
  if (!container) return Promise.resolve(false);

  const initialCount = container.children.length;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      if (container.children.length > initialCount && !settled) {
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(true);
      }
    });
    observer.observe(container, { childList: true });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(false);
      }
    }, timeoutMs);
  });
}
