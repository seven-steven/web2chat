import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { startDispatch } from '@/background/dispatch-pipeline';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';

const fakeSnapshot = {
  title: 't',
  url: 'https://example.com/',
  description: 'd',
  create_at: '2026-04-30T00:00:00.000Z',
  content: 'c',
};

const baseInput = {
  dispatchId: '00000000-0000-4000-8000-000000000101',
  send_to: 'http://localhost:4321/mock-platform.html',
  prompt: 'hi',
  snapshot: fakeSnapshot,
};

function buildChromeStub() {
  return {
    tabs: {
      create: vi.fn().mockResolvedValue({ id: 42 }),
      update: vi.fn().mockResolvedValue({ id: 42 }),
      query: vi
        .fn()
        .mockResolvedValue([{ id: 42, url: baseInput.send_to, windowId: 1, status: 'complete' }]),
      sendMessage: vi.fn(() => new Promise(() => {})),
      get: vi.fn().mockResolvedValue({ id: 42, url: baseInput.send_to }),
      onUpdated: { addListener: vi.fn() },
    },
    windows: { update: vi.fn().mockResolvedValue(undefined) },
    scripting: { executeScript: vi.fn().mockResolvedValue([{ result: undefined }]) },
    action: {
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    },
    alarms: {
      create: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(true),
      onAlarm: { addListener: vi.fn() },
    },
    storage: fakeBrowser.storage,
    runtime: { lastError: undefined },
  };
}

describe('adapter response timeout (DSPT-01, D-113/D-114)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stores TIMEOUT with retriable=true when adapter sendMessage never resolves', async () => {
    const stub = buildChromeStub();
    vi.stubGlobal('chrome', stub);

    const startPromise = startDispatch(baseInput);
    await vi.advanceTimersByTimeAsync(20_000);
    await Promise.race([startPromise, Promise.resolve()]);
    startPromise.catch(() => {});

    const record = await dispatchRepo.get(baseInput.dispatchId);
    expect(record?.state).toBe('error');
    expect(record?.error?.code).toBe('TIMEOUT');
    expect(record?.error?.retriable).toBe(true);
  });
});
