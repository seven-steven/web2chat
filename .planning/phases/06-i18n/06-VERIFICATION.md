---
phase: 06-i18n
verified: 2026-05-07T07:35:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Switch language in Options page from English to Chinese and back"
    expected: "All text in popup/options instantly re-renders in the selected language without extension reload"
    why_human: "Runtime locale-switch re-render via Preact signals is a runtime visual behavior that cannot be verified by static analysis or unit tests alone"
  - test: "Open chrome://extensions and verify extension name/description shows localized text when browser language is zh_CN"
    expected: "Extension name shows Chinese text from __MSG_extension_name__ resolution"
    why_human: "__MSG_*__ resolution by Chrome requires loaded extension in browser with specific locale setting"
---

# Phase 6: i18n 加固 + 打磨 Verification Report

**Phase Goal:** 扩展中所有用户可见字符串都流经类型化的 i18n facade，用户可以在不重新加载扩展的情况下运行时切换语言，manifest 字段做到本地化，并通过 ESLint 规则防止任何未来的硬编码字符串回退项目。
**Verified:** 2026-05-07T07:35:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `pnpm test:i18n-coverage` asserts 100% bidirectional coverage for both locales | VERIFIED | Script exits 0; output: "i18n coverage: 100% -- all 94 keys covered in both locales"; 94 source t() keys, 99 locale keys (5 manifest-only), zero gaps across all 6 checks |
| 2 | Options page exposes Language selector; switching triggers immediate re-render via signal-based locale, persisted in chrome.storage.local | VERIFIED | `LanguageSection.tsx` renders 3-option select (Auto/English/zh_CN) with allowlist validation, calls `setLocale()` which updates `localeSig` signal and writes `localeItem`; popup/options `main.tsx` both await `localeItem.getValue()` before render to prevent first-frame flash |
| 3 | manifest.json name/description/default_title use `__MSG_*__` placeholders | VERIFIED | `wxt.config.ts` uses `__MSG_extension_name__`, `__MSG_extension_description__`, `__MSG_action_default_title__`; `verify-manifest.ts` asserts `startsWith('__MSG_')` with `[I18N-04]` tag; `pnpm verify:manifest` outputs 3 OK lines |
| 4 | ESLint rule blocks JSX hardcoded strings (CJK + capitalized English); fixture test validates 4 violations | VERIFIED | `eslint.config.js` contains inline `local/no-hardcoded-strings` plugin detecting CJK + EN in JSXText + JSXExpressionContainer; `tests/lint/no-hardcoded-strings.test.ts` passes 8 RuleTester cases + 1 fixture integration test; `pnpm lint` reports 0 errors on codebase |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shared/i18n/index.ts` | signal-based t(), setLocale(), localeSig | VERIFIED | Exports `t`, `setLocale`, `localeSig`, `localeDictSig`; uses @preact/signals `signal` + `computed`; 62 lines, no TODOs, no stubs |
| `vite-plugins/yaml-locale.ts` | YAML locale to flat JS dict | VERIFIED | Exports `yamlLocalePlugin`; transforms WXT YAML `{key:{message,placeholders}}` to flat `{key:string}`; 63 lines, no TODOs |
| `shared/i18n/yaml.d.ts` | TypeScript *.yml module declaration | VERIFIED | Declares `module '*.yml'` returning `Record<string, string>`; 9 lines |
| `shared/storage/items.ts` | localeItem storage definition | VERIFIED | Contains `LocaleChoice` type (`'en' \| 'zh_CN' \| null`) and `localeItem = storage.defineItem<LocaleChoice>('local:locale', { fallback: null })` |
| `entrypoints/popup/main.tsx` | async locale init before render | VERIFIED | `async function main()` awaits `localeItem.getValue()`, sets `localeSig.value`, then `render(<App />, root)` |
| `entrypoints/options/main.tsx` | async locale init before render | VERIFIED | Same async main pattern as popup |
| `entrypoints/options/components/LanguageSection.tsx` | Language selector UI | VERIFIED | 59 lines; select with 3 options (Auto/English/zh_CN); allowlist validation; calls `setLocale()`; has `data-testid="options-language-section"` and `data-testid="options-language-select"` |
| `entrypoints/options/App.tsx` | LanguageSection wired in, ReservedSection removed | VERIFIED | `import { LanguageSection }`, `<LanguageSection />` as first section; no `ReservedSection` reference |
| `eslint.config.js` | inline `local/no-hardcoded-strings` plugin | VERIFIED | Plugin with `CJK_RE` + `EN_RE` detection in JSXText + JSXExpressionContainer; `local/no-hardcoded-strings: 'error'`; fixture files ignored |
| `tests/lint/no-hardcoded-strings.test.ts` | RuleTester + fixture integration test | VERIFIED | 105 lines; 4 valid + 4 invalid RuleTester cases; fixture `expect(errors).toHaveLength(4)` |
| `tests/lint/no-hardcoded-strings.fixture.tsx` | 4 intentional violations | VERIFIED | Contains "Send", "发送", "确认删除", "Reset all" |
| `scripts/verify-manifest.ts` | I18N-04 `__MSG_*__` assertions | VERIFIED | `msgFields` loop checks name/description/action.default_title for `startsWith('__MSG_')`; CLI entry prints 3 OK lines |
| `scripts/i18n-coverage.ts` | Static analysis coverage audit | VERIFIED | 145 lines; `MANIFEST_ONLY_KEYS` allowlist (5 keys); 6 gap checks; exits 0/1; `pnpm test:i18n-coverage` passes |
| `tests/unit/i18n/locale-switch.spec.ts` | 4 TDD tests for signal-based t() | VERIFIED | 4 tests: known key, missing key, reject non-allowlist, setLocale(null) reverts; all pass |
| `locales/en.yml` | All keys including Phase 6 additions | VERIFIED | 248 lines; 99 keys; includes `options_language_heading/explainer/label/auto`; no deprecated `popup_hello` or `options_reserved_*` keys |
| `locales/zh_CN.yml` | All keys with Chinese values | VERIFIED | 248 lines; 99 keys; key set identical to en.yml |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `shared/i18n/index.ts` | `locales/en.yml`, `locales/zh_CN.yml` | Vite YAML plugin import | WIRED | `import enDict from '../../locales/en.yml'`; `yamlLocalePlugin` registered in `wxt.config.ts` and `vitest.config.ts` |
| `shared/i18n/index.ts` | `shared/storage/items.ts` | `localeItem` import | WIRED | `import { localeItem, type LocaleChoice } from '../storage/items'`; `setLocale()` calls `localeItem.setValue(locale)` |
| `entrypoints/popup/main.tsx` | `shared/i18n/index.ts` | `localeSig` import | WIRED | `import { localeSig } from '@/shared/i18n'`; reads `localeSig.value` |
| `entrypoints/popup/main.tsx` | `shared/storage/items.ts` | `localeItem` import | WIRED | `import { localeItem } from '@/shared/storage/items'`; `await localeItem.getValue()` |
| `entrypoints/options/main.tsx` | `shared/i18n/index.ts` | `localeSig` import | WIRED | Same pattern as popup |
| `LanguageSection.tsx` | `shared/i18n/index.ts` | t/setLocale import | WIRED | `import { t, setLocale } from '@/shared/i18n'`; `onChange` handler calls `setLocale(locale)` |
| `LanguageSection.tsx` | `shared/storage/items.ts` | localeItem import | WIRED | `import { localeItem, type LocaleChoice }`; `useEffect` calls `localeItem.getValue()` |
| `options/App.tsx` | `LanguageSection.tsx` | import + JSX render | WIRED | `import { LanguageSection }`; `<LanguageSection />` rendered as first section |
| `wxt.config.ts` | `vite-plugins/yaml-locale.ts` | yamlLocalePlugin import | WIRED | `import { yamlLocalePlugin }`; `plugins: [tailwindcss(), yamlLocalePlugin()]` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `shared/i18n/index.ts` t() | `localeDictSig.value` | Build-time YAML dicts via `yamlLocalePlugin` | Yes -- imports real en.yml/zh_CN.yml | FLOWING |
| `LanguageSection.tsx` select | `selected` signal | `localeItem.getValue()` from chrome.storage | Yes -- reads real storage | FLOWING |
| `popup/main.tsx` | `savedLocale` | `localeItem.getValue()` | Yes -- reads real storage | FLOWING |
| `options/main.tsx` | `savedLocale` | `localeItem.getValue()` | Yes -- reads real storage | FLOWING |
| `scripts/i18n-coverage.ts` | `usedKeys` Set | Regex scan of source files for t() calls | Yes -- scans 47 source files | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| i18n coverage audit passes | `pnpm test:i18n-coverage` | Exit 0, "100% -- all 94 keys covered" | PASS |
| Manifest verification passes | `pnpm verify:manifest` | Exit 0, 3x "OK [I18N-04]" | PASS |
| Locale-switch tests pass | `pnpm test -- tests/unit/i18n/locale-switch.spec.ts` | 225/225 tests pass (4 i18n-specific) | PASS |
| ESLint rule tests pass | `pnpm test -- tests/lint/no-hardcoded-strings.test.ts` | 225/225 tests pass (9 lint-specific) | PASS |
| Typecheck clean | `pnpm typecheck` | Exit 0, no errors | PASS |
| Lint clean (no false positives) | `pnpm lint` | 0 errors, 25 warnings (baseline) | PASS |
| Build succeeds | `pnpm build` | Exit 0, 391.28 kB | PASS |
| Full test suite | `pnpm test` | 33 files, 225 tests pass | PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| I18N-01 | zh_CN and en locale files 100% key coverage | SATISFIED | `pnpm test:i18n-coverage` exits 0; 94 t() keys + 5 manifest-only = 99 keys per locale; zero gaps |
| I18N-02 | Runtime locale switch in options without extension reload | SATISFIED | Signal-based `setLocale()` in `shared/i18n/index.ts`; `LanguageSection.tsx` select UI; `popup/options main.tsx` async locale init |
| I18N-03 | ESLint rule blocks hardcoded strings in JSX | SATISFIED | `local/no-hardcoded-strings` inline plugin in `eslint.config.js`; RuleTester + fixture test pass; `pnpm lint` 0 errors |
| I18N-04 | manifest name/description/default_title use `__MSG_*__` | SATISFIED | `wxt.config.ts` uses `__MSG_*__` placeholders; `verify-manifest.ts` asserts with `[I18N-04]` tag; `pnpm verify:manifest` passes |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `LanguageSection.tsx` | 53 | Hardcoded "English" | INFO | Intentional -- language identifier exempt with eslint-disable comment |
| `LanguageSection.tsx` | 55 | Hardcoded "简体中文" | INFO | Intentional -- language identifier exempt with eslint-disable comment |

No blocker or warning anti-patterns found. All detected patterns are intentional, documented, and properly exempted.

### Human Verification Required

### 1. Runtime Language Switch Visual Test

**Test:** Open Options page, switch language from Auto/English to Chinese, then back.
**Expected:** All t()-rendered text in the Options page (headings, labels, buttons) instantly changes language without page reload or extension reload. Close and reopen Options page -- selection persists.
**Why human:** Preact signal-based re-rendering is a runtime visual behavior. Unit tests verify the signal mechanics but cannot confirm the actual visual re-render produces correct Chinese/English text.

### 2. Manifest Locale Resolution in chrome://extensions

**Test:** Set browser language to zh_CN, load unpacked extension, navigate to chrome://extensions.
**Expected:** Extension name and description show Chinese text (from zh_CN locale messages.json). Switch browser to English, reload -- shows English text.
**Why human:** `__MSG_*__` resolution is performed by Chrome at extension load time. `verify-manifest.ts` confirms the placeholders exist, but actual locale resolution requires a loaded extension in a browser with specific language settings.

### 3. Popup Language Flash Prevention

**Test:** Set language to Chinese in Options. Open popup on a webpage. Close popup. Open popup again.
**Expected:** Popup always opens with Chinese text -- no brief flash of English before switching.
**Why human:** The async main() pattern is verified in code, but first-frame flash prevention is a visual timing behavior observable only in a running extension.

### Gaps Summary

No code gaps found. All 4 ROADMAP success criteria are satisfied with substantive, wired, and data-flowing implementations. All 4 requirement IDs (I18N-01 through I18N-04) have corresponding codebase evidence.

The phase delivers:
- Signal-based i18n runtime with Preact signal reactivity for instant locale switching
- Vite YAML plugin for build-time locale dict transformation
- ESLint custom rule preventing future hardcoded string regressions
- Manifest `__MSG_*__` verification guard
- LanguageSection UI in Options page
- 100% bidirectional locale key coverage audit
- Async locale init in both popup and options entry points

3 items require human visual testing to confirm runtime behavior.

---

_Verified: 2026-05-07T07:35:00Z_
_Verifier: Claude (gsd-verifier)_
