# Phase 13: Marketing Page Content Sources

> Primary factual source map for Phase 15/16 marketing page content and claim verification.
> This document defines page outline, claims matrix, copy guardrails, platform status, privacy/permission guardrails, asset status rules, maintenance rules, and verification checklist.
>
> **Scope boundary (D-13/D-16):** This is a planning artifact, not runtime marketing code and not final bilingual long copy. Phase 15 implements the page; Phase 16 audits it.
>
> Traceability: D-01, D-02, D-03, D-09, D-13, D-14, D-16

---

## Page Outline

Section order follows value-first narrative per D-01 and D-02.

| Order | Section | Purpose | Requirement IDs | Required Claim IDs |
|-------|---------|---------|-----------------|--------------------|
| 1 | Hero | Compact first-screen content: one-line value statement + primary CTA `查看项目源码` + structured-payload preview. Optional low-weight shipped platform chip per D-03. | MSG-01 | CLM-HERO-01 |
| 2 | Use cases | Personal knowledge capture, team sharing, Agent / llm-wiki workflows. | MSG-02 | CLM-USE-01 |
| 3 | Structured-payload example | Demonstrate `title` / `url` / `description` / `create_at` / `content` + `prompt` structured fields vs. manual copy-paste. | MSG-03 | CLM-PAYLOAD-01 |
| 4 | Current supported platforms | Shipped platform set: OpenClaw / Discord / Slack / Telegram with risk labels. | TRUST-03 | CLM-PLATFORM-01 |
| 5 | Three-step core flow | Capture page → choose target → send to chat. | MSG-01 | CLM-HERO-01 |
| 6 | Privacy / permissions trust | Independent trust section: no server, no telemetry, local storage, direct browser delivery, production permission model. | TRUST-01, TRUST-02 | CLM-PRIVACY-01, CLM-PERM-01 |
| 7 | Known limits | Telegram live UAT pending, Feishu/Lark dropped scope, Phase 11/12 Nyquist partial. | TRUST-03 | CLM-LIMIT-01, CLM-LIMIT-02 |
| 8 | CTA | Primary: `查看项目源码`. Secondary: Chrome/Chromium installation path (when available). | CTA-01 | — |

**Decision notes:**
- D-01: Value-first narrative — core value before platforms.
- D-02: Compact first screen — Hero = one-line value + CTA + payload preview.
- D-03: Platform chips in Hero at low weight only; main platform list at section 4.

---

## Claims Matrix

Schema per D-09: each public claim has allowed wording, forbidden wording, source file, verification note, and owner update trigger.

| Claim ID | Section | Claim | Allowed wording | Forbidden wording | Source file / section | Verification note | Owner update trigger |
|----------|---------|-------|-----------------|-------------------|-----------------------|-------------------|----------------------|
| CLM-HERO-01 | Hero, Three-step core flow | web2chat sends structured page information + user prompt to IM / AI Agent chat session | "一键把网页结构化信息 + 自定义 prompt 投递到 IM 或 AI Agent 聊天会话"; "capture structured metadata from any web page and deliver it with a saved prompt to a chat session" | "全自动发送"; "支持所有聊天平台"; "无需用户操作" | `.planning/PROJECT.md` 核心价值; `STORE-LISTING.md` copy style | `rg "核心价值" .planning/PROJECT.md` confirms value statement | Update when PROJECT.md core value or product positioning changes |
| CLM-USE-01 | Use cases | Primary use cases: personal knowledge capture, team sharing, Agent / llm-wiki workflows | "个人知识沉淀"; "团队分享"; "Agent / llm-wiki 知识库工作流"; "personal knowledge capture"; "team sharing"; "llm-wiki workflows" | "自动总结"; "AI 生成内容"; "所有知识管理工具" | `.planning/PROJECT.md` 设计初衷 / 核心价值; `.planning/REQUIREMENTS.md` MSG-02 | `rg "llm-wiki\|知识沉淀\|team sharing" .planning/PROJECT.md` | Update when use-case scope changes in PROJECT.md |
| CLM-PAYLOAD-01 | Structured-payload example | Structured payload contains `title`, `url`, `description`, `create_at`, `content` + user `prompt`, more structured than manual copy-paste | "结构化信息：title / url / description / create_at / content + prompt"; "structured metadata capture with six fields" | "完整网页复制"; "复制粘贴即可"; "无需格式化" | `.planning/PROJECT.md` 需求 → "抓取页面结构化信息（title / url / description / create_at / content）"; `PRIVACY.md` Data We Collect section | `rg "title.*url.*description.*create_at.*content" PRIVACY.md .planning/PROJECT.md` | Update when captured fields change in extractor or PROJECT.md |

**Decision notes:**
- D-09: Claims matrix with required columns.
- D-14: Copy guardrails, not final bilingual long copy.

---

## Structured Payload Guardrail

The structured-payload example (Page Outline section 3) must demonstrate the following fields to show the difference from manual copy-paste per MSG-03:

| Field | Purpose | Source |
|-------|---------|--------|
| `title` | Page title | `.planning/PROJECT.md` 需求; `PRIVACY.md` Data We Collect |
| `url` | Page URL | `.planning/PROJECT.md` 需求; `PRIVACY.md` Data We Collect |
| `description` | Page description (meta tag or Readability excerpt) | `.planning/PROJECT.md` 需求; `PRIVACY.md` Data We Collect |
| `create_at` | Timestamp of clip initiation | `.planning/PROJECT.md` 需求; `PRIVACY.md` Data We Collect |
| `content` | Page content (Readability + DOMPurify + Turndown → Markdown) | `.planning/PROJECT.md` 需求; `PRIVACY.md` Data We Collect |
| `prompt` | User-defined prompt text | `.planning/PROJECT.md` 需求; `PRIVACY.md` Data We Collect |

Phase 15 determines exact visual presentation of the payload example. The guardrail ensures Phase 15 shows all six fields and contrasts structured capture against plain copy-paste. This is a guardrail per D-14, not final page long copy.

---

## Copy Guardrails

General rules for all public-facing copy produced by Phase 15:

1. **Source-backed wording only:** Every public claim must trace to a row in the Claims Matrix with an identified source file and section.
2. **Forbidden wording is binding:** If the Claims Matrix lists a wording as forbidden, Phase 15 must not use it in any language variant.
3. **No final long copy in this artifact:** This document provides guardrails (allowed/forbidden wording, source refs). Phase 15 writes the actual page copy following visual layout. Per D-14.
4. **Bilingual consistency:** When Phase 15 writes zh_CN and en copy, both must respect the same claim boundaries. Forbidden wording applies to both languages.
5. **STORE-LISTING.md is copy style reference only:** Its tone, CWS permission explanation style, and store positioning are reusable. Its platform list must not be treated as platform truth per D-10.

**Decision note:** D-14 — copy guardrails, not final bilingual long copy.

---

## Platform Status

Platform truth sourced from `.planning/PROJECT.md` Current shipped platform set and `.planning/ROADMAP.md` v1.2 phase scope per D-05, D-06, D-07, D-10.

| Platform / Item | Status | Page placement | Allowed wording | Forbidden wording | Source |
|-----------------|--------|----------------|-----------------|-------------------|--------|
| OpenClaw | shipped | Supported platforms | "当前支持"; "自部署 AI Agent 平台"; "shipped" | "官方集成"; "独家支持" | `.planning/PROJECT.md` Key Decisions; `.planning/ROADMAP.md` v1.2 |
| Discord | shipped | Supported platforms | "当前支持"; "向频道投递"; "shipped" | "官方合作"; "Discord 认证" | `.planning/PROJECT.md` Key Decisions |
| Slack | shipped | Supported platforms | "当前支持"; "向频道投递"; "shipped" | "官方集成"; "Slack 认证" | `.planning/PROJECT.md` Key Decisions |
| Telegram | shipped + live UAT pending known risk | Supported platforms + Known limits | "当前支持"; "shipped"; must include risk note: "live UAT pending / known risk" | "fully verified"; "完全验证"; "主证明素材"; using Telegram as primary product proof | `.planning/PROJECT.md` Known closeout gaps; `.planning/STATE.md` Deferred Items |
| Feishu/Lark | evaluated and dropped from shipped scope due to unreliable shared URL targeting | Known limits / roadmap only | "evaluated and dropped from shipped scope due to unreliable shared URL targeting"; "评估后未纳入发布范围" | "支持飞书/Lark"; "Feishu/Lark supported"; appearing in supported platform badges | `.planning/PROJECT.md` Out of Scope / Deferred; `.planning/STATE.md` feishu-lark-final-scope-sync |
| Phase 11/12 Nyquist partial | known risk only | Known limits only | "known risk"; "已知风险"; not a marketing feature | turning into marketing feature; "v1.2 交付" | `.planning/STATE.md` Deferred Items |

**Decision notes:**
- D-05: Shipped platforms + Known limits model.
- D-06: Telegram shipped with live UAT pending / known risk.
- D-07: Feishu/Lark in limits/roadmap only, not in supported badges.
- D-10: Platform truth from `.planning/PROJECT.md` and `.planning/ROADMAP.md`; `STORE-LISTING.md` is copy style only.

---

## Privacy / Permission Guardrails

### Privacy Claims (CLM-PRIVACY-01)

| Boundary | Allowed wording | Forbidden wording | Source | Verification |
|----------|-----------------|-------------------|--------|--------------|
| Data collection trigger | "user-triggered capture"; "仅在用户主动点击时抓取"; "click to capture" | "passive data collection"; "background monitoring"; "always-on" | `PRIVACY.md` "Data We Collect": "only when you click the extension icon" | `rg "only when you click" PRIVACY.md` |
| Data storage | "local storage"; "stored exclusively on your local device"; "chrome.storage.local / .session" | "cloud sync"; "remote server"; "云端存储" | `PRIVACY.md` "How Data Is Stored" | `rg "No data is stored on any remote server" PRIVACY.md` |
| Data transmission | "direct browser delivery"; "direct browser tab navigation"; "通过浏览器标签页直接导航" | "server relay"; "API endpoint"; "第三方中转" | `PRIVACY.md` "How Data Is Transmitted" | `rg "direct browser tab navigation\|No data is sent to any server" PRIVACY.md` |
| Remote server | "no remote server"; "不运营远程服务器" | "our servers"; "云端处理"; "server-side processing" | `PRIVACY.md` "Data We Do NOT Collect": "We do not operate or communicate with any remote server" | `rg "do not operate or communicate with any remote server" PRIVACY.md` |
| Telemetry / analytics | "no telemetry"; "no third-party analytics"; "无遥测"; "无第三方分析" | "usage analytics"; "user tracking"; "用户行为分析" | `PRIVACY.md` "Data We Do NOT Collect": "We do not use any third-party analytics, tracking, or telemetry SDK" | `rg "third-party analytics.*tracking.*telemetry" PRIVACY.md` |

**Decision notes:**
- D-04: Independent trust section for privacy/permissions.
- D-11: `PRIVACY.md` is the authoritative privacy mechanism source.

### Permission Claims (CLM-PERM-01)

| Boundary | Allowed wording | Forbidden wording | Source | Verification |
|----------|-----------------|-------------------|--------|--------------|
| Production permissions | "`activeTab`"; "`alarms`"; "`scripting`"; "`storage`"; "`webNavigation`" | production "`tabs`" permission | `wxt.config.ts` production manifest `permissions` array | `pnpm verify:manifest` |
| Production host permissions | "`https://app.slack.com/*`"; "`https://slack.com/*`"; "`https://discord.com/*`"; "`https://web.telegram.org/*`" | static production "`<all_urls>`" host permission | `wxt.config.ts` production manifest `host_permissions` array | `pnpm verify:manifest` |
| Optional origin grant | "`optional_host_permissions: ["<all_urls>"]`"; "runtime origin grant for user-deployed instances" | claiming `<all_urls>` is a static production host permission | `wxt.config.ts` `optional_host_permissions` | `pnpm verify:manifest` |
| Dev-only permissions | May describe dev-only `tabs` and dev-only `<all_urls>` as development-only tooling, clearly separated from production claims | writing dev-only `tabs` or dev-only `<all_urls>` as production claims | `wxt.config.ts` `mode === 'development'` branches | `pnpm verify:manifest` |

**Production permission reference:**
```
Production permissions: activeTab, alarms, scripting, storage, webNavigation
Production host_permissions: https://app.slack.com/*, https://slack.com/*, https://discord.com/*, https://web.telegram.org/*
Production optional_host_permissions: <all_urls>
Forbidden as production claims: tabs permission, static production <all_urls> host permission
```

**STORE-LISTING.md note (D-10):** `STORE-LISTING.md` is copy style and CWS permission explanation reference only. Its platform list may be stale — do not treat it as platform truth source. Its permission explanation style (single-purpose description per permission) is reusable for Phase 15 copy.

**Decision notes:**
- D-08: Permission claims must describe production manifest only.
- D-11: `wxt.config.ts` is the authoritative permission model source.

---

## Asset Status Rules

Per D-15: every product evidence asset must be explicitly labeled with source/version status.

| Label | Meaning | Required Metadata | Allowed Placement |
|-------|---------|-------------------|-------------------|
| actual screenshot | Real product capture from a built and running extension instance | source path or command, version or commit, date, owner/update trigger | proof module, trust section evidence |
| mockup | Visual composition not representing real product state; must be explicitly labeled | source path or command, version or commit, date, owner/update trigger | proof module with label; never unlabeled |
| diagram | Conceptual flow or architecture illustration; not a UI screenshot | source path or command, version or commit, date, owner/update trigger | flow module, architecture section |
| placeholder | Temporary asset pending real screenshot/mockup/diagram; must be replaced before public release or retained with explicit placeholder status | replacement owner, target date, owner/update trigger | pre-release only or explicitly labeled as placeholder |

**Asset metadata requirements for each asset row in Phase 15:**
- `source path or command` — how the asset was generated (e.g., `pnpm assets:screenshot`, design tool export)
- `version or commit` — which extension version or commit the asset represents
- `date` — when the asset was captured or created
- `owner/update trigger` — who is responsible and when to update (e.g., "update on new platform support")

**Decision note:** D-15 — asset evidence rules with source/version metadata.

---

## Maintenance Rules

Per D-12: auditable update paths for each claim category. Each rule identifies the source file to update first, the `13-CONTENT-SOURCES.md` section to update second, and the later page implementation section to update last.

### Platform list

1. **Source first:** Update `.planning/PROJECT.md` Current shipped platform set and Key Decisions.
2. **This artifact second:** Update Platform Status table and CLM-PLATFORM-01 in Claims Matrix.
3. **Page implementation last:** Update Phase 15 supported platforms module and Known limits section.

### Privacy claims

1. **Source first:** Update `PRIVACY.md` with current privacy model.
2. **This artifact second:** Update CLM-PRIVACY-01 in Claims Matrix and Privacy / Permission Guardrails.
3. **Page implementation last:** Update Phase 15 privacy trust section.

### Permission claims

1. **Source first:** Update production `wxt.config.ts` manifest configuration.
2. **Verification:** Run `pnpm verify:manifest` to validate production manifest shape.
3. **This artifact second:** Update CLM-PERM-01 in Claims Matrix and Privacy / Permission Guardrails.
4. **Page implementation last:** Update Phase 15 permission trust section.

### Screenshots / mockups / diagrams / placeholders

1. **Source first:** Capture new asset using defined command or tool (e.g., `pnpm assets:screenshot`).
2. **This artifact second:** Update Asset Status Rules metadata (version, date, owner/update trigger).
3. **Page implementation last:** Replace asset in Phase 15 proof module with correctly labeled asset.

### CTA text

1. **Source first:** Verify repository/install availability URL is valid and accessible.
2. **This artifact second:** Update Page Outline CTA section.
3. **Page implementation last:** Update Phase 15 CTA module.

### Stale public docs

1. **Source first:** Check `STORE-LISTING.md` platform list against `.planning/PROJECT.md` Current shipped platform set. If stale, plan a separate sync task (not Phase 13 scope per D-16).
2. **This artifact second:** Confirm `STORE-LISTING.md` is marked as copy style only in this document.
3. **Page implementation last:** Phase 15 page should not copy `STORE-LISTING.md` platform list; use this artifact's Platform Status table as the truth source.

---

## Verification Checklist

Phase 16 and maintainers use these checks to verify promotional claims match canonical sources.

### Grep-based claim ID presence checks

```bash
# Verify all claim IDs exist in the content sources artifact
rg "CLM-HERO-01|CLM-USE-01|CLM-PAYLOAD-01|CLM-PLATFORM-01|CLM-PRIVACY-01|CLM-PERM-01|CLM-LIMIT-01|CLM-LIMIT-02" \
  .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md
```

### Source file reference checks

```bash
# Verify all canonical source files are referenced
rg ".planning/PROJECT.md|PRIVACY.md|STORE-LISTING.md|wxt.config.ts|pnpm verify:manifest" \
  .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md
```

### Production manifest verification

```bash
# Build and validate production manifest matches permission claims
pnpm verify:manifest
```

### Platform truth reconciliation

```bash
# Verify shipped platform names match PROJECT.md
rg "OpenClaw|Discord|Slack|Telegram" .planning/PROJECT.md
rg "Feishu/Lark|dropped from shipped scope" .planning/PROJECT.md
```

### Risk status labels

```bash
# Verify risk labels are present
rg "live UAT pending known risk|evaluated and dropped from shipped scope due to unreliable shared URL targeting|known risk only" \
  .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md
```

### Asset label completeness

```bash
# Verify all required asset labels exist
rg "actual screenshot|mockup|diagram|placeholder" \
  .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md
```

---

## Scope Boundary

This document is a Phase 13 planning artifact per D-13 and D-16:
- **Not final bilingual long copy** — Phase 15 writes the actual page copy following visual layout.
- **Not runtime marketing files** — Phase 14/15 creates the marketing app; this document guides their content.
- **Not edits to PROJECT.md, PRIVACY.md, or STORE-LISTING.md** — those files are source references only.

**Decision notes:**
- D-12: Maintenance rules are auditable.
- D-13: Planning artifact shape.
- D-16: Independent planning document.

---

*Created: 2026-06-02*
*Phase: 13-information-architecture-copy-sources*
