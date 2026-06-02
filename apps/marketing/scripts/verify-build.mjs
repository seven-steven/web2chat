/* eslint-disable */
/**
 * Marketing build smoke verifier (D-13 + D-14 + Phase 15 final gate).
 *
 * Checks:
 *   1. dist/ directory exists
 *   2. dist/ contains at least one file (non-empty)
 *   3. dist/index.html exists
 *   4. dist/index.html contains required final-page smoke markers
 *
 * Exports `assertBuildOutput(distDir, errors)` for unit-test consumption,
 * mirroring the pattern from scripts/verify-manifest.ts.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_HTML_MARKERS = [
  { label: 'hero section marker', marker: 'data-section="hero"' },
  { label: 'use-cases section marker', marker: 'data-section="use-cases"' },
  { label: 'payload section marker', marker: 'data-section="payload"' },
  { label: 'platforms section marker', marker: 'data-section="platforms"' },
  { label: 'flow section marker', marker: 'data-section="flow"' },
  { label: 'trust section marker', marker: 'data-section="trust"' },
  { label: 'limits section marker', marker: 'data-section="limits"' },
  { label: 'cta section marker', marker: 'data-section="cta"' },
  { label: 'mockup proof label', marker: 'mockup' },
  { label: 'proof source metadata', marker: 'source: code-generated' },
  {
    label: 'proof status metadata',
    marker: 'status: marketing demo aligned to current UI contract',
  },
  { label: 'proof version metadata', marker: 'version: current repo state' },
  { label: 'OpenClaw platform truth', marker: 'OpenClaw' },
  { label: 'Discord platform truth', marker: 'Discord' },
  { label: 'Slack platform truth', marker: 'Slack' },
  { label: 'Telegram platform truth', marker: 'Telegram' },
  { label: 'Telegram known-risk text', marker: 'live UAT pending / known risk' },
  { label: 'source CTA target', marker: 'https://github.com/nicholaschenai/web2chat' },
  {
    label: 'install CTA target',
    marker: 'https://github.com/nicholaschenai/web2chat#安装',
  },
];

/**
 * Pure assertion function — appends error strings into `errors` for any
 * Phase 15 invariant violation. Exported so tests can drive it with synthetic
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
    return;
  }

  const html = readFileSync(indexHtml, 'utf8');
  for (const { label, marker } of REQUIRED_HTML_MARKERS) {
    if (!html.includes(marker)) {
      errors.push(`dist/index.html missing ${label}: ${marker}`);
    }
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
