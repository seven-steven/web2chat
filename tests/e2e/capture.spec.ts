/**
 * E2E tests for Phase 2 capture pipeline (CAP-01, CAP-05).
 *
 * Test strategy (RESEARCH.md Open Questions resolution):
 *
 * Q1 (E2E fixture URL): playwright.config.ts webServer serves tests/e2e/fixtures/
 *    at the localhost:4321 origin via baseURL. Article tests use relative paths
 *    ('/article.html') — port is defined only in playwright.config.ts, not here.
 *
 * Q2 + ROADMAP #5 (empty state by Playwright): Test 3 opens popup directly.
 *    When popup is the active tab (chrome-extension:// URL), SW's tabs.query
 *    returns the popup page itself, which fails the URL scheme precheck (D-16),
 *    triggering RESTRICTED_URL → popup renders [data-testid="capture-empty"].
 *    This satisfies ROADMAP Phase 2 success criterion #5 for the empty path.
 *
 * Page ordering for article tests (deterministic bringToFront):
 *   1. Open article tab (newPage + goto)
 *   2. Pre-create popup tab (newPage — blank, NOT yet navigated)
 *   3. articlePage.bringToFront() — ensures article is lastFocusedWindow active tab
 *   4. popup.goto(popupUrl) — page.goto on existing tab does NOT steal focus;
 *      SW's tabs.query at capture time sees the article tab as active.
 *
 * Why pre-create popup before bringToFront:
 *   context.newPage() automatically brings the new page to front.
 *   If we called newPage(popup) AFTER bringToFront(article), the new popup page
 *   would steal focus again. Pre-creating popup first, then bringToFront(article),
 *   then popup.goto() keeps article as the focused tab when capture fires.
 */

import { test, expect } from './fixtures';

test('capture: fixture article page fills 5 fields within 2s (CAP-01, CAP-05)', async ({
  context,
  extensionId,
}) => {
  // Step 1: Open the fixture article page (relative path — baseURL prepended)
  const articlePage = await context.newPage();
  await articlePage.goto('/article.html', {
    waitUntil: 'domcontentloaded',
  });

  // Step 2: Pre-create popup page (blank — not yet navigated to popup.html)
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();

  // Step 3: Bring article to front AFTER creating popup page so popup's newPage()
  // focus steal doesn't override the ordering.
  await articlePage.bringToFront();

  // Step 4: Navigate pre-created popup page — page.goto does NOT steal focus,
  // so articlePage stays as lastFocusedWindow active tab for SW's tabs.query.
  await popup.goto(popupUrl);

  // Step 5: Wait for loading skeleton to clear and success view to appear.
  // Timeout 2000ms per ROADMAP Phase 2 success criterion #1.
  await popup.waitForSelector('[data-testid="capture-success"]', { timeout: 2_000 });

  // Step 6: Assert all 5 fields are present and non-empty.
  const titleEl = popup.locator('[data-testid="capture-field-title"]');
  const descriptionEl = popup.locator('[data-testid="capture-field-description"]');
  const contentEl = popup.locator('[data-testid="capture-field-content"]');
  const urlEl = popup.locator('[data-testid="capture-field-url"]');
  const createAtEl = popup.locator('[data-testid="capture-field-createAt"]');

  await expect(titleEl).not.toHaveValue('');
  await expect(descriptionEl).not.toHaveValue('');
  await expect(contentEl).not.toHaveValue('');
  await expect(urlEl).not.toBeEmpty();
  await expect(createAtEl).not.toBeEmpty();

  // Step 7: Assert title textarea contains the article title
  const titleValue = await titleEl.inputValue();
  expect(titleValue.length).toBeGreaterThan(0);

  // Step 8: Assert URL output shows the fixture URL (contains localhost host)
  const urlText = await urlEl.textContent();
  expect(urlText).toContain('localhost');

  await articlePage.close();
  await popup.close();
});

test('capture: textarea fields are editable after capture (CAP-05, D-21)', async ({
  context,
  extensionId,
}) => {
  // Open article page, pre-create popup, bringToFront article, then popup.goto
  const articlePage = await context.newPage();
  await articlePage.goto('/article.html', {
    waitUntil: 'domcontentloaded',
  });
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await articlePage.bringToFront();
  await popup.goto(popupUrl);

  // Wait for success state
  await popup.waitForSelector('[data-testid="capture-success"]', { timeout: 2_000 });

  // Edit title textarea — D-21: always-on textarea
  const titleEl = popup.locator('[data-testid="capture-field-title"]');
  await titleEl.click();
  await titleEl.fill('Edited Title');
  await expect(titleEl).toHaveValue('Edited Title');

  // Edit description textarea
  const descriptionEl = popup.locator('[data-testid="capture-field-description"]');
  await descriptionEl.fill('Edited description for testing');
  await expect(descriptionEl).toHaveValue('Edited description for testing');

  await articlePage.close();
  await popup.close();
});

test('capture: chrome-extension:// active tab → empty state visible (ROADMAP #5, D-16)', async ({
  context,
  extensionId,
}) => {
  // Open popup directly — popup itself (chrome-extension:// URL) becomes the
  // active tab in lastFocusedWindow. SW's URL scheme precheck rejects it
  // (scheme !== 'http' && scheme !== 'https') → Err('RESTRICTED_URL') →
  // popup renders [data-testid="capture-empty"].
  //
  // This test proves the empty state by Playwright, satisfying ROADMAP Phase 2
  // success criterion #5. No article page is opened — popup is the only page.
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await popup.goto(popupUrl);

  // Wait up to 2s for empty state — SW pipeline should fail fast on URL precheck
  await expect(popup.locator('[data-testid="capture-empty"]')).toBeVisible({ timeout: 2_000 });

  await popup.close();
});
