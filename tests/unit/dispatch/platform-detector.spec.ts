import { describe, it, expect } from 'vitest';
import { adapterRegistry, findAdapter, detectPlatformId } from '@/shared/adapters/registry';
import { definePlatformId, defineAdapter } from '@/shared/adapters/types';

describe('shared/adapters/registry (D-24 / D-26)', () => {
  it('registry contains mock, openclaw, discord, and slack entries', () => {
    expect(adapterRegistry).toHaveLength(4);
    expect(adapterRegistry[0]?.id).toBe('mock');
    expect(adapterRegistry[1]?.id).toBe('openclaw');
    expect(adapterRegistry[2]?.id).toBe('discord');
    expect(adapterRegistry[3]?.id).toBe('slack');
  });

  it('mock entry matches the canonical localhost fixture URL', () => {
    expect(findAdapter('http://localhost:4321/mock-platform.html')?.id).toBe('mock');
  });

  it('mock entry matches with query string (failure-injection links)', () => {
    expect(findAdapter('http://localhost:4321/mock-platform.html?fail=not-logged-in')?.id).toBe(
      'mock',
    );
    expect(findAdapter('http://localhost:4321/mock-platform.html?fail=timeout&trace=on')?.id).toBe(
      'mock',
    );
  });

  it('mock entry rejects different host or path', () => {
    expect(findAdapter('http://localhost:4322/mock-platform.html')).toBeUndefined();
    expect(findAdapter('http://localhost:4321/other.html')).toBeUndefined();
  });

  it('detectPlatformId returns "mock" for matching URL, null for non-matching', () => {
    expect(detectPlatformId('http://localhost:4321/mock-platform.html')).toBe('mock');
    expect(detectPlatformId('https://discord.com/channels/1/2')).toBe('discord');
    expect(detectPlatformId('not a url')).toBeNull();
  });

  it('match function is pure (no chrome.* dependency — popup-safe)', () => {
    // If match() touched chrome.*, this test would throw because vitest
    // doesn't stub chrome globally. Calling under empty environment proves purity.
    expect(() =>
      adapterRegistry[0]?.match('http://localhost:4321/mock-platform.html'),
    ).not.toThrow();
  });
});

describe('branded PlatformId (D-96 / D-97)', () => {
  it('definePlatformId returns a value that compares === to the raw string at runtime', () => {
    const id = definePlatformId('discord');
    expect(id === 'discord').toBe(true);
    expect(id).toBe('discord');
  });

  it('defineAdapter produces entries with branded PlatformId on .id', () => {
    const entry = defineAdapter({
      id: 'test',
      match: () => false,
      scriptFile: 'test.js',
      hostMatches: [],
      iconKey: 'test',
    });
    expect(entry.id === 'test').toBe(true);
    expect(entry.id).toBe('test');
  });

  it('all registry entries have branded PlatformId from defineAdapter', () => {
    expect(adapterRegistry[0]?.id).toBe('mock');
    expect(adapterRegistry[1]?.id).toBe('openclaw');
    expect(adapterRegistry[2]?.id).toBe('discord');
    expect(adapterRegistry[3]?.id).toBe('slack');
  });

  it('discord entry has spaNavigationHosts (D-103 / D-104)', () => {
    const discord = adapterRegistry.find((e) => e.id === 'discord');
    expect(discord).toBeDefined();
    expect(discord!.spaNavigationHosts).toEqual(['discord.com']);
  });
});
