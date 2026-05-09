---
phase: 6
slug: i18n
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test && pnpm lint && pnpm typecheck` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm lint && pnpm typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-1-* | 06-1 | 1 | I18N-02 | — | t() 返回纯 string，不走 innerHTML | unit | `pnpm test -- tests/unit/i18n/locale-switch.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 06-2-* | 06-2 | 1 | I18N-03 | — | ESLint 规则拦截 JSX 硬编码字符串 | lint/unit | `pnpm lint && pnpm test -- tests/lint/` | ❌ Wave 0 | ⬜ pending |
| 06-3-* | 06-3 | 1 | I18N-04 | — | manifest 字段使用 __MSG_*__ | script | `pnpm verify:manifest` | ✅ scripts/verify-manifest.ts | ⬜ pending |
| 06-4-* | 06-4 | 2 | I18N-02 | — | setLocale() 切换后 t() 返回新语言文本 | unit | `pnpm test -- tests/unit/i18n/locale-switch.spec.ts` | ❌ Wave 1 | ⬜ pending |
| 06-5-* | 06-5 | 3 | I18N-01 | — | 100% key coverage en + zh_CN | script | `pnpm test:i18n-coverage` | ❌ Wave 3 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/i18n/locale-switch.spec.ts` — stubs for I18N-02 (signal-based t() + setLocale)
  - Created by: **Plan 06-1 Task 7**
- [ ] `tests/lint/no-hardcoded-strings.fixture.tsx` — fixture for I18N-03 ESLint rule
  - Created by: Plan 06-2 Task 2
- [ ] `shared/i18n/yaml.d.ts` — TypeScript `*.yml` module declaration
  - Created by: Plan 06-1 Task 5
- [ ] `yaml` devDependency: `pnpm add -D yaml`
  - Added by: Plan 06-1 Task 1

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Language selector UI 在 Options 页面显示正确，切换立即生效 | I18N-02 | 需要浏览器渲染验证 | 打开扩展 Options 页，切换语言，确认 popup 文字即时切换 |
| manifest name/description 在 chrome://extensions 显示本地化文字 | I18N-04 | 需要安装扩展后在浏览器验证 | 在两种语言的浏览器界面确认（zh_CN UI 显示中文，en UI 显示英文） |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
