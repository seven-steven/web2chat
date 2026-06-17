/* eslint-disable */
/**
 * Marketing build smoke verifier (D-13 + D-14, strengthened in Phase 15 Plan 04).
 *
 * Filesystem checks (D-13):
 *   1. dist/ directory exists
 *   2. dist/ contains at least one file (non-empty)
 *   3. dist/index.html exists
 *
 * Final-page smoke checks (PROOF-03 / CTA-02 / TRUST-01 / TRUST-02):
 *   4. dist/index.html keeps the SPA shell (app mount point + module script)
 *   5. The built text assets (index.html + dist/assets/* chunks) contain every
 *      REQUIRED_PAGE_MARKERS entry — hero/value copy, the 8-section titles,
 *      the `mockup` proof label, shipped platform truth, the Telegram
 *      known-risk text, and both source/install CTA destinations. The page is
 *      client-rendered, so the copy lives in the JS chunks rather than HTML.
 *
 * Exports `assertBuildOutput(distDir, errors)` and `REQUIRED_PAGE_MARKERS`
 * for unit-test consumption, mirroring the pattern from
 * scripts/verify-manifest.ts.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
// WR-04: shared platform whitelist with scripts/verify-claims.ts — single
// source of truth in scripts/shipped-platforms.json prevents the two gates
// from drifting when a platform is added/removed.
import SHIPPED_PLATFORMS from '../../../scripts/shipped-platforms.json' with { type: 'json' };

/**
 * Final-page content invariants tied to Phase 15 requirements. Each marker
 * must appear somewhere in the built text output (index.html or asset chunks).
 *
 * Sources of truth:
 *   - hero/value copy + section titles: apps/marketing/src/i18n/locales/en.json
 *   - proof label `mockup`: PROOF-03 / D-05 (self-declared mockup labeling)
 *   - shipped platforms + Telegram risk: CLM-PLATFORM-01 / CLM-LIMIT-01
 *   - CTA destinations: site-content.ts REPO_URL / INSTALL_URL (CTA-01/02)
 */
export const REQUIRED_PAGE_MARKERS = [
  // Hero / value content (D-01)
  'Capture any page. Send it to chat.',
  // 8-section titles (D-02 locked order; hero has no h2 title)
  "What it's for",
  'Structured payload, not copy-paste',
  'Supported platforms',
  'Three steps',
  'Privacy and permissions',
  'Known limits',
  'Start with the source',
  // Proof label (PROOF-03 / D-05)
  'mockup',
  // Shipped platform truth (CLM-PLATFORM-01)
  'OpenClaw',
  'Discord',
  'Slack',
  'Telegram',
  // Telegram known-risk text (CLM-LIMIT-01)
  'live UAT pending / known risk',
  // CTA destinations: source repo (CTA-01) + README install anchor (CTA-02)
  'https://github.com/seven-steven/web2chat',
  '#%E5%AE%89%E8%A3%85',
  // Phase 16 / WR-02: zh_CN markers — close smoke-gate blind spot for Chinese-locale chunk regression.
  '抓取任意网页，一键投递到聊天。',
  '隐私与权限',
];

// WR-04: cross-verify against the shared platform whitelist so the two gates
// (scripts/verify-claims.ts + this file) cannot drift. REQUIRED_PAGE_MARKERS
// MUST cover every shipped platform name (it is a superset). A platform added
// to scripts/shipped-platforms.json but missing from REQUIRED_PAGE_MARKERS
// would otherwise fail silently here. Checked at module load (cheap, constant).
for (const platform of SHIPPED_PLATFORMS) {
  if (!REQUIRED_PAGE_MARKERS.includes(platform)) {
    throw new Error(
      `[verify-build] WR-04 drift: shipped platform "${platform}" is not in REQUIRED_PAGE_MARKERS`,
    );
  }
}

/** File extensions considered text output worth scanning for markers. */
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt']);

/**
 * Recursively collects the concatenated text content of dist (index.html plus
 * every text asset chunk), so markers split across locale chunks are found.
 *
 * @param {string} dir - Directory to walk
 * @returns {string} Concatenated text content
 */
function readDistText(dir) {
  let text = '';
  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      text += readDistText(fullPath);
    } else if (TEXT_EXTENSIONS.has(extname(entry))) {
      text += readFileSync(fullPath, 'utf-8');
    }
  }
  return text;
}

/**
 * Pure assertion function — appends error strings into `errors` for any
 * smoke-gate invariant violation. Exported so tests can drive it with
 * synthetic directory structures (no need to run actual builds to test
 * failure paths).
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
    return; // SPA shell + marker checks need index.html
  }

  // SPA shell integrity — the page is client-rendered, so a missing mount
  // point or module script means a blank page even if assets exist.
  const html = readFileSync(indexHtml, 'utf-8');
  if (!html.includes('id="app"')) {
    errors.push('dist/index.html missing the app mount point (id="app")');
  }
  if (!/<script[^>]*type="module"[^>]*>/.test(html)) {
    errors.push('dist/index.html missing a module script tag (no JS entry wired)');
  }
  if (!/<link[^>]*rel="icon"[^>]*href="\/favicon\.svg"[^>]*>/.test(html)) {
    errors.push('dist/index.html missing favicon link (/favicon.svg)');
  }
  if (!existsSync(resolve(distDir, 'favicon.svg'))) {
    errors.push('dist/favicon.svg not found');
  }

  // Final-page content markers — scanned across index.html + asset chunks.
  const distText = readDistText(distDir);
  for (const marker of REQUIRED_PAGE_MARKERS) {
    if (!distText.includes(marker)) {
      errors.push(`built output missing required page marker: ${marker}`);
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
