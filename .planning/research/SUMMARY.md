# v1.2 Research Summary — Web 宣传页

## Executive Summary

v1.2 不是扩展主链路能力扩张，而是为已交付的 Chrome MV3 扩展补一个仓库内、静态、公开可访问的 web 宣传页。产品本体已经完成 OpenClaw / Discord / Slack / Telegram 的能力验证；因此 v1.2 的目标不是再碰适配器、dispatch pipeline 或 Telegram live UAT，而是以最小扰动把“是什么、怎么用、支持哪些平台、为什么可信”清晰对外表达出来。

研究材料存在技术路径分歧：一条路径倾向把宣传页放进现有 WXT 工程，作为 unlisted/internal page 复用现有栈；另一条路径倾向单独的 Vite marketing site。默认推荐服务于“公开 web 宣传页面、构建/部署清晰隔离、最小影响扩展主链路”，因此本总结明确推荐：**在仓库内新增独立静态 marketing app，和扩展工程并存，但构建与发布分离**。

风险重点不在技术难度，而在边界失守：一旦把宣传页做成“扩展工程顺手挂一个页面”，后续很容易出现资源耦合、构建脚本污染、部署语义不清、以及为宣传页需求反向影响扩展代码组织。v1.2 应把 guardrail 定死：宣传页只读项目事实、不依赖扩展运行时、不引入新后端、不借机处理 Telegram live UAT / Phase 11-12 Nyquist partial，只把这些列为已知风险或待验证项。

## Stack Additions

### 推荐方案

- **独立 Vite 静态站点（仓库内子应用）**：公开宣传页、静态部署、和扩展主工程构建清晰隔离。
- **沿用 TypeScript + Preact + Tailwind v4**：复用仓库已有技术栈，不引入重型框架。
- **静态产物部署**：部署到任意静态托管即可，无服务端依赖。

### 不推荐作为默认方案

- **WXT unlisted page 作为公开宣传页**：能力上可行，但语义更偏扩展内部页面，会让构建输出、资源引用、路由语义、部署方式与扩展产物纠缠。

### 不引入

- Astro / Next / 路由器 / CMS / 数据库 / 分析后端 / 表单后端。
- 扩展 runtime、storage、permissions、adapter bundle。

## Feature Table Stakes

### v1.2 必备内容

- **Hero 价值主张**：把当前网页的结构化信息 + prompt 一键发送到 IM / AI Agent 会话。
- **安装 / 获取 CTA**：提供源码仓库、扩展安装方式或后续发布入口占位。
- **已支持平台**：OpenClaw / Discord / Slack / Telegram。
- **3-step 核心流程**：Capture → choose target → inject/send。
- **隐私承诺**：本地优先、用户主动触发、不上传第三方分析服务。
- **权限说明**：基于生产 `wxt.config.ts` 和 `PRIVACY.md`，不写 dev-only 权限。

### 建议纳入但保持简洁

- 为什么不是复制粘贴：结构化 payload、prompt 绑定、目标会话复用。
- 架构可信度信号：registry-driven adapter architecture、local-first、no backend。
- 当前限制与风险：Telegram live UAT closeout 缺口、Feishu/Lark dropped、未来平台 deferred。

### 明确不做

- 完整官网 / 文档门户 / 博客 / newsletter / telemetry / lead capture。
- 在线 demo 后端。
- Telegram live UAT 补做。
- Phase 11-12 Nyquist partial 收尾实现。

## Architecture Recommendation

### 推荐架构

**仓库内独立 marketing 子应用**，与扩展工程平级共存：

- `apps/marketing` 或等价目录承载宣传页源码。
- 独立 Vite config / build output。
- 只消费稳定事实源：文案、平台列表、仓库链接、截图资源。
- 与扩展工程共享设计 token / 静态资源可以有，但共享必须是“只读、弱耦合”。

### 推荐原因

1. **公开页面语义正确**：宣传页本质是网站，不是扩展内部页。
2. **构建隔离**：不会污染 WXT 输出、manifest、extension bundles。
3. **部署清晰**：静态站点直接部署；扩展继续走自己的打包 / 发布链路。
4. **回归面最小**：宣传页迭代不触发扩展主链路风险。
5. **后续演进自然**：以后加 docs、changelog 仍在 web 层解决，不侵入扩展。

## Pitfalls / Guardrails

1. **Claims 必须对齐 shipped scope**：只写 OpenClaw / Discord / Slack / Telegram；不要把 deferred/dropped 平台混进主卖点。
2. **隐私文案必须锚定 `PRIVACY.md`**：用户点击时才处理当前 tab；默认仅本地存储；确认投递时通过浏览器传到目标聊天页；无遥测、无第三方分析、无远程服务器。
3. **权限说明必须基于生产 `wxt.config.ts`**：不要写 dev-only `<all_urls>`、`tabs` 等内容。
4. **宣传页禁止依赖扩展 runtime**：不 import service worker、storage、adapter、messaging。
5. **不为 marketing 引入服务端复杂度**：不加 SSR、数据库、analytics backend、表单后端。
6. **把遗留验证缺口标为风险，不标为功能**：Telegram live UAT、Nyquist partial 仅出现在限制或风险说明。
7. **验收包含双语一致性、a11y、首屏性能、截图过期治理**：不要上线后补。

## Recommended Requirement Categories

1. **Positioning & Messaging**：Hero、核心价值、一句话定位、适用人群。
2. **Product Proof**：已支持平台、核心流程、关键截图、可信度说明。
3. **Trust & Constraints**：本地优先、隐私边界、权限说明、当前限制、已知风险。
4. **Acquisition CTA**：仓库入口、安装说明、下载 / 试用占位。
5. **Content Operations**：文案来源、截图资源、版本状态更新方式。
6. **Build & Deploy Isolation**：marketing app 独立构建、独立输出、独立部署。

## Open Decisions

- 宣传页目录落点：`apps/marketing` 还是 `site/`。
- UI 采用 Preact/Tailwind，还是更小的纯静态 HTML/CSS。
- 部署目标：GitHub Pages、Cloudflare Pages、Vercel、Netlify 或其他静态托管。
- 对外 CTA 形式：源码优先、Chrome 安装包、还是等待商店上架。
- 是否展示平台路线图；若展示，必须明确 shipped vs deferred vs risky。
- 截图 / 录屏素材来源与更新策略。

## Confidence / Research Notes

| Area | Confidence | Notes |
|------|------------|-------|
| 独立静态站点优于 WXT unlisted page | HIGH | 与公开访问、构建隔离、最小影响扩展主链路一致 |
| stack 选择延续 Vite/TS/Preact/Tailwind | MEDIUM-HIGH | 现有依赖接近满足；建议显式补 `vite`，避免依赖 WXT 传递依赖 |
| feature table stakes | HIGH | 来自竞品模式、项目目标和已交付事实 |
| claims / privacy / permission guardrails | HIGH | 来自 `PROJECT.md`、`PRIVACY.md`、`wxt.config.ts` 事实源 |
| 具体部署/目录实现细节 | MEDIUM | 需要在 requirements/phase planning 阶段定稿 |

## Source Basis

- `.planning/PROJECT.md`
- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `PRIVACY.md`
- `STORE-LISTING.md`
- `wxt.config.ts`
- `package.json`

## Synthesis Notes

本次研究源文件中存在 WXT unlisted page 与独立 Vite marketing site 的方案分歧。结论上，**应优先保护扩展主链路与构建边界**，所以选择独立静态 marketing app，而不是把宣传页并入 WXT unlisted page。
