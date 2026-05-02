/**
 * E2E test for OpenClaw offline error path (ADO-05).
 *
 * Target URL is a local HTML page that matches OpenClaw's /chat path pattern
 * but contains NO OpenClaw feature DOM — adapter's canDispatch returns
 * OPENCLAW_OFFLINE → popup shows error banner after reopen.
 */
import { test, expect } from './fixtures';

const ARTICLE_URL = '/article.html';
const OPENCLAW_OFFLINE_URL = 'http://localhost:4321/chat?session=agent:main:main';

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
  return { articlePage, popup, popupUrl };
}

test('openclaw offline: non-OpenClaw chat page → OPENCLAW_OFFLINE error in popup', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup, popupUrl } = await openArticleAndPopup(context, extensionId);

  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_OFFLINE_URL);
  await popup.waitForTimeout(300);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });

  // After clicking Confirm: popup calls dispatch.start → SW returns Ok →
  // popup calls window.close(). The popup auto-closes.
  // SW continues asynchronously: tab open → complete → inject adapter →
  // canDispatch fails → OPENCLAW_OFFLINE persisted to storage.session.
  await confirm.click();

  // Wait for the async dispatch chain to complete on the article page.
  // (article page stays open while popup closes itself)
  await articlePage.waitForTimeout(5_000);

  // Reopen popup with correct focus management (Phase 2 D-11 pattern):
  const popup2 = await context.newPage();
  await articlePage.bringToFront();
  await popup2.goto(popupUrl);

  // Error banner should render (dispatchErrorSig loaded from storage.session)
  const errorBanner = popup2.locator('[data-testid="error-banner-OPENCLAW_OFFLINE"]');
  await expect(errorBanner).toBeVisible({ timeout: 15_000 });

  await popup2.close();
});
