/**
 * Slack adapter content script (SLK-03, SLK-04).
 *
 * Injected by SW dispatch-pipeline via chrome.scripting.executeScript
 * into the Slack channel tab. Registers one-shot ADAPTER_DISPATCH
 * message listener following the same protocol as Discord adapter.
 *
 * DOM strategy: Quill three-level fallback selector.
 *   Tier 1: .ql-editor[role="textbox"][contenteditable="true"]
 *   Tier 2: .ql-editor[contenteditable="true"]
 *   Tier 3: #msg_input [contenteditable="true"] (low confidence)
 * Injection: Two-phase — ISOLATED world asks the service worker to run
 *   paste+Enter in MAIN world (DataTransfer must be created in MAIN world for
 *   Quill to read clipboardData).
 * Send: Enter keydown dispatched in MAIN world script.
 * Confirm: editor textContent cleared after paste+Enter (200ms delay).
 * Rate limit: 5s per channel.
 * Login wall: URL-layer (/check-login, /signin, /workspace-signin) +
 *   DOM-layer detectLoginWall() (email input, signin button, signin class,
 *   guarded login class).
 */
import { defineContentScript } from '#imports';
import { composeSlackMrkdwn } from '@/shared/adapters/slack-format';
import { detectLoginWall } from '@/shared/adapters/slack-login-detect';
import type { DispatchWarning, SelectorConfirmation } from '@/shared/messaging';

const WAIT_TIMEOUT_MS = 5000;
const LOGIN_WALL_PROBE_MS = 1500;
const RATE_LIMIT_MS = 5000;
const PLATFORM_ID = 'slack';
const MAIN_WORLD_PORT = `WEB2CHAT_MAIN_WORLD:${PLATFORM_ID}`;

const SELECTOR_LOW_CONFIDENCE = 'SELECTOR_LOW_CONFIDENCE' as const;
type SelectorTier = 'tier1-aria' | 'tier2-data' | 'tier3-class-fragment';
type EditorMatch = { element: HTMLElement; tier: SelectorTier; lowConfidence: boolean };

// Module-scope rate limit map (content script lifetime = tab lifetime)
const lastSendTime = new Map<string, number>();
let mainWorldPasteForTest: typeof injectMainWorldPaste | null = null;

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
    selectorConfirmation?: SelectorConfirmation;
  };
}

interface AdapterDispatchResponse {
  ok: boolean;
  code?: 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'NOT_LOGGED_IN' | 'INTERNAL';
  message?: string;
  retriable?: boolean;
  warnings?: DispatchWarning[];
}

function isAdapterDispatch(msg: unknown): msg is AdapterDispatchMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as { type: unknown }).type === 'ADAPTER_DISPATCH'
  );
}

/**
 * Extract channelId from a Slack URL.
 * Expected format: https://app.slack.com/client/<workspace>/<channel>
 */
function extractChannelId(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    // /client/<workspace>/<channel>
    if (parts[1] === 'client' && parts.length >= 4 && parts[3]) {
      return parts[3];
    }
    return null;
  } catch {
    return null;
  }
}

function checkRateLimit(channelId: string): boolean {
  return Date.now() - (lastSendTime.get(channelId) ?? 0) < RATE_LIMIT_MS;
}

/**
 * URL-based logged-out path detector. Slack may redirect logged-out
 * sessions to /check-login, /signin, or /workspace-signin.
 */
function isLoggedOutPath(pathname: string): boolean {
  return (
    pathname.startsWith('/check-login') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/workspace-signin')
  );
}

/**
 * Quill three-level fallback editor selector.
 * Tier 1: .ql-editor + role=textbox + contenteditable
 * Tier 2: .ql-editor + contenteditable (no role)
 * Tier 3: #msg_input + contenteditable (low confidence)
 */
function findEditor(): EditorMatch | null {
  const tier1 = document.querySelector<HTMLElement>(
    '.ql-editor[role="textbox"][contenteditable="true"]',
  );
  if (tier1) return { element: tier1, tier: 'tier1-aria', lowConfidence: false };

  const tier2 = document.querySelector<HTMLElement>('.ql-editor[contenteditable="true"]');
  if (tier2) return { element: tier2, tier: 'tier2-data', lowConfidence: false };

  const tier3 = document.querySelector<HTMLElement>('#msg_input [contenteditable="true"]');
  if (tier3) return { element: tier3, tier: 'tier3-class-fragment', lowConfidence: true };

  return null;
}

/**
 * Race the editor element against login-wall markers using a single
 * MutationObserver. Resolves with the first signal that appears within
 * `timeoutMs`, or `{ kind: 'timeout' }` if neither does.
 */
function waitForReady(
  timeoutMs: number,
): Promise<{ kind: 'editor'; match: EditorMatch } | { kind: 'login' } | { kind: 'timeout' }> {
  // Synchronous probe first
  const eagerEditor = findEditor();
  if (eagerEditor) return Promise.resolve({ kind: 'editor', match: eagerEditor });
  if (detectLoginWall()) return Promise.resolve({ kind: 'login' });

  return new Promise((resolve) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      const editor = findEditor();
      if (editor && !settled) {
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve({ kind: 'editor', match: editor });
        return;
      }
      if (!settled && detectLoginWall()) {
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve({ kind: 'login' });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve({ kind: 'timeout' });
      }
    }, timeoutMs);
  });
}

/**
 * Ask the service worker to execute paste + Enter in MAIN world.
 */
async function injectMainWorldPaste(editor: HTMLElement, text: string): Promise<boolean> {
  editor.focus();
  const response = await new Promise<{ ok: boolean; message?: string }>((resolve) => {
    const port = chrome.runtime.connect({ name: MAIN_WORLD_PORT });
    port.onMessage.addListener((msg: { ok?: unknown; message?: unknown }) => {
      const message = typeof msg.message === 'string' ? msg.message : undefined;
      resolve(message ? { ok: msg.ok === true, message } : { ok: msg.ok === true });
    });
    port.onDisconnect.addListener(() => {
      const errMsg = chrome.runtime.lastError?.message;
      resolve({ ok: false, message: errMsg ?? 'Port disconnected unexpectedly' });
    });
    port.postMessage({ text });
  });
  if (response.ok) return true;
  throw new Error(response.message ?? 'MAIN world paste failed');
}

function waitForEditor(timeoutMs: number): Promise<EditorMatch | null> {
  const immediate = findEditor();
  if (immediate) return Promise.resolve(immediate);

  return new Promise<EditorMatch | null>((resolve) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      const match = findEditor();
      if (match && !settled) {
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(match);
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

async function handleDispatch(
  payload: AdapterDispatchMessage['payload'],
): Promise<AdapterDispatchResponse> {
  // URL-based login guard
  if (isLoggedOutPath(window.location.pathname)) {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Slack login required',
      retriable: true,
    };
  }

  // DOM-based login wall probe
  if (detectLoginWall()) {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Slack login required (login UI detected)',
      retriable: true,
    };
  }

  // Extract and validate channelId
  const expectedChannelId = extractChannelId(payload.send_to);
  if (!expectedChannelId) {
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Invalid Slack channel URL',
      retriable: false,
    };
  }

  const currentChannelId = extractChannelId(window.location.href);
  if (currentChannelId !== expectedChannelId) {
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Channel mismatch',
      retriable: false,
    };
  }

  // Rate limit check
  if (checkRateLimit(expectedChannelId)) {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Same channel rate limited (5s)',
      retriable: true,
    };
  }

  // waitForReady: race editor render vs login-wall render
  const probe = await waitForReady(LOGIN_WALL_PROBE_MS);
  let editorMatch: EditorMatch | null = null;
  if (probe.kind === 'editor') {
    editorMatch = probe.match;
  } else if (probe.kind === 'login') {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Slack login required (login UI detected)',
      retriable: true,
    };
  } else {
    const remainingBudget = Math.max(WAIT_TIMEOUT_MS - LOGIN_WALL_PROBE_MS, 1000);
    editorMatch = await waitForEditor(remainingBudget);
  }
  if (!editorMatch) {
    if (detectLoginWall() || isLoggedOutPath(window.location.pathname)) {
      return {
        ok: false,
        code: 'NOT_LOGGED_IN',
        message: 'Slack login required (detected after editor timeout)',
        retriable: true,
      };
    }
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Editor not found',
      retriable: true,
    };
  }

  if (editorMatch.lowConfidence) {
    if (payload.selectorConfirmation?.warning !== SELECTOR_LOW_CONFIDENCE) {
      return { ok: true, warnings: [{ code: SELECTOR_LOW_CONFIDENCE }] };
    }
  }

  const editor = editorMatch.element;

  // Compose message
  const message = composeSlackMrkdwn({ prompt: payload.prompt, snapshot: payload.snapshot });

  // Inject via MAIN world paste bridge
  let pasteOk = false;
  let pasteError = 'Paste injection timed out';
  try {
    pasteOk = await (mainWorldPasteForTest ?? injectMainWorldPaste)(editor, message);
  } catch (err) {
    pasteError = err instanceof Error ? err.message : String(err);
  }
  if (!pasteOk) {
    return {
      ok: false,
      code: 'TIMEOUT',
      message: pasteError,
      retriable: true,
    };
  }

  // Confirm send: Slack clears the Quill editor after processing Enter -> send.
  let confirmed = (editor.textContent ?? '').trim().length === 0;
  if (!confirmed) {
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    confirmed = (editor.textContent ?? '').trim().length === 0;
  }
  if (!confirmed) {
    return {
      ok: false,
      code: 'TIMEOUT',
      message: 'Message confirmation timed out',
      retriable: true,
    };
  }

  // Record rate limit timestamp
  lastSendTime.set(expectedChannelId, Date.now());

  return { ok: true };
}

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    const guarded = globalThis as typeof globalThis & {
      __web2chat_slack_registered?: boolean;
    };
    if (guarded.__web2chat_slack_registered) return;
    guarded.__web2chat_slack_registered = true;

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true;
    });
  },
});

export const __testing = {
  findEditor,
  handleDispatch,
  setMainWorldPasteForTest(fn: typeof injectMainWorldPaste): void {
    mainWorldPasteForTest = fn;
  },
  resetTestOverrides(): void {
    mainWorldPasteForTest = null;
    lastSendTime.clear();
  },
};
