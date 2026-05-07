import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { yamlLocalePlugin } from './vite-plugins/yaml-locale';

export default defineConfig({
  manifest: ({ mode }) => ({
    name: '__MSG_extension_name__',
    description: '__MSG_extension_description__',
    default_locale: 'en',
    // Production manifest is locked at activeTab + scripting + storage (CLAUDE.md §约定).
    // In development mode we additionally request `tabs` so Playwright E2E can read
    // tab.url without a real toolbar click — activeTab is only granted on user
    // gesture, which Playwright cannot simulate for extension action popups.
    // This dev-only widening NEVER ships to the store: production builds keep
    // the locked permission scope.
    permissions:
      mode === 'development'
        ? ['activeTab', 'alarms', 'scripting', 'storage', 'tabs', 'webNavigation']
        : ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation'],
    // Production stays at the locked discord-only host scope; OpenClaw and any
    // user-supplied origin go through optional_host_permissions runtime grant.
    // Dev mode adds <all_urls> so Playwright E2E can executeScript into
    // localhost fixture pages — activeTab would normally cover this, but it's
    // only granted on user gesture (toolbar click), which Playwright cannot
    // simulate for action popups.
    host_permissions:
      mode === 'development' ? ['https://discord.com/*', '<all_urls>'] : ['https://discord.com/*'],
    optional_host_permissions: ['<all_urls>'],
    action: {
      default_title: '__MSG_action_default_title__',
      default_icon: {
        '16': '/icon/16.png',
        '32': '/icon/32.png',
        '48': '/icon/48.png',
        '128': '/icon/128.png',
      },
    },
    // Phase 3 D-38 + DSP-10: keyboard shortcut to open popup AND auto-trigger
    // capture.run on mount (popup mount auto-fires capture.run since Phase 2 D-15;
    // _execute_action is handled directly by Chrome — no chrome.commands.onCommand
    // listener needed). Mac override per RESEARCH Pitfall 8: explicit Command+Shift+S
    // is more reliable than relying on Chrome's automatic Ctrl→Command translation.
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: '__MSG_command_open_popup__',
      },
    },
  }),
  modules: ['@wxt-dev/i18n/module'],
  zip: {
    exclude: ['content-scripts/mock-platform.js'],
  },
  vite: () => ({
    plugins: [tailwindcss(), yamlLocalePlugin()],
  }),
});
