import type { AdapterRegistryEntry } from './types';

export const DEFAULT_DISPATCH_TIMEOUT_MS = 30_000;
export const DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS = 20_000;

export interface AdapterTimeoutPolicy {
  readonly dispatchTimeoutMs: number;
  readonly adapterResponseTimeoutMs: number;
}

export class AdapterResponseTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`adapter response timed out after ${timeoutMs}ms`);
    this.name = 'AdapterResponseTimeoutError';
  }
}

export function resolveAdapterTimeouts(adapter: AdapterRegistryEntry): AdapterTimeoutPolicy {
  const dispatchTimeoutMs = adapter.dispatchTimeoutMs ?? DEFAULT_DISPATCH_TIMEOUT_MS;
  const adapterResponseTimeoutMs =
    adapter.adapterResponseTimeoutMs ?? DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS;

  if (dispatchTimeoutMs < DEFAULT_DISPATCH_TIMEOUT_MS) {
    throw new Error(`dispatchTimeoutMs must be >= 30000 for ${adapter.id}`);
  }

  return { dispatchTimeoutMs, adapterResponseTimeoutMs };
}

export async function withAdapterResponseTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        // D-113: the only service-worker timer exception is scoped to one tabs.sendMessage wait.
        timer = globalThis.setTimeout(
          () => reject(new AdapterResponseTimeoutError(timeoutMs)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      globalThis.clearTimeout(timer);
    }
  }
}
