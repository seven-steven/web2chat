/**
 * Unit tests for Feishu/Lark URL matching (FSL-01).
 *
 * These tests validate that feishu.cn and larksuite.com URLs (including
 * subdomain variants) are correctly identified as platformId 'feishu'.
 *
 * IMPORTANT: These tests depend on the feishu adapter being registered in
 * registry.ts. They will FAIL until Plan 03 adds the defineAdapter entry.
 * This is intentional TDD behavior — these serve as contract tests that
 * validate the registry entry will be correct once Plan 03 lands.
 *
 * SPA subdomain risk (D-105): buildSpaUrlFilters uses hostEquals (exact match).
 * Feishu uses {tenant}.feishu.cn subdomains — hostEquals 'feishu.cn' will NOT
 * match 'acme.feishu.cn'. Plan 03 must address this via hostSuffix support
 * or explicit subdomain enumeration.
 */
import { describe, it, expect } from 'vitest';
import { findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('adapters/feishu -- match (FSL-01)', () => {
  const validUrls = [
    'https://acme.feishu.cn/next/messenger',
    'https://acme.feishu.cn/next/messenger/',
    'https://www.larksuite.com/next/messenger',
    'https://www.larksuite.com/next/messenger/',
    'https://feishu.cn/messenger',
    'https://larksuite.com/messenger',
    'https://im.feishu.cn/next/messenger',
    'https://web.larksuite.com/next/messenger',
  ];

  for (const url of validUrls) {
    it(`matches: ${url}`, () => {
      const adapter = findAdapter(url);
      expect(adapter).not.toBeUndefined();
      expect(adapter!.id).toBe('feishu');
    });
  }

  it('detectPlatformId returns feishu for feishu.cn URL', () => {
    expect(detectPlatformId('https://acme.feishu.cn/next/messenger')).toBe('feishu');
  });

  it('detectPlatformId returns feishu for larksuite.com URL', () => {
    expect(detectPlatformId('https://www.larksuite.com/next/messenger')).toBe('feishu');
  });

  const invalidUrls = [
    { url: 'https://passport.feishu.cn/accounts/page/login', label: 'passport subdomain' },
    { url: 'https://feishu.cn/', label: 'feishu.cn root (no messenger path)' },
    { url: 'https://feishu.cn/docs', label: 'feishu.cn docs page' },
    { url: 'https://discord.com/channels/1/2', label: 'discord URL' },
    { url: 'https://app.slack.com/client/w/c', label: 'slack URL' },
    { url: 'not-a-url', label: 'malformed' },
    { url: '', label: 'empty' },
  ];

  for (const { url, label } of invalidUrls) {
    it(`does NOT match: ${label}`, () => {
      const adapter = findAdapter(url);
      const isFeishu = adapter?.id === 'feishu';
      expect(isFeishu).toBe(false);
    });
  }
});
