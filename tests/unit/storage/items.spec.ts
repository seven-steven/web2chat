import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { metaItem, META_DEFAULT } from '@/shared/storage/items';

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
