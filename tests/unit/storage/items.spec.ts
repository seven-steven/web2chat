import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  metaItem,
  META_DEFAULT,
  sendToHistoryItem,
  promptHistoryItem,
  bindingsItem,
  popupDraftItem,
  activeDispatchPointerItem,
  POPUP_DRAFT_DEFAULT,
  type HistoryEntry,
  type BindingEntry,
} from '@/shared/storage/items';

describe('storage/items metaItem', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns the default value when storage is empty', async () => {
    const value = await metaItem.getValue();
    expect(value).toEqual(META_DEFAULT);
  });

  it('persists writes via setValue and reads them back', async () => {
    await metaItem.setValue({ schemaVersion: 1, helloCount: 5 });
    const value = await metaItem.getValue();
    expect(value).toEqual({ schemaVersion: 1, helloCount: 5 });
  });

  it('writes to chrome.storage.local (NOT session) per D-04', async () => {
    await metaItem.setValue({ schemaVersion: 1, helloCount: 3 });
    const raw = await fakeBrowser.storage.local.get(null);
    const sessionRaw = await fakeBrowser.storage.session.get(null);
    const hasMetaInLocal = Object.values(raw).some(
      (v) =>
        typeof v === 'object' &&
        v !== null &&
        'helloCount' in v &&
        (v as { helloCount: number }).helloCount === 3,
    );
    const hasMetaInSession = Object.values(sessionRaw).some(
      (v) =>
        typeof v === 'object' &&
        v !== null &&
        'helloCount' in v &&
        (v as { helloCount: number }).helloCount === 3,
    );
    expect(hasMetaInLocal).toBe(true);
    expect(hasMetaInSession).toBe(false);
  });
});

describe('Phase 3 items — sendToHistory / promptHistory / bindings / popupDraft', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('sendToHistoryItem returns [] when storage empty and round-trips entries', async () => {
    expect(await sendToHistoryItem.getValue()).toEqual([]);
    const entry: HistoryEntry = {
      value: 'https://discord.com/channels/1/2',
      last_used_at: '2026-04-30T12:00:00.000Z',
      use_count: 3,
    };
    await sendToHistoryItem.setValue([entry]);
    expect(await sendToHistoryItem.getValue()).toEqual([entry]);
  });

  it('bindingsItem returns {} when empty and round-trips by-send_to map', async () => {
    expect(await bindingsItem.getValue()).toEqual({});
    const map: Record<string, BindingEntry> = {
      'https://x.com/': {
        send_to: 'https://x.com/',
        prompt: 'p',
        last_dispatched_at: 'never-dispatched-marker',
      },
    };
    await bindingsItem.setValue(map);
    expect(await bindingsItem.getValue()).toEqual(map);
  });

  it('popupDraftItem raw getValue returns POPUP_DRAFT_DEFAULT (sentinel) when empty', async () => {
    // NOTE: this asserts the WXT defineItem-level fallback. The repo's get()
    // business method in repos/popupDraft.ts normalizes this sentinel to null —
    // see repos/popupDraft.spec.ts for that contract.
    const got = await popupDraftItem.getValue();
    expect(got).toEqual(POPUP_DRAFT_DEFAULT);
    expect(got.schemaVersion).toBe(1);
    expect(got.updated_at).toBe(new Date(0).toISOString());
  });

  it('all 4 storage.local items write to chrome.storage.local (NOT session)', async () => {
    await sendToHistoryItem.setValue([
      { value: 'a', last_used_at: '2026-04-30T00:00:00.000Z', use_count: 1 },
    ]);
    await promptHistoryItem.setValue([
      { value: 'p', last_used_at: '2026-04-30T00:00:00.000Z', use_count: 1 },
    ]);
    await bindingsItem.setValue({
      a: { send_to: 'a', prompt: 'p', last_dispatched_at: 'never-dispatched-marker' },
    });
    await popupDraftItem.setValue({ ...POPUP_DRAFT_DEFAULT, send_to: 'x' });
    const localKeys = Object.keys(await fakeBrowser.storage.local.get(null));
    const sessionKeys = Object.keys(await fakeBrowser.storage.session.get(null));
    // sendToHistory / promptHistory / bindings / popupDraft all in local
    expect(localKeys.some((k) => k.includes('sendToHistory'))).toBe(true);
    expect(localKeys.some((k) => k.includes('promptHistory'))).toBe(true);
    expect(localKeys.some((k) => k.includes('bindings'))).toBe(true);
    expect(localKeys.some((k) => k.includes('popupDraft'))).toBe(true);
    // none of them in session
    expect(
      sessionKeys.some(
        (k) => k.includes('History') || k.includes('binding') || k.includes('popupDraft'),
      ),
    ).toBe(false);
  });

  it('activeDispatchPointerItem stores in chrome.storage.session', async () => {
    await activeDispatchPointerItem.setValue('test-id');
    const sessionRaw = await fakeBrowser.storage.session.get(null);
    const localRaw = await fakeBrowser.storage.local.get(null);
    expect(JSON.stringify(sessionRaw).includes('test-id')).toBe(true);
    expect(JSON.stringify(localRaw).includes('dispatchActive')).toBe(false);
  });
});
