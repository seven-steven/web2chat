---
status: diagnosed
trigger: "Discord platform icon is wrong in popup - user wants correct Discord Clyde logo"
created: 2026-05-05T15:00:00Z
updated: 2026-05-05T15:15:00Z
---

## Current Focus

hypothesis: The Discord icon SVG path in PlatformIcon.tsx uses a simplified/inaccurate version of the Clyde logo (M19.27 5.33...) instead of the official Discord brand path (M20.317 4.3698...)
test: Compare path data against Simple Icons canonical Discord SVG
expecting: Paths differ - code uses icon-library simplification, not official brand shape
next_action: Report root cause and recommend replacing with Simple Icons path

## Symptoms

expected: Discord Clyde logo (game controller-shaped face) displayed correctly in popup
actual: Icon appears wrong/inaccurate per user report
errors: none
reproduction: Open popup on a Discord channel page (discord.com/channels/<g>/<c>)
started: Phase 05-03 implementation (replaced DISCORD_GLYPH letterform with SVG path)

## Eliminated

- hypothesis: SVG rendering broken due to parent fill="none" conflicting with child fill="currentColor"
  evidence: Child <path fill="currentColor"> correctly overrides parent fill="none"; <g stroke="none"> correctly removes stroke. SVG inheritance works correctly here.
  timestamp: 2026-05-05T15:05:00Z

- hypothesis: Platform detection fails so icon never renders
  evidence: UAT test 2 confirms "DM URL correctly not matched" and icon does show, just wrong appearance
  timestamp: 2026-05-05T15:06:00Z

## Evidence

- timestamp: 2026-05-05T15:02:00Z
  checked: entrypoints/popup/components/PlatformIcon.tsx lines 108-115
  found: Discord variant uses path d="M19.27 5.33C17.94..." - a simplified icon-library version of Clyde
  implication: This is a common but inaccurate simplified path, not the official Discord brand SVG

- timestamp: 2026-05-05T15:08:00Z
  checked: Simple Icons CDN (https://cdn.simpleicons.org/discord) - canonical brand SVG
  found: Official path is d="M20.317 4.3698a19.7913..." with viewBox 0 0 24 24
  implication: The correct/official Discord Clyde path is significantly different from what's in code

- timestamp: 2026-05-05T15:10:00Z
  checked: .planning/phases/05-discord/05-03-PLAN.md
  found: Plan specified "simplified single-path version" of Discord logo. The M19.27 path was prescribed in the plan itself.
  implication: Root cause is the plan used an inaccurate source path, not a coding error

- timestamp: 2026-05-05T15:12:00Z
  checked: UAT test 2 report
  found: "频道页显示的 Discord icon 不对，需替换为正确图标" (icon is wrong, needs correct icon)
  implication: User recognizes it's not the correct Clyde shape

## Resolution

root_cause: PlatformIcon.tsx uses path d="M19.27 5.33..." which is a simplified icon-library approximation of the Discord Clyde logo. The official Discord brand SVG path (from Simple Icons, which tracks official brand assets) is d="M20.317 4.3698..." - a more accurate representation that matches what users expect.
fix: Replace the Discord path data with the Simple Icons canonical path
verification: pending
files_changed:
  - entrypoints/popup/components/PlatformIcon.tsx
