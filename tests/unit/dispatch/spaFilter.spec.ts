import { describe, it, expect } from 'vitest';
import { buildSpaUrlFilters } from '@/shared/adapters/registry';
import { defineAdapter } from '@/shared/adapters/types';

describe('buildSpaUrlFilters (D-103 / D-104 / D-105)', () => {
  it('returns empty array for empty registry', () => {
    expect(buildSpaUrlFilters([])).toEqual([]);
  });

  it('returns empty array when no entries have spaNavigationHosts', () => {
    const entries = [
      defineAdapter({
        id: 'plain',
        match: () => false,
        scriptFile: 'plain.js',
        hostMatches: [],
        iconKey: 'plain',
      }),
    ];
    expect(buildSpaUrlFilters(entries)).toEqual([]);
  });

  it('builds UrlFilter with hostEquals for single SPA platform', () => {
    const entries = [
      defineAdapter({
        id: 'discord',
        match: () => false,
        scriptFile: 'discord.js',
        hostMatches: [],
        iconKey: 'discord',
        spaNavigationHosts: ['discord.com'],
      }),
    ];
    expect(buildSpaUrlFilters(entries)).toEqual([{ hostEquals: 'discord.com' }]);
  });

  it('combines filters from multiple SPA platforms', () => {
    const entries = [
      defineAdapter({
        id: 'discord',
        match: () => false,
        scriptFile: 'discord.js',
        hostMatches: [],
        iconKey: 'discord',
        spaNavigationHosts: ['discord.com'],
      }),
      defineAdapter({
        id: 'slack',
        match: () => false,
        scriptFile: 'slack.js',
        hostMatches: [],
        iconKey: 'slack',
        spaNavigationHosts: ['app.slack.com'],
      }),
    ];
    expect(buildSpaUrlFilters(entries)).toEqual([
      { hostEquals: 'discord.com' },
      { hostEquals: 'app.slack.com' },
    ]);
  });

  it('uses hostEquals not hostSuffix (D-105)', () => {
    const entries = [
      defineAdapter({
        id: 'discord',
        match: () => false,
        scriptFile: 'discord.js',
        hostMatches: [],
        iconKey: 'discord',
        spaNavigationHosts: ['discord.com'],
      }),
    ];
    const filters = buildSpaUrlFilters(entries);
    for (const filter of filters) {
      expect(filter).toHaveProperty('hostEquals');
      expect(filter).not.toHaveProperty('hostSuffix');
    }
  });

  it('skips entries with empty spaNavigationHosts array', () => {
    const entries = [
      defineAdapter({
        id: 'empty',
        match: () => false,
        scriptFile: 'empty.js',
        hostMatches: [],
        iconKey: 'empty',
        spaNavigationHosts: [],
      }),
    ];
    expect(buildSpaUrlFilters(entries)).toEqual([]);
  });
});
