import { describe, it, expect } from 'vitest';
import { Err, type ErrorCode, type CommonErrorCode, isErrorCode } from '@/shared/messaging';
import { OPENCLAW_ERROR_CODES, type PlatformErrorCode } from '@/shared/adapters/platform-errors';

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

describe('ErrorCode namespace (D-107, D-108, D-110)', () => {
  it('CommonErrorCode includes all 9 common codes', () => {
    const commonCodes: CommonErrorCode[] = [
      'INTERNAL', 'RESTRICTED_URL', 'EXTRACTION_EMPTY', 'EXECUTE_SCRIPT_FAILED',
      'NOT_LOGGED_IN', 'INPUT_NOT_FOUND', 'TIMEOUT', 'RATE_LIMITED', 'PLATFORM_UNSUPPORTED',
    ];
    commonCodes.forEach((code) => {
      const r = Err(code, 'test', false);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe(code);
    });
  });

  it('OPENCLAW_ERROR_CODES exports are valid ErrorCode members', () => {
    expect(OPENCLAW_ERROR_CODES).toContain('OPENCLAW_OFFLINE');
    expect(OPENCLAW_ERROR_CODES).toContain('OPENCLAW_PERMISSION_DENIED');
    OPENCLAW_ERROR_CODES.forEach((code) => {
      const r = Err(code, 'test', false);
      expect(r.ok).toBe(false);
    });
  });

  it('PlatformErrorCode is assignable to ErrorCode (compile-time check)', () => {
    const pCode: PlatformErrorCode = 'OPENCLAW_OFFLINE';
    const eCode: ErrorCode = pCode;
    expect(eCode).toBe('OPENCLAW_OFFLINE');
  });
});

describe('isErrorCode runtime guard', () => {
  it('returns true for all common codes', () => {
    ['INTERNAL', 'RESTRICTED_URL', 'EXTRACTION_EMPTY', 'EXECUTE_SCRIPT_FAILED',
     'NOT_LOGGED_IN', 'INPUT_NOT_FOUND', 'TIMEOUT', 'RATE_LIMITED', 'PLATFORM_UNSUPPORTED'].forEach((code) => {
      expect(isErrorCode(code)).toBe(true);
    });
  });

  it('returns true for platform-specific codes', () => {
    expect(isErrorCode('OPENCLAW_OFFLINE')).toBe(true);
    expect(isErrorCode('OPENCLAW_PERMISSION_DENIED')).toBe(true);
  });

  it('returns false for invalid strings', () => {
    expect(isErrorCode('TOTALLY_FAKE_CODE')).toBe(false);
    expect(isErrorCode('')).toBe(false);
    expect(isErrorCode('timeout')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isErrorCode(123)).toBe(false);
    expect(isErrorCode(null)).toBe(false);
    expect(isErrorCode(undefined)).toBe(false);
  });
});
