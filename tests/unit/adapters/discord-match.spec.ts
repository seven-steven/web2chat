import { describe, it, expect } from 'vitest';
import { findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('adapters/discord — match (ADD-02)', () => {
  // Valid Discord channel URLs — should ALL match
  const validUrls = [
    'https://discord.com/channels/123/456',
    'https://discord.com/channels/123456789/987654321',
    'https://discord.com/channels/123/456?foo=bar',
  ];

  for (const url of validUrls) {
    it(`matches: ${url}`, () => {
      const adapter = findAdapter(url);
      expect(adapter).not.toBeUndefined();
      expect(adapter!.id).toBe('discord');
    });
  }

  it('detectPlatformId returns discord for valid URL', () => {
    expect(detectPlatformId('https://discord.com/channels/123/456')).toBe('discord');
  });

  // Invalid URLs — should NOT match discord
  const invalidUrls = [
    { url: 'https://discord.com/channels/@me/123', label: 'DM (channels/@me)' },
    { url: 'https://discord.com/login', label: '/login' },
    { url: 'https://discord.com/', label: 'root' },
    { url: 'https://example.com/channels/1/2', label: 'wrong hostname' },
    { url: 'not-a-url', label: 'malformed' },
    { url: '', label: 'empty' },
  ];

  for (const { url, label } of invalidUrls) {
    it(`does NOT match: ${label}`, () => {
      const adapter = findAdapter(url);
      const isDiscord = adapter?.id === 'discord';
      expect(isDiscord).toBe(false);
    });
  }
});
