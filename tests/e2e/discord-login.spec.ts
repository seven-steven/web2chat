/**
 * E2E tests for Discord login redirect detection (ADD-04, D-70).
 *
 * Validates two layers of login detection:
 * 1. Adapter defense-in-depth: discord.content.ts checks window.location.pathname
 *    startsWith('/login') and returns NOT_LOGGED_IN immediately.
 * 2. Dispatch-pipeline layer: if actual tab URL matches adapter host but not
 *    adapter.match(), pipeline returns NOT_LOGGED_IN (tested via unit tests in
 *    login-detection.spec.ts; this E2E validates the adapter's own guard).
 *
 * Since we cannot navigate to real discord.com in E2E, we test the adapter's
 * defense-in-depth login guard by injecting it into the login stub page.
 */
import { test, expect } from './fixtures';

test.describe('discord login detection', () => {
  test('adapter injected on /login path returns NOT_LOGGED_IN', async ({ context }) => {
    test.setTimeout(30_000);

    // Navigate to the Discord login stub page (served at /login via rewrite)
    // The adapter's defense-in-depth checks window.location.pathname.startsWith('/login')
    const loginPage = await context.newPage();
    await loginPage.goto('http://localhost:4321/login', {
      waitUntil: 'domcontentloaded',
    });

    // Verify page loaded
    await expect(loginPage.locator('h1')).toContainText('Discord Login');

    const sw = context.serviceWorkers()[0]!;
    const tabId = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
      return tabs[0]?.id ?? -1;
    });
    expect(tabId).toBeGreaterThan(0);

    // Inject discord adapter into the login page
    await sw.evaluate(async (tabId) => {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/discord.js'],
        world: 'ISOLATED',
      });
      await new Promise((r) => setTimeout(r, 200));
    }, tabId);

    // Send ADAPTER_DISPATCH -- adapter should detect /login path and return NOT_LOGGED_IN
    const result = await sw.evaluate(async (tabId) => {
      return chrome.tabs.sendMessage(tabId, {
        type: 'ADAPTER_DISPATCH',
        payload: {
          dispatchId: 'e2e-login-001',
          send_to: 'http://localhost:4321/channels/123/456',
          prompt: 'test',
          snapshot: {
            title: 'T',
            url: 'https://x.com',
            description: '',
            create_at: '',
            content: 'c',
          },
        },
      });
    }, tabId);

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_LOGGED_IN');
    expect(result.message).toContain('login');

    await loginPage.close();
  });
});
