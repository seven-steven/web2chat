/**
 * E2E test for OpenClaw permission grant path (ADO-05, ADO-07).
 *
 * In dev mode with <all_urls> host_permissions, chrome.permissions.request
 * auto-grants without dialog. This test verifies the CODE PATH executes correctly
 * by confirming that dispatch completes successfully (no permission error).
 *
 * Target: real OpenClaw at http://localhost:18789
 *
 * DEV MODE LIMITATION: Permission deny path CANNOT be tested via E2E in dev mode.
 * The deny path is verified via unit test (tests/unit/popup/permission-deny.spec.ts).
 */
import { test, expect } from './fixtures';
import { openArticleAndPopup, OPENCLAW_URL } from './helpers';

test('openclaw permission: grant succeeds → dispatch proceeds (dev mode auto-grants)', async ({
  context,
  extensionId,
}) => {
  const { popup } = await openArticleAndPopup(context, extensionId);

  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_URL);
  await popup.waitForTimeout(300);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });

  // Click Confirm — permission auto-grants in dev mode, dispatch proceeds
  const newPagePromise = context.waitForEvent('page', { timeout: 60_000 });
  await confirm.click();
  const openclawPage = await newPagePromise;
  await openclawPage.waitForLoadState('domcontentloaded');

  // Verify dispatch completed (message list visible = adapter injected + sent)
  const messageList = openclawPage.locator('.chat-thread, [role="log"]');
  await expect(messageList).toBeVisible({ timeout: 60_000 });

  await openclawPage.close();
});

// DEV MODE LIMITATION: deny path verified via unit test only.
test('openclaw permission: deny path — documented dev-mode limitation', async () => {
  test.skip(
    true,
    'Dev mode auto-grants all permissions; deny path verified via unit test tests/unit/popup/permission-deny.spec.ts',
  );
});
