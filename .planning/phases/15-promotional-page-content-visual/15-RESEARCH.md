# Phase 15: 宣传页内容与视觉实现 - Research

**Researched:** 2026-06-02
**Domain:** 独立 marketing app 的静态内容实现、视觉叙事、可访问响应式展示
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MSG-01 | Visitor can understand from the hero section that web2chat sends the current web page's structured information plus a saved prompt to an IM or AI Agent chat session. | Hero 必须同时出现 value statement、payload preview、three-step flow 文案联动。 |
| MSG-02 | Visitor can identify the primary use cases: personal knowledge capture, team sharing, and Agent / llm-wiki workflows. | Use cases section 使用 3 张紧凑卡片，避免扩展为未验证场景。 |
| MSG-03 | Visitor can understand why web2chat is different from manual copy-paste through a concise structured-payload example. | Payload section 必须显示 6 字段 + prompt，采用 popup mockup 而不是纯代码块。 |
| PROOF-01 | Visitor can see the currently shipped platform set as OpenClaw, Discord, Slack, and Telegram. | Supported platforms section 只列 4 个 shipped 平台，并给 Telegram 风险标签。 |
| PROOF-02 | Visitor can follow the core three-step flow: capture page, choose target, send to chat. | 水平三步流，移动端降级为纵向堆叠。 |
| PROOF-03 | Visitor can see credible product evidence through screenshots, diagrams, or UI mockups that are labeled with their source/version status. | 使用代码生成 mockup，并在页面中显式标注 `mockup` 与 source/version status。 |
| CTA-01 | Visitor can find the primary source repository or project entry point from the page. | Hero 与底部 CTA 都要有源码入口。 |
| CTA-02 | Visitor can find a clear installation or availability path for Chrome / Chromium users, even if the current state is an install-from-source or release placeholder. | 底部 CTA 次按钮直达 README 安装段落或清晰安装入口。 |
| TRUST-01 | Visitor can understand the privacy model: user-triggered capture, local-first storage, direct browser delivery, no telemetry, and no third-party analytics. | Trust section 分成 privacy facts 列表，全部从 `PRIVACY.md` 逐条落地。 |
| TRUST-02 | Visitor can understand the production permission model without dev-only or misleading permission claims. | Permission copy 只写 production manifest；严禁写 production `tabs` 或 static `<all_urls>` host permission。 |
</phase_requirements>

## Summary

Phase 15 不需要重新选型；应直接在现有 `apps/marketing` 静态站骨架上完成内容填充、视觉层级、响应式布局与可验证的 mockup 证据模块。[VERIFIED: codebase grep] 当前 marketing app 已具备 Preact + Vite + Tailwind v4 + 本地 i18n 数据层，且根仓库已经暴露 `site:build` / `site:preview` / `site:verify` 代理命令。[VERIFIED: npm registry] 这意味着本 phase 的规划重点不是工程搭建，而是把 Phase 13 的 claims matrix 与 UI contract 精确映射为 8 个 section，并补齐测试与验证缺口。[VERIFIED: codebase grep]

产品 truth boundary 已在上游锁定：页面必须展示 OpenClaw / Discord / Slack / Telegram 四个平台，Telegram 必须带 `live UAT pending / known risk` 边界，Feishu/Lark 只能出现在 known limits，且 privacy / permission 文案必须分别以 `PRIVACY.md` 与生产 `wxt.config.ts` 为准。[VERIFIED: codebase grep] 因此计划时应把“内容实现”和“truth enforcement”视为同一工作流：每个 section 都要有事实源、禁止词、显示方式和验证方式。[VERIFIED: codebase grep]

视觉上最重要的不是复杂组件，而是信息密度控制。[VERIFIED: codebase grep] Hero 必须承担最大解释压力；payload 示例、popup mockup、目标聊天 mockup 需要复用同一视觉语言，避免页面像 8 个无关卡片的拼接。[ASSUMED] 响应式策略应遵循 Tailwind 的 mobile-first 断点模型，先做单列窄屏，再在中大屏增强为横向 stepper 与双列 mockup 组合。[CITED: https://tailwindcss.com/docs/responsive-design]

**Primary recommendation:** 以“单栏叙事骨架 + 数据驱动 section content + 统一 mockup 组件族 + 明确 truth labels”来规划，避免把 Phase 15 拆成纯样式任务。[VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hero / CTA / use cases / trust 文案渲染 | Browser / Client | — | marketing app 是纯静态 Preact 客户端渲染页面，无后端参与。[VERIFIED: codebase grep] |
| Locale 切换与文案选择 | Browser / Client | — | 当前 `setLocale()` 与 `t()` 都在 `apps/marketing/src/i18n` 内完成。[VERIFIED: codebase grep] |
| Payload example / popup mockup / target mockup | Browser / Client | — | 这些是静态演示 UI，不应依赖 extension runtime 或远程数据。[VERIFIED: codebase grep] |
| GitHub / README 安装入口 | Browser / Client | CDN / Static | 链接内容静态写入，最终由静态 build 输出承载。[VERIFIED: codebase grep] |
| 事实源约束与 requirement traceability | Browser / Client | — | 页面实现层承担 truth rendering；canonical truth 仍来自 planning/docs/manifest 源文件。[VERIFIED: codebase grep] |
| 构建输出与部署 | CDN / Static | Browser / Client | `vite build` 产出静态资源，适合静态托管。[CITED: https://vite.dev/guide/static-deploy.html] |

## Project Constraints (from CLAUDE.md)

- 所有用户可见字符串必须走 `t(...)`，且 `en` / `zh_CN` locale 必须 100% 键覆盖。[VERIFIED: codebase grep]
- 继续使用现有技术栈：Preact、`@preact/signals`、Tailwind v4；不要引入 Plasmo、`i18next`、新 UI 库或新图标依赖。[VERIFIED: codebase grep]
- marketing app 只能共享 design tokens 与静态资源，不可 import extension runtime 模块。[VERIFIED: codebase grep]
- 继续遵守 local-first / no telemetry 隐私边界，宣传页不得做相反表述。[VERIFIED: codebase grep]
- 需要主动运行可自行执行的测试、类型检查、lint、构建验证。[VERIFIED: codebase grep]
- 使用中文编写研究与沟通内容。[VERIFIED: codebase grep]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `preact` | 10.29.2 | 静态页面组件渲染 | 项目已在 marketing app 使用，官方 Getting Started 文档覆盖基础渲染模型，且当前仓库已接入。[VERIFIED: npm registry] |
| `@preact/signals` | 2.9.1 | locale signal 与轻量状态 | 当前 app 已用 `signal('en')` 驱动语言切换，足够支撑本 phase，无需额外状态库。[VERIFIED: npm registry] |
| `tailwindcss` | 4.3.0 | utility-first 布局与响应式断点 | 当前 marketing app 已接入；官方响应式文档明确 mobile-first 使用方式，适合 section 布局实现。[VERIFIED: npm registry] |
| `@tailwindcss/vite` | 4.3.0 | Tailwind 与 Vite 集成 | 当前 Vite 配置已启用该插件，无需另建样式管线。[VERIFIED: npm registry] |
| `vite` | 8.0.16 | 静态构建输出 | 官方 static deploy 文档表明 build 输出适合部署到静态托管。[VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@preact/preset-vite` | 2.10.5 | Preact JSX / HMR / Vite 适配 | 保持现有 `apps/marketing/vite.config.ts` 不变时使用。[VERIFIED: npm registry] |
| `shared/styles/design-tokens.css` | repo source | 颜色、圆角、motion、字体 token | 所有视觉实现都应引用 token，而不是自造颜色值体系。[VERIFIED: codebase grep] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 代码生成 mockup | 外部截图素材 | 与 D-05 冲突；截图会产生更新漂移与事实过期风险。[VERIFIED: codebase grep] |
| Tailwind utility 实现 section | 自定义大块 CSS modules | 可行但会增加维护面，不符合当前 app 的既有模式。[ASSUMED] |
| 单一 `site-content.ts` 数据层 | 直接把文案写死在组件内 | 会削弱 OPS-01 的维护路径与 i18n 键覆盖可审计性。[VERIFIED: codebase grep] |

**Installation:**
```bash
# Phase 15 无需新增依赖；复用现有 workspace
pnpm install
```

**Version verification:**
```bash
npm view preact version
npm view @preact/signals version
npm view @preact/preset-vite version
npm view tailwindcss version
npm view @tailwindcss/vite version
npm view vite version
```

**Verified versions / publish freshness:**
- `preact` 10.29.2，registry `time.modified = 2026-05-17T09:58:11.947Z`。[VERIFIED: npm registry]
- `@preact/signals` 2.9.1，registry `time.modified = 2026-05-25T06:20:44.485Z`。[VERIFIED: npm registry]
- `@preact/preset-vite` 2.10.5，registry `time.modified = 2026-03-20T21:39:56.839Z`。[VERIFIED: npm registry]
- `tailwindcss` 4.3.0，registry `time.modified = 2026-06-01T17:24:29.046Z`。[VERIFIED: npm registry]
- `@tailwindcss/vite` 4.3.0，registry `time.modified = 2026-06-01T17:24:55.348Z`。[VERIFIED: npm registry]
- `vite` 8.0.16，registry `time.modified = 2026-06-01T10:37:49.566Z`。[VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Locale detect / toggle
        |
        v
apps/marketing/src/i18n -----> site-content.ts typed getters
        |                               |
        |                               v
        |                     section content objects
        |                               |
        v                               v
                 app.tsx section tree
Hero -> Use cases -> Payload -> Platforms -> Flow -> Trust -> Limits -> CTA
   |         |           |          |          |         |         |       |
   |         |           |          |          |         |         |       +--> GitHub / README links
   |         |           |          |          |         |         +----------> known-risk labels
   |         |           |          |          |         +--------------------> privacy + permission facts
   |         |           |          |          +------------------------------> 3-step explanation
   |         |           |          +-----------------------------------------> shipped platform list
   |         |           +----------------------------------------------------> structured payload popup mockup
   |         +----------------------------------------------------------------> use-case cards
   +----------------------------------------------------------------------------> hero CTA + product proof mockup

Rendered by Preact client -> built by Vite -> dist/ static assets for hosting
```

### Recommended Project Structure
```text
apps/marketing/src/
├── app.tsx                     # 顶层 section 组装
├── components/
│   ├── section-shell.tsx       # 统一 section 容器 / 背景 / 标题样式
│   ├── cta-button.tsx          # primary / secondary CTA 变体
│   ├── proof/
│   │   ├── popup-mockup.tsx    # payload / popup 证据 mockup
│   │   ├── target-mockup.tsx   # 聊天页投递结果 mockup
│   │   └── asset-label.tsx     # mockup/source/version status 标签
│   └── flow/
│       └── stepper.tsx         # 3-step flow，桌面横向/移动端纵向
├── data/
│   └── site-content.ts         # 所有 section 文案与示例数据 getter
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── en.json
│       └── zh_CN.json
└── styles/
    └── index.css               # Tailwind + shared tokens import
```

### Pattern 1: 数据驱动 section 渲染
**What:** 所有 public copy、标签、示例 payload、平台状态、CTA URL 都从 `site-content.ts` 的 typed getter 返回，而不是散落在 JSX 中。[VERIFIED: codebase grep]
**When to use:** 任何需要双语、truth source、后续可审计更新的 marketing 内容。[VERIFIED: codebase grep]
**Example:**
```typescript
// Source: apps/marketing/src/data/site-content.ts
export function getSupportedPlatforms(): PlatformEntry[] {
  return [
    { key: 'openclaw', label: t('supportedPlatforms.openclaw') },
    { key: 'discord', label: t('supportedPlatforms.discord') },
    { key: 'slack', label: t('supportedPlatforms.slack') },
    { key: 'telegram', label: t('supportedPlatforms.telegram') },
  ];
}
```

### Pattern 2: 统一 mockup 视觉语言
**What:** payload example、popup proof、target chat proof 都用同一组 surface / border / radius / mono typography token 组织，形成一个“产品证据组件族”。[ASSUMED]
**When to use:** 展示 PROOF-03 时，避免三个证据模块长得像不同产品。[ASSUMED]
**Example:**
```typescript
// Source: shared/styles/design-tokens.css
// 使用 var(--color-surface) / var(--color-border-strong) / var(--radius-card)
// 统一 mockup panel，而不是为每个 section 另造颜色和圆角。
```

### Pattern 3: 移动优先 section 布局
**What:** 默认窄屏单列，`md:` 及以上再增强为横向 stepper、双列 mockup、并排 CTA。[CITED: https://tailwindcss.com/docs/responsive-design]
**When to use:** 任何桌面端需要横向排列但移动端必须稳定回落的模块。[CITED: https://tailwindcss.com/docs/responsive-design]
**Example:**
```tsx
// Source: https://tailwindcss.com/docs/responsive-design
<section class="grid gap-6 md:grid-cols-2">
  <div>payload mockup</div>
  <div>target chat mockup</div>
</section>
```

### Anti-Patterns to Avoid
- **把事实源写进 JSX:** 会让文案审计和 i18n 覆盖率检查变难。[VERIFIED: codebase grep]
- **把 Telegram 当主证明素材:** 与 known-risk 边界冲突。[VERIFIED: codebase grep]
- **把 Feishu/Lark 放进 supported badges:** 直接违反 Phase 13 claims matrix。[VERIFIED: codebase grep]
- **在 permission 模块写 dev-only `tabs` 或 static `<all_urls>`:** 与 production manifest truth 冲突。[VERIFIED: codebase grep]
- **证据模块不标 `mockup` / source/version status:** 违反 PROOF-03 与 Phase 13 asset rules。[VERIFIED: codebase grep]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 页面布局系统 | 自定义 breakpoint / spacing 体系 | 现有 Tailwind v4 + shared tokens | 当前 app 已有管线；再造会破坏一致性。[VERIFIED: codebase grep] |
| 视觉主题系统 | 新建 marketing-only 颜色表 | `shared/styles/design-tokens.css` | 现有 token 已定义 canvas / surface / accent / radius / motion。[VERIFIED: codebase grep] |
| 多语言状态管理 | 新 i18n 框架 | 当前 `t()` + `setLocale()` + locale JSON | 需求只需双语静态 copy。[VERIFIED: codebase grep] |
| 产品证据 | 外部截图流水线 | 代码生成 mockup | 已被 D-05 锁定，且更稳定可维护。[VERIFIED: codebase grep] |
| 平台 truth 层 | 从 README / store listing 复制平台列表 | `.planning/PROJECT.md` + Phase 13 claims matrix | `STORE-LISTING.md` 仅是风格参考，不是平台真相源。[VERIFIED: codebase grep] |

**Key insight:** Phase 15 的复杂度主要来自“truthful presentation”，不是 UI 技术本身；任何自造内容来源、状态来源或视觉体系，都会把简单静态页变成高维护风险页。[VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Hero 只剩 slogan，没有 payload proof
**What goes wrong:** 首屏只看到一句话和按钮，访客仍不知道“结构化信息 + prompt”到底是什么。[VERIFIED: codebase grep]
**Why it happens:** 把 payload example 单独挪到后面且视觉过弱。[ASSUMED]
**How to avoid:** Hero 内至少保留一个紧凑 payload preview 或 popup mockup 摘要，后续 section 再展开完整版。[VERIFIED: codebase grep]
**Warning signs:** Hero 文案可以替换成任何浏览器插件而不失真。[ASSUMED]

### Pitfall 2: 文案越写越像“支持所有平台”
**What goes wrong:** 为了营销顺滑，把平台表述泛化，误导 shipped scope。[VERIFIED: codebase grep]
**Why it happens:** 忽略 Phase 13 forbidden wording。[VERIFIED: codebase grep]
**How to avoid:** platform copy 只从 CLM-PLATFORM-01 / CLM-LIMIT-* 映射，不自由发挥。[VERIFIED: codebase grep]
**Warning signs:** 出现 “any chat app”, “all platforms”, “fully verified Telegram” 等词。[VERIFIED: codebase grep]

### Pitfall 3: Trust section 混入开发态权限
**What goes wrong:** 页面写出 `tabs` 或 static `<all_urls>`，与 production manifest 不一致。[VERIFIED: codebase grep]
**Why it happens:** 直接看开发模式或历史 store 文案，而不是生产 manifest truth。[VERIFIED: codebase grep]
**How to avoid:** permission copy 以 `wxt.config.ts` production branch + `pnpm verify:manifest` 为唯一验收口。[VERIFIED: codebase grep]
**Warning signs:** 权限列表与 `mode !== development` 分支不一致。[VERIFIED: codebase grep]

### Pitfall 4: mockup 看起来像真实截图但未标注
**What goes wrong:** 访客无法区分真实 UI 与演示 UI，损害可信度。[VERIFIED: codebase grep]
**Why it happens:** 只关注视觉完成度，忽略 asset status rules。[VERIFIED: codebase grep]
**How to avoid:** 每个 proof 模块都加 `mockup` 标签与 source/version status 行。[VERIFIED: codebase grep]
**Warning signs:** 页面中有“截图式”卡片，但没有任何元数据说明。[VERIFIED: codebase grep]

### Pitfall 5: i18n 键补齐不完整
**What goes wrong:** 切换到 `zh_CN` 或 `en` 时出现 key 字符串回退。[VERIFIED: codebase grep]
**Why it happens:** 新增 section 太多，只改了一个 locale。[ASSUMED]
**How to avoid:** 把 section 文案按模块成组加入两个 locale 文件，并规划专门的 i18n coverage 验证任务。[VERIFIED: codebase grep]
**Warning signs:** `t('...')` 在页面直接显示 key path。[VERIFIED: codebase grep]

## Code Examples

Verified patterns from official sources and current codebase:

### Marketing app 入口渲染
```typescript
// Source: apps/marketing/src/main.tsx
const locale = signal('en');

async function init(): Promise<void> {
  const browserLang = navigator.language.replace('-', '_');
  const supported = ['en', 'zh_CN'];
  const detected = supported.includes(browserLang) ? browserLang : 'en';
  locale.value = detected;
  await setLocale(detected);
  render(<App locale={locale} />, document.getElementById('app')!);
}
```

### Vite 静态构建输出
```typescript
// Source: apps/marketing/vite.config.ts
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
```

### Shared design tokens import
```css
/* Source: apps/marketing/src/styles/index.css */
@import 'tailwindcss';
@import '../../../shared/styles/design-tokens.css';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 独立截图素材驱动宣传页 | 代码生成 mockup + truth labels | Phase 15 decisions on 2026-06-02 | 维护成本更低，文案与结构可随代码同步更新。[VERIFIED: codebase grep] |
| 先搭框架再补内容 | Phase 14 已完成独立 marketing skeleton，Phase 15 直接实现内容与视觉 | 2026-06-02 | 计划应围绕 section 完整度与验证，而不是 infra 搭建。[VERIFIED: codebase grep] |
| 响应式靠自定义 CSS | Tailwind mobile-first responsive utilities | current official docs | 规划时可先定义窄屏基线，再用 breakpoint 增强。[CITED: https://tailwindcss.com/docs/responsive-design] |

**Deprecated/outdated:**
- “Next Phase” 占位 section：这是骨架期临时内容，Phase 15 应被完整 8-section 页面替换。[VERIFIED: codebase grep]
- 把 `STORE-LISTING.md` 当平台真相源：已被 Phase 13 明确否定。[VERIFIED: codebase grep]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | payload / popup / target mockup 最好做成统一组件族，否则视觉会碎片化 | Summary / Architecture Patterns | 中 — 可能影响任务拆分，但不影响 truth correctness |
| A2 | 继续使用 Tailwind utility 优于补充大量 marketing-only CSS modules | Standard Stack / Alternatives | 低 — 只是实现偏好，非范围决策 |
| A3 | Hero 如果没有紧凑 payload preview，会显著削弱 MSG-01 理解效率 | Common Pitfalls | 中 — 影响首屏信息密度策略 |
| A4 | 新增 section 时最容易漏掉一个 locale 文件 | Common Pitfalls | 低 — 可用 i18n coverage 验证补救 |

## Open Questions (RESOLVED)

1. **PROOF-03 的 source/version status 具体展示格式要不要可视化为 badge + meta row？**
   - Resolution: public 页面显示 `mockup` + `source: code-generated` + `status: marketing demo aligned to current UI contract` + `version: current repo state` 这一组 public-safe metadata；owner/update trigger 继续保留在 planning / Phase 16 verification metadata，不进入公开 UI copy。[RESOLVED]
   - Planning impact: Phase 15 的 proof mockup 与相关测试、verifier 都按上述 public-safe metadata 文案实现；不把 owner/date 等维护字段暴露到公开页面。[RESOLVED]

2. **README 安装入口是否已有稳定 anchor？**
   - Resolution: 使用现有 README 安装章节作为 CTA-02 目标，锚点基于 `#安装` / `## 安装` 对应的安装 section；最终 CTA URL 以 `pnpm verify:readme` 验证通过为准。[RESOLVED]
   - Planning impact: Phase 15 计划与 verifier 统一把 README 安装 section 视为安装入口，不新增 release-only 或占位链接分支。[RESOLVED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | marketing build / scripts | ✓ | v26.0.0 | — |
| pnpm | workspace scripts | ✓ | 10.33.4 | — |
| Python 3 | 研究期文档抓取辅助 | ✓ | 3.14.5 | — |

**Missing dependencies with no fallback:**
- None.[VERIFIED: tool probe]

**Missing dependencies with fallback:**
- `ctx7` CLI missing；本次改用官方文档 URL + registry / codebase 验证完成研究。[VERIFIED: tool probe]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4（repo） + marketing `verify:build` script + Vite build smoke [VERIFIED: codebase grep] |
| Config file | `/Users/seven/data/coding/projects/seven/web2chat/vitest.config.ts` [VERIFIED: codebase grep] |
| Quick run command | `pnpm site:build && pnpm site:verify` [VERIFIED: codebase grep] |
| Full suite command | `pnpm lint && pnpm typecheck && pnpm test && pnpm site:build && pnpm site:verify && pnpm verify:manifest` [VERIFIED: codebase grep] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MSG-01 | Hero conveys structured page info + prompt to chat | smoke / snapshot-like DOM assertion | `pnpm site:build && pnpm site:verify` | ❌ Wave 0 |
| MSG-02 | Use cases section lists 3 primary use cases | unit | `pnpm test -- <marketing content test>` | ❌ Wave 0 |
| MSG-03 | Payload example shows 6 fields + prompt | unit | `pnpm test -- <marketing content test>` | ❌ Wave 0 |
| PROOF-01 | Platforms section renders 4 shipped platforms only | unit | `pnpm test -- <marketing content test>` | ❌ Wave 0 |
| PROOF-02 | Three-step flow renders 3 ordered steps | unit | `pnpm test -- <marketing content test>` | ❌ Wave 0 |
| PROOF-03 | Mockups carry label/source-status metadata | unit / smoke | `pnpm test -- <marketing proof test>` | ❌ Wave 0 |
| CTA-01 | Source repo CTA exists and points to valid URL | unit | `pnpm test -- <marketing cta test>` | ❌ Wave 0 |
| CTA-02 | Install path CTA exists and points to valid URL | unit | `pnpm test -- <marketing cta test>` | ❌ Wave 0 |
| TRUST-01 | Privacy facts render only allowed claims | unit | `pnpm test -- <marketing trust test>` | ❌ Wave 0 |
| TRUST-02 | Permission facts match production manifest truth | unit + manifest verify | `pnpm verify:manifest` | ✅ partial |

### Sampling Rate
- **Per task commit:** `pnpm site:build && pnpm site:verify`
- **Per wave merge:** `pnpm test && pnpm site:build && pnpm site:verify`
- **Phase gate:** `pnpm lint && pnpm typecheck && pnpm test && pnpm site:build && pnpm site:verify && pnpm verify:manifest`

### Wave 0 Gaps
- [ ] `tests/unit/marketing/site-content.spec.ts` — 覆盖 platforms / payload / trust / CTA data truth
- [ ] `tests/unit/marketing/app-sections.spec.tsx` — 覆盖 8 section presence 与基本 heading / link 渲染
- [ ] `tests/unit/marketing/proof-labels.spec.tsx` — 覆盖 mockup label / source-status metadata
- [ ] `tests/unit/marketing/i18n-coverage.spec.ts` 或复用现有 coverage 脚本扩展到 marketing keys
- [ ] 明确 `pnpm test -- <path>` 对 marketing tests 的过滤方式与命名约定

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 静态宣传页无认证。[VERIFIED: codebase grep] |
| V3 Session Management | no | 静态宣传页无会话管理。[VERIFIED: codebase grep] |
| V4 Access Control | no | 静态宣传页无权限分级。[VERIFIED: codebase grep] |
| V5 Input Validation | yes | CTA URL、locale key、展示文案必须从受控数据源输出，不渲染任意用户输入。[ASSUMED] |
| V6 Cryptography | no | 本 phase 不处理加密。[VERIFIED: codebase grep] |

### Known Threat Patterns for marketing static page

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 误导性平台 claim | Spoofing | 所有平台文案从 claims matrix 映射，禁止 Feishu/Lark support overclaim。[VERIFIED: codebase grep] |
| 权限过度声明 | Tampering | 权限模块只对照 production `wxt.config.ts` 与 `pnpm verify:manifest`。[VERIFIED: codebase grep] |
| 外链目标漂移 | Repudiation | CTA URL 在测试中断言，发布前手动点验 README/install path。[ASSUMED] |
| 未标注 mockup 伪装为真实 screenshot | Spoofing | 所有证据模块带 `mockup` / source-status 标签。[VERIFIED: codebase grep] |
| 注入未翻译硬编码字符串 | Tampering | 所有文案走 `t(...)`；双语文件同步维护。[VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)
- Current codebase files under `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing` — existing marketing app structure, i18n, build scripts, Vite config
- `/Users/seven/data/coding/projects/seven/web2chat/.planning/phases/15-promotional-page-content-visual/15-CONTEXT.md` — locked decisions for layout, mockups, CTA, payload
- `/Users/seven/data/coding/projects/seven/web2chat/.planning/phases/13-information-architecture-copy-sources/13-CONTENT-SOURCES.md` — claims matrix, allowed/forbidden wording, asset status rules
- `/Users/seven/data/coding/projects/seven/web2chat/.planning/phases/13-information-architecture-copy-sources/13-UI-SPEC.md` — typography, spacing, color, copywriting contract
- `/Users/seven/data/coding/projects/seven/web2chat/PRIVACY.md` — privacy truth source
- `/Users/seven/data/coding/projects/seven/web2chat/wxt.config.ts` — production permission truth source
- `https://preactjs.com/guide/v10/getting-started` — official Preact getting started docs
- `https://tailwindcss.com/docs/responsive-design` — official Tailwind responsive design docs
- `https://vite.dev/guide/static-deploy.html` — official Vite static deploy docs
- `https://vite.dev/guide/assets.html` — official Vite asset handling docs

### Secondary (MEDIUM confidence)
- npm registry metadata via `npm view preact`, `npm view @preact/signals`, `npm view @preact/preset-vite`, `npm view tailwindcss`, `npm view @tailwindcss/vite`, `npm view vite`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 当前 app 已落地，版本已用 npm registry 核验，且有官方文档来源。
- Architecture: HIGH - 上游 context、Phase 13/14 artifacts 与当前代码结构一致。
- Pitfalls: MEDIUM - 多数来自上游 truth boundary 与现有结构，少数 UX 风险为经验性判断。

**Research date:** 2026-06-02
**Valid until:** 2026-07-02
