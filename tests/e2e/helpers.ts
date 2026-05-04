import type { BrowserContext, Page } from '@playwright/test';

export const ARTICLE_URL = '/article.html';

export const OPENCLAW_URL =
  process.env.OPENCLAW_URL || 'http://localhost:18789/chat?session=agent:main:main';

export const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';

/**
 * Pre-authenticate with OpenClaw before dispatch tests.
 *
 * OpenClaw does NOT persist the gateway token across page loads — only
 * settings (gatewayUrl, theme, etc.) survive in localStorage. The actual
 * WebSocket auth token lives only in the JS runtime. So each new page load
 * triggers the login-gate again.
 *
 * Strategy:
 * 1. Open a page and authenticate once (saves settings to localStorage).
 * 2. Install an `addInitScript` that auto-fills the token on every subsequent
 *    OpenClaw page load — runs before the extension's content script, so the
 *    chat interface is ready when the adapter checks for features.
 */
export async function preAuthenticateOpenClaw(context: BrowserContext): Promise<boolean> {
  if (!OPENCLAW_TOKEN) return false;

  // Step 1: Authenticate once to save settings to localStorage
  const authPage = await context.newPage();
  const baseUrl = new URL(OPENCLAW_URL).origin;
  const wsUrl = baseUrl.replace(/^http/, 'ws');
  await authPage.goto(baseUrl, { waitUntil: 'networkidle' });

  const tokenInput = authPage.locator('input[placeholder*="TOKEN"]').first();
  const hasInput = await tokenInput.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hasInput) {
    await authPage.locator('input[placeholder*="ws://"]').first().fill(wsUrl);
    await tokenInput.fill(OPENCLAW_TOKEN);
    await authPage.locator('button.login-gate__connect').first().click();
    await authPage.locator('.login-gate').waitFor({ state: 'hidden', timeout: 10_000 });
  }
  await authPage.close();

  // Step 2: Install auto-auth on every future OpenClaw page load
  await context.addInitScript(
    ({ token, wsUrl, origin }) => {
      // Only run on OpenClaw origin
      if (location.origin !== origin) return;

      const autoAuth = () => {
        const gate = document.querySelector('.login-gate');
        if (!gate) return;

        const ti = document.querySelector('input[placeholder*="TOKEN"]') as HTMLInputElement | null;
        const wi = document.querySelector('input[placeholder*="ws://"]') as HTMLInputElement | null;
        const btn = document.querySelector(
          'button.login-gate__connect',
        ) as HTMLButtonElement | null;

        if (ti && wi && btn && ti.value !== token) {
          wi.value = wsUrl;
          wi.dispatchEvent(new Event('input', { bubbles: true }));
          ti.value = token;
          ti.dispatchEvent(new Event('input', { bubbles: true }));
          btn.click();
        }
      };

      const observer = new MutationObserver(autoAuth);
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        autoAuth(); // check immediately in case gate is already present
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          observer.observe(document.body, { childList: true, subtree: true });
          autoAuth();
        });
      }
    },
    { token: OPENCLAW_TOKEN, wsUrl, origin: baseUrl },
  );

  return true;
}

export async function openArticleAndPopup(context: BrowserContext, extensionId: string) {
  const articlePage = await context.newPage();
  await articlePage.goto(ARTICLE_URL, { waitUntil: 'domcontentloaded' });
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await articlePage.bringToFront();
  await popup.goto(popupUrl);
  await popup.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });
  return { articlePage, popup, popupUrl };
}

export type OpenArticleAndPopupResult = {
  articlePage: Page;
  popup: Page;
  popupUrl: string;
};
