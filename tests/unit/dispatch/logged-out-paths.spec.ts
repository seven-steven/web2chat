import { describe, expect, it } from 'vitest';
import { adapterRegistry } from '@/shared/adapters/registry';
import * as dispatchPolicy from '@/shared/adapters/dispatch-policy';

const discord = adapterRegistry.find((entry) => entry.id === 'discord')!;
const openclaw = adapterRegistry.find((entry) => entry.id === 'openclaw')!;

type AdapterWithFutureLoggedOutPolicy = typeof discord & {
  readonly loggedOutPathPatterns?: readonly string[];
};

const discordWithPolicy = discord as AdapterWithFutureLoggedOutPolicy;
const openclawWithPolicy = openclaw as AdapterWithFutureLoggedOutPolicy;

const isLoggedOutUrlForAdapter = (
  dispatchPolicy as unknown as {
    isLoggedOutUrlForAdapter?: (
      adapter: AdapterWithFutureLoggedOutPolicy,
      actualUrl: string,
    ) => boolean;
  }
).isLoggedOutUrlForAdapter;

const pathMatches = (
  dispatchPolicy as unknown as { pathMatches?: (pattern: string, pathname: string) => boolean }
).pathMatches;

describe('loggedOutPathPatterns URL policy (D-115..D-117)', () => {
  it('declares Discord loggedOutPathPatterns with exact root and trailing-star prefixes', () => {
    expect(discordWithPolicy.loggedOutPathPatterns).toEqual(['/', '/login*', '/register*']);
  });

  it('supports exact and trailing-star pathname matches without RegExp semantics', () => {
    expect(pathMatches?.('/', '/')).toBe(true);
    expect(pathMatches?.('/', '/login')).toBe(false);
    expect(pathMatches?.('/login*', '/login')).toBe(true);
    expect(pathMatches?.('/login*', '/login/callback')).toBe(true);
    expect(pathMatches?.('/register*', '/register')).toBe(true);
    expect(pathMatches?.('/register*', '/channels/@me')).toBe(false);
  });

  it('detects Discord login and register URLs as NOT_LOGGED_IN candidates', () => {
    expect(
      isLoggedOutUrlForAdapter?.(
        discord,
        'https://discord.com/login?redirect_to=%2Fchannels%2F123%2F456',
      ),
    ).toBe(true);
    expect(isLoggedOutUrlForAdapter?.(discord, 'https://discord.com/register')).toBe(true);
  });

  it('does not treat same-host non-matching Discord paths as logged out unless patterns match', () => {
    expect(isLoggedOutUrlForAdapter?.(discord, 'https://discord.com/channels/@me')).toBe(false);
    expect(isLoggedOutUrlForAdapter?.(discord, 'https://discord.com/app')).toBe(false);
  });

  it('returns false for OpenClaw and other unconfigured platforms', () => {
    expect(openclawWithPolicy.loggedOutPathPatterns).toBeUndefined();
    expect(
      isLoggedOutUrlForAdapter?.(
        openclaw,
        'http://localhost:18789/login?redirect=/chat%3Fsession%3Dagent:test:s1',
      ),
    ).toBe(false);
  });

  it('requires adapter host match and ignores invalid URLs', () => {
    expect(isLoggedOutUrlForAdapter?.(discord, 'https://example.com/login')).toBe(false);
    expect(isLoggedOutUrlForAdapter?.(discord, 'not a url')).toBe(false);
  });
});
