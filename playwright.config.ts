import { defineConfig } from '@playwright/test';

/**
 * Playwright config for Phase 1 e2e (D-11).
 *
 * D-11: NOT in CI yet — Playwright joins CI in Phase 4 once an actual adapter
 * lands. Phase 1's purpose is purely to give the developer a one-shot
 * `pnpm test:e2e` that proves the popup ↔ SW ↔ storage round-trip + the
 * SW-restart resilience contract (FND-02 + ROADMAP success criterion #4).
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
  },
});
