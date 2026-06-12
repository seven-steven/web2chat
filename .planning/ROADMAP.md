# Roadmap: web2chat

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-05-09)
- ✅ **v1.1 多渠道适配** — Phases 8-12 + inserted Phase 10.1 (shipped 2026-05-31)
- 📋 **v1.2 添加 web 宣传页面** — Phases 13-16 (planned 2026-06-01)
- 📋 **v2.0 待规划** — 从后续 REQUIREMENTS / ROADMAP 周期定义

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-05-09</summary>

- [x] Phase 1: 扩展骨架 (4/4 plans) — completed 2026-04-29
- [x] Phase 2: 抓取流水线 (7/7 plans) — completed 2026-04-30
- [x] Phase 3: 投递核心 + Popup UI (8/8 plans) — completed 2026-05-01
- [x] Phase 4: OpenClaw 适配器 (6/6 plans) — completed 2026-05-03
- [x] Phase 5: Discord 适配器 (6/6 plans) — completed 2026-05-06
- [x] Phase 6: i18n 加固 + 打磨 (6/6 plans) — completed 2026-05-07
- [x] Phase 7: 分发上架 (4/4 plans) — completed 2026-05-07

Archive: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 多渠道适配 (Phases 8-12 + inserted Phase 10.1) — SHIPPED 2026-05-31</summary>

- [x] Phase 8: 架构泛化 (5/5 plans) — completed 2026-05-10
- [x] Phase 9: 投递鲁棒性 (5/5 plans) — completed 2026-05-16
- [x] Phase 10: Slack 适配器 (6/6 plans) — completed 2026-05-16
- [x] Phase 10.1: Slack logged-out redirect gap closure (2/2 plans) — completed 2026-05-29
- [x] Phase 11: Telegram 适配器 (4/4 plans) — completed 2026-05-16
- [x] Phase 12: 飞书/Lark 适配器 (5/5 plans, dropped from shipped scope) — completed 2026-05-17

Archive: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

### 📋 v1.2 添加 web 宣传页面

#### Phase 13: 信息架构与文案事实源 ✅

**Goal:** 锁定宣传页的信息架构、文案事实源、claims / privacy / permission 边界，确保后续实现不夸大 shipped scope。 *(Completed 2026-06-02)*

**Requirements:** MSG-01, MSG-02, MSG-03, TRUST-01, TRUST-02, TRUST-03, OPS-01, OPS-02

**Success criteria:**

1. 页面 section 列表覆盖 Hero、use cases、structured-payload 示例、支持平台、核心流程、隐私 / 权限、已知限制、CTA。
2. 所有对外 claims 都能追溯到 `PROJECT.md`、`PRIVACY.md`、`STORE-LISTING.md` 或生产 `wxt.config.ts`。
3. 明确区分 shipped 平台、deferred 平台、known risk，并把 Telegram live UAT / Nyquist partial 留在风险说明而非主卖点。
4. 截图 / 文案 / 平台列表更新规则写入 planning artifact，维护者能按来源更新页面内容。

#### Phase 14: 独立 marketing app 骨架与构建隔离 ✅

**Goal:** 建立仓库内独立静态 marketing app，使宣传页可独立 build / preview / smoke test，且不影响扩展构建输出。 *(Completed 2026-06-02)*

**Requirements:** BUILD-01, BUILD-02, BUILD-03

**Plans:** 3 plans

Plans:

- [x] 14-01-PLAN.md — 提取共享 design tokens 到 `shared/`，为 extension 与 marketing app 建立仅样式共享边界
- [x] 14-02-PLAN.md — 创建 `apps/marketing` workspace app、独立 Vite/TS 配置与根级 `site:*` 代理命令
- [x] 14-03-PLAN.md — 增加 marketing build smoke verifier 与 BUILD-03 import 隔离测试

**Success criteria:**

1. 新增独立 marketing app 目录与专用 Vite 配置 / scripts，输出目录与 WXT extension build 隔离。
2. `build` / 扩展现有测试命令保持不变；新增 marketing build / preview / smoke test 命令可单独运行。
3. marketing app 不 import service worker、storage repositories、messaging、permissions、IM adapters 等扩展 runtime 模块。
4. CI / 本地验证命令能分别验证 extension 与 marketing page，失败边界清晰。

#### Phase 15: 宣传页内容与视觉实现 ✅

**Goal:** 实现可发布的静态宣传页主体验，向访客展示产品定位、当前平台、核心流程、产品证据与安装入口。 *(Completed 2026-06-12)*

**Requirements:** MSG-01, MSG-02, MSG-03, PROOF-01, PROOF-02, PROOF-03, CTA-01, CTA-02, TRUST-01, TRUST-02

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 15-01-PLAN.md — 扩展 marketing content getter、双语 locale 与 content truth 测试 (2026-06-10)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 15-02-PLAN.md — 实现 section/CTA/proof/stepper 共享组件与 mockup 证据模块 (2026-06-11)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 15-03-PLAN.md — 重写 `apps/marketing/src/app.tsx` 为最终 8-section 宣传页并补结构回归测试 (2026-06-11)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 15-04-PLAN.md — 强化 marketing smoke verifier、闭合 README 安装入口与 Phase 15 全量验证 (2026-06-11)

**Success criteria:**

1. 访客在首屏能理解 web2chat 的核心价值、目标用户与主要 CTA。
2. 页面展示 OpenClaw / Discord / Slack / Telegram 当前 shipped 平台，并避免暗示 Feishu/Lark 或其他 deferred 平台已支持。
3. 页面包含 3-step flow 与 structured-payload 示例，说明它相对手动复制粘贴的差异。
4. 页面包含隐私 / 权限说明、安装 / 获取路径、产品证据模块，且视觉与现有项目风格一致。
5. 页面满足基础响应式布局、键盘可访问、图片 alt text、无明显首屏性能问题。

#### Phase 16: 发布验收与运营基线

**Goal:** 完成宣传页发布前验收，确保 claims、隐私、权限、可访问性、构建隔离和维护流程都有可重复检查方式。

**Requirements:** PROOF-03, TRUST-01, TRUST-02, TRUST-03, OPS-01, OPS-02, BUILD-01, BUILD-02, BUILD-03

**Success criteria:**

1. marketing build / preview / smoke test 通过，且 extension build / typecheck / relevant tests 仍通过。
2. claims / privacy / permissions checklist 通过，页面内容与 `PROJECT.md`、`PRIVACY.md`、`STORE-LISTING.md`、生产 `wxt.config.ts` 一致。
3. a11y / responsive / link / CTA smoke checks 通过，所有关键链接可访问或有明确占位状态。
4. 截图 / 素材 / 平台列表维护规则已记录，后续平台变化时有明确更新路径。
5. 已知风险（Telegram live UAT、Nyquist partial、Feishu/Lark dropped）在发布说明中保持真实边界。

### 📋 v2.0 待规划

- [ ] 重新评估 Feishu/Lark 是否存在可稳定定位会话的新技术路径
- [ ] 为 Telegram 补 live session headed-browser UAT，决定是否作为 v1.1.x closeout 补证据
- [ ] 评估是否扩展宣传页为 docs portal / changelog / localized site

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. 扩展骨架 | v1.0 | 4/4 | Complete | 2026-04-29 |
| 2. 抓取流水线 | v1.0 | 7/7 | Complete | 2026-04-30 |
| 3. 投递核心 + Popup UI | v1.0 | 8/8 | Complete | 2026-05-01 |
| 4. OpenClaw 适配器 | v1.0 | 6/6 | Complete | 2026-05-03 |
| 5. Discord 适配器 | v1.0 | 6/6 | Complete | 2026-05-06 |
| 6. i18n 加固 + 打磨 | v1.0 | 6/6 | Complete | 2026-05-07 |
| 7. 分发上架 | v1.0 | 4/4 | Complete | 2026-05-07 |
| 8. 架构泛化 | v1.1 | 5/5 | Complete | 2026-05-10 |
| 9. 投递鲁棒性 | v1.1 | 5/5 | Complete | 2026-05-16 |
| 10. Slack 适配器 | v1.1 | 6/6 | Complete | 2026-05-16 |
| 10.1. Slack logged-out redirect | v1.1 | 2/2 | Complete | 2026-05-29 |
| 11. Telegram 适配器 | v1.1 | 4/4 | Complete | 2026-05-16 |
| 12. 飞书/Lark 适配器 | v1.1 | 5/5 | Dropped from shipped scope | 2026-05-17 |
| 13. 信息架构与文案事实源 | v1.2 | 1/1 | Complete | 2026-06-02 |
| 14. 独立 marketing app 骨架与构建隔离 | v1.2 | 3/3 | Complete | 2026-06-02 |
| 15. 宣传页内容与视觉实现 | v1.2 | 5/5 | Complete   | 2026-06-12 |
| 16. 发布验收与运营基线 | v1.2 | 0/0 | Planned | — |

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| MSG-01 | Phase 13, Phase 15 | Phase 15 Satisfied |
| MSG-02 | Phase 13, Phase 15 | Phase 15 Satisfied |
| MSG-03 | Phase 13, Phase 15 | Phase 15 Satisfied |
| PROOF-01 | Phase 15 | Phase 15 Satisfied |
| PROOF-02 | Phase 15 | Phase 15 Satisfied |
| PROOF-03 | Phase 15, Phase 16 | Phase 15 Satisfied |
| TRUST-01 | Phase 13, Phase 15, Phase 16 | Phase 15 Satisfied |
| TRUST-02 | Phase 13, Phase 15, Phase 16 | Phase 15 Satisfied |
| TRUST-03 | Phase 13, Phase 16 | Planned |
| CTA-01 | Phase 15 | Phase 15 Satisfied |
| CTA-02 | Phase 15 | Phase 15 Satisfied |
| OPS-01 | Phase 13, Phase 16 | Planned |
| OPS-02 | Phase 13, Phase 16 | Planned |
| BUILD-01 | Phase 14, Phase 16 | Phase 14 Satisfied |
| BUILD-02 | Phase 14, Phase 16 | Phase 14 Satisfied |
| BUILD-03 | Phase 14, Phase 16 | Phase 14 Satisfied |

**Coverage:**

- v1.2 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---

_Roadmap created: 2026-04-28_
_v1.0 archived: 2026-05-09_
_v1.1 archived: 2026-05-31_
_v1.2 planned: 2026-06-01_
