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
import { openArticleAndPopup, OPENCLAW_URL } from './helpers';

test('openclaw dispatch: happy path — Confirm → message appears in OpenClaw', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(OPENCLAW_URL);
  await popup.waitForTimeout(300);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 2_000 });

  const newPagePromise = context.waitForEvent('page', { timeout: 60_000 });
  await confirm.click();

  const openclawPage = await newPagePromise;
  await openclawPage.waitForLoadState('domcontentloaded');

  const messageList = openclawPage.locator('.chat-thread, [role="log"]');
  await expect(messageList).toBeVisible({ timeout: 60_000 });

  await articlePage.close();
  await openclawPage.close();
  await popup.close();
});

test('openclaw dispatch: full chain completes within 10s', async ({ context, extensionId }) => {
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

  const messageList = openclawPage.locator('.chat-thread, [role="log"]');
  await expect(messageList).toBeVisible({ timeout: 60_000 });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(10_000);

  await articlePage.close();
  await openclawPage.close();
  await popup.close();
});
