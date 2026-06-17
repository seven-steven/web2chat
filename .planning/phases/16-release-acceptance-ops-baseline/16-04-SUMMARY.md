---
phase: 16-release-acceptance-ops-baseline
plan: 04
subsystem: documentation
tags: [maintenance-doc, changelog, release-notes, ops, trust]
requires:
  - 13-CONTENT-SOURCES.md (Maintenance Rules source-of-truth, lines 169-208)
  - 16-PATTERNS.md (MAINTENANCE.md structural template, lines 174-218)
  - 16-RESEARCH.md (locked decisions D1-D5, Open Question 3)
provides:
  - MAINTENANCE.md (root-level maintainer doc — source-first → artifact-second → page-last update paths)
  - CHANGELOG.md ## [v1.2] section (Features + Documentation + Known Issues)
affects:
  - OPS-01 (maintenance rules recorded with clear update paths)
  - TRUST-03 (release notes maintain honest scope boundaries)
  - SC4 (maintenance rules recorded)
  - SC5 (honest release boundaries)
tech-stack:
  added: []
  patterns:
    - "source-first → artifact-second → page-last update chain (formalized from 13-CONTENT-SOURCES, not invented)"
    - "git-cliff newest-first CHANGELOG ordering (## [v1.2] before ## [v1.1])"
key-files:
  created:
    - MAINTENANCE.md
  modified:
    - CHANGELOG.md
decisions:
  - "D1: MAINTENANCE.md placed at repo root (alongside README/PRIVACY/CHANGELOG) — no docs/ dir exists"
  - "D2: MAINTENANCE.md content formalizes (not invents) 13-CONTENT-SOURCES Maintenance Rules"
  - "D3: zh-CN primary with bilingual headings; cheatsheet references literal pnpm script names"
  - "D4: v1.2 section injected into CHANGELOG.md only — no separate RELEASE-NOTES.md (git-cliff + verify-changelog-release.ts canonical)"
  - "D5: 3 Known Issues copied verbatim from PROJECT.md + STATE.md, not softened"
metrics:
  duration: 162s
  completed: 2026-06-16
---

# Phase 16 Plan 04: Maintenance Doc + CHANGELOG v1.2 Summary

Root-level `MAINTENANCE.md` formalizing the 13-CONTENT-SOURCES Maintenance Rules into source-first → artifact-second → page-last update chains, plus a `## [v1.2]` CHANGELOG section with honest Known Issues (Telegram live UAT / Nyquist partial / Feishu-Lark dropped).

## What Was Built

### Task 1 — `MAINTENANCE.md` (repo root, 62 lines)

- H1 `# web2chat 维护指南 (Maintenance)` matching README.md zh-CN-primary heading style.
- 5 claim-category H2 sections (平台列表 / 隐私声明 / 权限声明 / 截图 / CTA 文案), each with the 4-step chain: Source first → Artifact second → Page last → Verify. Every chain traces to `13-CONTENT-SOURCES.md` lines 171–208 (copied, not re-derived).
- Final H2 `## 验证命令清单 (Verification command cheatsheet)` — markdown table of `verify:manifest` / `site:build && site:verify` / `verify:readme` / `verify:claims` / `assets:screenshot` + a full local CI mirror row.
- Load-bearing ordering note: `verify:manifest` must run before `verify:claims` (manifest prod-branch dependency).

### Task 2 — `CHANGELOG.md` `## [v1.2] - 2026-06-14` section (19 insertions)

- Inserted between the intro line and `## [v1.1]` (newest-first, git-cliff convention).
- `### Features` (3 bullets): bilingual marketing page (Phase 13–15), `verify:claims` verifier + CI wiring (Phase 16), WCAG G201 CtaButton external-link indication + `lang` attribute contract.
- `### Documentation` (1 bullet): root-level `MAINTENANCE.md`.
- `### Known Issues` (3 bullets, verbatim from PROJECT.md + STATE.md, not softened): Telegram live UAT artifact not recorded; Phase 11/12 Nyquist recorded as known risk only; Feishu/Lark out of shipped scope.
- Existing v1.1 / v1.0.x sections untouched — `git diff` shows insertions only.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `da2e33f` | docs(16-04): add root MAINTENANCE.md formalizing marketing update paths (OPS-01) |
| 2 | `2409018` | docs(16-04): add CHANGELOG v1.2 section with honest Known Issues (TRUST-03) |

## Decisions Made

- **D1 placement:** `MAINTENANCE.md` at repo root (alongside `README.md`, `PRIVACY.md`, `CHANGELOG.md`). Project has no `docs/` dir — confirmed during pattern mapping.
- **D2 content:** formalize (not invent) — every chain copied from `13-CONTENT-SOURCES.md:171–208`. RESEARCH explicitly forbids re-deriving.
- **D3 language:** zh-CN primary with bilingual headings (matches README.md). Cheatsheet uses literal pnpm script names including `verify:claims` (a sibling wave-1 plan 16-01/16-02 artifact — referenced by canonical name per locked decision, not the internal script path).
- **D4 CHANGELOG:** injected into `CHANGELOG.md` only. No `RELEASE-NOTES.md` created — git-cliff + `scripts/verify-changelog-release.ts` own CHANGELOG.md as canonical (RESEARCH Anti-Pattern forbids splitting).
- **D5 Known Issues:** copied verbatim from PROJECT.md lines 47/56/60 + STATE.md Deferred Items — Telegram live UAT, Nyquist partial, Feishu/Lark dropped. No softening.
- **Release date:** used `2026-06-14` per locked decision (matches phase research date); executor may adjust to the actual release date if different.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Removed release-scope term from MAINTENANCE.md Platform-list verify line**
- **Found during:** Task 1 acceptance verification
- **Issue:** The 16-PATTERNS.md structural template (line 186) literally reads `pnpm verify:claims（校验平台名出现 + Feishu/Lark 泄漏检查）`. The Task 1 acceptance criterion `grep -cE "Telegram|Feishu|Lark|飞书" MAINTENANCE.md` must return 0 (MAINTENANCE.md is about update paths, not release-notes scope). Copying the template verbatim would have failed the criterion.
- **Fix:** Reworded the verify description to `校验已发布平台名齐全 + 已移除平台不泄漏到宣传文案` (checks all shipped platform names present + removed platforms do not leak into marketing copy). Same technical meaning, no platform-name leakage.
- **Files modified:** `MAINTENANCE.md` (Task 1, before commit)
- **Commit:** `da2e33f`

### Deferred Issues

None.

## Verification

| Criterion | Result |
|-----------|--------|
| `MAINTENANCE.md` exists at repo root | PASS (`test -f`) |
| `MAINTENANCE.md` >= 60 lines | PASS (62 lines) |
| 5 claim categories + cheatsheet (>= 6 H2 matches) | PASS (6) |
| Cites `13-CONTENT-SOURCES` (>= 1) | PASS (8) |
| `pnpm verify:claims` referenced (>= 2) | PASS (6) |
| No `Telegram\|Feishu\|Lark\|飞书` in MAINTENANCE.md (== 0) | PASS (0, after Rule 1 fix) |
| `## [v1.2]` count in CHANGELOG (== 1) | PASS (1) |
| `### Known Issues` subsections increased by 1 (>= 2) | PASS (2) |
| v1.2 appears before v1.1 (newest-first) | PASS (line 5 < line 24) |
| 3 Known Issues concepts present in v1.2 section | PASS (Telegram=2, Nyquist=1, Feishu/Lark=1) |
| No `RELEASE-NOTES.md` created | PASS (absent) |
| `verify:changelog-release` logic for latest tag (v1.1) | PASS (would exit 0 — v1.1 heading untouched; regex `^#{2,6}\s+\[?v1\.1\]?\b` matches) |
| `git diff --stat` shows only MAINTENANCE.md (new) + CHANGELOG.md (edited) | PASS (81 insertions, 0 deletions across 2 files) |

### Environment limitation

`pnpm verify:changelog-release` could not be executed directly inside this worktree because parallel worktrees share no `node_modules` (the `tsx` devDependency is absent here). The verifier's own regex logic was re-applied via `node -e` against the edited `CHANGELOG.md` and passes for the latest tag (`v1.1`, whose heading was left unchanged). The code-level assertions all pass; the run-environment gap is a worktree limitation, not a code defect.

## Requirements Closed

- **OPS-01** — Maintainer can update platform list / privacy claims / screenshots / CTA from explicit source sections. `MAINTENANCE.md` records the source-first → artifact-second → page-last chains for all 5 claim categories, with a verification command cheatsheet.
- **TRUST-03** — Visitor distinguishes shipped capabilities from known risks and deferred platforms. The `## [v1.2]` Known Issues section honestly records Telegram live UAT, Nyquist partial, and Feishu/Lark dropped — wording copied verbatim from PROJECT.md + STATE.md, not softened.

## Success Criteria

- [x] SC4 (maintenance rules recorded with clear update paths) — closed by `MAINTENANCE.md`
- [x] SC5 (release notes maintain honest scope boundaries) — closed by `CHANGELOG.md ## [v1.2]` Known Issues

## Self-Check: PASSED

- `test -f MAINTENANCE.md` → FOUND
- `grep -qE "^## \[v1\.2\]" CHANGELOG.md` → FOUND
- `test ! -f RELEASE-NOTES.md` → FOUND (absent)
- `git log --oneline | grep da2e33f` → FOUND
- `git log --oneline | grep 2409018` → FOUND
