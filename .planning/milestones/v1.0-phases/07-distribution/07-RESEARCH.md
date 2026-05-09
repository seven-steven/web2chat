# Phase 7: 分发上架 - Research

**Researched:** 2026-05-07
**Domain:** Chrome Extension Distribution & Publishing (CWS packaging, privacy policy, store listing, documentation)
**Confidence:** HIGH

## Summary

Phase 7 is a documentation + build-verification phase with no runtime code changes. The core tasks are: (1) verify that `pnpm build && pnpm zip` produces a CWS-compatible zip (already confirmed working -- 116KB, 26 files, no source maps, correct manifest); (2) write PRIVACY.md in formal legal language; (3) confirm manifest permissions via existing `verify-manifest.ts`; (4) rewrite README.md as user-facing bilingual docs; (5) produce CWS store listing copy.

The existing infrastructure is already 90% ready. `wxt zip` produces a correct zip at `.output/web2chat-0.1.0-chrome.zip` with production manifest (no `<all_urls>` in static host_permissions), all required icon sizes (16/32/48/128 PNG), and proper `_locales/` structure. The one cleanup item is the `content-scripts/mock-platform.js` (3.4KB dead code in zip) -- it could be excluded via `zip.exclude` config but is functionally harmless (tree-shaken body, never auto-injected).

**Primary recommendation:** Focus effort on content creation (PRIVACY.md, README, STORE-LISTING) and add a lightweight `verify:zip` script to assert zip structure. No new runtime dependencies needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-83: 分文件策略。README.md (zh_CN) + README.en.md。GitHub 默认展示 zh_CN。互相顶部链接。
- D-84: zh_CN 为主语言。README.en.md 为英文完整版（结构对等）。
- D-85: 用户优先章节顺序：简介 -> 安装 -> 使用 -> 平台说明 -> Limitations -> 开发 -> 隐私。
- D-86: 重写旧 README。删除 Phase 1 手测脚本和项目结构等开发期内容。
- D-87: 法律政策风格。正式隐私政策语言（"我们收集"/"我们不会"等第一人称复数）。
- D-88: 双语分文件。PRIVACY.md (en) + PRIVACY.zh_CN.md。CWS privacy policy 链接指向 PRIVACY.md (en)。
- D-89: 显式否定 + 肯定。收集什么 / 传输场景 / 显式否定清单。
- D-90: 精选 3-5 项 Limitations + roadmap 暗示。
- D-91: 推荐列出项：仅 Chrome、仅 OpenClaw+Discord、单消息截断、无重试队列、Discord ToS 风险。
- D-92: zip + listing 文案。不含截图/promotional tile。
- D-93: 分文件 listing。STORE-LISTING.md (zh_CN) + STORE-LISTING.en.md。包含 short description + detailed description。
- D-94: AI/自动化类定位。listing 文案突出"AI Agent 辅助"和"自动化投递"。

### Claude's Discretion
- zip 构建是否需要额外配置（WXT `wxt zip` 默认行为 vs CWS 要求）
- PRIVACY.md 的精确法律措辞
- README 中开发章节的详略程度
- STORE-LISTING.md 的 detailed description 长度
- markdown lint 检查的具体实现（验证两种语言锚点存在）

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DST-01 | 产物可通过 WXT build 打包为 CWS 兼容 zip，本地解压加载验证通过 | WXT `wxt zip` already produces correct output; zip config for excluding mock-platform optional |
| DST-02 | PRIVACY.md 明确数据收集/传输/否定声明 | CWS privacy policy requirements researched; formal legal language template identified |
| DST-03 | manifest.json 静态 host_permissions 仅含 discord.com; optional_host_permissions = `<all_urls>` | Already verified by existing `verify-manifest.ts`; production manifest confirmed correct |
| DST-04 | README 双语安装/使用/限制/平台说明 | Bilingual file structure decided (D-83..D-86); section order locked |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CWS zip production | Build tooling (WXT CLI) | -- | `wxt zip` is a build-time artifact generator |
| Zip content verification | CI scripts | -- | Assertion script runs post-build, no runtime |
| Privacy policy | Repository documentation | CWS dashboard | Static markdown committed to repo, URL linked in dashboard |
| README authoring | Repository documentation | -- | Static markdown, no runtime component |
| Store listing copy | Repository documentation | CWS dashboard | Markdown prepared in repo, manually pasted to dashboard |
| Manifest verification | CI scripts | -- | Already covered by `verify-manifest.ts` in CI |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wxt | 0.20.25 | `wxt zip` produces CWS-compatible zip | Already installed; zip is built-in command [VERIFIED: npm registry] |
| tsx | ^4.20.0 | Run TypeScript verification scripts | Already installed as devDependency [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| adm-zip / unzipper | -- | NOT NEEDED | WXT handles zip creation; verification can use `unzip -l` in script or Node `child_process` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom zip script | WXT built-in `wxt zip` | WXT handles everything correctly; no custom needed |
| markdownlint for anchor validation | Custom tsx script | markdownlint is overkill for "verify anchors exist in both files"; simple regex script suffices |

**Installation:**
```bash
# No new packages needed -- all tooling already in devDependencies
```

**Version verification:** No new packages to install.

## Architecture Patterns

### System Architecture Diagram

```
pnpm build ──> .output/chrome-mv3/  ──> pnpm zip ──> .output/web2chat-{version}-chrome.zip
                     │                                         │
                     ├── manifest.json                         ├── (same contents)
                     ├── background.js                         │
                     ├── popup.html                            │
                     ├── content-scripts/*.js                  │
                     ├── _locales/{en,zh_CN}/messages.json     │
                     └── icon/{16,32,48,128}.png               │
                                                               │
                                                               v
                                                     CWS Dashboard Upload
                                                     (manual, out of phase scope)

verify-manifest.ts ─────> reads .output/chrome-mv3/manifest.json
                          asserts: permissions, host_permissions, optional_host_permissions, i18n fields

verify-zip.ts (NEW) ────> reads .output/*.zip
                          asserts: file count, no source maps, icons present, manifest at root
```

### Recommended Project Structure (new files)
```
/ (repo root)
├── README.md              # zh_CN 用户文档 (REWRITE)
├── README.en.md           # en 用户文档 (NEW)
├── PRIVACY.md             # en 隐私政策 (NEW)
├── PRIVACY.zh_CN.md       # zh_CN 隐私政策 (NEW)
├── STORE-LISTING.md       # zh_CN CWS listing 文案 (NEW)
├── STORE-LISTING.en.md    # en CWS listing 文案 (NEW)
└── scripts/
    ├── verify-manifest.ts # existing
    └── verify-zip.ts      # NEW: zip content assertions
```

### Pattern 1: WXT Zip Configuration
**What:** Configure WXT's zip behavior to exclude test-only artifacts
**When to use:** When production zip contains unnecessary files
**Example:**
```typescript
// wxt.config.ts - add zip section
// Source: https://wxt.dev/api/reference/wxt/interfaces/inlineconfig
export default defineConfig({
  // ... existing config ...
  zip: {
    // Exclude test-only mock adapter from production zip
    exclude: ['content-scripts/mock-platform.js'],
  },
});
```

### Pattern 2: Zip Content Verification Script
**What:** Post-build script that asserts zip contents match expectations
**When to use:** CI validation that zip is CWS-uploadable
**Example:**
```typescript
// scripts/verify-zip.ts
// Reads zip file listing and asserts structural requirements
import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve(process.cwd(), '.output');
const zipFiles = readdirSync(outputDir).filter(f => f.endsWith('-chrome.zip'));
// Assert: exactly one chrome zip exists
// Assert: manifest.json at root of zip
// Assert: icon/128.png exists (CWS requirement)
// Assert: no *.map files (source maps)
// Assert: _locales/en/messages.json + _locales/zh_CN/messages.json exist
```

### Pattern 3: Bilingual README Cross-Link Header
**What:** Standard header pattern for bilingual documentation files
**When to use:** All bilingual document pairs
**Example:**
```markdown
<!-- README.md (zh_CN) -->
[English](./README.en.md) | 简体中文

# Web2Chat
...
```
```markdown
<!-- README.en.md -->
English | [简体中文](./README.md)

# Web2Chat
...
```

### Anti-Patterns to Avoid
- **Single README with language toggle sections:** Makes the file overly long, confuses GitHub's language detection. Use separate files (D-83).
- **Embedding privacy policy inline in README:** CWS requires a stable URL pointing to a dedicated document. Keep PRIVACY.md separate.
- **Including screenshots/promotional images in this phase:** D-92 explicitly excludes these. They require design work outside of code.
- **Adding `markdownlint` as a dependency for anchor validation:** Overkill. A 20-line tsx script can parse markdown headings and assert both files have matching structure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zip creation | Custom archiver script | `wxt zip` (built-in) | Handles manifest placement, file structure, compression level correctly |
| Zip file listing | Node-based unzip library | `unzip -l` via child_process | Available on all CI runners, zero dependencies, one-liner |
| Manifest validation | New assertion code | Existing `verify-manifest.ts` | Already covers DST-03 requirements completely |

**Key insight:** Phase 7 is primarily a content-authoring phase. The build/packaging infrastructure is already complete from Phases 1-6. The only engineering work is a lightweight zip content assertion script and potentially excluding mock-platform from the zip.

## Common Pitfalls

### Pitfall 1: CWS Manifest Description vs Store Description Confusion
**What goes wrong:** Developers confuse the 132-char `manifest.description` field with the 16,000-char "Detailed Description" in the CWS dashboard.
**Why it happens:** Two different "description" concepts exist -- one in manifest.json (already set via `__MSG_extension_description__`), one entered manually in the dashboard.
**How to avoid:** STORE-LISTING.md contains the dashboard copy (short + detailed). The manifest description is managed by i18n locale files (already done in Phase 6).
**Warning signs:** If listing copy exceeds 132 chars and someone tries to put it in manifest.

### Pitfall 2: Privacy Policy URL Must Be Publicly Accessible
**What goes wrong:** Linking to a GitHub file on a private repo or using a branch-specific URL that breaks.
**Why it happens:** CWS dashboard requires a stable, publicly accessible URL for the privacy policy.
**How to avoid:** Use the raw GitHub URL pattern: `https://github.com/<user>/<repo>/blob/main/PRIVACY.md` -- this works for public repos. Alternatively, GitHub Pages.
**Warning signs:** CWS review rejection citing "privacy policy URL not accessible."

### Pitfall 3: Missing CWS Required Images (Out of Scope but Worth Noting)
**What goes wrong:** Attempting to submit to CWS without screenshots or the small promotional tile (440x280).
**Why it happens:** Phase 7 scope explicitly excludes screenshots/promotional images (D-92).
**How to avoid:** The README and STORE-LISTING files can be prepared now; actual CWS submission requires screenshots as a separate manual step.
**Warning signs:** Attempting actual CWS upload will fail without at least 1 screenshot + 1 promo tile.

### Pitfall 4: mock-platform.js in Production Zip
**What goes wrong:** Test-only content script bundled into production zip adds unnecessary bytes.
**Why it happens:** WXT bundles all files in `entrypoints/` regardless of registration mode.
**How to avoid:** Either (a) add `zip.exclude: ['content-scripts/mock-platform.js']` to wxt.config.ts, or (b) accept 3.4KB dead code (functionally harmless -- tree-shaken, never injected).
**Warning signs:** zip contents listing showing mock-platform.js (current state).

### Pitfall 5: README Anchor Mismatch Between Languages
**What goes wrong:** zh_CN and en README have different heading structure, breaking cross-references.
**Why it happens:** Translating headings without maintaining structural parity.
**How to avoid:** Write both files with identical heading hierarchy. Validate via a script that extracts `##` headings and compares sets.
**Warning signs:** Broken anchor links in one language version.

## Code Examples

### Zip Exclude Configuration
```typescript
// Source: Context7 WXT docs - zip configuration
// wxt.config.ts addition
export default defineConfig({
  // ... existing manifest/modules/vite config ...
  zip: {
    exclude: ['content-scripts/mock-platform.js'],
  },
});
```

### Verify-Zip Script Pattern
```typescript
// scripts/verify-zip.ts
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve(process.cwd(), '.output');
const zips = readdirSync(outputDir).filter(f => f.match(/.*-chrome\.zip$/));

if (zips.length !== 1) {
  console.error(`Expected exactly 1 chrome zip, found ${zips.length}`);
  process.exit(1);
}

const zipPath = resolve(outputDir, zips[0]);
const listing = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' });

const errors: string[] = [];

// Must have manifest.json at root
if (!listing.includes('manifest.json')) {
  errors.push('manifest.json not found in zip root');
}

// Must have 128px icon (CWS requirement)
if (!listing.includes('icon/128.png')) {
  errors.push('icon/128.png missing (CWS requires 128x128 icon)');
}

// Must have locale files
if (!listing.includes('_locales/en/messages.json')) {
  errors.push('_locales/en/messages.json missing');
}
if (!listing.includes('_locales/zh_CN/messages.json')) {
  errors.push('_locales/zh_CN/messages.json missing');
}

// Must NOT have source maps
if (listing.match(/\.map\s/)) {
  errors.push('Source map files found in zip (should be excluded)');
}

if (errors.length) {
  console.error('[verify-zip] FAIL:');
  errors.forEach(e => console.error('  -', e));
  process.exit(1);
}

console.log(`[verify-zip] OK - ${zips[0]} (${(require('fs').statSync(zipPath).size / 1024).toFixed(0)} KB)`);
```

### README Anchor Validation Script Pattern
```typescript
// scripts/verify-readme-anchors.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function extractHeadings(content: string): string[] {
  return content
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.replace(/^##\s+/, '').trim());
}

const root = process.cwd();
const zhContent = readFileSync(resolve(root, 'README.md'), 'utf-8');
const enContent = readFileSync(resolve(root, 'README.en.md'), 'utf-8');

const zhHeadings = extractHeadings(zhContent);
const enHeadings = extractHeadings(enContent);

if (zhHeadings.length !== enHeadings.length) {
  console.error(`Heading count mismatch: zh_CN has ${zhHeadings.length}, en has ${enHeadings.length}`);
  console.error('  zh_CN:', zhHeadings);
  console.error('  en:', enHeadings);
  process.exit(1);
}

console.log(`[verify-readme] OK - both READMEs have ${zhHeadings.length} sections`);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual zip with custom build scripts | `wxt zip` built-in command | WXT 0.19+ | No custom packaging needed |
| CWS manifest name limit 45 chars | 75 chars universal limit | 2024 | More room for descriptive names |
| No structured privacy disclosure | Privacy practices tab in dashboard | 2021 | Must fill data collection types in dashboard |
| No permissions justification | Required justification per permission | 2021 | Dashboard requires text for each permission |

**Deprecated/outdated:**
- `web_accessible_resources` format changed in MV3 (but not relevant here -- no WAR needed)
- `wxt zip` `ignoredSources` renamed to `excludeSources` in recent WXT versions

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CWS detailed description limit is ~16,000 chars | Pitfall 1 | LOW -- even if limit is different, our listing will be well under any reasonable limit |
| A2 | `unzip -l` is available on all CI runners (ubuntu-latest) | Code Examples | LOW -- standard utility on all Linux; could use Node alternative if missing |
| A3 | GitHub public repo raw URL is acceptable as CWS privacy policy link | Pitfall 2 | MEDIUM -- if repo is private, need alternative hosting |

## Open Questions

1. **mock-platform.js exclusion**
   - What we know: WXT bundles it as 3.4KB dead code. `zip.exclude` can remove it.
   - What's unclear: Whether excluding breaks any WXT internal expectations (unlikely for runtime-registered scripts).
   - Recommendation: Add `zip.exclude` config. If it causes issues, revert (harmless to keep).

2. **CWS dashboard fields not coverable by code**
   - What we know: Screenshots, small promo tile (440x280), permissions justification text, and privacy practices tab are filled manually in the CWS dashboard.
   - What's unclear: Whether to document these fields in STORE-LISTING.md for future reference.
   - Recommendation: Add a "Dashboard Fields (manual)" section in STORE-LISTING.md noting what needs to be filled, with suggested text for permissions justification. Do not attempt to automate this.

3. **Version bump for v1.0 release**
   - What we know: Current version is `0.1.0`. CWS requires version to increment on each upload.
   - What's unclear: Whether to bump to `1.0.0` in this phase or leave as `0.1.0` for now.
   - Recommendation: Leave as `0.1.0` (MVP pre-release). Version bump to `1.0.0` can happen when user decides to actually publish.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2 + tsx scripts |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `pnpm test --passWithNoTests` |
| Full suite command | `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DST-01 | Zip is CWS-compatible | smoke (script) | `pnpm build && pnpm zip && tsx scripts/verify-zip.ts` | Wave 0 |
| DST-02 | PRIVACY.md exists with required content | lint (script) | `tsx scripts/verify-readme-anchors.ts` (checks existence) | Wave 0 |
| DST-03 | Manifest permissions correct | unit | `pnpm verify:manifest` | Exists |
| DST-04 | README bilingual with matching structure | lint (script) | `tsx scripts/verify-readme-anchors.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint && pnpm test`
- **Per wave merge:** Full suite + verify:manifest + verify:zip
- **Phase gate:** Full suite green + all documentation files present + anchor validation green

### Wave 0 Gaps
- [ ] `scripts/verify-zip.ts` -- covers DST-01 zip structure validation
- [ ] `scripts/verify-readme-anchors.ts` -- covers DST-04 bilingual anchor parity + DST-02 file existence

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | no | -- (no runtime code changes) |
| V6 Cryptography | no | -- |

**Note:** Phase 7 is documentation and build verification only. No runtime code changes means no new attack surface. The existing `verify-manifest.ts` already enforces the critical security constraint (no `<all_urls>` in static `host_permissions`).

### Known Threat Patterns for Documentation Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privacy policy inaccuracy | Information Disclosure | Ensure PRIVACY.md matches actual behavior (cross-reference with code) |
| Overly broad permissions disclosure | Elevation of Privilege | Verify manifest matches claims in privacy policy |
| Sensitive data in README | Information Disclosure | No API keys, internal URLs, or PII in public docs |

## Chrome Web Store Specific Requirements

### CWS Upload Requirements Summary
| Requirement | Status | Notes |
|-------------|--------|-------|
| Zip file < 2GB | PASS | Current zip is 116KB [VERIFIED: local build] |
| manifest.json at zip root | PASS | Confirmed via `unzip -l` [VERIFIED: local build] |
| 128x128 icon in zip | PASS | `icon/128.png` (1,638 bytes) [VERIFIED: local build] |
| No `<all_urls>` in static host_permissions | PASS | Verified by `verify-manifest.ts` [VERIFIED: local build] |
| `default_locale` set | PASS | `"en"` [VERIFIED: production manifest] |
| `_locales/` directory present | PASS | en + zh_CN [VERIFIED: local build] |
| Name <= 75 chars | PASS | "Web2Chat" = 8 chars [VERIFIED: locale file] |
| Manifest description <= 132 chars | NEEDS CHECK | en: "One-click clip-and-send to your favorite IM or AI agent chat." (64 chars) PASS [VERIFIED: locale file] |

### CWS Dashboard Fields (Manual, Out of Phase Code Scope)
| Field | Limit | Prepared In |
|-------|-------|-------------|
| Short description / Summary | 132 chars (from manifest) | Already in `_locales/en/messages.json` `extension_description` |
| Detailed description | ~16,000 chars [ASSUMED] | STORE-LISTING.en.md |
| Category | 1 primary | "Productivity" recommended |
| Privacy policy URL | Valid public URL | `https://github.com/<user>/web2chat/blob/main/PRIVACY.md` |
| Screenshots | 1-5, 1280x800 or 640x400 | NOT in phase scope (D-92) |
| Small promo tile | 440x280 PNG/JPEG | NOT in phase scope (D-92) |
| Permissions justification | Per-permission text | Can document in STORE-LISTING.md for reference |
| Single purpose description | Free text | Can document in STORE-LISTING.md for reference |

### CWS Privacy Practices Tab Preparation
For the CWS dashboard privacy practices tab, Web2Chat should declare:
- **Data collected:** Web browsing activity (current tab URL), User-generated content (title, description, content, prompt)
- **Data usage:** Functionality (compose and send messages to target IM)
- **Data storage:** Local only (chrome.storage.local / .session)
- **Data sharing:** None -- no third parties
- **Remote code:** No
- **Limited use certification:** Compliant (data used only for stated purpose)

## Sources

### Primary (HIGH confidence)
- [Context7 /websites/wxt_dev] - zip configuration, publishing workflow, exclude patterns
- [Local build output] - `.output/web2chat-0.1.0-chrome.zip` contents verified via `unzip -l`
- [Local manifest] - `.output/chrome-mv3/manifest.json` production build inspected
- [verify-manifest.ts] - Existing script covers DST-03 completely

### Secondary (MEDIUM confidence)
- [Chrome Web Store Developer Docs](https://developer.chrome.com/docs/webstore/publish) - Upload requirements, manifest validation
- [Chrome Web Store Listing Dashboard](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) - Field limits, screenshot requirements
- [Chrome Web Store Privacy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) - Privacy policy requirements
- [Chrome Web Store Privacy Dashboard](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) - Privacy practices tab fields
- [Chrome Web Store Images](https://developer.chrome.com/docs/webstore/images) - Icon/screenshot/promo tile specs

### Tertiary (LOW confidence)
- Detailed description 16,000 char limit - commonly reported by developers but not explicitly in official docs [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, WXT zip verified working
- Architecture: HIGH - purely documentation + scripts, simple structure
- Pitfalls: HIGH - CWS requirements well-documented, verified against actual build output

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable domain -- CWS requirements change infrequently)
