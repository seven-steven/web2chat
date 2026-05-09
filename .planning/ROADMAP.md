# Roadmap: web2chat

## Milestones

- **v1.0 MVP** — Phases 1-7 (shipped 2026-05-09)
- **v1.1 多渠道适配** — Phases 8-12 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1-7): v1.0 MVP (shipped)
- Integer phases (8-12): v1.1 多渠道适配
- Decimal phases (8.1, 9.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 MVP (Phases 1-7) — SHIPPED 2026-05-09</summary>

- [x] Phase 1: 扩展骨架 (4/4 plans) — completed 2026-04-29
- [x] Phase 2: 抓取流水线 (7/7 plans) — completed 2026-04-30
- [x] Phase 3: 投递核心 + Popup UI (8/8 plans) — completed 2026-05-01
- [x] Phase 4: OpenClaw 适配器 (6/6 plans) — completed 2026-05-03
- [x] Phase 5: Discord 适配器 (6/6 plans) — completed 2026-05-06
- [x] Phase 6: i18n 加固 + 打磨 (6/6 plans) — completed 2026-05-07
- [x] Phase 7: 分发上架 (4/4 plans) — completed 2026-05-07

</details>

### v1.1 多渠道适配 (In Progress)

**Milestone Goal:** 扩展 IM 平台覆盖至 Slack、Telegram、Feishu/Lark，同时加固投递链路鲁棒性

- [ ] **Phase 8: 架构泛化** — PlatformId branded type + MAIN world 桥接泛化 + SPA filter 动态构建 + ErrorCode 命名空间
- [ ] **Phase 9: 投递鲁棒性** — 超时分层 + 登录检测泛化 + 重试 UI + 选择器置信度
- [ ] **Phase 10: Slack 适配器** — Slack URL 匹配 + 登录检测 + Quill 编辑器注入 + 发送确认 + 图标/i18n
- [ ] **Phase 11: Telegram 适配器** — Telegram Web K URL 匹配 + 登录检测 + 编辑器注入 + 发送确认 + 图标/i18n
- [ ] **Phase 12: 飞书/Lark 适配器** — 双域名匹配 + 登录检测 + 编辑器注入 + 发送确认 + 图标/i18n

## Phase Details

### Phase 8: 架构泛化
**Goal**: 多平台并行开发的架构基础就绪，新增平台无需改动 pipeline 或 SW 入口文件
**Depends on**: Phase 7 (v1.0 已交付)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):
  1. PlatformId 为 branded string type，通过 registry 条目 id 字段约束合法值，新增平台不引起合并冲突
  2. MAIN world paste 桥接基于 port.name 前缀路由到 per-adapter mainWorldInjector，SW 不含任何平台特定 DOM 逻辑
  3. SPA 路由检测 filter 从 adapterRegistry 动态构建，新增 SPA 平台只需在 registry 添加条目
  4. ErrorCode 按平台命名空间组织，新平台可追加错误码而不影响现有错误处理
**Plans**: TBD

### Phase 9: 投递鲁棒性
**Goal**: 投递链路对网络延迟、DOM 变化、登录状态变化具备分层防护和用户可操作的重试能力
**Depends on**: Phase 8
**Requirements**: DSPT-01, DSPT-02, DSPT-03, DSPT-04
**Success Criteria** (what must be TRUE):
  1. 每个平台有独立的超时配置（dispatchTimeoutMs / adapterResponseTimeoutMs），pipeline 从 registry 读取而非硬编码
  2. 登录检测从 Discord 硬编码泛化为 registry 的 loggedOutPathPatterns，pipeline 层 URL 对比使用此配置
  3. 投递失败时 popup 对 retriable 错误显示"重试"按钮，用户点击后以新 dispatchId 重新发起投递
  4. 适配器选择器使用分层置信度，低置信度匹配在 popup 显示警告提示用户确认
**Plans**: TBD

### Phase 10: Slack 适配器
**Goal**: 用户可以向 Slack workspace 的任意 channel 投递格式化网页信息
**Depends on**: Phase 9
**Requirements**: SLK-01, SLK-02, SLK-03, SLK-04, SLK-05
**Success Criteria** (what must be TRUE):
  1. 用户在 popup send_to 输入 Slack URL 后自动识别为 Slack 平台并显示平台图标
  2. 用户未登录 Slack 时 popup 收到 NOT_LOGGED_IN 错误提示
  3. 用户确认投递后消息成功注入 Slack Quill 编辑器并发送，popup 显示投递成功
  4. Slack 平台图标和 i18n key 在中英双语 locale 中 100% 覆盖
**Plans**: TBD

### Phase 11: Telegram 适配器
**Goal**: 用户可以向 Telegram Web K 的任意对话投递格式化网页信息
**Depends on**: Phase 9
**Requirements**: TG-01, TG-02, TG-03, TG-04, TG-05
**Success Criteria** (what must be TRUE):
  1. 用户在 popup send_to 输入 Telegram Web K URL 后自动识别为 Telegram 平台并显示平台图标
  2. 用户未登录 Telegram 时 popup 收到 NOT_LOGGED_IN 错误提示
  3. 用户确认投递后消息成功注入 Telegram contenteditable 编辑器并发送，popup 显示投递成功
  4. Telegram 平台图标和 i18n key 在中英双语 locale 中 100% 覆盖
**Plans**: TBD

### Phase 12: 飞书/Lark 适配器
**Goal**: 用户可以向飞书或 Lark 的任意对话投递格式化网页信息（双域名统一适配）
**Depends on**: Phase 9
**Requirements**: FSL-01, FSL-02, FSL-03, FSL-04, FSL-05
**Success Criteria** (what must be TRUE):
  1. 用户在 popup send_to 输入 feishu.cn 或 larksuite.com URL 后均识别为飞书平台并显示统一图标
  2. 用户未登录飞书/Lark 时 popup 收到 NOT_LOGGED_IN 错误提示
  3. 用户确认投递后消息成功注入飞书 contenteditable 编辑器并发送，popup 显示投递成功
  4. 飞书平台图标和 i18n key 在中英双语 locale 中 100% 覆盖
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9 → 10 → 11 → 12
(Phase 11 and 12 may run in parallel after Phase 9 completes)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. 架构泛化 | v1.1 | 0/? | Not started | - |
| 9. 投递鲁棒性 | v1.1 | 0/? | Not started | - |
| 10. Slack 适配器 | v1.1 | 0/? | Not started | - |
| 11. Telegram 适配器 | v1.1 | 0/? | Not started | - |
| 12. 飞书/Lark 适配器 | v1.1 | 0/? | Not started | - |

---

_Roadmap created: 2026-04-28_
_v1.0 archived: 2026-05-09_
_v1.1 roadmap defined: 2026-05-09_
