# Phase 16: 发布验收与运营基线 - Research

**Researched:** 2026-06-14
**Domain:** Release acceptance — cross-source consistency verification, CI integration, a11y closeout, maintenance documentation, release-notes truth boundary
**Confidence:** HIGH (codebase-driven research; code patterns already proven in Phases 1-15)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROOF-03 | Visitor sees product evidence labeled with source/version status | Q1 verify:claims asserts the `mockup` proof label is present and the metadata keys (`proof.source/version/status`) exist in both locale files; Q3 a11y gate also scans dist |
| TRUST-01 | Visitor understands privacy model (user-triggered, local, no telemetry, no analytics) | Q1 verify:claims encodes 13-CONTENT-SOURCES CLM-PRIVACY-01 forbidden wording scan against `trust.privacy.*` strings (both locales); the gate fails if forbidden tokens (`cloud sync`, `our servers`, `usage analytics`, etc.) leak in |
| TRUST-02 | Visitor understands production permission model without dev-only or misleading claims | Q1 verify:claims reads built manifest (`.output/chrome-mv3/manifest.json`, same source as verify-manifest.ts) and asserts `trust.permissions.fact1` locale text === manifest.permissions set; forbids `tabs` and static `<all_urls>` from prod claim copy |
| TRUST-03 | Visitor distinguishes shipped capabilities from known risks and deferred platforms | Q1 verify:claims asserts platform section copy contains all 4 shipped platform names + Feishu/Lark lives ONLY in limits copy (extends the T-15-08 leakage test to a cross-source assertion against PROJECT.md) |
| OPS-01 | Maintainer can update platform list / privacy claims / screenshots / CTA from explicit source sections | Q4 formalizes the 13-CONTENT-SOURCES Maintenance Rules into a root `MAINTENANCE.md` referencing each source-first → artifact-second → page-last chain + the `assets:screenshot` script |
| OPS-02 | Maintainer can verify promotional claims match PROJECT.md / PRIVACY.md / STORE-LISTING.md / wxt.config.ts | Q1 verify:claims IS this verifier; Q6 the verify:claims.spec.ts covers pass/fail with synthetic inputs |
| BUILD-01 | Developer builds marketing page via dedicated static-site command without changing extension build | Already satisfied by Phase 14 (existing `site:build`); Phase 16 closes it out via Q2 CI integration (repeatable gate) |
| BUILD-02 | Developer previews / smoke-tests promotional page independently from extension E2E | Already satisfied by Phase 14 (`site:preview` + `site:verify`); Phase 16 closes out via CI |
| BUILD-03 | Promotional page code does not import extension runtime modules | Already satisfied by Phase 14 (`marketing-isolation.spec.ts`); Phase 16 re-runs in CI as part of `pnpm test` |

All 9 requirement IDs are addressed by Q1-Q7 below.
</phase_requirements>

## Summary

Phase 16 is a release-acceptance phase, not feature development. It converts static planning artifacts (the Claims Matrix and Verification Checklist in `13-CONTENT-SOURCES.md`) and the deferred WR items from Phase 15 VERIFICATION into **repeatable automated checks**: one new verifier script (`scripts/verify-claims.ts`), CI wiring for all marketing/claims gates, a11y closeout on the CtaButton external-link indication and the `lang` attribute, a maintenance doc, and a release-notes truth-boundary section in CHANGELOG.md.

The work is small in lines-of-code but high in leverage: it makes the Phase 13 Claims Matrix self-enforcing. Once `verify:claims` runs in CI, no future contributor can drift privacy/permission/platform copy past the source-of-truth documents without a red build.

**Primary recommendation:** Build `scripts/verify-claims.ts` as a single-source-of-truth verifier (reads built manifest like verify-manifest.ts; reads both locale JSON files; applies forbidden-wording lists + required-token lists sourced directly from 13-CONTENT-SOURCES Claims Matrix). Wire all marketing/claims gates into the existing single CI job (no parallel jobs — sub-10s additions). Close a11y via CtaButton SR-only "opens in new tab" text + visible `↗` glyph, and a `lang` attribute contract test. Add `MAINTENANCE.md` at root (formalize the 13-CONTENT-SOURCES Maintenance Rules) and a `## [v1.2]` CHANGELOG section with explicit Known Issues.

**Phase boundary (what Phase 16 does NOT redo from 13/14/15):**
- Does NOT rewrite Claims Matrix (13-CONTENT-SOURCES is the source-of-truth doc).
- Does NOT rebuild build isolation (Phase 14 verified; Phase 16 only wires the existing commands into CI).
- Does NOT rebuild the page content/visual (Phase 15 verified; Phase 16 only closes WR-08/WR-09 a11y items + WR-06/IN-04 claims drift).
- Does NOT do Telegram live UAT or Phase 11/12 Nyquist closeout (those are explicitly Out-of-Scope per PROJECT.md + REQUIREMENTS.md; Phase 16 only *records* them as honest boundaries in release notes).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Claims/privacy/permission consistency verification | Build / Node CLI | — | Pure Node-side static analysis (locale JSON + manifest JSON + source .md). No browser runtime. |
| CI gating | CI runner (GitHub Actions) | — | Repeatable-on-every-PR is the requirement; lives in `.github/workflows/ci.yml`. |
| External-link a11y indication | Browser / DOM (Preact component) | Frontend build | Visible glyph + SR-only text render in `cta-button.tsx`; contract test runs in Vitest (happy-dom). |
| `lang` attribute contract | Browser / DOM (Preact root element) | Frontend build | Rendered in `app.tsx`; contract test in Vitest. |
| Maintenance documentation | Repo root (markdown) | — | Static doc; referenced from CHANGELOG / README; no runtime. |
| Release notes truth boundary | Repo root (CHANGELOG.md) | — | git-cliff already owns CHANGELOG.md structure; Phase 16 inserts `## [v1.2]` section with honest Known Issues. |

## Standard Stack

This phase installs **zero new packages**. It uses the existing dev toolchain (verified via `package.json` + `apps/marketing/package.json`):

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tsx` | ^4.20.0 | Run verify:claims.ts as a Node script with TS support | Already used by verify-manifest.ts, verify-readme-anchors.ts, verify-changelog-release.ts, i18n-coverage.ts `[VERIFIED: package.json:28, 68]` |
| `vitest` | ^3.2.4 | Unit-test the verify:claims assertion function | Existing test runner; verify-manifest.spec.ts proves the pattern `[VERIFIED: package.json:71]` |
| `happy-dom` | ^15.0.0 | DOM test environment for lang attribute + CTA indication | Already used by app-sections.spec.tsx `[VERIFIED: package.json:60]` |
| `vitest run` | — | CI test command | Existing `pnpm test` script `[VERIFIED: package.json:23]` |
| `wxt build` | ^0.20.25 | Build extension → `.output/chrome-mv3/manifest.json` | verify:claims reads this artifact (same source as verify-manifest.ts) `[VERIFIED: wxt.config.ts:5, package.json:48]` |
| `preact` / `@preact/signals` | 10.29 / 2.0 | Render marketing app for tests | Already used by app.tsx + main.tsx `[VERIFIED: apps/marketing/package.json:13-14]` |

**No installation needed.** Verify scripts use only Node built-ins (`node:fs`, `node:path`, `node:url`) — same imports as verify-manifest.ts:20-22 `[CITED: scripts/verify-manifest.ts]`.

## Package Legitimacy Audit

Phase 16 installs **zero external packages**. Audit not applicable — `slopcheck install` was not run because there are no new packages to verify.

## Architecture Patterns

### System Architecture Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │  13-CONTENT-SOURCES.md              │
                                    │  (authoritative Claims Matrix:      │
                                    │   forbidden wording + allowed       │
                                    │   wording per claim ID)             │
                                    └───────────────┬─────────────────────┘
                                                    │ (human-curated source
                                                    │  of truth — referenced)
                                                    ▼
        ┌──────────────────────┐          ┌──────────────────────────┐
        │ wxt.config.ts prod   │          │ scripts/verify-claims.ts │
        │ branch               │          │  - assertClaims(...)     │
        └──────────┬───────────┘          │  - exports for unit test │
                   │ wxt build            │  - CLI entry guarded by   │
                   ▼                      │    isDirectInvocation    │
        ┌──────────────────────┐          └──────────┬───────────────┘
        │ .output/chrome-mv3/  │◄────────────────────┘ (reads built
        │   manifest.json      │                     manifest — single
        │   (prod branch only) │                     source of truth)
        └──────────────────────┘                      │
                                                      │ reads
        ┌──────────────────────┐                      ▼
        │ apps/marketing/src/  │──────────────►┌──────────────────────┐
        │   i18n/locales/      │ reads         │ PASS: exit 0         │
        │     en.json          │               │ FAIL: error + exit 1 │
        │     zh_CN.json       │               └──────────┬───────────┘
        └──────────────────────┘                          │
                                                      ┌───────┴────────┐
                                                      ▼                ▼
                                ┌─────────────────────────┐   ┌──────────────────────┐
                                │ .github/workflows/      │   │ tests/unit/scripts/  │
                                │   ci.yml                │   │   verify-claims.     │
                                │ - pnpm verify:manifest  │   │   spec.ts            │
                                │ - pnpm site:build       │   │ (synthetic JSON +   │
                                │ - pnpm site:verify      │   │  manifest → assert  │
                                │ - pnpm verify:claims    │   │  pass/fail)         │
                                │ - pnpm verify:readme    │   └──────────────────────┘
                                └─────────────────────────┘
```

Reader trace: a maintainer edits marketing locale privacy copy → CI runs `verify:claims` → reads built manifest + locale JSON + applies forbidden-wording list from Claims Matrix → fails the build if forbidden tokens appear or permission list drifts from manifest. The test file feeds synthetic inputs to the same assertion function to lock the failure-detection logic.

### Recommended Project Structure

```
scripts/
├── verify-claims.ts          # NEW — cross-source consistency verifier (Q1)
└── (existing verify-manifest.ts, verify-readme-anchors.ts, verify-changelog-release.ts)

tests/unit/scripts/
├── verify-claims.spec.ts     # NEW — unit test for assertClaims() (Q6)
└── (existing verify-manifest.spec.ts, marketing-verify-build.spec.ts)

tests/unit/marketing/
└── app-sections.spec.tsx     # EXTEND — add lang attribute contract test (Q3, WR-08)
                              #        + extend CTA test to assert SR-only indication (Q3, WR-09)

apps/marketing/src/components/
└── cta-button.tsx            # EDIT — add visible ↗ glyph + sr-only "opens in new tab" text (Q3, WR-09)

.github/workflows/
└── ci.yml                    # EDIT — add site:build + site:verify + verify:claims + verify:readme steps (Q2, WR-03)

package.json                  # EDIT — add "verify:claims": "tsx scripts/verify-claims.ts"
                              #        (deps on wxt build having run — same pattern as verify:manifest)

MAINTENANCE.md                # NEW — root-level maintainer doc (Q4, SC4)

CHANGELOG.md                  # EDIT — insert `## [v1.2]` section with Known Issues (Q5, SC5)

.planning/phases/16-release-acceptance-ops-baseline/
└── 16-RESEARCH.md            # this file
```

### Pattern 1: Single-source-of-truth verify script

**What:** Verify scripts read the BUILT artifact (not source `.ts`) so they see the production branch of `wxt.config.ts`. The assertion function is exported as a pure function `assertClaims(inputs: ..., errors: string[])` for unit-test consumption; the CLI entry is guarded by `isDirectInvocation` so importing the module from tests has no side effects.

**When to use:** Any verifier that gates cross-source consistency.

**Example:**
```typescript
// Source: pattern copied from scripts/verify-manifest.ts:24-194
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ClaimsInputs = {
  manifest: { permissions?: string[]; host_permissions?: string[] };
  locales: { en: Record<string, string>; zh_CN: Record<string, string> };
};

export function assertClaims(input: ClaimsInputs, errors: string[]): void {
  // (a) permission set single-source: locale text MUST equal built manifest
  const expectedPermSet = (input.manifest.permissions ?? []).slice().sort();
  for (const localeKey of ['en', 'zh_CN'] as const) {
    const text = input.locales[localeKey]['trust.permissions.fact1'] ?? '';
    // Assert each expected permission token appears in the locale text
    for (const perm of expectedPermSet) {
      if (!text.includes(perm)) {
        errors.push(`[${localeKey}] trust.permissions.fact1 missing token: ${perm}`);
      }
    }
    // Forbidden: production `tabs` claim
    if (/\btabs\b/i.test(text.replace(/\bwebNavigation\b/g, ''))) {
      errors.push(`[${localeKey}] trust.permissions.fact1 must not claim 'tabs' as production`);
    }
  }
  // (b) privacy forbidden wording scan (13-CONTENT-SOURCES Claims Matrix)
  const privacyForbidden = [
    'cloud sync', 'our servers', 'server-side processing',
    'usage analytics', 'user tracking', '云端存储', '用户行为分析',
  ];
  for (const localeKey of ['en', 'zh_CN'] as const) {
    for (const factKey of Object.keys(input.locales[localeKey]).filter((k) => k.startsWith('trust.privacy.'))) {
      const text = input.locales[localeKey][factKey] ?? '';
      for (const forbidden of privacyForbidden) {
        if (text.toLowerCase().includes(forbidden.toLowerCase())) {
          errors.push(`[${localeKey}] ${factKey} contains forbidden token: ${forbidden}`);
        }
      }
    }
  }
}

const isDirectInvocation =
  !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectInvocation) {
  // Read built manifest (single source of truth — same artifact verify-manifest.ts reads)
  const manifestPath = resolve(process.cwd(), '.output/chrome-mv3/manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`[verify-claims] FAIL: ${manifestPath} not found. Run \`pnpm build\` first.`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const en = JSON.parse(readFileSync(resolve(process.cwd(), 'apps/marketing/src/i18n/locales/en.json'), 'utf-8'));
  const zh_CN = JSON.parse(readFileSync(resolve(process.cwd(), 'apps/marketing/src/i18n/locales/zh_CN.json'), 'utf-8'));
  const errors: string[] = [];
  assertClaims({ manifest, locales: { en, zh_CN } }, errors);
  if (errors.length) {
    console.error('[verify-claims] FAIL:'); for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log('[verify-claims] OK — marketing claims match canonical sources');
}
```

`[CITED: scripts/verify-manifest.ts:24-194]` for the `assertX(inputs, errors)` + `isDirectInvocation` guard pattern; `[CITED: scripts/verify-readme-anchors.ts]` for the file-existence + accumulator pattern.

### Pattern 2: CI single-job extension (no parallel jobs)

**What:** Extend the existing `verify` job with new steps rather than adding parallel jobs.

**Why:** The marketing/claims gates add ~5-15 seconds total to a job that already runs in <2 minutes. Parallel jobs would require duplicate `actions/checkout` + `pnpm install --frozen-lockfile` (20-40s each) — net slower. The existing `cache: 'pnpm'` already handles monorepo lockfile caching per `[CITED: github.blog/changelog/2021-09-07]`.

**Example:**
```yaml
# .github/workflows/ci.yml — extend existing verify job steps
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm verify:manifest        # existing
      # ─── Phase 16: marketing + claims gates (closes WR-03) ──────────────────
      - run: pnpm site:build             # build apps/marketing/dist
      - run: pnpm site:verify            # verify-build.mjs smoke (17 markers)
      - run: pnpm verify:readme          # README anchor parity + PRIVACY existence
      - run: pnpm verify:claims          # NEW — cross-source consistency
```

Note: `verify:claims` requires `wxt build` to have run (it reads `.output/chrome-mv3/manifest.json`). `pnpm verify:manifest` already runs `wxt build` as its first step `[CITED: package.json:27]`, so by the time `verify:claims` runs in this step order, the manifest is present. No additional build needed.

`[CITED: .github/workflows/ci.yml]` (existing workflow); `[CITED: github.blog/changelog/2021-09-07-actions-setup-node-monorepo-pnpm]` (setup-node cache supports pnpm monorepo).

### Pattern 3: WCAG G201 external-link indication

**What:** For `target="_blank"` links, give (1) a visible warning and (2) an assistive-tech warning `[CITED: w3.org/WAI/WCAG21/Techniques/general/G201]`. The technique is advisory (no specific SC required) but is the documented canonical pattern.

**Recommended implementation (composes with existing CtaButton):**
```tsx
// apps/marketing/src/components/cta-button.tsx
export function CtaButton({ href, variant, testId, children }: CtaButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      aria-label={`${/* children as string */ ''} (opens in new tab)`}  // SEE NOTE
      class={`${baseClass} ${variantClass[variant]}`}
    >
      {children}
      <span aria-hidden="true" class="ml-1.5 inline-block translate-y-[1px]">↗</span>
      <span class="sr-only"> (opens in new tab)</span>
    </a>
  );
}
```

**NOTE on aria-label:** Use `aria-label` ONLY when `children` is a plain string. Since `children: ComponentChildren` may contain JSX, prefer the **sr-only span** approach as the primary AT warning (works regardless of children type) and the visible `↗` glyph as the visual warning. The `aria-label` variant is brittle when `children` is JSX. **Recommendation: sr-only span + visible glyph only; skip aria-label** unless all three CTAs pass plain-string children (which they do today — `hero.cta`, `cta.primary`, `cta.secondary` are all locale strings). Verify by inspecting `app.tsx:106-107, 242-247`.

`[CITED: w3.org/WAI/WCAG21/Techniques/general/G201]` — official technique description and examples (visual icon + `aria-describedby` or visible text).

### Pattern 4: lang attribute contract test

**What:** `app.tsx:56` computes `langAttr = locale.value === 'zh_CN' ? 'zh-CN' : 'en'` and renders `<div lang={langAttr}>`. The contract: (1) the lang attribute exists, (2) its value matches the active locale signal, (3) toggling locale flips the value. `[CITED: apps/marketing/src/app.tsx:56,71]`

**Example test (extends tests/unit/marketing/app-sections.spec.tsx):**
```tsx
describe('App — lang attribute contract (WR-08)', () => {
  it('renders a lang attribute matching the active locale signal', async () => {
    const locale = signal('en');
    await act(async () => { render(<App locale={locale} />, container); });
    await flush();
    const root = container.firstElementChild;
    expect(root?.getAttribute('lang')).toBe('en');
  });
  it('flips lang to zh-CN when locale signal toggles', async () => {
    const locale = signal('en');
    await act(async () => { render(<App locale={locale} />, container); });
    await flush();
    locale.value = 'zh_CN';
    await flush();
    expect(container.firstElementChild?.getAttribute('lang')).toBe('zh-CN');
  });
});
```

This pattern mirrors the existing `'locale toggle re-renders the whole page copy'` test at `app-sections.spec.tsx:131-144` `[CITED: tests/unit/marketing/app-sections.spec.tsx]`.

### Anti-Patterns to Avoid

- **Hardcoding the expected permission set in BOTH `verify-claims.ts` AND `verify-manifest.ts`.** This creates two sources of truth that will drift. Instead, `verify-claims.ts` READS the built manifest (single source) and asserts the locale copy matches it. If `wxt.config.ts` changes, both verifiers pick up the change automatically. `[CITED: 13-CONTENT-SOURCES.md CLM-PERM-01]` lists `wxt.config.ts` as the authoritative source.
- **String-equality assertion between marketing privacy text and PRIVACY.md verbatim quotes.** Marketing copy legitimately paraphrases. Use **forbidden-wording scan + required-token presence** instead (per Claims Matrix verification approach). `[CITED: 13-CONTENT-SOURCES.md Claims Matrix "Forbidden wording" column]`.
- **Adding parallel CI jobs for marketing gates.** Adds checkout+install overhead (40+ sec) for sub-10s of work. Single-job extension is idiomatic for a pnpm monorepo with `cache: 'pnpm'` `[CITED: github.blog/changelog/2021-09-07]`.
- **`aria-label` on CtaButton when children is JSX.** Screen readers may render the JSX as `[object Object]`. Prefer the sr-only span.
- **Creating a separate RELEASE-NOTES.md when CHANGELOG.md already exists with git-cliff tooling.** Duplicates the source of truth. Inject `## [v1.2]` into CHANGELOG.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission set verification | Re-parse `wxt.config.ts` source (mode branches, conditional arrays) | Read `.output/chrome-mv3/manifest.json` after `wxt build` (post-build artifact already resolves prod/dev branches) | verify-manifest.ts already does this; source-parsing is brittle (string-mode branch detection) `[CITED: scripts/verify-manifest.ts:168]` |
| Release notes | Custom RELEASE-NOTES.md format | CHANGELOG.md `## [v1.2]` section; cliff.toml already defines structure | git-cliff + verify-changelog-release.ts expect CHANGELOG.md `[CITED: cliff.toml, scripts/verify-changelog-release.ts]` |
| Maintenance rules | New doc inventing rules from scratch | Formalize `13-CONTENT-SOURCES.md §Maintenance Rules` into root `MAINTENANCE.md` | The rules already exist as auditable planning artifact; copying not re-deriving avoids drift `[CITED: 13-CONTENT-SOURCES.md:171-208]` |
| Cross-source platform truth | Re-derive platform list from a fourth source | Whitelist `[OpenClaw, Discord, Slack, Telegram]` (hardcoded constant — same as `verify-build.mjs:50-53`) + assert each appears in platform locale keys + assert Feishu/Lark appears ONLY in `limits.feishu` key | Project already converges on this set; verify-build.mjs precedent `[CITED: apps/marketing/scripts/verify-build.mjs:36-59]` |
| External-link a11y icon | Custom SVG component | Inline `↗` glyph + sr-only span | 1 byte of JS, no asset pipeline, G201-compliant `[CITED: w3.org/WAI/WCAG21/Techniques/general/G201]` |

**Key insight:** Every verification rule Phase 16 needs already exists in human-readable form in `13-CONTENT-SOURCES.md`. The phase's job is to encode those rules as code, not to invent new rules.

## Runtime State Inventory

> Phase 16 is a release-acceptance / documentation phase — NOT a rename/refactor/migration phase. This section is included only to confirm no runtime state is touched.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 16 changes no `chrome.storage` schema or marketing runtime data. | None |
| Live service config | None — no external services touched (no n8n, no hosted marketing site, no analytics). | None |
| OS-registered state | None — no pm2 / launchd / systemd / Task Scheduler changes. | None |
| Secrets/env vars | None — verify:claims reads only public repo files (manifest, locale JSON, PRIVACY.md, PROJECT.md). No secret reads. | None |
| Build artifacts | `.output/chrome-mv3/manifest.json` (read-only input to verify:claims — produced by `wxt build`). `apps/marketing/dist/` (produced by `site:build`). Both regenerated each CI run. | None — no stale artifacts to migrate |

## Common Pitfalls

### Pitfall 1: False-positive claims verification (Q7)
**What goes wrong:** `verify:claims` passes while real claims drift — e.g., marketing copy says "no server at all" while PRIVACY.md says "we do not operate or communicate with any remote server" (similar but distinct). A naive `text.includes('remote server')` check passes for both.
**Why it happens:** Claims drift is usually paraphrase, not deletion. Presence-only checks miss semantic widening/narrowing.
**How to avoid:** Layer three checks: (1) forbidden-wording scan (catches overt overclaims like "cloud sync"), (2) required-token presence (catches deletion — e.g., the word `operate` must appear in `fact4` because `PRIVACY.md` says "do not operate or communicate"), (3) cross-source set-equality for hard-set claims like the permission list (catches both add and remove). The strongest signal is forbidden wording — that's why the Claims Matrix has a "Forbidden wording" column.
**Warning signs:** A claims verifier that only checks "all source files exist" without applying the forbidden-wording lists is theater.

### Pitfall 2: Dev vs prod manifest branch (Q1)
**What goes wrong:** `verify:claims` reads `wxt.config.ts` source and accidentally sees the dev branch (which includes `tabs` + `<all_urls>`). It then fails because locale copy correctly omits `tabs`.
**Why it happens:** `wxt.config.ts:16-19` branches on `mode === 'development'`. The source has both arrays; only `wxt build` (no `--mode development`) produces the prod branch.
**How to avoid:** Always read `.output/chrome-mv3/manifest.json` AFTER `wxt build`. Never parse `wxt.config.ts`. verify-manifest.ts:168 already establishes this pattern. CI step order must ensure `verify:manifest` (which runs `wxt build`) runs before `verify:claims`.
**Warning signs:** Tests pass locally (where dev build artifacts may exist) but fail in CI (clean prod build).

### Pitfall 3: Locale key drift between en.json and zh_CN.json
**What goes wrong:** A future contributor adds `trust.privacy.fact7` to en.json but forgets zh_CN.json. `i18n-coverage.ts` checks key parity for the extension locales/ dir, NOT for `apps/marketing/src/i18n/locales/`. The marketing app has no equivalent coverage gate.
**Why it happens:** Marketing i18n is structurally separate from extension i18n (CLAUDE.md §约定 says `en` and `zh_CN` locale files must reach 100% key coverage — that rule is for extension locales, not marketing).
**How to avoid:** `verify:claims.ts` should ASSERT `Object.keys(en).length === Object.keys(zh_CN).length` AND `set symmetric difference is empty`. This is a one-line check that closes the structural gap.
**Warning signs:** A new privacy fact appears in English but Chinese visitors see the fallback key string.

### Pitfall 4: CI monorepo install cost
**What goes wrong:** Adding a separate `marketing` job doubles the install time (checkout + `pnpm install --frozen-lockfile` ≈ 30-40s) for ~10s of marketing verification.
**Why it happens:** Naive parallelization instinct — "different app = different job".
**How to avoid:** Use single-job step extension (Pattern 2). The existing `cache: 'pnpm'` handles the workspace install. Total added wall-clock time: ~10s.
**Warning signs:** CI time balloons past the existing `timeout-minutes: 10`.

### Pitfall 5: verify:claims depends on build order
**What goes wrong:** Running `pnpm verify:claims` standalone fails with "manifest.json not found" because `wxt build` hasn't run yet.
**Why it happens:** Same as verify-manifest.ts — needs the built artifact. The CLI entry must check `existsSync(manifestPath)` and emit a clear error pointing to `pnpm build` (verify-manifest.ts:170-173 pattern).
**How to avoid:** Two options: (a) `verify:claims` script = `wxt build && tsx scripts/verify-claims.ts` (mirror `verify:manifest` script `[CITED: package.json:27]`), or (b) emit clear error message. **Recommend (a)** for parity with verify:manifest — same cost, no surprise. In CI, `verify:manifest` already runs `wxt build` first, so a plain `tsx scripts/verify-claims.ts` step suffices in the CI sequence (but the standalone script should still self-build for `pnpm verify:claims` from a clean checkout).

### Pitfall 6: aria-label clobbering children for JSX
**What goes wrong:** Setting `aria-label` on `<a>{someJSX}</a>` causes screen readers to announce the label (replacing the accessible name computation) — but if computed from children that include JSX, the label string may be `[object Object]`.
**Why it happens:** `aria-label` overrides the accessible name from contents.
**How to avoid:** Use sr-only span as the AT warning (augments accessible name instead of replacing). Skip `aria-label` on CtaButton entirely. All three current CTAs pass plain-string children, so the sr-only span is sufficient.

## Code Examples

### verify:claims.spec.ts — TDD unit test pattern
```typescript
// Source: pattern copied from tests/unit/scripts/verify-manifest.spec.ts
import { describe, it, expect } from 'vitest';
import { assertClaims, type ClaimsInputs } from '@/scripts/verify-claims';

function validInputs(overrides: Partial<ClaimsInputs> = {}): ClaimsInputs {
  return {
    manifest: {
      permissions: ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation'],
      host_permissions: ['https://discord.com/*', 'https://app.slack.com/*', 'https://slack.com/*', 'https://web.telegram.org/*'],
    },
    locales: {
      en: {
        'trust.permissions.fact1': 'Production permissions: activeTab, alarms, scripting, storage, webNavigation.',
        'trust.privacy.fact4': 'No remote server — the extension never operates or communicates with one.',
      },
      zh_CN: {
        'trust.permissions.fact1': '生产权限：activeTab、alarms、scripting、storage、webNavigation。',
        'trust.privacy.fact4': '不运营远程服务器——扩展不连接任何服务器。',
      },
    },
    ...overrides,
  };
}

describe('verify-claims assertClaims', () => {
  it('valid inputs produce no errors', () => {
    const errors: string[] = [];
    assertClaims(validInputs(), errors);
    expect(errors).toEqual([]);
  });

  it('locale text missing a permission token produces error', () => {
    const errors: string[] = [];
    assertClaims(validInputs({
      locales: {
        en: { 'trust.permissions.fact1': 'Production permissions: activeTab, scripting, storage.' }, // missing alarms, webNavigation
        zh_CN: { 'trust.permissions.fact1': '生产权限：activeTab, scripting, storage.' },
      },
    }), errors);
    expect(errors.some((e) => e.includes('alarms'))).toBe(true);
  });

  it('forbidden privacy wording produces error', () => {
    const errors: string[] = [];
    assertClaims(validInputs({
      locales: {
        en: { 'trust.privacy.fact4': 'Cloud sync enabled, no remote server.' },
        zh_CN: { 'trust.privacy.fact4': '支持云端存储。' },
      },
    }), errors);
    expect(errors.some((e) => e.includes('cloud sync') || e.includes('云端存储'))).toBe(true);
  });

  it('locale claiming production tabs permission produces error', () => {
    const errors: string[] = [];
    assertClaims(validInputs({
      locales: {
        en: { 'trust.permissions.fact1': 'Production permissions: activeTab, alarms, scripting, storage, webNavigation, tabs.' },
        zh_CN: { 'trust.permissions.fact1': '生产权限：activeTab, alarms, scripting, storage, webNavigation, tabs.' },
      },
    }), errors);
    expect(errors.some((e) => e.includes('tabs'))).toBe(true);
  });
});
```

`[CITED: tests/unit/scripts/verify-manifest.spec.ts:1-109]` — the canonical project pattern (synthetic inputs, no real filesystem mutation, `validX(overrides)` factory).

### CtaButton external-link indication — extend existing test
```tsx
// tests/unit/marketing/app-sections.spec.tsx — extend 'hero and bottom CTAs expose explicit external-link semantics'
it('each CTA exposes a visible external-link glyph and an sr-only new-tab warning (WCAG G201, WR-09)', async () => {
  await renderApp();
  for (const testId of ['hero-primary-cta', 'footer-primary-cta', 'footer-secondary-cta']) {
    const link = container.querySelector(`[data-testid="${testId}"]`);
    // SR-only warning text — must be present and visually hidden
    const srOnly = link?.querySelector('.sr-only');
    expect(srOnly?.textContent).toMatch(/opens? in new tab/i);
    // Visible glyph — must be present and hidden from AT
    const glyph = link?.querySelector('[aria-hidden="true"]');
    expect(glyph).toBeTruthy();
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pre-2021: `actions/setup-node` had no pnpm cache | `cache: 'pnpm'` on `setup-node` handles monorepo lockfile caching natively | 2021-09 (GitHub changelog) | No need for separate cache step or composite action `[CITED: github.blog/changelog/2021-09-07]` |
| Pre-WCAG-2.1: external links rarely indicated | G201 documented; visible icon + sr-only text is the canonical pattern | WCAG 2.1 (2018) | No new library needed — inline glyph + sr-only span suffices |
| Marketing i18n not in CI (Phase 14/15 ran manually) | CI integration closes the manual gap | Phase 16 | Repeatability: every PR runs marketing build + verify |

## Assumptions Log

> All claims in this research are either VERIFIED via direct codebase read or CITED via official docs. The few ASSUMED items are flagged.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 3 CTAs in app.tsx all pass plain-string children (so sr-only span suffices, no aria-label needed) | Pattern 3, Pitfall 6 | LOW — verified by reading app.tsx:106-107,242-247; all children are `t('hero.cta')`, `t('cta.primary')`, `t('cta.secondary')` which resolve to strings |
| A2 | `i18n-coverage.ts` only checks `locales/` (extension), not `apps/marketing/src/i18n/locales/` | Pitfall 3 | LOW — Phase 16 should verify by reading the script; even if it does cover marketing, adding key-parity to verify:claims is harmless |
| A3 | Maintainer prefers a single root `MAINTENANCE.md` over a `docs/` directory | Q4 | MEDIUM — needs planner confirmation; alternate is `docs/maintenance.md`. CLAUDE.md notes project has no `docs/` dir; lighter to add root file. The planner can decide. |
| A4 | CHANGELOG.md `## [v1.2]` section is the right home for release notes (vs separate RELEASE-NOTES.md) | Q5 | LOW — cliff.toml + verify-changelog-release.ts establish CHANGELOG.md as the canonical file. Strong precedent. |
| A5 | `.sr-only` utility class is already defined in the marketing Tailwind config or design tokens | Pattern 3 | MEDIUM — needs verification during planning. If absent, the CtaButton edit must add the class (3 lines: `position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0`). |

**A3 and A5 are the only items that genuinely warrant planner/user confirmation.** The rest are LOW risk.

## Open Questions

1. **Where should `.sr-only` live?**
   - What we know: WCAG G201 needs visually-hidden text. Tailwind v4 may or may not ship `.sr-only` by default.
   - What's unclear: Whether `apps/marketing/src/styles/index.css` or `shared/styles/design-tokens.css` already defines it.
   - Recommendation: Planner Wave 0 task: `grep -r "sr-only" apps/marketing/src/ shared/styles/`. If absent, add to `apps/marketing/src/styles/index.css` (marketing-local — keep out of shared tokens per Phase 15's "shared tokens untouched" guardrail).

2. **Should verify:claims also assert PROJECT.md platform set textually?**
   - What we know: PROJECT.md says "Current shipped platform set: OpenClaw / Discord / Slack / Telegram". 13-CONTENT-SOURCES CLM-PLATFORM-01 lists the same set.
   - What's unclear: Whether to grep PROJECT.md at verify-time (cross-source check from a third doc) or treat the locale-key presence check as sufficient (since site-content already sources from PROJECT.md-via-13-CONTENT-SOURCES).
   - Recommendation: Keep verify:claims to TWO sources per claim (locale JSON + manifest OR locale JSON + forbidden-wording list). Three-source checks create tri-directional drift. The platform set is already locked by `verify-build.mjs:50-53` REQUIRED_PAGE_MARKERS `[CITED: apps/marketing/scripts/verify-build.mjs:36-59]`. Phase 16 should add a `verify:claims` assertion that the 4 platform names appear in `supportedPlatforms.*` locale keys, but NOT scan PROJECT.md.

3. **Should maintenance doc reference each Phase 15 screenshot command or just `pnpm assets:screenshot`?**
   - What we know: `scripts/screenshot-assets.mjs` exists (1935 bytes). 13-CONTENT-SOURCES §Maintenance Rules already names it `[CITED: 13-CONTENT-SOURCES.md:195]`.
   - Recommendation: Reference only `pnpm assets:screenshot` (the script's npm entry) — keep doc stable if internal script path changes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 20 | CI runner; tsx scripts | ✓ | 20.x (CI) / local matches `engines: ">=20.19"` | — |
| pnpm 10 | Workspace install | ✓ | 10.33.4 (`packageManager` field) | — |
| tsx 4.20 | verify:claims script runner | ✓ | 4.20.x | — |
| vitest 3.2 | verify-claims.spec.ts | ✓ | 3.2.4 | — |
| happy-dom 15 | lang + CTA indication tests | ✓ | 15.x | — |
| WXT 0.20 | `wxt build` produces manifest for verify:claims | ✓ | 0.20.25 | — |
| GitHub Actions ubuntu-latest | CI runner | ✓ | existing ci.yml uses it | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` |
| Full suite command | `pnpm test` (58 files / 500+ tests baseline from Phase 15) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROOF-03 | proof label + metadata keys exist in both locales; mockup marker in dist | unit + smoke | `pnpm test -- tests/unit/scripts/verify-claims.spec.ts && pnpm site:build && pnpm site:verify` | ❌ Wave 0 (verify-claims.spec.ts new); ✅ verify-build.mjs already covers dist marker |
| TRUST-01 | privacy forbidden-wording scan against both locales | unit | `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` | ❌ Wave 0 |
| TRUST-02 | locale permission text === built manifest set; no `tabs`/`<all_urls>` prod claim | unit + integration | `pnpm verify:claims` (integration: reads real manifest); `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` (unit: synthetic manifest) | ❌ Wave 0 |
| TRUST-03 | platform truth: 4 shipped names in platform locale keys; Feishu/Lark only in limits | unit | `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` | ❌ Wave 0 |
| OPS-01 | MAINTENATION.md documents source-first update path per claim category | manual / doc audit | (no automated test — doc is the deliverable) | N/A |
| OPS-02 | `pnpm verify:claims` runs as a single command | integration | `pnpm verify:claims` | ❌ Wave 0 (script + npm script new) |
| BUILD-01 | `pnpm site:build` runs in CI without changing extension build | integration (CI) | `.github/workflows/ci.yml` step runs `site:build` then `verify:manifest` separately | ✅ existing; ❌ Wave 0 for CI wiring |
| BUILD-02 | `pnpm site:verify` runs in CI independently of `test:e2e` | integration (CI) | CI step runs `site:verify` after `site:build` | ❌ Wave 0 for CI wiring |
| BUILD-03 | `marketing-isolation.spec.ts` still passes in CI | unit | `pnpm test -- tests/unit/scripts/marketing-isolation.spec.ts` | ✅ existing (Phase 14) |

**Nyquist-relevant observability — what each gate samples, and what would slip through undetected:**

| Gate | Samples (what it observes) | Blind spot (what would slip through) |
|------|---------------------------|--------------------------------------|
| `verify:claims` permission set check | Locale text vs built manifest permission set equality | A semantic rephrase that drops a permission token (caught by required-token) — but adding a NEW permission token to locale copy that the manifest doesn't have is NOT caught unless we assert reverse set-equality (recommended) |
| `verify:claims` privacy forbidden-wording scan | Overt overclaims (`cloud sync`, `our servers`, etc.) | Subtle paraphrase that widens scope without using forbidden tokens — e.g., "the extension never touches a server" (G201-style widening). Mitigation: required-token presence (must contain `operate` OR `communicate` to match PRIVACY.md phrasing) |
| `site:verify` 17 markers | Hard-coded English strings present in built JS chunks | A zh_CN chunk regression (WR-02) — Chinese strings are NOT in REQUIRED_PAGE_MARKERS. Mitigation: add at least 2 zh_CN markers in Wave 0 (closes WR-02) |
| `app-sections.spec.tsx` lang test | Lang attribute exists and matches signal | The lang value being WRONG (e.g., `zh-Hans-CN` when signal is `zh_CN`) — caught by exact-match assertion |
| CtaButton G201 indication test | sr-only span text + visible glyph present in DOM | Glyph being visually hidden by CSS (e.g., `display:none` on parent) — DOM test doesn't catch. Acceptable tradeoff (visual review is Phase 15's human_needed scope) |

**Validation gap closure vs Phase 15 deferred WR items:**

| Phase 15 Deferred Item | Phase 16 Closure Mechanism |
|---|---|
| WR-06/IN-04 (privacy copy exceeds PRIVACY.md) | `verify:claims` forbidden-wording + required-token scan against `trust.privacy.*` |
| WR-03 (CI missing site:build / site:verify / verify:readme / verify:claims) | Pattern 2 CI step extension |
| WR-09 (CTA external-link G201) | Pattern 3 CtaButton edit + app-sections.spec.tsx test extension |
| WR-08 (lang attribute no contract test) | Pattern 4 app-sections.spec.tsx lang test |
| WR-01 (smoke gate data-testid reliance) | Wave 0 — strengthen verify-build.mjs with 2+ non-testid markers (optional; not blocking) |
| WR-02 (smoke markers no zh_CN marker) | Wave 0 — add 2 zh_CN markers to REQUIRED_PAGE_MARKERS (optional; not blocking but recommended for parity) |
| WR-05 (locale detection zh-Hans-CN mismatch) | Out of Phase 16 scope (user-experience bug in main.tsx:10 `navigator.language.replace('-', '_')` doesn't handle `zh-Hans-CN`); flag for v1.3 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` (sub-second) + `pnpm typecheck`
- **Per wave merge:** `pnpm test` (full suite) + `pnpm verify:manifest` + `pnpm site:build && pnpm site:verify && pnpm verify:claims && pnpm verify:readme`
- **Phase gate:** Full suite green + `pnpm verify:claims` green + CI workflow green on push before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/verify-claims.ts` — covers TRUST-01/02/03, PROOF-03 (partial), OPS-02
- [ ] `tests/unit/scripts/verify-claims.spec.ts` — TDD unit test for assertClaims() (workflow.tdd_mode=true — RED test first)
- [ ] `tests/unit/marketing/app-sections.spec.tsx` — extend with lang attribute test (WR-08) + CTA G201 indication test (WR-09)
- [ ] `apps/marketing/src/styles/index.css` — confirm `.sr-only` class exists or add it (Wave 0 investigation: `grep -r "sr-only" apps/marketing/src/ shared/styles/`)
- [ ] `apps/marketing/scripts/verify-build.mjs` — add 2 zh_CN markers to REQUIRED_PAGE_MARKERS (optional, closes WR-02)
- [ ] `.github/workflows/ci.yml` — extend verify job with 4 new steps
- [ ] `MAINTENANCE.md` — new root doc formalizing 13-CONTENT-SOURCES Maintenance Rules
- [ ] `CHANGELOG.md` — `## [v1.2]` section with Known Issues (Telegram UAT, Nyquist partial, Feishu/Lark dropped)
- [ ] `package.json` — add `"verify:claims": "wxt build && tsx scripts/verify-claims.ts"` script

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 16 has no auth surface |
| V3 Session Management | no | Phase 16 has no session state |
| V4 Access Control | no | Static-site + CI scripts; no access control |
| V5 Input Validation | yes (low) | verify:claims reads JSON files — already schema-validated by TS types; no untrusted input |
| V6 Cryptography | no | No crypto operations |
| V7 Error Handling | yes (low) | verify:claims must emit clear errors, never crash silently; follows verify-manifest.ts pattern (accumulator + exit 1) |
| V8 Data Protection | yes | Phase 16 ENFORCES privacy claims (TRUST-01) — this IS the privacy-control gate |
| V13 API & Web Service | no | No API surface |

### Known Threat Patterns for verify-script + static-site

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Claim drift (privacy copy widens scope post-release) | Spoofing (false trust signal to user) | `verify:claims` forbidden-wording + required-token scan; CI gate prevents merge |
| Permission claim vs manifest drift | Tampering | `verify:claims` set-equality check reads built manifest (single source) |
| Forbidden platform name (Feishu/Lark) leaking into shipped copy | Information disclosure (misrepresents shipped scope) | `verify:claims` asserts platform-name presence ONLY in limits copy + existing `app-sections.spec.tsx:292-301` leakage test |
| Broken install CTA link | Denial of service (user can't install) | `verify:readme` already guards README `## 安装` anchor; Phase 16 wires into CI |

## Sources

### Primary (HIGH confidence)
- Direct codebase reads (all `[CITED]` tags reference line-precise locations):
  - `scripts/verify-manifest.ts:24-194` — `assertManifest(manifest, errors)` + `isDirectInvocation` guard pattern
  - `scripts/verify-readme-anchors.ts` — file-existence + accumulator + clear error pattern
  - `scripts/verify-changelog-release.ts` — CHANGELOG.md as canonical release-notes source
  - `apps/marketing/scripts/verify-build.mjs:36-128` — `assertBuildOutput(distDir, errors)` + REQUIRED_PAGE_MARKERS pattern
  - `tests/unit/scripts/verify-manifest.spec.ts:1-109` — synthetic-inputs unit test pattern
  - `tests/unit/marketing/app-sections.spec.tsx:131-302` — locale-toggle + platform-truth test patterns
  - `apps/marketing/src/components/cta-button.tsx:44-56` — current target/rel state (WR-09)
  - `apps/marketing/src/app.tsx:56,71` — current lang attribute state (WR-08)
  - `apps/marketing/src/main.tsx:10` — locale detection (WR-05 source)
  - `apps/marketing/src/i18n/locales/en.json` + `zh_CN.json` — privacy/permission copy (WR-06 source)
  - `wxt.config.ts:5-65` — dev/prod manifest branch
  - `package.json:11-37` — existing scripts (verify:manifest, verify:readme, site:*, test:i18n-coverage)
  - `.github/workflows/ci.yml` — current CI (extension-only)
  - `PRIVACY.md` + `PRIVACY.zh_CN.md` — privacy claim source
  - `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` — Claims Matrix, Maintenance Rules, Verification Checklist
  - `.planning/phases/15-promotional-page-content-visual/15-VERIFICATION.md:80-86, 150-162` — deferred WR items
  - `.planning/phases/14-marketing-app-skeleton-build-isolation/14-VERIFICATION.md:96-100` — BUILD-01/02/03 already satisfied
  - `.planning/PROJECT.md:11-13,93,96-97` — core value, shipped platform set, known closeout gaps
  - `.planning/STATE.md:80-83` — deferred items (telegram-live-uat, feishu-lark, nyquist)
  - `.planning/REQUIREMENTS.md` — requirement ID definitions
  - `.planning/ROADMAP.md:110-122` — Phase 16 success criteria
  - `CLAUDE.md` — project conventions (permission model, i18n 100% coverage, tsx pattern)
  - `CHANGELOG.md:1-40` — existing v1.0.1/v1.1 structure
  - `cliff.toml` — git-cliff configuration

### Secondary (MEDIUM confidence — official docs)
- [W3C G201: Giving users advanced warning when opening a new window](https://www.w3.org/WAI/WCAG21/Techniques/general/G201) — official WCAG 2.1 technique. Key extracts: "The objective of this technique is to provide advanced warning for links and buttons that open a new window or tab"; "This technique is advisory"; expected tests: "Check that there is a warning spoken in assistive technology" AND "Check that there is a visual warning/indication". The Example 2 (icon + `aria-describedby`) and the "(opens in new window)" text-in-label pattern are both cited.
- [GitHub Actions setup-node supports dependency caching for pnpm monorepo](https://github.blog/changelog/2021-09-07-github-actions-setup-node-supports-dependency-caching-for-projects-with-monorepo-and-pnpm-package-manager/) — confirms `cache: 'pnpm'` handles monorepo lockfile caching natively; no separate cache step needed.
- [pnpm Continuous Integration docs](https://pnpm.io/continuous-integration) — official pnpm CI patterns.

### Tertiary (LOW confidence — used only to triangulate CI strategy)
- [How to Handle Monorepos with GitHub Actions – OneUptime](https://oneuptime.com/blog/post/2026-01-26-monorepos-github-actions/view) — corroborates single-job-with-cache vs parallel-jobs tradeoff for small monorepos.
- [Stack Overflow: Run PNPM workspace projects as parallel jobs](https://stackoverflow.com/questions/68427503) — corroborates that matrix-parallel is only worth it when install time < build time of individual packages. For this project (sub-10s marketing gates), single-job wins.

These tertiary sources were used only to confirm the recommendation (single-job); the recommendation stands on first-principles reasoning (Pattern 2) even without them.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all tooling already in repo (verified by reading package.json + apps/marketing/package.json)
- Architecture (verify:claims single-source): HIGH — direct adaptation of verify-manifest.ts pattern (CITED line-precise)
- Architecture (CI single-job): HIGH — based on existing ci.yml + GitHub changelog + first-principles (no install-overhead math)
- Architecture (G201 a11y pattern): HIGH — official W3C technique page read in full
- Pitfalls: HIGH — each pitfall references a concrete codebase reality
- Maintenance doc home: MEDIUM — A3 assumption flagged for planner

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (30 days — stable domain; no fast-moving dependencies)
