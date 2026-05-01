/**
 * E2E test for popupDraft recovery (DSP-09, ROADMAP SC#5).
 *
 * Sequence:
 *   1. Open article + popup → SendForm renders
 *   2. Fill send_to + prompt + edit title (>= 3 fields touched)
 *   3. Wait 1500ms (debounce 800ms + buffer for IO)
 *   4. Close popup (page.close())
 *   5. Re-open popup (newPage + goto)
 *   6. Assert send_to + prompt + edited title restored to typed values
 *
 * Capture data flows through Plan 06 mount sequence:
 *   - Step 1 reads dispatch:active (none)
 *   - Step 2 parallel: capture.run + popupDraft.get
 *   - Step 3 clears badge
 *   - Step 4 renders SendForm with restored fields
 */
import { test, expect } from './fixtures';

const ARTICLE_URL = '/article.html';
const TYPED_SEND_TO = 'http://localhost:4321/mock-platform.html';
const TYPED_PROMPT = 'draft recovery prompt';
const TYPED_TITLE = 'Draft Recovery Edited Title';

test('draft recovery: send_to + prompt + edited title persist across popup close (DSP-09)', async ({
  context,
  extensionId,
}) => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;

  // Step 1: open article + popup with Pattern S10 ordering
  const articlePage = await context.newPage();
  await articlePage.goto(ARTICLE_URL, { waitUntil: 'domcontentloaded' });
  const popup1 = await context.newPage();
  await articlePage.bringToFront();
  await popup1.goto(popupUrl);
  await popup1.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });

  // Step 2: fill 3 fields
  await popup1.locator('[data-testid="combobox-popup-field-sendTo"]').fill(TYPED_SEND_TO);
  await popup1.locator('[data-testid="combobox-popup-field-prompt"]').fill(TYPED_PROMPT);
  await popup1.locator('[data-testid="capture-field-title"]').fill(TYPED_TITLE);

  // Step 3: wait for 800ms popupDraft debounce + buffer for storage.local IO
  await popup1.waitForTimeout(1_500);

  // Step 4: close popup (popup process dies; module-level signals lost)
  await popup1.close();

  // Step 5: re-open popup
  const popup2 = await context.newPage();
  // Article still active (not closed). Pattern S10 again — popup as 2nd page.
  await articlePage.bringToFront();
  await popup2.goto(popupUrl);

  // SendForm should render restored — wait for it
  await popup2.waitForSelector('[data-testid="popup-sendform"]', { timeout: 5_000 });

  // Step 6: assert restored values
  const sendToInput2 = popup2.locator('[data-testid="combobox-popup-field-sendTo"]');
  await expect(sendToInput2).toHaveValue(TYPED_SEND_TO);

  const promptInput2 = popup2.locator('[data-testid="combobox-popup-field-prompt"]');
  await expect(promptInput2).toHaveValue(TYPED_PROMPT);

  const titleInput2 = popup2.locator('[data-testid="capture-field-title"]');
  await expect(titleInput2).toHaveValue(TYPED_TITLE);

  await articlePage.close();
  await popup2.close();
});
