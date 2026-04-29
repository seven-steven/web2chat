import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { metaItem, META_DEFAULT } from '@/shared/storage';
import { schemas, Ok, Err, type Result } from '@/shared/messaging';

/**
 * Mirror of the bumpHello business core in entrypoints/background.ts.
 * Kept colocated with the test to avoid exposing it from the SW entrypoint
 * (which must keep its surface minimal — only top-level listener registration).
 *
 * If you change the handler logic, change BOTH places — and consider
 * extracting to shared/messaging/handlers/ if a third caller appears.
 */
async function bumpHelloCore(): Promise<Result<{ schemaVersion: 1; helloCount: number }>> {
  try {
    schemas['meta.bumpHello'].input.parse(undefined);
    const current = await metaItem.getValue();
    const next = { schemaVersion: 1 as const, helloCount: current.helloCount + 1 };
    await metaItem.setValue(next);
    const validated = schemas['meta.bumpHello'].output.parse(next);
    return Ok(validated);
  } catch (err) {
    return Err('INTERNAL', err instanceof Error ? err.message : String(err), false);
  }
}

describe('bumpHello handler core', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns helloCount=1 on first call from default state', async () => {
    const r = await bumpHelloCore();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ schemaVersion: 1, helloCount: 1 });
  });

  it('increments helloCount on each subsequent call', async () => {
    await bumpHelloCore();
    await bumpHelloCore();
    const r = await bumpHelloCore();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.helloCount).toBe(3);
  });

  it('persists between calls to chrome.storage.local (D-04)', async () => {
    await bumpHelloCore();
    const stored = await metaItem.getValue();
    expect(stored.helloCount).toBe(1);
  });

  it('starts from META_DEFAULT after fakeBrowser.reset()', async () => {
    fakeBrowser.reset();
    const before = await metaItem.getValue();
    expect(before).toEqual(META_DEFAULT);
    const r = await bumpHelloCore();
    if (r.ok) expect(r.data.helloCount).toBe(1);
  });
});
