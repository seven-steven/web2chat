/**
 * Unit tests for dispatch pipeline state machine (D-31..D-34, DSP-05..DSP-09).
 *
 * Uses the direct stubChrome pattern from tests/unit/messaging/capture.spec.ts.
 * Each test builds a minimal chrome.* stub with vi.fn() spies, stubs it globally,
 * then exercises the real pipeline functions imported from @/background/dispatch-pipeline.
 *
 * Storage: fakeBrowser.storage.session is used for dispatchRepo reads/writes.
 * fakeBrowser.reset() in beforeEach ensures clean state.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  startDispatch,
  cancelDispatch,
  onTabComplete,
  onAlarmFired,
  BADGE_COLORS,
  BADGE_OK_CLEAR_MINUTES,
  DISPATCH_TIMEOUT_MINUTES,
} from '@/background/dispatch-pipeline';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import {
  sendToHistoryItem,
  promptHistoryItem,
  bindingsItem,
  popupDraftItem,
  POPUP_DRAFT_DEFAULT,
} from '@/shared/storage/items';
import type { ArticleSnapshot } from '@/shared/messaging';
import { definePlatformId } from '@/shared/adapters/types';

const fakeSnapshot: ArticleSnapshot = {
  title: 't',
  url: 'https://example.com/',
  description: 'd',
  create_at: '2026-04-30T00:00:00.000Z',
  content: 'c',
};

const baseInput = {
  dispatchId: '00000000-0000-4000-8000-000000000001',
  send_to: 'http://localhost:4321/mock-platform.html',
  prompt: 'hi',
  snapshot: fakeSnapshot,
};

/** Build a minimal chrome.* stub. Use vi.fn() so spy calls can be asserted. */
function buildChromeStub(overrides: Record<string, unknown> = {}) {
  const tabsCreate = vi.fn().mockResolvedValue({ id: 42 });
  const tabsUpdate = vi.fn().mockResolvedValue({ id: 42 });
  const tabsQuery = vi.fn().mockResolvedValue([]);
  const tabsSendMessage = vi.fn().mockResolvedValue({ ok: true });
  const windowsUpdate = vi.fn().mockResolvedValue(undefined);
  const executeScript = vi.fn().mockResolvedValue([{ result: undefined }]);
  const setBadgeText = vi.fn().mockResolvedValue(undefined);
  const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);
  const alarmsCreate = vi.fn().mockResolvedValue(undefined);
  const alarmsClear = vi.fn().mockResolvedValue(true);
  // storage.session uses fakeBrowser to keep dispatchRepo working.
  return {
    tabs: {
      create: tabsCreate,
      update: tabsUpdate,
      query: tabsQuery,
      sendMessage: tabsSendMessage,
      onUpdated: { addListener: vi.fn() },
    },
    windows: { update: windowsUpdate },
    scripting: { executeScript },
    action: { setBadgeText, setBadgeBackgroundColor },
    alarms: { create: alarmsCreate, clear: alarmsClear, onAlarm: { addListener: vi.fn() } },
    storage: fakeBrowser.storage, // delegate to fakeBrowser for session reads
    runtime: { lastError: undefined },
    ...overrides,
  };
}

describe('background/dispatch-pipeline — startDispatch (D-31, D-32, DSP-05)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns Err(PLATFORM_UNSUPPORTED) when no adapter matches send_to (D-25)', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    const result = await startDispatch({ ...baseInput, send_to: 'https://unsupported.example/' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('PLATFORM_UNSUPPORTED');
      expect(result.retriable).toBe(false);
    }
    expect(stub.tabs.create).not.toHaveBeenCalled();
  });

  it('writes pending -> awaiting_complete and creates new tab when none matches', async () => {
    const stub = buildChromeStub({
      tabs: { ...buildChromeStub().tabs, query: vi.fn().mockResolvedValue([]) },
    });
    vi.stubGlobal('chrome', stub);
    const result = await startDispatch(baseInput);
    expect(result.ok).toBe(true);
    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('awaiting_complete');
    expect(record?.target_tab_id).toBe(42);
    expect(stub.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: baseInput.send_to, active: true }),
    );
    expect(stub.alarms.create).toHaveBeenCalledWith(
      expect.stringMatching(/^dispatch-timeout:/),
      expect.objectContaining({ delayInMinutes: DISPATCH_TIMEOUT_MINUTES }),
    );
    expect(stub.action.setBadgeText).toHaveBeenCalledWith({ text: '...' });
    expect(stub.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: BADGE_COLORS.loading,
    });
  });

  it('idempotent: existing dispatchId returns current state without re-dispatching (D-32)', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    await startDispatch(baseInput); // first
    const create1 = stub.tabs.create.mock.calls.length;
    const result2 = await startDispatch(baseInput); // second with same dispatchId
    expect(result2.ok).toBe(true);
    // No second create call.
    expect(stub.tabs.create.mock.calls.length).toBe(create1);
  });

  it('updates existing tab when send_to URL hash differs', async () => {
    const stub = buildChromeStub({
      tabs: {
        ...buildChromeStub().tabs,
        query: vi.fn().mockResolvedValue([
          {
            id: 42,
            url: 'http://localhost:4321/mock-platform.html?old=1',
            windowId: 1,
            status: 'complete',
          },
        ]),
      },
    });
    vi.stubGlobal('chrome', stub);
    await startDispatch(baseInput);
    expect(stub.tabs.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ url: baseInput.send_to, active: true }),
    );
  });

  // -- Test 5a (split) — fast-path advancement ONLY --
  it('Pitfall 5 fast-path: same-URL tab already complete -> record advances to awaiting_adapter (NOT awaiting_complete)', async () => {
    const stub = buildChromeStub({
      tabs: {
        ...buildChromeStub().tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: 42, url: baseInput.send_to, windowId: 1, status: 'complete' }]),
        // Stub sendMessage so it does NOT resolve Ok — isolates fast-path detection
        // from adapter-success path. Makes sendMessage hang (never resolves) so the
        // record stays at awaiting_adapter throughout.
        sendMessage: vi.fn(() => new Promise(() => {})),
      },
    });
    vi.stubGlobal('chrome', stub);
    const startPromise = startDispatch(baseInput);
    // Allow the synchronous code path through advanceToAdapterInjection to run
    // and write 'awaiting_adapter' to storage; sendMessage hangs indefinitely.
    await new Promise((r) => setTimeout(r, 10));
    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('awaiting_adapter');
    expect(stub.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 42 },
        files: ['content-scripts/mock-platform.js'],
      }),
    );
    // Cleanup: don't await the hung promise.
    startPromise.catch(() => {});
  });

  // -- Test 5b (split) — adapter sendMessage success path --
  it('Pitfall 5 fast-path: when adapter sendMessage resolves Ok -> record advances to done', async () => {
    const stub = buildChromeStub({
      tabs: {
        ...buildChromeStub().tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: 42, url: baseInput.send_to, windowId: 1, status: 'complete' }]),
        sendMessage: vi.fn().mockResolvedValue({ ok: true }),
      },
    });
    vi.stubGlobal('chrome', stub);
    await startDispatch(baseInput);
    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('done');
  });
});

describe('background/dispatch-pipeline — onTabComplete (D-33)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('no-op when status !== complete', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    await onTabComplete(99, { status: 'loading' }, {} as chrome.tabs.Tab);
    expect(stub.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('advances awaiting_complete record matching tabId -> awaiting_adapter + executeScript', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    await dispatchRepo.set({
      schemaVersion: 1,
      dispatchId: baseInput.dispatchId,
      state: 'awaiting_complete',
      target_tab_id: 42,
      send_to: baseInput.send_to,
      prompt: 'p',
      snapshot: fakeSnapshot,
      platform_id: definePlatformId('mock'),
      started_at: '2026-04-30T00:00:00.000Z',
      last_state_at: '2026-04-30T00:00:00.000Z',
    });
    await onTabComplete(42, { status: 'complete' }, {} as chrome.tabs.Tab);
    expect(stub.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 42 },
        files: ['content-scripts/mock-platform.js'],
      }),
    );
    const record = await dispatchRepo.get(baseInput.dispatchId);
    // State will be 'done' after sendMessage Ok mock — assert at least it is past awaiting_complete.
    expect(record?.state).toBe('done');
  });

  it('advances awaiting_complete only once when complete events race for the same tab', async () => {
    let releaseSendMessage!: () => void;
    const sendMessageGate = new Promise<{ ok: true }>((resolve) => {
      releaseSendMessage = () => resolve({ ok: true });
    });
    const stub = buildChromeStub({
      tabs: {
        ...buildChromeStub().tabs,
        get: vi.fn().mockResolvedValue({ id: 42, url: baseInput.send_to }),
        sendMessage: vi.fn().mockReturnValue(sendMessageGate),
      },
    });
    vi.stubGlobal('chrome', stub);
    await dispatchRepo.set({
      schemaVersion: 1,
      dispatchId: baseInput.dispatchId,
      state: 'awaiting_complete',
      target_tab_id: 42,
      send_to: baseInput.send_to,
      prompt: 'p',
      snapshot: fakeSnapshot,
      platform_id: definePlatformId('mock'),
      started_at: '2026-04-30T00:00:00.000Z',
      last_state_at: '2026-04-30T00:00:00.000Z',
    });

    const first = onTabComplete(42, { status: 'complete' }, {} as chrome.tabs.Tab);
    const second = onTabComplete(42, { status: 'complete' }, {} as chrome.tabs.Tab);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stub.scripting.executeScript).toHaveBeenCalledTimes(1);
    expect(stub.tabs.sendMessage).toHaveBeenCalledTimes(1);

    releaseSendMessage();
    await Promise.all([first, second]);
  });
});

describe('background/dispatch-pipeline — success path (D-36)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('on done: setBadgeText(ok) + alarms.create badge-clear + repos updated + draft cleared', async () => {
    const stub = buildChromeStub({
      tabs: {
        ...buildChromeStub().tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: 42, url: baseInput.send_to, windowId: 1, status: 'complete' }]),
      },
    });
    vi.stubGlobal('chrome', stub);
    // pre-seed popupDraft
    await popupDraftItem.setValue({
      ...POPUP_DRAFT_DEFAULT,
      send_to: 'pre-existing',
      updated_at: new Date().toISOString(),
    });

    await startDispatch(baseInput);

    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('done');

    expect(stub.action.setBadgeText).toHaveBeenCalledWith({ text: 'ok' });
    expect(stub.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: BADGE_COLORS.ok });
    expect(stub.alarms.create).toHaveBeenCalledWith(
      expect.stringMatching(/^badge-clear:/),
      expect.objectContaining({ delayInMinutes: BADGE_OK_CLEAR_MINUTES }),
    );

    // history + binding persisted
    const sendToHist = await sendToHistoryItem.getValue();
    expect(sendToHist.find((e) => e.value === baseInput.send_to)).toBeDefined();
    const promptHist = await promptHistoryItem.getValue();
    expect(promptHist.find((e) => e.value === baseInput.prompt)).toBeDefined();
    const bindings = await bindingsItem.getValue();
    expect(bindings[baseInput.send_to]?.prompt).toBe(baseInput.prompt);

    // popupDraft cleared (back to sentinel)
    const draft = await popupDraftItem.getValue();
    expect(draft.send_to).toBe('');
    expect(draft.updated_at).toBe(POPUP_DRAFT_DEFAULT.updated_at);
  });
});

describe('background/dispatch-pipeline — failure path (DSP-07)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('executeScript "Cannot access" -> Err(INPUT_NOT_FOUND, retriable=false) per Pitfall 3', async () => {
    const stub = buildChromeStub({
      tabs: {
        ...buildChromeStub().tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: 42, url: baseInput.send_to, windowId: 1, status: 'complete' }]),
      },
      scripting: {
        executeScript: vi
          .fn()
          .mockRejectedValue(new Error('Cannot access contents of url chrome://...')),
      },
    });
    vi.stubGlobal('chrome', stub);
    await startDispatch(baseInput);
    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('error');
    expect(record?.error?.code).toBe('INPUT_NOT_FOUND');
    expect(record?.error?.retriable).toBe(false);
  });

  it('executeScript generic error -> Err(EXECUTE_SCRIPT_FAILED, retriable=true)', async () => {
    const stub = buildChromeStub({
      tabs: {
        ...buildChromeStub().tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: 42, url: baseInput.send_to, windowId: 1, status: 'complete' }]),
      },
      scripting: {
        executeScript: vi.fn().mockRejectedValue(new Error('Frame removed')),
      },
    });
    vi.stubGlobal('chrome', stub);
    await startDispatch(baseInput);
    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.error?.code).toBe('EXECUTE_SCRIPT_FAILED');
    expect(record?.error?.retriable).toBe(true);
  });

  it('adapter sendMessage returns Err(NOT_LOGGED_IN) -> state=error + setBadgeText(err)', async () => {
    const stub = buildChromeStub({
      tabs: {
        ...buildChromeStub().tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: 42, url: baseInput.send_to, windowId: 1, status: 'complete' }]),
        sendMessage: vi.fn().mockResolvedValue({
          ok: false,
          code: 'NOT_LOGGED_IN',
          message: 'login wall',
          retriable: false,
        }),
      },
    });
    vi.stubGlobal('chrome', stub);
    await startDispatch(baseInput);
    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('error');
    expect(record?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stub.action.setBadgeText).toHaveBeenCalledWith({ text: 'err' });
    expect(stub.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: BADGE_COLORS.err });
  });
});

describe('background/dispatch-pipeline — onAlarmFired (D-33 / D-34)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('dispatch-timeout:<id> on awaiting_complete -> state=error code=TIMEOUT', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    await dispatchRepo.set({
      schemaVersion: 1,
      dispatchId: baseInput.dispatchId,
      state: 'awaiting_complete',
      target_tab_id: 42,
      send_to: baseInput.send_to,
      prompt: 'p',
      snapshot: fakeSnapshot,
      platform_id: definePlatformId('mock'),
      started_at: '2026-04-30T00:00:00.000Z',
      last_state_at: '2026-04-30T00:00:00.000Z',
    });
    await onAlarmFired({
      name: `dispatch-timeout:${baseInput.dispatchId}`,
      scheduledTime: 0,
    } as chrome.alarms.Alarm);
    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('error');
    expect(record?.error?.code).toBe('TIMEOUT');
  });

  it('dispatch-timeout:<id> on already-done record is no-op', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    await dispatchRepo.set({
      schemaVersion: 1,
      dispatchId: baseInput.dispatchId,
      state: 'done',
      target_tab_id: 42,
      send_to: baseInput.send_to,
      prompt: 'p',
      snapshot: fakeSnapshot,
      platform_id: definePlatformId('mock'),
      started_at: '2026-04-30T00:00:00.000Z',
      last_state_at: '2026-04-30T00:00:00.000Z',
    });
    await onAlarmFired({
      name: `dispatch-timeout:${baseInput.dispatchId}`,
      scheduledTime: 0,
    } as chrome.alarms.Alarm);
    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('done');
  });

  it('badge-clear:<id> -> setBadgeText("") (D-34 ok auto-clear)', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    await onAlarmFired({
      name: `badge-clear:${baseInput.dispatchId}`,
      scheduledTime: 0,
    } as chrome.alarms.Alarm);
    expect(stub.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });
});

describe('background/dispatch-pipeline — cancelDispatch', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('in-flight -> state=cancelled + alarms.clear + setBadgeText("")', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    await dispatchRepo.set({
      schemaVersion: 1,
      dispatchId: baseInput.dispatchId,
      state: 'awaiting_complete',
      target_tab_id: 42,
      send_to: baseInput.send_to,
      prompt: 'p',
      snapshot: fakeSnapshot,
      platform_id: definePlatformId('mock'),
      started_at: '2026-04-30T00:00:00.000Z',
      last_state_at: '2026-04-30T00:00:00.000Z',
    });
    const result = await cancelDispatch({ dispatchId: baseInput.dispatchId });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.state).toBe('cancelled');
    expect(stub.alarms.clear).toHaveBeenCalledWith(`dispatch-timeout:${baseInput.dispatchId}`);
    expect(stub.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  it('terminal state (done/error/cancelled) -> return current state without changing', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);
    await dispatchRepo.set({
      schemaVersion: 1,
      dispatchId: baseInput.dispatchId,
      state: 'done',
      target_tab_id: 42,
      send_to: baseInput.send_to,
      prompt: 'p',
      snapshot: fakeSnapshot,
      platform_id: definePlatformId('mock'),
      started_at: '2026-04-30T00:00:00.000Z',
      last_state_at: '2026-04-30T00:00:00.000Z',
    });
    const result = await cancelDispatch({ dispatchId: baseInput.dispatchId });
    if (result.ok) expect(result.data.state).toBe('done');
  });
});

describe('background/dispatch-pipeline — exported constants (DEVIATIONS.md D-34)', () => {
  it('BADGE_COLORS matches D-34 LOCKED hex values', () => {
    expect(BADGE_COLORS.loading).toBe('#94a3b8');
    expect(BADGE_COLORS.ok).toBe('#22c55e');
    expect(BADGE_COLORS.err).toBe('#ef4444');
  });
  it('BADGE_OK_CLEAR_MINUTES = 0.5 (30s, DEVIATIONS.md D-34 5s->30s)', () => {
    expect(BADGE_OK_CLEAR_MINUTES).toBe(0.5);
    expect(DISPATCH_TIMEOUT_MINUTES).toBe(0.5);
  });
});
