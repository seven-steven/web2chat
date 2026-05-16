/**
 * Unit tests for Feishu/Lark login wall DOM detection (FSL-02).
 *
 * Background: Feishu redirects logged-out users to passport.feishu.cn
 * (different subdomain). URL-layer loggedOutPathPatterns catches the host
 * change. DOM-level detection is defense-in-depth for same-host login
 * overlays.
 *
 * These tests assert that detectLoginWall identifies Feishu login markers
 * while avoiding false positives on logged-in messenger pages.
 */
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { detectLoginWall } from '@/shared/adapters/feishu-login-detect';

describe('Feishu login wall detection (FSL-02)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false when editor is present', () => {
    document.body.innerHTML = `
      <div contenteditable="true" role="textbox" aria-label="Message input">
        <p><br></p>
      </div>
    `;
    expect(detectLoginWall()).toBe(false);
  });

  it('returns true when passport form phone input detected', () => {
    document.body.innerHTML = `
      <form>
        <input type="tel" placeholder="Phone number" />
        <button type="submit">Log in</button>
      </form>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when password input detected', () => {
    document.body.innerHTML = `
      <form>
        <input type="password" />
        <button type="submit">Sign in</button>
      </form>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns true when [class*="login"] present without editor', () => {
    document.body.innerHTML = `
      <div class="loginWrapper-abc">Please log in</div>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns false when [class*="login"] present WITH editor (guard)', () => {
    document.body.innerHTML = `
      <div contenteditable="true" role="textbox" aria-label="Message input">
        <p><br></p>
      </div>
      <div class="loginAsAnother-xyz">Switch account</div>
    `;
    expect(detectLoginWall()).toBe(false);
  });

  it('returns false on empty document body', () => {
    expect(detectLoginWall()).toBe(false);
  });

  it('returns true when [class*="signin"] present without editor', () => {
    document.body.innerHTML = `
      <div class="signinContainer-abc">Sign in to continue</div>
    `;
    expect(detectLoginWall()).toBe(true);
  });

  it('returns false when [class*="signin"] present WITH editor (guard)', () => {
    document.body.innerHTML = `
      <div contenteditable="true" role="textbox" aria-label="Message input">
        <p><br></p>
      </div>
      <div class="signinPrompt-old">Old prompt</div>
    `;
    expect(detectLoginWall()).toBe(false);
  });

  it('returns true even if stray contenteditable exists alongside phone input', () => {
    document.body.innerHTML = `
      <div contenteditable="true"></div>
      <input type="tel" placeholder="Phone number" />
    `;
    expect(detectLoginWall()).toBe(true);
  });
});
