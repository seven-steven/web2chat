/**
 * Unit tests for dispatch-pipeline login redirect detection (D-70).
 *
 * Validates that onTabComplete detects Discord login redirects:
 * when a tab URL is on the adapter's host but doesn't match adapter.match(),
 * the dispatch should fail with NOT_LOGGED_IN.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { onTabComplete } from '@/background/dispatch-pipeline';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import type { DispatchRecord } from '@/shared/storage/repos/dispatch';

const DISCORD_CHANNEL_URL = 'https://discord.com/channels/123/456';
const DISCORD_LOGIN_URL = 'https://discord.com/login?redirect_to=%2Fchannels%2F123%2F456';
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
    platform_id: 'discord',
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
    const record = makeRecord({ send_to: OPENCLAW_URL, platform_id: 'openclaw' });
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
