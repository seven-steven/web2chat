---
phase: 8
reviewers: [claude]
reviewed_at: "2026-05-10T12:00:00.000Z"
plans_reviewed: [08-01-PLAN.md, 08-02-PLAN.md, 08-03-PLAN.md, 08-04-PLAN.md, 08-05-PLAN.md]
---

# Cross-AI Plan Review — Phase 8

## Claude Review

### Plan 08-01: Branded PlatformId + defineAdapter + buildSpaUrlFilters

**Summary:** 扎实的基础计划，建立了整个 Phase 8 的类型系统。TDD 节奏清晰（RED→GREEN），接口设计精确到具体代码行，acceptance criteria 可机械化验证。风险可控——只改 shared 层，不碰 background/popup。

**Strengths:**
- `definePlatformId` / `defineAdapter` 封装了 branded type 的唯一构造路径，与 D-96/D-97 决策一致
- `buildSpaUrlFilters` 纯同步函数设计，符合 MV3 SW 顶层注册约束
- `hostEquals`（非 `hostSuffix`）最小化 SW 唤醒面，与 D-105 一致
- Task 的 acceptance criteria 使用 grep 计数，可自动化验证

**Concerns:**
- **[LOW]** `definePlatformId` 内部用 `raw as PlatformId`，TypeScript 无法阻止其他文件直接写 `as PlatformId`。建议在 Task 2 verify 中添加 grep gate 检查散落的 raw cast
- **[LOW]** `buildSpaUrlFilters` 没有去重。如果未来某个 entry 意外重复声明同一 host，会产生重复 filter。目前 3 个平台不会触发

**Risk Assessment:** LOW — 纯类型系统重构，不涉及运行时行为变更

---

### Plan 08-02: ErrorCode namespace + isErrorCode runtime guard

**Summary:** 干净的类型拆分计划。`platform-errors.ts` 作为独立声明层，单向依赖 `result.ts`，避免了循环依赖。`isErrorCode` 覆盖了 common + platform 两个维度。

**Strengths:**
- 依赖方向正确：无循环依赖
- `ALL_PLATFORM_ERROR_CODES` 聚合数组扩展方便
- 保持所有 11 个现有 ErrorCode 字符串值不变（D-108）

**Concerns:**
- **[MEDIUM]** `isErrorCode` 主要安全价值在跨 context 边界（content script → SW），建议在 plan 文档中明确标注用法场景
- **[LOW]** `PlatformErrorCode` 当前只是 `OpenclawErrorCode` 别名，未来添加 Slack 时需手动修改 type 和数组

**Risk Assessment:** LOW — 纯类型重组，不改变任何运行时行为

---

### Plan 08-03: MAIN world bridge generalization + SPA filter integration

**Summary:** Phase 8 中风险最高的计划。架构决策精准：`mainWorldInjector` 不在 shared registry 中赋值，而是通过 `background/main-world-registry.ts` 的手动 Map 单独接线，完全隔离了 popup bundle。

**Strengths:**
- 核心架构正确：type in shared, wiring in background-only
- 手动 Map 模式避免 shared registry 导入 background 模块的困境
- Task 3 Step 6 的 bundle-check gate 是关键安全网
- `onSpaHistoryStateUpdated` 作为专用 handler，语义清晰
- `isErrorCode` 消除了 unsafe cast

**Concerns:**
- **[HIGH]** Task 3 是单一大任务，修改 4 个文件、包含 5 个 Step，没有原子提交点。建议拆为至少 2 个 commit
- **[MEDIUM]** `spaFilters` 每次 SW wake 都重建，虽然性能无影响但值得注释说明
- **[MEDIUM]** `chrome.scripting.executeScript({ func: injector })` 隐含假设 injector 不引用闭包变量，建议在注释中明确约束

**Risk Assessment:** MEDIUM — 重写 SW 核心，popup bundle 隔离依赖构建管线正确性

---

### Plan 08-04: SendForm registry-driven icon lookup + ErrorBanner default cases

**Summary:** 两个独立的 popup 侧消费者改造。简单、直接、低风险。

**Strengths:**
- `iconKeyToVariant` 将 icon 映射收敛到单一函数
- `known` 数组 + fallback 到 `'unsupported'` 设计正确
- ErrorBanner default fallback 使用 `t()` 保持 i18n 一致性

**Concerns:**
- **[MEDIUM]** `iconKeyToVariant` 的 `known` 数组需与 `PlatformIcon` 的 `PlatformVariant` 类型手动同步，没有自动化检查。建议添加 compile-time 断言或测试
- **[LOW]** Plan 不是 TDD 类型，但 `iconKeyToVariant` 是新逻辑，应该有测试

**Risk Assessment:** LOW — 不影响运行时核心路径

---

### Plan 08-05: Gap closure — popup bundle isolation + SW discipline + review fixes

**Summary:** 收尾计划，关闭验证 gap 和 10 项 code review findings。任务分类清晰，每个 fix 有 BEFORE/AFTER 代码示例。

**Strengths:**
- Task 1 的 bundle-check gate 是关键安全网
- CR-02 正确识别 MV3 SW 的 setTimeout 不可靠问题
- CR-03 解决 submitting 永久锁定 bug
- WR-01 修复了 UX 谎言（retry 按钮只 dismiss 不重试）
- IN-01 `requiresDynamicPermission` 显式字段更安全

**Concerns:**
- **[HIGH]** Task 2 和 Task 3 改动覆盖 8+ 文件但各为单一 commit，建议按 fix 分 commit
- **[MEDIUM]** WR-02 exact URL matching 行为变化需要 tradeoff 讨论
- **[MEDIUM]** CR-02 移除 20s timeout，用户等待时间从 20s 增加到 30s
- **[LOW]** `DISPATCH_ACTIVE_KEY` re-export 移除需确认无外部消费者

**Risk Assessment:** MEDIUM — 多文件 bug fix 打包，commit 粒度偏大

---

### Overall Risk: **LOW-MEDIUM**

Phase 8 已通过验证（13/13 truths verified, 4/4 requirements satisfied, 265 tests passing, popup bundle clean）。concern 主要是 commit 粒度和维护性风险，不影响当前实现的正确性。

---

## Consensus Summary

### Agreed Strengths
- 核心架构决策正确：`mainWorldInjector` 分层设计有效隔离 popup bundle
- TDD 节奏和 acceptance criteria 设计精细，可机械化验证
- 依赖方向清晰，无循环依赖
- Wave 分层合理，可并行执行

### Agreed Concerns
- **Commit 粒度偏大**（08-03 Task 3、08-05 Task 2/3）—— revert 成本高
- **`iconKeyToVariant` 的 `known` 数组缺乏自动同步检查**——维护风险
- **`mainWorldInjector` 闭包变量约束未在注释中明确**——潜在 runtime trap

### Divergent Views
无显著分歧。所有 concern 均为维护性和工程实践层面，无架构设计分歧。
