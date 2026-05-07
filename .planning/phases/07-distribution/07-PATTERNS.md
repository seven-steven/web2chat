# Phase 7: 分发上架 - Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 10 (new/modified files)
**Analogs found:** 3 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `PRIVACY.md` | documentation | -- | none | no-analog |
| `PRIVACY.zh_CN.md` | documentation | -- | none | no-analog |
| `README.md` (rewrite) | documentation | -- | current `README.md` (structure only) | partial |
| `README.en.md` | documentation | -- | current `README.md` (structure only) | partial |
| `STORE-LISTING.md` | documentation | -- | none | no-analog |
| `STORE-LISTING.en.md` | documentation | -- | none | no-analog |
| `scripts/verify-zip.ts` | utility | batch | `scripts/verify-manifest.ts` | exact |
| `scripts/verify-readme-anchors.ts` | utility | batch | `scripts/i18n-coverage.ts` | exact |
| `wxt.config.ts` (modification) | config | -- | self (existing) | exact |
| `package.json` (modification) | config | -- | self (existing) | exact |

## Pattern Assignments

### `scripts/verify-zip.ts` (utility, batch)

**Analog:** `scripts/verify-manifest.ts`

**Shebang + module header** (lines 1-19):
```typescript
#!/usr/bin/env tsx
/**
 * Manifest verifier — runs after `wxt build`.
 *
 * Asserts FND-05 + ROADMAP Phase 1 success criterion #5:
 *   - permissions === ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation'] (set equality)
 *   - host_permissions === ['https://discord.com/*'] (NO `<all_urls>` ever)
 *   - optional_host_permissions === ['<all_urls>']
 *   - default_locale === 'en'
 *   - name / description / action.default_title use __MSG_*__
 *   ...
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
```

**Core pattern — assertion-based validation with error collector** (lines 62-96):
```typescript
export function assertManifest(manifest: Manifest, errors: string[]): void {
  // Assertion blocks push to errors[] instead of throwing immediately
  try {
    expectSet('permissions', manifest.permissions, [
      'activeTab', 'alarms', 'scripting', 'storage', 'webNavigation',
    ]);
  } catch (e) {
    errors.push((e as Error).message);
  }
  // ... more assertions ...
}
```

**Main entry — file existence check + run assertions + exit code** (lines 154-182):
```typescript
const manifestPath = resolve(process.cwd(), '.output/chrome-mv3/manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`[verify-manifest] FAIL: ${manifestPath} not found. Run \`pnpm build\` first.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
const errors: string[] = [];
assertManifest(manifest, errors);

if (errors.length) {
  console.error('[verify-manifest] FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

console.log('[verify-manifest] OK — all assertions passed');
```

**Key conventions to replicate:**
1. `#!/usr/bin/env tsx` shebang
2. JSDoc header citing requirement IDs (DST-01 for verify-zip)
3. Error collector pattern (`errors: string[]`) instead of early throw
4. `[script-name] FAIL:` / `[script-name] OK` console output prefix
5. `process.exit(1)` on failure, implicit 0 on success
6. `resolve(process.cwd(), ...)` for path resolution

---

### `scripts/verify-readme-anchors.ts` (utility, batch)

**Analog:** `scripts/i18n-coverage.ts`

**Shebang + module header** (lines 1-16):
```typescript
#!/usr/bin/env tsx
/**
 * i18n coverage audit — asserts 100% bidirectional coverage between
 * source t() calls and locale YAML keys (I18N-01).
 *
 * Usage: pnpm test:i18n-coverage
 * Exit 0 = all keys covered; Exit 1 = gaps found.
 * ...
 */
```

**File reading + parsing pattern** (lines 87-93):
```typescript
function loadLocaleKeys(locale: string): Set<string> {
  const raw = parse(readFileSync(join(LOCALES_DIR, `${locale}.yml`), 'utf-8')) as WxtLocaleYaml;
  return new Set(Object.keys(raw));
}
```

**Comparison + report pattern** (lines 109-145):
```typescript
let ok = true;

function report(label: string, items: string[]) {
  if (items.length === 0) {
    console.log(`  ${label}: none`);
    return;
  }
  console.error(`  ${label} (${items.length}):`);
  for (const item of items) console.error(`   - ${item}`);
  ok = false;
}

// ... multiple report() calls ...

if (ok) {
  console.log(`\n[script-name] OK -- message\n`);
  process.exit(0);
} else {
  console.error(`\n[script-name] FAIL -- message\n`);
  process.exit(1);
}
```

**Key conventions to replicate:**
1. Same shebang + JSDoc header pattern as verify-manifest
2. `readFileSync` for synchronous file content loading
3. Boolean flag `ok` toggled by helper reporter function
4. Summary line at exit with counts
5. Explicit `process.exit(0)` on success (unlike verify-manifest which uses implicit 0)

---

### `wxt.config.ts` (modification — add zip.exclude)

**Analog:** Self (current `wxt.config.ts`)

**Insertion point — after existing `modules` key** (lines 53-57):
```typescript
  modules: ['@wxt-dev/i18n/module'],
  vite: () => ({
    plugins: [tailwindcss(), yamlLocalePlugin()],
  }),
});
```

**New `zip` section to add** (from RESEARCH.md pattern):
```typescript
  zip: {
    exclude: ['content-scripts/mock-platform.js'],
  },
```

**Key conventions:**
- Config uses `defineConfig()` from `'wxt'`
- Top-level keys: `manifest`, `modules`, `vite` — add `zip` as peer

---

### `package.json` (modification — add verify scripts)

**Existing scripts pattern** (lines 11-27):
```json
"scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "zip": "wxt zip",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run --passWithNoTests",
    "test:i18n-coverage": "tsx scripts/i18n-coverage.ts",
    "verify:manifest": "wxt build && tsx scripts/verify-manifest.ts",
}
```

**Conventions for new scripts:**
- Verify scripts use `verify:` prefix namespace (e.g. `verify:manifest`)
- Script commands use `tsx scripts/<name>.ts` pattern
- Build-dependent scripts chain with `&&` (e.g. `wxt build && tsx ...`)

**New scripts to add:**
```json
"verify:zip": "wxt build && wxt zip && tsx scripts/verify-zip.ts",
"verify:readme": "tsx scripts/verify-readme-anchors.ts"
```

---

### `README.md` (rewrite) and `README.en.md` (new)

**Analog:** Current `README.md` for format conventions only.

**Conventions from current README:**
- Starts with `# Web2Chat` heading
- Uses `>` blockquote for one-liner description
- Code blocks use triple backtick with language specifier
- Numbered lists for step-by-step instructions
- `##` for top-level sections

**New structure per D-85 (user-priority section order):**
```markdown
[English](./README.en.md) | 简体中文

# Web2Chat

> one-liner description

## 简介
## 安装
## 使用
## 平台说明
## Limitations
## 开发
## 隐私
```

**Cross-link header pattern (from RESEARCH.md):**
```markdown
<!-- README.md top -->
[English](./README.en.md) | 简体中文

<!-- README.en.md top -->
English | [简体中文](./README.md)
```

---

## Shared Patterns

### Script Structure (applies to all `scripts/*.ts`)

**Source:** `scripts/verify-manifest.ts` + `scripts/i18n-coverage.ts`
**Apply to:** `scripts/verify-zip.ts`, `scripts/verify-readme-anchors.ts`

```typescript
#!/usr/bin/env tsx
/**
 * [Script name] — [purpose].
 *
 * Asserts [requirement IDs]:
 *   - [assertion 1]
 *   - [assertion 2]
 *
 * Usage: pnpm [script-name]
 * Exit 0 = pass; Exit 1 = fail.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// --- assertions/logic ---

const errors: string[] = [];
// ... collect errors ...

if (errors.length) {
  console.error('[script-name] FAIL:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

console.log('[script-name] OK — [summary]');
```

### Bilingual Document Cross-Link Header

**Source:** RESEARCH.md Pattern 3
**Apply to:** All bilingual document pairs (README, PRIVACY, STORE-LISTING)

```markdown
<!-- Primary language file (*.md) -->
[Other Language Link](./file.other.md) | 当前语言标注

<!-- Secondary language file (*.en.md or *.zh_CN.md) -->
Other Language Label | [本语言链接](./file.md)
```

### package.json Script Naming

**Source:** `package.json` lines 11-27
**Apply to:** New scripts added in this phase

Conventions:
- `verify:<target>` for assertion/validation scripts
- `test:<scope>` for test-related scripts
- Build-dependent scripts prefix with `wxt build &&` or `wxt zip &&`

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns and CONTEXT.md decisions directly):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `PRIVACY.md` | documentation | -- | No privacy policy exists in codebase; content driven by D-87..D-89 decisions |
| `PRIVACY.zh_CN.md` | documentation | -- | Same as above; zh_CN translation |
| `STORE-LISTING.md` | documentation | -- | No store listing exists; content driven by D-92..D-94 |
| `STORE-LISTING.en.md` | documentation | -- | Same as above; en version |
| `README.md` (content) | documentation | -- | Complete rewrite per D-86; only format conventions from current README apply |
| `README.en.md` (content) | documentation | -- | New file; structure mirrors README.md per D-83 |

**Note:** These documentation files are content-authoring tasks, not code-pattern tasks. Their structure is defined by CONTEXT.md decisions (D-83 through D-94) and RESEARCH.md section order specifications. The planner should reference those decisions directly rather than codebase analogs.

## Metadata

**Analog search scope:** `scripts/`, `wxt.config.ts`, `package.json`, `README.md` (repo root)
**Files scanned:** 5 existing files examined
**Pattern extraction date:** 2026-05-07
