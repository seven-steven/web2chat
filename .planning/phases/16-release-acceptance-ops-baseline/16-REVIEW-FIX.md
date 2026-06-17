---
phase: 16-release-acceptance-ops-baseline
fixed_at: 2026-06-16T09:37:00Z
review_path: .planning/phases/16-release-acceptance-ops-baseline/16-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-06-16T09:37:00Z
**Source review:** `.planning/phases/16-release-acceptance-ops-baseline/16-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (2 Critical + 7 Warning; Info findings OUT of scope per `fix_scope=critical_warning`)
- Fixed: 9
- Skipped: 0

**Verification gate:** `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test` 518 passing (515 baseline + 3 new regression tests for CR-01 / CR-02). All TDD-where-applicable (RED test added first for CR-01 and CR-02 logic fixes; defensive WR fixes verified by the existing app/section regression suite remaining green).

## Fixed Issues

### CR-01: Permission check uses substring matching — false-positives and false-negatives

**Files modified:** `scripts/verify-claims.ts`, `tests/unit/scripts/verify-claims.spec.ts`
**Commit:** `89b13e5`
**Applied fix:** Replaced the naive `text.includes(perm)` substring check in rule (a) with a tokenized set comparison. The locale `trust.permissions.fact1` string is now split on comma / ideographic comma (`,` `、` `，`) / colon (ASCII `:` and CJK `：`, so the leading "Production permissions:" / "生产权限：" lead-in is not glued to the first token) / whitespace, with trailing period punctuation (ASCII `.` / CJK `。`) stripped. Comparison is forward (every shipped permission token must appear in the locale set) AND reverse (any token in the locale set that is in a `KNOWN_PERMISSION_VOCAB` whitelist but absent from the manifest is flagged as `claims unshipped permission`). The reverse scan is restricted to the vocabulary so ordinary English/Chinese copy tokens never false-positive. Added two regression tests: (1) locale mentioning `storage` only inside `localStorage` is now correctly flagged as missing the `storage` token (closes the false-positive), and (2) locale claiming a permission absent from the manifest (`bookmarks`) is flagged (closes the false-negative / directional blindness). Also folds WR-02 (the no-op `webNavigation` strip) by removing the redundant `replace(/\bwebNavigation\b/g, '')` — tokenization makes the singular/plural/parenthetical question moot, and an explicit operator-greppable `must not claim 'tabs' as production` message is still emitted when `tabs` is claimed.

### CR-02: Proof-metadata rule (e) reports the wrong missing key / silently skips value-equality on absence

**Files modified:** `scripts/verify-claims.ts`, `tests/unit/scripts/verify-claims.spec.ts`
**Commit:** `7051758`
**Applied fix:** Changed the `proof.label` value-equality guard from `if (label !== undefined && label !== 'mockup')` (which silently skipped when the key was absent) to a strict `if (locale['proof.label'] !== 'mockup')` so the explicit `proof.label must equal 'mockup'` diagnostic fires whether the key is MISSING entirely (deleted from one OR both locales) OR has a wrong value. Combined with the parity rule (c) only comparing key SETS across locales, the old behavior meant a simultaneous delete of `proof.label` from BOTH locales would have surfaced only a generic "missing key" line. Added a regression test that deletes `proof.label` from both `en` and `zh_CN` and asserts the operator-greppable `proof.label must equal 'mockup'` wording is present (not just a generic missing-key line).

### WR-01: CLI crashes with unhandled exception on malformed manifest/locale JSON

**Files modified:** `scripts/verify-claims.ts`
**Commit:** `4724868`
**Applied fix:** Extracted a `readJson<T>(path)` helper that wraps `JSON.parse(readFileSync(...))` in try/catch and emits the structured `[verify-claims] FAIL: cannot parse {path}: {message}` line + `process.exit(1)` on parse failure. Applied to all three CLI inputs (manifest, en locale, zh_CN locale). The locale JSONs are hand-edited by humans, so malformed JSON now surfaces as the intended FAIL line rather than an uncaught-exception stack trace.

### WR-02: `tabs` strip-then-regex misses singular/parenthetical forms (no-op strip)

**Files modified:** `scripts/verify-claims.ts` (folded into CR-01)
**Commit:** `89b13e5` (same commit as CR-01)
**Applied fix:** Removed the no-op `text.replace(/\bwebNavigation\b/g, '')` pre-strip (the comment itself admitted it "accomplishes nothing against the stated threat model" — `webNavigation` contains no `tabs` substring). The CR-01 tokenization fix makes the singular/plural/parenthetical fragility moot by comparing as a set of tokens; an explicit `must not claim 'tabs' as production` message is still emitted by the dedicated `tabs` check.

### WR-03: Permission truth source is single-mode only — dev/prod divergence invisible

**Files modified:** `scripts/verify-claims.ts`
**Commit:** `4724868` (same commit as WR-01)
**Applied fix:** Added a direct manifest gate in the CLI branch: `if ((manifest.permissions ?? []).includes('tabs')) errors.push("[manifest] production permissions must not include 'tabs'")`. This is the PRIMARY manifest-driven gate — a future accidental widening of the prod branch with `tabs` now fails loudly here, independent of locale copy. The existing rule (a) locale-text check is documented as a SECONDARY locale-fidelity check.

### WR-04: Duplicated platform whitelist across two verifiers — drift risk

**Files modified:** `scripts/shipped-platforms.json` (new), `scripts/verify-claims.ts`, `apps/marketing/scripts/verify-build.mjs`
**Commit:** `67c313a`
**Applied fix:** Extracted the `SHIPPED_PLATFORMS` list to a shared `scripts/shipped-platforms.json` (single source of truth). `scripts/verify-claims.ts` now imports it via `resolveJsonModule` (enabled in the WXT tsconfig). `apps/marketing/scripts/verify-build.mjs` imports it via the Node ESM `with { type: 'json' }` import attribute and runs a module-load assertion that its wider `REQUIRED_PAGE_MARKERS` list is a superset of `SHIPPED_PLATFORMS` — a platform added to the JSON but missing from `REQUIRED_PAGE_MARKERS` now throws `[verify-build] WR-04 drift: shipped platform "X" is not in REQUIRED_PAGE_MARKERS`. This prevents the two CI gates from disagreeing silently when a platform is added or removed.

### WR-05: `setLocale` rejection inside the locale-toggle handler is swallowed

**Files modified:** `apps/marketing/src/app.tsx`
**Commit:** `67736b4`
**Applied fix:** Added a `.catch((err) => console.error('[locale-toggle] failed to load locale', next, err))` to the toggle handler's `setLocale(next).then(...)`. The `void` operator still discards the promise value, but `.catch` keeps the rejection observable — a network error or missing zh_CN chunk on a CDN deploy no longer silently makes the toggle a no-op with zero console feedback.

### WR-06: Locale detection accepts only exact `zh_CN` — common browser tags misroute to `en`

**Files modified:** `apps/marketing/src/main.tsx`
**Commit:** `67736b4`
**Applied fix:** Replaced the exact `['en', 'zh_CN'].includes(browserLang)` equality check with a `detectLocale()` function that prefers `navigator.languages` (when present) over `navigator.language` and matches on language PREFIX: any `zh*` variant (`zh-TW`, `zh-HK`, `zh-CN`, etc.) maps to the `zh_CN` bundle; any `en*` variant maps to `en`; otherwise falls back to `en`. This stops silently serving English to Chinese-reading visitors whose browser tag is not exactly `zh-CN` on first paint.

### WR-07: `flowTuple()` throws on every render if data shape regresses — uncaught in production

**Files modified:** `apps/marketing/src/app.tsx`
**Commit:** `67736b4`
**Applied fix:** `flowTuple()` no longer throws; it returns `readonly [...] | null`. In dev mode (`import.meta.env.DEV`) it still emits a `console.error('[flow] expected exactly 3 flow steps — rendering fallback')` so the contract break is visible during development. In production the flow section now renders a graceful fallback paragraph (the section title via `t('flow.title')`) plus the TargetMockup, instead of blanking the entire marketing site via an uncaught throw from the root component. Preact has no error boundary here, so preventing the throw at the source is the robust fix.

## Skipped Issues

None — all 9 in-scope findings (2 Critical + 7 Warning) were fixed.

---

_Fixed: 2026-06-16T09:37:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
