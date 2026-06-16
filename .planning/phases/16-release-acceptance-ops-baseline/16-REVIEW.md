---
phase: 16-release-acceptance-ops-baseline
reviewed: 2026-06-16T00:00:00Z
depth: deep
files_reviewed: 12
files_reviewed_list:
  - .github/workflows/ci.yml
  - apps/marketing/scripts/verify-build.mjs
  - apps/marketing/src/app.tsx
  - apps/marketing/src/components/cta-button.tsx
  - apps/marketing/src/i18n/locales/en.json
  - apps/marketing/src/i18n/locales/zh_CN.json
  - apps/marketing/src/main.tsx
  - apps/marketing/src/styles/index.css
  - scripts/verify-claims.ts
  - tests/unit/marketing/app-sections.spec.tsx
  - tests/unit/marketing/proof-labels.spec.tsx
  - tests/unit/scripts/verify-claims.spec.ts
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-06-16
**Depth:** deep
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The Phase 16 keystone artifact (`scripts/verify-claims.ts`) is well-structured as a pure library + CLI split with a clean `isDirectInvocation` guard, and the a11y/i18n contract additions are coherent. However, the claims verifier has **two BLOCKER-class logic defects** that silently defeat the very invariants it was built to enforce: (1) the permission-token check uses a non-tokenized `String.includes()` substring match that yields both false-positives and false-negatives, and (2) the proof-metadata rule (e) reports the wrong key in its error message when a key is missing — making failures unattributable in CI logs. Several secondary gaps in the CLI (uncaught JSON-parse crash, single-mode permission truth source, locale detection) round out the findings.

Cross-file trace performed: `scripts/verify-claims.ts` → `apps/marketing/src/i18n/locales/*.json` → `wxt.config.ts` (permission truth) → `apps/marketing/scripts/verify-build.mjs` (duplicate platform whitelist) → `app.tsx`/`main.tsx` lang contract.

## Critical Issues

### CR-01: Permission check uses substring matching — false-positives and false-negatives

**File:** `scripts/verify-claims.ts:98-101`
**Issue:** Rule (a) asserts that locale `trust.permissions.fact1` contains every production permission token via `text.includes(perm)`. `perm` is a bare permission name like `storage`, `scripting`, `tabs`. This is **not** tokenized, so:

- **False-positive (silent pass):** A locale string that merely *mentions* a substring satisfies the rule. Confirmed by execution: the text `"Production permissions: uses localStorage for storage."` satisfies the `storage` token check even though it does not present `storage` as a permission name. A regression that reworded copy to "data kept in local storage" would silently pass TRUST-02.
- **Directional blindness:** The rule never verifies the *reverse* — that the locale does not list a permission absent from the manifest. If a future manifest dropped `alarms` but the locale kept stating it, no error fires. The check is one-way only.

This is the keystone artifact whose stated purpose is to "convert the Claims Matrix into a self-enforcing CI gate" (SC2). A substring match means the gate can be trivially walked through.

**Fix:** Tokenize on word boundaries, e.g. by extracting the comma/ideographic-comma/whitespace-separated tokens and comparing as a set:

```ts
const localePermTokens = new Set(
  text
    .split(/[,\s、，]+/)
    .map((s) => s.replace(/[.。]+$/g, '').trim())
    .filter(Boolean),
);
for (const perm of expectedPerms) {
  if (!localePermTokens.has(perm)) {
    errors.push(`[${localeKey}] trust.permissions.fact1 missing token: ${perm}`);
  }
}
// Reverse direction: reject locale-only permission claims not in manifest.
const manifestSet = new Set(input.manifest.permissions ?? []);
for (const tok of localePermTokens) {
  if (KNOWN_PERMISSION_VOCAB.has(tok) && !manifestSet.has(tok)) {
    errors.push(`[${localeKey}] trust.permissions.fact1 claims unshipped permission: ${tok}`);
  }
}
```

### CR-02: Proof-metadata rule (e) reports the wrong missing key

**File:** `scripts/verify-claims.ts:170-185`
**Issue:** When a required proof key is missing, the error message correctly names the missing key. But the **second** check (the `proof.label === 'mockup'` assertion) reads `locale['proof.label']` *after* the presence loop. The guard `if (label !== undefined && label !== 'mockup')` means: when `proof.label` is missing entirely, **no error is emitted about the bad value**, and the operator only sees the generic "missing proof metadata key: proof.label" message. That part is fine.

The real defect is the **mismatch between the documented invariant and the implementation**: the comment block at lines 21-23 says `proof.label MUST equal 'mockup' (locks the mockup-vs-screenshot status)`, but the check is skipped silently when the key is absent. Combined with the parity rule (c) — which only fires if *en* and *zh_CN* differ in key sets, **not** if both are missing the same key — a regression that deletes `proof.label` from **both** locales simultaneously would emit only a generic "missing key" error and never the explicit "must be 'mockup'" diagnostic that operators are trained to grep for. Worse, because the parity check (c) is the only protection against wholesale deletion and it compares key *sets* across locales (not against a required list), `proof.label` could be deleted from both locales and the only signal is the rule-(e) "missing key" line — easy to miss in a noisy CI log.

**Fix:** Either (1) treat absence of `proof.label` as a separate, distinctly-worded BLOCKER, or (2) fold the value-equality check into the presence loop so each missing required key emits exactly one strongly-worded error:

```ts
for (const requiredKey of PROOF_REQUIRED_KEYS) {
  if (locale[requiredKey] === undefined) {
    errors.push(
      `[proof] ${localeKey} missing required proof metadata key: ${requiredKey} (PROOF-03)`,
    );
  }
}
if (locale['proof.label'] !== 'mockup') {  // === covers both undefined and wrong value
  errors.push(
    `[proof] ${localeKey} proof.label must equal 'mockup' (got ${JSON.stringify(locale['proof.label'])}) — PROOF-03`,
  );
}
```

## Warnings

### WR-01: CLI crashes with unhandled exception on malformed manifest/locale JSON

**File:** `scripts/verify-claims.ts:197-212`
**Issue:** The CLI branch calls `JSON.parse(readFileSync(...))` on three files with no try/catch. If any of those files is malformed JSON, `JSON.parse` throws and the process exits with an uncaught-exception stack trace rather than the intended `[verify-claims] FAIL:` formatted error. The `existsSync` guard only catches *missing* files, not corrupt ones. `verify-build.mjs` has the same shape but its inputs are build artifacts it controls; here one input is a hand-edited locale JSON that humans mutate constantly.
**Fix:** Wrap the three parse calls and emit a structured FAIL:

```ts
function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch (e) {
    console.error(`[verify-claims] FAIL: cannot parse ${path}: ${(e as Error).message}`);
    process.exit(1);
  }
}
```

### WR-02: `tabs` strip-then-regex misses singular/parenthetical forms

**File:** `scripts/verify-claims.ts:105-107`
**Issue:** The defense against locale copy claiming production `tabs` first strips `webNavigation` then tests `/\btabs\b/i`. This is fragile: a locale that writes `"tab"` (singular), `"the tab permission"`, `"chrome.tabs API"`, or `"tabs permission"` inside parentheses after another token will be caught inconsistently. More importantly the *whole strip-then-test* dance is unnecessary: `webNavigation` does not contain the substring `tabs`, so the pre-strip is "belt-and-braces" per the comment but actually accomplishes nothing against the stated threat model. Confirmed by execution: stripping `webNavigation` from a string never changes the `\btabs\b` result.
**Fix:** Either drop the no-op strip and document why, or use a single anchored tokenization (per CR-01) so the singular/plural/parenthetical question disappears.

### WR-03: Permission truth source is single-mode only — dev/prod divergence invisible

**File:** `scripts/verify-claims.ts:197` + `.github/workflows/ci.yml:24-27`
**Issue:** `wxt build` runs in production mode, so `.output/chrome-mv3/manifest.json` always carries the **prod** permission set (no `tabs`). Rule (a) therefore asserts the locale copy matches prod permissions only. The dev-mode widening in `wxt.config.ts:18` (`['activeTab','alarms','scripting','storage','tabs','webNavigation']`) is never verified against anything. This is acceptable *if* the dev branch is trusted, but the artifact's header comment claims to assert "permission-set equality" against "the BUILT prod manifest" — which is misleading because the only manifest the verifier ever sees is prod. If a future change accidentally widened the **prod** branch with `tabs`, the verifier would correctly flag it via the locale-text check, but only *because* the locale text happens to omit `tabs` — not because the manifest itself is cross-checked. The contract is locale-driven, not manifest-driven.
**Fix:** Add a direct manifest assertion: `if ((input.manifest.permissions ?? []).includes('tabs')) errors.push('[manifest] production permissions must not include tabs')`. Document the rule (a) text check as a *secondary* locale-fidelity check, not the primary gate.

### WR-04: Duplicated platform whitelist across two verifiers — drift risk

**File:** `scripts/verify-claims.ts:59` (`SHIPPED_PLATFORMS`) vs `apps/marketing/scripts/verify-build.mjs:36-62` (`REQUIRED_PAGE_MARKERS`)
**Issue:** The list of shipped platform names is hardcoded in two unrelated source files with no shared import. The `verify-claims.ts` comment at line 57-58 acknowledges this ("matches `verify-build.mjs:50-53`") but does not actually share the constant. If a platform is added (e.g. Mattermost) and only one file is updated, the two gates will disagree silently.
**Fix:** Extract `SHIPPED_PLATFORMS` to a shared module (e.g. `scripts/claims-constants.ts`) and import from both. Alternatively have `verify-claims.ts` assert that `verify-build.mjs`'s marker list is a superset of `SHIPPED_PLATFORMS`.

### WR-05: `setLocale` rejection inside the locale-toggle handler is swallowed

**File:** `apps/marketing/src/app.tsx:88-93`
**Issue:** The toggle handler does `void setLocale(next).then(() => { locale.value = next; ... })` with no `.catch`. If the dynamic `import('./locales/zh_CN.json')` inside `loadLocale` rejects (network error, build chunk 404 on a CDN deploy, etc.), the promise rejects silently, the `locale.value` is never flipped, and the user sees the button do nothing with no console feedback. The `void` operator explicitly discards the rejection.
**Fix:** Add a `.catch` that surfaces the failure, at minimum:

```ts
void setLocale(next)
  .then(() => {
    locale.value = next;
    document.documentElement.lang = next === 'zh_CN' ? 'zh-CN' : 'en';
  })
  .catch((err) => {
    console.error('[locale-toggle] failed to load', next, err);
  });
```

### WR-06: Locale detection accepts only exact `zh_CN` — common browser tags misroute to `en`

**File:** `apps/marketing/src/main.tsx:10-12`
**Issue:** `navigator.language.replace('-', '_')` produces e.g. `'zh_CN'`, `'zh_TW'`, `'zh_HK'`, `'en_US'`, `'en_GB'`. The `supported` array is `['en', 'zh_CN']`, so:
- `zh-TW`, `zh-HK`, `zh-CN`-with-region-stripped-but-different-tag → falls back to `en` even though the user is a Chinese reader.
- `en-GB`, `en-US` → falls back to `en` (acceptable, same copy).
For a project whose `CLAUDE.md` declares zh-CN as the primary developer locale, silently serving Chinese-reading visitors the English page on first paint is a real UX regression. The signal is then never re-evaluated — there is no `navigator.languages` fallback or prefix match.
**Fix:** Match on language prefix:

```ts
function detectLocale(): string {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const norm = l.toLowerCase();
    if (norm.startsWith('zh')) return 'zh_CN';  // any Chinese variant → zh_CN copy
    if (norm.startsWith('en')) return 'en';
  }
  return 'en';
}
```

### WR-07: `flowTuple()` throws on every render if data shape regresses — uncaught in production

**File:** `apps/marketing/src/app.tsx:47-51`
**Issue:** `flowTuple()` is called inside `App()` on every render and throws `'expected exactly 3 flow steps'` if `getFlowSteps()` returns anything other than exactly 3. Because `App` is the root component, an uncaught throw here blank-pages the entire marketing site (Preact has no error boundary). The throw is a useful guard during development but a footgun in production. Combined with WR-05's lack of error boundaries, a single data regression takes the whole page down.
**Fix:** Either add a Preact error boundary around `<App>` in `main.tsx`, or degrade gracefully — render the flow section with a fallback instead of throwing.

## Info

### IN-01: Locale toggle order of operations can briefly show stale `<html>` lang

**File:** `apps/marketing/src/app.tsx:88-93`
**Issue:** Inside the `.then`, the code sets `locale.value = next` (which synchronously re-renders `<App>` with the new `lang` attribute on the app-root div) and *then* sets `document.documentElement.lang`. For one microtask the app-root div's `lang` and `<html>`'s `lang` disagree. AT that reads `<html>` first will get the stale value. The two assignments should be reordered or atomic.
**Fix:** Set `document.documentElement.lang` *before* flipping `locale.value`.

### IN-02: `i18n/index.ts` falls back to returning the raw key — undetectable missing-key regression

**File:** `apps/marketing/src/i18n/index.ts:30-32`
**Issue:** `t()` returns the literal key string when a key is absent from both the current locale and `en`. There is no console warning and no test that asserts zero missing keys. The claims verifier checks *parity* between en/zh_CN but never checks that the union of keys covers everything `t()` is called with from JSX. A typo in a `t('foo.bar')` call silently renders the string `'foo.bar'` to users.
**Fix:** In dev mode, log a warning when `t()` returns its input unchanged. Consider a build-time grep that collects every `t('...')` literal and diff against the locale union.

### IN-03: `verify-claims.spec.ts` validInputs omits keys present in production locale

**File:** `tests/unit/scripts/verify-claims.spec.ts:14-60`
**Issue:** The `validInputs()` baseline carries only a subset of the real locale keys (e.g. it omits `useCases.title`, `payload.title`, `flow.title`, `hero.title`, etc.). This is fine for the rule-specific tests, but the parity test (line 131) only exercises *zh_CN missing a key en has* — there is no test for the reverse direction (en missing a key zh_CN has), nor for the case where both locales are missing the same key. Coverage of rule (c) is asymmetric.
**Fix:** Add a test variant that removes a key from `en` only and asserts the parity error fires with `missing in en:` wording.

### IN-04: CI step comment references stale WR ID

**File:** `.github/workflows/ci.yml:23`
**Issue:** The inline comment `# ─── Phase 16: marketing + claims gates (closes WR-03) ──────────────` cites "WR-03" but the phase context and the code-review history point to WR-06/IN-04 as the privacy-overclaim closure. Stale cross-references in CI comments make future audits harder.
**Fix:** Update the comment to reference the actual WR IDs being closed, or drop the ID entirely if it is not load-bearing.

---

_Reviewed: 2026-06-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
