/**
 * Adapter registry — single source of truth for platform detection (D-24 / D-26).
 *
 * Each entry describes ONE IM platform via defineAdapter() (D-97):
 *   - id: branded PlatformId (D-96)
 *   - match(url): pure URL test — popup uses for icon + Confirm enable;
 *                 SW uses to pick which adapter to inject
 *   - scriptFile: path of the WXT-built content script bundle
 *                 (passed to chrome.scripting.executeScript({ files }))
 *   - hostMatches: glob patterns for verify-manifest cross-checks
 *   - iconKey: i18n key for tooltip alt text
 *   - spaNavigationHosts?: exact hosts for SPA history listener opt-in (D-103 / D-104)
 *
 * Adding a new platform = append defineAdapter() entry here + create entrypoints/<platform>.content.ts.
 * NO other code changes — popup detector + SW dispatch pipeline auto-discover the new entry.
 *
 * **Location rationale**: this module lives in `shared/` (alongside types.ts) because
 * popup (Plan 06 SendForm + App.tsx) AND SW (Plan 04 dispatch-pipeline) both import
 * findAdapter / detectPlatformId. WXT bundles `shared/` into both popup and background
 * bundles transparently.
 *
 * CRITICAL: match() is a pure function — NO chrome.* calls. WXT inlines this module
 * into popup + SW + content-script bundles; chrome.* dependencies would break popup-side
 * bundling.
 *
 * mainWorldInjector is NOT populated here — it is wired in background/main-world-registry.ts
 * (SW-only) to prevent MAIN-world injector code from leaking into the popup bundle.
 */
import { defineAdapter } from './types';
import type { AdapterRegistryEntry, PlatformId } from './types';

export const adapterRegistry: readonly AdapterRegistryEntry[] = [
  defineAdapter({
    id: 'mock',
    // RESEARCH Open Q2: localhost:4321 fixture URL (NOT mock:// scheme — chrome.tabs.create rejects it).
    // Match strips query/hash so failure-injection links (?fail=timeout) still hit.
    match: (url: string): boolean => {
      try {
        const u = new URL(url);
        return u.host === 'localhost:4321' && u.pathname === '/mock-platform.html';
      } catch {
        return false;
      }
    },
    // WXT 0.20.x build path. If `pnpm build` produces a different file path
    // (e.g. content-scripts/mock-platform.content.js), update this string AND
    // the acceptance criterion `test -f .output/...` line below.
    scriptFile: 'content-scripts/mock-platform.js',
    hostMatches: ['http://localhost/*'],
    iconKey: 'platform_icon_mock',
  }),
  defineAdapter({
    id: 'openclaw',
    match: (url: string): boolean => {
      try {
        const u = new URL(url);
        return (
          (u.pathname === '/ui/chat' || u.pathname === '/chat') && u.searchParams.has('session')
        );
      } catch {
        return false;
      }
    },
    scriptFile: 'content-scripts/openclaw.js',
    hostMatches: [], // dynamic permission — no static host_permissions
    iconKey: 'platform_icon_openclaw',
    requiresDynamicPermission: true,
  }),
  defineAdapter({
    id: 'discord',
    match: (url: string): boolean => {
      try {
        const u = new URL(url);
        return (
          u.hostname === 'discord.com' &&
          u.pathname.startsWith('/channels/') &&
          !u.pathname.startsWith('/channels/@me/')
        );
      } catch {
        return false;
      }
    },
    scriptFile: 'content-scripts/discord.js',
    hostMatches: ['https://discord.com/*'],
    iconKey: 'platform_icon_discord',
    spaNavigationHosts: ['discord.com'],
  }),
];

/**
 * Pure URL → adapter resolver. Returns the FIRST matching entry, or undefined.
 * Called by popup (icon display + Confirm enable) and SW (route to adapter).
 */
export function findAdapter(url: string): AdapterRegistryEntry | undefined {
  return adapterRegistry.find((a) => a.match(url));
}

/** Return the registered PlatformId for a URL, or null if unsupported. */
export function detectPlatformId(url: string): PlatformId | null {
  return findAdapter(url)?.id ?? null;
}

/**
 * Build chrome.events.UrlFilter[] from registry entries that opt-in to SPA handling.
 * Pure synchronous function — safe for top-level SW registration (MV3 requirement).
 * Uses hostEquals (exact match, per D-105) — never hostSuffix.
 */
export function buildSpaUrlFilters(
  registry: readonly AdapterRegistryEntry[],
): { hostEquals: string }[] {
  return registry
    .filter(
      (e): e is AdapterRegistryEntry & { spaNavigationHosts: readonly string[] } =>
        Array.isArray(e.spaNavigationHosts) && e.spaNavigationHosts.length > 0,
    )
    .flatMap((e) => e.spaNavigationHosts.map((host) => ({ hostEquals: host })));
}
