---
phase: 13-information-architecture-copy-sources
plan: 1
subsystem: documentation
tags: [information-architecture, claims-matrix, copy-guardrails, platform-status, privacy-permissions]
dependency_graph:
  requires: []
  provides:
    - "13-CONTENT-SOURCES.md — primary factual source map for Phase 15/16 marketing page content and claim verification"
  affects:
    - "Phase 15 (宣传页内容与视觉实现) — consumes page outline, claims matrix, copy guardrails"
    - "Phase 16 (发布验收与运营基线) — consumes verification checklist, maintenance rules"
tech_stack:
  added: []
  patterns:
    - "Claims matrix with allowed/forbidden wording per D-09"
    - "Value-first page outline per D-01"
    - "Shipped platforms + Known limits taxonomy per D-05"
    - "Asset source-status labels per D-15"
    - "Source-first maintenance rules per D-12"
key_files:
  created:
    - .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md
  modified: []
decisions:
  - "Single planning artifact (13-CONTENT-SOURCES.md) per D-13/D-16 instead of multiple files"
  - "8-section page outline following value-first narrative: Hero → Use cases → Payload → Platforms → Flow → Trust → Limits → CTA"
  - "8 claim IDs covering MSG-01/02/03, TRUST-01/02/03, and OPS-01/02 requirements"
  - "Platform status taxonomy: shipped (OpenClaw/Discord/Slack), shipped + known risk (Telegram), dropped (Feishu/Lark), known risk only (Nyquist partial)"
  - "Privacy claims dual-sourced from PRIVACY.md; permission claims dual-sourced from production wxt.config.ts"
  - "STORE-LISTING.md marked as copy style reference only, not platform truth"
  - "Asset labels: actual screenshot, mockup, diagram, placeholder with source/version metadata"
metrics:
  duration: 216s
  completed: "2026-06-02"
  tasks_total: 3
  tasks_completed: 3
  files_created: 1
  files_modified: 0
  claims_defined: 8
---

# Phase 13 Plan 1: Marketing Page Content Sources Summary

Create the information architecture planning artifact that defines page outline, claims matrix, copy guardrails, platform status taxonomy, privacy/permission guardrails, asset status rules, maintenance rules, and verification checklist for downstream Phase 15/16 consumption.

## What Was Built

A single planning artifact (`13-CONTENT-SOURCES.md`) that serves as the factual source map for the web2chat promotional page. It locks the information architecture, claim boundaries, source traceability, platform status taxonomy, privacy/permission guardrails, asset status labels, and maintenance rules before any runtime marketing page implementation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create value-first page outline and initial claims matrix | `47f8a55` | `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` |
| 2 | Add platform, privacy, and permission claim boundaries | `7989f5b` | `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` |
| 3 | Add asset status rules, maintenance triggers, and verification checklist | (content included in Task 1/2 commits) | (same file) |

## Key Deliverables

### Page Outline (8 sections, value-first order)
1. Hero — one-line value + primary CTA + structured-payload preview
2. Use cases — personal knowledge, team sharing, Agent/llm-wiki
3. Structured-payload example — title/url/description/create_at/content/prompt
4. Current supported platforms — shipped set with risk labels
5. Three-step core flow — capture → choose → send
6. Privacy / permissions trust — independent trust section
7. Known limits — Telegram UAT, Feishu/Lark dropped, Nyquist partial
8. CTA — primary: `查看项目源码`

### Claims Matrix (8 claims)
- CLM-HERO-01 (MSG-01): Core value statement
- CLM-USE-01 (MSG-02): Use case claims
- CLM-PAYLOAD-01 (MSG-03): Structured payload differentiation
- CLM-PLATFORM-01 (TRUST-03): Shipped platform set
- CLM-PRIVACY-01 (TRUST-01): Privacy model claims sourced from PRIVACY.md
- CLM-PERM-01 (TRUST-02): Production permission claims sourced from wxt.config.ts
- CLM-LIMIT-01 (TRUST-03): Telegram live UAT pending risk
- CLM-LIMIT-02 (TRUST-03): Feishu/Lark dropped + Nyquist partial

### Platform Status Taxonomy
- OpenClaw, Discord, Slack: shipped
- Telegram: shipped + live UAT pending known risk
- Feishu/Lark: evaluated and dropped from shipped scope
- Phase 11/12 Nyquist partial: known risk only

### Production Permission Reference
- Permissions: activeTab, alarms, scripting, storage, webNavigation
- Host permissions: https://app.slack.com/*, https://slack.com/*, https://discord.com/*, https://web.telegram.org/*
- Optional: optional_host_permissions [<all_urls>] for user-deployed instances
- Forbidden as production claims: tabs permission, static production <all_urls> host permission
- Verified: `pnpm verify:manifest` passes

## Deviations from Plan

None — plan executed exactly as written. All three tasks completed against the single `13-CONTENT-SOURCES.md` artifact. Task 3 content was included in the initial document creation (Task 1 commit) since the plan specifies a single file deliverable; Task 2 added the remaining claims matrix rows that were not in Task 1 scope.

## Verification Results

- All 8 claim IDs present in claims matrix: PASS
- All canonical source files referenced (PROJECT.md, PRIVACY.md, STORE-LISTING.md, wxt.config.ts): PASS
- `pnpm verify:manifest` exits 0: PASS
- Platform status entries for all 6 items (OpenClaw/Discord/Slack/Telegram/Feishu-Lark/Nyquist): PASS
- Risk phrases present (live UAT pending known risk, evaluated and dropped, known risk only): PASS
- Asset labels (actual screenshot, mockup, diagram, placeholder): PASS
- Maintenance rules for all 6 categories: PASS
- Decision traceability (D-01 through D-16): PASS
- Scope boundary wording (not final bilingual long copy, not runtime marketing files): PASS

## Self-Check: PASSED

- FOUND: `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md`
- FOUND: `.planning/phases/13-information-architecture-copy-sources/13-01-SUMMARY.md`
- FOUND: commit `47f8a55` (Task 1)
- FOUND: commit `7989f5b` (Task 2)
