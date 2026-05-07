---
phase: 07-distribution
reviewed: 2026-05-07T12:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - scripts/verify-zip.ts
  - scripts/verify-readme-anchors.ts
  - wxt.config.ts
  - package.json
  - PRIVACY.md
  - PRIVACY.zh_CN.md
  - README.md
  - README.en.md
  - STORE-LISTING.md
  - STORE-LISTING.en.md
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-07T12:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed 10 files from the Phase 7 distribution wave: two verification scripts (`verify-zip.ts`, `verify-readme-anchors.ts`), WXT build config, `package.json`, two PRIVACY policies, two READMEs, and two STORE-LISTING references.

Overall quality is solid. The verification scripts have clear assertion contracts, the WXT config correctly gates dev-only permissions, and the documentation is well-structured with proper bilingual coverage. Found one security-adjacent warning in shell command construction and three minor quality items.

## Warnings

### WR-01: Shell command injection surface in verify-zip.ts

**File:** `scripts/verify-zip.ts:52`
**Issue:** `execSync` receives a string-interpolated shell command (`unzip -l "${zipPath}"`). Although `zipFileName` originates from `readdirSync` (not user input) and is double-quoted, a crafted filename containing `"` characters could break out of the quoting. In practice WXT generates predictable zip names, so the risk is negligible, but `execFileSync` is the idiomatic safe alternative that avoids shell parsing entirely.
**Fix:**
```typescript
import { execFileSync } from 'node:child_process';

// Replace line 52:
listing = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf-8' });
```

## Info

### IN-01: Redundant extractH2Headings call in verify-readme-anchors.ts

**File:** `scripts/verify-readme-anchors.ts:73`
**Issue:** `extractH2Headings(readmeZhPath)` is called twice when all files exist: once inside the `if` block at line 45, and again at line 73 for the success message. The result from line 45 could be reused by hoisting the variable declaration outside the `if` block, avoiding a redundant file read.
**Fix:** Move `const zhHeadings` declaration before the `if` block at line 44, assign inside the block, and reference at line 73.

### IN-02: Untranslated section heading in zh_CN README

**File:** `README.md:74`
**Issue:** The heading `## Limitations` is in English while the body text below it is in Chinese. Every other H2 heading in `README.md` uses Chinese. This is an inconsistency in the bilingual separation.
**Fix:** Change to `## 限制` to match the rest of the zh_CN README headings.

### IN-03: Placeholder <owner> in STORE-LISTING while PRIVACY files use actual owner

**File:** `STORE-LISTING.md:67` and `STORE-LISTING.en.md:67`
**Issue:** The privacy policy URL uses `<owner>` placeholder (`https://github.com/<owner>/web2chat/blob/main/PRIVACY.md`), but `PRIVACY.md` and `PRIVACY.zh_CN.md` already reference the actual GitHub URL (`https://github.com/nicholaschenai/web2chat`). Since the real owner is known, the STORE-LISTING could use the actual URL to avoid a manual step during CWS submission.
**Fix:** Replace `<owner>` with `nicholaschenai` in both STORE-LISTING files, or add a note that this is intentional (deferred until repo visibility is finalized).

---

_Reviewed: 2026-05-07T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
