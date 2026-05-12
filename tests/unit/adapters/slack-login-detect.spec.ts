/**
 * Unit tests for Slack login wall DOM detection (SLK-02).
 *
 * Background: Slack redirects logged-out users from app.slack.com to
 * slack.com/check-login — the host changes, so URL-layer
 * loggedOutPathPatterns cannot catch it (RESEARCH Pitfall 1).
 * DOM-level detection is the primary defense.
 *
 * These tests assert that detectLoginWall identifies 4 Slack login
 * markers while avoiding false positives on logged-in channel pages.
 */
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { detectLoginWall } from '@/shared/adapters/slack-login-detect';

describe('Slack login wall detection (SLK-02)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false when channel UI editor is present', () => {
    document.body.innerHTML = `
      <div class="ql-editor" role="textbox" contenteditable="true" aria-label="Message #general">
        <p><br></p>
      </div>
    `;
    expect(detectLoginWall()).toBe(false);
  });

  it('returns true when Slack email input is present', () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
        <button type="submit">Sign In</button>
      </form>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when sign_in_button data-qa is present', () => {
    document.body.innerHTML = `
      <button data-qa="sign_in_button">Sign In</button>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when signin class fragment is present', () => {
    document.body.innerHTML = `
      <div class="signin-abc123">Please sign in</div>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when login class fragment present and no ql-editor', () => {
    document.body.innerHTML = `
      <div class="loginOverlay-xyz">Redirecting...</div>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns false when login class present but ql-editor exists (guard)', () => {
    // Logged-in page may have elements with "login" class fragments
    // (e.g., "login-as-another-user", "nologin-banner"). The guard
    // ensures we only match [class*="login"] when the editor is absent.
    document.body.innerHTML = `
      <div class="ql-editor" role="textbox" contenteditable="true" aria-label="Message #general">
        <p><br></p>
      </div>
      <div class="login-as-another-user">Switch account</div>
    `;
    expect(detectLoginWall()).toBe(false);
  });

  it('returns false on an empty document body', () => {
    expect(detectLoginWall()).toBe(false);
  });

  it('returns true even if stray contenteditable exists alongside login UI', () => {
    document.body.innerHTML = `
      <div contenteditable="true"></div>
      <input type="email" name="email" />
    `;
    expect(detectLoginWall()).toBe(true);
  });
});
