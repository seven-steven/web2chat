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
  reloadExtension: async ({ context }, use) => {
    await use(async () => {
      const [sw] = context.serviceWorkers();
      if (!sw) throw new Error('[e2e] no service worker to reload');
      // chrome.runtime.reload() restarts the extension; equivalent to
      // chrome://serviceworker-internals/ → Stop+restart for our purposes.
      //
      // Important: we do NOT await `waitForEvent('serviceworker')` here.
      // After reload(), the new SW is lazy-start — it only spins up when
      // something triggers it (a popup navigate, a runtime message, etc.).
      // The next test step (typically `newPage` + `goto popup.html`) is
      // exactly such a trigger; Playwright's implicit `locator.waitFor`
      // will block until the popup mounts AND the RPC resolves. Adding a
      // `waitForEvent` here just produces a 10s race-condition timeout
      // (#WR-03) without making the test more correct.
      await sw.evaluate(() => chrome.runtime.reload());
    });
  },
});

export { expect } from '@playwright/test';
