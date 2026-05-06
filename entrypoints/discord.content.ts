/**
 * Discord adapter content script (ADD-01..ADD-09, D-62..D-69).
 *
 * Injected by SW dispatch-pipeline via chrome.scripting.executeScript
 * into the Discord channel tab. Registers one-shot ADAPTER_DISPATCH
 * message listener following the same protocol as OpenClaw adapter.
 *
 * DOM strategy (D-62): ARIA-first three-level fallback selector.
 * Injection (D-63): Two-phase — ISOLATED world asks the service worker to run
 *   paste+Enter in MAIN world (DataTransfer must be created in MAIN world for
 *   Slate to read clipboardData).
 * Send (D-64): Enter keydown dispatched in MAIN world script.
 * Confirm (D-65): MutationObserver watches chat-messages container.
 * Rate limit (D-69): 5s per channel.
 * Safety (D-68): channelId consistency check.
 */
import { defineContentScript } from '#imports';
import { composeDiscordMarkdown } from '@/shared/adapters/discord-format';

const WAIT_TIMEOUT_MS = 5000;
const RATE_LIMIT_MS = 5000;
const DISCORD_MAIN_WORLD_PASTE_PORT = 'WEB2CHAT_DISCORD_MAIN_WORLD_PASTE';

// Module-scope rate limit map (content script lifetime = tab lifetime)
const lastSendTime = new Map<string, number>();

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
  code?: 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'NOT_LOGGED_IN' | 'INTERNAL';
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

/**
 * Extract channelId from a Discord URL.
 * Expected format: https://discord.com/channels/<serverId>/<channelId>
 */
function extractChannelId(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    // /channels/<serverId>/<channelId>
    if (parts[1] === 'channels' && parts.length >= 4 && parts[3]) {
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
 * ARIA-first three-level fallback editor selector (D-62).
 * Tier 1: role=textbox + aria-label containing "Message"
 * Tier 2: data-slate-editor attribute
 * Tier 3: class fragment textArea + contenteditable
 */
function findEditor(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]') ??
    document.querySelector<HTMLElement>('[data-slate-editor="true"]') ??
    document.querySelector<HTMLElement>('div[class*="textArea"] [contenteditable="true"]')
  );
}

/**
 * Ask the service worker to execute paste + Enter in MAIN world.
 *
 * Root cause of the "¬" artifact: DataTransfer created in ISOLATED world is empty
 * when read by Slate in MAIN world (cross-V8 boundary). The service worker uses
 * chrome.scripting.executeScript({ world: 'MAIN' }) so the DataTransfer and
 * ClipboardEvent are created in the same world as Discord's Slate listeners.
 */
async function injectMainWorldPaste(editor: HTMLElement, text: string): Promise<boolean> {
  editor.focus();
  const response = await new Promise<{ ok: boolean; message?: string }>((resolve) => {
    const port = chrome.runtime.connect({ name: DISCORD_MAIN_WORLD_PASTE_PORT });
    port.onMessage.addListener((msg: { ok?: unknown; message?: unknown }) => {
      const message = typeof msg.message === 'string' ? msg.message : undefined;
      resolve(message ? { ok: msg.ok === true, message } : { ok: msg.ok === true });
    });
    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message;
        resolve(message ? { ok: false, message } : { ok: false });
      }
    });
    port.postMessage({ text });
  });
  if (response.ok) return true;
  throw new Error(response.message ?? 'MAIN world paste failed');
}

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    // Guard: chrome.scripting.executeScript re-evaluates this script on every
    // dispatch. Without this, N dispatches = N onMessage listeners, causing
    // N concurrent handleDispatch calls. The flag persists in the ISOLATED world
    // across re-injections but resets on tab navigation/refresh.
    if ((globalThis as any).__web2chat_discord_registered) return;
    (globalThis as any).__web2chat_discord_registered = true;

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
  // Defense-in-depth login guard (D-70 note: primary detection in dispatch-pipeline)
  if (window.location.pathname.startsWith('/login')) {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Discord login required',
      retriable: true,
    };
  }

  // Extract and validate channelId (D-68)
  const expectedChannelId = extractChannelId(payload.send_to);
  if (!expectedChannelId) {
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Invalid Discord channel URL',
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

  // Rate limit check (D-69)
  if (checkRateLimit(expectedChannelId)) {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Same channel rate limited (5s)',
      retriable: true,
    };
  }

  // waitForReady: find editor with fallback + MutationObserver (D-62)
  let editor = findEditor();
  if (!editor) {
    editor = await waitForElement<HTMLElement>(
      '[role="textbox"][aria-label*="Message"], [data-slate-editor="true"]',
      WAIT_TIMEOUT_MS,
    );
  }
  if (!editor) {
    return {
      ok: false,
      code: 'INPUT_NOT_FOUND',
      message: 'Editor not found',
      retriable: true,
    };
  }

  // Compose message (D-54, D-55, D-57, D-58)
  const message = composeDiscordMarkdown({ prompt: payload.prompt, snapshot: payload.snapshot });

  // Inject via MAIN world paste bridge (D-63)
  // Enter keydown is handled inside the MAIN world script.
  let pasteOk = false;
  let pasteError = 'Paste injection timed out';
  try {
    pasteOk = await injectMainWorldPaste(editor, message);
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

  // Confirm send: Discord clears the Slate editor after processing Enter → send.
  // The MAIN world paste already waited 200ms post-Enter; poll briefly as a
  // safety margin for Discord's async Slate reconciliation.
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
