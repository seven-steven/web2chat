/**
 * E2E tests for Slack login redirect handling.
 *
 * Covers the real Slack session URL used during the 10.1 gap closure and asserts:
 * 1. After dispatch, a logged-out Slack session ends in a NOT_LOGGED_IN popup state
 *    instead of INPUT_NOT_FOUND / EXECUTE_SCRIPT_FAILED.
 * 2. Reopening the popup from the original article page preserves the source-page
 *    snapshot instead of replacing it with the Slack signin/workspace-signin page.
 *
 * This suite targets real Slack pages, so it is local-only and gated by
 * SLACK_E2E_SESSION_URL to avoid accidental CI/network dependency.
 */
import { test, expect } from './fixtures';
import { openArticleAndPopup } from './helpers';

const SLACK_E2E_SESSION_URL = process.env.SLACK_E2E_SESSION_URL || '';

test.describe('slack login redirect detection', () => {
  test.skip(!SLACK_E2E_SESSION_URL, 'SLACK_E2E_SESSION_URL env var required');

  test('logged-out redirect shows NOT_LOGGED_IN and preserves source snapshot on reopen', async ({
    context,
    extensionId,
  }) => {
    test.setTimeout(45_000);

    const { articlePage, popup, popupUrl } = await openArticleAndPopup(context, extensionId);

    const originalTitle = await popup.locator('[data-testid="capture-field-title"]').inputValue();
    const originalSource = await popup.locator('[data-testid="capture-field-url"]').innerText();

    await popup.locator('[data-testid="combobox-popup-field-sendTo"]').fill(SLACK_E2E_SESSION_URL);
    await popup.locator('[data-testid="combobox-popup-field-prompt"]').fill('slack e2e');
    await popup.waitForTimeout(500);

    const confirm = popup.locator('[data-testid="popup-confirm"]');
    await expect(confirm).toBeEnabled({ timeout: 2_000 });

    const newPagePromise = context.waitForEvent('page', { timeout: 30_000 });
    await confirm.click();
    const slackPage = await newPagePromise;
    await slackPage.waitForLoadState('domcontentloaded').catch(() => {});
    await slackPage.waitForTimeout(16_000);

    const popupOnSlack = await context.newPage();
    await slackPage.bringToFront();
    await popupOnSlack.goto(popupUrl);
    await expect(popupOnSlack.locator('[data-testid="error-banner-NOT_LOGGED_IN"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(popupOnSlack.locator('[data-testid="error-banner-INPUT_NOT_FOUND"]')).toHaveCount(
      0,
    );
    await expect(
      popupOnSlack.locator('[data-testid="error-banner-EXECUTE_SCRIPT_FAILED"]'),
    ).toHaveCount(0);

    const popupBackOnArticle = await context.newPage();
    await articlePage.bringToFront();
    await popupBackOnArticle.goto(popupUrl);
    await expect(popupBackOnArticle.locator('[data-testid="popup-sendform"]')).toBeVisible({
      timeout: 10_000,
    });

    const reopenTitle = await popupBackOnArticle
      .locator('[data-testid="capture-field-title"]')
      .inputValue();
    const reopenSource = await popupBackOnArticle
      .locator('[data-testid="capture-field-url"]')
      .innerText();

    expect(reopenTitle).toBe(originalTitle);
    expect(reopenSource).toBe(originalSource);

    await popupBackOnArticle.close();
    await popupOnSlack.close();
    await slackPage.close();
    await popup.close();
    await articlePage.close();
  });
});
