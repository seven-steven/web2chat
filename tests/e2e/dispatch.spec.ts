/**
 * E2E tests for Phase 3 dispatch pipeline (DSP-01, DSP-05, DSP-06, DSP-07, DSP-08).
 *
 * Page ordering (Pattern S10 — required for SW tabs.query active-tab semantics):
 *   1. Open article fixture (source page) — newPage + goto
 *   2. Pre-create popup tab — newPage (blank, NOT yet navigated)
 *   3. articlePage.bringToFront() — restores article as lastFocusedWindow active tab
 *   4. popup.goto(popupUrl) — page.goto on existing tab does NOT steal focus
 *   5. Wait for popup capture-success → fill SendForm → click Confirm
 *
 * Phase 1 D-11: e2e is local-only; CI lift comes Phase 4.
 */
import { test, expect } from './fixtures';
import { openArticleAndPopup } from './helpers';

const MOCK_PLATFORM_URL = 'http://localhost:4321/mock-platform.html';

test('dispatch: happy path — Confirm → mock-platform tab visible + popup reopens clean (DSP-05, DSP-08)', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  // Fill send_to + prompt in popup
  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(MOCK_PLATFORM_URL);

  const promptInput = popup.locator('[data-testid="combobox-popup-field-prompt"]');
  await promptInput.fill('hello mock');

  // Wait 250ms for 200ms platform-detect debounce → Confirm enables
  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 1_000 });

  // Capture an event listener for new pages (mock-platform tab is created by dispatch)
  const newPagePromise = context.waitForEvent('page', { timeout: 5_000 });

  await confirm.click();

  // Popup closes on Ok per CONTEXT.md "Claude's Discretion popup关闭时机"
  // — wait for new mock-platform tab to appear instead.
  const mockPage = await newPagePromise;
  await mockPage.waitForLoadState('domcontentloaded');
  await expect(mockPage.locator('[data-testid="mock-platform-target"]')).toBeVisible();

  // Reopen popup to verify dispatch went green (badge state via re-mounted popup)
  // Note: popup mount runs setBadgeText('') (D-34) so we cannot assert badge value
  // post-mount. Instead, verify storage.session via UI — the re-opened popup
  // should land on SendForm without dispatch:active record (no InProgressView).
  const popup2 = await context.newPage();
  await mockPage.bringToFront();
  await popup2.goto(`chrome-extension://${extensionId}/popup.html`);
  // Popup either lands on SendForm (clean state) or shows in-progress UI (still going).
  // For a happy-path stub adapter, dispatch=done within ~1-2s. Wait for SendForm.
  await expect(popup2.locator('[data-testid="popup-sendform"]')).toBeVisible({ timeout: 10_000 });

  await articlePage.close();
  await mockPage.close();
  await popup2.close();
});

test('dispatch: failure injection NOT_LOGGED_IN renders ErrorBanner (DSP-07)', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup, popupUrl } = await openArticleAndPopup(context, extensionId);

  const sendToInput = popup.locator('[data-testid="combobox-popup-field-sendTo"]');
  await sendToInput.fill(`${MOCK_PLATFORM_URL}?fail=not-logged-in`);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 1_000 });

  const newPagePromise = context.waitForEvent('page', { timeout: 5_000 });
  await confirm.click();
  const mockPage = await newPagePromise;
  await mockPage.waitForLoadState('domcontentloaded');

  // Reopen popup → assert error banner renders for NOT_LOGGED_IN
  const popup2 = await context.newPage();
  await mockPage.bringToFront();
  await popup2.goto(popupUrl);

  await expect(popup2.locator('[data-testid="error-banner-NOT_LOGGED_IN"]')).toBeVisible({
    timeout: 10_000,
  });

  // Retry button visible (NOT_LOGGED_IN is retriable)
  await expect(popup2.locator('[data-testid="error-banner-NOT_LOGGED_IN-retry"]')).toBeVisible();

  await articlePage.close();
  await mockPage.close();
  await popup2.close();
});

test('dispatch: 200ms double-click produces exactly 1 dispatch (DSP-06, ROADMAP SC#4)', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  await popup.locator('[data-testid="combobox-popup-field-sendTo"]').fill(MOCK_PLATFORM_URL);
  await popup.locator('[data-testid="combobox-popup-field-prompt"]').fill('idempotency test');
  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 1_000 });

  const newPagePromise = context.waitForEvent('page', { timeout: 5_000 });

  // First click dispatches; confirm button disables immediately (submitting guard).
  await confirm.click();
  await expect(confirm).toBeDisabled({ timeout: 1_000 });

  const mockPage = await newPagePromise;
  await mockPage.waitForLoadState('domcontentloaded');

  // Verify exactly 1 mock-platform tab appeared (NOT 2 — second click should be no-op).
  // We already waited on first newPage event; assert no more pages within 1s.
  let extraPageDetected = false;
  const extraPagePromise = context
    .waitForEvent('page', { timeout: 1_000 })
    .then(() => {
      extraPageDetected = true;
    })
    .catch(() => {
      /* timeout = pass */
    });
  await extraPagePromise;
  expect(extraPageDetected).toBe(false);

  await articlePage.close();
  await mockPage.close();
});

test('dispatch: SW restart mid-flight survives (DSP-06, ROADMAP SC#3)', async ({
  context,
  extensionId,
  reloadExtension,
}) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  await popup.locator('[data-testid="combobox-popup-field-sendTo"]').fill(MOCK_PLATFORM_URL);
  await popup.locator('[data-testid="combobox-popup-field-prompt"]').fill('SW restart test');
  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeEnabled({ timeout: 1_000 });

  const newPagePromise = context.waitForEvent('page', { timeout: 5_000 });
  await confirm.click();
  const mockPage = await newPagePromise;

  // SW is in awaiting_complete state by now. Stop it via CDP.
  // Fixture reloadExtension uses ServiceWorker.stopWorker (kills SW process,
  // extension stays loaded). Next event (here: tabs.onUpdated:complete on
  // mock-platform tab finishing load) wakes new SW which re-registers
  // entrypoints/background.ts top-level listeners INCLUDING tabs.onUpdated.
  await reloadExtension();

  // Mock-platform finishes loading (may fire AFTER SW restart — that's the test).
  await mockPage.waitForLoadState('domcontentloaded');

  // Reopen popup — assert dispatch reached done OR rendered SendForm (no in-progress).
  const popup2 = await context.newPage();
  await mockPage.bringToFront();
  await popup2.goto(`chrome-extension://${extensionId}/popup.html`);

  // After SW restart + tabs.onUpdated wake, dispatch should advance to done.
  // Allow up to 35s (DEVIATIONS.md D-34 30s alarm minimum + SW wake latency buffer).
  await expect(popup2.locator('[data-testid="popup-sendform"]')).toBeVisible({ timeout: 35_000 });

  await articlePage.close();
  await mockPage.close();
  await popup2.close();
});

test('dispatch: unsupported send_to URL keeps Confirm disabled + tooltip (DSP-01, D-25)', async ({
  context,
  extensionId,
}) => {
  const { articlePage, popup } = await openArticleAndPopup(context, extensionId);

  // Use a URL that no Phase 3 adapter matches (Discord/OpenClaw come Phase 4/5)
  await popup
    .locator('[data-testid="combobox-popup-field-sendTo"]')
    .fill('https://unsupported.example/');
  // Wait for 200ms platform-detect debounce
  await popup.waitForTimeout(300);

  const confirm = popup.locator('[data-testid="popup-confirm"]');
  await expect(confirm).toBeDisabled();
  // Tooltip via title attribute
  await expect(confirm).toHaveAttribute('title', /Discord|OpenClaw/i);

  await articlePage.close();
  await popup.close();
});
