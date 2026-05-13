---
phase: 10-slack-adapter
reviewed: 2026-05-14T01:30:00Z
depth: deep
files_reviewed: 5
files_reviewed_list:
  - shared/adapters/slack-format.ts
  - entrypoints/slack.content.ts
  - background/injectors/slack-main-world.ts
  - tests/unit/adapters/slack-format.spec.ts
  - tests/unit/adapters/slack-selector.spec.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-14T01:30:00Z
**Depth:** deep
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Gap closure review for Phase 10 plan 10-05. Reviewed `convertMarkdownToMrkdwn` (placeholder-based Markdown-to-mrkdwn converter), content truncation at 35000 chars, polling-based send confirmation (5x300ms), and the 300ms Enter delay in the MAIN world injector. Cross-file analysis traced the full pipeline from content script through SW port bridge to MAIN world injector and back.

One critical bug found: the `convertMarkdownToMrkdwn` function applies italic conversion (step 6) before list marker removal (step 7), causing asterisk-prefixed list items containing italic text to produce corrupted mrkdwn output. Since Turndown uses `*` for unordered lists by default, this affects real web content. Two warnings: placeholder collision vulnerability and truncation producing broken mrkdwn formatting at the cut boundary. Two info items.

Previous review findings CR-01 (hardcoded Chinese timestamp) and WR-03 (subteam mentions) are confirmed resolved in the gap closure changes.

## Critical Issues

### CR-01: Asterisk list items with italic text produce corrupted mrkdwn output

**File:** `shared/adapters/slack-format.ts:85-88`
**Issue:** In `convertMarkdownToMrkdwn`, italic conversion (step 6, line 85) runs before list marker removal (step 7, line 88). When content has an asterisk list item containing italic text, the italic regex matches the list marker `*` as an opening italic delimiter, consuming text until the first italic asterisk, producing broken output.

Example: `* item with *important* text` produces `_ item with _important* text` instead of `item with _important_ text`.

The italic regex `(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)` matches `* item with *` as an italic span (the non-greedy `.+?` matches ` item with `), leaving `important* text` with an unmatched closing asterisk.

This is high impact because Turndown uses `*` for unordered lists by default. Any web page with an unordered list containing emphasized text will produce garbled Slack output.

**Fix:** Move list marker removal (step 7) before italic conversion (step 6). However, simply reordering is insufficient because the italic regex would then match bare `*text*` on lines that previously had list markers stripped. A better approach: extract and protect list markers before italic conversion, similar to how bold is protected with placeholders.

```typescript
// After step 5 (links), before italic:
// 6a. Extract list markers into placeholders (like bold/headings)
const listTokens: string[] = [];
result = result.replace(/^[-*]\s+(.+)$/gm, (_, content: string) => {
  listTokens.push(content); // store content WITHOUT the marker
  return PH('LIST', listTokens.length - 1);
});

// 6b. Convert italic: *text* -> _text_
result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_');

// ... later, restore list placeholders:
result = result.replace(/@@W2C_LIST_(\d+)@@/g, (_, i) => listTokens[Number(i)] ?? '');
```

## Warnings

### WR-01: Placeholder pattern collision with user content

**File:** `shared/adapters/slack-format.ts:50`
**Issue:** The placeholder format `@@W2C_<TAG>_<N>@@` is not guaranteed to be unique against user content. If captured web content contains the literal string `@@W2C_BOLD_0@@`, the restore step (line 94) will replace it with a bold token value instead of preserving the original text. Testing confirmed:

- Input: `some text @@W2C_BOLD_0@@ more text **real bold**` produces `some text *real bold* more text *real bold*` (duplicate substitution).
- Input: `some text @@W2C_BOLD_0@@ more text` (no bold) produces `some text  more text` (text deleted via `?? ''` fallback).

The likelihood is low (`@@W2C_` is an unusual prefix), but the consequence is silent data corruption. This is a design weakness in the placeholder scheme.

**Fix:** Use a UUID-based or sufficiently random prefix to make collision astronomically unlikely:

```typescript
const PH = (tag: string, idx: number) => `\x00W2C_${tag}_${idx}\x00`;
```

Using null bytes (`\x00`) as delimiters guarantees no collision with web content, since null bytes are stripped during HTML parsing and cannot appear in text nodes.

### WR-02: Truncation can cut mid-mrkdwn-entity, producing broken formatting

**File:** `shared/adapters/slack-format.ts:123-126`
**Issue:** When content exceeds 35000 chars, `rawContent.slice(0, TRUNCATE_LIMIT)` performs a blind character cut. This can slice mid-mrkdwn-entity, producing broken output. For example, if a bold marker `*bold tex` is cut mid-way, Slack receives an unclosed bold delimiter. Similarly, a link `<https://example.com|exa` would be cut mid-link.

Testing confirmed: content of length 35103 with bold at position 34997-35005 produces truncated output ending with `aaaaaaa*bo\n...[truncated]`, leaving a broken bold marker.

This is a cosmetic issue (the truncated portion is discarded content), but Slack may render the broken formatting in the visible portion, e.g., rendering `*bo\n...[truncated]` as partially bold.

**Fix:** Truncate at the last newline boundary before the limit:

```typescript
const rawContent = snapshot.content ? convertMarkdownToMrkdwn(snapshot.content) : '';
let truncatedContent: string;
if (rawContent.length > TRUNCATE_LIMIT) {
  const cut = rawContent.lastIndexOf('\n', TRUNCATE_LIMIT);
  truncatedContent = rawContent.slice(0, cut > 0 ? cut : TRUNCATE_LIMIT) + '\n...[truncated]';
} else {
  truncatedContent = rawContent;
}
```

## Info

### IN-01: No test for asterisk list items containing italic text

**File:** `tests/unit/adapters/slack-format.spec.ts:188-194`
**Issue:** The test suite has individual tests for `* item` (asterisk list) conversion and `*italic*` conversion, but no combined test case. The CR-01 bug would have been caught by a test like `'* first item *important* here'`.

**Fix:** Add test:
```typescript
it('correctly handles asterisk list items containing italic text', () => {
  const input = '* item with *important* text';
  // List marker should be stripped, italic preserved
  const result = convertMarkdownToMrkdwn(input);
  // After fix: should be 'item with _important_ text'
  expect(result).not.toMatch(/^_/); // should not start with italic marker
});
```

### IN-02: MAIN world post-Enter cleanup race with content script poll

**File:** `background/injectors/slack-main-world.ts:53-75`
**Issue:** The MAIN world injector has a 200ms post-Enter cleanup check (line 66) that dispatches `deleteContentBackward` if residual text remains. Meanwhile, the content script starts polling editor textContent 300ms after the paste response arrives. Since the content script only sees the paste response after the MAIN world script finishes (minimum 500ms), the polling timeline is: first poll at ~800ms, last poll at ~2000ms. The 200ms cleanup in MAIN world fires at ~500ms, well before the first poll, so it does not interfere. This is safe but the timing relationship is implicit and fragile -- if delays change independently, the race could break.

**Fix:** Add a comment in `slack.content.ts` near the polling loop documenting the timing dependency:
```typescript
// Polling assumes MAIN world script takes >= 500ms (300ms + 200ms internal delays).
// The 200ms post-Enter cleanup in MAIN world fires before our first poll (~800ms).
// Do NOT reduce CONFIRM_POLL_INTERVAL_MS without verifying this invariant.
```

---

## Appendix: Gap Closure Resolution Status

| Prev Finding | Status | Notes |
|---|---|---|
| CR-01 (hardcoded Chinese timestamp) | RESOLVED | `timestampLabel` is now a required parameter; caller passes `t('slack_timestamp_label')` |
| WR-03 (subteam mentions) | RESOLVED | `<!subteam^...>` escaping added at line 35-38 |
| WR-01 (beforeinput race) | STILL PRESENT | Comment acknowledges best-effort nature; acceptable |
| WR-02 (i18n omits Slack) | OUT OF SCOPE | Not in gap closure files |
| WR-04 (stale comment) | OUT OF SCOPE | Not in gap closure files |
| WR-05 (test hardcoded Chinese) | RESOLVED | Tests now pass explicit `timestampLabel` parameter |

_Reviewed: 2026-05-14T01:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
