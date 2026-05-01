import { describe, it, expect } from 'vitest';
import { Err, type ErrorCode } from '@/shared/messaging';

describe('ErrorCode union — Phase 2 + Phase 3 codes', () => {
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

  it('NOT_LOGGED_IN is a valid ErrorCode (compile-time + runtime)', () => {
    const code: ErrorCode = 'NOT_LOGGED_IN';
    const r = Err(code, 'login wall detected', true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('NOT_LOGGED_IN');
      expect(r.retriable).toBe(true);
    }
  });

  it('INPUT_NOT_FOUND is a valid ErrorCode (compile-time + runtime)', () => {
    const code: ErrorCode = 'INPUT_NOT_FOUND';
    const r = Err(code, 'DOM not ready', true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('INPUT_NOT_FOUND');
      expect(r.retriable).toBe(true);
    }
  });

  it('TIMEOUT is a valid ErrorCode (compile-time + runtime)', () => {
    const code: ErrorCode = 'TIMEOUT';
    const r = Err(code, '30s alarm fired', true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('TIMEOUT');
      expect(r.retriable).toBe(true);
    }
  });

  it('RATE_LIMITED is a valid ErrorCode (compile-time + runtime)', () => {
    const code: ErrorCode = 'RATE_LIMITED';
    const r = Err(code, 'server throttled', true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('RATE_LIMITED');
      expect(r.retriable).toBe(true);
    }
  });

  it('PLATFORM_UNSUPPORTED is a valid ErrorCode (compile-time + runtime)', () => {
    const code: ErrorCode = 'PLATFORM_UNSUPPORTED';
    const r = Err(code, 'no adapter matched', false);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('PLATFORM_UNSUPPORTED');
      expect(r.retriable).toBe(false);
    }
  });
});
