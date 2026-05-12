import { describe, it, expect } from 'vitest';
import { findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('adapters/slack — match (SLK-01)', () => {
  const validUrls = [
    'https://app.slack.com/client/workspace123/channel456',
    'https://app.slack.com/client/w/c?foo=bar',
  ];

  for (const url of validUrls) {
    it(`matches: ${url}`, () => {
      const adapter = findAdapter(url);
      expect(adapter).not.toBeUndefined();
      expect(adapter!.id).toBe('slack');
    });
  }

  it('detectPlatformId returns slack for valid URL', () => {
    expect(detectPlatformId('https://app.slack.com/client/w/c')).toBe('slack');
  });

  const invalidUrls = [
    { url: 'https://app.slack.com/client/', label: 'missing workspace + channel' },
    { url: 'https://app.slack.com/client/w/', label: 'missing channel' },
    { url: 'https://slack.com/check-login', label: 'wrong host (slack.com vs app.slack.com)' },
    { url: 'https://discord.com/channels/1/2', label: 'discord URL' },
    { url: 'not-a-url', label: 'malformed' },
    { url: '', label: 'empty' },
  ];

  for (const { url, label } of invalidUrls) {
    it(`does NOT match: ${label}`, () => {
      const adapter = findAdapter(url);
      const isSlack = adapter?.id === 'slack';
      expect(isSlack).toBe(false);
    });
  }
});
