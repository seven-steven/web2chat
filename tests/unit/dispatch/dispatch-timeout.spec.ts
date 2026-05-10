/**
 * Verify dispatch-pipeline has no setTimeout (SW discipline, CR-02).
 *
 * The old ADAPTER_RESPONSE_TIMEOUT_MS constant and Promise.race+setTimeout
 * pattern were removed. The 30s chrome.alarms backstop (DISPATCH_TIMEOUT_MINUTES)
 * is the sole timeout mechanism.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const pipelinePath = path.resolve(__dirname, '../../../background/dispatch-pipeline.ts');

describe('dispatch-pipeline SW discipline (CR-02: no setTimeout)', () => {
  it('contains no setTimeout calls in executable code', () => {
    const src = fs.readFileSync(pipelinePath, 'utf-8');
    // Strip comments (single-line // and multi-line /* */) to avoid false positives
    const codeOnly = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeOnly).not.toContain('setTimeout');
  });

  it('does not export ADAPTER_RESPONSE_TIMEOUT_MS', () => {
    const src = fs.readFileSync(pipelinePath, 'utf-8');
    expect(src).not.toContain('ADAPTER_RESPONSE_TIMEOUT_MS');
  });
});
