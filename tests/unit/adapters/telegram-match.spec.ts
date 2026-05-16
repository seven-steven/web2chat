import { describe, it, expect } from 'vitest';
import { findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('adapters/telegram — match (TG-01)', () => {
  const validUrls = [
    'https://web.telegram.org/a/#123456',
    'https://web.telegram.org/a/chat/123',
  ];

  for (const url of validUrls) {
    it(`matches: ${url}`, () => {
      const adapter = findAdapter(url);
      expect(adapter).not.toBeUndefined();
      expect(adapter!.id).toBe('telegram');
    });
  }

  it('detectPlatformId returns telegram for valid URL', () => {
    expect(detectPlatformId('https://web.telegram.org/a/#123')).toBe('telegram');
  });

  const invalidUrls = [
    { url: 'https://web.telegram.org/z/#123', label: 'Web Z path' },
    { url: 'https://web.telegram.org/', label: 'root path' },
    { url: 'https://discord.com/channels/1/2', label: 'discord URL' },
    { url: 'not-a-url', label: 'malformed' },
    { url: '', label: 'empty' },
  ];

  for (const { url, label } of invalidUrls) {
    it(`does NOT match: ${label}`, () => {
      const adapter = findAdapter(url);
      const isTelegram = adapter?.id === 'telegram';
      expect(isTelegram).toBe(false);
    });
  }
});
