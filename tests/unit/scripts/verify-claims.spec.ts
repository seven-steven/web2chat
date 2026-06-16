import { describe, it, expect } from 'vitest';
import { assertClaims, type ClaimsInputs } from '@/scripts/verify-claims';

/**
 * Canonical valid baseline for verify-claims. Mirrors the production
 * permission/host_permissions set from wxt.config.ts (prod branch) and
 * real locale values from apps/marketing/src/i18n/locales/{en,zh_CN}.json
 * (including the four `proof.*` metadata keys so Test 1 stays a true
 * positive under rule (e)).
 *
 * Override-surgical failure tests call validInputs({ ... }) with exactly
 * one mutation so the resulting errors stay attributable.
 */
function validInputs(overrides: Partial<ClaimsInputs> = {}): ClaimsInputs {
  return {
    manifest: {
      permissions: ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation'],
      host_permissions: [
        'https://discord.com/*',
        'https://app.slack.com/*',
        'https://slack.com/*',
        'https://web.telegram.org/*',
      ],
    },
    locales: {
      en: {
        'trust.permissions.fact1':
          'Production permissions: activeTab, alarms, scripting, storage, webNavigation.',
        'trust.privacy.fact4':
          'No remote server — the extension never operates or communicates with one.',
        'supportedPlatforms.title': 'Supported platforms',
        'supportedPlatforms.openclaw': 'OpenClaw — self-hosted AI Agent platform',
        'supportedPlatforms.discord': 'Discord — channel delivery',
        'supportedPlatforms.slack': 'Slack — channel delivery',
        'supportedPlatforms.telegram': 'Telegram — chat delivery',
        'limits.feishu': 'Feishu/Lark was evaluated and dropped from shipped scope.',
        'proof.label': 'mockup',
        'proof.source': 'code-generated',
        'proof.status': 'marketing demo aligned to current UI contract',
        'proof.version': 'current repo state',
      },
      zh_CN: {
        'trust.permissions.fact1':
          '生产权限：activeTab、alarms、scripting、storage、webNavigation。',
        'trust.privacy.fact4': '不运营远程服务器——扩展不连接任何服务器。',
        'supportedPlatforms.title': '支持的平台',
        'supportedPlatforms.openclaw': 'OpenClaw — 自部署 AI Agent 平台',
        'supportedPlatforms.discord': 'Discord — 频道投递',
        'supportedPlatforms.slack': 'Slack — 频道投递',
        'supportedPlatforms.telegram': 'Telegram — 会话投递',
        'limits.feishu': '飞书/Lark 经评估后因共享 URL 定位不可靠而未纳入发布范围。',
        'proof.label': 'mockup',
        'proof.source': 'code-generated',
        'proof.status': '营销演示，与当前 UI 契约保持一致',
        'proof.version': 'current repo state',
      },
    },
    ...overrides,
  };
}

describe('verify-claims assertClaims — Phase 16 (TRUST-01/02/03, OPS-02, PROOF-03)', () => {
  it('valid inputs produce no errors', () => {
    const errors: string[] = [];
    assertClaims(validInputs(), errors);
    expect(errors).toEqual([]);
  });

  it('locale text missing a permission token produces error', () => {
    const errors: string[] = [];
    assertClaims(
      validInputs({
        locales: {
          en: {
            ...validInputs().locales.en,
            'trust.permissions.fact1': 'Production permissions: activeTab, scripting, storage.',
          },
          zh_CN: {
            ...validInputs().locales.zh_CN,
            'trust.permissions.fact1': '生产权限：activeTab, scripting, storage.',
          },
        },
      }),
      errors,
    );
    expect(errors.some((e) => e.includes('alarms'))).toBe(true);
  });

  it('forbidden privacy wording produces error', () => {
    const errors: string[] = [];
    assertClaims(
      validInputs({
        locales: {
          en: {
            ...validInputs().locales.en,
            'trust.privacy.fact4': 'Cloud sync enabled, no remote server.',
          },
          zh_CN: {
            ...validInputs().locales.zh_CN,
            'trust.privacy.fact4': '支持云端存储。',
          },
        },
      }),
      errors,
    );
    expect(errors.some((e) => e.includes('cloud sync') || e.includes('云端存储'))).toBe(true);
  });

  it('locale claiming production tabs permission produces error', () => {
    const errors: string[] = [];
    assertClaims(
      validInputs({
        locales: {
          en: {
            ...validInputs().locales.en,
            'trust.permissions.fact1':
              'Production permissions: activeTab, alarms, scripting, storage, webNavigation, tabs.',
          },
          zh_CN: {
            ...validInputs().locales.zh_CN,
            'trust.permissions.fact1':
              '生产权限：activeTab, alarms, scripting, storage, webNavigation, tabs.',
          },
        },
      }),
      errors,
    );
    expect(errors.some((e) => e.includes('tabs'))).toBe(true);
  });

  it('locale key parity violation produces error', () => {
    const baseline = validInputs();
    // zh_CN missing the 'limits.feishu' key that en has → parity error.
    const { 'limits.feishu': _omitted, ...zhCnMissingOne } = baseline.locales.zh_CN;
    const errors: string[] = [];
    assertClaims(
      validInputs({
        locales: {
          en: baseline.locales.en,
          zh_CN: zhCnMissingOne,
        },
      }),
      errors,
    );
    expect(errors.some((e) => /parity|key.*differ|missing.*key/i.test(e))).toBe(true);
  });

  it('platform section missing a shipped platform name produces error', () => {
    const baseline = validInputs();
    // Remove ALL supportedPlatforms.discord.* keys from both locales so the
    // Discord platform name never appears in supportedPlatforms.* copy.
    const en = { ...baseline.locales.en };
    const zhCN = { ...baseline.locales.zh_CN };
    delete en['supportedPlatforms.discord'];
    delete zhCN['supportedPlatforms.discord'];
    const errors: string[] = [];
    assertClaims(
      validInputs({
        locales: { en, zh_CN: zhCN },
      }),
      errors,
    );
    expect(errors.some((e) => /platform|discord|OpenClaw/i.test(e))).toBe(true);
  });

  it('Feishu/Lark leaking outside limits copy produces error', () => {
    const baseline = validInputs();
    // Inject 飞书 into a supportedPlatforms.*.title key (NOT a limits.* key).
    const errors: string[] = [];
    assertClaims(
      validInputs({
        locales: {
          en: {
            ...baseline.locales.en,
            'supportedPlatforms.title': 'Supported platforms (also 飞书)',
          },
          zh_CN: {
            ...baseline.locales.zh_CN,
            'supportedPlatforms.title': '支持的平台（含飞书）',
          },
        },
      }),
      errors,
    );
    expect(errors.some((e) => /Feishu|飞书|Lark|leak/i.test(e))).toBe(true);
  });

  it('missing proof metadata key produces error (PROOF-03, rule e)', () => {
    const baseline = validInputs();
    // Omit `proof.status` from zh_CN while keeping all other proof.* keys.
    const { 'proof.status': _omitted, ...zhCNMissingProofStatus } = baseline.locales.zh_CN;
    const errors: string[] = [];
    assertClaims(
      validInputs({
        locales: {
          en: baseline.locales.en,
          zh_CN: zhCNMissingProofStatus,
        },
      }),
      errors,
    );
    expect(errors.some((e) => /proof|missing/i.test(e))).toBe(true);
  });
});
