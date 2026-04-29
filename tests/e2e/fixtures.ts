import { test as base, chromium, type BrowserContext } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

/**
 * Custom Playwright fixtures (PITFALLS §陷阱 3 + ROADMAP Phase 1 success criterion #4):
 *   - launchPersistentContext with --load-extension={cwd}/.output/chrome-mv3
 *   - resolve extensionId from the SW URL (chrome-extension://<id>/...)
 *   - reloadExtension helper — calls chrome.runtime.reload() inside the SW,
 *     equivalent to chrome://extensions → Service worker → Stop+restart.
 *
 * D-11: Playwright is NOT in CI yet; this fixture exists so the developer can
 * run `pnpm test:e2e` locally. Phase 4 will lift this into CI alongside the
 * first IM adapter.
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  reloadExtension: () => Promise<void>;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const extensionPath = resolve(process.cwd(), '.output/chrome-mv3');
    const userDataDir = mkdtempSync(join(tmpdir(), 'web2chat-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // Wait for the service worker to register, then parse its URL.
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }
    const id = serviceWorker.url().split('/')[2];
    if (!id) throw new Error('[e2e] could not parse extensionId from SW URL');
    await use(id);
  },
  reloadExtension: async ({ context, extensionId }, use) => {
    await use(async () => {
      const initial = context.serviceWorkers();
      if (initial.length === 0) throw new Error('[e2e] no service worker to reload');

      // Why we don't use chrome.runtime.reload() here:
      // In Playwright `launchPersistentContext` + `--load-extension`, the
      // chrome.runtime.reload() call unloads the extension but does NOT
      // automatically re-register it (that happens for *packed* extensions
      // only). Extension URLs respond with `net::ERR_BLOCKED_BY_CLIENT`
      // for at least 5+ seconds afterwards, and polling for a new SW just
      // times out because nothing wakes it back up.
      //
      // The right primitive is `ServiceWorker.stopWorker` over Chrome
      // DevTools Protocol — which is exactly what
      // chrome://serviceworker-internals/ → "Stop" does at the bottom:
      // it kills the SW process without touching the extension lifecycle.
      // The next extension event (e.g. our test's `page.goto(popup.html)`
      // → sendMessage → onMessage handler) wakes the SW back up, which
      // re-runs entrypoints/background.ts at module top-level. That's
      // exactly the FND-02 + ROADMAP #4 contract we want to prove.
      //
      // Playwright's BrowserContext.newCDPSession only accepts Page (not
      // ServiceWorker) — so we open a throw-away helper page, create a
      // page-level CDP session, and use the ServiceWorker domain through
      // that channel (the domain is browser-scoped and accessible from
      // any CDP session in the context).
      const helper = await context.newPage();
      try {
        const cdp = await context.newCDPSession(helper);
        let versionId: string | undefined;
        cdp.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
          for (const v of versions) {
            if (
              v.scriptURL?.includes(extensionId) &&
              (v.runningStatus === 'running' || v.runningStatus === 'starting')
            ) {
              versionId = v.versionId;
            }
          }
        });
        await cdp.send('ServiceWorker.enable');

        const eventStart = Date.now();
        while (!versionId && Date.now() - eventStart < 2_000) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if (!versionId) throw new Error('[e2e] could not resolve SW versionId via CDP');

        await cdp.send('ServiceWorker.stopWorker', { versionId });
        await cdp.detach().catch(() => {});
      } finally {
        await helper.close().catch(() => {});
      }

      // The SW is now terminated. The extension stays enabled — the next
      // page.goto(chrome-extension://.../popup.html) → sendMessage will
      // wake a fresh SW, re-executing entrypoints/background.ts top-level
      // and re-registering listeners.
    });
  },
});

export { expect } from '@playwright/test';
