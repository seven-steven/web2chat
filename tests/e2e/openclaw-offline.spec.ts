/**
 * E2E test for OpenClaw offline error path (ADO-05).
 *
 * Target URL is a local HTML page at /chat path (matches adapter pattern)
 * but has NO OpenClaw feature DOM → adapter's canDispatch returns
 * OPENCLAW_OFFLINE → popup shows error banner after reopen.
 */
import { test, expect } from './fixtures';
import { openArticleAndPopup } from './helpers';

// Local fixture at /chat path but NOT an OpenClaw instance — triggers canDispatch fail
const OPENCLAW_OFFLINE_URL = 'http://localhost:4321/chat?session=agent:main:main';

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
  await confirm.click();

  // Dispatch tab opens → adapter injected → canDispatch fails → OPENCLAW_OFFLINE.
  // Wait for the error state to be persisted before reopening popup.
  // Popup may already be closed (window.close after dispatch.start Ok), that's fine.
  await popup.waitForTimeout(3_000).catch(() => {});

  // Reopen popup with correct focus management (Phase 2 D-11 pattern):
  const popup2 = await context.newPage();
  await articlePage.bringToFront();
  await popup2.goto(popupUrl);

  // Wait for popup to render (snapshot loads from article, SendForm or loading appears)
  await popup2.waitForSelector('[data-testid="popup-sendform"], [data-testid="popup-loading"]', {
    timeout: 10_000,
  });

  // Error banner should render (dispatchErrorSig set from storage.session)
  const errorBanner = popup2.locator('[data-testid="error-banner-OPENCLAW_OFFLINE"]');
  await expect(errorBanner).toBeVisible({ timeout: 15_000 });

  await popup2.close();
});
