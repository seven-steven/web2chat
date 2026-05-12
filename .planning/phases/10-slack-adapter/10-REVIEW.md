---
phase: 10-slack-adapter
reviewed: 2026-05-13T00:52:00Z
depth: deep
files_reviewed: 20
files_reviewed_list:
  - background/injectors/slack-main-world.ts
  - background/main-world-registry.ts
  - entrypoints/popup/components/PlatformIcon.tsx
  - entrypoints/popup/components/SendForm.tsx
  - entrypoints/slack.content.ts
  - locales/en.yml
  - locales/zh_CN.yml
  - scripts/verify-manifest.ts
  - shared/adapters/registry.ts
  - shared/adapters/slack-format.ts
  - shared/adapters/slack-login-detect.ts
  - tests/unit/adapters/slack-format.spec.ts
  - tests/unit/adapters/slack-i18n.spec.ts
  - tests/unit/adapters/slack-login-detect.spec.ts
  - tests/unit/adapters/slack-match.spec.ts
  - tests/unit/adapters/slack-selector.spec.ts
  - tests/unit/adapters/slack.fixture.html
  - tests/unit/dispatch/platform-detector.spec.ts
  - tests/unit/scripts/verify-manifest.spec.ts
  - wxt.config.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-13T00:52:00Z
**Depth:** deep
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Deep review of Phase 10 (Slack adapter) covering 20 source files across content script injection, mrkdwn formatting, mention escaping, login detection, registry wiring, i18n, and build config. Cross-file analysis traced the MAIN world port bridge from content script through service worker to the injector function.

One critical issue found: the `composeSlackMrkdwn` function hardcodes the timestamp label as a Chinese string (`采集时间:`) regardless of user locale, violating the project's i18n requirement and exposing non-localized text to non-Chinese users.

Five warnings: (1) `beforeinput deleteContentBackward` dispatch does not actually clear editor text content -- it relies on the editor framework to handle the event, but the code comments and intent suggest direct DOM clearing; (2) i18n placeholder and error messages reference "Discord and OpenClaw" but omit Slack; (3) `<!subteam^...>` usergroup mentions are not escaped; (4) verify-manifest comment is stale; (5) test asserts a hardcoded Chinese string that perpetuates the i18n defect.

Three info items: redundant `waitForEditor` function duplicating part of `waitForReady` logic, no test for `@channel` bare mention escaping, and mention regex only covers `U`/`W` user ID prefixes (not `B` bot IDs, though those are not mentionable).

## Critical Issues

### CR-01: Hardcoded Chinese timestamp label in shared utility

**File:** `shared/adapters/slack-format.ts:49`
**Issue:** `composeSlackMrkdwn` has `timestampLabel = '采集时间:'` as the default parameter value. The only caller (`entrypoints/slack.content.ts:317`) does not pass `timestampLabel`, so every Slack dispatch uses the Chinese string `采集时间:` regardless of the user's locale setting. This violates the project convention "用户可见的字符串全部走 `t(...)`" (CLAUDE.md) and the i18n requirement that "en 与 zh_CN locale 文件必须达到 100% 键覆盖率."

The function lives in `shared/adapters/` (no WXT/chrome dependency), so it cannot directly call `t()`. The fix is to make `timestampLabel` a required parameter and pass the i18n-resolved value from the content script caller.

**Fix:**

```typescript
// shared/adapters/slack-format.ts — remove default, make required
export function composeSlackMrkdwn(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel: string;  // REQUIRED, no default
}): string {
  const { prompt, snapshot, timestampLabel } = payload;
  // ...
}

// entrypoints/slack.content.ts — pass i18n value
import { t } from '@/shared/i18n';
const message = composeSlackMrkdwn({
  prompt: payload.prompt,
  snapshot: payload.snapshot,
  timestampLabel: t('slack_timestamp_label') + ' ',
});
```

Also add `slack_timestamp_label` key to both `locales/en.yml` and `locales/zh_CN.yml`.

## Warnings

### WR-01: `beforeinput deleteContentBackward` does not clear editor text

**File:** `background/injectors/slack-main-world.ts:29-37` and `background/injectors/slack-main-world.ts:57-67`
**Issue:** The code dispatches a `beforeinput` event with `inputType: 'deleteContentBackward'` and then immediately checks `editor.textContent` to decide what to do next. However, `dispatchEvent()` is synchronous -- the `beforeinput` event is dispatched, but the editor framework (Quill) must handle it asynchronously. The code does not `await` any framework processing. The `editor.textContent` check on line 59 (post-Enter cleanup) will therefore always see the same text that was there before, unless Quill happened to process it within the 200ms `setTimeout` on line 58.

The same pattern exists in `discord-main-world.ts` and was noted as a "UAT regression fix." In practice, Quill/Slate may process the event, but the code's correctness depends on a race condition between the event handler and the textContent check.

**Fix:** If the intent is a best-effort cleanup (acceptable given the defensive nature), add a comment explicitly acknowledging the race condition. If deterministic clearing is needed, use `editor.textContent = ''` before dispatching the paste event, then let Quill reconcile via its MutationObserver.

### WR-02: i18n messages reference "Discord and OpenClaw" but omit Slack

**File:** `locales/en.yml:132` and `locales/zh_CN.yml:132`
**Issue:** `error_code_PLATFORM_UNSUPPORTED_body` says "web2chat supports Discord and OpenClaw in v1" (en) / "v1 仅支持 Discord 与 OpenClaw" (zh_CN). Since Slack is now supported, this message is inaccurate -- a user who enters an unsupported platform URL will be told only Discord and OpenClaw are supported.

Similarly, `combobox_send_to_placeholder` says "Paste a Discord channel or OpenClaw chat URL..." but does not mention Slack.

**Fix:** Update both locale files:
```yaml
# en.yml
error_code_PLATFORM_UNSUPPORTED_body:
  message: 'web2chat supports Discord, Slack, and OpenClaw in v1. Other platforms come later.'
combobox_send_to_placeholder:
  message: 'Paste a Discord channel, Slack channel, or OpenClaw chat URL...'

# zh_CN.yml
error_code_PLATFORM_UNSUPPORTED_body:
  message: 'v1 支持 Discord、Slack 与 OpenClaw，其他平台后续版本支持。'
combobox_send_to_placeholder:
  message: '粘贴 Discord 频道、Slack 频道或 OpenClaw 会话 URL...'
```

### WR-03: `<!subteam^...>` usergroup mentions not escaped

**File:** `shared/adapters/slack-format.ts:24-35`
**Issue:** The `escapeSlackMentions` function handles `<!everyone>`, `<!here>`, `<!channel>`, `<@U...>`, `<@W...>`, `<#C...>`, and bare `@everyone`/`@here`. It does NOT handle Slack usergroup mentions in the form `<!subteam^S12345>` or `<!subteam^S12345|@group-name>`. If a user's captured web content contains this pattern (e.g., from copying Slack message text), it would trigger a usergroup ping on dispatch.

This is lower severity because the `<!subteam^...>` format is Slack-specific internal syntax unlikely to appear in arbitrary web content, but it is a gap in the mention escaping coverage.

**Fix:** Add a regex for subteam mentions:
```typescript
// Break <!subteam^S12345> and <!subteam^S12345|@name> with ZWS after !
result = result.replace(/<!subteam\^[A-Z0-9]+(?:\|[^>]*)?>/g, (m) => {
  return '<!' + ZWS + m.slice(2);
});
```

### WR-04: verify-manifest.ts header comment is stale

**File:** `scripts/verify-manifest.ts:7`
**Issue:** The file header comment says `host_permissions === ['https://discord.com/*']` but the actual assertion on line 79-81 expects `['https://app.slack.com/*', 'https://discord.com/*']`. The comment no longer matches the code, which could mislead future developers reading the header to understand the contract.

**Fix:**
```typescript
// Line 7: update comment
//   - host_permissions === ['https://app.slack.com/*', 'https://discord.com/*'] (NO `<all_urls>` ever)
```

### WR-05: Test perpetuates hardcoded Chinese string instead of testing i18n

**File:** `tests/unit/adapters/slack-format.spec.ts:23`
**Issue:** The test asserts `expect(result).toContain('> 采集时间: 2026-05-01T12:00:00.000Z')` which hardcodes the Chinese timestamp label. This test will break if the default is fixed to use i18n (CR-01). The test should either pass an explicit `timestampLabel` or verify the label is parameterized.

**Fix:** Pass explicit `timestampLabel` in test:
```typescript
const result = composeSlackMrkdwn({
  prompt: 'Summarize this',
  snapshot: fullSnapshot,
  timestampLabel: 'Captured at:',
});
// Then assert:
expect(result).toContain('> Captured at: 2026-05-01T12:00:00.000Z');
```

## Info

### IN-01: Redundant `waitForEditor` function duplicates `waitForReady` logic

**File:** `entrypoints/slack.content.ts:194-219`
**Issue:** `waitForEditor()` (lines 194-219) is a simplified version of `waitForReady()` (lines 135-171) that only waits for the editor without login-wall detection. `waitForReady` already handles the editor-found case. The only difference is `waitForEditor` returns `null` on timeout instead of `{ kind: 'timeout' }`. The fallback path at line 288-289 (`waitForEditor(remainingBudget)`) could be replaced by a second `waitForReady` call with adjusted timeout, eliminating ~25 lines of near-duplicate code.

**Fix:** Extract a shared `createObserver` helper or reuse `waitForReady` in the fallback path with a modified timeout.

### IN-02: No test for bare `@channel` mention escaping

**File:** `tests/unit/adapters/slack-format.spec.ts`
**Issue:** The `escapeSlackMentions` tests cover bare `@everyone` and `@here`, and bracketed `<!channel>`, but there is no test for bare `@channel`. While `@channel` is less commonly used outside of bracket syntax, Slack does trigger on bare `@channel` in some contexts. The regex `(?<!\w)@(everyone|here)\b` only matches `everyone` and `here`, not `channel` -- this is correct per Slack's behavior (bare `@channel` does not trigger a mention; only `<!channel>` does). However, adding an explicit test for `@channel` being unchanged would document this design decision.

**Fix:** Add test:
```typescript
it('@channel unchanged (bare @channel is not a Slack mention)', () => {
  expect(escapeSlackMentions('@channel')).toBe('@channel');
});
```

### IN-03: Mention regex only covers U/W user ID prefixes

**File:** `shared/adapters/slack-format.ts:29`
**Issue:** The regex `/<@([UW][A-Z0-9]+)>/g` only matches Slack user IDs starting with `U` or `W`. Slack also has `B`-prefixed bot IDs, but `<@B...>` is not a valid mention target in Slack (bots are mentioned by their user ID, not bot ID). The regex is correct for practical purposes. However, future Slack API changes could introduce new ID prefixes. Consider using a more permissive pattern like `/<@([A-Z][A-Z0-9]+)>/g` if broader coverage is desired.

---

_Reviewed: 2026-05-13T00:52:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
