/**
 * Mixed error model (D-06):
 *   - Business errors → return Err(...) — never throw across process boundaries
 *   - Programmer errors / chrome.* surprises → throw inside handler;
 *     the SW top-level wrapper (entrypoints/background.ts) catches and converts to
 *     Err('INTERNAL', message, retriable=false)
 *
 * ErrorCode is a union starting with 'INTERNAL' only (Phase 1).
 * Each subsequent phase extends the union:
 *   Phase 3 (DSP-07):  | 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED'
 *   Phase 4 (ADO-05):  | 'OPENCLAW_OFFLINE' | 'OPENCLAW_PERMISSION_DENIED'
 */
export type ErrorCode = 'INTERNAL';

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
