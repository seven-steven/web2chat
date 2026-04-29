import { test, expect } from './fixtures';

/**
 * Phase 1 e2e — proves the popup ↔ SW ↔ chrome.storage.local round-trip
 * AND the top-level-listener / SW-restart-resilience contract (FND-02 +
 * ROADMAP Phase 1 success criterion #4).
 *
 * Robustness notes:
 *   - We assert numeric helloCount via a data-testid + regex match on the
 *     rendered text, so this passes regardless of browser UI language:
 *       en   → "Hello, world (×1)"
 *       zh_CN → "你好，世界 ×1"
 *     Both contain the "×N" suffix that HELLO_COUNT_RE captures.
 */

const HELLO_COUNT_RE = /[×x](\d+)/i;

function parseHelloCount(text: string): number {
  const match = text.match(HELLO_COUNT_RE);
  expect(match, `expected hello count in "${text}"`).not.toBeNull();
  return Number(match![1]);
}

test('popup RPC: first mount renders helloCount=1', async ({ context, extensionId }) => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const page = await context.newPage();
  await page.goto(popupUrl);
  const text = await page.locator('[data-testid="popup-hello"]').innerText();
  expect(parseHelloCount(text)).toBe(1);
  await page.close();
});

test('popup RPC: subsequent re-mounts increment helloCount monotonically', async ({
  context,
  extensionId,
}) => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const counts: number[] = [];
  for (let i = 0; i < 3; i++) {
    const page = await context.newPage();
    await page.goto(popupUrl);
    const text = await page.locator('[data-testid="popup-hello"]').innerText();
    counts.push(parseHelloCount(text));
    await page.close();
  }
  // Strictly monotonically increasing by 1: [N, N+1, N+2]
  expect(counts).toEqual([counts[0], counts[0]! + 1, counts[0]! + 2]);
});

test('popup RPC survives SW restart (FND-02 + ROADMAP success criterion #4)', async ({
  context,
  extensionId,
  reloadExtension,
}) => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;

  // Capture baseline helloCount.
  const page1 = await context.newPage();
  await page1.goto(popupUrl);
  const beforeText = await page1.locator('[data-testid="popup-hello"]').innerText();
  const before = parseHelloCount(beforeText);
  await page1.close();

  // Simulate SW kill + restart (equivalent to chrome://extensions → Stop).
  await reloadExtension();

  // After SW restart, opening popup again must STILL successfully RPC and
  // increment the persisted helloCount — proves top-level listener registration
  // (FND-02) + chrome.storage.local persistence across SW lifecycle.
  const page2 = await context.newPage();
  await page2.goto(popupUrl);
  const afterText = await page2.locator('[data-testid="popup-hello"]').innerText();
  const after = parseHelloCount(afterText);
  expect(after).toBeGreaterThan(before);
  await page2.close();
});
