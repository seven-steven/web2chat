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
 */

// Dynamic import helper — the module is .mjs so TS has no types for it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadVerifier(): Promise<any> {
  // @ts-expect-error — .mjs has no type declarations; dynamic import resolves at runtime
  return import('../../../apps/marketing/scripts/verify-build.mjs');
}

function writeHtmlFixture(distDir: string, html: string) {
  mkdirSync(distDir, { recursive: true });
  writeFileSync(resolve(distDir, 'index.html'), html);
  writeFileSync(resolve(distDir, 'assets.js'), '// asset');
}

const VALID_MARKETING_HTML = `<!DOCTYPE html>
<html lang="en">
  <body>
    <main>
      <section data-section="hero">
        <h1>Capture any page. Send to any chat.</h1>
        <a href="https://github.com/nicholaschenai/web2chat">View project source</a>
      </section>
      <section data-section="use-cases"></section>
      <section data-section="payload">
        <span>mockup</span>
        <span>source: code-generated</span>
        <span>status: marketing demo aligned to current UI contract</span>
        <span>version: current repo state</span>
      </section>
      <section data-section="platforms">
        <article>OpenClaw</article>
        <article>Discord</article>
        <article>Slack</article>
        <article>Telegram</article>
        <article>live UAT pending / known risk</article>
      </section>
      <section data-section="flow"></section>
      <section data-section="trust"></section>
      <section data-section="limits">
        <p>Telegram shipped with live UAT pending as a known risk.</p>
        <p>Feishu/Lark was evaluated and dropped from shipped scope.</p>
        <p>Phase 11/12 Nyquist partial remains a known risk only.</p>
      </section>
      <section data-section="cta">
        <a href="https://github.com/nicholaschenai/web2chat">View project source</a>
        <a href="https://github.com/nicholaschenai/web2chat#安装">Install from README</a>
      </section>
    </main>
  </body>
</html>`;

describe('verify-build assertBuildOutput — D-13 smoke verifier', () => {
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

  it('reports error when built html is missing final-page smoke markers', async () => {
    const { assertBuildOutput } = await loadVerifier();
    const distDir = resolve(tmpDir, 'dist-missing-markers');
    writeHtmlFixture(
      distDir,
      `<!DOCTYPE html><html><body><section data-section="hero"><h1>Capture any page. Send to any chat.</h1></section></body></html>`,
    );

    const errors: string[] = [];
    assertBuildOutput(distDir, errors);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('mockup'))).toBe(true);
    expect(errors.some((e) => e.includes('OpenClaw'))).toBe(true);
    expect(errors.some((e) => e.includes('Telegram') || e.includes('known risk'))).toBe(true);
    expect(errors.some((e) => e.includes('#安装'))).toBe(true);
  });

  it('passes when dist contains final marketing smoke markers', async () => {
    const { assertBuildOutput } = await loadVerifier();
    const distDir = resolve(tmpDir, 'dist-valid');
    writeHtmlFixture(distDir, VALID_MARKETING_HTML);

    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors).toEqual([]);
  });
});
