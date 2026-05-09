---
phase: quick-260509-ocg-2-3-changelog
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - cliff.toml
  - CHANGELOG.md
  - package.json
  - scripts/verify-changelog-release.ts
  - .github/workflows/release.yml
autonomous: true
requirements:
  - QUICK-260509-OCG
must_haves:
  truths:
    - "开发者可用单条 pnpm 脚本从 Conventional Commits 生成 CHANGELOG.md。"
    - "仓库包含已生成的 CHANGELOG.md，并且重复生成不会产生差异。"
    - "发版 tag workflow 会拒绝没有对应 CHANGELOG.md 条目的 tag。"
    - "GitHub Release 继续使用 generate_release_notes: true。"
  artifacts:
    - path: "cliff.toml"
      provides: "git-cliff changelog 生成配置"
      contains: "tag_pattern"
    - path: "CHANGELOG.md"
      provides: "项目 changelog"
      min_lines: 10
    - path: "package.json"
      provides: "changelog 与 release changelog 校验脚本入口"
      contains: "changelog"
    - path: "scripts/verify-changelog-release.ts"
      provides: "tag workflow 的 changelog 条目校验"
      exports: []
    - path: ".github/workflows/release.yml"
      provides: "release workflow changelog gate"
      contains: "generate_release_notes: true"
  key_links:
    - from: "package.json"
      to: "cliff.toml"
      via: "pnpm changelog invokes git-cliff with repository config"
      pattern: "git-cliff@2\\.13\\.1.*-o CHANGELOG\\.md"
    - from: ".github/workflows/release.yml"
      to: "scripts/verify-changelog-release.ts"
      via: "release job runs pnpm verify:changelog-release before GitHub Release"
      pattern: "pnpm verify:changelog-release"
---

<objective>
建立最小可维护的 changelog 体系，并把它接入后续发版流程。

Purpose: 按用户选择的方案 2 + 3 执行：新增 `cliff.toml` + `CHANGELOG.md`；后续发版时先运行 `git cliff -o CHANGELOG.md`、提交 changelog，再打 tag/push release。保留现有 GitHub Release 的 `generate_release_notes: true`，除非执行中发现具体技术阻塞。

Output: `cliff.toml`、生成后的 `CHANGELOG.md`、可复用的 `pnpm changelog` 脚本、release workflow 中的 changelog tag 校验。
</objective>

<execution_context>
@/home/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/workflows/execute-plan.md
@/home/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/home/seven/data/coding/projects/seven/web2chat/.planning/STATE.md
@/home/seven/data/coding/projects/seven/web2chat/CLAUDE.md
@/home/seven/data/coding/projects/seven/web2chat/.github/workflows/release.yml
@/home/seven/data/coding/projects/seven/web2chat/package.json

<existing_release_workflow>
- `.github/workflows/release.yml` 当前在 `push.tags: v*` 时运行。
- 当前 release gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm verify:manifest`, `pnpm zip`。
- 当前 GitHub Release step 使用 `softprops/action-gh-release@v2` 且 `generate_release_notes: true`。本计划必须保留该设置。
</existing_release_workflow>

<locked_user_decisions>
- D-01: 使用方案 2：添加 `cliff.toml` + `CHANGELOG.md`。
- D-02: 使用方案 3：未来发版流程先运行 `git cliff -o CHANGELOG.md`，提交 changelog，再 tag/push release，让 release tag 包含 changelog。
- D-03: 保留现有 GitHub `generate_release_notes: true`，除非发现具体理由需要变更。
</locked_user_decisions>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add git-cliff changelog generation</name>
  <files>cliff.toml, CHANGELOG.md, package.json</files>
  <action>
    Implement D-01 and the generation part of D-02. Create `cliff.toml` for Conventional Commit based changelog generation using tag pattern `v*`, grouping at least `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, and an `Other` fallback. Configure it so generated output is deterministic and suitable for committing.

    Add a `package.json` script named `changelog` that runs `pnpm dlx git-cliff@2.13.1 -o CHANGELOG.md`. Do not add a permanent `git-cliff` dependency unless the pinned `pnpm dlx` invocation cannot work in this repo.

    Generate and commit `CHANGELOG.md` from the current git history by running `pnpm changelog`. Ensure the file includes existing release tags such as `v1.0.1` when git-cliff sees them.
  </action>
  <verify>
    <automated>pnpm changelog && test -s CHANGELOG.md && git diff --exit-code CHANGELOG.md</automated>
  </verify>
  <done>`cliff.toml` exists, `CHANGELOG.md` is generated and non-empty, `pnpm changelog` is deterministic, and `package.json` exposes the changelog script.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Gate tag releases on committed changelog entries</name>
  <files>scripts/verify-changelog-release.ts, package.json, .github/workflows/release.yml</files>
  <behavior>
    - With `GITHUB_REF_NAME=v1.0.1` and a generated changelog containing `v1.0.1`, the check exits 0.
    - With `GITHUB_REF_NAME=v999.999.999` and no matching changelog entry, the check exits non-zero with a clear error telling the developer to run `pnpm changelog`, commit `CHANGELOG.md`, then tag/push.
    - When `GITHUB_REF_NAME` is absent during local runs, the check falls back to the latest git tag from `git describe --tags --abbrev=0` and validates that tag.
  </behavior>
  <action>
    Implement the release-flow enforcement part of D-02 while preserving D-03 exactly. Add `scripts/verify-changelog-release.ts` that reads `CHANGELOG.md`, determines the release tag from `GITHUB_REF_NAME` or latest git tag, and fails if the changelog does not contain a markdown heading or compare link for that exact tag. The error message must state the required order: run `pnpm changelog`, commit `CHANGELOG.md`, then create/push the tag.

    Add `package.json` script `verify:changelog-release` using `tsx scripts/verify-changelog-release.ts`.

    Update `.github/workflows/release.yml` to run `pnpm verify:changelog-release` after dependencies are installed and before `softprops/action-gh-release@v2`. Keep `generate_release_notes: true` unchanged.
  </action>
  <verify>
    <automated>GITHUB_REF_NAME=v1.0.1 pnpm verify:changelog-release && bash -lc 'set +e; GITHUB_REF_NAME=v999.999.999 pnpm verify:changelog-release >/tmp/web2chat-changelog-negative.log 2>&amp;1; status=$?; set -e; test "$status" -ne 0; grep -q "pnpm changelog" /tmp/web2chat-changelog-negative.log'</automated>
  </verify>
  <done>Release workflow fails fast when the pushed tag is absent from committed CHANGELOG.md, and the workflow still uses GitHub generated release notes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| git history -> generated markdown | Commit messages become local repository documentation in `CHANGELOG.md`. |
| GitHub tag ref -> release workflow | `GITHUB_REF_NAME` controls which changelog entry is required before publishing release assets. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-260509-ocg-01 | Tampering | `CHANGELOG.md` generation | mitigate | Use deterministic `pnpm changelog` verification with `git diff --exit-code CHANGELOG.md` after generation. |
| T-quick-260509-ocg-02 | Repudiation | `.github/workflows/release.yml` | mitigate | Add `pnpm verify:changelog-release` so a release tag must correspond to a committed changelog entry. |
| T-quick-260509-ocg-03 | Information Disclosure | `cliff.toml` / `CHANGELOG.md` | accept | Changelog is generated only from already-committed git metadata in this repository; no secrets are introduced. |
</threat_model>

<verification>
Run these after both tasks:

<automated>pnpm changelog && git diff --exit-code CHANGELOG.md</automated>
<automated>GITHUB_REF_NAME=v1.0.1 pnpm verify:changelog-release</automated>
<automated>pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest && pnpm zip</automated>

Also inspect `.github/workflows/release.yml` to confirm `generate_release_notes: true` remains present.
</verification>

<success_criteria>
- `pnpm changelog` regenerates `CHANGELOG.md` without producing a diff.
- `CHANGELOG.md` is committed and contains existing tag history.
- Release workflow runs the changelog gate before publishing assets.
- The workflow still publishes `.output/*.zip` and keeps `generate_release_notes: true`.
- Existing relevant release gates pass locally: typecheck, lint, tests, manifest verification, zip.
</success_criteria>

<output>
After completion, create `/home/seven/data/coding/projects/seven/web2chat/.planning/quick/260509-ocg-2-3-changelog/260509-ocg-SUMMARY.md`.
</output>
