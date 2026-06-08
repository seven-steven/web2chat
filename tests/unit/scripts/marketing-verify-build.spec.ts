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
 * TDD RED: The verifier module does not yet export `assertBuildOutput`.
 * These tests will fail until the GREEN task implements it.
 */

// Dynamic import helper — the module is .mjs so TS has no types for it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadVerifier(): Promise<any> {
  // @ts-expect-error — .mjs has no type declarations; dynamic import resolves at runtime
  return import('../../../apps/marketing/scripts/verify-build.mjs');
}

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

  it('passes when dist contains index.html and at least one file', async () => {
    const { assertBuildOutput } = await loadVerifier();
    const distDir = resolve(tmpDir, 'dist-valid');
    mkdirSync(distDir, { recursive: true });
    writeFileSync(resolve(distDir, 'index.html'), '<!DOCTYPE html><html></html>');
    writeFileSync(resolve(distDir, 'assets'), 'fake-asset');
    const errors: string[] = [];
    assertBuildOutput(distDir, errors);
    expect(errors).toEqual([]);
  });
});
