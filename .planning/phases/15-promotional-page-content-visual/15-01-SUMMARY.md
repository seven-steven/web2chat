---
phase: 15-promotional-page-content-visual
plan: 01
subsystem: marketing
tags: [marketing, i18n, content-layer, tdd]
requires: []
provides:
  - marketing content getter API（8 个 section 的 typed getter）
  - REPO_URL / INSTALL_URL CTA truth anchors
  - en/zh_CN marketing locale keys（100% parity）
  - site-content truth regression tests
affects:
  - 15-02（页面组件组装将消费这些 getter）
tech-stack:
  added: []
  patterns:
    - "interface + getter + t() 纯数据层模式（延续 Phase 14 骨架）"
    - "扁平 section.field locale key 命名"
key-files:
  created:
    - tests/unit/marketing/site-content.spec.ts
  modified:
    - apps/marketing/src/data/site-content.ts
    - apps/marketing/src/i18n/locales/en.json
    - apps/marketing/src/i18n/locales/zh_CN.json
    - apps/marketing/src/i18n/index.ts
    - apps/marketing/src/app.tsx
decisions:
  - "INSTALL_URL 使用 README 中文「安装」标题的 URL-encoded anchor（#%E5%AE%89%E8%A3%85），且测试断言其以 REPO_URL 为前缀"
  - "payload 示例硬编码 MDN structuredClone() 页面数据（D-11），URL 与 create_at 作为导出常量供测试断言"
  - "平台 chip 品牌名（OpenClaw/Discord/Slack/Telegram）不本地化，直接写在 getter 中"
  - "Telegram 风险标签 'live UAT pending / known risk' 在两个 locale 中保持英文原文（行业标准术语）"
metrics:
  duration: ~35 min
  tasks: 2/2
  completed: 2026-06-10
---

# Phase 15 Plan 01: Marketing Content Data Layer Summary

宣传页 8 个 section 的 typed content getter + 双语 locale keys + 数据层 truth 回归测试，以 TDD RED→GREEN 完成；CTA / 平台 / 隐私 / 权限 claims 全部锚定到 13-CONTENT-SOURCES claims matrix。

## Tasks Completed

| Task | Name | Commits | Files |
|------|------|---------|-------|
| 1 | site-content RED 测试 + marketing content getter 与双语数据 | 38213d2 (RED), b1e160c (GREEN) | site-content.ts, en.json, zh_CN.json, site-content.spec.ts, i18n/index.ts, app.tsx |
| 2 | i18n coverage 锁住 locale parity | （无变更——coverage 直接通过） | — |

## What Was Built

- **`site-content.ts` 完整内容 API：** `getHero` / `getUseCases` / `getPayloadExample` / `getSupportedPlatforms` / `getFlowSteps` / `getTrust` / `getKnownLimits` / `getProofMeta` / `getCta` / `getLocaleToggle`，加上 `REPO_URL`、`INSTALL_URL`、`PAYLOAD_FIELD_ORDER`、`PAYLOAD_EXAMPLE_URL`、`PAYLOAD_EXAMPLE_CREATE_AT` truth 常量。`getNextPhase` 与 `nextPhase.*` keys 已彻底移除。
- **双语 locale：** en/zh_CN 各 65 个 marketing keys，key set 完全一致（由 spec 测试断言），无 placeholder。
- **回归测试（15 个）：** hero 契约（D-01/D-03/D-12/D-13）、payload 字段顺序（MSG-03）、平台 truth + Telegram 风险标签（CLM-PLATFORM-01/CLM-LIMIT-01）、trust 分组与禁止词（TRUST-01/02）、known limits 三项、proof metadata（D-05）、CTA 目标（CTA-01/02）、locale parity 与禁止 claims。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修复 marketing i18n 字典遮蔽 bug**
- **Found during:** Task 1 GREEN（zh_CN locale 测试失败）
- **Issue:** `dictionaries` 中预置的 `zh_CN: {}` 空对象使 `loadLocale` 的 `dictionaries[locale]` 检查恒为 truthy，提前 return，zh_CN locale 永远不会真正加载；`t()` 在 zh_CN 下回退为 key 字符串。
- **Fix:** 移除空 stub，字典类型改为 `Record<string, Record<string, string> | undefined>`，懒加载逻辑保持不变。
- **Files modified:** apps/marketing/src/i18n/index.ts
- **Commit:** b1e160c

**2. [Rule 3 - Blocking] app.tsx 同步更新（计划外文件）**
- **Found during:** Task 1 GREEN（移除 `nextPhase.*` keys 会使 app.tsx 编译失败 / 产生孤儿 key）
- **Issue:** app.tsx 仍引用 `getNextPhase()` 并渲染 nextPhase section；同时 Hero CTA 硬编码了错误的仓库 URL（`github.com/nichochar/web2chat`，正确 origin 是 `seven-steven`）。
- **Fix:** 移除 nextPhase section 与 import，CTA href 改为消费 `REPO_URL` 常量。
- **Files modified:** apps/marketing/src/app.tsx
- **Commit:** b1e160c

## TDD Gate Compliance

- RED gate: `test(15-01)` commit 38213d2 — 15 个测试以 stub 实现失败。
- GREEN gate: `feat(15-01)` commit b1e160c — 469/469 全量测试通过。
- REFACTOR: 无需独立 refactor commit（GREEN 实现即最简形态）。

## Verification

- `pnpm test -- tests/unit/marketing/site-content.spec.ts` — 56 files / 469 tests passed
- `pnpm test:i18n-coverage` — 100%（107 keys，extension locale 维度；marketing locale parity 由 spec 测试锁定）
- `pnpm typecheck` — clean
- `pnpm lint` — clean

## Known Stubs

None — 所有 getter 返回真实双语内容，无 placeholder / 空值流向 UI。

## Threat Flags

无新增安全面：T-15-01/02/03 mitigations 均已落入测试断言（平台白名单 + 顺序、禁止 production `tabs` / 静态 `<all_urls>` claims、privacy facts 仅来自 PRIVACY.md 已公开机制）。

## Next Steps

15-02 起的组件 / 页面组装 plan 直接消费本 plan 的 getter，不在 JSX 中自由发挥文案。

## Self-Check: PASSED

- tests/unit/marketing/site-content.spec.ts — FOUND
- apps/marketing/src/data/site-content.ts contains `getHero` — FOUND
- en.json / zh_CN.json contain `hero.title` — FOUND
- Commits 38213d2, b1e160c — FOUND
