#!/usr/bin/env tsx
/**
 * Cross-source consistency verifier (Phase 16 keystone artifact).
 *
 * Converts the 13-CONTENT-SOURCES Claims Matrix from a human-readable audit
 * trail into a self-enforcing CI gate. Closes SC2 (claims/privacy/permissions
 * checklist) and the deferred WR-06/IN-04 (privacy overclaim) from Phase 15.
 *
 * Asserts five rules against the BUILT prod manifest artifact (produced by
 * `wxt build` under `.output/`) + both marketing locale JSONs
 * (`apps/marketing/src/i18n/locales/{en,zh_CN}.json`):
 *   (a) TRUST-02: locale `trust.permissions.fact1` MUST contain each production
 *       permission token; MUST NOT claim production `tabs`.
 *   (b) TRUST-01: `trust.privacy.*` copy MUST NOT contain any forbidden overclaim
 *       wording (verbatim from 13-CONTENT-SOURCES CLM-PRIVACY-01 + RESEARCH
 *       Pattern 1 — bare `remote server` is intentionally NOT blocklisted).
 *   (c) Pitfall 3: en and zh_CN locale key sets MUST be identical (parity).
 *   (d) TRUST-03: every shipped platform name (OpenClaw/Discord/Slack/Telegram)
 *       MUST appear in some `supportedPlatforms.*` value; Feishu/Lark/飞书 MAY
 *       appear ONLY in `limits.*` copy (CLM-PLATFORM-01 / CLM-LIMIT-02).
 *   (e) PROOF-03: all four proof metadata keys (`proof.label`, `proof.source`,
 *       `proof.status`, `proof.version`) MUST exist in both locales; `proof.label`
 *       MUST equal 'mockup' (locks the mockup-vs-screenshot status).
 *
 * The assertion logic is exposed as `assertClaims(input, errors)` for unit-test
 * consumption (tests/unit/scripts/verify-claims.spec.ts) — DO NOT mutate the
 * real locale/manifest files to test failure paths.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ClaimsInputs = {
  manifest: { permissions?: string[]; host_permissions?: string[] };
  locales: { en: Record<string, string>; zh_CN: Record<string, string> };
};

// ─── Source-of-truth constants (verbatim from 13-CONTENT-SOURCES + RESEARCH) ──

/**
 * Forbidden privacy overclaim tokens (CLM-PRIVACY-01 "Forbidden wording" column
 * + RESEARCH Pattern 1 lines 182-196). Per D3 the bare token `remote server` is
 * intentionally ABSENT — marketing copy legitimately needs "no remote server".
 */
const PRIVACY_FORBIDDEN = [
  'cloud sync',
  'our servers',
  'server-side processing',
  'usage analytics',
  'user tracking',
  '云端存储',
  '用户行为分析',
] as const;

/**
 * Shipped platform whitelist (hardcoded — matches
 * `apps/marketing/scripts/verify-build.mjs:50-53` REQUIRED_PAGE_MARKERS).
 */
const SHIPPED_PLATFORMS = ['OpenClaw', 'Discord', 'Slack', 'Telegram'] as const;

/**
 * Feishu/Lark leakage tokens — these MAY appear only in `limits.*` copy.
 * Source: 13-CONTENT-SOURCES CLM-LIMIT-02 + CLM-PLATFORM-01.
 */
const FEISHU_LEAK_PATTERN = /Feishu|Lark|飞书/i;

/**
 * PROOF-03 metadata keys — the ACTUAL locale keys verified in
 * `apps/marketing/src/i18n/locales/{en,zh_CN}.json` lines 56-59. WARNING 1
 * from plan 16-01: do NOT reference a `mockup`-nested proof namespace here;
 * only the flat `proof.<field>` keys below exist in the locale files.
 */
const PROOF_REQUIRED_KEYS = [
  'proof.label',
  'proof.source',
  'proof.status',
  'proof.version',
] as const;

const LOCALE_KEYS = ['en', 'zh_CN'] as const;
type LocaleKey = (typeof LOCALE_KEYS)[number];

/**
 * Pure assertion function — appends error strings into `errors` for any
 * invariant violation. Exported so tests/unit/scripts/verify-claims.spec.ts
 * can drive it with synthetic inputs (no filesystem mutation needed).
 *
 * No I/O, no `process.exit`, no `console.*` inside this function.
 */
export function assertClaims(input: ClaimsInputs, errors: string[]): void {
  // ─── (a) Permission set check (TRUST-02 + Pitfall 2) ────────────────────
  // Locale `trust.permissions.fact1` MUST contain every production permission
  // token from the BUILT manifest (single source of truth). MUST NOT claim
  // production `tabs` (Pitfall 2 — dev-only permission that never ships).
  const expectedPerms = (input.manifest.permissions ?? []).slice().sort();
  for (const localeKey of LOCALE_KEYS) {
    const text = input.locales[localeKey]['trust.permissions.fact1'] ?? '';
    for (const perm of expectedPerms) {
      if (!text.includes(perm)) {
        errors.push(`[${localeKey}] trust.permissions.fact1 missing token: ${perm}`);
      }
    }
    // Strip the legitimate `webNavigation` token (contains no 'tabs' substring,
    // but the strip is belt-and-braces per the plan spec) then reject bare 'tabs'.
    const stripped = text.replace(/\bwebNavigation\b/g, '');
    if (/\btabs\b/i.test(stripped)) {
      errors.push(`[${localeKey}] trust.permissions.fact1 must not claim 'tabs' as production`);
    }
  }

  // ─── (b) Privacy forbidden-wording scan (TRUST-01) ──────────────────────
  for (const localeKey of LOCALE_KEYS) {
    const locale = input.locales[localeKey];
    for (const factKey of Object.keys(locale).filter((k) => k.startsWith('trust.privacy.'))) {
      const text = (locale[factKey] ?? '').toLowerCase();
      for (const forbidden of PRIVACY_FORBIDDEN) {
        if (text.includes(forbidden.toLowerCase())) {
          errors.push(`[${localeKey}] ${factKey} contains forbidden token: ${forbidden}`);
        }
      }
    }
  }

  // ─── (c) Locale key parity (Pitfall 3) ──────────────────────────────────
  const enKeys = Object.keys(input.locales.en).sort();
  const zhKeys = Object.keys(input.locales.zh_CN).sort();
  if (JSON.stringify(enKeys) !== JSON.stringify(zhKeys)) {
    const enSet = new Set(enKeys);
    const zhSet = new Set(zhKeys);
    const missingInZhCN = enKeys.filter((k) => !zhSet.has(k));
    const missingInEn = zhKeys.filter((k) => !enSet.has(k));
    errors.push(
      `[parity] en and zh_CN locale keys differ — missing in zh_CN: [${missingInZhCN.join(
        ', ',
      )}], missing in en: [${missingInEn.join(', ')}]`,
    );
  }

  // ─── (d) Platform truth (TRUST-03) ──────────────────────────────────────
  // Each shipped platform name MUST appear in some `supportedPlatforms.*`
  // value (either locale — covers locales where one side is still being
  // translated). Feishu/Lark/飞书 MAY appear ONLY in `limits.*` copy.
  const allPlatformCopy = ([...LOCALE_KEYS] as LocaleKey[]).flatMap((localeKey) =>
    Object.entries(input.locales[localeKey])
      .filter(([k]) => k.startsWith('supportedPlatforms.'))
      .map(([, v]) => v),
  );
  for (const platformName of SHIPPED_PLATFORMS) {
    const present = allPlatformCopy.some((copy) => copy.includes(platformName));
    if (!present) {
      errors.push(
        `[platform] shipped platform ${platformName} missing from supportedPlatforms.* copy`,
      );
    }
  }
  // Feishu/Lark leak scan — any non-limits key that mentions the leakage tokens.
  for (const localeKey of LOCALE_KEYS) {
    const locale = input.locales[localeKey];
    for (const [key, value] of Object.entries(locale)) {
      if (key.startsWith('limits.')) continue;
      if (FEISHU_LEAK_PATTERN.test(value)) {
        errors.push(`[platform] Feishu/Lark leaking outside limits copy: [${localeKey}] ${key}`);
      }
    }
  }

  // ─── (e) Proof metadata presence (PROOF-03) ─────────────────────────────
  // All four ACTUAL proof.* keys MUST exist in both locales; proof.label MUST
  // equal 'mockup' (locks the mockup-vs-screenshot status).
  for (const localeKey of LOCALE_KEYS) {
    const locale = input.locales[localeKey];
    for (const requiredKey of PROOF_REQUIRED_KEYS) {
      if (locale[requiredKey] === undefined) {
        errors.push(`[proof] ${localeKey} missing proof metadata key: ${requiredKey}`);
      }
    }
    const label = locale['proof.label'];
    if (label !== undefined && label !== 'mockup') {
      errors.push(
        `[proof] ${localeKey} proof.label must be 'mockup' (got ${JSON.stringify(
          label,
        )}) — locks the mockup-vs-screenshot status per 13-CONTENT-SOURCES PROOF-03`,
      );
    }
  }
}

// ─── Main script entry ─────────────────────────────────────────────────────
// Guard so importing this module from tests does not run the CLI side-effects
// (same fix verify-manifest.ts had in commit 0b23bb2 — CI fails otherwise
// because the built prod manifest is absent before `pnpm build`).

const isDirectInvocation =
  !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectInvocation) {
  const manifestPath = resolve(process.cwd(), '.output/chrome-mv3/manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`[verify-claims] FAIL: ${manifestPath} not found. Run \`pnpm build\` first.`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
    permissions?: string[];
    host_permissions?: string[];
  };
  const en = JSON.parse(
    readFileSync(resolve(process.cwd(), 'apps/marketing/src/i18n/locales/en.json'), 'utf-8'),
  ) as Record<string, string>;
  const zh_CN = JSON.parse(
    readFileSync(resolve(process.cwd(), 'apps/marketing/src/i18n/locales/zh_CN.json'), 'utf-8'),
  ) as Record<string, string>;

  const errors: string[] = [];
  assertClaims({ manifest, locales: { en, zh_CN } }, errors);

  if (errors.length) {
    console.error('[verify-claims] FAIL:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log('[verify-claims] OK — marketing claims match canonical sources');
}
