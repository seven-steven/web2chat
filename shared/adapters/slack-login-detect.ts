/**
 * Slack login wall DOM detection (D-138).
 *
 * Lives in `shared/adapters/` so tests (jsdom) and the slack
 * content-script bundle can import the same implementation. No
 * `chrome.*` APIs — pure DOM lookups.
 *
 * CRITICAL for Slack: Slack redirects logged-out users from
 * app.slack.com to slack.com/check-login — the host changes,
 * so URL-layer loggedOutPathPatterns cannot catch it (RESEARCH
 * Pitfall 1). DOM-level detection is the primary defense.
 *
 * Detection markers:
 *   1. input[type="email"][name="email"] — Slack signin email field
 *   2. button[data-qa="sign_in_button"] — Slack signin button
 *   3. [class*="signin"] — signin container class fragment
 *   4. [class*="login"] — login overlay class fragment
 *      GUARDED: only matches when .ql-editor is NOT present.
 *      Logged-in Slack pages may contain elements with "login"
 *      class fragments (e.g., "login-as-another-user"). The
 *      guard prevents false positives while maintaining fail-safe
 *      behavior (if the editor exists, the user is logged in).
 */
export function detectLoginWall(): boolean {
  // Unconditional markers — these only appear on the login page
  if (document.querySelector('input[type="email"][name="email"]')) return true;
  if (document.querySelector('button[data-qa="sign_in_button"]')) return true;
  if (document.querySelector('[class*="signin"]')) return true;

  // Guarded marker — [class*="login"] is broad and may match
  // elements on logged-in pages. Only treat as login wall if
  // the Quill editor (.ql-editor) is NOT present.
  if (!document.querySelector('.ql-editor')) {
    if (document.querySelector('[class*="login"]')) return true;
  }

  return false;
}
