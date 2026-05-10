/**
 * Verify dispatch-pipeline keeps cross-event timeout discipline while allowing
 * the D-113 scoped adapter-response timeout helper.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const pipelinePath = path.resolve(__dirname, '../../../background/dispatch-pipeline.ts');
const policyPath = path.resolve(__dirname, '../../../shared/adapters/dispatch-policy.ts');

function stripComments(src: string): string {
  return src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('dispatch-pipeline SW discipline (CR-02 timeout scope)', () => {
  it('uses chrome.alarms for dispatch total timeout', () => {
    const src = fs.readFileSync(pipelinePath, 'utf-8');
    expect(src).toContain('chrome.alarms.create');
    expect(src).toMatch(/dispatchTimeoutMs\s*\/\s*60_?000/);
  });

  it('does not define executable setTimeout calls in the service-worker pipeline', () => {
    const codeOnly = stripComments(fs.readFileSync(pipelinePath, 'utf-8'));
    expect(codeOnly.match(/\bsetTimeout\s*\(/g) ?? []).toHaveLength(0);
  });

  it('keeps the only executable setTimeout inside withAdapterResponseTimeout', () => {
    const codeOnly = stripComments(fs.readFileSync(policyPath, 'utf-8'));
    expect(codeOnly).toContain('function withAdapterResponseTimeout');
    expect(codeOnly.match(/\bsetTimeout\s*\(/g) ?? []).toHaveLength(1);
  });

  it('does not export ADAPTER_RESPONSE_TIMEOUT_MS', () => {
    const src = fs.readFileSync(pipelinePath, 'utf-8');
    expect(src).not.toContain('ADAPTER_RESPONSE_TIMEOUT_MS');
  });
});
