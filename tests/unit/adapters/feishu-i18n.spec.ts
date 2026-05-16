import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const enYml = readFileSync(resolve(__dirname, '../../../locales/en.yml'), 'utf-8');
const zhCnYml = readFileSync(resolve(__dirname, '../../../locales/zh_CN.yml'), 'utf-8');

const feishuKeys = [
  'platform_icon_feishu',
  'feishu_tos_warning',
  'feishu_tos_details',
  'feishu_timestamp_label',
];

describe('Feishu i18n key coverage (FSL-05)', () => {
  for (const key of feishuKeys) {
    it(`en.yml contains ${key}`, () => {
      expect(enYml).toContain(`${key}:`);
    });
    it(`zh_CN.yml contains ${key}`, () => {
      expect(zhCnYml).toContain(`${key}:`);
    });
  }
});
