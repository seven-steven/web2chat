/**
 * Discord login wall DOM detection (debug session
 * discord-login-detection, fix applied 2026-05-07).
 *
 * Lives in `shared/adapters/` so tests (jsdom) and the discord
 * content-script bundle can import the same implementation. No
 * `chrome.*` APIs — pure DOM lookups, safe for popup/SW bundling
 * even though only the content script invokes it at runtime.
 *
 * Detection strategy: presence of any of three Discord login UI
 * markers. The function is conservative — false positives would
 * surface NOT_LOGGED_IN to a logged-in user, which is worse than
 * the current INPUT_NOT_FOUND fallback. Therefore each marker is
 * specific enough that it would not normally appear inside a chat
 * channel UI:
 *
 *   1. `input[name="email"][type="email"]` — Discord's login email
 *      field. Channel UI has no such input.
 *   2. `[class*="authBox"]` — Discord's auth view wrapper class
 *      (CSS modules suffix-hashed but stable substring).
 *   3. `a[href="/login"]` — explicit login link, present on the
 *      login wall + register pages.
 */
export function detectLoginWall(): boolean {
  return Boolean(
    document.querySelector('input[name="email"][type="email"]') ||
    document.querySelector('[class*="authBox"]') ||
    document.querySelector('a[href="/login"]'),
  );
}
