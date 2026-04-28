import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  manifest: {
    name: '__MSG_extension_name__',
    description: '__MSG_extension_description__',
    default_locale: 'en',
    permissions: ['activeTab', 'scripting', 'storage'],
    host_permissions: ['https://discord.com/*'],
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
  },
  modules: ['@wxt-dev/i18n/module'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
