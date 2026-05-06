import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';
import { yamlLocalePlugin } from './vite-plugins/yaml-locale';

export default defineConfig({
  // WXT uses Vite 8 internally; Vitest ships Vite 7 — plugin types clash under exactOptionalPropertyTypes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [WxtVitest() as any, yamlLocalePlugin()],
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.output/**', '.wxt/**'],
    globals: false,
    restoreMocks: true,
  },
});
