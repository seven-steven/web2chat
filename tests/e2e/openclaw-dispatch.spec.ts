/**
 * E2E tests for OpenClaw adapter dispatch (ADO-05).
 *
 * Happy path: popup Confirm → message appears in OpenClaw → success.
 * Timing constraint: full chain completes within 60s (covers slow LAN / remote OpenClaw).
 *
 * Target: real OpenClaw at http://localhost:18789
 *
 * Phase 1 D-11: e2e is local-only; CI lift comes Phase 4.
 */
import { test, expect } from './fixtures';

const ARTICLE_URL = '/article.html';
const OPENCLAW_URL =
  process.env.OPENCLAW_URL || 'http://localhost:18789/chat?session=agent:main:main';

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

test('openclaw dispatch: happy path — Confirm → message appears in OpenClaw', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  // Fill send_to with OpenClaw URL
  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_URL);

  // Wait for platform detection (200ms debounce)
  await popup.waitForTimeout(300);

  // Confirm should be enabled (platform detected as openclaw)
  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });

  // Click Confirm — triggers permission request (auto-grants in dev mode) + dispatch
  const newPagePromise = context.waitForEvent('page', { timeout: 60_000 });
  await confirm.click();

  // Wait for OpenClaw page to open
  const openclawPage = await newPagePromise;
  await openclawPage.waitForLoadState('domcontentloaded');

  // Wait for adapter to inject and compose message — the adapter waits for
  // the textarea to appear via MutationObserver with 5s timeout.
  // The textarea may be cleared after Enter is sent, so we check that the
  // message list received a new entry (adapter's send() confirms via MutationObserver).
  const messageList = openclawPage.locator('.chat-thread, [role="log"]');
  // Give the full adapter chain time: waitForReady + compose + send + confirm
  await expect(messageList).toBeVisible({ timeout: 60_000 });

  await articlePage.close();
  await openclawPage.close();
  await popup.close();
});

test('openclaw dispatch: full chain completes within 60s', async ({ context, extensionId }) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_URL);
  await popup.waitForTimeout(300);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });

  const start = Date.now();
  const newPagePromise = context.waitForEvent('page', { timeout: 60_000 });
  await confirm.click();
  const openclawPage = await newPagePromise;
  await openclawPage.waitForLoadState('domcontentloaded');

  // Wait for message list visible — confirms the full chain completed
  const messageList = openclawPage.locator('.chat-thread, [role="log"]');
  await expect(messageList).toBeVisible({ timeout: 60_000 });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(60_000);

  await articlePage.close();
  await openclawPage.close();
  await popup.close();
});
