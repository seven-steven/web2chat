import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const enYml = readFileSync(resolve(__dirname, '../../../locales/en.yml'), 'utf-8');
const zhCnYml = readFileSync(resolve(__dirname, '../../../locales/zh_CN.yml'), 'utf-8');

const slackKeys = ['platform_icon_slack', 'slack_tos_warning', 'slack_tos_details'];

describe('Slack i18n key coverage (SLK-05)', () => {
  for (const key of slackKeys) {
    it(`en.yml contains ${key}`, () => {
      expect(enYml).toContain(`${key}:`);
    });
    it(`zh_CN.yml contains ${key}`, () => {
      expect(zhCnYml).toContain(`${key}:`);
    });
  }
});
