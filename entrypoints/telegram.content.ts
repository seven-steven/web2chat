/**
 * Telegram adapter content script (TG-03, TG-04).
 *
 * Injected by SW dispatch-pipeline via chrome.scripting.executeScript
 * into the Telegram Web K chat tab. Registers one-shot ADAPTER_DISPATCH
 * message listener following the same protocol as Discord/Slack adapters.
 *
 * DOM strategy: custom contenteditable three-level fallback selector.
 *   Tier 1: .input-message-input[contenteditable="true"]
 *   Tier 2: .rows-wrapper [contenteditable="true"]
 *   Tier 3: .new-message-wrapper [contenteditable="true"] (low confidence)
 * Injection: MAIN world ClipboardEvent paste (DataTransfer in MAIN world).
 * Send: click .btn-send button, fallback Enter keydown.
 * Confirm: editor textContent clearance polling (300ms x 5).
 * Rate limit: 5s per channel.
 * Login wall: DOM-layer detectLoginWall() (phone input, auth class).
 */
import { defineContentScript } from '#imports';
import { composeTelegramMessage } from '@/shared/adapters/telegram-format';
import { detectLoginWall } from '@/shared/adapters/telegram-login-detect';
import { t } from '@/shared/i18n';
import type { DispatchWarning, SelectorConfirmation } from '@/shared/messaging';

const WAIT_TIMEOUT_MS = 5000;
const LOGIN_WALL_PROBE_MS = 1500;
const RATE_LIMIT_MS = 5000;
const CONFIRM_POLL_INTERVAL_MS = 300;
const CONFIRM_MAX_POLLS = 5;
const PLATFORM_ID = 'telegram';
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
 * Extract chatId from a Telegram Web K URL.
 * Expected format: https://web.telegram.org/a/<chatId> or /a/#<chatId>
 */
function extractChatId(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    // /a/<chatId>
    if (parts[0] === 'a' && parts.length >= 2) {
      return parts[parts.length - 1] ?? null;
    }
    // Hash-based routing: #<chatId> or #/im/<chatId>
    if (parts[0] === 'a' && u.hash.length > 1) {
      const hashParts = u.hash.slice(1).split('/').filter(Boolean);
      // #123456 (bare chat ID)
      if (hashParts.length === 1) return hashParts[0] ?? null;
      // #/im/p123456 or #/im/u123456 (hash path with chat ID)
      if (hashParts.length >= 2) return hashParts[hashParts.length - 1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function checkRateLimit(chatId: string): boolean {
  return Date.now() - (lastSendTime.get(chatId) ?? 0) < RATE_LIMIT_MS;
}

/**
 * URL-based logged-out path detector. Telegram Web K may redirect
 * to /login or the root path when logged out. Hash-based routing
 * (#/auth) is handled by DOM-layer detectLoginWall().
 */
function isLoggedOutPath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/login');
}

/**
 * Telegram Web K three-level fallback editor selector.
 * Tier 1: .input-message-input + contenteditable (most specific)
 * Tier 2: .rows-wrapper + contenteditable (class context)
 * Tier 3: .new-message-wrapper + contenteditable (low confidence)
 */
function findEditor(): EditorMatch | null {
  const tier1 = document.querySelector<HTMLElement>('.input-message-input[contenteditable="true"]');
  if (tier1) return { element: tier1, tier: 'tier1-aria', lowConfidence: false };

  const tier2 = document.querySelector<HTMLElement>('.rows-wrapper [contenteditable="true"]');
  if (tier2) return { element: tier2, tier: 'tier2-data', lowConfidence: false };

  const tier3 = document.querySelector<HTMLElement>(
    '.new-message-wrapper [contenteditable="true"]',
  );
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
      message: 'Telegram login required',
      retriable: true,
    };
  }

  // DOM-based login wall probe
  if (detectLoginWall()) {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Telegram login required (login UI detected)',
      retriable: true,
    };
  }

  // Extract and validate chatId
  const expectedChatId = extractChatId(payload.send_to);
  if (!expectedChatId) {
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Invalid Telegram chat URL',
      retriable: false,
    };
  }

  const currentChatId = extractChatId(window.location.href);
  if (currentChatId !== expectedChatId) {
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Chat mismatch',
      retriable: false,
    };
  }

  // Rate limit check
  if (checkRateLimit(expectedChatId)) {
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
      message: 'Telegram login required (login UI detected)',
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
        message: 'Telegram login required (login UI detected)',
        retriable: true,
      };
    }
  }
  if (!editorMatch) {
    if (detectLoginWall() || isLoggedOutPath(window.location.pathname)) {
      return {
        ok: false,
        code: 'NOT_LOGGED_IN',
        message: 'Telegram login required (detected after editor timeout)',
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
  const message = composeTelegramMessage({
    prompt: payload.prompt,
    snapshot: payload.snapshot,
    timestampLabel: t('telegram_timestamp_label'),
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
  // Telegram clears the contenteditable editor after successful send.
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
  lastSendTime.set(expectedChatId, Date.now());

  return { ok: true };
}

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    const guarded = globalThis as typeof globalThis & {
      __web2chat_telegram_registered?: boolean;
    };
    if (guarded.__web2chat_telegram_registered) return;
    guarded.__web2chat_telegram_registered = true;

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
