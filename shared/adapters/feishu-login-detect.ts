/**
 * Feishu/Lark login wall DOM detection (FSL-02).
 *
 * Lives in `shared/adapters/` so tests (jsdom) and the feishu
 * content-script bundle can import the same implementation. No
 * `chrome.*` APIs -- pure DOM lookups.
 *
 * Feishu login redirects to passport.feishu.cn (different subdomain).
 * URL-layer loggedOutPathPatterns catches host changes; DOM-layer is
 * defense-in-depth for same-host login overlays.
 *
 * Detection markers:
 *   1. input[type="tel"], input[type="password"] -- phone/password inputs
 *   2. [class*="signin"] -- signin container class fragment
 *   3. [class*="login"] -- login overlay class fragment
 *      GUARDED: only matches when contenteditable editor is NOT present.
 *      Logged-in Feishu pages may contain elements with "login"
 *      class fragments. The guard prevents false positives while
 *      maintaining fail-safe behavior (if the editor exists, the
 *      user is logged in).
 */
export function detectLoginWall(): boolean {
  // Unconditional markers -- these only appear on login pages
  if (document.querySelector('input[type="tel"], input[type="password"]')) return true;

  // Guarded markers -- [class*="signin"] and [class*="login"] are broad and
  // may match elements on logged-in pages. Only treat as login wall if
  // a contenteditable editor is NOT present.
  if (!document.querySelector('[contenteditable="true"][role="textbox"]')) {
    if (document.querySelector('[class*="signin"]')) return true;
    if (document.querySelector('[class*="login"]')) return true;
  }

  return false;
}
