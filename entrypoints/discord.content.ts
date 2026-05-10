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
 * Login wall (debug session discord-login-detection, 2026-05-07):
 *   - Pathname guard widened to /login + /register + root '/'.
 *   - Pre-editor DOM probe via detectLoginWall() so logged-out users who
 *     land on /channels/<id> with a login overlay are surfaced as
 *     NOT_LOGGED_IN instead of timing out as INPUT_NOT_FOUND.
 *   - Post-findEditor-failure recheck so a login wall that paints during
 *     the 5s waitForElement window is also caught.
 */
import { defineContentScript } from '#imports';
import { composeDiscordMarkdown } from '@/shared/adapters/discord-format';
import { detectLoginWall } from '@/shared/adapters/discord-login-detect';
import type { DispatchWarning, SelectorConfirmation } from '@/shared/messaging';

const WAIT_TIMEOUT_MS = 5000;
const LOGIN_WALL_PROBE_MS = 1500;
const RATE_LIMIT_MS = 5000;
const PLATFORM_ID = 'discord';
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
 * URL-based logged-out path detector. Discord may navigate logged-out
 * sessions to /login, /register, or the root domain — none match the
 * adapter's /channels/<g>/<c> pattern. The pre-fix code only checked
 * /login; this widens to cover observed redirect targets without false
 * positives (channels/<id> URLs can never satisfy any of these).
 */
function isLoggedOutPath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register');
}

/**
 * ARIA-first three-level fallback editor selector (D-62).
 * Tier 1: role=textbox + aria-label containing "Message"
 * Tier 2: data-slate-editor attribute
 * Tier 3: class fragment textArea + contenteditable
 */
function findEditor(): EditorMatch | null {
  const tier1 = document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]');
  if (tier1) return { element: tier1, tier: 'tier1-aria', lowConfidence: false };

  const tier2 = document.querySelector<HTMLElement>('[data-slate-editor="true"]');
  if (tier2) return { element: tier2, tier: 'tier2-data', lowConfidence: false };

  const tier3 = document.querySelector<HTMLElement>(
    'div[class*="textArea"] [contenteditable="true"]',
  );
  if (tier3) return { element: tier3, tier: 'tier3-class-fragment', lowConfidence: true };

  return null;
}

/**
 * Race the editor element against login-wall markers using a single
 * MutationObserver. Resolves with the first signal that appears within
 * `timeoutMs`, or `{ kind: 'timeout' }` if neither does.
 *
 * Returning the editor when found avoids the redundant 5s waitForElement
 * pass for the happy path; returning 'login' lets handleDispatch
 * short-circuit to NOT_LOGGED_IN before the editor timeout would fire.
 */
function waitForReady(
  timeoutMs: number,
): Promise<{ kind: 'editor'; match: EditorMatch } | { kind: 'login' } | { kind: 'timeout' }> {
  // Synchronous probe first — covers the case where the page is already
  // settled at adapter injection time.
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
 *
 * Root cause of the "¬" artifact: DataTransfer created in ISOLATED world is empty
 * when read by Slate in MAIN world (cross-V8 boundary). The service worker uses
 * chrome.scripting.executeScript({ world: 'MAIN' }) so the DataTransfer and
 * ClipboardEvent are created in the same world as Discord's Slate listeners.
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

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    // Guard: chrome.scripting.executeScript re-evaluates this script on every
    // dispatch. Without this, N dispatches = N onMessage listeners, causing
    // N concurrent handleDispatch calls. The flag persists in the ISOLATED world
    // across re-injections but resets on tab navigation/refresh.
    const guarded = globalThis as typeof globalThis & {
      __web2chat_discord_registered?: boolean;
    };
    if (guarded.__web2chat_discord_registered) return;
    guarded.__web2chat_discord_registered = true;

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
  // Defense-in-depth login guards — pathname-based check covers Discord's
  // server-side or pre-injection redirects to /login, /register, or '/'.
  // (Primary URL-based detection still happens in dispatch-pipeline.ts.)
  if (isLoggedOutPath(window.location.pathname)) {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Discord login required',
      retriable: true,
    };
  }

  // DOM-based login wall probe. Catches the case where Discord renders
  // a login overlay on /channels/<id> (URL unchanged) — invisible to
  // pathname-based detection both here and in the pipeline.
  if (detectLoginWall()) {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Discord login required (login UI detected)',
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

  // waitForReady: race editor render vs login-wall render. If a login wall
  // paints during the probe window, return NOT_LOGGED_IN immediately rather
  // than waiting out the full 5s editor timeout for a guaranteed failure.
  const probe = await waitForReady(LOGIN_WALL_PROBE_MS);
  let editorMatch: EditorMatch | null = null;
  if (probe.kind === 'editor') {
    editorMatch = probe.match;
  } else if (probe.kind === 'login') {
    return {
      ok: false,
      code: 'NOT_LOGGED_IN',
      message: 'Discord login required (login UI detected)',
      retriable: true,
    };
  } else {
    // Probe timed out; bound the fallback so the total editor/login wait remains
    // within WAIT_TIMEOUT_MS instead of LOGIN_WALL_PROBE_MS + WAIT_TIMEOUT_MS.
    const remainingBudget = Math.max(WAIT_TIMEOUT_MS - LOGIN_WALL_PROBE_MS, 1000);
    editorMatch = await waitForEditor(remainingBudget);
  }
  if (!editorMatch) {
    // Final login-wall recheck — if Discord rendered the login UI during
    // the 5s editor wait, surface that instead of a generic INPUT_NOT_FOUND.
    if (detectLoginWall() || isLoggedOutPath(window.location.pathname)) {
      return {
        ok: false,
        code: 'NOT_LOGGED_IN',
        message: 'Discord login required (detected after editor timeout)',
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

  // Compose message (D-54, D-55, D-57, D-58)
  const message = composeDiscordMarkdown({ prompt: payload.prompt, snapshot: payload.snapshot });

  // Inject via MAIN world paste bridge (D-63)
  // Enter keydown is handled inside the MAIN world script.
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
