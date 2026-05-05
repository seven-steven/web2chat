/**
 * E2E tests for Discord channel-switch safety (D-68, ROADMAP SC#3).
 *
 * Validates that:
 * 1. Dispatch to channel A while tab is on channel B returns INPUT_NOT_FOUND (channel mismatch)
 * 2. No message is leaked into the wrong channel
 * 3. Sequential dispatches to the same channel succeed after rate limit expiry
 *
 * Stub URLs use /channels/0/<channelId> path format so extractChannelId() in the
 * adapter returns distinct IDs for mismatch detection.
 */
import { test, expect } from './fixtures';

// Path-based URLs ensure extractChannelId() returns '11111' and '22222' respectively
const CHANNEL_A_URL = 'http://localhost:4321/channels/0/11111';
const CHANNEL_B_URL = 'http://localhost:4321/channels/0/22222';

test.describe('discord channel-switch safety (D-68, ROADMAP SC#3)', () => {
  test('dispatch to channel A while on channel B returns INPUT_NOT_FOUND (channel mismatch)', async ({
    context,
    extensionId: _extensionId,
  }) => {
    test.setTimeout(30_000);

    // Open Discord stub on channel B
    const discordPage = await context.newPage();
    await discordPage.goto(CHANNEL_B_URL, { waitUntil: 'domcontentloaded' });
    await expect(discordPage.locator('[data-slate-editor="true"]')).toBeVisible();

    const sw = context.serviceWorkers()[0]!;
    const tabId = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
      return tabs[0]?.id ?? -1;
    });

    // Inject adapter
    await sw.evaluate(async (tabId) => {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/discord.js'],
        world: 'ISOLATED',
      });
      await new Promise((r) => setTimeout(r, 200));
    }, tabId);

    // Dispatch targeting channel A (11111), but tab is on channel B (22222)
    // extractChannelId(CHANNEL_A_URL) returns '11111'
    // extractChannelId(window.location.href on channel B) returns '22222'
    // '11111' !== '22222' -> INPUT_NOT_FOUND
    const result = await sw.evaluate(
      async ({ tabId, sendTo }) => {
        return chrome.tabs.sendMessage(tabId, {
          type: 'ADAPTER_DISPATCH',
          payload: {
            dispatchId: 'e2e-switch-001',
            send_to: sendTo,
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
      },
      { tabId, sendTo: CHANNEL_A_URL },
    );

    // Should fail with channel mismatch
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INPUT_NOT_FOUND');
    expect(result.message).toContain('mismatch');

    // Verify NO message was injected into channel B
    const messages = await discordPage.locator('[data-testid="message-bubble"]').count();
    expect(messages).toBe(1); // only the initial existing message

    await discordPage.close();
  });

  test('sequential dispatches to same channel succeed after rate limit expires', async ({
    context,
    extensionId: _extensionId,
  }) => {
    test.setTimeout(15_000);

    const discordPage = await context.newPage();
    await discordPage.goto(CHANNEL_A_URL, { waitUntil: 'domcontentloaded' });
    await expect(discordPage.locator('[data-slate-editor="true"]')).toBeVisible();

    const sw = context.serviceWorkers()[0]!;
    const tabId = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
      return tabs[0]?.id ?? -1;
    });

    await sw.evaluate(async (tabId) => {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/discord.js'],
        world: 'ISOLATED',
      });
      await new Promise((r) => setTimeout(r, 200));
    }, tabId);

    const makePayload = (id: string) => ({
      type: 'ADAPTER_DISPATCH' as const,
      payload: {
        dispatchId: id,
        send_to: CHANNEL_A_URL,
        prompt: `msg-${id}`,
        snapshot: {
          title: 'T',
          url: 'https://x.com',
          description: '',
          create_at: '',
          content: 'c',
        },
      },
    });

    // First dispatch succeeds
    const r1 = await sw.evaluate(
      async ({ tabId, msg }) => {
        return chrome.tabs.sendMessage(tabId, msg);
      },
      { tabId, msg: makePayload('seq-001') },
    );
    expect(r1.ok).toBe(true);

    // Wait for rate limit to expire (5s + buffer)
    await discordPage.waitForTimeout(5_500);

    // Second dispatch to same channel after rate limit -> succeeds
    const r2 = await sw.evaluate(
      async ({ tabId, msg }) => {
        return chrome.tabs.sendMessage(tabId, msg);
      },
      { tabId, msg: makePayload('seq-002') },
    );
    expect(r2.ok).toBe(true);

    // Two new messages in the list (plus the initial one)
    const messages = await discordPage.locator('[data-testid="message-bubble"]').count();
    expect(messages).toBe(3); // 1 initial + 2 dispatched

    await discordPage.close();
  });
});
