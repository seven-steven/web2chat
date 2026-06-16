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
 * Shipped platform whitelist (WR-04: single source of truth in
 * `scripts/shipped-platforms.json`, shared with
 * `apps/marketing/scripts/verify-build.mjs` to prevent the two gates from
 * drifting silently when a platform is added/removed).
 */
import SHIPPED_PLATFORMS_JSON from './shipped-platforms.json';
const SHIPPED_PLATFORMS = SHIPPED_PLATFORMS_JSON as readonly string[];

/**
 * Known permission vocabulary. CR-01: used by the reverse-direction check to
 * flag locale claims of permission names that the production manifest does NOT
 * ship. Restricting the reverse scan to this vocabulary (rather than every
 * whitespace token) avoids false-positives on ordinary words like "the" or
 * "permission" that happen to be absent from the manifest. Updated when the
 * manifest permission set widens (permissive — only needs to list names that
 * might ever plausibly be claimed, not every valid MV3 permission).
 */
const KNOWN_PERMISSION_VOCAB = new Set([
  'activeTab',
  'alarms',
  'bookmarks',
  'browsingData',
  'clipboardWrite',
  'contextMenus',
  'cookies',
  'downloads',
  'history',
  'identity',
  'notifications',
  'scripting',
  'storage',
  'tabs',
  'unlimitedStorage',
  'webNavigation',
]);

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
  //
  // CR-01: the comparison is TOKENIZED on word boundaries (comma / ideographic
  // comma / whitespace) and compared as a SET — a naive `String.includes()`
  // substring match yields both false-positives (a locale string that merely
  // *mentions* `storage` inside `localStorage` would pass) and false-negatives
  // (the reverse direction — locale claims of permissions absent from the
  // manifest — was never verified). The reverse scan is restricted to
  // KNOWN_PERMISSION_VOCAB so ordinary English/Chinese copy tokens never trip
  // a false-positive.
  const expectedPerms = (input.manifest.permissions ?? []).slice().sort();
  const manifestPermSet = new Set(input.manifest.permissions ?? []);
  for (const localeKey of LOCALE_KEYS) {
    const text = input.locales[localeKey]['trust.permissions.fact1'] ?? '';
    // Tokenize on comma / ideographic comma / colon (ASCII `:` and CJK `：`,
    // so the leading "Production permissions:" / "生产权限：" lead-in does not
    // get glued onto the first permission token) / whitespace. Strip trailing
    // period punctuation (ASCII `.` and CJK `。`).
    const localePermTokens = new Set(
      text
        .split(/[,\s:：、，]+/)
        .map((s) => s.replace(/[.。]+$/g, '').trim())
        .filter(Boolean),
    );
    // Forward direction: every shipped permission must appear as a token.
    for (const perm of expectedPerms) {
      if (!localePermTokens.has(perm)) {
        errors.push(`[${localeKey}] trust.permissions.fact1 missing token: ${perm}`);
      }
    }
    // Reverse direction: reject locale claims of permission names that the
    // manifest does NOT ship. Restricted to KNOWN_PERMISSION_VOCAB so ordinary
    // copy tokens ("the", "permission", etc.) never trigger a false-positive.
    for (const tok of localePermTokens) {
      if (KNOWN_PERMISSION_VOCAB.has(tok) && !manifestPermSet.has(tok)) {
        errors.push(`[${localeKey}] trust.permissions.fact1 claims unshipped permission: ${tok}`);
      }
    }
    // Sanity: also explicitly flag `tabs` with the historical operator-facing
    // wording (the reverse-direction check above already catches it, but this
    // distinct message makes "claims production tabs" trivially greppable in
    // CI logs — see Pitfall 2 wording in the header).
    if (localePermTokens.has('tabs') && !manifestPermSet.has('tabs')) {
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
  //
  // CR-02: the value-equality check uses strict `!== 'mockup'` so the same
  // operator-greppable error fires whether `proof.label` is MISSING entirely
  // (deleted from one or both locales) OR has a wrong value. The old guard
  // `label !== undefined && label !== 'mockup'` silently skipped the value
  // check when the key was absent — combined with the parity rule (c) only
  // comparing key SETS across locales, a simultaneous delete of `proof.label`
  // from BOTH locales would have surfaced only the generic "missing key" line,
  // losing the explicit "must be 'mockup'" diagnostic operators are trained to
  // grep for.
  for (const localeKey of LOCALE_KEYS) {
    const locale = input.locales[localeKey];
    for (const requiredKey of PROOF_REQUIRED_KEYS) {
      if (locale[requiredKey] === undefined) {
        errors.push(`[proof] ${localeKey} missing proof metadata key: ${requiredKey}`);
      }
    }
    if (locale['proof.label'] !== 'mockup') {
      errors.push(
        `[proof] ${localeKey} proof.label must equal 'mockup' (got ${JSON.stringify(
          locale['proof.label'],
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

  // WR-01: malformed JSON in any of the three inputs must surface as a
  // structured `[verify-claims] FAIL:` line, NOT an uncaught-exception stack
  // trace. The locales are hand-edited by humans; the manifest is a build
  // artifact but can also be corrupt if a partial build left a truncated file.
  const readJson = <T>(path: string): T => {
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as T;
    } catch (e) {
      console.error(`[verify-claims] FAIL: cannot parse ${path}: ${(e as Error).message}`);
      process.exit(1);
    }
  };

  const manifest = readJson<{
    permissions?: string[];
    host_permissions?: string[];
  }>(manifestPath);
  const en = readJson<Record<string, string>>(
    resolve(process.cwd(), 'apps/marketing/src/i18n/locales/en.json'),
  );
  const zh_CN = readJson<Record<string, string>>(
    resolve(process.cwd(), 'apps/marketing/src/i18n/locales/zh_CN.json'),
  );

  // WR-03: direct manifest gate — production permissions must NEVER include
  // `tabs` (dev-only widening in wxt.config.ts never ships; a future accidental
  // widening of the prod branch must fail loudly here, independent of locale
  // copy). This is the PRIMARY manifest-driven gate; rule (a)'s locale-text
  // check is a SECONDARY fidelity check.
  const errors: string[] = [];
  if ((manifest.permissions ?? []).includes('tabs')) {
    errors.push("[manifest] production permissions must not include 'tabs'");
  }

  assertClaims({ manifest, locales: { en, zh_CN } }, errors);

  if (errors.length) {
    console.error('[verify-claims] FAIL:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log('[verify-claims] OK — marketing claims match canonical sources');
}
