/**
 * Tests for generic MAIN world bridge routing (D-99, D-100, D-101, D-102).
 *
 * Validates:
 *   1. Port name prefix parsing: WEB2CHAT_MAIN_WORLD:<platformId> extraction
 *   2. Registry injector lookup via mainWorldInjectors map
 *   3. Security: tabId from sender only (grep gate)
 *   4. Security: unknown platformId rejected
 */
import { describe, it, expect } from 'vitest';
import { adapterRegistry } from '@/shared/adapters/registry';
import { mainWorldInjectors } from '@/background/main-world-registry';

const MAIN_WORLD_PORT_PREFIX = 'WEB2CHAT_MAIN_WORLD:';

/** Parse platformId from port name. Returns null if prefix doesn't match. */
function parsePlatformId(portName: string): string | null {
  if (!portName.startsWith(MAIN_WORLD_PORT_PREFIX)) return null;
  return portName.slice(MAIN_WORLD_PORT_PREFIX.length);
}

describe('MAIN world bridge generic routing (D-99, D-100, D-101, D-102)', () => {
  // ── Port name prefix parsing ────────────────────────────────────────────

  describe('port name prefix parsing', () => {
    it('extracts platformId "discord" from WEB2CHAT_MAIN_WORLD:discord', () => {
      expect(parsePlatformId('WEB2CHAT_MAIN_WORLD:discord')).toBe('discord');
    });

    it('extracts platformId "slack" from WEB2CHAT_MAIN_WORLD:slack', () => {
      expect(parsePlatformId('WEB2CHAT_MAIN_WORLD:slack')).toBe('slack');
    });

    it('returns null for non-matching port name', () => {
      expect(parsePlatformId('SOME_OTHER_PORT')).toBeNull();
    });

    it('returns empty string for port name with no platformId after colon', () => {
      expect(parsePlatformId('WEB2CHAT_MAIN_WORLD:')).toBe('');
    });
  });

  // ── Registry injector lookup via mainWorldInjectors map ─────────────────

  describe('registry injector lookup via mainWorldInjectors', () => {
    it('returns a function for discord (has mainWorldInjector)', () => {
      const injector = mainWorldInjectors.get('discord');
      expect(injector).toBeTypeOf('function');
    });

    it('returns undefined for mock (no mainWorldInjector)', () => {
      const injector = mainWorldInjectors.get('mock');
      expect(injector).toBeUndefined();
    });

    it('returns undefined for nonexistent_platform', () => {
      const injector = mainWorldInjectors.get('nonexistent_platform');
      expect(injector).toBeUndefined();
    });
  });

  // ── Security: tabId from sender only (grep gate) ───────────────────────

  it('uses senderPort.sender?.tab?.id for executeScript target', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('entrypoints/background.ts', 'utf-8');
    expect(src).toContain('senderPort.sender?.tab?.id');
    expect(src).not.toContain('msg.tabId'); // no user-supplied tabId
  });

  // ── Security: unknown platformId rejected ──────────────────────────────

  it('registry lookup for nonexistent_platform returns undefined', () => {
    const entry = adapterRegistry.find((e) => e.id === 'nonexistent_platform');
    expect(entry).toBeUndefined();
  });
});
