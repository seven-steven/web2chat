---
phase: 10-slack-adapter
reviewed: 2026-05-14T07:30:00Z
depth: deep
files_reviewed: 2
files_reviewed_list:
  - shared/adapters/slack-format.ts
  - tests/unit/adapters/slack-format.spec.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 10: Code Review Report (Gap Closure — CR-01)

**Reviewed:** 2026-05-14T07:30:00Z
**Depth:** deep
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the CR-01 gap closure fix: list marker placeholder protection in `convertMarkdownToMrkdwn` to prevent asterisk list markers from being consumed by the italic regex. The fix itself (step 6 — list marker extraction before italic conversion) is **correct and well-implemented**. The three new regression tests cover the reported scenario adequately.

However, deep cross-step analysis uncovered a **pre-existing placeholder nesting bug**: when bold (`**text**`) appears inside a Markdown heading (`# text **bold**`), the BOLD placeholder gets captured inside the HEADING token string and is never restored, leaking `@@W2C_BOLD_0@@` into the final output. Similarly, italic inside headings is never converted because heading content is captured before the italic step runs. These are practical bugs — web articles commonly have inline formatting in headings, and Turndown produces `# Title with **bold**` patterns.

## Critical Issues

### CR-01: BOLD placeholder leaks when nested inside HEADING token

**File:** `shared/adapters/slack-format.ts:72-74,79-81,103-104`
**Issue:** The restore order (BOLD before HEADING) is incorrect for nested cases. When input contains `# Title with **bold**`:
1. Step 3 (bold): `# Title with @@W2C_BOLD_0@@` — boldTokens stores `*bold*`
2. Step 4 (heading): captures `*Title with @@W2C_BOLD_0@@*` into headingTokens — the BOLD placeholder string is now embedded inside the HEADING token
3. Restore BOLD: searches the main result string `@@W2C_HEADING_0@@` — no match found (the BOLD placeholder is inside headingTokens, not in result)
4. Restore HEADING: expands to `*Title with @@W2C_BOLD_0@@*` — the BOLD placeholder is now in the result string, but BOLD restore already ran
5. **Final output:** `*Title with @@W2C_BOLD_0@@*` — raw placeholder leaked to user-visible Slack message

This is a **pre-existing bug** (not introduced by CR-01) but has practical impact: web articles processed by Readability + Turndown commonly produce headings with bold text inside them.

**Fix:** Two changes needed:
1. Swap restore order so HEADING is restored before BOLD (so BOLD placeholder re-enters the result string before BOLD restore runs):
```typescript
// 9. Restore placeholders (LIST markers restored as empty — effectively stripped)
result = result.replace(/@@W2C_LIST_(\d+)@@/g, () => '');
result = result.replace(/@@W2C_HEADING_(\d+)@@/g, (_, i) => headingTokens[Number(i)] ?? '');
result = result.replace(/@@W2C_BOLD_(\d+)@@/g, (_, i) => boldTokens[Number(i)] ?? '');
result = result.replace(/@@W2C_INLINE_(\d+)@@/g, (_, i) => inlineCodes[Number(i)] ?? '');
result = result.replace(/@@W2C_FENCED_(\d+)@@/g, (_, i) => fencedBlocks[Number(i)] ?? '');
```
2. For the italic-inside-heading issue (`# Title with *italic*` produces `*Title with *italic**` — malformed mrkdwn), a deeper fix would require processing heading content through italic conversion before wrapping with `*...*`, or restructuring the pipeline so italic conversion runs before heading extraction.

## Warnings

### WR-01: Italic inside headings is never converted to `_text_`

**File:** `shared/adapters/slack-format.ts:79-81`
**Issue:** Heading content is captured as-is (including `*italic*` markers) before the italic conversion step runs. Input `# Title with *italic*` produces `*Title with *italic**` — the italic markers are preserved as raw `*` which Slack interprets as bold boundaries, producing corrupted formatting. This is related to CR-01 but distinct (wrong content, not a leaked placeholder).

**Fix:** Process italic within heading content during heading extraction, or restructure so italic conversion runs before heading capture. Simplest fix:
```typescript
// 4. Convert headings: ## text -> *text*
//    Apply italic conversion to heading content before wrapping with bold markers
result = result.replace(/^#{1,6}\s+(.+)$/gm, (_, content: string) => {
  const italicConverted = content.replace(
    /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_'
  );
  headingTokens.push(`*${italicConverted}*`);
  return PH('HEADING', headingTokens.length - 1);
});
```

### WR-02: Link regex fails on URLs containing parentheses

**File:** `shared/adapters/slack-format.ts:85`
**Issue:** The link regex `\[(.+?)\]\((.+?)\)` uses lazy quantifiers that stop at the first `)`. For URLs containing parentheses (e.g., Wikipedia-style URLs `[text](https://en.wikipedia.org/wiki/Fish_(disambiguation))`), the regex captures only up to the first `)`, producing `<https://en.wikipedia.org/wiki/Fish_(disambiguation|text>` — a malformed Slack link.

**Fix:** For the Turndown context, URLs with parentheses are uncommon but possible. A more robust regex:
```typescript
// Match balanced parentheses in URL (simple approach: greedy capture up to last ) before ])
result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');
```
Note: This remains imperfect for nested parens. A complete fix would require a proper Markdown parser, but the simplified regex `[^\]]+` / `[^)]+` is still an improvement over `.+?`.

## Info

### IN-01: Test label "bold-like" is misleading for italic test data

**File:** `tests/unit/adapters/slack-format.spec.ts:228-230`
**Issue:** The test name says "multiline asterisk list with mixed italic" and the input has `*bold-like*` — but this is italic (`*text*`), not bold (`**text**`). The word "bold-like" in the test data could confuse future readers into thinking bold is being tested here.

**Fix:** Rename the test data to avoid confusion:
```typescript
it('correctly handles multiline asterisk list with mixed italic', () => {
  const input = '* first\n* second with *emphasized*';
  const result = convertMarkdownToMrkdwn(input);
  expect(result).toBe('first\nsecond with _emphasized_');
});
```

### IN-02: Missing test coverage for heading+bold and heading+italic nesting

**File:** `tests/unit/adapters/slack-format.spec.ts`
**Issue:** There are no tests for Markdown patterns where bold or italic appear inside headings (e.g., `# Title with **bold**` or `# Title with *italic*`). These are the patterns that trigger the CR-01 nesting bug. While this is a pre-existing coverage gap, the deep review surface area for the placeholder system makes this worth adding.

**Fix:** Add regression tests:
```typescript
it('correctly handles bold inside heading', () => {
  expect(convertMarkdownToMrkdwn('# Title with **bold**')).toBe('*Title with *bold**');
});

it('correctly handles italic inside heading', () => {
  expect(convertMarkdownToMrkdwn('# Title with *italic*')).toBe('*Title with _italic_*');
});
```

---

_Reviewed: 2026-05-14T07:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
