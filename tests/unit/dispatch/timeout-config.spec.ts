import { describe, expect, it } from 'vitest';
import { adapterRegistry } from '@/shared/adapters/registry';
import type { AdapterRegistryEntry } from '@/shared/adapters/types';
import {
  DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS,
  DEFAULT_DISPATCH_TIMEOUT_MS,
  resolveAdapterTimeouts,
} from '@/shared/adapters/dispatch-policy';

describe('registry dispatch timeout policy (DSPT-01)', () => {
  it('resolves default timeouts for existing platforms', () => {
    expect(DEFAULT_DISPATCH_TIMEOUT_MS).toBe(30_000);
    expect(DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS).toBe(20_000);

    const timeoutsById = new Map(
      adapterRegistry.map((adapter) => [String(adapter.id), resolveAdapterTimeouts(adapter)]),
    );

    for (const id of ['mock', 'openclaw', 'discord']) {
      expect(timeoutsById.get(id)?.dispatchTimeoutMs).toBe(30_000);
      expect(timeoutsById.get(id)?.adapterResponseTimeoutMs).toBe(20_000);
    }
  });

  it('honors explicit adapter timeout overrides without rounding', () => {
    const adapter = {
      id: 'timeout-override-test',
      match: () => false,
      scriptFile: 'content-scripts/timeout-override-test.js',
      hostMatches: ['https://example.com/*'],
      iconKey: 'platform_icon_mock',
      dispatchTimeoutMs: 45_000,
      adapterResponseTimeoutMs: 12_000,
    } as unknown as AdapterRegistryEntry & {
      readonly dispatchTimeoutMs: number;
      readonly adapterResponseTimeoutMs: number;
    };

    expect(resolveAdapterTimeouts(adapter)).toEqual({
      dispatchTimeoutMs: 45_000,
      adapterResponseTimeoutMs: 12_000,
    });
  });

  it('rejects dispatchTimeoutMs below Chrome alarms minimum', () => {
    const adapter = {
      id: 'timeout-too-low-test',
      match: () => false,
      scriptFile: 'content-scripts/timeout-too-low-test.js',
      hostMatches: ['https://example.com/*'],
      iconKey: 'platform_icon_mock',
      dispatchTimeoutMs: 29_999,
    } as unknown as AdapterRegistryEntry & { readonly dispatchTimeoutMs: number };

    expect(() => resolveAdapterTimeouts(adapter)).toThrow(/dispatchTimeoutMs must be >= 30000/);
  });
});
