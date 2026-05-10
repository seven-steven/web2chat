import type { AdapterRegistryEntry } from './types';

export const DEFAULT_DISPATCH_TIMEOUT_MS = 0;
export const DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS = 0;

export function resolveAdapterTimeouts(_adapter: AdapterRegistryEntry): {
  dispatchTimeoutMs: number;
  adapterResponseTimeoutMs: number;
} {
  throw new Error('resolveAdapterTimeouts not implemented');
}

export async function withAdapterResponseTimeout<T>(
  promise: Promise<T>,
  _timeoutMs: number,
): Promise<T> {
  return promise;
}
