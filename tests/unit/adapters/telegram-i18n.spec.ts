import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const enYml = readFileSync(resolve(__dirname, '../../../locales/en.yml'), 'utf-8');
const zhCnYml = readFileSync(resolve(__dirname, '../../../locales/zh_CN.yml'), 'utf-8');

const telegramKeys = [
  'platform_icon_telegram',
  'telegram_tos_warning',
  'telegram_tos_details',
  'telegram_timestamp_label',
];

describe('Telegram i18n key coverage (TG-05)', () => {
  for (const key of telegramKeys) {
    it(`en.yml contains ${key}`, () => {
      expect(enYml).toContain(`${key}:`);
    });
    it(`zh_CN.yml contains ${key}`, () => {
      expect(zhCnYml).toContain(`${key}:`);
    });
  }
});
