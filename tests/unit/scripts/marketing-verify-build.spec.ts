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
  mkdirSync(resolve(distDir, 'assets'), { recursive: true });
  writeFileSync(resolve(distDir, 'index.html'), html);
  writeFileSync(resolve(distDir, 'assets', 'app.js'), '// asset');
}

function writeBuiltFixture(distDir: string, builtText: string) {
  writeHtmlFixture(distDir, '<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  writeFileSync(resolve(distDir, 'assets', 'app.js'), builtText);
}

const VALID_MARKETING_BUILD_TEXT = `
Capture any page. Send to any chat.
Use cases
Structured-payload example
Supported platforms
Three-step core flow
Privacy / permissions trust
Known limits
Get the project
mockup
code-generated
marketing demo aligned to current UI contract
current repo state
OpenClaw
Discord
Slack
Telegram
live UAT pending / known risk
https://github.com/nicholaschenai/web2chat
https://github.com/nicholaschenai/web2chat#安装
`;

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

  it('reports error when built output is missing final-page smoke markers', async () => {
    const { assertBuildOutput } = await loadVerifier();
    const distDir = resolve(tmpDir, 'dist-missing-markers');
    writeBuiltFixture(distDir, 'Capture any page. Send to any chat.');

    const errors: string[] = [];
    assertBuildOutput(distDir, errors);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('mockup'))).toBe(true);
    expect(errors.some((e) => e.includes('OpenClaw'))).toBe(true);
    expect(errors.some((e) => e.includes('Telegram') || e.includes('known risk'))).toBe(true);
    expect(errors.some((e) => e.includes('#安装'))).toBe(true);
  });

  it('passes when built output contains final marketing smoke markers', async () => {
    const { assertBuildOutput } = await loadVerifier();
    const distDir = resolve(tmpDir, 'dist-valid');
    writeBuiltFixture(distDir, VALID_MARKETING_BUILD_TEXT);

    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors).toEqual([]);
  });
});
