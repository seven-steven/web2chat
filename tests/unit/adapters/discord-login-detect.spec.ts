/**
 * Unit tests for Discord login wall DOM detection (debug session
 * discord-login-detection, 2026-05-07).
 *
 * Background: when a user is not logged into Discord and the extension
 * dispatches to a channel URL, Discord's React app may render a login
 * UI in place of (or alongside) the chat editor without changing the
 * URL away from /channels/<g>/<c>. The pre-fix adapter only checked
 * pathname.startsWith('/login') and findEditor(), missing this case
 * and surfacing INPUT_NOT_FOUND ("Couldn't find the message box")
 * instead of NOT_LOGGED_IN.
 *
 * These tests assert that the adapter detects a login wall in the DOM
 * and returns NOT_LOGGED_IN before/instead of timing out on findEditor.
 */
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { detectLoginWall } from '@/shared/adapters/discord-login-detect';

describe('Discord login wall detection (post-launch fix)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false when channel UI editor is present', () => {
    document.body.innerHTML = `
      <div role="textbox" aria-label="Message #general" data-slate-editor="true"
           contenteditable="true"></div>
    `;
    expect(detectLoginWall()).toBe(false);
  });

  it('returns true when Discord login email field is present', () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
        <input type="password" name="password" />
        <button type="submit">Log In</button>
      </form>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when authBox class is present (Discord login wrapper)', () => {
    document.body.innerHTML = `
      <div class="authBox-1234"><h1>Welcome back!</h1></div>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when explicit /login link is present (login redirect anchor)', () => {
    document.body.innerHTML = `
      <a href="/login">Log In</a>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns false on an empty document body', () => {
    expect(detectLoginWall()).toBe(false);
  });

  it('returns true even if a stray contenteditable exists alongside login UI', () => {
    // Edge case: Discord's app shell may keep some contenteditable scaffolding
    // but the real editor (with role=textbox) is absent.
    document.body.innerHTML = `
      <div contenteditable="true"></div>
      <input type="email" name="email" />
    `;
    expect(detectLoginWall()).toBe(true);
  });
});
