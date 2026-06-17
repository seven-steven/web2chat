---
status: verified
phase: 16-release-acceptance-ops-baseline
source: [16-VERIFICATION.md]
started: 2026-06-16T09:58:00Z
updated: 2026-06-17T00:15:00Z
---

## Current Test

Closed via Playwright `launchPersistentContext` against `pnpm site:build` dist served by `vite preview` (http://localhost:4178), 2026-06-17. Viewport-driven, computed-style + bounding-rect assertions (not bare DOM-presence checks). Evidence screenshot: `phase16-uat-en-desktop.png` (repo root).

## Tests

### 1. WCAG G201 visible glyph rendering

expected: Visible ↗ glyph appended after each of the 3 external-link CTAs (hero-primary, footer-primary, footer-secondary) in both en and zh_CN locales; sr-only "opens in new tab" / "（在新标签页中打开）" text hidden visually but present in the DOM (DevTools) and readable by assistive tech.
result: PASS

Evidence (3 CTAs, both locales):
- zh_CN (`<html lang="zh-CN">`): hero-primary / footer-primary = "查看项目源码↗"; footer-secondary = "安装指引↗". All 3 render visible `↗` glyph (`/[↗]/` true in textContent). sr-only = "（在新标签页中打开）".
- en (`<html lang="en">` after clicking `button[data-testid="locale-toggle"]`): hero-primary / footer-primary = "View project source↗"; footer-secondary = "Installation guide↗". All 3 `hasArrowGlyph: true`. sr-only = "(opens in new tab)".
- sr-only visual-hiding (WCAG G201): `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0px,0px,0px,0px); clip-path:inset(50%)` → `visuallyHidden: true` (present for AT, off-screen for sighted users).
- All 3 CTAs have `target="_blank"` + `rel="noopener noreferrer"`, each rendered with nonzero box (rectW=163, rectH=44).

How to run: `pnpm site:build && (cd apps/marketing && pnpm vite preview --port 4178)`; Playwright `browser_evaluate` over `a[target="_blank"]`.

### 2. Responsive / navigation smoke (SC3 visual dimension)

expected: No horizontal scroll at mobile width (375px); all CTAs clickable; no overlapping content; page navigable end-to-end at desktop (1280px) and mobile.
result: PASS

Evidence:
- Mobile 375px (viewport 375, innerWidth 360): `scrollWidth(360) === clientWidth(360)`, `hasHorizontalScroll: false`. No horizontal overflow at the smallest breakpoint.
- Desktop 1280px: `scrollWidth(1265) === clientWidth(1265)`, `desktopHorizontalScroll: false`.
- All 3 external CTAs rendered visible (`rect.width>0 && rect.height>0`); locale toggle (`button[data-testid="locale-toggle"]`) clickable and switches `<html lang>` zh-CN ↔ en.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None. Both human-only dimensions (G201 visible glyph + responsive) closed by headed-browser-equivalent Playwright verification. Phase 16 verification fully automated-confirmable + visually confirmed.
