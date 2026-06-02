# Phase 15: 宣传页内容与视觉实现 - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 15 在 Phase 14 骨架基础上实现完整的营销页面内容与视觉体验。交付 8 个 section（Hero / Use cases / Structured-payload example / Supported platforms / Three-step core flow / Privacy-permissions trust / Known limits / CTA）的实际内容填充、视觉布局、响应式设计、产品证据素材和安装入口。

本 phase 不修改扩展运行时代码、不补 Telegram live UAT / Phase 11-12 Nyquist gaps、不做发布验收（Phase 16）。

</domain>

<decisions>
## Implementation Decisions

### Section 布局与视觉层级
- **D-01:** 页面整体采用统一单栏布局（`max-w-3xl` 居中），所有 section 线性垂直堆叠。Hero section 可使用 `max-w-4xl` 略宽，其余保持 `max-w-3xl`。
- **D-02:** 无导航栏、无 section anchor、无滚动指示器。纯线性滚动页面，简洁优先。
- **D-03:** 视觉权重分配采用信息密度优先策略：Hero 占最大视觉权重（display text + CTA + payload preview），Use cases / payload / platforms / flow 用紧凑卡片或列表，Trust / limits 用低调文字，CTA 与 Hero 一致的按钮风格。
- **D-04:** Section 间采用背景色交替分段（canvas `#fafafa` / dark `#1e1e1e` 与 surface-subtle `#f4f4f5` / dark `#2a2a2a` 交替），视觉分隔清晰但不突兀。

### 产品证据与素材策略
- **D-05:** 产品证据采用代码生成 mockup 形式（CSS/HTML 在页面内构建产品界面示意图），标注为 mockup。零外部截图素材依赖，随代码更新自动保持一致。
- **D-06:** Mockup 覆盖两个界面元素：popup 窗口（展示抓取结果 + send_to/prompt 输入）和投递目标页面（展示消息已发送）。用两个 mockup 覆盖核心链路。
- **D-07:** Mockup 内的界面文案跟随 i18n locale 切换（单语，从 i18n JSON 读取），保持与真实产品文案一致。

### Three-step flow 与 payload 可视化
- **D-08:** Three-step core flow 使用水平步进条形式：三个步骤横向排列，每步一个图标 + 短描述 + 箭头连接。简洁易理解。
- **D-09:** 步进条图标使用 CSS 形状（圆形数字）+ 现有产品 icon（`public/icon/*`）。零新依赖。
- **D-10:** Structured-payload example 采用模拟 popup 界面形式，展示 title/url/description/create_at/content + prompt 的结构化字段。与产品证据 mockup 风格统一。
- **D-11:** Payload 示例数据在 `site-content.ts` 中硬编码一个模拟文章的 payload（如抓取 Wikipedia 或 MDN 页面的模拟数据）。简单可控，不依赖外部数据。

### CTA 与安装路径
- **D-12:** 主 CTA 指向 GitHub 仓库源码，次要 CTA 指向仓库 README 的安装说明。两个按钮清晰排列。当 CWS 上架后可替换次要 CTA。
- **D-13:** CTA 按钮在页面中出现两次：Hero section 的主 CTA（primary 按钮）+ 页面底部 CTA section 的源码和安装指引按钮（primary + secondary 按钮）。

### Claude's Discretion
- 各 section 的具体文案措辞（需遵守 Phase 13 的 copy guardrails 和 claims matrix）
- 背景色交替的起始色和 section 映射
- 水平步进条的精确间距和箭头样式
- Mockup 的边框、阴影、圆角等视觉细节
- CTA 按钮的具体颜色和尺寸（需使用 accent token）
- 响应式断点选择和移动端适配细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 13 信息架构与文案事实源（MUST READ）
- `.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` — Page outline（8 sections 顺序）、claims matrix（8 条 claim 的 allowed/forbidden wording）、copy guardrails、platform status、privacy/permission guardrails、asset status rules、maintenance rules。Phase 15 所有文案必须遵守此文档的护栏。
- `.planning/phases/13-information-architecture-copy-sources/13-UI-SPEC.md` — Design system（spacing scale、typography 4 sizes/2 weights、color system Obsidian charcoal + emerald）、copywriting contract、narrative contract for Phase 15。

### Phase 14 marketing app 骨架（MUST READ）
- `.planning/phases/14-marketing-app-skeleton-build-isolation/14-CONTEXT.md` — 目录落点（`apps/marketing/`）、技术栈（Preact + signals + Tailwind v4）、构建隔离规则、smoke test 形式。

### v1.2 scope and requirements
- `.planning/ROADMAP.md` — Phase 15 goal, requirements mapping (MSG-01..03, PROOF-01..03, CTA-01/02, TRUST-01/02), success criteria.
- `.planning/REQUIREMENTS.md` — MSG-01..03, PROOF-01..03, CTA-01/02, TRUST-01/02 requirements and explicit out-of-scope list.
- `.planning/PROJECT.md` — product positioning, Current shipped platform set, known closeout gaps, v1.2 direction.

### Claim truth sources
- `PRIVACY.md` — authoritative privacy model for trust section copy.
- `wxt.config.ts` — authoritative production permission model for permission section copy.
- `STORE-LISTING.md` — copy style reference only (NOT platform truth source).

### Design and visual sources
- `shared/styles/design-tokens.css` — shared design tokens (charcoal + emerald palette, spacing, radii, motion). Marketing app already imports this.
- `public/icon/*` — product icons (16/32/48/128 PNG) for step icons and brand assets.
- `DESIGN.md` — comprehensive design system document.

### Prior phase decisions
- `.planning/phases/13-information-architecture-copy-sources/13-CONTEXT.md` — Phase 13 decisions (narrative order, claims boundaries, copy guardrails).
- `.planning/phases/14-marketing-app-skeleton-build-isolation/14-CONTEXT.md` — Phase 14 decisions (directory structure, build isolation, smoke tests).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/marketing/src/app.tsx` — current skeleton with Hero + platforms + Next Phase sections. Phase 15 replaces this with full 8-section layout.
- `apps/marketing/src/data/site-content.ts` — content data layer with `getHero()`, `getSupportedPlatforms()`, `getNextPhase()`. Phase 15 extends with all 8 sections' data functions.
- `apps/marketing/src/i18n/locales/en.json` / `zh_CN.json` — i18n locale files. Phase 15 adds all section keys (must maintain 100% key coverage per CLAUDE.md).
- `apps/marketing/src/i18n/index.ts` — i18n facade with `t()` and `setLocale()`. Already functional.
- `apps/marketing/src/styles/index.css` — imports Tailwind + shared design tokens. No changes needed.
- `shared/styles/design-tokens.css` — full token set (colors, radii, motion, fonts). Already consumed by marketing app.
- `public/icon/*` — product icons usable as step icons and brand assets in mockups.

### Established Patterns
- Content data separated from components: `site-content.ts` exports typed getter functions, components consume them.
- i18n is lazy-loaded per locale with `en` bundled by default, `zh_CN` dynamically imported.
- Layout uses Tailwind utility classes with CSS variable references (e.g., `bg-[var(--color-canvas)]`).
- Dark mode handled via `prefers-color-scheme` media query in design tokens (no `dark:` prefix needed).
- Build isolation: `apps/marketing/dist/` is independent from extension `.output/`.

### Integration Points
- `apps/marketing/src/app.tsx` — main entry point; Phase 15 rewrites this to render all 8 sections.
- `apps/marketing/src/data/site-content.ts` — data layer; Phase 15 extends with payload example data, flow steps, trust/limits content, CTA links.
- `apps/marketing/src/i18n/locales/*.json` — locale files; Phase 15 adds all new section keys.
- `apps/marketing/vite.config.ts` — build config; no changes expected (already configured with Preact + Tailwind).
- `apps/marketing/scripts/verify-build.mjs` — build verification; may need updating if page structure changes significantly.

</code_context>

<specifics>
## Specific Ideas

- Mockup of popup window should show captured page metadata fields (title, url, description, content preview) and the send_to / prompt input areas, matching the actual popup layout.
- Mockup of target page should show a message being delivered to a chat session, illustrating the "direct browser delivery" concept.
- Structured-payload example should simulate the popup interface showing all 6 fields (title / url / description / create_at / content + prompt) with realistic example data.
- Horizontal step indicator for three-step flow: ① Capture → ② Choose target → ③ Send to chat, with accent color marking the current/final step.
- Background color alternation pattern: Hero (canvas) → Use cases (surface-subtle) → Payload (canvas) → Platforms (surface-subtle) → Flow (canvas) → Trust (surface-subtle) → Limits (canvas) → CTA (surface-subtle or accent-soft band).
- CTA in Hero: single primary button (accent color) "查看项目源码" → GitHub repo.
- CTA in bottom section: primary button (GitHub) + secondary button (安装指引) → GitHub README install section.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-宣传页内容与视觉实现*
*Context gathered: 2026-06-02*
