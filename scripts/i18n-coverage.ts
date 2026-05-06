#!/usr/bin/env tsx
/**
 * i18n coverage audit — asserts 100% bidirectional coverage between
 * source t() calls and locale YAML keys (I18N-01).
 *
 * Usage: pnpm test:i18n-coverage
 * Exit 0 = all keys covered; Exit 1 = gaps found.
 *
 * Scanned t() forms:
 *   t('key')  t("key")  t(`key`)
 * NOT scanned (dynamic keys are forbidden by convention):
 *   t(someVar)  t(`prefix-${x}`)
 *
 * MANIFEST_ONLY_KEYS: keys used in wxt.config.ts __MSG_*__ or index.html
 * __MSG_*__ but never called via t() — these are expected "orphans".
 */

import { parse } from 'yaml';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, extname } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const LOCALES_DIR = join(ROOT, 'locales');

// Keys that live in locale files for manifest/__MSG_*__ use and are
// intentionally NOT called via t() in source code.
// Update this allowlist when new manifest keys are added.
const MANIFEST_ONLY_KEYS = new Set([
  'action_default_title', // wxt.config.ts: action.default_title
  'command_open_popup', // wxt.config.ts: commands._execute_action.description
  'extension_description', // wxt.config.ts: description
  'extension_name', // wxt.config.ts: name
  'options_page_title', // entrypoints/options/index.html: <title>__MSG_...__</title>
]);

// --- Gather all source files -----------------------------------------------
const SCAN_DIRS = ['shared', 'entrypoints', 'background', 'content'];
const EXCLUDE_FILES = new Set([join(ROOT, 'scripts/i18n-coverage.ts')]);

function walkDir(dir: string, files: string[] = []): string[] {
  const dirPath = join(ROOT, dir);
  if (!statSync(dirPath, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const full = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.wxt') continue;
      walkDir(join(dir, entry.name).replace(ROOT + '/', ''), files);
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      if (!EXCLUDE_FILES.has(full)) files.push(full);
    }
  }
  return files;
}

const sourceFiles = SCAN_DIRS.flatMap((d) => walkDir(d));

// --- Extract t() key references from source ---------------------------------
// Matches: t('key'), t("key"), t(`key`) -- static string keys only
// Word boundary \b ensures we match the `t` function call, not suffixes like `getRoot`.
// Character class uses a-zA-Z because keys like error_code_NOT_LOGGED_IN_heading are mixed-case.
const T_CALL_RE = /\bt\(\s*(['"`])([a-zA-Z][a-zA-Z0-9_]*)\1/g;

// Lines that are inside block comments (/* ... */ or /** ... */) or single-line
// comments (// ...) should not be scanned — they may contain t('key') in doc strings.
function isInComment(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

const usedKeys = new Set<string>();
for (const file of sourceFiles) {
  const src = readFileSync(file, 'utf-8');
  for (const line of src.split('\n')) {
    if (isInComment(line)) continue;
    T_CALL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = T_CALL_RE.exec(line)) !== null) {
      usedKeys.add(m[2] as string);
    }
  }
}

// --- Load locale YAML keys --------------------------------------------------
type WxtLocaleEntry = { message: string };
type WxtLocaleYaml = Record<string, WxtLocaleEntry>;

function loadLocaleKeys(locale: string): Set<string> {
  const raw = parse(readFileSync(join(LOCALES_DIR, `${locale}.yml`), 'utf-8')) as WxtLocaleYaml;
  return new Set(Object.keys(raw));
}

const enKeys = loadLocaleKeys('en');
const zhKeys = loadLocaleKeys('zh_CN');

// --- Compute gaps -----------------------------------------------------------
// 1. Keys used in source but missing from locale files
const missingFromEn = [...usedKeys].filter((k) => !enKeys.has(k));
const missingFromZh = [...usedKeys].filter((k) => !zhKeys.has(k));

// 2. Keys in locale files not referenced in source
//    Subtract MANIFEST_ONLY_KEYS -- they are expected orphans (used via __MSG_*__)
const unusedInEn = [...enKeys].filter((k) => !usedKeys.has(k) && !MANIFEST_ONLY_KEYS.has(k));
const unusedInZh = [...zhKeys].filter((k) => !usedKeys.has(k) && !MANIFEST_ONLY_KEYS.has(k));

// 3. Keys in en but missing from zh_CN (asymmetric locale files)
const enNotZh = [...enKeys].filter((k) => !zhKeys.has(k));
const zhNotEn = [...zhKeys].filter((k) => !enKeys.has(k));

// --- Report -----------------------------------------------------------------
let ok = true;

function report(label: string, items: string[]) {
  if (items.length === 0) {
    console.log(`  ${label}: none`);
    return;
  }
  console.error(`  ${label} (${items.length}):`);
  for (const item of items) console.error(`   - ${item}`);
  ok = false;
}

console.log(`\ni18n Coverage Audit`);
console.log(`===================`);
console.log(`Source files scanned: ${sourceFiles.length}`);
console.log(`t() keys referenced:  ${usedKeys.size}`);
console.log(`en.yml keys:          ${enKeys.size}`);
console.log(`zh_CN.yml keys:       ${zhKeys.size}`);
console.log(
  `Manifest-only keys (allowlist, not checked as orphans): ${[...MANIFEST_ONLY_KEYS].join(', ')}\n`,
);

report('Keys used in source but MISSING from en.yml', missingFromEn);
report('Keys used in source but MISSING from zh_CN.yml', missingFromZh);
report('Keys in en.yml but NOT referenced in source (excluding manifest-only)', unusedInEn);
report('Keys in zh_CN.yml but NOT referenced in source (excluding manifest-only)', unusedInZh);
report('Keys in en.yml but MISSING from zh_CN.yml', enNotZh);
report('Keys in zh_CN.yml but MISSING from en.yml', zhNotEn);

if (ok) {
  console.log(`\ni18n coverage: 100% -- all ${usedKeys.size} keys covered in both locales\n`);
  process.exit(0);
} else {
  console.error(`\ni18n coverage gaps found -- fix the above before release\n`);
  process.exit(1);
}
