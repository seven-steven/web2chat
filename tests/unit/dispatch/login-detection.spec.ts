/**
 * Unit tests for registry-owned logged-out URL detection (D-115..D-118).
 *
 * URL-layer NOT_LOGGED_IN remap is driven only by adapter.loggedOutPathPatterns.
 * Same-host but non-matching URLs are not generic login redirects.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  onSpaHistoryStateUpdated,
  onTabComplete,
  startDispatch,
} from '@/background/dispatch-pipeline';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import type { DispatchRecord } from '@/shared/storage/repos/dispatch';
import { definePlatformId } from '@/shared/adapters/types';

const DISCORD_CHANNEL_URL = 'https://discord.com/channels/123/456';
const DISCORD_LOGIN_URL = 'https://discord.com/login?redirect_to=%2Fchannels%2F123%2F456';
const DISCORD_ROOT_URL = 'https://discord.com/';
const DISCORD_REGISTER_URL = 'https://discord.com/register';
const DISCORD_SAME_HOST_NON_LOGIN_URL = 'https://discord.com/channels/@me';
const SLACK_CHANNEL_URL = 'https://app.slack.com/client/T123/C456';
const SLACK_WORKSPACE_SIGNIN_URL =
  'https://app.slack.com/workspace-signin?redir=%2Fclient%2FT123%2FC456';
const SLACK_LOGIN_URL = 'https://slack.com/check-login?redir=%2Fclient%2FT123%2FC456';
const OPENCLAW_URL = 'http://localhost:18789/chat?session=agent:test:s1';
const OPENCLAW_LOGIN_URL = 'http://localhost:18789/login?redirect=/chat%3Fsession%3Dagent:test:s1';

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

function stubChromeForAwaitingComplete(actualUrl: string | undefined): void {
  vi.stubGlobal('chrome', {
    ...chrome,
    tabs: {
      ...chrome.tabs,
      get: vi.fn().mockResolvedValue({ id: TAB_ID, url: actualUrl }),
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
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('dispatch-pipeline loggedOutPathPatterns detection (D-115..D-118)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('remaps tab complete to NOT_LOGGED_IN when Discord URL matches /login*', async () => {
    const record = makeRecord();
    await dispatchRepo.set(record);
    stubChromeForAwaitingComplete(DISCORD_LOGIN_URL);

    await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.state).toBe('error');
    expect(updated?.error?.code).toBe('NOT_LOGGED_IN');
    expect(updated?.error?.message).toContain('login');
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('remaps SPA history advancement to NOT_LOGGED_IN when Discord URL matches /register*', async () => {
    const record = makeRecord({ dispatchId: 'test-dispatch-spa' });
    await dispatchRepo.set(record);
    stubChromeForAwaitingComplete(DISCORD_REGISTER_URL);

    onSpaHistoryStateUpdated({
      tabId: TAB_ID,
    } as chrome.webNavigation.WebNavigationTransitionCallbackDetails);
    await flush();

    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.state).toBe('error');
    expect(updated?.error?.code).toBe('NOT_LOGGED_IN');
    expect(updated?.error?.message).toContain('register');
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('remaps tab complete to NOT_LOGGED_IN when Slack redirects to app.slack.com/workspace-signin before injection', async () => {
    const record = makeRecord({
      dispatchId: 'test-dispatch-slack-workspace-signin',
      send_to: SLACK_CHANNEL_URL,
      platform_id: definePlatformId('slack'),
    });
    await dispatchRepo.set(record);
    stubChromeForAwaitingComplete(SLACK_WORKSPACE_SIGNIN_URL);

    await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.state).toBe('error');
    expect(updated?.error?.code).toBe('NOT_LOGGED_IN');
    expect(updated?.error?.message).toContain('workspace-signin');
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('remaps tab complete to NOT_LOGGED_IN when Slack redirects to slack.com/check-login before injection', async () => {
    const record = makeRecord({
      dispatchId: 'test-dispatch-slack-complete',
      send_to: SLACK_CHANNEL_URL,
      platform_id: definePlatformId('slack'),
    });
    await dispatchRepo.set(record);
    stubChromeForAwaitingComplete(SLACK_LOGIN_URL);

    await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.state).toBe('error');
    expect(updated?.error?.code).toBe('NOT_LOGGED_IN');
    expect(updated?.error?.message).toContain('slack.com/check-login');
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('does not remap same-host Discord non-matching paths without loggedOutPathPatterns match', async () => {
    const record = makeRecord();
    await dispatchRepo.set(record);
    stubChromeForAwaitingComplete(DISCORD_SAME_HOST_NON_LOGIN_URL);

    await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.error?.code).not.toBe('NOT_LOGGED_IN');
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
  });

  it('does not perform URL-layer remap for OpenClaw because it has no loggedOutPathPatterns', async () => {
    const record = makeRecord({
      send_to: OPENCLAW_URL,
      platform_id: definePlatformId('openclaw'),
    });
    await dispatchRepo.set(record);
    stubChromeForAwaitingComplete(OPENCLAW_LOGIN_URL);

    await onTabComplete(TAB_ID, { status: 'complete' }, {} as chrome.tabs.Tab);

    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.error?.code).not.toBe('NOT_LOGGED_IN');
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
  });

  it('does nothing when changeInfo.status is not complete', async () => {
    const record = makeRecord();
    await dispatchRepo.set(record);
    stubChromeForAwaitingComplete(DISCORD_LOGIN_URL);

    await onTabComplete(TAB_ID, { status: 'loading' }, {} as chrome.tabs.Tab);

    const updated = await dispatchRepo.get(record.dispatchId);
    expect(updated?.state).toBe('awaiting_complete');
    expect(chrome.tabs.get).not.toHaveBeenCalled();
  });
});

describe('dispatch-pipeline INPUT_NOT_FOUND URL remap', () => {
  const DISPATCH_ID = 'remap-001';
  const TAB_ID_REMAP = 99;

  function baseStartInput(sendTo = DISCORD_CHANNEL_URL) {
    return {
      dispatchId: DISPATCH_ID,
      send_to: sendTo,
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
    sendTo?: string;
    tabsGetUrl: string | null;
    sendMessageResponse: { ok: boolean; code?: string; message?: string; retriable?: boolean };
  }) {
    const sendTo = opts.sendTo ?? DISCORD_CHANNEL_URL;
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: {
        ...chrome.tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: TAB_ID_REMAP, url: sendTo, status: 'complete', windowId: 1 }]),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ id: TAB_ID_REMAP, url: opts.tabsGetUrl }),
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
      permissions: {
        ...chrome.permissions,
        contains: vi.fn().mockResolvedValue(true),
      },
    });
  }

  it('remaps executeScript permission errors to NOT_LOGGED_IN when Slack tab URL is app.slack.com/workspace-signin', async () => {
    const sendTo = SLACK_CHANNEL_URL;
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: {
        ...chrome.tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: TAB_ID_REMAP, url: sendTo, status: 'complete', windowId: 1 }]),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ id: TAB_ID_REMAP, url: SLACK_WORKSPACE_SIGNIN_URL }),
        sendMessage: vi.fn(),
      },
      windows: {
        ...chrome.windows,
        update: vi.fn().mockResolvedValue(undefined),
      },
      scripting: {
        ...chrome.scripting,
        executeScript: vi
          .fn()
          .mockRejectedValue(
            new Error(
              'Cannot access contents of url "https://app.slack.com/workspace-signin?redir=%2Fclient%2FT123%2FC456". Extension manifest must request permission to access this host.',
            ),
          ),
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
      permissions: {
        ...chrome.permissions,
        contains: vi.fn().mockResolvedValue(true),
      },
    });

    await startDispatch(baseStartInput(sendTo));

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.state).toBe('error');
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stored?.error?.message).toContain('workspace-signin');
  });

  it('remaps executeScript permission errors to NOT_LOGGED_IN when Slack tab URL is slack.com/check-login', async () => {
    const sendTo = SLACK_CHANNEL_URL;
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: {
        ...chrome.tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: TAB_ID_REMAP, url: sendTo, status: 'complete', windowId: 1 }]),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ id: TAB_ID_REMAP, url: SLACK_LOGIN_URL }),
        sendMessage: vi.fn(),
      },
      windows: {
        ...chrome.windows,
        update: vi.fn().mockResolvedValue(undefined),
      },
      scripting: {
        ...chrome.scripting,
        executeScript: vi
          .fn()
          .mockRejectedValue(new Error('manifest must request permission to access this host')),
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
      permissions: {
        ...chrome.permissions,
        contains: vi.fn().mockResolvedValue(true),
      },
    });

    await startDispatch(baseStartInput(sendTo));

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.state).toBe('error');
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stored?.error?.message).toContain('slack.com/check-login');
  });

  it('does not remap executeScript permission errors for same-host Discord non-login paths', async () => {
    const sendTo = DISCORD_CHANNEL_URL;
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: {
        ...chrome.tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: TAB_ID_REMAP, url: sendTo, status: 'complete', windowId: 1 }]),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ id: TAB_ID_REMAP, url: DISCORD_SAME_HOST_NON_LOGIN_URL }),
        sendMessage: vi.fn(),
      },
      windows: {
        ...chrome.windows,
        update: vi.fn().mockResolvedValue(undefined),
      },
      scripting: {
        ...chrome.scripting,
        executeScript: vi
          .fn()
          .mockRejectedValue(
            new Error(
              'Cannot access contents of url "https://discord.com/channels/@me". Extension manifest must request permission to access this host.',
            ),
          ),
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
      permissions: {
        ...chrome.permissions,
        contains: vi.fn().mockResolvedValue(true),
      },
    });

    await startDispatch(baseStartInput(sendTo));

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.state).toBe('error');
    expect(stored?.error?.code).toBe('INPUT_NOT_FOUND');
    expect(stored?.error?.message).toContain('Cannot access contents of url');
  });

  it('remaps closed async message channels to NOT_LOGGED_IN when Slack tab URL is app.slack.com/signin', async () => {
    const sendTo = SLACK_CHANNEL_URL;
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: {
        ...chrome.tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: TAB_ID_REMAP, url: sendTo, status: 'complete', windowId: 1 }]),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({
          id: TAB_ID_REMAP,
          url: 'https://app.slack.com/signin?redir=%2Fgantry%2Fauth%3Fapp%3Dclient',
        }),
        sendMessage: vi
          .fn()
          .mockRejectedValue(
            new Error(
              'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received',
            ),
          ),
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
      permissions: {
        ...chrome.permissions,
        contains: vi.fn().mockResolvedValue(true),
      },
    });

    await startDispatch(baseStartInput(sendTo));

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.state).toBe('error');
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stored?.error?.message).toContain('app.slack.com/signin');
    expect(stored?.error?.retriable).toBe(true);
  });

  it('remaps BFCache port-closed sendMessage failures to NOT_LOGGED_IN when Slack tab URL is workspace-signin', async () => {
    const sendTo = SLACK_CHANNEL_URL;
    vi.stubGlobal('chrome', {
      ...chrome,
      tabs: {
        ...chrome.tabs,
        query: vi
          .fn()
          .mockResolvedValue([{ id: TAB_ID_REMAP, url: sendTo, status: 'complete', windowId: 1 }]),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ id: TAB_ID_REMAP, url: SLACK_WORKSPACE_SIGNIN_URL }),
        sendMessage: vi
          .fn()
          .mockRejectedValue(
            new Error(
              'The page keeping the extension port is moved into back/forward cache, so the message channel is closed.',
            ),
          ),
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
      permissions: {
        ...chrome.permissions,
        contains: vi.fn().mockResolvedValue(true),
      },
    });

    await startDispatch(baseStartInput(sendTo));

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.state).toBe('error');
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stored?.error?.message).toContain('workspace-signin');
    expect(stored?.error?.retriable).toBe(true);
  });

  it('remaps INPUT_NOT_FOUND to NOT_LOGGED_IN when tab URL matches Discord root loggedOutPathPatterns', async () => {
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
    expect(stored?.state).toBe('error');
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stored?.error?.message).toContain('discord.com');
    expect(stored?.error?.retriable).toBe(true);
  });

  it('remaps INPUT_NOT_FOUND to NOT_LOGGED_IN when Slack tab URL redirects to slack.com/check-login', async () => {
    stubChrome({
      sendTo: SLACK_CHANNEL_URL,
      tabsGetUrl: SLACK_LOGIN_URL,
      sendMessageResponse: {
        ok: false,
        code: 'INPUT_NOT_FOUND',
        message: 'Channel mismatch',
        retriable: false,
      },
    });

    await startDispatch(baseStartInput(SLACK_CHANNEL_URL));

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.state).toBe('error');
    expect(stored?.error?.code).toBe('NOT_LOGGED_IN');
    expect(stored?.error?.message).toContain('slack.com/check-login');
    expect(stored?.error?.retriable).toBe(true);
  });

  it('does not remap INPUT_NOT_FOUND for same-host Discord non-login paths', async () => {
    stubChrome({
      tabsGetUrl: DISCORD_SAME_HOST_NON_LOGIN_URL,
      sendMessageResponse: {
        ok: false,
        code: 'INPUT_NOT_FOUND',
        message: 'Channel mismatch',
        retriable: false,
      },
    });

    await startDispatch(baseStartInput());

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.error?.code).toBe('INPUT_NOT_FOUND');
    expect(stored?.error?.message).toBe('Channel mismatch');
  });

  it('does not remap INPUT_NOT_FOUND for OpenClaw URL shapes because OpenClaw is unconfigured', async () => {
    stubChrome({
      sendTo: OPENCLAW_URL,
      tabsGetUrl: OPENCLAW_LOGIN_URL,
      sendMessageResponse: {
        ok: false,
        code: 'INPUT_NOT_FOUND',
        message: 'Editor not found',
        retriable: true,
      },
    });

    await startDispatch(baseStartInput(OPENCLAW_URL));

    const stored = await dispatchRepo.get(DISPATCH_ID);
    expect(stored?.error?.code).toBe('INPUT_NOT_FOUND');
    expect(stored?.error?.message).toBe('Editor not found');
  });

  it('passes through NOT_LOGGED_IN from adapter unchanged', async () => {
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
