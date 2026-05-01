import { defineConfig } from '@playwright/test';

/**
 * Playwright config for Phase 1 + Phase 2 e2e (D-11).
 *
 * D-11: NOT in CI yet — Playwright joins CI in Phase 4 once an actual adapter
 * lands. Phase 1's purpose is purely to give the developer a one-shot
 * `pnpm test:e2e` that proves the popup ↔ SW ↔ storage round-trip + the
 * SW-restart resilience contract (FND-02 + ROADMAP success criterion #4).
 *
 * Phase 2 (02-07) adds a `webServer` block that serves tests/e2e/fixtures/
 * over http://localhost:4321/ so capture E2E tests can open a fixture
 * article page through an http: URL — http: passes the SW URL scheme
 * precheck (D-16), unlike about:blank or file:. The port is defined here
 * once; spec files use relative paths (e.g. '/article.html') via baseURL.
 *
 * launchPersistentContext + --load-extension requires headed Chromium (no
 * headless mode for unpacked extensions in the standard browser channel).
 * Tests run serially (workers: 1) because they share a single browser
 * profile per fixture instance.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: false,
    actionTimeout: 5_000,
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'pnpm exec serve tests/e2e/fixtures --listen 4321 --no-clipboard',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
