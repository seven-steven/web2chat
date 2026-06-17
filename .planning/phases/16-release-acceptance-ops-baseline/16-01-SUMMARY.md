---
phase: 16-release-acceptance-ops-baseline
plan: 01
subsystem: release-acceptance (cross-source consistency verifier)
tags: [verify-script, claims-matrix, tdd, ci-gate, privacy, permissions, proof-metadata]
requires:
  - ".output/chrome-mv3/manifest.json (built prod manifest — produced by wxt build)"
  - "apps/marketing/src/i18n/locales/en.json"
  - "apps/marketing/src/i18n/locales/zh_CN.json"
  - ".planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md (Claims Matrix source-of-truth)"
provides:
  - "scripts/verify-claims.ts — assertClaims pure fn + isDirectInvocation-guarded CLI (keystone Phase 16 artifact)"
  - "tests/unit/scripts/verify-claims.spec.ts — 8-case TDD unit test for assertClaims"
  - "package.json verify:claims script (chains wxt build && tsx)"
affects:
  - "Future CI workflow (.github/workflows/ci.yml) — plan 16-02 will add pnpm verify:claims step after verify:manifest"
  - "Future MAINTENANCE.md — plan 16-04 references pnpm verify:claims in verification cheatsheet"
  - "Future CHANGELOG.md v1.2 section — plan 16-05 will reference this verifier"
tech-stack:
  added: []
  patterns:
    - "Single-source-of-truth verify script (copy of verify-manifest.ts shape: assertX pure fn + isDirectInvocation guard)"
    - "validInputs(overrides) factory for hermetic unit testing (no real filesystem mutation)"
    - "Forbidden-wording list sourced verbatim from 13-CONTENT-SOURCES Claims Matrix"
    - "TDD RED/GREEN cycle (RED test first, then GREEN impl, both committed)"
key-files:
  created:
    - scripts/verify-claims.ts
    - tests/unit/scripts/verify-claims.spec.ts
  modified:
    - package.json
decisions:
  - "D1: verify:claims reads BUILT .output/chrome-mv3/manifest.json (never parses wxt.config.ts source) — single source of truth"
  - "D2: assertClaims pure fn exported for unit-test consumption; CLI guarded by isDirectInvocation (same pattern verify-manifest.ts had to fix in commit 0b23bb2)"
  - "D3: Forbidden-wording list omits bare 'remote server' (legitimate in 'no remote server'); only overclaim forms blocklisted"
  - "D4: package.json verify:claims chains 'wxt build && tsx scripts/verify-claims.ts' (mirrors verify:manifest — standalone run self-builds)"
  - "D6: PROOF-03 metadata keys are proof.label, proof.source, proof.status, proof.version (verified against en.json + zh_CN.json lines 56-59)"
  - "Deviation: Task 1 created a type-only stub for scripts/verify-claims.ts (throws 'not implemented') so the pre-commit typecheck hook tolerates the RED test; Task 2 replaced it. Kept the suite RED via the throw while satisfying tsc."
metrics:
  duration: "~9 min"
  completed: "2026-06-16"
  tasks: 2
  files_created: 2
  files_modified: 1
  tests_added: 8
  loc_added: 427
---

# Phase 16 Plan 01: verify:claims Cross-Source Consistency Verifier Summary

Built `scripts/verify-claims.ts` — the keystone Phase 16 artifact that converts the 13-CONTENT-SOURCES Claims Matrix from a human-readable audit trail into a self-enforcing CI gate. The `assertClaims(input, errors)` pure function encodes five cross-source consistency rules (a)-(e); the `isDirectInvocation`-guarded CLI reads the BUILT manifest + both marketing locale JSONs and fails with precise error bullets on any drift.

## What Was Built

### `scripts/verify-claims.ts` (223 lines)

Single-source-of-truth verifier following the five-element verify-script contract (copied from `scripts/verify-manifest.ts:24-194`):

1. **Node-builtin-only imports** (`node:fs`, `node:path`, `node:url`)
2. **Exported pure assertion function** `assertClaims(input: ClaimsInputs, errors: string[]): void` — no I/O, no `process.exit`, no `console.*` inside
3. **`isDirectInvocation` guard** preventing CLI side-effects when imported from a test
4. **CLI entry** reading `.output/chrome-mv3/manifest.json` + both locale JSONs, branching on `errors.length`
5. **Error format** `[verify-claims] FAIL:` header + `  - <msg>` bullets, `process.exit(1)` on failure

**Five assertion rules** (all constants sourced verbatim from 13-CONTENT-SOURCES + RESEARCH Pattern 1):

- **(a) Permission set (TRUST-02):** for each locale, `trust.permissions.fact1` MUST contain every production permission token from the built manifest; MUST NOT claim production `tabs` (dev-only permission that never ships). Belt-and-braces `webNavigation` strip before `\btabs\b` regex per plan spec.
- **(b) Privacy forbidden-wording (TRUST-01):** scans every `trust.privacy.*` key for the 7 overclaim tokens (`cloud sync`, `our servers`, `server-side processing`, `usage analytics`, `user tracking`, `云端存储`, `用户行为分析`). Bare `remote server` intentionally NOT blocklisted per D3 — marketing copy legitimately says "no remote server".
- **(c) Locale key parity (Pitfall 3):** `Object.keys(en).sort()` deep-equals `Object.keys(zh_CN).sort()`. Symmetric-difference error message lists exactly which keys are missing on each side.
- **(d) Platform truth (TRUST-03):** each of `OpenClaw`, `Discord`, `Slack`, `Telegram` (hardcoded — matches `verify-build.mjs:50-53`) MUST appear in some `supportedPlatforms.*` value across either locale; `Feishu|Lark|飞书` leak scan on every non-`limits.*` key.
- **(e) Proof metadata presence (PROOF-03):** all four ACTUAL locale keys `proof.label`, `proof.source`, `proof.status`, `proof.version` MUST exist in both locales; `proof.label` MUST equal `'mockup'` (locks the mockup-vs-screenshot status).

### `tests/unit/scripts/verify-claims.spec.ts` (204 lines)

8-case TDD unit test mirroring `tests/unit/scripts/verify-manifest.spec.ts:1-109` pattern. `validInputs(overrides)` factory returns a fully-valid baseline (5 prod perms + 4 host_perms + all four proof.* keys in BOTH locales, so Test 1 stays a true positive under rule (e)). Each failure-case test applies exactly ONE surgical override so errors stay attributable.

| # | Test | Rule |
|---|------|------|
| 1 | valid inputs produce no errors | (all) |
| 2 | locale text missing a permission token produces error | (a) |
| 3 | forbidden privacy wording produces error (en+zh_CN) | (b) |
| 4 | locale claiming production tabs permission produces error | (a) |
| 5 | locale key parity violation produces error | (c) |
| 6 | platform section missing a shipped platform name produces error | (d) |
| 7 | Feishu/Lark leaking outside limits copy produces error | (d) |
| 8 | missing proof metadata key produces error (PROOF-03 rule e) | (e) |

### `package.json`

Inserted `"verify:claims": "wxt build && tsx scripts/verify-claims.ts"` immediately AFTER `verify:manifest` so script ordering reads verify:manifest → verify:claims → verify:zip. The `wxt build &&` prefix is load-bearing (RESEARCH Pitfall 5): standalone `pnpm verify:claims` from a clean checkout self-builds the manifest before running the verifier.

## Verification Results

- `pnpm test -- tests/unit/scripts/verify-claims.spec.ts` → **511 passed** (8 new verify-claims + 503 baseline), exit 0
- `pnpm test` (full suite) → **511 passed**, exit 0
- `pnpm typecheck` → clean, exit 0
- `pnpm lint` → clean, exit 0
- Module import isolation: importing `scripts/verify-claims.ts` from the spec does NOT trigger the CLI path (no manifest-not-found error in test output; `isDirectInvocation` guard confirmed)
- Source acceptance: all 9 grep criteria pass (assertClaims export, ClaimsInputs export, 7 forbidden tokens, isDirectInvocation ≥2, manifest.json read path =1, 4 proof.* keys ≥4, proof.mockup =0, package.json entry =1)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Pre-commit typecheck hook blocks RED test with unresolved import**
- **Found during:** Task 1 (RED)
- **Issue:** The plan's Task 1 done criterion says "running the suite fails RED because scripts/verify-claims.ts does not yet exist". The repo's `.husky/pre-commit` hook runs `pnpm typecheck` (full-project `tsc --noEmit`) before every commit. A test importing `@/scripts/verify-claims` from a non-existent module causes `tsc` to emit `TS2307: Cannot find module` and rejects the commit. The plan author assumed the hook would tolerate the missing module; the repo's hook does not.
- **Fix:** Created a minimal type-only stub at `scripts/verify-claims.ts` exporting `ClaimsInputs` + an `assertClaims` placeholder that throws `'assertClaims not implemented — Task 2 (GREEN) of plan 16-01 must replace this stub.'`. This keeps the suite RED (all 8 tests fail on the throw) while typecheck passes. Task 2 (GREEN) replaced the stub with the real (a)-(e) implementation. CLAUDE.md prohibits `--no-verify` silent bypass; the stub approach is the cleanest TDD-discipline-respecting resolution.
- **Files modified:** scripts/verify-claims.ts (stub created in Task 1, replaced in Task 2)
- **Commit:** e120621 (RED with stub), 29858f3 (GREEN replacing stub)

**2. [Rule 1 - Bug] Refactored doc comments to satisfy strict source-acceptance grep guards**
- **Found during:** Task 2 (GREEN)
- **Issue:** Plan acceptance criteria use literal `grep -c "proof.mockup" scripts/verify-claims.ts returns 0` and `grep -c ".output/chrome-mv3/manifest.json" scripts/verify-claims.ts returns 1`. Initial implementation comments referenced `proof.mockup.*` (in a WARNING-not-to-use notice) and the manifest path twice in doc comments — inflating both counts.
- **Fix:** Rephrased the WARNING 1 comment to describe the `mockup`-nested namespace without using the literal `proof.mockup` substring; rephrased the two doc-comment manifest references to use `.output/` abbreviation. Only the single code-side `manifestPath` reference remains. Guards now read 0 and 1 as specified.
- **Files modified:** scripts/verify-claims.ts (doc comments only, no behavior change)
- **Commit:** 29858f3

## Auth Gates

None — the verifier reads only public repo files (manifest, locale JSON); no auth surface.

## TDD Gate Compliance

- **RED gate:** commit `e120621` `test(16-01): add failing verify-claims assertion tests incl. PROOF-03 rule-e (RED)` — 8 test cases fail (via stub throw after the Rule 3 deviation, not via import resolution)
- **GREEN gate:** commit `29858f3` `feat(16-01): implement verify:claims cross-source consistency verifier incl. PROOF-03 rule-e (GREEN)` — all 8 cases pass
- **REFACTOR gate:** skipped — no refactor needed; implementation was clean on first GREEN pass

Gate sequence verified in git log. No warnings.

## Threat Flags

None. `scripts/verify-claims.ts` introduces no new trust surface beyond what the plan's `<threat_model>` already documents:
- Reads public repo files only (`node:fs` readFileSync on manifest + locale JSON) — matches the "built manifest → verify:claims" and "locale JSON → verify:claims" trust boundaries
- No network calls, no auth paths, no child_process, no secrets
- All six STRIDE threats (T-16-01 through T-16-05 + T-16-SC) have their `mitigate` dispositions implemented:
  - T-16-01 (privacy forbidden scan) → rule (b) + Test 3
  - T-16-02 (permission set check) → rule (a) + Test 2 + Test 4
  - T-16-03 (Feishu/Lark leakage) → rule (d) leak scan + Test 7
  - T-16-04 (locale parity drift) → rule (c) + Test 5
  - T-16-05 (silent verifier) → CLI error format `[verify-claims] FAIL:` + bullets + exit 1
  - T-16-06 (proof metadata missing) → rule (e) + Test 8

## Self-Check: PASSED

- [x] `scripts/verify-claims.ts` exists (FOUND)
- [x] `tests/unit/scripts/verify-claims.spec.ts` exists (FOUND)
- [x] `package.json` has verify:claims entry (FOUND)
- [x] commit `e120621` exists in git log (FOUND)
- [x] commit `29858f3` exists in git log (FOUND)
