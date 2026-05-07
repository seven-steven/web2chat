#!/usr/bin/env tsx
/**
 * Zip content verifier — runs after `wxt build && wxt zip`.
 *
 * Asserts DST-01 (zip structure) + DST-03 (permissions regression):
 *   - Exactly 1 *-chrome.zip file in .output/
 *   - manifest.json present at root
 *   - icon/128.png + icon/48.png present
 *   - _locales/en/messages.json + _locales/zh_CN/messages.json present
 *   - No .map files (source map leak prevention — T-07-01-02)
 *   - No mock-platform files (test-only dead code excluded from production)
 *
 * Exit 0 = zip structurally correct; Exit 1 = assertions failed.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const OUTPUT_DIR = resolve(import.meta.dirname, '..', '.output');

// --- Find zip file ----------------------------------------------------------

if (!existsSync(OUTPUT_DIR)) {
  console.error(`[verify-zip] FAIL: ${OUTPUT_DIR} not found. Run \`pnpm build && pnpm zip\` first.`);
  process.exit(1);
}

const zipFiles = readdirSync(OUTPUT_DIR)
  .filter((f) => f.endsWith('-chrome.zip'));

const errors: string[] = [];

if (zipFiles.length === 0) {
  errors.push('No *-chrome.zip file found in .output/');
} else if (zipFiles.length > 1) {
  errors.push(`Expected exactly 1 *-chrome.zip, found ${zipFiles.length}: ${zipFiles.join(', ')}`);
}

if (errors.length) {
  console.error('[verify-zip] FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

const zipFileName = zipFiles[0]!;
const zipPath = resolve(OUTPUT_DIR, zipFileName);

// --- Get zip listing ---------------------------------------------------------

let listing: string;
try {
  listing = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' });
} catch (err) {
  console.error(`[verify-zip] FAIL: Could not list zip contents — ${(err as Error).message}`);
  process.exit(1);
}

const lines = listing.split('\n');

// --- Assertions --------------------------------------------------------------

// manifest.json at root
if (!lines.some((l) => /\bmanifest\.json$/.test(l))) {
  errors.push('manifest.json not found at root of zip');
}

// icon files
if (!lines.some((l) => /\bicon\/128\.png/.test(l))) {
  errors.push('icon/128.png not found in zip');
}
if (!lines.some((l) => /\bicon\/48\.png/.test(l))) {
  errors.push('icon/48.png not found in zip');
}

// locale files
if (!lines.some((l) => /\b_locales\/en\/messages\.json/.test(l))) {
  errors.push('_locales/en/messages.json not found in zip');
}
if (!lines.some((l) => /\b_locales\/zh_CN\/messages\.json/.test(l))) {
  errors.push('_locales/zh_CN/messages.json not found in zip');
}

// No source maps (T-07-01-02 — information disclosure prevention)
const mapMatches = lines.filter((l) => /\.map\s/.test(l) && !/^\s*$/.test(l));
if (mapMatches.length > 0) {
  errors.push(`Source map files found in zip (${mapMatches.length}): ${mapMatches.map((l) => l.trim()).join('; ')}`);
}

// No mock-platform (test-only dead code — DST-01 production exclusion)
const mockMatches = lines.filter((l) => /mock-platform/.test(l));
if (mockMatches.length > 0) {
  errors.push(`mock-platform files found in zip (should be excluded): ${mockMatches.map((l) => l.trim()).join('; ')}`);
}

// --- Report ------------------------------------------------------------------

if (errors.length) {
  console.error('[verify-zip] FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

const sizeBytes = statSync(zipPath).size;
const sizeKB = (sizeBytes / 1024).toFixed(1);
console.log(`[verify-zip] OK -- ${zipFileName} (${sizeKB} KB)`);
