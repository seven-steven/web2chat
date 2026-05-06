/**
 * Unit test for ADAPTER_RESPONSE_TIMEOUT_MS constant (Gap 2 fix).
 *
 * Validates that the SW-side timeout gives enough headroom for Discord adapter's
 * two internal 5s waits (waitForElement + waitForNewMessage) + paste round-trip (~1-2s).
 * Old value 10_000 < 12s worst case → message sent but SW timeout reported error.
 * New value 20_000 > 12s → sufficient headroom.
 */
import { describe, it, expect } from 'vitest';
import { ADAPTER_RESPONSE_TIMEOUT_MS } from '@/background/dispatch-pipeline';

describe('ADAPTER_RESPONSE_TIMEOUT_MS (gap fix: 10s → 20s)', () => {
  it('equals 20000 (sufficient for two 5s waits + paste round-trip)', () => {
    expect(ADAPTER_RESPONSE_TIMEOUT_MS).toBe(20_000);
  });

  it('is greater than the Discord adapter worst-case internal wait (12s)', () => {
    // waitForElement(5s) + waitForNewMessage(5s) + paste(2s) = 12s worst case
    const discordWorstCaseMs = 5_000 + 5_000 + 2_000;
    expect(ADAPTER_RESPONSE_TIMEOUT_MS).toBeGreaterThan(discordWorstCaseMs);
  });
});
