import { describe, expect, it } from 'vitest';
import { adapterRegistry } from '@/shared/adapters/registry';
import * as dispatchPolicy from '@/shared/adapters/dispatch-policy';

const discord = adapterRegistry.find((entry) => entry.id === 'discord')!;
const slack = adapterRegistry.find((entry) => entry.id === 'slack')!;
const telegram = adapterRegistry.find((entry) => entry.id === 'telegram')!;
const openclaw = adapterRegistry.find((entry) => entry.id === 'openclaw')!;

type AdapterWithFutureLoggedOutPolicy = typeof discord & {
  readonly loggedOutPathPatterns?: readonly string[];
  readonly loggedOutHostMatches?: readonly string[];
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

  it('declares Slack loggedOutPathPatterns for login redirects', () => {
    expect(slack.loggedOutPathPatterns).toEqual([
      '/check-login*',
      '/signin*',
      '/workspace-signin*',
    ]);
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

  it('detects Slack workspace-signin and check-login URLs as NOT_LOGGED_IN candidates', () => {
    expect(
      isLoggedOutUrlForAdapter?.(
        slack,
        'https://app.slack.com/workspace-signin?redir=%2Fclient%2FT123%2FC456',
      ),
    ).toBe(true);
    expect(
      isLoggedOutUrlForAdapter?.(
        slack,
        'https://slack.com/check-login?redir=%2Fclient%2FT123%2FC456',
      ),
    ).toBe(true);
    expect(isLoggedOutUrlForAdapter?.(slack, 'https://app.slack.com/check-login')).toBe(true);
  });

  it('does not treat Slack channel URLs or non-Slack hosts as logged out', () => {
    expect(isLoggedOutUrlForAdapter?.(slack, 'https://app.slack.com/client/T1/C1')).toBe(false);
    expect(isLoggedOutUrlForAdapter?.(slack, 'https://example.com/check-login')).toBe(false);
    expect(isLoggedOutUrlForAdapter?.(slack, 'not a url')).toBe(false);
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

  it('keeps Telegram and Discord guardrails intact', () => {
    expect(isLoggedOutUrlForAdapter?.(telegram, 'https://web.telegram.org/login')).toBe(true);
    expect(isLoggedOutUrlForAdapter?.(discord, 'https://discord.com/channels/@me')).toBe(false);
  });
});
