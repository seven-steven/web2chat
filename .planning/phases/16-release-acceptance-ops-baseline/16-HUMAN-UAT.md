---
status: partial
phase: 16-release-acceptance-ops-baseline
source: [16-VERIFICATION.md]
started: 2026-06-16T09:58:00Z
updated: 2026-06-16T09:58:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. WCAG G201 visible glyph rendering

expected: Visible ↗ glyph appended after each of the 3 external-link CTAs (hero-primary, footer-primary, footer-secondary) in both en and zh_CN locales; sr-only "opens in new tab" / "（在新标签页中打开）" text hidden visually but present in the DOM (DevTools) and readable by assistive tech.
result: [pending]

How to run: `pnpm site:dev` (or `pnpm site:preview`) in a real browser; inspect the 3 CTAs across en + zh_CN.

### 2. Responsive / navigation smoke (SC3 visual dimension)

expected: No horizontal scroll at mobile width (375px); all CTAs clickable; no overlapping content; page navigable end-to-end at desktop (1280px) and mobile.
result: [pending]

How to run: resize browser across 375px and 1280px; click through CTAs.

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
