/**
 * Mixed error model (D-06):
 *   - Business errors → return Err(...) — never throw across process boundaries
 *   - Programmer errors / chrome.* surprises → throw inside handler;
 *     the SW top-level wrapper (entrypoints/background.ts) catches and converts to
 *     Err('INTERNAL', message, retriable=false)
 *
 * Phase 8 (D-107, D-108, D-110): ErrorCode = CommonErrorCode | PlatformErrorCode.
 * Common codes keep their original string values stable (D-108).
 * Platform codes declared in shared/adapters/platform-errors.ts with `as const`.
 */
import { ALL_PLATFORM_ERROR_CODES } from '@/shared/adapters/platform-errors';
import type { PlatformErrorCode } from '@/shared/adapters/platform-errors';

// Common error codes -- string values unchanged (D-108)
export type CommonErrorCode =
  | 'INTERNAL'
  | 'RESTRICTED_URL' // URL scheme ∉ {http,https}，retriable=false
  | 'EXTRACTION_EMPTY' // Readability 返回空，popup 渲染 empty 三态，retriable=false
  | 'EXECUTE_SCRIPT_FAILED' // chrome.scripting.executeScript 抛错，retriable=true
  | 'NOT_LOGGED_IN' // adapter probe / canDispatch: 登录墙拦截，retriable=true
  | 'INPUT_NOT_FOUND' // adapter compose: DOM 未就绪 / chrome.scripting host 未授权，retriable=true (varies)
  | 'TIMEOUT' // dispatch awaiting_complete 30s alarm 兜底，retriable=true
  | 'RATE_LIMITED' // adapter send 端服务侧 throttle，retriable=true
  | 'PLATFORM_UNSUPPORTED'; // adapter-registry.match() 全失，Confirm disabled 时仍发出此码，retriable=false

// Re-export PlatformErrorCode for consumers
export type { PlatformErrorCode } from '@/shared/adapters/platform-errors';

// Aggregated ErrorCode = common + platform (D-107, D-110)
export type ErrorCode = CommonErrorCode | PlatformErrorCode;

/** Runtime array of all common error codes for isErrorCode(). */
const COMMON_ERROR_CODES: readonly string[] = [
  'INTERNAL',
  'RESTRICTED_URL',
  'EXTRACTION_EMPTY',
  'EXECUTE_SCRIPT_FAILED',
  'NOT_LOGGED_IN',
  'INPUT_NOT_FOUND',
  'TIMEOUT',
  'RATE_LIMITED',
  'PLATFORM_UNSUPPORTED',
];

/** Runtime guard: is a value a valid ErrorCode? Checks both common and platform codes. */
export function isErrorCode(value: unknown): value is ErrorCode {
  if (typeof value !== 'string') return false;
  return (
    (COMMON_ERROR_CODES as readonly string[]).includes(value) ||
    ALL_PLATFORM_ERROR_CODES.includes(value)
  );
}

export type Result<T, E extends ErrorCode = ErrorCode> =
  | { ok: true; data: T }
  | { ok: false; code: E; message: string; retriable: boolean };

export const Ok = <T>(data: T): Result<T, never> => ({ ok: true, data });

export function Err<E extends ErrorCode = ErrorCode>(
  code: E,
  message: string,
  retriable = false,
): Result<never, E> {
  return { ok: false, code, message, retriable };
}
