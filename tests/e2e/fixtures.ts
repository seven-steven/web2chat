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
      const initial = context.serviceWorkers();
      if (initial.length === 0) throw new Error('[e2e] no service worker to reload');
      const oldSw = initial[0]!;

      // chrome.runtime.reload() restarts the extension; equivalent to
      // chrome://serviceworker-internals/ → Stop+restart for our purposes.
      // The evaluate() may itself throw because the SW we're calling is
      // about to be destroyed — swallow that, the reload still happens.
      try {
        await oldSw.evaluate(() => chrome.runtime.reload());
      } catch {
        // expected — old SW killed mid-evaluate
      }

      // Poll until a NEW SW instance (distinct reference from oldSw)
      // is registered. We can't use `waitForEvent('serviceworker')` here
      // because Chromium may register the new SW between our reload()
      // call and the listener attachment (race), and we can't use a
      // simple `waitForTimeout` because the actual settle time varies.
      // Polling for reference inequality is the only signal that
      // tracks the actual "extension is reloaded and ready" state.
      //
      // Without this gate, the next test step's `page.goto(chrome-extension://.../popup.html)`
      // races against the reload and may hit `net::ERR_BLOCKED_BY_CLIENT`
      // (extension URL temporarily unreachable while the process restarts).
      const start = Date.now();
      while (Date.now() - start < 5_000) {
        const sws = context.serviceWorkers();
        if (sws.length > 0 && !sws.includes(oldSw)) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error('[e2e] new service worker did not register within 5s after reload');
    });
  },
});

export { expect } from '@playwright/test';
