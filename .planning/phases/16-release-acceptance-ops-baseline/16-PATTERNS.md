# Phase 16: 发布验收与运营基线 - Pattern Map

**Mapped:** 2026-06-14
**Files analyzed:** 9 (3 new + 6 modified)
**Analogs found:** 9 / 9 (all files have a precise in-repo analog)

> Phase 16 is a release-acceptance phase: every new/modified file is HIGH-ANALOG to a proven Phase 1–15 pattern. This document consolidates the line-precise citations already present in `16-RESEARCH.md` into the per-file analog format the planner consumes. No new packages, no new architectural patterns.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/verify-claims.ts` (NEW) | utility (verifier) | file-I/O / static-analysis | `scripts/verify-manifest.ts` | **exact** (same `assertX(inputs, errors)` + `isDirectInvocation` shape) |
| `tests/unit/scripts/verify-claims.spec.ts` (NEW) | test | pure-function unit | `tests/unit/scripts/verify-manifest.spec.ts` | **exact** (synthetic inputs, `validX(overrides)` factory) |
| `MAINTENANCE.md` (NEW, root) | config (documentation) | static-doc | `README.md` structure + `13-CONTENT-SOURCES.md §Maintenance Rules` (lines 169–208) | **role-match** (no identical root maintainer-doc; README provides the structural template) |
| `package.json` (EDIT) | config | static-config | existing `scripts` block — `verify:manifest` line at `package.json:27` | **exact** (insertion of one sibling script entry) |
| `.github/workflows/ci.yml` (EDIT) | config (CI) | request-response (CI runner) | existing `verify` job step list `ci.yml:11–22` | **exact** (single-job step extension; Pattern 2) |
| `apps/marketing/src/components/cta-button.tsx` (EDIT) | component | render (request-response-ish, per-render) | current `cta-button.tsx:44–56` `target`/`rel` block | **exact** (extend existing `<a>` with sr-only span + visible glyph — Pattern 3) |
| `apps/marketing/src/main.tsx` (EDIT) | component (root bootstrap) | file-I/O / init | current `main.tsx:7–15` locale-detection block | **exact** (append `document.documentElement.lang` set after detection — T-15-09 follow-on) |
| `apps/marketing/src/app.tsx` (EDIT) | component | render | current `app.tsx:56` `langAttr` + `app.tsx:84–91` toggle onClick | **exact** (the toggle onClick is the single place to mirror the `document.documentElement.lang` set) |
| `tests/unit/marketing/app-sections.spec.tsx` (EDIT, EXTEND) | test | pure-function unit (happy-dom) | existing CTA test `app-sections.spec.tsx:174–192` + locale-toggle test `app-sections.spec.tsx:131–144` | **exact** (extend existing `describe` blocks; Pattern 4) |
| `CHANGELOG.md` (EDIT, INSERT) | config (release notes) | static-doc | existing `## [v1.1] - 2026-05-31` block `CHANGELOG.md:5–37` | **exact** (insert `## [v1.2]` section with same heading structure + Known Issues subsection) |
| `apps/marketing/scripts/verify-build.mjs` (EDIT, OPTIONAL WR-02) | utility (verifier) | file-I/O | current `REQUIRED_PAGE_MARKERS` array `verify-build.mjs:36–59` | **exact** (append 2 zh_CN marker strings) |

---

## Pattern Assignments

### `scripts/verify-claims.ts` (utility, static-analysis / file-I/O)

**Analog:** `scripts/verify-manifest.ts` — copy the **shape verbatim**; only the assertion bodies change.

**Imports pattern** (copy from `scripts/verify-manifest.ts:20–22`):
```typescript
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
```
Project convention: verify scripts use **only Node built-ins**. Zero npm imports at runtime. Same convention in `verify-readme-anchors.ts:17–19` and `verify-build.mjs:22–24`.

**Type + pure-assertion function pattern** (copy from `scripts/verify-manifest.ts:24–45, 63–158`):
```typescript
export type ClaimsInputs = {
  manifest: { permissions?: string[]; host_permissions?: string[] };
  locales: { en: Record<string, string>; zh_CN: Record<string, string> };
};

/**
 * Pure assertion function — appends error strings into `errors` for any
 * invariant violation. Exported so tests/unit/scripts/verify-claims.spec.ts
 * can drive it with synthetic inputs (no need to mutate locale files to test
 * failure paths).
 */
export function assertClaims(input: ClaimsInputs, errors: string[]): void {
  // (a) permission set: locale text MUST contain each built-manifest token;
  //     must NOT claim production `tabs` (CLM-PERM-01).
  // (b) privacy forbidden-wording scan (CLM-PRIVACY-01 forbidden column).
  // (c) locale key parity: Object.keys(en) === Object.keys(zh_CN) (Pitfall 3).
  // (d) platform truth: 4 shipped names appear; Feishu/Lark ONLY in limits
  //     key (CLM-PLATFORM-01 / CLM-LIMIT-02).
}
```
Rule shape — adopt the **`expectSet` + `errors.push`** idiom from `verify-manifest.ts:47–55` for set-equality checks; adopt the **forbidden-wording scan loop** from RESEARCH Pattern 1 lines 182–196 for the privacy scan.

**CLI entry + side-effect guard pattern** (copy verbatim from `scripts/verify-manifest.ts:164–194`):
```typescript
const isDirectInvocation =
  !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectInvocation) {
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
    console.error('[verify-claims] FAIL:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log('[verify-claims] OK — marketing claims match canonical sources');
}
```
This guard is load-bearing: without it, importing the module from `verify-claims.spec.ts` would run the CLI path and fail because the built manifest is absent (the same bug verify-manifest.ts had and fixed in commit `0b23bb2`).

**Error handling pattern** (copy from `scripts/verify-manifest.ts:178–183`):
```typescript
if (errors.length) {
  console.error('[verify-manifest] FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
```
Convention: prefix all stderr lines with `[<script-name>]`; emit `OK — <human-readable summary>` to stdout on success.

**Single-source-of-truth rule (ANTI-PATTERN — do NOT do this):**
- ❌ Re-parse `wxt.config.ts` to derive the expected permission set. Source-parsing is brittle because of the `mode === 'development'` branch at `wxt.config.ts:16–19`.
- ✅ Always read `.output/chrome-mv3/manifest.json` after `wxt build` — the prod branch is already resolved. This is the precedent in `verify-manifest.ts:168, 174`.

**Forbidden-wording lists source-of-truth:**
- The forbidden tokens come from `13-CONTENT-SOURCES.md` Claims Matrix rows CLM-PRIVACY-01 and CLM-PERM-01 (the "Forbidden wording" column).
- Do NOT invent new forbidden wording in code. Encode exactly the matrix entries:
  - `'cloud sync'`, `'our servers'`, `'server-side processing'`, `'usage analytics'`, `'user tracking'`, `'云端存储'`, `'用户行为分析'`
  - production `'tabs'` permission claim, static production `'<all_urls>'` host permission claim

---

### `tests/unit/scripts/verify-claims.spec.ts` (test, pure-function unit)

**Analog:** `tests/unit/scripts/verify-manifest.spec.ts` — copy the test scaffolding and the `validX(overrides)` factory pattern verbatim.

**Imports pattern** (copy from `tests/unit/scripts/verify-manifest.spec.ts:1–2`):
```typescript
import { describe, it, expect } from 'vitest';
import { assertClaims, type ClaimsInputs } from '@/scripts/verify-claims';
```
Path alias `@/` is already wired (used by `verify-manifest.spec.ts:2`); no new alias needed.

**Factory pattern** (copy from `tests/unit/scripts/verify-manifest.spec.ts:4–26`):
```typescript
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
```
Convention: factory returns the **valid baseline**; each failure test applies a surgical override that triggers exactly one assertion. Do NOT mutate real locale files in tests — the spec is hermetic.

**Test list pattern** (mirror the 8-case shape from `verify-manifest.spec.ts:28–109`):
```typescript
describe('verify-claims assertClaims', () => {
  it('valid inputs produce no errors', () => { /* validInputs() → errors empty */ });
  it('locale text missing a permission token produces error', () => { /* override fact1 minus 'alarms' */ });
  it('forbidden privacy wording produces error', () => { /* override fact4 with 'Cloud sync' / '云端存储' */ });
  it('locale claiming production tabs permission produces error', () => { /* override fact1 with 'tabs' */ });
  it('locale key parity violation produces error', () => { /* zh_CN missing one key present in en */ });
  it('platform section missing a shipped platform name produces error', () => { /* override supportedPlatforms keys */ });
  it('Feishu/Lark leaking outside limits copy produces error', () => { /* override with 飞书 in supportedPlatforms key */ });
});
```
Full concrete bodies for the first 4 cases are already in RESEARCH.md `## Code Examples` lines 374–440 — the planner can lift them verbatim.

**TDD discipline:** project uses `tdd_mode=true` (CLAUDE.md §GSD). Plan Wave 0 must write the RED test first (importing `assertClaims` from a not-yet-created module), then implement the module to turn tests GREEN.

---

### `MAINTENANCE.md` (config / documentation, NEW at root)

**Analog:** structural template from `README.md` headings + content source from `13-CONTENT-SOURCES.md §Maintenance Rules` (lines 169–208).

**File placement decision (RESOLVED, was A3 open question):**
- CLAUDE.md notes the project has no `docs/` directory and all root-level markdown docs (README, PRIVACY, CHANGELOG) live at repo root.
- **Recommendation: place `MAINTENANCE.md` at repo root** (alongside `README.md`, `PRIVACY.md`, `CHANGELOG.md`). The planner should treat this as the locked decision unless CONTEXT.md overrides.

**Structural template** (copy the heading style from `README.md`):
```markdown
# web2chat 维护指南 (Maintenance)

> Source-first → artifact-second → page-last update paths for marketing claims.
> Formalizes the Maintenance Rules from `13-CONTENT-SOURCES.md` (lines 169–208)
> so maintainers hit the canonical source before touching the page.

## 平台列表 (Platform list)
1. **Source first:** `.planning/PROJECT.md` Current shipped platform set + Key Decisions
2. **Artifact second:** `13-CONTENT-SOURCES.md` Platform Status + CLM-PLATFORM-01
3. **Page last:** `apps/marketing/src/data/site-content.ts` supportedPlatforms + Known limits section
4. **Verify:** `pnpm verify:claims` (platform-name presence + Feishu/Lark leakage check)

## 隐私声明 (Privacy claims)
1. **Source first:** `PRIVACY.md` / `PRIVACY.zh_CN.md` privacy model
2. **Artifact second:** `13-CONTENT-SOURCES.md` CLM-PRIVACY-01 + Privacy / Permission Guardrails
3. **Page last:** `apps/marketing/src/i18n/locales/{en,zh_CN}.json` `trust.privacy.*` keys
4. **Verify:** `pnpm verify:claims` (forbidden-wording scan)

## 权限声明 (Permission claims)
1. **Source first:** `wxt.config.ts` production manifest branch (lines 5–65)
2. **Verify:** `pnpm verify:manifest` (manifest shape) + `pnpm verify:claims` (locale text === built manifest set)
3. **Artifact second:** `13-CONTENT-SOURCES.md` CLM-PERM-01
4. **Page last:** `apps/marketing/src/i18n/locales/{en,zh_CN}.json` `trust.permissions.fact1`

## 截图 / mockup / diagram / placeholder
1. **Source first:** `pnpm assets:screenshot` (regenerates from a built running extension)
2. **Artifact second:** `13-CONTENT-SOURCES.md` Asset Status Rules metadata (version, date, owner)
3. **Page last:** `apps/marketing/src/components/proof/*` proof modules

## CTA 文案 (CTA text)
1. **Source first:** verify `apps/marketing/src/data/site-content.ts` `REPO_URL` / `INSTALL_URL` resolve and are accessible
2. **Artifact second:** `13-CONTENT-SOURCES.md` Page Outline CTA section
3. **Page last:** `apps/marketing/src/app.tsx` Hero CTA + bottom CTA `<CtaButton>` usage

## 验证命令清单 (Verification command cheatsheet)
| What to verify | Command |
|----------------|---------|
| Manifest shape (permissions, host_permissions, MSG_* fields) | `pnpm verify:manifest` |
| Marketing build output integrity + 17 page markers | `pnpm site:build && pnpm site:verify` |
| README heading parity + PRIVACY file existence + install anchor | `pnpm verify:readme` |
| Marketing claims ↔ canonical source consistency (NEW) | `pnpm verify:claims` |
| Full local CI mirror | `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest && pnpm site:build && pnpm site:verify && pnpm verify:readme && pnpm verify:claims` |
```
The body is **copied, not re-derived** from `13-CONTENT-SOURCES.md:171–208`. The phase's job is to formalize (not invent) — the RESEARCH explicitly forbids inventing new rules ("Formalizes the Maintenance Rules").

**Language:** Match CLAUDE.md user-constraint — write in zh-CN (用户约束 #1). The headings above are bilingual to match README style (README.md is zh_CN primary).

---

### `package.json` (config, EDIT — add one script entry)

**Analog:** the existing `verify:manifest` line at `package.json:27`.

**Edit** (insert new entry in the `scripts` block, immediately after `verify:manifest`):
```json
"verify:manifest": "wxt build && tsx scripts/verify-manifest.ts",
"verify:claims": "wxt build && tsx scripts/verify-claims.ts",
```
**Convention being followed:** the script **chains `wxt build` first** because verify-claims reads `.output/chrome-mv3/manifest.json`. This is the same `wxt build && tsx scripts/X.ts` shape used by `verify:manifest` (line 27) and `verify:zip` (line 28). It closes RESEARCH Pitfall 5 (standalone `pnpm verify:claims` from a clean checkout self-builds).

**In CI order:** because `ci.yml` runs `pnpm verify:manifest` (which already runs `wxt build`), the subsequent `pnpm verify:claims` step will find the manifest already present and the second `wxt build` is a cache hit. No wall-clock cost.

---

### `.github/workflows/ci.yml` (config / CI, EDIT — extend single `verify` job)

**Analog:** the existing step block at `.github/workflows/ci.yml:11–22`.

**Edit** (append 4 new steps after the existing `pnpm verify:manifest` at line 22):
```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm verify:manifest
      # ─── Phase 16: marketing + claims gates (closes WR-03) ──────────────
      - run: pnpm site:build
      - run: pnpm site:verify
      - run: pnpm verify:readme
      - run: pnpm verify:claims
```
**Pattern 2 (CI single-job extension) — rationale:** all four new steps are sub-15s combined; parallel jobs would each pay ~30–40s checkout+install (`pnpm install --frozen-lockfile` on the workspace). The existing `cache: 'pnpm'` on `setup-node@v6` (line 17) already handles monorepo lockfile caching. Total added wall-clock: ~10–15s.

**Ordering invariant (load-bearing, closes RESEARCH Pitfall 2):** `verify:manifest` MUST run before `verify:claims`. `verify:manifest`'s first step is `wxt build` (package.json:27), which produces the prod branch of `.output/chrome-mv3/manifest.json`. By the time `verify:claims` runs, the manifest reflects production (no `tabs`, no static `<all_urls>`). If a future contributor reorders these, `verify:claims` would either fail (manifest missing) or — worse — silently pass against a dev manifest that includes `tabs`.

**No `secrets:` or `env:` additions** — all four steps read public repo files only. The job's existing permission surface is unchanged.

---

### `apps/marketing/src/components/cta-button.tsx` (component, EDIT — add G201 a11y indication)

**Analog:** the current `<a>` block at `cta-button.tsx:44–56` (which already sets `target="_blank"` + `rel="noopener noreferrer"`).

**Edit** (extend the existing `<a>` children; do NOT restructure the props or styling):
```tsx
export function CtaButton({ href, variant, testId, children }: CtaButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      class={`${baseClass} ${variantClass[variant]}`}
    >
      {children}
      {/* WCAG G201 — visible external-link indication (visual warning) */}
      <span aria-hidden="true" class="ml-1.5 inline-block translate-y-[1px]">↗</span>
      {/* WCAG G201 — sr-only new-tab warning (AT warning; augments, not replaces, accessible name) */}
      <span class="sr-only"> (opens in new tab)</span>
    </a>
  );
}
```

**Pitfall 6 rule (load-bearing):** **DO NOT add `aria-label` to the `<a>`.** All three current callers pass plain-string children (`hero.cta`, `cta.primary`, `cta.secondary` — verified at `app.tsx:106-107, 242-247`), so the accessible name computes correctly from children. `aria-label` would REPLACE the accessible name and is brittle if a future caller passes JSX. The sr-only span AUGMENTS — this is the safer, more future-proof choice.

**Wave 0 PRECONDITION (must precede this edit, closes RESEARCH Open Question 1 + Assumption A5):**
- `grep -r "sr-only" apps/marketing/src/ shared/styles/` returns **NO matches** (verified during pattern mapping — the class is absent from both `apps/marketing/src/styles/index.css` and `shared/styles/design-tokens.css`).
- **The planner MUST add the `.sr-only` definition to `apps/marketing/src/styles/index.css` (marketing-local, NOT shared tokens — Phase 15 guardrail "shared tokens untouched") as a Wave 0 task.** Canonical CSS:
  ```css
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  ```
- Without this, the sr-only span renders visible to sighted users and the G201 visual warning is duplicated.

**No prop or signature change** — the edit is purely additive children. The `CtaButtonProps` interface at lines 15–20 stays as-is.

---

### `apps/marketing/src/main.tsx` (component, EDIT — set `document.documentElement.lang`)

**Analog:** the current locale-detection block at `main.tsx:7–15`.

**Edit** (append a single line after the `await setLocale(detected)` call at line 14):
```tsx
async function init(): Promise<void> {
  const browserLang = navigator.language.replace('-', '_');
  const supported = ['en', 'zh_CN'];
  const detected = supported.includes(browserLang) ? browserLang : 'en';
  locale.value = detected;
  await setLocale(detected);
  // Phase 16 / WR-08: set the documentElement lang so AT and search engines
  // see the correct page language at initial paint (not only after toggle).
  document.documentElement.lang = detected === 'zh_CN' ? 'zh-CN' : 'en';
  render(<App locale={locale} />, document.getElementById('app')!);
}
```

**The `'zh_CN' → 'zh-CN'` mapping is the existing contract** at `app.tsx:56` — reuse the exact same expression so the two sources stay in lockstep.

**Closes RESEARCH Open Question on WR-05 (partial):** the locale-detection `replace('-', '_')` at `main.tsx:10` does NOT handle `zh-Hans-CN` (it normalizes to `zh_Hans_CN`, which is not in `supported`, so it falls back to `'en'` — a separate user-experience bug flagged for v1.3, **out of Phase 16 scope**). The `documentElement.lang` set is a separate, orthogonal improvement that goes in regardless.

---

### `apps/marketing/src/app.tsx` (component, EDIT — toggle handler mirrors lang)

**Analog:** the existing locale-toggle `onClick` at `app.tsx:84–91`.

**Edit** (add a single statement inside the `void setLocale(next).then(...)` callback):
```tsx
onClick={() => {
  const next = locale.value === 'en' ? 'zh_CN' : 'en';
  // Load the dictionary first, then flip the signal so the
  // re-render reads the fully loaded locale (no stale copy).
  void setLocale(next).then(() => {
    locale.value = next;
    // Phase 16 / WR-08: keep documentElement.lang in lockstep with the
    // app-root lang attribute so the whole document flips, not just the
    // app subtree. The mapping mirrors main.tsx and the langAttr at line 56.
    document.documentElement.lang = next === 'zh_CN' ? 'zh-CN' : 'en';
  });
}}
```
**Why mirror the lang on the documentElement (not just on the app root div):**
- The `<html lang>` is what assistive tech and search crawlers consult first.
- The app-root `<div lang>` (already present at `app.tsx:71`) sets the language for the subtree — that contract is preserved; this edit only adds the matching document-level declaration.
- Both reads must use the same `'zh_CN' → 'zh-CN'` mapping — extract as a constant if the planner prefers DRY. Recommendation: leave inline (matches the existing inline `langAttr` style at line 56; three call sites is below the "extract" threshold).

---

### `tests/unit/marketing/app-sections.spec.tsx` (test, EDIT — extend two describe blocks)

**Analog 1 (for lang contract test):** the existing locale-toggle re-render test at `app-sections.spec.tsx:131–144`.
**Analog 2 (for CTA G201 test):** the existing CTA placement + semantics test at `app-sections.spec.tsx:174–192`.

**Setup pattern** (already in the spec — copy from `app-sections.spec.tsx:46–75`):
```tsx
let container: HTMLDivElement;
const flush = () =>
  new Promise<void>((r) => setTimeout(r, 0)).then(() => new Promise<void>((r) => setTimeout(r, 0)));

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  render(null, container);
  container.remove();
  await setLocale('en'); // Reset module-level locale so a toggle test never leaks zh_CN forward.
});

async function renderApp() {
  const locale = signal('en');
  await act(async () => { render(<App locale={locale} />, container); });
  await flush();
  return locale;
}
```

**Test 1 — lang attribute contract (NEW `describe` block, mirrors the existing `'App — semantic outline and locale toggle'` describe at line 112):**
```tsx
describe('App — document lang attribute contract (WR-08)', () => {
  it('renders an app-root lang attribute matching the active locale signal', async () => {
    await renderApp();
    const root = container.firstElementChild;
    expect(root?.getAttribute('lang')).toBe('en');
  });

  it('flips the app-root lang to zh-CN when the locale signal toggles', async () => {
    const locale = await renderApp();
    const toggle = container.querySelector('[data-testid="locale-toggle"]') as HTMLButtonElement;
    await act(async () => { toggle.click(); });
    await flush();
    expect(container.firstElementChild?.getAttribute('lang')).toBe('zh-CN');
  });

  it('keeps document.documentElement.lang in lockstep with the app-root lang after toggle', async () => {
    const locale = await renderApp();
    const toggle = container.querySelector('[data-testid="locale-toggle"]') as HTMLButtonElement;
    await act(async () => { toggle.click(); });
    await flush();
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN');
  });
});
```
This pattern **mirrors** the existing `'locale toggle re-renders the whole page copy'` test at lines 131–144 — same `renderApp() → click toggle → flush → assert` shape.

**Test 2 — CTA G201 indication (EXTEND the existing `'hero and bottom CTAs expose explicit external-link semantics'` test at lines 174–192):**
```tsx
it('each CTA exposes a visible external-link glyph and an sr-only new-tab warning (WCAG G201, WR-09)', async () => {
  await renderApp();
  for (const testId of ['hero-primary-cta', 'footer-primary-cta', 'footer-secondary-cta']) {
    const link = container.querySelector(`[data-testid="${testId}"]`);
    // SR-only warning — visually hidden, augmenting accessible name.
    const srOnly = link?.querySelector('.sr-only');
    expect(srOnly?.textContent).toMatch(/opens? in new tab/i);
    // Visible glyph — present and hidden from AT.
    const glyph = link?.querySelector('[aria-hidden="true"]');
    expect(glyph).toBeTruthy();
    expect(glyph?.textContent?.trim()).toBe('↗');
  }
});
```
Insert inside the existing `describe('App — CTA placement and shared button contract ...')` block. The existing test at lines 174–192 already iterates the same three testIds — extend the iteration to assert the G201 elements.

**No new imports** — `describe`, `it`, `expect`, `signal`, `App`, `setLocale`, `act`, `render` are all already imported at `app-sections.spec.tsx:1–9`.

---

### `CHANGELOG.md` (config / release-notes, EDIT — insert `## [v1.2]` section)

**Analog:** the existing `## [v1.1] - 2026-05-31` section at `CHANGELOG.md:5–37`.

**Edit** (insert a new `## [v1.2]` section at the top, immediately after the `# Changelog` header + intro line at `CHANGELOG.md:1–3`, BEFORE the existing `## [v1.1]` line):
```markdown
## [v1.2] - 2026-06-14


### Features

- Phase 13–15: ship the bilingual marketing page (OpenClaw / Discord / Slack / Telegram, structured-payload preview, privacy + permission trust section, known limits).

- Phase 16: add `verify:claims` cross-source consistency verifier and wire all marketing/claims gates into CI (site:build / site:verify / verify:readme / verify:claims). Phase 13 Claims Matrix is now self-enforcing.

- Phase 16: close WCAG G201 external-link indication on CtaButton (visible `↗` glyph + sr-only new-tab warning) and add the document `lang` attribute contract test.


### Documentation

- Phase 16: add root-level `MAINTENANCE.md` formalizing the source-first → artifact-second → page-last update paths for marketing claims (platforms, privacy, permissions, screenshots, CTA).


### Known Issues

- Telegram automation coverage passes, but a real logged-in headed-browser UAT artifact has not yet been recorded (carried forward from v1.1).

- Phase 11/12 Nyquist closeout is recorded as a known risk only — not a marketing claim and not a v1.2 deliverable.

- Feishu/Lark remains out of shipped scope (evaluated and dropped after UAT confirmed shared-URL targeting breaks dispatch).
```

**Structure being copied (heading hierarchy + ordering):** from `CHANGELOG.md:5–37`:
- `## [vX.Y] - YYYY-MM-DD` (h2)
- `### Features` (h3)
- `### Architecture` (h3 — optional)
- `### Improvements` (h3 — optional)
- `### Bug Fixes` (h3 — optional)
- `### Removed` (h3 — optional)
- `### Known Issues` (h3 — used in v1.1, must be repeated for honest release notes per RESEARCH Q5)

**Truth-boundary rule (RESEARCH Anti-Pattern):** do NOT create a separate `RELEASE-NOTES.md`. `cliff.toml` and `scripts/verify-changelog-release.ts` already own the CHANGELOG.md structure — splitting the source of truth would create drift.

**Why the date is `2026-06-14`:** matches the phase research date. The planner can adjust to the actual release date.

---

### `apps/marketing/scripts/verify-build.mjs` (utility, EDIT — OPTIONAL WR-02 close)

**Analog:** the current `REQUIRED_PAGE_MARKERS` array at `verify-build.mjs:36–59`.

**Edit** (append 2+ zh_CN markers to the existing `REQUIRED_PAGE_MARKERS` array — currently 100% English, RESEARCH Validation Architecture notes this as a blind spot):
```javascript
export const REQUIRED_PAGE_MARKERS = [
  // ... existing 17 English markers (lines 36-59 unchanged) ...
  // Phase 16 / WR-02: zh_CN markers — close the smoke-gate blind spot for
  // Chinese-locale chunk regression. Source: zh_CN.json parallel keys.
  '把网页结构化信息',        // hero.title zh_CN (verify exact string against zh_CN.json at Wave 0)
  '隐私与权限',              // trust.title zh_CN
];
```
**Wave 0 PRECONDITION:** the planner must read `apps/marketing/src/i18n/locales/zh_CN.json` and copy the **exact** zh_CN string values for `hero.title` and `trust.title` (or whichever 2 markers best cover the structured-payload + trust sections). The strings above are placeholders — they MUST be replaced with real zh_CN.json values before this edit lands.

**Optional but recommended** (RESEARCH line 569 + Validation Architecture line 543): the existing REQUIRED_PAGE_MARKERS is 100% English, so a regression that breaks the zh_CN chunk would slip through. Adding ≥2 zh_CN markers closes the blind spot at near-zero cost.

---

## Shared Patterns

### Verifier script shape (applies to: `scripts/verify-claims.ts`)

**Source:** `scripts/verify-manifest.ts:24–194` + `scripts/verify-readme-anchors.ts` + `apps/marketing/scripts/verify-build.mjs:36–128`

All four existing verify scripts follow the same five-element contract:

1. **Imports:** Node built-ins only (`node:fs`, `node:path`, `node:url`).
2. **Pure assertion function exported as `assertX(inputs, errors)`:** no I/O inside, no `process.exit` inside, no `console.*` inside. The function only pushes strings into the `errors` accumulator.
3. **`isDirectInvocation` guard** (verbatim pattern at `verify-manifest.ts:164–165`): `fileURLToPath(import.meta.url) === resolve(process.argv[1])` — prevents CLI side-effects when imported from a unit test.
4. **CLI entry:** read inputs, call `assertX`, branch on `errors.length`, `console.error` + `process.exit(1)` on failure, `console.log` `[<name>] OK` on success.
5. **Error format:** `[<script-name>] FAIL:` header + `  - <message>` indented bullet per error.

`verify-claims.ts` MUST follow all five. The shape is more important than the assertion bodies — drift from this shape creates maintenance friction (the maintainer's mental model of "how a verify script looks" breaks).

**Apply to:** `scripts/verify-claims.ts` only (the single new verifier).

---

### Forbidden-wording list source-of-truth (applies to: `scripts/verify-claims.ts`, `tests/unit/scripts/verify-claims.spec.ts`)

**Source:** `13-CONTENT-SOURCES.md` Claims Matrix rows CLM-PRIVACY-01 (line 44) + CLM-PERM-01 (line 45).

**The forbidden tokens (encode EXACTLY in `assertClaims`, do NOT paraphrase):**
- Privacy forbidden (CLM-PRIVACY-01, "Forbidden wording" column): `'cloud sync'`, `'remote server'`, `'our servers'`, `'usage analytics'`, `'user tracking'`, `'server-side processing'`, `'云端存储'`, `'用户行为分析'`
  - **Caveat:** `'remote server'` appears in the matrix's forbidden column, BUT the marketing trust copy legitimately needs to say "no remote server" (allowed wording) to communicate the privacy boundary. **The planner should NOT blocklist `'remote server'` literally** — instead blocklist only the overclaim forms: `'our servers'`, `'server-side processing'`. RESEARCH Pattern 1 (lines 182–196) blocklists exactly: `'cloud sync'`, `'our servers'`, `'server-side processing'`, `'usage analytics'`, `'user tracking'`, `'云端存储'`, `'用户行为分析'`. Follow RESEARCH over the matrix here — the matrix is the human-readable audit trail, RESEARCH Pattern 1 is the executable spec.
- Permission forbidden (CLM-PERM-01): production `'tabs'` claim; static production `'<all_urls>'` host permission claim.

**Apply to:** `scripts/verify-claims.ts` (define as `const` array at top of file) + `tests/unit/scripts/verify-claims.spec.ts` (drive failure-case tests through `validInputs(overrides)` that inject these tokens into `trust.privacy.fact*`).

---

### CI step ordering invariant (applies to: `.github/workflows/ci.yml`)

**Source:** RESEARCH Pitfall 2 + Pattern 2 (lines 224–246, 344–348).

**Load-bearing rule:** `pnpm verify:manifest` MUST run **before** `pnpm verify:claims`. Rationale: `verify:manifest`'s first step is `wxt build` (package.json:27), which produces the prod manifest branch (no `tabs`, no static `<all_urls>`). If `verify:claims` runs first or against a dev build, it would either crash (manifest missing) or false-pass (dev manifest includes `tabs`, but locale text correctly omits it → assertion would catch the locale, but if someone naively widened the assertion to accept any manifest, dev builds would silently pass).

**Apply to:** `.github/workflows/ci.yml` — the four new steps MUST come after `pnpm verify:manifest`, in the order: `site:build → site:verify → verify:readme → verify:claims`.

---

### Preact render + signal-toggle test pattern (applies to: `tests/unit/marketing/app-sections.spec.tsx` extensions)

**Source:** `app-sections.spec.tsx:46–75, 131–144, 174–192`.

**Three-step test shape (copy verbatim for the two new test cases):**
```tsx
async function renderApp() {
  const locale = signal('en');
  await act(async () => { render(<App locale={locale} />, container); });
  await flush();
  return locale;
}

// In the test:
await renderApp();
const toggle = container.querySelector('[data-testid="locale-toggle"]') as HTMLButtonElement;
await act(async () => { toggle.click(); });
await flush();
expect(...).toBe(...);
```
The double-`setTimeout(0)` flush (line 49–50) is non-negotiable — it drains both the Preact effect queue and the dynamic `setLocale()` import promise. Skipping the flush produces flaky tests that pass in isolation and fail in the full suite.

**`afterEach` reset (line 61–66):** must call `await setLocale('en')` to reset the module-level locale signal so a zh_CN toggle from one test does not leak into the next. This is the regression guard for the stale-dictionary toggle bug (referenced in `app-sections.spec.tsx:24–25`).

**Apply to:** the two new test cases in `app-sections.spec.tsx` (lang attribute + CTA G201 indication).

---

### `.sr-only` utility class (applies to: `apps/marketing/src/styles/index.css` — NEW addition, `apps/marketing/src/components/cta-button.tsx`)

**Source:** W3C G201 + standard a11y boilerplate (referenced in RESEARCH Pattern 3 + Open Question 1).

**Verified during pattern mapping:** the class is **NOT** currently defined anywhere in `apps/marketing/src/` or `shared/styles/`. The grep `grep -rn "sr-only" apps/marketing/src/ shared/styles/` returned zero matches.

**The planner MUST add the class to `apps/marketing/src/styles/index.css` as a Wave 0 task** (before the CtaButton edit). Canonical CSS:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```
**Placement constraint (Phase 15 guardrail):** add to **`apps/marketing/src/styles/index.css` (marketing-local)**, NOT to `shared/styles/design-tokens.css`. Phase 15 explicitly left shared tokens untouched; Phase 16 must preserve that boundary. The class is marketing-app-specific (extension popup/options do not need it).

**Apply to:** the CtaButton edit AND any future G201 indication work. Without this class, the sr-only span renders visible to sighted users and the WCAG G201 visual warning is duplicated.

---

## No Analog Found

**None.** All 9 files in scope have a precise in-repo analog with line-precise citations. This is consistent with RESEARCH's classification of Phase 16 as "release-acceptance" (small, high-leverage, HIGH-ANALOG to proven Phase 1–15 patterns).

The two open items from RESEARCH (A3 maintenance-doc location, A5 `.sr-only` existence) are **resolved by pattern mapping**:
- A3: place at repo root (matches existing README/PRIVACY/CHANGELOG convention).
- A5: confirmed absent — Wave 0 task added to create it in marketing-local styles.

## Metadata

**Analog search scope:**
- `/Users/seven/data/coding/projects/seven/web2chat/scripts/` (verify-manifest.ts, verify-readme-anchors.ts, verify-changelog-release.ts, verify-zip.ts, i18n-coverage.ts)
- `/Users/seven/data/coding/projects/seven/web2chat/tests/unit/scripts/` (verify-manifest.spec.ts, marketing-verify-build.spec.ts, marketing-isolation.spec.ts)
- `/Users/seven/data/coding/projects/seven/web2chat/tests/unit/marketing/` (app-sections.spec.tsx)
- `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/` (cta-button.tsx, main.tsx, app.tsx, styles/index.css)
- `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/scripts/` (verify-build.mjs)
- `/Users/seven/data/coding/projects/seven/web2chat/shared/styles/` (design-tokens.css)
- `/Users/seven/data/coding/projects/seven/web2chat/.github/workflows/` (ci.yml)
- Repo root: `package.json`, `CHANGELOG.md`, `README.md`, `CLAUDE.md`
- `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` (claims matrix + maintenance rules)

**Files scanned:** 16 source/analog files + 1 planning artifact.
**Pattern extraction date:** 2026-06-14.
