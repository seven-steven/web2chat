import { test as base, chromium, type BrowserContext } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  reloadExtension: () => Promise<void>;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const extensionPath = resolve(process.cwd(), '.output/chrome-mv3-dev');
    const userDataDir = mkdtempSync(join(tmpdir(), 'web2chat-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) {
      sw = await context.waitForEvent('serviceworker', { timeout: 5_000 });
    }
    const id = sw.url().split('/')[2];
    if (!id) throw new Error('[e2e] could not parse extensionId from SW URL');
    await use(id);
  },
  reloadExtension: async ({ context, extensionId }, use) => {
    await use(async () => {
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
    });
  },
});

export { expect } from '@playwright/test';
