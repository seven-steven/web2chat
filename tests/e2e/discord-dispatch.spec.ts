/**
 * E2E tests for Discord adapter dispatch (ADD-01, ADD-03, ADD-05, ADD-07).
 *
 * Uses DIRECT adapter injection pattern:
 * 1. Navigate to Discord stub page at localhost:4321
 * 2. Inject discord.js content script via chrome.scripting.executeScript
 * 3. Send ADAPTER_DISPATCH message via chrome.tabs.sendMessage
 * 4. Verify adapter's DOM interaction (paste + Enter + message appearance)
 *
 * Stub URLs use /channels/<serverId>/<channelId> path format (without /discord/ prefix)
 * so extractChannelId() in the adapter can parse the channelId from the URL pathname.
 */
import { test, expect } from './fixtures';

const DISCORD_STUB_URL = 'http://localhost:4321/channels/0/12345';

test.describe('discord adapter dispatch (direct injection)', () => {
  test('happy path -- paste injection delivers message to Discord stub', async ({
    context,
    extensionId: _extensionId,
  }) => {
    test.setTimeout(30_000);

    // 1. Open the Discord stub page
    const discordPage = await context.newPage();
    await discordPage.goto(DISCORD_STUB_URL, { waitUntil: 'domcontentloaded' });

    // Verify stub loaded correctly
    await expect(discordPage.locator('[data-slate-editor="true"]')).toBeVisible();
    const initialMessages = await discordPage.locator('[data-testid="message-bubble"]').count();

    // 2. Use SW to inject adapter + send ADAPTER_DISPATCH
    const sw = context.serviceWorkers()[0]!;
    const discordTabId = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
      return tabs[0]?.id ?? -1;
    });
    expect(discordTabId).toBeGreaterThan(0);

    // 3. Inject adapter + send ADAPTER_DISPATCH via SW
    const result = await sw.evaluate(async (tabId) => {
      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/discord.js'],
        world: 'ISOLATED',
      });

      // Small delay for script to register its listener
      await new Promise((r) => setTimeout(r, 200));

      // Send ADAPTER_DISPATCH -- send_to uses same path format as the stub URL
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'ADAPTER_DISPATCH',
        payload: {
          dispatchId: 'e2e-test-001',
          send_to: 'http://localhost:4321/channels/0/12345',
          prompt: 'Summarize this article',
          snapshot: {
            title: 'Test Article',
            url: 'https://example.com/article',
            description: 'A test description',
            create_at: '2026-05-05T00:00:00.000Z',
            content: 'Article content here.',
          },
        },
      });
      return response;
    }, discordTabId);

    // 4. Verify adapter response
    expect(result.ok, JSON.stringify(result)).toBe(true);

    // 5. Verify message appeared in the stub page's message list
    const newMessages = await discordPage.locator('[data-testid="message-bubble"]').count();
    expect(newMessages).toBeGreaterThan(initialMessages);

    // 6. Verify message content includes expected text
    const lastMessage = discordPage.locator('[data-testid="message-bubble"]').last();
    await expect(lastMessage).toContainText('Test Article');

    await discordPage.close();
  });

  test('rate limit -- second dispatch within 5s returns RATE_LIMITED', async ({
    context,
    extensionId: _extensionId,
  }) => {
    test.setTimeout(30_000);

    const discordPage = await context.newPage();
    await discordPage.goto(DISCORD_STUB_URL, { waitUntil: 'domcontentloaded' });
    await expect(discordPage.locator('[data-slate-editor="true"]')).toBeVisible();

    const sw = context.serviceWorkers()[0]!;
    const tabId = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
      return tabs[0]?.id ?? -1;
    });

    // Inject once
    await sw.evaluate(async (tabId) => {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/discord.js'],
        world: 'ISOLATED',
      });
      await new Promise((r) => setTimeout(r, 200));
    }, tabId);

    const payload = {
      type: 'ADAPTER_DISPATCH' as const,
      payload: {
        dispatchId: 'e2e-rate-001',
        send_to: 'http://localhost:4321/channels/0/12345',
        prompt: 'first',
        snapshot: {
          title: 'T',
          url: 'https://x.com',
          description: '',
          create_at: '',
          content: 'c',
        },
      },
    };

    // First dispatch succeeds
    const r1 = await sw.evaluate(
      async ({ tabId, msg }) => {
        return chrome.tabs.sendMessage(tabId, msg);
      },
      { tabId, msg: payload },
    );
    expect(r1.ok, JSON.stringify(r1)).toBe(true);

    // Second dispatch within 5s -> RATE_LIMITED
    const r2 = await sw.evaluate(
      async ({ tabId, msg }) => {
        return chrome.tabs.sendMessage(tabId, {
          ...msg,
          payload: { ...msg.payload, dispatchId: 'e2e-rate-002' },
        });
      },
      { tabId, msg: payload },
    );
    expect(r2.ok).toBe(false);
    expect(r2.code).toBe('RATE_LIMITED');

    await discordPage.close();
  });
});
