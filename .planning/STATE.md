---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Prompt 模板变量引用
status: planning
stopped_at: v2.0 milestone planned 2026-06-19
last_updated: "2026-06-19T00:00:00.000Z"
last_activity: 2026-06-19
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# 项目状态

## 项目引用

参见：`.planning/PROJECT.md` (更新于 2026-06-19)

**核心价值：** 让用户用一次点击，把“当前网页的格式化信息 + 预设 prompt”投递到指定的 IM 会话或 AI Agent 会话。
**当前焦点：** v2.0 Prompt 模板变量引用已完成 requirements / roadmap 定义，准备从 Phase 17（模板渲染核心）开始执行。

## Current Position

Phase: Not started (next: Phase 17 — 模板渲染核心)
Plan: —
Status: Ready to plan Phase 17
Last activity: 2026-06-19 - Completed quick task 260619-100254: 发布 v1.2 到 GitHub Releases

Progress: v2.0 planned (0/4 phases, 0 plans)。

## Performance Metrics

**v1.2 Velocity:**

- Total plans completed: 14
- Total milestone timeline: 16 days (2026-06-01 → 2026-06-16)
- Requirements satisfied: 16/16
- Commits in v1.2 range: 125 (665 repo total at close)

**v1.1 Velocity:**

- Total plans completed: 31
- Total milestone timeline: 19 days

## Accumulated Context

### Roadmap Evolution

- Phase 10.1 inserted after Phase 10: Close gap DSPT-02 / SLK-02 — Slack logged-out redirect
- v1.1 archived into milestone snapshots; ROADMAP now keeps only milestone-level summaries and next-step placeholders
- v1.2 shipped a repo-internal static marketing page; ROADMAP collapsed v1.2 phases into a SHIPPED `<details>` block
- v2.0 planned as 4 phases (17-20): 模板渲染核心 → Dispatch 接线与模型 A → Popup 平台级预览与变量 UX → 模板变量硬化与 E2E 回归

### Decisions

参见 PROJECT.md Key Decisions 表。

- Registry-driven adapter architecture 已被 Slack / Telegram / Feishu 三个平台验证
- Slack redirect observability 通过最小 `https://slack.com/*` 权限面闭合
- Feishu/Lark 因共享 URL blocker 从 shipped scope 移除
- v1.2 交付 `apps/marketing` 静态宣传页 + `verify:claims` self-enforcing CI gate；不改扩展主链路
- 宣传页所有 claim 可跨源追溯至 PROJECT/PRIVACY/STORE-LISTING/生产 wxt.config.ts
- v2.0 prompt 模板变量只支持固定 ArticleSnapshot 五字段：`title` / `url` / `description` / `create_at` / `content`
- v2.0 采用模型 A：prompt 含已识别变量时跳过自动追加 snapshot；无已识别变量时保持旧 prompt-first auto-append 行为
- v2.0 `{{create_at}}` 使用原始 ISO 字符串，不做本地化、不加标签
- v2.0 history / binding / draft 保存原始模板字符串，不保存渲染结果，无 storage schema migration

### Blockers/Concerns

- Telegram live dispatch 缺真实 headed UAT（继承自 v1.1）
- Phase 11/12 Nyquist closeout 仍 partial（继承自 v1.1）
- v2.0 需特别防止 `{{content}}` 与 auto-append 双重写入导致正文重复和平台硬限截断
- v2.0 需确保替换后内容仍经过 Discord/Slack mention escape，避免 `@everyone` 注入回归

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260616-235517 | webpage 添加 favicon | 2026-06-16 | b3fab16 | [260616-235517-webpage-add-favicon](./quick/260616-235517-webpage-add-favicon/) |
| 260617-225858 | 添加 GitHub Actions 配置，把 webpage 发布到 GitHub Pages | 2026-06-17 | 5626c9a | [260617-225858-github-pages-deploy](./quick/260617-225858-github-pages-deploy/) |
| 260618-docs-webpage-url | 文档补充项目网页地址 | 2026-06-18 | e6c0dc1 | — |
| 260619-100254 | 发布 v1.2 到 github releases | 2026-06-19 | — | [260619-100254-release-v12-github-releases](./quick/260619-100254-release-v12-github-releases/) |

## Deferred Items

Items acknowledged and deferred at v1.2 milestone close on 2026-06-17（扩展运行时历史 debug item，多数与 dropped Feishu 或非 bug 相关，不属于 v1.2 宣传页范围）:

| Category | Item | Status |
|----------|------|--------|
| debug | discord-icon-wrong | diagnosed: SVG path 用了简化版非官方 Clyde path，一行可修但与宣传页无关 |
| debug | discord-tos-missing | diagnosed-as-non-bug: 代码/i18n/CSS/build 全正确，UAT 为假阴性 |
| debug | feishu-icon-not-showing | diagnosed: known 数组漏 feishu，但 feishu 已 dropped，修了也不进 shipped scope |
| debug | feishu-selector-mismatch | diagnosed: fixture 凭假设造，需真实飞书 DOM，feishu 已 dropped |
| debug | feishu-url-not-unique | investigating: 飞书 SPA 共享 URL，正是 feishu 被 dropped 的根因，平台架构限制 |
| debug | feishu-wrong-content-injected | investigating: needs_confirmation popup 关闭 + snapshot 覆盖，仅 feishu 场景触发 |
| debug | github-action | awaiting_human_verify: 本地已修（select.spec.tsx 改用 act()），欠远端 CI 确认 |
| verification | telegram-live-uat | 继承自 v1.1，known risk；非 v1.2 范围 |
| requirements | feishu-lark-final-scope-sync | 继承自 v1.1，dropped from shipped scope |
| validation | phase-11-12-nyquist-closeout | 继承自 v1.1，known risk；非 v1.2 范围 |

## Session Continuity

Last session: 2026-06-19T00:00:00+08:00
Stopped at: v2.0 milestone planned
Resume: `/gsd:plan-phase 17` 创建 Phase 17（模板渲染核心）计划
