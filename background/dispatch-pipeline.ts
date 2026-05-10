/**
 * Dispatch pipeline — SW-side orchestration (DSP-05..DSP-09 + D-31..D-34).
 *
 * Invoked by entrypoints/background.ts via:
 *   onMessage('dispatch.start', wrapHandler((msg) => startDispatch(msg.data)))
 *   onMessage('dispatch.cancel', wrapHandler((msg) => cancelDispatch(msg.data)))
 *   chrome.tabs.onUpdated.addListener(onTabComplete)
 *   chrome.alarms.onAlarm.addListener(onAlarmFired)
 *
 * State machine (D-31): pending -> opening -> awaiting_complete -> awaiting_adapter
 *   -> done | error | cancelled
 * Each transition writes a single key `dispatch:<id>` to chrome.storage.session
 * (Pattern 2 — race-condition mitigation; no `dispatches: {[id]: rec}` collection).
 *
 * SW restart resilience (D-33): tabs.onUpdated:complete listener registered at
 * background.ts top level. After SW idle-suspend + wake, listener sweeps
 * storage.session.dispatch:* records, finds awaiting_complete with matching
 * tabId, and advances to awaiting_adapter. Alarm 'dispatch-timeout:<id>'
 * (delayInMinutes 0.5 = 30s minimum per chrome.alarms) acts as backstop.
 *
 * Idempotency (D-32): startDispatch's first action is storage.session.get on
 * dispatch:<id>. Existing record -> return current state immediately (no
 * pending re-write, no second chrome.tabs.create). 200ms double-click in popup
 * UI naturally produces one record.
 *
 * Badge (D-34 + DEVIATIONS.md): loading=#94a3b8 set on opening; ok=#22c55e set
 * on done + alarm 'badge-clear:<id>' delayInMinutes 0.5 (= 30s, NOT D-34's
 * literal 5s — chrome.alarms minimum delay; see 03-DEVIATIONS.md). err=#ef4444
 * set on error; persists until next popup mount clears.
 *
 * Phase 3 stub adapter: mock-platform.content.ts in entrypoints/. Phase 4/5
 * replace by appending to shared/adapters/registry.ts (this file untouched).
 */

import { Ok, Err, isErrorCode, type Result, type ErrorCode } from '@/shared/messaging';
import type {
  DispatchStartInput,
  DispatchStartOutput,
  DispatchCancelInput,
  DispatchCancelOutput,
} from '@/shared/messaging';
import { findAdapter } from '@/shared/adapters/registry';
import type { AdapterRegistryEntry } from '@/shared/adapters/types';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import * as historyRepo from '@/shared/storage/repos/history';
import * as bindingRepo from '@/shared/storage/repos/binding';
import * as draftRepo from '@/shared/storage/repos/popupDraft';
import type { DispatchRecord } from '@/shared/storage/repos/dispatch';

/** D-34 LOCKED hex values — written via chrome.action.setBadgeBackgroundColor. */
export const BADGE_COLORS = {
  loading: '#94a3b8', // slate-400
  ok: '#22c55e', // green-500
  err: '#ef4444', // red-500
} as const;

/** DEVIATIONS.md D-34: 5s -> 30s (chrome.alarms minimum delay in production). */
export const BADGE_OK_CLEAR_MINUTES = 0.5;
export const DISPATCH_TIMEOUT_MINUTES = 0.5;

/** Alarm name prefixes — listed for spec assertion + cancelDispatch cleanup. */
const ALARM_PREFIX_TIMEOUT = 'dispatch-timeout:';
const ALARM_PREFIX_BADGE_CLEAR = 'badge-clear:';

/**
 * True when `actualUrl` lives on a host described by any of the adapter's
 * `hostMatches` glob patterns. Used as the "did the tab navigate within the
 * platform's domain" check — distinguishing a logged-out redirect to
 * /login (still discord.com) from a tab close or unrelated navigation.
 */
function isOnAdapterHost(adapter: AdapterRegistryEntry, actualUrl: string): boolean {
  return adapter.hostMatches.some((pattern) => {
    try {
      const patternHost = new URL(pattern.replace(/\*/g, 'x')).hostname;
      const actualHost = new URL(actualUrl).hostname;
      return actualHost === patternHost || actualHost.endsWith('.' + patternHost);
    } catch {
      return false;
    }
  });
}

/**
 * Open or activate the tab whose URL canonical-equals send_to.
 * Returns the tabId AND a flag indicating whether tabs.onUpdated:complete is
 * expected (false = we already advanced via fast-path because tab was complete).
 */
async function openOrActivateTab(
  sendTo: string,
): Promise<{ tabId: number; expectsCompleteEvent: boolean }> {
  const url = sendTo;
  const matches = await chrome.tabs.query({ url: url + '*' });
  if (matches.length === 0) {
    const created = await chrome.tabs.create({ url, active: true });
    if (typeof created.id !== 'number') {
      throw new Error('chrome.tabs.create returned no tab id');
    }
    return { tabId: created.id, expectsCompleteEvent: true };
  }

  // Prefer exact-URL match to avoid navigating an unrelated prefix-matching tab
  const exactMatches = matches.filter((t) => t.url === url);
  const existing = exactMatches.length > 0 ? exactMatches[0]! : matches[0]!;
  if (typeof existing.id !== 'number') throw new Error('matched tab has no id');

  if (existing.url !== url) {
    // hash/query differ -> real navigation. complete will fire.
    await chrome.tabs.update(existing.id, { url, active: true });
    return { tabId: existing.id, expectsCompleteEvent: true };
  }
  // Exact-URL match — Pitfall 5: complete event may not fire.
  await chrome.tabs.update(existing.id, { active: true });
  if (typeof existing.windowId === 'number') {
    await chrome.windows.update(existing.windowId, { focused: true });
  }
  return { tabId: existing.id, expectsCompleteEvent: existing.status !== 'complete' };
}

export async function startDispatch(
  input: DispatchStartInput,
): Promise<Result<DispatchStartOutput>> {
  // Step 1: D-32 idempotency check — same dispatchId returns current state.
  const existing = await dispatchRepo.get(input.dispatchId);
  if (existing) {
    return Ok({ dispatchId: existing.dispatchId, state: existing.state });
  }

  // Step 2: D-24 platform detection. No adapter -> PLATFORM_UNSUPPORTED.
  const adapter = findAdapter(input.send_to);
  if (!adapter) {
    return Err('PLATFORM_UNSUPPORTED', input.send_to, false);
  }

  // Step 2.5 (Phase 4 D-44): Defensive permissions.contains check for openclaw.
  // The popup's Confirm handler already called chrome.permissions.request (user gesture),
  // so this should always pass. If it doesn't, the origin was revoked between popup click
  // and SW processing — return OPENCLAW_PERMISSION_DENIED.
  if (adapter.requiresDynamicPermission === true) {
    // Adapter with no static hostMatches = dynamic permission required (openclaw)
    const targetOrigin = new URL(input.send_to).origin;
    const hasPermission = await chrome.permissions.contains({
      origins: [targetOrigin + '/*'],
    });
    if (!hasPermission) {
      return Err('OPENCLAW_PERMISSION_DENIED', targetOrigin, true);
    }
  }

  // Step 3: Write 'pending' record.
  const nowIso = new Date().toISOString();
  let rec: DispatchRecord = {
    schemaVersion: 1,
    dispatchId: input.dispatchId,
    state: 'pending',
    target_tab_id: null,
    send_to: input.send_to,
    prompt: input.prompt,
    snapshot: input.snapshot,
    platform_id: adapter.id,
    started_at: nowIso,
    last_state_at: nowIso,
  };
  await dispatchRepo.set(rec);
  await dispatchRepo.setActive(input.dispatchId);

  // Step 4: badge loading.
  await chrome.action.setBadgeText({ text: '...' });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.loading });

  // Step 5: open/activate target tab (Pattern 3 + Pitfall 5).
  let tabResult: { tabId: number; expectsCompleteEvent: boolean };
  try {
    tabResult = await openOrActivateTab(input.send_to);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    rec = {
      ...rec,
      state: 'error',
      last_state_at: new Date().toISOString(),
      error: { code: 'INTERNAL', message: errMessage, retriable: false },
    };
    await dispatchRepo.set(rec);
    await chrome.action.setBadgeText({ text: 'err' });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.err });
    return Err('INTERNAL', errMessage, false);
  }

  // Step 6: write 'awaiting_complete' (or fast-forward if tab was already complete).
  rec = {
    ...rec,
    state: 'awaiting_complete',
    target_tab_id: tabResult.tabId,
    last_state_at: new Date().toISOString(),
  };
  await dispatchRepo.set(rec);

  // Step 7: arm 30s timeout safety net (D-33).
  await chrome.alarms.create(`${ALARM_PREFIX_TIMEOUT}${input.dispatchId}`, {
    delayInMinutes: DISPATCH_TIMEOUT_MINUTES,
  });

  // Step 8: fast-path advancement when tab was already complete (Pitfall 5).
  if (!tabResult.expectsCompleteEvent) {
    await advanceToAdapterInjection(rec, adapter.scriptFile);
  }

  return Ok({ dispatchId: input.dispatchId, state: rec.state });
}

async function advanceToAdapterInjection(
  record: DispatchRecord,
  scriptFile: string,
): Promise<void> {
  // Move to awaiting_adapter
  const updated: DispatchRecord = {
    ...record,
    state: 'awaiting_adapter',
    last_state_at: new Date().toISOString(),
  };
  await dispatchRepo.set(updated);

  const tabId = updated.target_tab_id;
  if (tabId === null) {
    await failDispatch(updated, 'INTERNAL', 'No target_tab_id at awaiting_adapter', false);
    return;
  }

  // executeScript inject (Pattern 3 + Pitfall 3 error mapping).
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [scriptFile],
      world: 'ISOLATED',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Cannot access|manifest must request permission/i.test(msg)) {
      await failDispatch(updated, 'INPUT_NOT_FOUND', msg, false);
    } else {
      await failDispatch(updated, 'EXECUTE_SCRIPT_FAILED', msg, true);
    }
    return;
  }

  // Send ADAPTER_DISPATCH message — adapter's content-script listener responds.
  // SW discipline (CLAUDE.md): no setTimeout. The 30s chrome.alarms backstop
  // (DISPATCH_TIMEOUT_MINUTES) handles timeout. On sendMessage failure, re-check
  // tab URL for login redirect (Discord SPA returns 200 then client-side redirects).
  let response: { ok: boolean; code?: string; message?: string; retriable?: boolean };
  try {
    response = await chrome.tabs.sendMessage(tabId, {
      type: 'ADAPTER_DISPATCH',
      payload: {
        dispatchId: updated.dispatchId,
        send_to: updated.send_to,
        prompt: updated.prompt,
        snapshot: updated.snapshot,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // On sendMessage failure, re-check the tab URL for login redirect
    if (/Receiving end does not exist|Could not establish connection/i.test(msg)) {
      let actualUrl: string | undefined;
      try {
        const tab = await chrome.tabs.get(tabId);
        actualUrl = tab.url;
      } catch {
        // Tab closed
      }
      if (actualUrl) {
        const adapter = findAdapter(updated.send_to);
        // If URL no longer matches the adapter (e.g., redirected to /login)
        if (adapter && !adapter.match(actualUrl)) {
          await failDispatch(updated, 'NOT_LOGGED_IN', `Redirected to ${actualUrl}`, true);
          return;
        }
      }
    }

    await failDispatch(updated, 'EXECUTE_SCRIPT_FAILED', msg, true);
    return;
  }

  if (response.ok) {
    await succeedDispatch(updated);
    return;
  }

  // Backstop remap (debug session discord-login-detection, 2026-05-07):
  // The adapter may return INPUT_NOT_FOUND from its "Channel mismatch" branch when
  // Discord has navigated the tab away from /channels/<g>/<c> to a non-channel URL
  // (e.g. /login, /, /register) BEFORE the adapter's URL probe runs. The adapter
  // cannot tell from inside content-script context whether that off-channel URL is
  // a logged-out redirect; the pipeline can — by re-checking the tab URL host vs.
  // adapter.match(). Promote INPUT_NOT_FOUND -> NOT_LOGGED_IN when host still
  // matches but URL pattern doesn't. Other INPUT_NOT_FOUND causes (legit "editor
  // not found" on a still-channel URL) are unaffected.
  const rawCode = response.code ?? 'INTERNAL';
  const code: ErrorCode = isErrorCode(rawCode) ? rawCode : 'INTERNAL';
  const message = response.message ?? 'Adapter returned an unknown error';
  const retriable = response.retriable ?? false;
  if (code === 'INPUT_NOT_FOUND') {
    const adapter = findAdapter(updated.send_to);
    if (adapter && adapter.hostMatches.length > 0) {
      try {
        const tab = await chrome.tabs.get(tabId);
        const actualUrl = tab.url;
        if (actualUrl && isOnAdapterHost(adapter, actualUrl) && !adapter.match(actualUrl)) {
          await failDispatch(updated, 'NOT_LOGGED_IN', `Redirected to ${actualUrl}`, true);
          return;
        }
      } catch {
        // Tab closed — leave INPUT_NOT_FOUND as-is.
      }
    }
  }

  await failDispatch(updated, code, message, retriable);
}

async function succeedDispatch(record: DispatchRecord): Promise<void> {
  const done: DispatchRecord = {
    ...record,
    state: 'done',
    last_state_at: new Date().toISOString(),
  };
  await dispatchRepo.set(done);

  // D-36: clear popupDraft on done.
  await draftRepo.clear();

  // D-29 / D-27: persist binding + history (only on success — failure leaves draft for retry).
  await historyRepo.addSendTo(done.send_to);
  if (done.prompt) await historyRepo.addPrompt(done.prompt);
  await bindingRepo.upsert(done.send_to, done.prompt, { mark_dispatched: true });

  await chrome.action.setBadgeText({ text: 'ok' });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.ok });
  await chrome.alarms.create(`${ALARM_PREFIX_BADGE_CLEAR}${done.dispatchId}`, {
    delayInMinutes: BADGE_OK_CLEAR_MINUTES,
  });
  await chrome.alarms.clear(`${ALARM_PREFIX_TIMEOUT}${done.dispatchId}`);
  await dispatchRepo.clearActive();
}

async function failDispatch(
  record: DispatchRecord,
  code: ErrorCode,
  message: string,
  retriable: boolean,
): Promise<void> {
  const failed: DispatchRecord = {
    ...record,
    state: 'error',
    last_state_at: new Date().toISOString(),
    error: { code, message, retriable },
  };
  await dispatchRepo.set(failed);
  await chrome.action.setBadgeText({ text: 'err' });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.err });
  await chrome.alarms.clear(`${ALARM_PREFIX_TIMEOUT}${failed.dispatchId}`);
}

/**
 * Shared helper: advance dispatch records after tab load or SPA navigation completes.
 * Used by both onTabComplete and onSpaHistoryStateUpdated.
 */
async function advanceDispatchForTab(tabId: number): Promise<void> {
  const all = await dispatchRepo.listAll();
  for (const record of all) {
    if (record.state !== 'awaiting_complete') continue;
    if (record.target_tab_id !== tabId) continue;
    const adapter = findAdapter(record.send_to);
    if (!adapter) {
      await failDispatch(
        record,
        'INTERNAL',
        'Adapter disappeared between opening and complete',
        false,
      );
      continue;
    }

    // Phase 5 D-70: Login redirect detection for Discord (and future adapters).
    // After tab completes loading, check if the actual URL still matches the adapter.
    // If tab URL is on the adapter's host but doesn't match adapter.match(),
    // a redirect occurred (e.g., discord.com/login?redirect_to=...).
    if (adapter.hostMatches.length > 0) {
      let actualUrl: string | undefined;
      try {
        const tab = await chrome.tabs.get(tabId);
        actualUrl = tab.url;
      } catch {
        // Tab may have been closed
      }
      if (actualUrl && !adapter.match(actualUrl) && isOnAdapterHost(adapter, actualUrl)) {
        await failDispatch(record, 'NOT_LOGGED_IN', `Redirected to ${actualUrl}`, true);
        continue;
      }
    }

    await advanceToAdapterInjection(record, adapter.scriptFile);
  }
}

/**
 * tabs.onUpdated listener -- top-level registered in entrypoints/background.ts.
 *
 * Delegates to advanceDispatchForTab after filtering for 'complete' status.
 * SW restart safe: even if SW died between opening and complete, this listener
 * is re-registered on next SW wake (FND-02), and the next 'complete' resumes.
 */
export async function onTabComplete(
  tabId: number,
  changeInfo: chrome.tabs.OnUpdatedInfo,
  _tab: chrome.tabs.Tab,
): Promise<void> {
  if (changeInfo.status !== 'complete') return;
  await advanceDispatchForTab(tabId);
}

/**
 * Dedicated SPA history handler (D-106).
 * Shares advanceDispatchForTab with onTabComplete but is semantically separate.
 */
export function onSpaHistoryStateUpdated(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails,
): void {
  void advanceDispatchForTab(details.tabId);
}

export async function onAlarmFired(alarm: chrome.alarms.Alarm): Promise<void> {
  if (alarm.name.startsWith(ALARM_PREFIX_TIMEOUT)) {
    const dispatchId = alarm.name.slice(ALARM_PREFIX_TIMEOUT.length);
    const record = await dispatchRepo.get(dispatchId);
    if (!record) return;
    if (record.state === 'done' || record.state === 'error' || record.state === 'cancelled') return;
    await failDispatch(record, 'TIMEOUT', 'dispatch did not complete within 30s', true);
    return;
  }
  if (alarm.name.startsWith(ALARM_PREFIX_BADGE_CLEAR)) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }
}

export async function cancelDispatch(
  input: DispatchCancelInput,
): Promise<Result<DispatchCancelOutput>> {
  const record = await dispatchRepo.get(input.dispatchId);
  if (!record) {
    return Err('INTERNAL', `dispatchId ${input.dispatchId} not found`, false);
  }
  if (record.state === 'done' || record.state === 'error' || record.state === 'cancelled') {
    return Ok({ dispatchId: record.dispatchId, state: record.state });
  }
  const cancelled: DispatchRecord = {
    ...record,
    state: 'cancelled',
    last_state_at: new Date().toISOString(),
  };
  await dispatchRepo.set(cancelled);
  await chrome.alarms.clear(`${ALARM_PREFIX_TIMEOUT}${cancelled.dispatchId}`);
  await chrome.action.setBadgeText({ text: '' });
  await dispatchRepo.clearActive();
  return Ok({ dispatchId: cancelled.dispatchId, state: 'cancelled' });
}
