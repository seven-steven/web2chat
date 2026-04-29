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
      const oldSw = initial[0]!;

      // chrome.runtime.reload() restarts the entire extension; equivalent to
      // chrome://serviceworker-internals/ → Stop+restart for our purposes.
      // The evaluate() may itself throw because the SW we're calling is
      // about to be destroyed — swallow that, the reload still happens.
      try {
        await oldSw.evaluate(() => chrome.runtime.reload());
      } catch {
        // expected — old SW killed mid-evaluate
      }

      // STEP 1: wait for the old SW to actually be torn down.
      // Probe by evaluating in oldSw — once it throws, the old context is gone.
      const teardownStart = Date.now();
      while (Date.now() - teardownStart < 5_000) {
        try {
          await oldSw.evaluate(() => true);
        } catch {
          break; // old SW destroyed
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      // STEP 2: actively trigger the new SW to spin up.
      //
      // Empirically (HUMAN-UAT #4 third re-run): Chromium does NOT eagerly
      // re-create the SW after chrome.runtime.reload() — the new SW is
      // lazy-start and stays dormant until something hits the extension.
      // Polling `context.serviceWorkers()` therefore times out at 5s with
      // no new SW. We must navigate to an extension URL ourselves to wake
      // it up.
      //
      // The brief window between "old extension torn down" and "new
      // extension ready to serve URLs" produces transient
      // `net::ERR_BLOCKED_BY_CLIENT`, so we retry with backoff. We probe
      // `manifest.json` (a static JSON resource) instead of `popup.html`
      // to avoid mounting the popup and firing an extra sendMessage call
      // — keeps the helloCount semantics clean for the spec.
      const probeUrl = `chrome-extension://${extensionId}/manifest.json`;
      const probe = await context.newPage();
      try {
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 20; attempt++) {
          try {
            await probe.goto(probeUrl, { timeout: 2_000 });
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
            await new Promise((r) => setTimeout(r, 250));
          }
        }
        if (lastErr) {
          throw new Error(`[e2e] extension never came back up after reload: ${String(lastErr)}`);
        }
      } finally {
        await probe.close().catch(() => {});
      }

      // At this point the extension is reachable AND the new SW has been
      // triggered to start (the probe goto woke it up). The next test step
      // (`page2.goto(popup.html)`) will RPC against the new SW.
    });
  },
});

export { expect } from '@playwright/test';
