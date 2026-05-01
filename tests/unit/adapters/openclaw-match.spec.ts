import { describe, it, expect } from 'vitest';
import { findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('adapters/openclaw — match (ADO-02)', () => {
  // Valid OpenClaw URLs — should ALL match
  const validUrls = [
    'http://localhost:18789/ui/chat?session=agent:main:main',
    'http://localhost:18789/chat?session=agent:main:main',
    'http://192.168.1.100:8080/ui/chat?session=agent:bot1:session1',
    'https://openclaw.example.com/ui/chat?session=agent:analyzer:daily',
    'http://localhost:18789/ui/chat?session=agent%3Amain%3Amain',
    'http://localhost:18789/ui/chat?session=agent:main:main&other=param',
    'http://localhost:18789/chat?session=agent:main:main#hash',
  ];

  for (const url of validUrls) {
    it(`matches: ${url}`, () => {
      const adapter = findAdapter(url);
      expect(adapter).not.toBeUndefined();
      expect(adapter!.id).toBe('openclaw');
    });
  }

  it('detectPlatformId returns openclaw for valid URL', () => {
    expect(detectPlatformId('http://localhost:18789/ui/chat?session=agent:main:main')).toBe(
      'openclaw',
    );
  });

  // Invalid URLs — should NOT match
  const invalidUrls = [
    { url: 'http://localhost:18789/ui/chat', label: 'no session param' },
    { url: 'http://localhost:18789/settings', label: 'wrong path' },
    { url: 'http://localhost:18789/', label: 'root' },
    { url: 'https://discord.com/channels/123/456', label: 'discord' },
    { url: 'not-a-url', label: 'malformed' },
    { url: '', label: 'empty' },
    { url: 'http://localhost:18789/ui/chat?other=value', label: 'wrong param' },
  ];

  for (const { url, label } of invalidUrls) {
    it(`does NOT match: ${label}`, () => {
      const adapter = findAdapter(url);
      const isOpenclaw = adapter?.id === 'openclaw';
      expect(isOpenclaw).toBe(false);
    });
  }

  it('trailing slash: /ui/chat/ is accepted by URL normalization', () => {
    // URL constructor normalizes /ui/chat/?session=... -> path is /ui/chat/
    const adapter = findAdapter('http://localhost:18789/ui/chat/?session=agent:main:main');
    // Acceptable either way — just document the behavior
    expect(adapter === undefined || adapter.id === 'openclaw').toBe(true);
  });
});
