/**
 * Unit tests for Telegram login wall DOM detection (TG-02).
 *
 * Background: Telegram Web K uses hash-based routing (`#/auth`),
 * so pathname-based `loggedOutPathPatterns` cannot detect the login
 * state (RESEARCH Pitfall 1). DOM-level detection is the primary
 * defense.
 *
 * These tests assert that detectLoginWall identifies Telegram login
 * markers while avoiding false positives on logged-in chat pages.
 */
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { detectLoginWall } from '@/shared/adapters/telegram-login-detect';

describe('Telegram login wall detection (TG-02)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false when chat editor is present', () => {
    document.body.innerHTML = `
      <div class="input-message-input" contenteditable="true" role="textbox" aria-label="Message">
        <br>
      </div>
    `;
    expect(detectLoginWall()).toBe(false);
  });

  it('returns true when phone input is present', () => {
    document.body.innerHTML = `
      <form>
        <input type="tel" name="phone" />
        <button type="submit">Next</button>
      </form>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when auth class fragment is present', () => {
    document.body.innerHTML = `
      <div class="auth-page-abc">Sign in to Telegram</div>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when login class fragment present and no editor', () => {
    document.body.innerHTML = `
      <div class="login-overlay-xyz">Redirecting...</div>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns false when login class present but editor exists (guard)', () => {
    // Logged-in page may have elements with "login" class fragments.
    // The guard ensures we only match [class*="login"] when the editor is absent.
    document.body.innerHTML = `
      <div class="input-message-input" contenteditable="true" role="textbox" aria-label="Message">
        <br>
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
      <input type="tel" name="phone" />
    `;
    expect(detectLoginWall()).toBe(true);
  });
});
