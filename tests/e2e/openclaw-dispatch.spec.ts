/**
 * E2E tests for OpenClaw adapter dispatch (ADO-05).
 *
 * Happy path: popup Confirm → message appears in OpenClaw stub textarea → success.
 * Timing constraint: full chain completes within 5s on local fixture.
 *
 * Fixture: tests/e2e/fixtures/ui/chat/index.html served at
 *   http://localhost:4321/ui/chat?session=agent:main:main
 *
 * Phase 1 D-11: e2e is local-only; CI lift comes Phase 4.
 */
import { test, expect } from './fixtures';

const ARTICLE_URL = '/article.html';
const OPENCLAW_STUB_URL = 'http://localhost:4321/ui/chat?session=agent:main:main';

/**
 * Helper: open article + popup with correct page ordering, wait for popup
 * SendForm state (after capture-success or draft-recovery), then return
 * { articlePage, popup, popupUrl }.
 */
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

  // Wait for SendForm to render (Phase 3 6-state machine: either SendForm or
  // loading skeleton; SendForm appears once capture.run resolves with Ok).
  await popup.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });

  return { articlePage, popup, popupUrl };
}

test('openclaw dispatch: happy path — Confirm → message appears in OpenClaw stub', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  // Fill send_to with OpenClaw stub URL
  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_STUB_URL);

  // Wait for platform detection (200ms debounce)
  await popup.waitForTimeout(300);

  // Confirm should be enabled (platform detected as openclaw)
  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });

  // Click Confirm — triggers permission request (auto-grants in dev mode) + dispatch
  const newPagePromise = context.waitForEvent('page', { timeout: 10_000 });
  await confirm.click();

  // Wait for OpenClaw stub page to open
  const openclawPage = await newPagePromise;
  await openclawPage.waitForLoadState('domcontentloaded');

  // Verify message appeared in the stub's message list
  const messageBubble = openclawPage.locator('[data-testid="message-bubble"]');
  await expect(messageBubble.first()).toBeVisible({ timeout: 5_000 });

  // Verify message content includes article data (captured from article.html)
  const messageText = await messageBubble.first().textContent();
  expect(messageText).toBeTruthy();
  // The message should contain Markdown-formatted snapshot content
  expect(messageText!.length).toBeGreaterThan(10);

  await articlePage.close();
  await openclawPage.close();
  await popup.close();
});

test('openclaw dispatch: full chain completes within 5s', async ({ context, extensionId }) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_STUB_URL);
  await popup.waitForTimeout(300);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });

  const start = Date.now();
  const newPagePromise = context.waitForEvent('page', { timeout: 10_000 });
  await confirm.click();
  const openclawPage = await newPagePromise;

  // Wait for message bubble — this confirms the full chain completed
  const messageBubble = openclawPage.locator('[data-testid="message-bubble"]');
  await expect(messageBubble.first()).toBeVisible({ timeout: 5_000 });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(5_000);

  await articlePage.close();
  await openclawPage.close();
  await popup.close();
});
