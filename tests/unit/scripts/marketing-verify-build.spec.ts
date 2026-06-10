import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Unit tests for the marketing build verifier.
 *
 * These tests exercise the pure assertion logic exported from
 * apps/marketing/scripts/verify-build.mjs — `assertBuildOutput(distDir, errors)`.
 *
 * Pattern mirrors tests/unit/scripts/verify-manifest.spec.ts:
 *   - No mutation of real build output
 *   - Temporary directories for fixtures
 *   - Error collection via `errors` array
 *
 * Phase 15 final smoke gate (PROOF-03 / CTA-02 / TRUST-01 / TRUST-02):
 * beyond filesystem existence, the verifier must inspect the built output for
 * final-page invariants — SPA shell integrity in dist/index.html plus content
 * markers (8-section titles, mockup proof label, shipped platform truth,
 * Telegram known-risk text, source/install CTA destinations) in the dist text
 * assets, because the marketing page is client-rendered and its copy lives in
 * the JS chunks.
 */

// Dynamic import helper — the module is .mjs so TS has no types for it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadVerifier(): Promise<any> {
  // @ts-expect-error — .mjs has no type declarations; dynamic import resolves at runtime
  return import('../../../apps/marketing/scripts/verify-build.mjs');
}

/** Minimal valid SPA shell matching the real vite build output of index.html. */
const VALID_SHELL_HTML = [
  '<!doctype html>',
  '<html lang="en"><head>',
  '<script type="module" crossorigin src="/assets/index-abc.js"></script>',
  '</head><body><div id="app"></div></body></html>',
].join('\n');

/**
 * Writes a synthetic dist directory shaped like the real vite output:
 * dist/index.html (shell) + dist/assets/index-abc.js (bundled content).
 */
function writeDistFixture(distDir: string, html: string, bundleJs: string): void {
  mkdirSync(resolve(distDir, 'assets'), { recursive: true });
  writeFileSync(resolve(distDir, 'index.html'), html);
  writeFileSync(resolve(distDir, 'assets', 'index-abc.js'), bundleJs);
}

describe('verify-build assertBuildOutput — filesystem invariants (D-13)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'marketing-verify-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports error when dist directory does not exist', async () => {
    const { assertBuildOutput } = await loadVerifier();
    const missingDir = resolve(tmpDir, 'no-such-dist');
    const errors: string[] = [];
    assertBuildOutput(missingDir, errors);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('not found') || e.includes('does not exist'))).toBe(true);
  });

  it('reports error when dist directory is empty', async () => {
    const { assertBuildOutput } = await loadVerifier();
    const emptyDist = resolve(tmpDir, 'empty-dist');
    mkdirSync(emptyDist, { recursive: true });
    const errors: string[] = [];
    assertBuildOutput(emptyDist, errors);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('empty') || e.includes('no files'))).toBe(true);
  });

  it('reports error when index.html is missing but other files exist', async () => {
    const { assertBuildOutput } = await loadVerifier();
    const distDir = resolve(tmpDir, 'dist-no-index');
    mkdirSync(distDir, { recursive: true });
    writeFileSync(resolve(distDir, 'bundle.js'), '// bundle');
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('index.html'))).toBe(true);
  });
});

describe('verify-build assertBuildOutput — final page smoke gate (PROOF-03 / CTA-02)', () => {
  let tmpDir: string;
  let distDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'marketing-verify-test-'));
    distDir = resolve(tmpDir, 'dist');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports the required page marker list covering proof / truth / CTA invariants', async () => {
    const { REQUIRED_PAGE_MARKERS } = await loadVerifier();
    expect(Array.isArray(REQUIRED_PAGE_MARKERS)).toBe(true);
    // Hero / value content marker
    expect(REQUIRED_PAGE_MARKERS).toContain('Capture any page. Send it to chat.');
    // Proof label (PROOF-03 / D-05)
    expect(REQUIRED_PAGE_MARKERS).toContain('mockup');
    // Shipped platform truth (CLM-PLATFORM-01)
    for (const platform of ['OpenClaw', 'Discord', 'Slack', 'Telegram']) {
      expect(REQUIRED_PAGE_MARKERS).toContain(platform);
    }
    // Telegram known-risk text (CLM-LIMIT-01)
    expect(REQUIRED_PAGE_MARKERS).toContain('live UAT pending / known risk');
    // Both CTA destinations (CTA-01 / CTA-02)
    expect(REQUIRED_PAGE_MARKERS).toContain('https://github.com/seven-steven/web2chat');
    expect(REQUIRED_PAGE_MARKERS).toContain('#%E5%AE%89%E8%A3%85');
  });

  it('reports error when index.html lacks the SPA shell (app mount + module script)', async () => {
    const { assertBuildOutput, REQUIRED_PAGE_MARKERS } = await loadVerifier();
    writeDistFixture(
      distDir,
      '<!doctype html><html><body><p>static page, no app shell</p></body></html>',
      REQUIRED_PAGE_MARKERS.join('\n'),
    );
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('id="app"'))).toBe(true);
    expect(errors.some((e) => e.includes('module script'))).toBe(true);
  });

  it('reports error when built output is missing section / hero markers', async () => {
    const { assertBuildOutput, REQUIRED_PAGE_MARKERS } = await loadVerifier();
    const withoutSections = REQUIRED_PAGE_MARKERS.filter(
      (m: string) => m !== 'Known limits' && m !== 'Capture any page. Send it to chat.',
    );
    writeDistFixture(distDir, VALID_SHELL_HTML, withoutSections.join('\n'));
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Known limits'))).toBe(true);
    expect(errors.some((e) => e.includes('Capture any page. Send it to chat.'))).toBe(true);
  });

  it('reports error when built output is missing the mockup proof label', async () => {
    const { assertBuildOutput, REQUIRED_PAGE_MARKERS } = await loadVerifier();
    const withoutProof = REQUIRED_PAGE_MARKERS.filter((m: string) => m !== 'mockup');
    writeDistFixture(distDir, VALID_SHELL_HTML, withoutProof.join('\n'));
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('mockup'))).toBe(true);
  });

  it('reports error when built output is missing CTA destinations', async () => {
    const { assertBuildOutput, REQUIRED_PAGE_MARKERS } = await loadVerifier();
    const withoutCta = REQUIRED_PAGE_MARKERS.filter(
      (m: string) =>
        m !== 'https://github.com/seven-steven/web2chat' && m !== '#%E5%AE%89%E8%A3%85',
    );
    writeDistFixture(distDir, VALID_SHELL_HTML, withoutCta.join('\n'));
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('https://github.com/seven-steven/web2chat'))).toBe(true);
    expect(errors.some((e) => e.includes('#%E5%AE%89%E8%A3%85'))).toBe(true);
  });

  it('reports error when built output is missing Telegram known-risk text', async () => {
    const { assertBuildOutput, REQUIRED_PAGE_MARKERS } = await loadVerifier();
    const withoutRisk = REQUIRED_PAGE_MARKERS.filter(
      (m: string) => m !== 'live UAT pending / known risk',
    );
    writeDistFixture(distDir, VALID_SHELL_HTML, withoutRisk.join('\n'));
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('live UAT pending / known risk'))).toBe(true);
  });

  it('passes when the dist contains the SPA shell and every required page marker', async () => {
    const { assertBuildOutput, REQUIRED_PAGE_MARKERS } = await loadVerifier();
    writeDistFixture(distDir, VALID_SHELL_HTML, REQUIRED_PAGE_MARKERS.join('\n'));
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors).toEqual([]);
  });

  it('finds markers split across index.html and asset chunks (locale chunk case)', async () => {
    const { assertBuildOutput, REQUIRED_PAGE_MARKERS } = await loadVerifier();
    const [first, ...rest] = REQUIRED_PAGE_MARKERS;
    mkdirSync(resolve(distDir, 'assets'), { recursive: true });
    writeFileSync(resolve(distDir, 'index.html'), `${VALID_SHELL_HTML}\n<!-- ${first} -->`);
    writeFileSync(resolve(distDir, 'assets', 'index-abc.js'), rest.slice(0, 3).join('\n'));
    writeFileSync(resolve(distDir, 'assets', 'zh_CN-def.js'), rest.slice(3).join('\n'));
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors).toEqual([]);
  });
});
