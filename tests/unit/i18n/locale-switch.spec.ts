import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

/**
 * TDD RED: These tests verify the signal-based i18n API that will be
 * implemented in Task 4. Dynamic import with type assertions lets the
 * tests compile against the current (pre-rewrite) module while still
 * exercising the target API at runtime.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('signal-based t()', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns the en message for a known key when locale is en', async () => {
    const mod = (await import('@/shared/i18n')) as any;
    await mod.setLocale('en');
    const result = mod.t('extension_name');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns key itself when key is missing', async () => {
    const mod = (await import('@/shared/i18n')) as any;
    await mod.setLocale('en');
    expect(mod.t('nonexistent_key_xyz')).toBe('nonexistent_key_xyz');
  });

  it('setLocale rejects non-allowlist values', async () => {
    const mod = (await import('@/shared/i18n')) as any;
    const before = mod.localeSig.value;
    await mod.setLocale('fr');
    expect(mod.localeSig.value).toBe(before);
  });

  it('setLocale(null) reverts to browser-inferred locale (localeSig becomes null)', async () => {
    const mod = (await import('@/shared/i18n')) as any;
    await mod.setLocale('en');
    await mod.setLocale(null);
    expect(mod.localeSig.value).toBeNull();
  });
});
