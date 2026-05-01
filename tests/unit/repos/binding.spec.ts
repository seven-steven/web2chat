import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import * as bindingRepo from '@/shared/storage/repos/binding';
import { bindingsItem } from '@/shared/storage/items';

describe('repos/binding (D-27 / D-28 / STG-03)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('upsert on new send_to creates row with never-dispatched-marker', async () => {
    const entry = await bindingRepo.upsert('https://x.com/', 'p1');
    expect(entry.send_to).toBe('https://x.com/');
    expect(entry.prompt).toBe('p1');
    expect(entry.last_dispatched_at).toBe(bindingRepo.NEVER_DISPATCHED_MARKER);
  });

  it('upsert on existing send_to overwrites prompt without duplicating row', async () => {
    await bindingRepo.upsert('https://x.com/', 'p1');
    await bindingRepo.upsert('https://x.com/', 'p2');
    const all = await bindingsItem.getValue();
    expect(Object.keys(all)).toHaveLength(1);
    expect(all['https://x.com/']?.prompt).toBe('p2');
  });

  it('upsert with mark_dispatched=true sets ISO-8601 timestamp', async () => {
    const entry = await bindingRepo.upsert('https://x.com/', 'p', { mark_dispatched: true });
    expect(entry.last_dispatched_at).not.toBe(bindingRepo.NEVER_DISPATCHED_MARKER);
    expect(() => new Date(entry.last_dispatched_at).toISOString()).not.toThrow();
  });

  it('upsert without mark_dispatched preserves existing timestamp', async () => {
    const first = await bindingRepo.upsert('https://x.com/', 'p1', { mark_dispatched: true });
    const second = await bindingRepo.upsert('https://x.com/', 'p2');
    expect(second.last_dispatched_at).toBe(first.last_dispatched_at);
  });

  it('get returns the entry; null for unknown send_to', async () => {
    await bindingRepo.upsert('https://x.com/', 'p');
    expect(await bindingRepo.get('https://x.com/')).not.toBeNull();
    expect(await bindingRepo.get('https://unknown.com/')).toBeNull();
  });

  it('resetAll empties bindings map', async () => {
    await bindingRepo.upsert('https://a.com/', 'pa');
    await bindingRepo.upsert('https://b.com/', 'pb');
    await bindingRepo.resetAll();
    expect(await bindingsItem.getValue()).toEqual({});
  });
});
