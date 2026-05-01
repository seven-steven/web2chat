import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { list, add, remove, has } from '@/shared/storage/repos/grantedOrigins';
import { grantedOriginsItem } from '@/shared/storage/items';

describe('repos/grantedOrigins (ADO-07)', () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    await grantedOriginsItem.setValue([]);
  });

  it('list returns empty array by default', async () => {
    expect(await list()).toEqual([]);
  });

  it('add appends a new origin', async () => {
    await add('http://localhost:18789');
    expect(await list()).toEqual(['http://localhost:18789']);
  });

  it('add deduplicates existing origins', async () => {
    await add('http://localhost:18789');
    await add('http://localhost:18789');
    expect(await list()).toEqual(['http://localhost:18789']);
  });

  it('remove deletes an origin', async () => {
    await add('http://localhost:18789');
    await add('https://openclaw.example.com');
    await remove('http://localhost:18789');
    expect(await list()).toEqual(['https://openclaw.example.com']);
  });

  it('remove is no-op for non-existent origin', async () => {
    await add('http://localhost:18789');
    await remove('https://nonexistent.com');
    expect(await list()).toEqual(['http://localhost:18789']);
  });

  it('has returns true for existing origin', async () => {
    await add('http://localhost:18789');
    expect(await has('http://localhost:18789')).toBe(true);
  });

  it('has returns false for non-existent origin', async () => {
    expect(await has('http://localhost:18789')).toBe(false);
  });
});
