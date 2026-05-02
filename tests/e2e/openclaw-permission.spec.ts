/**
 * E2E test for OpenClaw permission grant path (ADO-05, ADO-07).
 *
 * In dev mode with <all_urls> host_permissions, chrome.permissions.request
 * auto-grants without dialog. This test verifies the CODE PATH executes correctly
 * by confirming that dispatch completes successfully (no permission error).
 *
 * DEV MODE LIMITATION: Permission deny path CANNOT be tested via E2E in dev mode.
 * The deny path is verified via unit test (tests/unit/popup/permission-deny.spec.ts).
 */
import { test, expect } from './fixtures';

const ARTICLE_URL = '/article.html';
const OPENCLAW_STUB_URL = 'http://localhost:4321/ui/chat?session=agent:main:main';

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

test('openclaw permission: grant succeeds → dispatch proceeds (dev mode auto-grants)', async ({
  context,
  extensionId,
}) => {
  const { popup } = await openArticleAndPopup(context, extensionId);

  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_STUB_URL);
  await popup.waitForTimeout(300);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });

  // Click Confirm — permission auto-grants in dev mode, dispatch proceeds
  const newPagePromise = context.waitForEvent('page', { timeout: 10_000 });
  await confirm.click();
  const openclawPage = await newPagePromise;

  // Verify dispatch completed (message appeared)
  const messageBubble = openclawPage.locator('[data-testid="message-bubble"]');
  await expect(messageBubble.first()).toBeVisible({ timeout: 5_000 });

  await openclawPage.close();
  // popup closes itself on success (window.close() in SendForm)
});

// DEV MODE LIMITATION: In development builds, host_permissions includes <all_urls>
// which causes chrome.permissions.request to always return true (auto-grant).
// The permission deny path CANNOT be tested via E2E in dev mode.
// See RESEARCH.md Pitfall 3 for details.
//
// The deny path is verified via unit test (tests/unit/popup/permission-deny.spec.ts)
// which mocks chrome.permissions.request → false and asserts ErrorBanner renders
// with OPENCLAW_PERMISSION_DENIED code.
test('openclaw permission: deny path — documented dev-mode limitation', async () => {
  // This test documents the limitation and verifies the grant path works.
  // The actual deny-path verification lives in the unit test.
  // In a production build, chrome.permissions.request would show a dialog
  // that the user can deny, resulting in OPENCLAW_PERMISSION_DENIED.
  test.skip(
    true,
    'Dev mode auto-grants all permissions; deny path verified via unit test tests/unit/popup/permission-deny.spec.ts',
  );
});
