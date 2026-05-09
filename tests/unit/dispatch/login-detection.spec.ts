/**
 * Unit tests for dispatch-pipeline login redirect detection (D-70).
 *
 * Validates that onTabComplete detects Discord login redirects:
 * when a tab URL is on the adapter's host but doesn't match adapter.match(),
 * the dispatch should fail with NOT_LOGGED_IN.
 *
 * Also covers the post-launch fix (debug session discord-login-detection,
 * 2026-05-07): when the adapter returns INPUT_NOT_FOUND but the tab URL
 * has navigated to a non-channel discord.com URL (e.g. /login or /), the
 * pipeline should remap the error code to NOT_LOGGED_IN.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { onTabComplete, startDispatch } from '@/background/dispatch-pipeline';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import type { DispatchRecord } from '@/shared/storage/repos/dispatch';
import { definePlatformId } from '@/shared/adapters/types';

const DISCORD_CHANNEL_URL = 'https://discord.com/channels/123/456';
const DISCORD_LOGIN_URL = 'https://discord.com/login?redirect_to=%2Fchannels%2F123%2F456';
const DISCORD_ROOT_URL = 'https://discord.com/';
const OPENCLAW_URL = 'http://localhost:18789/chat?session=agent:test:s1';

const TAB_ID = 42;

function makeRecord(overrides: Partial<DispatchRecord> = {}): DispatchRecord {
  return {
    schemaVersion: 1,
    dispatchId: 'test-dispatch-001',
    state: 'awaiting_complete',
    target_tab_id: TAB_ID,
    send_to: DISCORD_CHANNEL_URL,
    prompt: 'hello',
    snapshot: {
      title: 'Test',
      url: 'https://example.com',
      description: 'desc',
      create_at: '2026-05-05T00:00:00Z',
      content: 'body',
    },
    platform_id: definePlatformId('discord'),
    started_at: '2026-05-05T00:00:00Z',
    last_state_at: '2026-05-05T00:00:00Z',
    ...overrides,
  };
}

describe('dispatch-pipeline login detection (D-70)', () => {
  beforeEach(() => {
    fakeBrowser.reset();

    // Stub chrome.action (badge)
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: {
        ...chrome.tabs,
        get: vi.fn(),
        sendMessage: vi.fn().mockResolvedValue({ ok: true }),
      },
      scripting: {
        ...chrome.scripting,
        executeScript: vi.fn().mockResolvedValue([{ result: undefined }]),
      },
      action: {
        ...chrome.action,
        setBadgeText: vi.fn().mockResolvedValue(undefined),
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      },
      alarms: {
        ...chrome.alarms,
        create: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(true),
      },
      storage: chrome.storage,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls failDispatch with NOT_LOGGED_IN when tab URL is discord.com/login', async () => {
    // Arrange: store a dispatch record awaiting_complete
    const record = makeRecord();
    await dispatchRepo.set(record);

    // Mock chrome.tabs.get to return the login URL
    (chrome.tabs.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: TAB_ID,
      url: DISCORD_LOGIN_URL,
    });

    // Act
    await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

    // Assert: record should be in error state with NOT_LOGGED_IN
    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.state).toBe('error');
    expect(updated?.error?.code).toBe('NOT_LOGGED_IN');
    expect(updated?.error?.message).toContain('login');

    // advanceToAdapterInjection should NOT have been called (no executeScript)
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('proceeds to advanceToAdapterInjection when tab URL matches adapter', async () => {
    // Arrange
    const record = makeRecord();
    await dispatchRepo.set(record);

    // Mock chrome.tabs.get to return the matching channel URL
    (chrome.tabs.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: TAB_ID,
      url: DISCORD_CHANNEL_URL,
    });

    // Act
    await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

    // Assert: executeScript should have been called (adapter injection proceeded)
    expect(chrome.scripting.executeScript).toHaveBeenCalled();

    // Record should NOT be in error with NOT_LOGGED_IN
    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.error?.code).not.toBe('NOT_LOGGED_IN');
  });

  it('skips login check for adapters with empty hostMatches (openclaw)', async () => {
    // Arrange: record targeting openclaw (empty hostMatches)
    const record = makeRecord({ send_to: OPENCLAW_URL, platform_id: definePlatformId('openclaw') });
    await dispatchRepo.set(record);

    // Act
    await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

    // Assert: chrome.tabs.get was NOT called (login check skipped for empty hostMatches)
    expect(chrome.tabs.get).not.toHaveBeenCalled();

    // executeScript should have been called (adapter injection proceeded)
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
  });

  it('does nothing when changeInfo.status is not complete', async () => {
    const record = makeRecord();
    await dispatchRepo.set(record);

    await onTabComplete(TAB_ID, { status: 'loading' }, {} as chrome.tabs.Tab);

    // Record should remain unchanged
    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.state).toBe('awaiting_complete');
    expect(chrome.tabs.get).not.toHaveBeenCalled();
  });
});

/**
 * Backstop remap added in debug session discord-login-detection (2026-05-07).
 *
 * When the Discord adapter races against a tab navigation to /login or /,
 * its `extractChannelId(window.location.href)` returns null and it emits
 * INPUT_NOT_FOUND ("Channel mismatch"). The pipeline must detect this and
 * remap to NOT_LOGGED_IN so the user gets the correct error banner.
 *
 * We exercise the path via startDispatch with `expectsCompleteEvent: false`
 * (tab already at the target URL) — that drives advanceToAdapterInjection
 * directly so we can assert on the response handling.
 */
describe('dispatch-pipeline INPUT_NOT_FOUND -> NOT_LOGGED_IN remap (post-launch fix)', () => {
  const SEND_TO = DISCORD_CHANNEL_URL;
  const DISPATCH_ID = 'remap-001';
  const TAB_ID_REMAP = 99;

  function baseStartInput() {
    return {
      dispatchId: DISPATCH_ID,
      send_to: SEND_TO,
      prompt: 'hi',
      snapshot: {
        title: 'T',
        url: 'https://x.com',
        description: '',
        create_at: '',
        content: 'c',
      },
    };
  }

  beforeEach(() => {
    fakeBrowser.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubChrome(opts: {
    tabsGetUrl: string | null;
    sendMessageResponse: { ok: boolean; code?: string; message?: string; retriable?: boolean };
  }) {
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: {
        ...chrome.tabs,
        // tabs.query returns existing matching tab so startDispatch's openOrActivateTab
        // takes the "exact URL match, already complete" branch — fast-path.
        query: vi
          .fn()
          .mockResolvedValue([{ id: TAB_ID_REMAP, url: SEND_TO, status: 'complete', windowId: 1 }]),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({
          id: TAB_ID_REMAP,
          url: opts.tabsGetUrl,
        }),
        sendMessage: vi.fn().mockResolvedValue(opts.sendMessageResponse),
      },
      windows: {
        ...chrome.windows,
        update: vi.fn().mockResolvedValue(undefined),
      },
      scripting: {
        ...chrome.scripting,
        executeScript: vi.fn().mockResolvedValue([{ result: undefined }]),
      },
      action: {
        ...chrome.action,
        setBadgeText: vi.fn().mockResolvedValue(undefined),
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      },
      alarms: {
        ...chrome.alarms,
        create: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(true),
      },
      storage: chrome.storage,
      permissions: chrome.permissions,
    });
  }

  it('remaps INPUT_NOT_FOUND to NOT_LOGGED_IN when tab URL is /login on discord.com', async () => {
    stubChrome({
      tabsGetUrl: DISCORD_LOGIN_URL,
      sendMessageResponse: {
        ok: false,
        code: 'INPUT_NOT_FOUND',
        message: 'Channel mismatch',
        retriable: false,
      },
    });

    await startDispatch(baseStartInput());

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.state).toBe('error');
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stored?.error?.message).toContain('discord.com');
    expect(stored?.error?.retriable).toBe(true);
  });

  it('remaps INPUT_NOT_FOUND to NOT_LOGGED_IN when tab URL is discord.com root', async () => {
    stubChrome({
      tabsGetUrl: DISCORD_ROOT_URL,
      sendMessageResponse: {
        ok: false,
        code: 'INPUT_NOT_FOUND',
        message: 'Channel mismatch',
        retriable: false,
      },
    });

    await startDispatch(baseStartInput());

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
  });

  it('keeps INPUT_NOT_FOUND when tab URL is still on a valid channel (genuine editor failure)', async () => {
    stubChrome({
      tabsGetUrl: DISCORD_CHANNEL_URL,
      sendMessageResponse: {
        ok: false,
        code: 'INPUT_NOT_FOUND',
        message: 'Editor not found',
        retriable: true,
      },
    });

    await startDispatch(baseStartInput());

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.error?.code).toBe('INPUT_NOT_FOUND');
    expect(stored?.error?.message).toBe('Editor not found');
  });

  it('passes through NOT_LOGGED_IN from adapter unchanged (DOM-detected login wall)', async () => {
    stubChrome({
      tabsGetUrl: DISCORD_CHANNEL_URL,
      sendMessageResponse: {
        ok: false,
        code: 'NOT_LOGGED_IN',
        message: 'Discord login required (login UI detected)',
        retriable: true,
      },
    });

    await startDispatch(baseStartInput());

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stored?.error?.message).toContain('login UI detected');
  });
});
