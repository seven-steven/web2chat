import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import * as draftRepo from '@/shared/storage/repos/popupDraft';
import * as dispatchRepo from '@/shared/storage/repos/dispatch';
import type { ArticleSnapshot } from '@/shared/messaging';
import { definePlatformId } from '@/shared/adapters/types';

const fakeSnapshot: ArticleSnapshot = {
  title: 't',
  url: 'https://example.com/',
  description: 'd',
  create_at: '2026-04-30T00:00:00.000Z',
  content: 'c',
};

function fakeRecord(
  id: string,
  overrides: Partial<dispatchRepo.DispatchRecord> = {},
): dispatchRepo.DispatchRecord {
  return {
    schemaVersion: 1,
    dispatchId: id,
    state: 'pending',
    target_tab_id: null,
    send_to: 'https://example.com/',
    prompt: 'p',
    snapshot: fakeSnapshot,
    platform_id: definePlatformId('mock'),
    started_at: '2026-04-30T00:00:00.000Z',
    last_state_at: '2026-04-30T00:00:00.000Z',
    ...overrides,
  };
}

describe('repos/popupDraft (D-35 / D-36) — null contract', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('get() returns null when storage is empty (sentinel matches)', async () => {
    expect(await draftRepo.get()).toBeNull();
  });

  it('update() writes a real timestamp; subsequent get() returns the merged draft', async () => {
    await draftRepo.update({ send_to: 'https://x.com/' });
    const after = await draftRepo.get();
    expect(after).not.toBeNull();
    expect(after).toMatchObject({ send_to: 'https://x.com/' });
    expect(after?.updated_at).not.toBe(new Date(0).toISOString());
  });

  it('update() preserves earlier fields across multiple calls', async () => {
    await draftRepo.update({ send_to: 'https://x.com/' });
    await draftRepo.update({ prompt: 'p1' });
    const got = await draftRepo.get();
    expect(got).not.toBeNull();
    expect(got?.send_to).toBe('https://x.com/');
    expect(got?.prompt).toBe('p1');
  });

  it('clear() resets to sentinel; next get() returns null again', async () => {
    await draftRepo.update({ send_to: 'x', prompt: 'y' });
    expect(await draftRepo.get()).not.toBeNull();
    await draftRepo.clear();
    expect(await draftRepo.get()).toBeNull();
  });
});

describe('repos/dispatch (D-31 / D-32 / Pattern 2 per-key)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('set writes to dispatch:<id> key in storage.session', async () => {
    const rec = fakeRecord('00000000-0000-4000-8000-000000000001');
    await dispatchRepo.set(rec);
    const sessionRaw = await fakeBrowser.storage.session.get(null);
    expect(sessionRaw[`dispatch:${rec.dispatchId}`]).toEqual(rec);
  });

  it('get returns the record; undefined for unknown id', async () => {
    const rec = fakeRecord('00000000-0000-4000-8000-000000000001');
    await dispatchRepo.set(rec);
    expect(await dispatchRepo.get(rec.dispatchId)).toEqual(rec);
    expect(await dispatchRepo.get('non-existent')).toBeUndefined();
  });

  it('set twice with same dispatchId keeps latest (D-32 idempotency precondition)', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    await dispatchRepo.set(fakeRecord(id, { state: 'pending' }));
    await dispatchRepo.set(fakeRecord(id, { state: 'awaiting_complete' }));
    const got = await dispatchRepo.get(id);
    expect(got?.state).toBe('awaiting_complete');
  });

  it('listAll excludes dispatch:active pointer', async () => {
    await dispatchRepo.set(fakeRecord('00000000-0000-4000-8000-000000000001'));
    await dispatchRepo.set(fakeRecord('00000000-0000-4000-8000-000000000002'));
    await dispatchRepo.setActive('00000000-0000-4000-8000-000000000001');
    const all = await dispatchRepo.listAll();
    expect(all).toHaveLength(2);
    for (const r of all) {
      expect(r.dispatchId).not.toBe('active');
    }
  });

  it('remove deletes the record', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    await dispatchRepo.set(fakeRecord(id));
    await dispatchRepo.remove(id);
    expect(await dispatchRepo.get(id)).toBeUndefined();
  });

  it('setActive / getActive / clearActive round-trip', async () => {
    await dispatchRepo.setActive('id-1');
    expect(await dispatchRepo.getActive()).toBe('id-1');
    await dispatchRepo.clearActive();
    expect(await dispatchRepo.getActive()).toBeNull();
  });

  it('exposes DISPATCH_KEY_PREFIX constant for SW restart sweep', () => {
    expect(dispatchRepo.DISPATCH_KEY_PREFIX).toBe('dispatch:');
  });
});
