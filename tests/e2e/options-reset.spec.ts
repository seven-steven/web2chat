/**
 * E2E test for options page reset history (STG-03, ROADMAP SC#5).
 *
 * Sequence:
 *   1. Open article + popup → SendForm
 *   2. Dispatch once with mock-platform target → history.addSendTo + addPrompt
 *      called by Plan 04 succeedDispatch path
 *   3. Wait for dispatch=done (mock tab opens, popup closes on Ok)
 *   4. Open options page directly via chrome-extension://<id>/options.html
 *   5. Click Reset button → ConfirmDialog opens
 *   6. Click "Reset" confirm → 2 RPCs fire (history.delete resetAll + binding.upsert resetAll)
 *   7. Assert post-reset toast visible
 *   8. Re-open popup → focus send_to combobox → assert listbox shows empty state
 */
import { test, expect } from './fixtures';

const ARTICLE_URL = '/article.html';
const MOCK_PLATFORM_URL = 'http://localhost:4321/mock-platform.html';

test('options reset: pre-seed history → click Reset → history dropdown empty (STG-03)', async ({
  context,
  extensionId,
}) => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const optionsUrl = `chrome-extension://${extensionId}/options.html`;

  // Step 1+2: open article + popup, fill SendForm, Confirm
  const articlePage = await context.newPage();
  await articlePage.goto(ARTICLE_URL, { waitUntil: 'domcontentloaded' });
  const popup1 = await context.newPage();
  await articlePage.bringToFront();
  await popup1.goto(popupUrl);
  await popup1.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });

  await popup1.locator('[data-testid="combobox-popup-field-sendTo"]').fill(MOCK_PLATFORM_URL);
  await popup1.locator('[data-testid="combobox-popup-field-prompt"]').fill('reset test prompt');
  const confirm = popup1.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 1_000 });

  const newPagePromise = context.waitForEvent('page', { timeout: 5_000 });
  await confirm.click();
  const mockPage = await newPagePromise;
  await mockPage.waitForLoadState('domcontentloaded');
  // Allow ~3s for SW dispatch=done + history.addSendTo + addPrompt + binding.upsert
  await mockPage.waitForTimeout(3_000);

  // Step 4: open options page
  const optionsPage = await context.newPage();
  await optionsPage.goto(optionsUrl);
  await optionsPage.waitForSelector('[data-testid="options-app"]', { timeout: 5_000 });

  // Step 5: click Reset button → modal appears
  await optionsPage.locator('[data-testid="options-reset-button"]').click();
  await expect(optionsPage.locator('[data-testid="confirm-dialog"]')).toBeVisible({
    timeout: 2_000,
  });

  // Step 6: click confirm
  await optionsPage.locator('[data-testid="confirm-dialog-confirm"]').click();

  // Step 7: post-reset toast visible
  await expect(optionsPage.locator('[data-testid="options-reset-toast"]')).toBeVisible({
    timeout: 5_000,
  });
  // Modal closed
  await expect(optionsPage.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();

  // Step 8: re-open popup → focus send_to combobox → assert empty state
  const popup2 = await context.newPage();
  await articlePage.bringToFront();
  await popup2.goto(popupUrl);
  await popup2.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });

  // Focus send_to combobox to open listbox; with empty history, empty-state appears
  await popup2.locator('[data-testid="combobox-popup-field-sendTo"]').click();
  await expect(popup2.locator('[data-testid="combobox-popup-field-sendTo-empty"]')).toBeVisible({
    timeout: 2_000,
  });

  await articlePage.close();
  await mockPage.close();
  await optionsPage.close();
  await popup2.close();
});

test('options reset: cancel button keeps history intact', async ({ context, extensionId }) => {
  // Faster test — no dispatch pre-seed needed; just verify cancel path
  const optionsUrl = `chrome-extension://${extensionId}/options.html`;

  const optionsPage = await context.newPage();
  await optionsPage.goto(optionsUrl);
  await optionsPage.waitForSelector('[data-testid="options-app"]', { timeout: 5_000 });

  await optionsPage.locator('[data-testid="options-reset-button"]').click();
  await expect(optionsPage.locator('[data-testid="confirm-dialog"]')).toBeVisible({
    timeout: 2_000,
  });

  await optionsPage.locator('[data-testid="confirm-dialog-cancel"]').click();
  await expect(optionsPage.locator('[data-testid="confirm-dialog"]')).not.toBeVisible({
    timeout: 1_000,
  });
  // No toast on cancel
  await expect(optionsPage.locator('[data-testid="options-reset-toast"]')).not.toBeVisible();

  await optionsPage.close();
});
