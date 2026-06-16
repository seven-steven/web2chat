---
phase: 16-release-acceptance-ops-baseline
plan: "02"
subsystem: infra
tags: [github-actions, ci, marketing-gates, claims-verification, yaml]

# Dependency graph
requires:
  - phase: 16-release-acceptance-ops-baseline/16-01
    provides: scripts/verify-claims.ts + the `verify:claims` package.json script (Wave 1 prerequisite)
provides:
  - "CI verify job extended with 4 marketing + claims gates (site:build, site:verify, verify:readme, verify:claims) running on every PR + push to main"
  - "Load-bearing CI step-ordering invariant: verify:manifest (wxt build) runs BEFORE verify:claims reads .output/chrome-mv3/manifest.json"
affects:
  - "17-release-baseline (next phase): the CI mirror command sequence is now self-enforcing on every PR"
  - "Marketing contributors: any locale / claims drift now fails CI before merge"
  - "Phase 13 Claims Matrix (CLM-*) is now machine-enforced, not manual"

# Tech tracking
tech-stack:
  added: []  # zero packages added (T-16-SC)
  patterns:
    - "CI single-job extension (Pattern 2): append sequential sub-15s gates to the existing verify job instead of parallel jobs that each pay ~30-40s checkout + pnpm install"
    - "CI step-ordering invariant (D2/Pitfall 2): verify:manifest MUST precede verify:claims so the prod manifest branch exists before claims verification reads it"

key-files:
  created: []
  modified:
    - ".github/workflows/ci.yml (verify job: 8 run steps → 12 run steps, +1 separator comment)"

key-decisions:
  - "D1 single-job extension: 4 new steps add ~10-15s wall-clock vs ~30-40s/each for parallel jobs paying checkout+install; existing cache:'pnpm' on setup-node@v6 handles monorepo lockfile caching"
  - "D2 locked step order (load-bearing): verify:manifest → site:build → site:verify → verify:readme → verify:claims. verify:manifest's first step is `wxt build` (package.json:27) which produces the prod manifest; reordering would make verify:claims crash (manifest missing) or false-pass against a dev manifest that includes `tabs`"
  - "D3 zero secrets/env additions: all four steps read only public repo files (manifest, locale JSON, PRIVACY.md, README.md, marketing source) — permission surface unchanged"
  - "D4 no timeout-minutes change: existing 10-minute budget absorbs ~15s of new work with margin"

patterns-established:
  - "CI marketing-gate sequence: every PR now runs the full Phase 13/14/15 verification chain in CI, not just locally"
  - "Anonymous `- run:` step style preserved (no `name:` keys added) — matches the existing ci.yml convention"

requirements-completed:
  - BUILD-01
  - BUILD-02
  - BUILD-03

# Metrics
duration: ~12min
completed: 2026-06-16
---

# Phase 16 Plan 02: CI Marketing + Claims Gates Summary

**Wired 4 sequential marketing/claims gates (site:build → site:verify → verify:readme → verify:claims) into the existing single CI verify job so every PR enforces the Phase 13 Claims Matrix, closing WR-03.**

## Performance

- **Duration:** ~12 min (includes worktree `pnpm install` to populate `node_modules` so the husky pre-commit hook's `pnpm typecheck` could run)
- **Started:** 2026-06-16T00:54:31Z
- **Completed:** 2026-06-16T00:54:34Z (task edits + verification; install ran earlier in the session)
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Extended `.github/workflows/ci.yml` verify job with the 4 new gates in the locked order, after the existing `pnpm verify:manifest` step
- Encoded the load-bearing ordering invariant (verify:manifest before verify:claims) into the CI step sequence — closes RESEARCH Pitfall 2 and T-16-06
- Verified the full local CI mirror sequence passes: `verify:manifest` OK → `site:build` built → `site:verify` `[verify:build] OK` → `verify:readme` OK (8 sections, PRIVACY present) → `verify:claims` `[verify-claims] OK — marketing claims match canonical sources`
- Single-job extension per D1: no parallel jobs, no `timeout-minutes` change, zero `secrets:`/`env:` additions (T-16-07/T-16-08 accepted, T-16-SC accepted)

## Task Commits

Each task was committed atomically:

1. **Task 1: Append 4 marketing + claims steps to ci.yml in locked order** - `c918c74` (ci)

**Plan metadata:** (pending — committed after SUMMARY write per worktree ordering rule #2070)

## Files Created/Modified

- `.github/workflows/ci.yml` - Added 4 sequential `- run:` steps (`pnpm site:build`, `pnpm site:verify`, `pnpm verify:readme`, `pnpm verify:claims`) after the existing `pnpm verify:manifest` step, prefixed by a single `# ─── Phase 16: marketing + claims gates (closes WR-03) ───` separator comment. File grew from 23 lines to 28 lines. No existing step reordered, removed, or renamed.

## Decisions Made

None beyond the locked decisions D1–D4 carried from the plan frontmatter. The plan was a single, high-analog, line-precise edit — Pattern 2 (CI single-job extension) from `16-PATTERNS.md` was followed verbatim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Populated worktree `node_modules` to unblock the husky pre-commit hook**
- **Found during:** Task 1 (commit attempt)
- **Issue:** The husky `pre-commit` hook runs `pnpm typecheck && pnpm exec lint-staged`. The fresh parallel-executor worktree had no `node_modules` (and no `.wxt/tsconfig.json`), so `tsc --noEmit` failed with hundreds of pre-existing errors (`Cannot find name 'chrome'`, `Cannot find module 'vite'`, missing `.wxt/tsconfig.json`) — all unrelated to the 1-line YAML edit. The commit never landed (HEAD stayed on base).
- **Fix:** Ran `pnpm install --frozen-lockfile` (the same command CI runs at `ci.yml:18`) to populate `node_modules` and run the `postinstall` (`wxt prepare && husky`) which generates `.wxt/tsconfig.json`. Retried the commit — hook passed (typecheck clean, lint-staged applied prettier to the YAML).
- **Files modified:** `node_modules/` (gitignored, not committed), `.wxt/` (gitignored, not committed). No source files touched by this fix.
- **Verification:** Commit `c918c74` landed; `git show HEAD:.github/workflows/ci.yml` confirms the 4 new steps in the locked order; all 6 acceptance criteria re-verified on the committed blob.
- **Committed in:** `c918c74` (the fix enabled the task commit to land; no separate fix commit was needed)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Environment fix only — zero scope creep, zero source-code drift. The committed `ci.yml` is byte-identical to what the plan specified.

## Issues Encountered

- The plan's `read_first` referenced "package.json lines 23-37" and "ci.yml ... line 22" but the actual line numbers differ slightly (the relevant `verify:manifest` step is at `ci.yml:22`; `package.json` `verify:*` scripts are at lines 27-30). The line-number drift did not affect execution — the named anchors (`pnpm verify:manifest`, the script names) were unambiguous and matched.
- `python3 -c "import yaml; ..."` (acceptance criterion 6) failed because PyYAML is not installed system-wide (PEP 668 externally-managed env). Fell back to the project's own `yaml` devDependency (`package.json:73`): `node -e "require('yaml').parse(...)"` validated the file and printed the 12-step sequence in order. Equivalent validation, different tool.

## User Setup Required

None - no external service configuration required. The CI workflow uses only public repo files and the existing GitHub Actions runners (ubuntu-latest, node 20, pnpm via `pnpm/action-setup@v6`). No secrets, no environments, no deployment targets.

## Next Phase Readiness

- WR-03 (CI missing marketing gates) is closed: every PR and every push to main now runs the full marketing + claims verification chain
- The local CI mirror command (`pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest && pnpm site:build && pnpm site:verify && pnpm verify:readme && pnpm verify:claims`) is now self-enforcing on PRs, not just a manual pre-flight
- BUILD-03 (`marketing-isolation.spec.ts`) continues to run under the existing `pnpm test` step — no regression, no new step needed
- Ready for the next plan in the wave / Phase 17 release-baseline: the CI gate surface is now complete for the v1.2 release

## Self-Check: PASSED

**Files:**
- FOUND: `.github/workflows/ci.yml` (modified in commit `c918c74`)

**Commits:**
- FOUND: `c918c74` — `ci(16-02): wire marketing + claims gates into single verify job (WR-03)`

**Acceptance criteria (all 6):**
- [x] exactly 4 occurrences of `pnpm (site:build|site:verify|verify:readme|verify:claims)` (got 4)
- [x] new steps appear AFTER `pnpm verify:manifest` in the order site:build → site:verify → verify:readme → verify:claims (verified via `yaml.parse` step dump: steps 8-11)
- [x] `pnpm verify:manifest` appears exactly once (got 1 — existing step preserved)
- [x] no `name:` keys added to any new step (only the top-level `name: CI` remains)
- [x] `continue-on-error` count is 0 (no soft-fails)
- [x] YAML validity confirmed via `node -e "require('yaml').parse(...)"` (12 steps parsed in order)

---
*Phase: 16-release-acceptance-ops-baseline*
*Plan: 02*
*Completed: 2026-06-16*
