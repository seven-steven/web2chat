/**
 * Telegram login wall DOM detection (D-152).
 *
 * Lives in `shared/adapters/` so tests (jsdom) and the telegram
 * content-script bundle can import the same implementation. No
 * `chrome.*` APIs — pure DOM lookups.
 *
 * CRITICAL: Telegram Web K uses hash-based routing (`#/auth`).
 * URL-layer `loggedOutPathPatterns` only checks pathname, so
 * DOM-level detection is the primary defense.
 *
 * Detection markers:
 *   1. input[type="tel"], input[name="phone"] — phone number input
 *   2. [class*="auth"] — auth container class fragment
 *   3. [class*="login"] — login overlay class fragment
 *      GUARDED: only matches when .input-message-input is NOT present.
 *      Logged-in Telegram pages may contain elements with "login"
 *      class fragments. The guard prevents false positives while
 *      maintaining fail-safe behavior (if the editor exists, the
 *      user is logged in).
 */
export function detectLoginWall(): boolean {
  // Unconditional markers — these only appear on the login page
  if (document.querySelector('input[name="phone"], input[type="tel"]')) return true;
  // Guarded markers — [class*="auth"] and [class*="login"] are broad and
  // may match elements on logged-in pages. Only treat as login wall if
  // the Telegram editor (.input-message-input) is NOT present.
  if (!document.querySelector('.input-message-input[contenteditable="true"]')) {
    if (document.querySelector('[class*="auth"]')) return true;
    if (document.querySelector('[class*="login"]')) return true;
  }

  return false;
}
