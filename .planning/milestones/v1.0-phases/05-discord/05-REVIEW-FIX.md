---
phase: 05-discord
fixed_at: 2026-05-05T12:04:00Z
review_path: .planning/phases/05-discord/05-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-05-05T12:04:00Z
**Source review:** .planning/phases/05-discord/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: escapeMentions regex matches partial words -- corrupts legitimate content

**Files modified:** `shared/adapters/discord-format.ts`, `tests/unit/adapters/discord-format.spec.ts`
**Commit:** d0f6399
**Applied fix:** Added `(?<!\w)` negative lookbehind and `\b` word boundary to the escapeMentions regex, changing `/@(everyone|here)/g` to `/(?<!\w)@(everyone|here)\b/g`. This prevents false positives on `@hereford`, `@everywhere`, and email addresses like `user@everyone.com`. Added 3 false-positive test cases. Also fixed pre-existing ESLint `no-irregular-whitespace` errors in JSDoc comments by replacing literal ZWS characters with `[ZWS]` text placeholders.

### WR-01: Hardcoded Chinese label "采集时间" bypasses i18n

**Files modified:** `shared/adapters/discord-format.ts`
**Commit:** 85e78e9
**Applied fix:** Added optional `timestampLabel` parameter to `composeDiscordMarkdown` with backward-compatible default `'采集时间:'`. Callers (e.g., discord.content.ts) can now pass `t('capture_field_createAt')` for proper localization. Existing tests continue to pass since the default preserves current behavior.

### WR-02: Stale default string 'mock' in dispatch pipeline error path

**Files modified:** `background/dispatch-pipeline.ts`
**Commit:** ee1a28d
**Applied fix:** Replaced `response.message ?? 'mock'` with `response.message ?? 'Adapter returned an unknown error'` at line 256 of dispatch-pipeline.ts.

### WR-03: Stale docstring in verify-manifest.ts

**Files modified:** `scripts/verify-manifest.ts`
**Commit:** 0aa8ce3
**Applied fix:** Updated docstring at line 6 to include `webNavigation` in the permissions list, matching the actual assertion at line 66.

---

_Fixed: 2026-05-05T12:04:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
