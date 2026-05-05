import { describe, it, expect } from 'vitest';
import { adapterRegistry, findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('shared/adapters/registry (D-24 / D-26)', () => {
  it('registry contains mock, openclaw, and discord entries', () => {
    expect(adapterRegistry).toHaveLength(3);
    expect(adapterRegistry[0]?.id).toBe('mock');
    expect(adapterRegistry[1]?.id).toBe('openclaw');
    expect(adapterRegistry[2]?.id).toBe('discord');
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
