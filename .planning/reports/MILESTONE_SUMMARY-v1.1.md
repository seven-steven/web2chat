# Milestone v1.1 — 多渠道适配 项目总结

**Generated:** 2026-05-19
**Purpose:** Team onboarding and project review

---

## 1. 项目概述

**web2chat** 是一个 Chrome MV3 浏览器扩展（web clipper），让用户用一次点击把"当前网页的格式化信息 + 预设 prompt"投递到指定的 IM 会话或 AI Agent 会话。

**v1.1 里程碑目标：** 扩展 IM 平台覆盖至 Slack、Telegram，同时加固投递链路鲁棒性。原计划还包括飞书/Lark，但 UAT 中发现飞书 SPA 所有聊天共享同一 URL（blocker），已放弃。

**当前状态：**
- 4/5 phases 完成（Phase 8 架构泛化 → Phase 9 投递鲁棒性 → Phase 10 Slack → Phase 11 Telegram）
- 1/5 phase dropped（Phase 12 飞书/Lark — 共享 URL blocker）
- 投递鲁棒性全面加固（超时分层、登录检测泛化、重试 UI、选择器置信度）
- 支持平台：OpenClaw、Discord、Slack、Telegram（共 4 个）

## 2. 架构与技术决策

### 核心架构变更

- **PlatformId branded type**：从硬编码 union 改为 branded string type，registry 成为 id 来源，新增平台不引起合并冲突
  - Why: v1.0 的 `'mock' | 'openclaw' | 'discord'` literal union 在多平台并行开发时产生频繁冲突
  - Phase: 8 (D-96)

- **MAIN world 桥接泛化**：从 Discord 专用 port + function 改为 per-adapter `mainWorldInjector`，通过 `WEB2CHAT_MAIN_WORLD:<platformId>` port 路由
  - Why: 每新增一个平台都需要修改 SW 入口文件，违反开闭原则
  - Phase: 8 (D-99..D-102)

- **SPA filter 动态构建**：从 Discord 硬编码 filter 改为 registry `spaNavigationHosts` 显式 opt-in
  - Why: 新增 SPA 平台只需在 registry 添加条目，不需要修改 SW
  - Phase: 8 (D-103..D-106)

- **投递超时分层**：per-platform `dispatchTimeoutMs` / `adapterResponseTimeoutMs`，pipeline 从 registry 读取
  - Why: 不同平台响应时间差异大，硬编码超时不灵活
  - Phase: 9 (D-111..D-114)

- **登录检测泛化**：从 Discord 特例泛化为 registry `loggedOutPathPatterns`，统一 pathname-only 匹配
  - Why: 消除 `!adapter.match(actualUrl)` 泛化解释导致的误判风险
  - Phase: 9 (D-115..D-118)

- **Popup-driven 重试**：以 `retriable` 属性驱动 Retry 按钮显示，用户点击后以新 `dispatchId` + 当前表单值重新发起
  - Why: 避免 SW auto-retry 在 MV3 生命周期限制下的不可靠性
  - Phase: 9 (D-119..D-122)

- **选择器分层置信度**：ARIA/role (tier1) → data-* (tier2) → class fragment (tier3)，tier3 触发 `SELECTOR_LOW_CONFIDENCE` warning 需用户确认
  - Why: 防止低置信度选择器误发到第三方 IM
  - Phase: 9 (D-123..D-127)

- **飞书/Lark 放弃**：飞书 SPA 所有聊天共享同一 URL（`feishu.cn/messenger/`），无法按 URL 定位具体聊天
  - Why: URL-based dispatch 是 web2chat 投递模型的基础假设，飞书架构与该假设冲突
  - Phase: 12 (UAT blocker)

### 适配器模式（每个平台一套）

每个 IM 平台对应以下文件集：
1. `shared/adapters/<platform>-format.ts` — 消息格式化（pure function）
2. `shared/adapters/<platform>-login-detect.ts` — DOM 层登录墙检测
3. `entrypoints/<platform>.content.ts` — content script（选择器 + handleDispatch 状态机）
4. `background/injectors/<platform>-main-world.ts` — MAIN world 注入器
5. `shared/adapters/registry.ts` 中一条 `defineAdapter()` 条目
6. `background/main-world-registry.ts` 中一条 injector 注册

**关键约束：** 新增平台不需要修改 `dispatch-pipeline.ts` 或 `background.ts`（Phase 10/11/12 均验证了 zero pipeline/SW changes）。

## 3. 交付的 Phases

| Phase | 名称 | 状态 | Plans | 一句话描述 |
|-------|------|------|-------|-----------|
| 8 | 架构泛化 | Complete / reviewed | 5/5 | PlatformId branded type + MAIN world 桥接泛化 + SPA filter 动态构建 + ErrorCode namespace |
| 9 | 投递鲁棒性 | Verified / passed | 5/5 | 超时分层 + 登录检测泛化 + retriable retry UI + 选择器低置信度警告 |
| 10 | Slack 适配器 | Complete | 6/6 | Slack Quill 编辑器注入 + mrkdwn 格式化 + mention escape + CR-01 gap closure |
| 11 | Telegram 适配器 | Complete | 4/4 | Telegram Web K 注入 + 纯文本格式化 + 4096-char metadata-first 截断（自动化验证通过，因无账号未做人测） |
| 12 | 飞书/Lark 适配器 | Dropped | 5/5 (code removed) | 双域名匹配实现完毕，UAT 发现共享 URL blocker，代码已移除 |

## 4. 需求覆盖

### 架构泛化 (Phase 8)
- ARCH-01: PlatformId branded string type — SATISFIED
- ARCH-02: MAIN world bridge per-adapter routing — SATISFIED
- ARCH-03: SPA filter 动态构建 — SATISFIED
- ARCH-04: ErrorCode namespace — SATISFIED

### 投递鲁棒性 (Phase 9)
- DSPT-01: Per-platform timeout 配置 — SATISFIED
- DSPT-02: 登录检测泛化 loggedOutPathPatterns — SATISFIED
- DSPT-03: Retriable retry UI — SATISFIED
- DSPT-04: 选择器分层置信度 — SATISFIED

### Slack 适配器 (Phase 10)
- SLK-01: Slack URL 匹配 — SATISFIED
- SLK-02: Slack 登录墙检测 — SATISFIED
- SLK-03: Slack Quill 编辑器注入 — SATISFIED
- SLK-04: 发送确认 — SATISFIED
- SLK-05: 图标 + i18n 100% 覆盖 — SATISFIED

### Telegram 适配器 (Phase 11)
- TG-01: Telegram Web K URL 匹配 — SATISFIED
- TG-02: Telegram 登录墙检测 — SATISFIED
- TG-03: Telegram contenteditable 注入 — SATISFIED
- TG-04: 发送确认 — SATISFIED
- TG-05: 图标 + i18n 100% 覆盖 — SATISFIED
- 注：Telegram 渠道因无可用账号，尚未完成 live session 人工测试；当前结论基于自动化验证通过。

### 飞书/Lark 适配器 (Phase 12 — Dropped)
- FSL-01..05: 全部已实现并自动化验证通过，但因 UAT blocker（共享 URL）代码已移除

## 5. 关键决策日志

| ID | 决策 | Phase | 理由 |
|----|------|-------|------|
| D-95 | 保留 `mock` 为 registry 正式平台 | 8 | 支撑 localhost fixture、E2E 和平台检测测试 |
| D-96 | PlatformId branded string type | 8 | 新增平台不引起合并冲突 |
| D-99 | Per-adapter mainWorldInjector | 8 | 新增平台不改 SW/pipeline |
| D-102 | Bridge payload 固定为 `{ text }` | 8 | 限制跨 world 通信复杂度 |
| D-111 | Per-platform timeout override | 9 | 不同平台响应时间差异大 |
| D-115 | loggedOutPathPatterns 简单路径匹配 | 9 | 避免 RegExp/URLPattern 复杂表达式 |
| D-123 | 低置信度 selector 发送前确认 | 9 | 防止误发到第三方 IM |
| D-128 | Slack mrkdwn 专用格式化 | 10 | mrkdwn 语法与 Markdown 差异大 |
| D-129 | Slack 不做字符 truncation | 10 | 40K 字符限制远超实际内容 |
| D-143 | Telegram 4096-char metadata-first 截断 | 11 | Telegram 单条消息硬限制 |
| D-154 | 飞书 zh_CN 显示"飞书"，en 显示"Lark" | 12 | 反映飞书官方品牌策略 |

## 6. 技术债务与待办

### 已知问题

- **Slack mrkdwn BOLD-inside-HEADING 嵌套 bug**：`# Title with **bold**` 产生 `*Title with @@W2C_BOLD_0@@*`。BOLD placeholder 在 HEADING token 内部无法恢复（Phase 10 verification warning）
- **`deleteContentBackward` cleanup 仅删一个字符**：所有 adapter 的 MAIN world injector 共享此问题，pre/post cleanup 只删最后字符（Phase 12 review WR-01，systemic）
- **Popup needs_confirmation bug**：低置信度确认流程中 popup 关闭后重捕覆盖 snapshot。已通过 quick task 修复（260517-aa3）
- **Telegram 渠道人测缺口**：因当前无可用账号，尚未完成 live session 人工测试，当前仅有自动化验证证据
- **E2E 测试积压**：Playwright headed 模式需要人工验证，CI 无法自动化

### 推迟到 v2 的项目

- 飞书/Lark 适配器（需要平台 API 或 URL 定位方案重新评估）
- Telegram Web Z (`/z/`) 投递
- Slack DM / thread view 投递
- Slack Block Kit 格式化
- 其余 IM 平台（Google Chat、LINE、Teams、Signal、WhatsApp、QQ、WeCom 等）
- 历史记录搜索 / 收藏管理
- 配置导入导出
- 自定义模板编辑器

## 7. 快速上手

### 运行项目

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test

# 类型检查
pnpm typecheck

# i18n 覆盖率检查
pnpm test:i18n-coverage
```

### 加载扩展

1. `pnpm build` 生成 `.output/chrome-mv3/`
2. Chrome → `chrome://extensions` → 开发者模式 → 加载已解压的扩展

### 关键目录

```
entrypoints/           # 扩展入口（popup、background SW、各平台 content script）
  popup/               # Preact SPA
  background.ts        # Service worker（顶层 listener 注册）
  *.content.ts         # 各平台 adapter content script
shared/                # 纯 TS 共享模块
  adapters/            # registry、格式化、登录检测、类型
  messaging/           # zod 校验的类型化消息协议
  storage/             # 类型化 storage repo
background/            # SW-only 模块（pipeline、injectors、main-world-registry）
content/               # extractor（Readability + DOMPurify + Turndown）
locales/               # en.yml + zh_CN.yml
tests/                 # unit + E2E 测试
```

### 首先阅读

- `CLAUDE.md` — 项目约定与约束
- `.planning/PROJECT.md` — 项目完整上下文
- `shared/adapters/registry.ts` — 平台注册中心（所有适配器的入口）
- `shared/adapters/types.ts` — IMAdapter 接口与 AdapterRegistryEntry 类型定义

---

## Stats

- **Timeline:** 2026-05-09 → 2026-05-17 (8 days)
- **Phases:** 4 complete / 1 dropped (5 total)
- **Plans:** 25 executed (20 complete, 5 dropped)
- **Commits:** 180
- **Files changed:** 160 (+24,915 / -679)
- **Tests:** 430 passing (53 test files)
- **Contributors:** seven
