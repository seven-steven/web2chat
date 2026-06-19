# Roadmap: web2chat

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-05-09)
- ✅ **v1.1 多渠道适配** — Phases 8-12 + inserted Phase 10.1 (shipped 2026-05-31)
- ✅ **v1.2 添加 web 宣传页面** — Phases 13-16 (shipped 2026-06-17)
- 📋 **v2.0 Prompt 模板变量引用** — Phases 17-20 (planned 2026-06-19)

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

<details>
<summary>✅ v1.2 添加 web 宣传页面 (Phases 13-16) — SHIPPED 2026-06-17</summary>

- [x] Phase 13: 信息架构与文案事实源 (1/1 plan) — completed 2026-06-02
- [x] Phase 14: 独立 marketing app 骨架与构建隔离 (3/3 plans) — completed 2026-06-02
- [x] Phase 15: 宣传页内容与视觉实现 (6/6 plans, 含 2 gap-closure) — completed 2026-06-12
- [x] Phase 16: 发布验收与运营基线 (4/4 plans) — completed 2026-06-16

Archive: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

### 📋 v2.0 Prompt 模板变量引用 (Phases 17-20)

**Goal:** 用户可以在 prompt 中使用 `{{title}}` / `{{url}}` / `{{description}}` / `{{create_at}}` / `{{content}}` 引用当前 snapshot 字段；popup 预览与实际 dispatch 使用一致渲染结果，并保持现有 OpenClaw / Discord / Slack / Telegram 投递行为不回退。

#### Phase 17: 模板渲染核心

**Goal:** 建立零依赖、纯 TypeScript 的 prompt 模板渲染基础，锁定变量语义与边界矩阵。

**Requirements:** TPL-01, TPL-02, TPL-03, TPL-04, TPL-05, QLT-02

**Success Criteria:**
1. `shared/prompt-template.ts` 暴露单一纯函数，支持 5 个固定 snapshot 字段替换。
2. `{{ title }}` 可解析，`{{Title}}` / `{{dedcription}}` 保留原文并进入 unknown 列表。
3. 空值字段替换为空串；替换单次、非递归；snapshot 字段值里的 `{{...}}` 不会二次展开。
4. `{{create_at}}` 返回原始 ISO 字符串，不做本地化、不加标签。
5. Vitest 覆盖边界矩阵、未知变量、空值、大小写敏感、非递归、长 content 基础行为。

#### Phase 18: Dispatch 接线与模型 A

**Goal:** 将模板渲染接入 dispatch 主链路，采用模型 A 防止显式变量与自动追加 snapshot 造成重复正文。

**Requirements:** TPL-06, DSP-01, DSP-02, DSP-03, DSP-04, DSP-05

**Success Criteria:**
1. dispatch pipeline 在发送前使用与 popup 共享的渲染函数处理 prompt。
2. prompt 含已识别变量时跳过自动追加 snapshot；无已识别变量时保持旧 prompt-first auto-append 行为。
3. 替换后的 prompt 继续经过目标平台 escape / mrkdwn / 截断逻辑，`@everyone` 等 mention 注入不回归。
4. `{{content}}` 长正文在渲染后有专门长度校验与用户可理解错误，不落入模糊 INTERNAL。
5. history / binding / draft 保存原始模板字符串；旧无变量 prompt 在 OpenClaw / Discord / Slack / Telegram 的投递行为不回退。

#### Phase 19: Popup 平台级预览与变量 UX

**Goal:** 在 popup 中提供可信的模板预览、未知变量提示和变量插入入口，让用户发送前能看到目标平台最终文本。

**Requirements:** PRV-01, PRV-02, PRV-03, PRV-04, PRV-05, QLT-01

**Success Criteria:**
1. popup 显示渲染后的 prompt 预览，并在 prompt / snapshot 字段变化后自动更新。
2. 未知变量在 popup 中以非阻断提示呈现，不阻止用户发送。
3. prompt UI 提供插入 5 个变量的快捷入口，变量名固定为英文 snake_case，不本地化。
4. 平台级完整预览复用目标平台 composer 语义，反映模型 A、escape/mrkdwn 与截断结果。
5. 所有新增提示、warning、变量插入文案走 i18n，en / zh_CN 100% 覆盖。

#### Phase 20: 模板变量硬化与 E2E 回归

**Goal:** 用跨平台 fixture/E2E 和回归测试证明模板变量不破坏现有投递主链路。

**Requirements:** QLT-03

**Success Criteria:**
1. OpenClaw / Discord / Slack / Telegram 含变量 prompt 的测试覆盖 `{{content}}` 恰好出现一次。
2. 测试覆盖未知变量原样保留、非阻断 warning、旧无变量 prompt 行为不变。
3. 测试覆盖替换后内容仍被平台 escape/转换，防 mention 注入。
4. 测试覆盖长 `{{content}}` 策略、平台截断预览与 dispatch 结果一致。
5. 全量单元测试、i18n 覆盖、lint、构建与相关 E2E/fixture 测试通过。

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
| 15. 宣传页内容与视觉实现 | v1.2 | 6/6 | Complete | 2026-06-12 |
| 16. 发布验收与运营基线 | v1.2 | 4/4 | Complete | 2026-06-16 |
| 17. 模板渲染核心 | v2.0 | 0/? | Planned | — |
| 18. Dispatch 接线与模型 A | v2.0 | 0/? | Planned | — |
| 19. Popup 平台级预览与变量 UX | v2.0 | 0/? | Planned | — |
| 20. 模板变量硬化与 E2E 回归 | v2.0 | 0/? | Planned | — |

---

_Roadmap created: 2026-04-28_
_v1.0 archived: 2026-05-09_
_v1.1 archived: 2026-05-31_
_v1.2 archived: 2026-06-17_
_v2.0 planned: 2026-06-19_
