/**
 * Mixed error model (D-06):
 *   - Business errors → return Err(...) — never throw across process boundaries
 *   - Programmer errors / chrome.* surprises → throw inside handler;
 *     the SW top-level wrapper (entrypoints/background.ts) catches and converts to
 *     Err('INTERNAL', message, retriable=false)
 *
 * ErrorCode is a union starting with 'INTERNAL' only (Phase 1).
 * Each subsequent phase extends the union:
 *   Phase 2 (CAP-*):   | 'RESTRICTED_URL' | 'EXTRACTION_EMPTY' | 'EXECUTE_SCRIPT_FAILED'
 *   Phase 3 (DSP-07 + D-25):  | 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'PLATFORM_UNSUPPORTED'
 *   Phase 4 (ADO-05):  | 'OPENCLAW_OFFLINE' | 'OPENCLAW_PERMISSION_DENIED'
 */
// Phase 1: 'INTERNAL'
// Phase 2 (CAP-*): | 'RESTRICTED_URL' | 'EXTRACTION_EMPTY' | 'EXECUTE_SCRIPT_FAILED'
// Phase 3 (DSP-07): | 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'PLATFORM_UNSUPPORTED'
// Phase 4 (ADO-05): | 'OPENCLAW_OFFLINE' | 'OPENCLAW_PERMISSION_DENIED'
export type ErrorCode =
  | 'INTERNAL'
  | 'RESTRICTED_URL' // URL scheme ∉ {http,https}，retriable=false
  | 'EXTRACTION_EMPTY' // Readability 返回空，popup 渲染 empty 三态，retriable=false
  | 'EXECUTE_SCRIPT_FAILED' // chrome.scripting.executeScript 抛错，retriable=true
  | 'NOT_LOGGED_IN' // adapter probe / canDispatch: 登录墙拦截，retriable=true
  | 'INPUT_NOT_FOUND' // adapter compose: DOM 未就绪 / chrome.scripting host 未授权，retriable=true (varies)
  | 'TIMEOUT' // dispatch awaiting_complete 30s alarm 兜底，retriable=true
  | 'RATE_LIMITED' // adapter send 端服务侧 throttle，retriable=true
  | 'PLATFORM_UNSUPPORTED' // adapter-registry.match() 全失，Confirm disabled 时仍发出此码，retriable=false
  | 'OPENCLAW_OFFLINE' // adapter 检测到目标页面不是 OpenClaw UI（textarea 不存在且无特征 DOM），retriable=true
  | 'OPENCLAW_PERMISSION_DENIED'; // chrome.permissions.request 被用户拒绝，retriable=true

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
