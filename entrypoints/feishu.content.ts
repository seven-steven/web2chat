/**
 * Feishu/Lark adapter content script (FSL-02, FSL-03, FSL-04).
 *
 * Injected by SW dispatch-pipeline via chrome.scripting.executeScript
 * into the Feishu/Lark Web chat tab. Registers one-shot ADAPTER_DISPATCH
 * message listener following the same protocol as other adapters.
 *
 * DOM strategy: ARIA-first three-tier fallback selector (D-164):
 *   Tier 1: [contenteditable="true"][role="textbox"]
 *   Tier 2: .message-input [contenteditable="true"]
 *   Tier 3: [contenteditable="true"] (low confidence)
 * Injection: MAIN world ClipboardEvent paste (DataTransfer in MAIN world).
 * Send confirmation: editor textContent clearance polling (300ms x 5).
 * Rate limit: 5s per URL (full send_to URL as key).
 * Login wall: URL-layer (path patterns) + DOM-layer detectLoginWall().
 */
import { defineContentScript } from '#imports';
import { composeFeishuMessage } from '@/shared/adapters/feishu-format';
import { detectLoginWall } from '@/shared/adapters/feishu-login-detect';
import { t } from '@/shared/i18n';
import type { DispatchWarning, SelectorConfirmation } from '@/shared/messaging';

const WAIT_TIMEOUT_MS = 5000;
const LOGIN_WALL_PROBE_MS = 1500;
const RATE_LIMIT_MS = 5000;
const CONFIRM_POLL_INTERVAL_MS = 300;
const CONFIRM_MAX_POLLS = 5;
const PLATFORM_ID = 'feishu';
const MAIN_WORLD_PORT = `WEB2CHAT_MAIN_WORLD:${PLATFORM_ID}`;

const SELECTOR_LOW_CONFIDENCE = 'SELECTOR_LOW_CONFIDENCE' as const;
type SelectorTier = 'tier1-aria' | 'tier2-class' | 'tier3-generic';
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
 * URL-based logged-out path detector.
 * Feishu redirects to /accounts/page/login, /login, or /passport when logged out.
 */
function isLoggedOutPath(pathname: string): boolean {
  return (
    pathname.startsWith('/accounts/page/login') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/passport')
  );
}

function checkRateLimit(rateLimitKey: string): boolean {
  return Date.now() - (lastSendTime.get(rateLimitKey) ?? 0) < RATE_LIMIT_MS;
}

/**
 * Feishu three-tier ARIA-first editor selector (D-164):
 *   Tier 1: [contenteditable="true"][role="textbox"] (ARIA role)
 *   Tier 2: .message-input [contenteditable="true"] (class context)
 *   Tier 3: [contenteditable="true"] (generic, low confidence)
 */
function findEditor(): EditorMatch | null {
  const tier1 = document.querySelector<HTMLElement>(
    '[contenteditable="true"][role="textbox"]',
  );
  if (tier1) return { element: tier1, tier: 'tier1-aria', lowConfidence: false };

  const tier2 = document.querySelector<HTMLElement>(
    '.message-input [contenteditable="true"]',
  );
  if (tier2) return { element: tier2, tier: 'tier2-class', lowConfidence: false };

  const tier3 = document.querySelector<HTMLElement>('[contenteditable="true"]');
  if (tier3) return { element: tier3, tier: 'tier3-generic', lowConfidence: true };

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
 * Ask the service worker to execute paste + send in MAIN world.
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

async function handleDispatch(
  payload: AdapterDispatchMessage['payload'],
): Promise<AdapterDispatchResponse> {
  // URL-based login guard
  if (isLoggedOutPath(window.location.pathname)) {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Feishu login required',
      retriable: true,
    };
  }

  // DOM-based login wall probe
  if (detectLoginWall()) {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Feishu login required (login UI detected)',
      retriable: true,
    };
  }

  // Verify we are on the correct page by comparing current URL with send_to
  const currentHref = window.location.href;
  if (currentHref !== payload.send_to) {
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Chat mismatch',
      retriable: false,
    };
  }

  // Rate limit check — use full send_to URL as key (feishu chat ID extraction unreliable)
  const rateLimitKey = payload.send_to;
  if (checkRateLimit(rateLimitKey)) {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Same chat rate limited (5s)',
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
      message: 'Feishu login required (login UI detected)',
      retriable: true,
    };
  } else {
    const remainingBudget = Math.max(WAIT_TIMEOUT_MS - LOGIN_WALL_PROBE_MS, 1000);
    const secondProbe = await waitForReady(remainingBudget);
    if (secondProbe.kind === 'editor') {
      editorMatch = secondProbe.match;
    } else if (secondProbe.kind === 'login') {
      return {
        ok: false,
        code: 'NOT_LOGGED_IN',
        message: 'Feishu login required (login UI detected)',
        retriable: true,
      };
    }
  }
  if (!editorMatch) {
    if (detectLoginWall() || isLoggedOutPath(window.location.pathname)) {
      return {
        ok: false,
        code: 'NOT_LOGGED_IN',
        message: 'Feishu login required (detected after editor timeout)',
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
  const message = composeFeishuMessage({
    prompt: payload.prompt,
    snapshot: payload.snapshot,
    timestampLabel: t('feishu_timestamp_label'),
  });

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

  // Confirm send: poll editor textContent clearance every 300ms up to 5 attempts (1500ms total).
  // Assumption A6 (MEDIUM confidence): Feishu editor clears after successful send.
  // If A6 is invalidated, fallback to MutationObserver watching for new .message-bubble.is-out nodes.
  let confirmed = false;
  for (let i = 0; i < CONFIRM_MAX_POLLS; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, CONFIRM_POLL_INTERVAL_MS));
    if ((editor.textContent ?? '').trim().length === 0) {
      confirmed = true;
      break;
    }
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
  lastSendTime.set(rateLimitKey, Date.now());

  return { ok: true };
}

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    const guarded = globalThis as typeof globalThis & {
      __web2chat_feishu_registered?: boolean;
    };
    if (guarded.__web2chat_feishu_registered) return;
    guarded.__web2chat_feishu_registered = true;

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
