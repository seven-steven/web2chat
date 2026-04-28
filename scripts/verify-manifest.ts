#!/usr/bin/env tsx
/**
 * Manifest verifier — runs after `wxt build`.
 *
 * Asserts FND-05 + ROADMAP Phase 1 success criterion #5:
 *   - permissions === ['activeTab', 'scripting', 'storage'] (set equality)
 *   - host_permissions === ['https://discord.com/*'] (NO `<all_urls>` ever)
 *   - optional_host_permissions === ['<all_urls>']
 *   - default_locale === 'en'
 *   - name / description / action.default_title use __MSG_*__
 *
 * NEVER pass on a manifest with `<all_urls>` in static `host_permissions` —
 * that's the canonical Web Store rejection trigger (PITFALLS §陷阱 9).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), '.output/chrome-mv3/manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`[verify-manifest] FAIL: ${manifestPath} not found. Run \`pnpm build\` first.`);
  process.exit(1);
}

type Manifest = {
  name?: string;
  description?: string;
  default_locale?: string;
  permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  action?: { default_title?: string };
};

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
const errors: string[] = [];

const expectSet = (label: string, actual: string[] | undefined, expected: string[]): void => {
  const a = (actual ?? []).slice().sort();
  const e = expected.slice().sort();
  if (JSON.stringify(a) !== JSON.stringify(e)) {
    errors.push(`${label} mismatch: expected ${JSON.stringify(e)}, got ${JSON.stringify(actual)}`);
  }
};

expectSet('permissions', manifest.permissions, ['activeTab', 'scripting', 'storage']);
expectSet('host_permissions', manifest.host_permissions, ['https://discord.com/*']);
expectSet('optional_host_permissions', manifest.optional_host_permissions, ['<all_urls>']);

// Hard guard: <all_urls> in static host_permissions is the canonical
// Web Store rejection trigger.
if ((manifest.host_permissions ?? []).includes('<all_urls>')) {
  errors.push('FATAL: `<all_urls>` present in static host_permissions (FND-05 + DST-03 violation)');
}

if (manifest.default_locale !== 'en') {
  errors.push(`default_locale must be 'en', got ${JSON.stringify(manifest.default_locale)}`);
}

const msgFields: Array<readonly [string, string | undefined]> = [
  ['name', manifest.name],
  ['description', manifest.description],
  ['action.default_title', manifest.action?.default_title],
];
for (const [field, value] of msgFields) {
  if (typeof value !== 'string' || !value.startsWith('__MSG_')) {
    errors.push(`${field} must use __MSG_*__ placeholder, got ${JSON.stringify(value)}`);
  }
}

if (errors.length) {
  console.error('[verify-manifest] FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('[verify-manifest] OK — all assertions passed');
