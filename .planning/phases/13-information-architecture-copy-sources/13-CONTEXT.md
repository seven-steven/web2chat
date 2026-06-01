# Phase 13: 信息架构与文案事实源 - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 交付宣传页的信息架构与文案事实源规划产物，锁定页面叙事顺序、对外 claims 边界、隐私 / 权限表述边界、平台能力状态、素材状态标签规则，以及维护者更新这些内容时必须遵循的事实源规则。

本 phase 不实现 marketing app、不写最终页面视觉、不修改扩展运行时代码、不补 Telegram live UAT / Phase 11-12 Nyquist gaps、不恢复 Feishu/Lark 适配器。

</domain>

<decisions>
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v1.2 scope and requirements
- `.planning/ROADMAP.md` — Phase 13 goal, requirements mapping, success criteria, and v1.2 phase boundaries.
- `.planning/REQUIREMENTS.md` — MSG-01..03, TRUST-01..03, OPS-01..02 requirements and explicit out-of-scope list.
- `.planning/PROJECT.md` — product positioning, Current shipped platform set, known closeout gaps, v1.2 direction, Key Decisions.
- `.planning/STATE.md` — current milestone state and known deferred risks.

### Claim truth sources
- `PRIVACY.md` — authoritative privacy model: user-triggered capture, local-only storage, direct browser tab delivery, no telemetry / analytics / remote server.
- `wxt.config.ts` — authoritative production permission model and dev-only permission widening distinction.
- `STORE-LISTING.md` — existing copy style, CWS permission explanation style, and store positioning reference. Treat platform list as stale unless reconciled against `.planning/PROJECT.md`.
- `package.json` — current build / verification scripts; useful for OPS and later build isolation context.

### Prior decisions
- `.planning/milestones/v1.0-phases/07-distribution/07-CONTEXT.md` — prior privacy, listing, README, CWS distribution decisions; note platform counts are v1.0-era and may be stale.
- `.planning/quick/260507-n86-frontend-design-ui/260507-n86-CONTEXT.md` — existing UI style direction: Editorial / data-dense engineering aesthetic, zero new visual dependencies, token-based styling.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `entrypoints/_shared-tokens.css` — existing product UI design token direction; Phase 15 can reuse style language if marketing app chooses shared visual tokens.
- `public/icon/*` — existing product icons usable as brand assets if licensing/size fits.
- `scripts/screenshot-assets.mjs` — existing screenshot asset workflow reference; Phase 13 should define source status labels, Phase 15/16 decide actual use.
- `PRIVACY.md` / `STORE-LISTING.md` — existing public-facing copy sources, but store listing platform list needs reconciliation with current shipped scope before reuse.

### Established Patterns
- Public copy is currently bilingual split-file in prior distribution docs (`PRIVACY.md` plus localized counterpart, `STORE-LISTING.md` plus localized counterpart), but Phase 13 does not need to create final bilingual page copy.
- Production manifest separates production permissions from development-only widened permissions; marketing claims must only reflect production configuration.
- Project planning docs treat Telegram live UAT and Nyquist partial as known risks, not as v1.2 delivery tasks.

### Integration Points
- `.planning/phases/13-information-architecture-copy-sources/` — expected location for Phase 13 planning artifacts.
- Future Phase 14 marketing app must consume these decisions without importing extension runtime modules.
- Future Phase 15 content implementation must follow the Phase 13 outline / claims matrix / copy guardrails.
- Future Phase 16 audit should verify page claims against `PROJECT.md`, `PRIVACY.md`, `STORE-LISTING.md`, and production `wxt.config.ts`.

</code_context>

<specifics>
## Specific Ideas

- Page outline should include: Hero, use cases, structured-payload example, current supported platforms, three-step core flow, privacy / permissions trust section, known limits, CTA.
- Known limits should include Telegram live UAT pending, Feishu/Lark dropped from shipped scope, and avoid turning Phase 11/12 Nyquist partial into a marketing feature.
- Evidence modules must label source status: actual screenshot / mockup / diagram / placeholder.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-信息架构与文案事实源*
*Context gathered: 2026-06-01*
