# Phase 13: 信息架构与文案事实源 - Research

**Researched:** 2026-06-01  
**Domain:** 静态宣传页信息架构、营销文案事实源、隐私/权限 claims 治理  
**Confidence:** HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions

## Implementation Decisions

### 页面叙事顺序
- **D-01:** 宣传页采用“价值先行”叙事：先解释“当前网页结构化信息 + saved prompt → IM / AI Agent chat session”的核心价值，再展示 use cases、structured-payload 示例、支持平台、核心流程、隐私 / 权限、已知限制和 CTA。
- **D-02:** 首屏采用紧凑信息密度：Hero 一句话定位 + primary CTA + structured-payload preview；use cases 与 three-step flow 紧跟首屏下方。
- **D-03:** 支持平台列表放在中段“当前支持”模块；Hero 可以用低权重 chip 提及 shipped platforms，但不让平台列表抢占核心价值叙事。
- **D-04:** 隐私与权限必须作为独立 trust section 呈现，覆盖 no server、no telemetry、local storage、direct browser delivery、production permission model，便于 Phase 16 做 checklist 验收。

### 能力边界表述
- **D-05:** 平台能力采用 “Shipped platforms + Known limits” 模式：主列表只展示当前 shipped platform set（OpenClaw / Discord / Slack / Telegram），另设 Known limits 说明风险与 dropped scope。
- **D-06:** Telegram 可以列为 shipped platform，但必须标注 live UAT pending / known risk；不得把 Telegram 写成 fully verified，也不得作为页面主证明素材。
- **D-07:** Feishu/Lark 不出现在支持平台徽章中；只在 limits / roadmap 语境说明 “evaluated and dropped from shipped scope due to unreliable shared URL targeting”。
- **D-08:** 权限文案必须描述 production manifest 权限：`activeTab` / `alarms` / `scripting` / `storage` / `webNavigation`、static public platform hosts、OpenClaw / user origin 通过 optional origin grant。不得把 dev-only `tabs` 或 dev-only `<all_urls>` 写成生产 claim。

### 事实源规则
- **D-09:** Phase 13 产物必须包含 claims matrix，至少包含：claim、allowed wording、forbidden wording、source file / section、verification note、owner update trigger。
- **D-10:** 当前支持平台列表的权威来源是 `.planning/PROJECT.md` 的 Current shipped platform set / Key Decisions 与 `.planning/ROADMAP.md` 的 v1.2 phase scope。`STORE-LISTING.md` 当前平台段落可能过旧，只能作为 copy style 参考，不能作为 platform truth source。
- **D-11:** 隐私与权限 claims 采用双来源：`PRIVACY.md` 是隐私机制权威；production `wxt.config.ts` 是权限模型权威。页面 claim 必须能分别回链到对应事实源。
- **D-12:** 维护规则必须可审计：后续平台列表、privacy claims、permission claims、screenshots/mockups、CTA 文案发生变化时，维护者能从 claims matrix 找到应更新的源文件、页面 section、验证步骤。

### 内容产物形态
- **D-13:** Phase 13 的主要交付物是 planning artifact，不是 marketing runtime content files。建议 planner 产出独立文档（例如 `13-CONTENT-SOURCES.md` 或 `13-IA.md`），包含 page outline、claims matrix、copy guardrails、maintenance rules。
- **D-14:** 文案层级锁定为“文案护栏”：给出 allowed wording / forbidden wording / source refs，不写完整中英页面长文。Phase 15 根据视觉布局撰写最终 copy，但必须遵守护栏。
- **D-15:** 截图 / mockup / diagram 的来源状态规则必须在 Phase 13 锁定：页面中的产品证据素材必须显式标注 actual screenshot、mockup、diagram 或 placeholder，并标明来源 / 版本状态。
- **D-16:** Phase 13 plan 的验收产物应落盘为独立 planning document，而不是只埋在 CONTEXT.md，也不是直接修改 `PROJECT.md` / `STORE-LISTING.md` / `PRIVACY.md`。

### Claude's Discretion
- 具体 section 标题、exact copy、visual hierarchy、CTA label、claims matrix 文件名由 research/planning 阶段按上述决策裁定。
- Structured-payload 示例的具体字段展示形式由 planner 决定，但必须体现 title / url / description / create_at / content + prompt 的差异化价值。

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Project Constraints (from CLAUDE.md)

- 默认使用 zh-CN 沟通和编写文档。[VERIFIED: CLAUDE.md]
- Phase 13 不实现 marketing app、不写最终页面视觉、不修改扩展运行时代码、不补 Telegram live UAT / Phase 11-12 Nyquist gaps、不恢复 Feishu/Lark 适配器。[VERIFIED: 13-CONTEXT.md]
- 宣传页文案必须保持隐私边界：抓取数据只本地保存，仅在用户主动选择目标 IM 后通过浏览器直接导航传递；绝不上报第三方分析或遥测。[VERIFIED: CLAUDE.md]
- 权限 claims 必须反映生产 manifest：静态 `host_permissions` 禁止 `<all_urls>`，`<all_urls>` 只允许出现在 `optional_host_permissions`。[VERIFIED: CLAUDE.md]
- v1 当前公共平台 host 权限覆盖 Discord、Slack、Telegram；OpenClaw 通过运行时请求具体 origin 权限。[VERIFIED: CLAUDE.md]

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MSG-01 | Visitor can understand from the hero section that web2chat sends the current web page's structured information plus a saved prompt to an IM or AI Agent chat session. [VERIFIED: .planning/REQUIREMENTS.md] | Hero 按 D-01/D-02 采用一句话定位 + structured-payload preview；核心 claim 来源为 `.planning/PROJECT.md` 核心价值。 [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/PROJECT.md] |
| MSG-02 | Visitor can identify primary use cases: personal knowledge capture, team sharing, and Agent / llm-wiki workflows. [VERIFIED: .planning/REQUIREMENTS.md] | Use cases 紧跟首屏下方；内容源为 `.planning/PROJECT.md` “个人与小团队”、llm-wiki 设计初衷与 v1.2 target features。 [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/PROJECT.md] |
| MSG-03 | Visitor can understand why web2chat is different from manual copy-paste through a concise structured-payload example. [VERIFIED: .planning/REQUIREMENTS.md] | 示例形式由 planner 裁定，但必须体现 `title` / `url` / `description` / `create_at` / `content` + `prompt`。 [VERIFIED: 13-CONTEXT.md; VERIFIED: PRIVACY.md] |
| TRUST-01 | Visitor can understand privacy model: user-triggered capture, local-first storage, direct browser delivery, no telemetry, and no third-party analytics. [VERIFIED: .planning/REQUIREMENTS.md] | 独立 trust section 覆盖 no server、no telemetry、local storage、direct browser delivery；隐私机制权威来源为 `PRIVACY.md`。 [VERIFIED: 13-CONTEXT.md; VERIFIED: PRIVACY.md] |
| TRUST-02 | Visitor can understand production permission model without dev-only or misleading permission claims. [VERIFIED: .planning/REQUIREMENTS.md] | 权限文案必须描述 production manifest 权限：`activeTab` / `alarms` / `scripting` / `storage` / `webNavigation`、static public platform hosts、optional origin grant；不得写 dev-only `tabs` 或 dev-only `<all_urls>`。 [VERIFIED: 13-CONTEXT.md; VERIFIED: wxt.config.ts] |
| TRUST-03 | Visitor can distinguish shipped capabilities from known risks and deferred platforms, including Telegram live UAT and Feishu/Lark scope status. [VERIFIED: .planning/REQUIREMENTS.md] | 使用 “Shipped platforms + Known limits” 模式：OpenClaw / Discord / Slack / Telegram 为主列表；Telegram 标 live UAT pending；Feishu/Lark 仅在 limits/roadmap 说明 dropped。 [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/PROJECT.md; VERIFIED: .planning/STATE.md] |
| OPS-01 | Maintainer can update platform list, privacy claims, screenshots, and CTA text from explicit source sections/files. [VERIFIED: .planning/REQUIREMENTS.md] | Phase 13 产物必须包含 page outline、claims matrix、copy guardrails、maintenance rules，并覆盖 owner update trigger。 [VERIFIED: 13-CONTEXT.md] |
| OPS-02 | Maintainer can verify promotional claims match `PROJECT.md`, `PRIVACY.md`, `STORE-LISTING.md`, and production `wxt.config.ts`. [VERIFIED: .planning/REQUIREMENTS.md] | Claims matrix 必须包含 source file / section 和 verification note；权限校验可复用 `pnpm verify:manifest`。 [VERIFIED: 13-CONTEXT.md; VERIFIED: package.json] |

</phase_requirements>

## Summary

Phase 13 是信息架构与事实源治理 phase，不是前端实现 phase。CONTEXT 已锁定“价值先行”的叙事顺序、Shipped platforms + Known limits 的能力边界、claims matrix 的必要字段、以及独立 planning document 的产物形态。[VERIFIED: 13-CONTEXT.md]

Planner 应把 Phase 13 拆成文档/审计任务：创建独立 planning artifact（推荐 `13-CONTENT-SOURCES.md`），写 page outline，建立 claims matrix，定义 allowed/forbidden wording，固定素材状态标签规则，并给出维护 checklist。不要修改扩展运行时代码，也不要把完整中英页面长文提前写死。[VERIFIED: 13-CONTEXT.md]

**Primary recommendation:** 在 `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` 创建 Phase 13 主交付物，内容包含 page outline、claims matrix、copy guardrails、asset status rules、maintenance rules；保留 `13-IA.md` 作为可选文件名，但单文件 `13-CONTENT-SOURCES.md` 更直接匹配 D-09/D-13/D-16。[VERIFIED: 13-CONTEXT.md; ASSUMED]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| 页面叙事顺序 | Documentation / Planning | Static frontend later | Phase 13 锁定 Hero → use cases → structured-payload → supported platforms → flow → trust → limits → CTA；Phase 15 才实现页面。 [VERIFIED: 13-CONTEXT.md] |
| Claims matrix | Documentation / Planning | Phase 16 validation | CONTEXT 要求 matrix 至少包含 claim、allowed wording、forbidden wording、source file/section、verification note、owner update trigger。 [VERIFIED: 13-CONTEXT.md] |
| 隐私 claims | Documentation / Planning | Privacy policy | `PRIVACY.md` 是隐私机制权威；页面 claims 必须回链。 [VERIFIED: 13-CONTEXT.md; VERIFIED: PRIVACY.md] |
| 权限 claims | Documentation / Planning | Extension manifest/config | production `wxt.config.ts` 是权限模型权威；必须排除 dev-only `tabs` 和 dev-only `<all_urls>`。 [VERIFIED: 13-CONTEXT.md; VERIFIED: wxt.config.ts] |
| 平台状态 taxonomy | Documentation / Planning | Extension adapters / roadmap | 主列表只展示 shipped set，Known limits 说明风险与 dropped scope。 [VERIFIED: 13-CONTEXT.md] |
| 素材状态规则 | Documentation / Planning | Future static assets | 素材必须标注 actual screenshot / mockup / diagram / placeholder 与来源/版本状态。 [VERIFIED: 13-CONTEXT.md] |

## Standard Stack

### Core

Phase 13 不安装新库；标准栈是仓库内 Markdown planning artifact + 既有事实源文件 + 生产 manifest 校验脚本。[VERIFIED: 13-CONTEXT.md]

| Source | Purpose | Why Standard |
|--------|---------|--------------|
| `13-CONTEXT.md` | Locked decisions、phase boundary、canonical refs、产物形态 | 本轮讨论已锁定 D-01..D-16；research/planning 必须吸收。 [VERIFIED: 13-CONTEXT.md] |
| `.planning/PROJECT.md` | Product positioning、Current shipped platform set、known closeout gaps、Key Decisions | CONTEXT D-10 指定其为平台 truth source。 [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/PROJECT.md] |
| `.planning/ROADMAP.md` | Phase scope、success criteria、v1.2 phase boundary | CONTEXT canonical refs 指定；Roadmap 列出 Phase 13 成功标准。 [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/ROADMAP.md] |
| `.planning/REQUIREMENTS.md` | MSG/TRUST/OPS requirement definitions、out-of-scope | Phase IDs 和 v1.2 不在范围项权威来源。 [VERIFIED: .planning/REQUIREMENTS.md] |
| `.planning/STATE.md` | Telegram live UAT、Nyquist partial、Feishu/Lark deferred/dropped 状态 | Known risks / deferred items 的权威状态来源。 [VERIFIED: .planning/STATE.md] |
| `PRIVACY.md` | Privacy model | CONTEXT D-11 指定其为隐私机制权威。 [VERIFIED: 13-CONTEXT.md; VERIFIED: PRIVACY.md] |
| `wxt.config.ts` | Production permissions、host permissions、optional_host_permissions | CONTEXT D-08/D-11 指定其为权限模型权威。 [VERIFIED: 13-CONTEXT.md; VERIFIED: wxt.config.ts] |
| `STORE-LISTING.md` | Copy style、CWS permission explanation style | CONTEXT 明确其平台段落可能过旧，只能作 copy style 参考，不能作 platform truth。 [VERIFIED: 13-CONTEXT.md; VERIFIED: STORE-LISTING.md] |
| `package.json` | Verification scripts and screenshot workflow entry | `pnpm verify:manifest`、`assets:screenshot` 可用于后续 OPS/素材流程。 [VERIFIED: package.json] |

### Supporting

| Tool / Command | Purpose | When to Use |
|----------------|---------|-------------|
| `pnpm verify:manifest` | Build and validate production manifest shape | 任何权限文案更新后使用；支持 TRUST-02 / OPS-02。 [VERIFIED: package.json] |
| `rg` | Locate claim IDs/source refs/stale platform wording | 文档审计、Phase 16 checklist、查找未受控 claims。 [ASSUMED] |
| `scripts/screenshot-assets.mjs` | Existing screenshot asset workflow reference | Phase 13 只定义素材状态标签；Phase 15/16 决定是否复用该脚本。 [VERIFIED: 13-CONTEXT.md; VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `13-CONTENT-SOURCES.md` | `13-IA.md` | 两者均被 CONTEXT 允许；`13-CONTENT-SOURCES.md` 更明确承载 claims matrix 和 maintenance rules。 [VERIFIED: 13-CONTEXT.md; ASSUMED] |
| 文案护栏 | 完整中英页面长文 | CONTEXT D-14 已锁定不写完整中英长文；Phase 15 按视觉布局写最终 copy。 [VERIFIED: 13-CONTEXT.md] |
| Manual claims matrix | 自动 NLP claims linter | Phase 13 要 planning artifact；自动 linter 未被要求，可能过度实现。 [VERIFIED: 13-CONTEXT.md; ASSUMED] |

**Installation:** No packages to install for Phase 13. [VERIFIED: 13-CONTEXT.md]

## Package Legitimacy Audit

Phase 13 不安装外部包，Package Legitimacy Gate 不适用。[VERIFIED: 13-CONTEXT.md]

## Architecture Patterns

### System Architecture Diagram

```text
Canonical sources
  ├─ 13-CONTEXT.md: D-01..D-16 decisions
  ├─ .planning/PROJECT.md: positioning + shipped platform truth
  ├─ .planning/ROADMAP.md / REQUIREMENTS.md: scope + success criteria
  ├─ .planning/STATE.md: known risks + deferred status
  ├─ PRIVACY.md: privacy mechanism truth
  ├─ production wxt.config.ts: permission truth
  └─ STORE-LISTING.md: copy style / CWS permission style only
            │
            v
Phase 13 planning artifact: 13-CONTENT-SOURCES.md
  ├─ Page outline: Hero → use cases → payload → platforms → flow → trust → limits → CTA
  ├─ Claims matrix: claim / allowed / forbidden / source / verification / trigger
  ├─ Platform status: shipped + known limits + dropped/deferred
  ├─ Privacy + permission guardrails
  ├─ Asset source-status labels
  └─ Maintenance checklist
            │
            v
Downstream use
  ├─ Phase 15 final copy/components must obey guardrails
  └─ Phase 16 audits claims against sources + production manifest
```

### Recommended Project Structure

```text
.planning/phases/13-information-architecture-copy-sources/
├── 13-CONTEXT.md
├── 13-RESEARCH.md
└── 13-CONTENT-SOURCES.md
```

Use the phase directory for Phase 13 deliverables because CONTEXT lists it as the expected integration point and D-16 says the acceptance artifact should be an independent planning document, not edits to PROJECT / STORE-LISTING / PRIVACY. [VERIFIED: 13-CONTEXT.md]

### Pattern 1: Claims Matrix

**What:** 每条 public claim 都必须有 `claim`、`allowed wording`、`forbidden wording`、`source file / section`、`verification note`、`owner update trigger`。[VERIFIED: 13-CONTEXT.md]

**When to use:** Hero、use cases、structured payload、platform cards、privacy、permissions、known limits、CTA、screenshots/mockups/diagrams 都必须进入 matrix。[VERIFIED: 13-CONTEXT.md]

### Pattern 2: Value-first IA

**What:** 页面叙事顺序固定为 Hero → use cases → structured-payload example → supported platforms → three-step core flow → privacy/permissions trust → known limits → CTA。[VERIFIED: 13-CONTEXT.md]

**When to use:** Phase 13 page outline 和 Phase 15 页面实现都应使用该顺序；平台 chips 可在 Hero 低权重出现，但主平台列表在中段“当前支持”模块。[VERIFIED: 13-CONTEXT.md]

### Pattern 3: Shipped Platforms + Known Limits

| Item | Status | Placement | Required Wording Boundary |
|------|--------|-----------|---------------------------|
| OpenClaw | shipped | Supported platforms | 可作为当前支持平台展示。 [VERIFIED: .planning/PROJECT.md] |
| Discord | shipped | Supported platforms | 可作为当前支持平台展示。 [VERIFIED: .planning/PROJECT.md] |
| Slack | shipped | Supported platforms | 可作为当前支持平台展示。 [VERIFIED: .planning/PROJECT.md] |
| Telegram | shipped + live UAT pending known risk | Supported platforms + Known limits | 可以列为 shipped，但不得写 fully verified，不得作为主证明素材。 [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/STATE.md] |
| Feishu/Lark | evaluated and dropped | Known limits / roadmap only | 不出现在支持平台徽章中；说明 due to unreliable shared URL targeting。 [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/PROJECT.md] |
| Phase 11/12 Nyquist partial | known risk | Known limits only | 不作为营销 feature，不纳入 v1.2 交付任务。 [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/STATE.md] |

### Pattern 4: Asset Source-status Labels

**What:** 页面中产品证据素材必须显式标注 actual screenshot、mockup、diagram 或 placeholder，并标明来源 / 版本状态。[VERIFIED: 13-CONTEXT.md]

Recommended labels:
- `actual screenshot` — 来自真实构建/真实 UI 截图，需记录版本/日期/来源命令。 [VERIFIED: 13-CONTEXT.md; ASSUMED]
- `mockup` — 视觉构图，不代表真实产品状态，必须显式标注。 [VERIFIED: 13-CONTEXT.md; ASSUMED]
- `diagram` — 流程/架构示意，不代表 UI 截图。 [VERIFIED: 13-CONTEXT.md; ASSUMED]
- `placeholder` — 发布前必须替换或保留明确占位状态。 [VERIFIED: 13-CONTEXT.md; ASSUMED]

### Anti-Patterns to Avoid

- **把 STORE-LISTING 的平台段落当 truth source：** CONTEXT D-10 明确其可能过旧，只能作 copy style 参考。 [VERIFIED: 13-CONTEXT.md; VERIFIED: STORE-LISTING.md]
- **Hero 被平台列表抢占：** D-03 锁定平台列表放中段，Hero 只可低权重 chip。 [VERIFIED: 13-CONTEXT.md]
- **Telegram 写成 fully verified：** D-06 禁止；必须标 live UAT pending / known risk。 [VERIFIED: 13-CONTEXT.md]
- **Feishu/Lark 出现在 supported badge：** D-07 禁止；只能在 limits/roadmap 语境说明 dropped。 [VERIFIED: 13-CONTEXT.md]
- **把 dev-only 权限写成生产 claim：** D-08 禁止 dev-only `tabs` 或 dev-only `<all_urls>` 进入生产权限文案。 [VERIFIED: 13-CONTEXT.md; VERIFIED: wxt.config.ts]
- **直接修改 `PROJECT.md` / `STORE-LISTING.md` / `PRIVACY.md` 作为 Phase 13 交付：** D-16 要独立 planning document。 [VERIFIED: 13-CONTEXT.md]
- **写完整中英页面长文：** D-14 要文案护栏，不要提前写死最终 long copy。 [VERIFIED: 13-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 平台真相 | 页面组件内手写平台列表 | `.planning/PROJECT.md` Current shipped platform set + claims matrix | D-10 已指定 PROJECT 为 platform truth source。 [VERIFIED: 13-CONTEXT.md] |
| 隐私承诺 | 新写营销隐私承诺 | `PRIVACY.md` 中 user-triggered/local/direct/no telemetry/no analytics/no server claims | D-11 已指定 PRIVACY 为隐私权威。 [VERIFIED: 13-CONTEXT.md; VERIFIED: PRIVACY.md] |
| 权限说明 | 从记忆描述 manifest | production `wxt.config.ts` + `pnpm verify:manifest` | D-08/D-11 要 production-only permission model。 [VERIFIED: 13-CONTEXT.md; VERIFIED: wxt.config.ts] |
| 素材可信度 | 无标签截图或 UI mockup | actual screenshot / mockup / diagram / placeholder 标签 | D-15 要显式来源状态标签。 [VERIFIED: 13-CONTEXT.md] |
| 维护流程 | 埋在 CONTEXT 或口头约定 | 独立 `13-CONTENT-SOURCES.md` 中 maintenance rules | D-12/D-16 要可审计、落盘的 planning document。 [VERIFIED: 13-CONTEXT.md] |

## Common Pitfalls

### Pitfall 1: 旧 public docs 与当前 shipped set 不一致

**What goes wrong:** 页面复制 README/STORE-LISTING 的 v1.0 平台列表，漏掉 Slack/Telegram 或误判平台状态。 [VERIFIED: STORE-LISTING.md; VERIFIED: .planning/PROJECT.md]  
**How to avoid:** 平台 truth 只用 `.planning/PROJECT.md` Current shipped platform set / Key Decisions 与 `.planning/ROADMAP.md` phase scope。 [VERIFIED: 13-CONTEXT.md]

### Pitfall 2: Dev-only 权限泄露到营销文案

**What goes wrong:** 页面写“需要 tabs 权限”或“生产静态 host_permissions 包含 `<all_urls>`”。 [VERIFIED: wxt.config.ts]  
**How to avoid:** claims matrix 的 permission source 指向 production branch，并在 verification note 写 `pnpm verify:manifest`。 [VERIFIED: 13-CONTEXT.md; VERIFIED: package.json]

### Pitfall 3: 把风险当主卖点或隐藏风险

**What goes wrong:** Telegram 被写成 fully verified 或作为主要产品证明；Feishu/Lark 被暗示支持。 [VERIFIED: 13-CONTEXT.md]  
**How to avoid:** 在 platform status 表中强制 placement：Telegram = supported + risk note；Feishu/Lark = limits/roadmap only。 [VERIFIED: 13-CONTEXT.md]

### Pitfall 4: Phase 13 变成 Phase 15 实现

**What goes wrong:** 计划开始写 marketing runtime files、视觉组件或完整中英文案。 [VERIFIED: 13-CONTEXT.md]  
**How to avoid:** 仅创建独立 planning document；完整页面 copy 和 visual implementation 留给 Phase 15。 [VERIFIED: 13-CONTEXT.md]

## Code Examples

Phase 13 不应新增产品代码；以下是 planning artifact 模板。[VERIFIED: 13-CONTEXT.md]

### Recommended `13-CONTENT-SOURCES.md` Skeleton

```markdown
# Phase 13: Marketing Page Content Sources

## Page Outline
| Order | Section | Purpose | Requirement IDs | Required Claim IDs |
|-------|---------|---------|-----------------|--------------------|
| 1 | Hero | One-line value + primary CTA + structured-payload preview | MSG-01 | CLM-HERO-01 |

## Claims Matrix
| Claim ID | Section | Claim | Allowed wording | Forbidden wording | Source file / section | Verification note | Owner update trigger |
|----------|---------|-------|-----------------|-------------------|-----------------------|-------------------|----------------------|

## Platform Status
| Platform / Item | Status | Page placement | Allowed wording | Forbidden wording | Source |
|-----------------|--------|----------------|-----------------|-------------------|--------|

## Privacy / Permission Guardrails
| Boundary | Allowed wording | Forbidden wording | Source | Verification |
|----------|-----------------|-------------------|--------|--------------|

## Asset Status Rules
| Label | Meaning | Required Metadata | Allowed Placement |
|-------|---------|-------------------|-------------------|
| actual screenshot | Real product capture | version/date/source command | proof module |
| mockup | Visual mock, not proof | version/date/designer note | proof module with label |
| diagram | Conceptual flow | source/date | flow module |
| placeholder | Temporary asset | replacement owner/date | pre-release only or labeled |

## Maintenance Rules
- [ ] Platform changes: update PROJECT source, then claims matrix, then page implementation.
- [ ] Privacy changes: update PRIVACY.md, then privacy claims.
- [ ] Permission changes: update production wxt.config.ts, run pnpm verify:manifest, then permission claims.
- [ ] Screenshot/mockup/diagram changes: update asset status metadata.
- [ ] CTA changes: verify repository/install availability source.
```

### Production Permission Extraction Target

```text
Production permissions: activeTab, alarms, scripting, storage, webNavigation
Production host_permissions: https://app.slack.com/*, https://slack.com/*, https://discord.com/*, https://web.telegram.org/*
Production optional_host_permissions: <all_urls>
Forbidden as production claims: tabs permission, static <all_urls> host permission
```

Source: `wxt.config.ts` production branch and CONTEXT D-08. [VERIFIED: wxt.config.ts; VERIFIED: 13-CONTEXT.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Platform list copied from older public docs / STORE-LISTING | Platform truth from `.planning/PROJECT.md` Current shipped platform set + `.planning/ROADMAP.md` v1.2 scope | Phase 13 CONTEXT D-10 | Prevents stale OpenClaw/Discord-only copy. [VERIFIED: 13-CONTEXT.md; VERIFIED: .planning/PROJECT.md; VERIFIED: STORE-LISTING.md] |
| Single “supported platforms” list | Shipped platforms + Known limits | Phase 13 CONTEXT D-05 | Allows Telegram shipped with risk and Feishu/Lark dropped without misleading support claims. [VERIFIED: 13-CONTEXT.md] |
| Freeform marketing copy | Copy guardrails with allowed/forbidden wording | Phase 13 CONTEXT D-09/D-14 | Phase 15 can write final copy while staying inside facts. [VERIFIED: 13-CONTEXT.md] |
| Unlabeled screenshots/mockups | explicit actual screenshot / mockup / diagram / placeholder labels | Phase 13 CONTEXT D-15 | Product evidence is credible and auditable. [VERIFIED: 13-CONTEXT.md] |
| Dev/prod permission ambiguity | Production-only permission claims sourced from `wxt.config.ts` | Existing config + Phase 13 CONTEXT D-08 | Avoids misleading CWS/privacy claims. [VERIFIED: wxt.config.ts; VERIFIED: 13-CONTEXT.md] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `13-CONTENT-SOURCES.md` is preferable to `13-IA.md` for the main deliverable. | Summary / Project Structure | Planner may choose `13-IA.md`; either is allowed by CONTEXT if it contains all required content. |
| A2 | `rg`-based checks are sufficient for docs-only claim presence checks in Phase 13. | Standard Stack / Validation Architecture | If maintainers require stricter automation, planner may add a claims-check script. |
| A3 | Asset label metadata should include version/date/source command. | Pattern 4 | CONTEXT requires source/version status but not exact metadata fields; planner may refine. |

## Open Questions (RESOLVED)

1. **主交付文件名最终选 `13-CONTENT-SOURCES.md`。**
   - Decision: Phase 13 的主交付文件名固定为 `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md`。 [RESOLVED]
   - Why: CONTEXT D-13 允许 `13-CONTENT-SOURCES.md` 或 `13-IA.md`，但 Phase 13 名称和 D-09/D-12 更强调事实源与 claims matrix；使用 `13-CONTENT-SOURCES.md` 能让后续 Phase 15 直接读取事实源。 [VERIFIED: 13-CONTEXT.md]
   - Planning implication: 不创建 `13-IA.md`，除非执行时发现单文件过长并把它作为附属拆分；验收以 `13-CONTENT-SOURCES.md` 为准。 [RESOLVED]

2. **Phase 13 不同步修改 `STORE-LISTING.md` 平台段落。**
   - Decision: Phase 13 只在 `13-CONTENT-SOURCES.md` 中标注 `STORE-LISTING.md` 平台段落可能过旧、需要后续同步；不直接编辑 `STORE-LISTING.md`。 [RESOLVED]
   - Why: CONTEXT D-16 禁止把直接修改 `STORE-LISTING.md` 作为 Phase 13 验收产物；D-10 只要求识别其平台段落可能过旧。 [VERIFIED: 13-CONTEXT.md]
   - Planning implication: 如果需要 source-doc sync，执行产物应记录为 planning-only maintenance note / follow-up trigger，而不是改动 source doc。 [RESOLVED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | `pnpm verify:manifest` / repo scripts | ✓ | available in environment | Use CI or maintainer machine if local unavailable. [ASSUMED] |
| pnpm | repo scripts | ✓ | packageManager pins pnpm 10.33.4 | Use packageManager-pinned pnpm. [VERIFIED: package.json] |
| ripgrep (`rg`) | docs claim checks | ✓ | available in environment | Use editor search or grep. [ASSUMED] |

**Missing dependencies with no fallback:** none known. [ASSUMED]

**Missing dependencies with fallback:** none known. [ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Docs/manual checklist for Phase 13; `pnpm verify:manifest` for production permission claims. [VERIFIED: 13-CONTEXT.md; VERIFIED: package.json] |
| Config file | `package.json` scripts; production manifest source in `wxt.config.ts`. [VERIFIED: package.json; VERIFIED: wxt.config.ts] |
| Quick run command | `rg "CLM-|Allowed wording|Forbidden wording|Owner update trigger" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` after artifact creation. [ASSUMED] |
| Permission verification command | `pnpm verify:manifest`. [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| MSG-01 | Hero value claim exists and sources PROJECT core value | docs review / grep | `rg "CLM-HERO|structured|saved prompt|PROJECT.md" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ Wave 0 creates artifact |
| MSG-02 | Use cases cover personal knowledge, team sharing, Agent/llm-wiki | docs review / grep | `rg "personal|team|llm-wiki|Agent|use cases" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ Wave 0 creates artifact |
| MSG-03 | Structured-payload example guardrail includes required fields | docs review / grep | `rg "title|url|description|create_at|content|prompt" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ Wave 0 creates artifact |
| TRUST-01 | Privacy claims source to PRIVACY.md | docs review / grep | `rg "PRIVACY.md|no telemetry|local storage|direct browser" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ Wave 0 creates artifact |
| TRUST-02 | Permission claims source to production wxt.config.ts and exclude dev-only | script + docs review | `pnpm verify:manifest` and `rg "dev-only|tabs|<all_urls>|wxt.config.ts" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ✅ command exists; ❌ artifact pending |
| TRUST-03 | Shipped/risk/dropped statuses separated | docs review / grep | `rg "Telegram|live UAT|Feishu|Lark|dropped|Known limits" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ Wave 0 creates artifact |
| OPS-01 | Maintenance rules include platform/privacy/permission/screenshots/CTA update triggers | docs review / grep | `rg "Owner update trigger|Maintenance Rules|screenshots|CTA" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ Wave 0 creates artifact |
| OPS-02 | Claims matrix includes source + verification notes against required files | docs review / script | `rg "source file / section|verification note|PROJECT.md|PRIVACY.md|STORE-LISTING.md|wxt.config.ts" .planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` | ❌ Wave 0 creates artifact |

### Wave 0 Gaps

- [ ] `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` — Phase 13 main deliverable. [VERIFIED: 13-CONTEXT.md; ASSUMED]
- [ ] Optional claims-check script — not required by CONTEXT; add only if planner wants more automation than grep/checklist. [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Phase 13 不实现 auth；目标 IM 登录状态不在本 phase。 [VERIFIED: 13-CONTEXT.md] |
| V3 Session Management | no | Phase 13 不修改 dispatch state 或 extension runtime。 [VERIFIED: 13-CONTEXT.md] |
| V4 Access Control | yes | Permission claims 必须匹配 production manifest 和 optional origin grant model。 [VERIFIED: 13-CONTEXT.md; VERIFIED: wxt.config.ts] |
| V5 Input Validation | yes | Public claims 必须通过 claims matrix 约束 allowed/forbidden wording 和 source/verification note。 [VERIFIED: 13-CONTEXT.md] |
| V6 Cryptography | no | Phase 13 不实现或声明 cryptography；不要新增 encryption/compliance claims。 [VERIFIED: PRIVACY.md] |

### Known Threat Patterns for marketing claims

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Misleading permission claim | Information Disclosure / Repudiation | Source from production `wxt.config.ts`; forbid dev-only `tabs` and static `<all_urls>`; run `pnpm verify:manifest`. [VERIFIED: 13-CONTEXT.md; VERIFIED: wxt.config.ts; VERIFIED: package.json] |
| Privacy overclaim | Repudiation | Restrict to `PRIVACY.md` backed statements. [VERIFIED: 13-CONTEXT.md; VERIFIED: PRIVACY.md] |
| Platform support misrepresentation | Spoofing / Repudiation | Use PROJECT/ROADMAP platform truth; STORE-LISTING platform paragraph is style only. [VERIFIED: 13-CONTEXT.md] |
| Evidence mislabeling | Repudiation | Label every product evidence asset as actual screenshot / mockup / diagram / placeholder with source/version status. [VERIFIED: 13-CONTEXT.md] |
| Scope creep into runtime changes | Tampering | Phase 13 acceptance artifact is independent planning doc; no marketing app/runtime/code changes. [VERIFIED: 13-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)

- `/Users/seven/data/coding/projects/seven/web2chat/.planning/phases/13-information-architecture-copy-sources/13-CONTEXT.md` — locked D-01..D-16 decisions, canonical refs, code context, specifics, deferred ideas. [VERIFIED: 13-CONTEXT.md]
- `/Users/seven/data/coding/projects/seven/web2chat/.planning/REQUIREMENTS.md` — MSG/TRUST/OPS requirements and out-of-scope constraints. [VERIFIED: .planning/REQUIREMENTS.md]
- `/Users/seven/data/coding/projects/seven/web2chat/.planning/ROADMAP.md` — Phase 13 goal and success criteria; Phase 14-16 downstream boundaries. [VERIFIED: .planning/ROADMAP.md]
- `/Users/seven/data/coding/projects/seven/web2chat/.planning/STATE.md` — current phase state, known risks, deferred items. [VERIFIED: .planning/STATE.md]
- `/Users/seven/data/coding/projects/seven/web2chat/.planning/PROJECT.md` — positioning, shipped platform set, known closeout gaps, key decisions. [VERIFIED: .planning/PROJECT.md]
- `/Users/seven/data/coding/projects/seven/web2chat/PRIVACY.md` — authoritative privacy model. [VERIFIED: PRIVACY.md]
- `/Users/seven/data/coding/projects/seven/web2chat/wxt.config.ts` — authoritative production permission model and dev-only distinction. [VERIFIED: wxt.config.ts]
- `/Users/seven/data/coding/projects/seven/web2chat/STORE-LISTING.md` — copy style / CWS permission explanation reference; platform paragraph marked stale by CONTEXT. [VERIFIED: STORE-LISTING.md; VERIFIED: 13-CONTEXT.md]
- `/Users/seven/data/coding/projects/seven/web2chat/package.json` — repo scripts for verification and screenshot workflow reference. [VERIFIED: package.json]
- `/Users/seven/data/coding/projects/seven/web2chat/CLAUDE.md` — project constraints and workflow rules. [VERIFIED: CLAUDE.md]

### Secondary (MEDIUM confidence)

- None; external docs/library research was unnecessary because Phase 13 is repo-local content governance with explicit CONTEXT decisions. [VERIFIED: 13-CONTEXT.md]

### Tertiary (LOW confidence)

- Assumptions about exact filename, grep sufficiency, and asset metadata fields are listed in Assumptions Log. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — CONTEXT locks no runtime implementation and identifies canonical files. [VERIFIED: 13-CONTEXT.md]
- Architecture: HIGH — page IA and artifact shape are explicitly decided in D-01..D-16. [VERIFIED: 13-CONTEXT.md]
- Pitfalls: HIGH — most pitfalls are direct inversions of CONTEXT decisions and observed source staleness/mode split. [VERIFIED: 13-CONTEXT.md; VERIFIED: STORE-LISTING.md; VERIFIED: wxt.config.ts]

**Research date:** 2026-06-01  
**Valid until:** 2026-07-01, or earlier if `13-CONTEXT.md`, `.planning/PROJECT.md`, `PRIVACY.md`, `STORE-LISTING.md`, or `wxt.config.ts` changes. [ASSUMED]
