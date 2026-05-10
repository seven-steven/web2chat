import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { onTabComplete, startDispatch } from '@/background/dispatch-pipeline';
import { DispatchStartInputSchema } from '@/shared/messaging/routes/dispatch';
import { definePlatformId } from '@/shared/adapters/types';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';

const fakeSnapshot = {
  title: 't',
  url: 'https://example.com/',
  description: 'd',
  create_at: '2026-04-30T00:00:00.000Z',
  content: 'c',
};

const baseInput = {
  dispatchId: '00000000-0000-4000-8000-000000000403',
  send_to: 'http://localhost:4321/mock-platform.html',
  prompt: 'hi',
  snapshot: fakeSnapshot,
};

function buildChromeStub(sendMessageResponse: unknown) {
  return {
    tabs: {
      create: vi.fn().mockResolvedValue({ id: 42 }),
      update: vi.fn().mockResolvedValue({ id: 42 }),
      query: vi
        .fn()
        .mockResolvedValue([{ id: 42, url: baseInput.send_to, windowId: 1, status: 'complete' }]),
      sendMessage: vi.fn().mockResolvedValue(sendMessageResponse),
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

describe('selector warning dispatch protocol (DSPT-04)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts one-shot selectorConfirmation for SELECTOR_LOW_CONFIDENCE', () => {
    const parsed = DispatchStartInputSchema.safeParse({
      ...baseInput,
      selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid selectorConfirmation warning strings', () => {
    const parsed = DispatchStartInputSchema.safeParse({
      ...baseInput,
      selectorConfirmation: { warning: 'NOT_A_WARNING' },
    });

    expect(parsed.success).toBe(false);
  });

  it('stores needs_confirmation with SELECTOR_LOW_CONFIDENCE warnings and clears active dispatch', async () => {
    const stub = buildChromeStub({ ok: true, warnings: [{ code: 'SELECTOR_LOW_CONFIDENCE' }] });
    vi.stubGlobal('chrome', stub);

    const result = await startDispatch(baseInput);
    const record = await dispatchRepo.get(baseInput.dispatchId);

    expect(result.ok).toBe(true);
    expect(record?.state).toBe('needs_confirmation');
    expect((record as { warnings?: Array<{ code: string }> } | undefined)?.warnings).toEqual([
      { code: 'SELECTOR_LOW_CONFIDENCE' },
    ]);
    expect(record?.error).toBeUndefined();
    expect(await dispatchRepo.getActive()).toBeNull();
    expect(stub.alarms.clear).toHaveBeenCalledWith(`dispatch-timeout:${baseInput.dispatchId}`);
  });

  it('passes selectorConfirmation to ADAPTER_DISPATCH payload once', async () => {
    const stub = buildChromeStub({ ok: true });
    vi.stubGlobal('chrome', stub);

    const inputWithConfirmation = {
      ...baseInput,
      dispatchId: '00000000-0000-4000-8000-000000000404',
      selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' },
    } as Parameters<typeof startDispatch>[0] & {
      selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' };
    };

    await startDispatch(inputWithConfirmation);

    expect(stub.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        type: 'ADAPTER_DISPATCH',
        payload: expect.objectContaining({
          selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' },
        }),
      }),
    );
  });

  it('uses the fresh stored record when advancing from a stale awaiting_complete snapshot', async () => {
    const stub = buildChromeStub({ ok: true });
    vi.stubGlobal('chrome', stub);
    const staleRecord = {
      schemaVersion: 1,
      dispatchId: '00000000-0000-4000-8000-000000000405',
      state: 'awaiting_complete',
      target_tab_id: 42,
      send_to: baseInput.send_to,
      prompt: baseInput.prompt,
      snapshot: fakeSnapshot,
      platform_id: definePlatformId('mock'),
      started_at: '2026-04-30T00:00:00.000Z',
      last_state_at: '2026-04-30T00:00:00.000Z',
    } as const;
    await dispatchRepo.set({
      ...staleRecord,
      selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' },
    });
    vi.spyOn(dispatchRepo, 'listAll').mockResolvedValue([staleRecord]);

    await onTabComplete(42, { status: 'complete' }, {} as chrome.tabs.Tab);

    expect(stub.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        payload: expect.objectContaining({
          selectorConfirmation: { warning: 'SELECTOR_LOW_CONFIDENCE' },
        }),
      }),
    );
  });
});
