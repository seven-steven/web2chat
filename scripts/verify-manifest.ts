#!/usr/bin/env tsx
/**
 * Manifest verifier — runs after `wxt build`.
 *
 * Asserts FND-05 + ROADMAP Phase 1 success criterion #5:
 *   - permissions === ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation'] (set equality)
 *   - host_permissions === ['https://discord.com/*'] (NO `<all_urls>` ever)
 *   - optional_host_permissions === ['<all_urls>']
 *   - default_locale === 'en'
 *   - name / description / action.default_title use __MSG_*__
 *   - commands._execute_action.suggested_key.default === 'Ctrl+Shift+S' (DSP-10 + D-38)
 *   - commands._execute_action.suggested_key.mac === 'Command+Shift+S'
 *   - commands._execute_action.description uses __MSG_*__ (I18N-04 baseline)
 *   - options_ui.page === 'options.html' WHEN PRESENT (D-37 + Pitfall 7; conditional because Plan 07 lands the entrypoint last)
 *
 * The assertion logic is exposed as `assertManifest(manifest, errors)` for
 * unit-test consumption (tests/unit/scripts/verify-manifest.spec.ts) — DO NOT
 * mutate wxt.config.ts to test failure paths.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export type Manifest = {
  name?: string | undefined;
  description?: string | undefined;
  default_locale?: string | undefined;
  permissions?: string[] | undefined;
  host_permissions?: string[] | undefined;
  optional_host_permissions?: string[] | undefined;
  action?: { default_title?: string | undefined } | undefined;
  commands?:
    | {
        _execute_action?:
          | {
              suggested_key?:
                | { default?: string | undefined; mac?: string | undefined }
                | undefined;
              description?: string | undefined;
            }
          | undefined;
      }
    | undefined;
  options_ui?: { page?: string | undefined; open_in_tab?: boolean | undefined } | undefined;
};

const expectSet = (label: string, actual: string[] | undefined, expected: string[]): void => {
  const a = (actual ?? []).slice().sort();
  const e = expected.slice().sort();
  if (JSON.stringify(a) !== JSON.stringify(e)) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(e)}, got ${JSON.stringify(actual)}`,
    );
  }
};

/**
 * Pure assertion function — appends error strings into `errors` for any
 * invariant violation. Exported so tests/unit/scripts/verify-manifest.spec.ts
 * can drive it with synthetic Manifest objects (no need to mutate
 * wxt.config.ts to test the failure paths).
 */
export function assertManifest(manifest: Manifest, errors: string[]): void {
  // ─── Phase 1 invariants ─────────────────────────────────────────────────

  try {
    expectSet('permissions', manifest.permissions, [
      'activeTab',
      'alarms',
      'scripting',
      'storage',
      'webNavigation',
    ]);
  } catch (e) {
    errors.push((e as Error).message);
  }

  try {
    expectSet('host_permissions', manifest.host_permissions, ['https://discord.com/*']);
  } catch (e) {
    errors.push((e as Error).message);
  }

  try {
    expectSet('optional_host_permissions', manifest.optional_host_permissions, ['<all_urls>']);
  } catch (e) {
    errors.push((e as Error).message);
  }

  // Hard guard: <all_urls> in static host_permissions is the canonical
  // Web Store rejection trigger.
  if ((manifest.host_permissions ?? []).includes('<all_urls>')) {
    errors.push(
      'FATAL: `<all_urls>` present in static host_permissions (FND-05 + DST-03 violation)',
    );
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

  // ─── Phase 3 invariants ─────────────────────────────────────────────────

  // DSP-10 + D-38: Ctrl+Shift+S keyboard shortcut registered.
  const cmd = manifest.commands?._execute_action;
  if (!cmd) {
    errors.push('commands._execute_action missing (DSP-10 + D-38 violation)');
  } else {
    if (cmd.suggested_key?.default !== 'Ctrl+Shift+S') {
      errors.push(
        `commands._execute_action.suggested_key.default must be 'Ctrl+Shift+S', got ${JSON.stringify(cmd.suggested_key?.default)}`,
      );
    }
    if (cmd.suggested_key?.mac !== 'Command+Shift+S') {
      errors.push(
        `commands._execute_action.suggested_key.mac must be 'Command+Shift+S', got ${JSON.stringify(cmd.suggested_key?.mac)}`,
      );
    }
    if (typeof cmd.description !== 'string' || !cmd.description.startsWith('__MSG_')) {
      errors.push(
        `commands._execute_action.description must use __MSG_*__ placeholder, got ${JSON.stringify(cmd.description)}`,
      );
    }
  }

  // D-37 + RESEARCH Pitfall 7: WXT 0.20.x auto-generates manifest.options_ui
  // (NOT manifest.options_page) for entrypoints/options/. Skip when entrypoint
  // not yet present (Plan 07 lands it; Plan 03 build runs without options/).
  // Conditional guard: this plan's Wave 1 build does NOT have entrypoints/options/,
  //   so options_ui is undefined and the assertion is a no-op. Plan 07's Wave 2 build
  //   creates the entrypoint, options_ui appears, and this assertion enforces.
  if (manifest.options_ui !== undefined) {
    if (manifest.options_ui.page !== 'options.html') {
      errors.push(
        `options_ui.page must be 'options.html', got ${JSON.stringify(manifest.options_ui.page)}`,
      );
    }
  }
}

// ─── Main script entry ─────────────────────────────────────────────────────

const manifestPath = resolve(process.cwd(), '.output/chrome-mv3/manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`[verify-manifest] FAIL: ${manifestPath} not found. Run \`pnpm build\` first.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
const errors: string[] = [];
assertManifest(manifest, errors);

if (errors.length) {
  console.error('[verify-manifest] FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('[verify-manifest] OK — all assertions passed');
