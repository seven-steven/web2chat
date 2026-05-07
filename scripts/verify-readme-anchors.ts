#!/usr/bin/env tsx
/**
 * README anchor parity verifier — asserts bilingual documentation consistency.
 *
 * Asserts DST-04 (heading parity between README.md and README.en.md) +
 * DST-02 (PRIVACY policy file existence):
 *   - Both README.md (zh_CN) and README.en.md (en) exist
 *   - Same number of ## headings in both files
 *   - PRIVACY.md exists
 *   - PRIVACY.zh_CN.md exists
 *
 * Exit 0 = parity confirmed; Exit 1 = gaps found.
 *
 * Note: README files are rewritten in Plan 03. This script is ready for when
 * they land — it will intentionally fail until then.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const errors: string[] = [];

// --- README heading parity (DST-04) -----------------------------------------

const readmeZhPath = resolve(ROOT, 'README.md');
const readmeEnPath = resolve(ROOT, 'README.en.md');

if (!existsSync(readmeZhPath)) {
  errors.push('README.md not found');
}
if (!existsSync(readmeEnPath)) {
  errors.push('README.en.md not found');
}

function extractH2Headings(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.replace(/^## /, '').trim());
}

if (existsSync(readmeZhPath) && existsSync(readmeEnPath)) {
  const zhHeadings = extractH2Headings(readmeZhPath);
  const enHeadings = extractH2Headings(readmeEnPath);

  if (zhHeadings.length !== enHeadings.length) {
    errors.push(
      `README heading count mismatch: README.md has ${zhHeadings.length} ## headings, README.en.md has ${enHeadings.length}`,
    );
  }
}

// --- PRIVACY file existence (DST-02) ----------------------------------------

if (!existsSync(resolve(ROOT, 'PRIVACY.md'))) {
  errors.push('PRIVACY.md not found');
}

if (!existsSync(resolve(ROOT, 'PRIVACY.zh_CN.md'))) {
  errors.push('PRIVACY.zh_CN.md not found');
}

// --- Report ------------------------------------------------------------------

if (errors.length) {
  console.error('[verify-readme] FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

const zhHeadings = extractH2Headings(readmeZhPath);
console.log(
  `[verify-readme] OK -- both READMEs have ${zhHeadings.length} sections, PRIVACY files present`,
);
