/* eslint-disable */
/**
 * Marketing build smoke verifier (D-13 + D-14).
 *
 * Checks:
 *   1. dist/ directory exists
 *   2. dist/ contains at least one file (non-empty)
 *   3. dist/index.html exists
 *
 * Exports `assertBuildOutput(distDir, errors)` for unit-test consumption,
 * mirroring the pattern from scripts/verify-manifest.ts.
 */
import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Pure assertion function — appends error strings into `errors` for any
 * D-13 invariant violation. Exported so tests can drive it with synthetic
 * directory structures (no need to run actual builds to test failure paths).
 *
 * @param {string} distDir  - Absolute path to the marketing dist directory
 * @param {string[]} errors - Accumulator for error messages
 */
export function assertBuildOutput(distDir, errors) {
  if (!existsSync(distDir)) {
    errors.push(`dist directory does not exist: ${distDir}`);
    return; // No point checking contents if dir is missing
  }

  const files = readdirSync(distDir);
  if (files.length === 0) {
    errors.push(`dist directory is empty (no files): ${distDir}`);
    return;
  }

  const indexHtml = resolve(distDir, 'index.html');
  if (!existsSync(indexHtml)) {
    errors.push(`dist/index.html not found in: ${distDir}`);
  }
}

// ─── Main script entry ─────────────────────────────────────────────────────
// Guard so importing this module from tests does not run the CLI side-effects.

const isDirectInvocation =
  !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectInvocation) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const distDir = resolve(__dirname, '..', 'dist');
  const errors = [];

  assertBuildOutput(distDir, errors);

  if (errors.length) {
    console.error('[verify:build] FAIL:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }

  console.log('[verify:build] OK — marketing build output valid');
}
