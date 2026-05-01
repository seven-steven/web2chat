/**
 * E2E test for OpenClaw offline error path (ADO-05).
 *
 * Target URL is unreachable (localhost:19999 — nothing listening).
 * Adapter injected into Chrome error page → canDispatch finds no OpenClaw
 * feature DOM → returns OPENCLAW_OFFLINE → popup shows error banner.
 *
 * Uses assertion-timeout polling (no fixed sleep).
 */
import { test, expect } from './fixtures';

const ARTICLE_URL = '/article.html';
// Use a port that nothing is listening on — will show browser error page
const OPENCLAW_OFFLINE_URL = 'http://localhost:19999/ui/chat?session=agent:main:main';

async function openArticleAndPopup(
  context: import('@playwright/test').BrowserContext,
  extensionId: string,
) {
  const articlePage = await context.newPage();
  await articlePage.goto(ARTICLE_URL, { waitUntil: 'domcontentloaded' });
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await articlePage.bringToFront();
  await popup.goto(popupUrl);
  await popup.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });
  return { articlePage, popup };
}

test('openclaw offline: unreachable host → OPENCLAW_OFFLINE error in popup', async ({
  context,
  extensionId,
}) => {
  const { popup } = await openArticleAndPopup(context, extensionId);

  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_OFFLINE_URL);
  await popup.waitForTimeout(300);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });
  await confirm.click();

  // The dispatch will:
  // 1. Open tab to unreachable URL → Chrome error page loads
  // 2. Adapter injected into error page → canDispatch finds no OpenClaw feature DOM
  // 3. Returns OPENCLAW_OFFLINE → dispatch-pipeline writes error state to storage.session
  // 4. Popup reads error state on reopen → shows error banner

  // Re-open popup to see the error state (async failure path)
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;

  // Wait for the full async chain: tab open + complete + adapter inject + error propagation
  // Use assertion polling instead of fixed sleep — check every 500ms until visible or timeout
  const popup2 = await context.newPage();
  const pages = context.pages();
  const articlePage = pages.find((p) => p.url().includes('article.html'));
  if (articlePage) await articlePage.bringToFront();
  await popup2.goto(popupUrl);

  // Wait for error banner with assertion timeout (polling-based, no fixed sleep)
  const errorBanner = popup2.locator('[data-testid="error-banner-OPENCLAW_OFFLINE"]');
  await expect(errorBanner).toBeVisible({ timeout: 15_000 });
});
