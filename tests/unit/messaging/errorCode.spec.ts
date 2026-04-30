import { describe, it, expect } from 'vitest';
import { Err, type ErrorCode } from '@/shared/messaging';

describe('ErrorCode union — Phase 2 codes', () => {
  it('RESTRICTED_URL is a valid ErrorCode (compile-time + runtime)', () => {
    const code: ErrorCode = 'RESTRICTED_URL';
    const r = Err(code, 'chrome:// URL not supported', false);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('RESTRICTED_URL');
      expect(r.retriable).toBe(false);
    }
  });

  it('EXTRACTION_EMPTY is a valid ErrorCode (compile-time + runtime)', () => {
    const code: ErrorCode = 'EXTRACTION_EMPTY';
    const r = Err(code, 'Readability returned empty', false);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('EXTRACTION_EMPTY');
      expect(r.retriable).toBe(false);
    }
  });

  it('EXECUTE_SCRIPT_FAILED is a valid ErrorCode (compile-time + runtime)', () => {
    const code: ErrorCode = 'EXECUTE_SCRIPT_FAILED';
    const r = Err(code, 'executeScript threw', true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('EXECUTE_SCRIPT_FAILED');
      expect(r.retriable).toBe(true);
    }
  });
});
