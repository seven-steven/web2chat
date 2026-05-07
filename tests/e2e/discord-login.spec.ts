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
 * Plus the post-launch fix (debug session discord-login-detection, 2026-05-07):
 * 3. DOM-based login wall detection — when Discord renders a login form on
 *    the channel URL itself (no URL change), the adapter probes the DOM via
 *    detectLoginWall() and returns NOT_LOGGED_IN before the editor timeout.
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

  test('adapter detects login wall rendered on channel URL (post-launch fix)', async ({
    context,
  }) => {
    test.setTimeout(30_000);

    // Stub fixture: served at /channels/<g>/<c> URL but DOM contains login form
    // (input[name=email][type=email] + authBox class) and NO chat editor.
    // Pre-fix this hit findEditor 5s timeout → INPUT_NOT_FOUND. Post-fix the
    // adapter probes DOM markers and short-circuits to NOT_LOGGED_IN.
    //
    // Note: `serve` strips the .html extension via 301 cleanUrls redirect, so
    // goto and chrome.tabs.query must use the canonical (extensionless) path —
    // otherwise the redirected tab URL won't match the literal `.html` query.
    const wallURL = 'http://localhost:4321/discord/login-wall';
    const wallPage = await context.newPage();
    await wallPage.goto(wallURL, { waitUntil: 'domcontentloaded' });

    await expect(wallPage.locator('input[name="email"][type="email"]')).toBeVisible();
    // Confirm the chat editor is NOT present — this is the failing condition pre-fix
    expect(await wallPage.locator('[role="textbox"][aria-label*="Message"]').count()).toBe(0);

    const sw = context.serviceWorkers()[0]!;
    const tabId = await sw.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ url });
      return tabs[0]?.id ?? -1;
    }, wallURL);
    expect(tabId).toBeGreaterThan(0);

    await sw.evaluate(async (tabId) => {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/discord.js'],
        world: 'ISOLATED',
      });
      await new Promise((r) => setTimeout(r, 200));
    }, tabId);

    // send_to URL must satisfy the adapter's channelId check (so we exercise the
    // DOM probe, not the URL-pathname guard). The fixture URL pathname is
    // /discord/login-wall.html, so window.location pathname check (isLoggedOutPath)
    // returns false → adapter falls through to detectLoginWall().
    const start = Date.now();
    const result = await sw.evaluate(async (tabId) => {
      return chrome.tabs.sendMessage(tabId, {
        type: 'ADAPTER_DISPATCH',
        payload: {
          dispatchId: 'e2e-loginwall-001',
          // send_to channelId structure satisfies extractChannelId — adapter will
          // try to compare against window.location.href channelId. The fixture
          // URL has no /channels/<g>/<c> structure, so channelId from window
          // location is null. Adapter's "Channel mismatch" branch would emit
          // INPUT_NOT_FOUND, but the DOM login probe runs FIRST so we should see
          // NOT_LOGGED_IN.
          send_to: 'http://localhost:4321/channels/777/888',
          prompt: 'hi',
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
    const elapsed = Date.now() - start;

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_LOGGED_IN');
    // Should resolve quickly — the DOM probe runs synchronously at handleDispatch
    // entry and short-circuits before the 5s findEditor wait.
    expect(elapsed).toBeLessThan(3_000);

    await wallPage.close();
  });
});
