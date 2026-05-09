# Phase 3: 投递核心 + Popup UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in 03-CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-30
**Phase:** 03-dispatch-popup
**Mode:** discuss (default — interactive 4-area deep-dive)
**Areas selected by user:** ALL 4 (Adapter contract / send_to ↔ prompt binding / Dispatch state machine / Draft + Settings + Hotkey)

## Area 1 — Adapter 契约 + Phase 3 停手位置

### Q1.1 Phase 3 dispatch e2e 上谁端的 adapter？
- **Options:**
  - Stub adapter (建议) — Phase 3 mock-platform.ts，e2e 端到端绿
  - Awaiting_adapter 占位 — 返回 NOT_IMPLEMENTED ErrorCode
  - Stub adapter + 作为复用基线 — 同时作为 Phase 4/5 测试 baseline
- **Selected:** Stub adapter (建议)
- **Rationale:** Phase 3 e2e 可断言 success 路径 + 错误三态；Phase 4 OpenClaw 落地时 register 替换。

### Q1.2 PlatformDetector 实现在哪？
- **Options:**
  - adapter.match() 代查表驱动 (建议)
  - popup 独立正则表
  - RPC dispatch.detectPlatform
- **Selected:** adapter.match() 代查表驱动 (建议)
- **Rationale:** 单一真理来源；新平台只改一文件；与 SUMMARY "adapter 注册表" 一致。

### Q1.3 send_to URL 未识别任何 adapter 时？
- **Options:**
  - 拒绝 dispatch (建议) — Confirm disabled + 灰色 icon + tooltip
  - Fallback 原生 tab 导航
  - 提示 + 反馈链接
- **Selected:** 拒绝 dispatch (建议)
- **Rationale:** 与 v1 范围明示一致（OpenClaw + Discord）；显式 UI 比静默失败友好。

### Q1.4 adapter-registry 如何连接 SW 与 adapter bundle？
- **Options:**
  - Static descriptor + dynamic injection (建议)
  - Eager import
  - Lazy import
- **Selected:** Static descriptor + dynamic injection (建议)
- **Rationale:** adapter bundle 不进 SW bundle；与 Phase 2 extractor 模式一致；SW 大小可控。

## Area 2 — send_to ↔ prompt 绑定 + 历史排序

### Q2.1 切换 send_to 时 prompt 自动切换的语义？
- **Options:**
  - Soft overwrite (dirty flag 抑制) — 建议
  - Hard overwrite (总覆盖)
  - 明示确认 dialog
- **Selected:** Soft overwrite (dirty flag 抑制) — 建议
- **Rationale:** 用户输入永远不被静默覆盖；roadmap SC #2 三步切换在 dirty=false 时自然成立。

### Q2.2 send_to ↔ prompt 绑定何时持久化到 storage？
- **First selection:** dispatch 成功时 (建议) — 但用户随后选 "重选上一个问题"
- **Reasoning provided to user during re-ask:** SC #2 三步切换场景要求每一步面表层动作中 binding 都能读出，dispatch 时落库会让 e2e 跑不通；800ms idle debounce 足够过滤中间状态
- **Final selection:** idle debounce upsert (建议)
- **Rationale:** roadmap SC #2 的"选 A→pa, B→pb, 再 A→pa"测试要求 binding 在用户输入完即可读；800ms debounce 滤掉敲键中间态。

### Q2.3 send_to 历史排序公式？
- **Options:**
  - Hybrid: recency + freq*log(count) (建议)
  - 纯 MRU
  - 纯频次
- **Selected:** Hybrid: recency + freq*log(count) (建议)
- **Rationale:** SUMMARY 明示 MRU + 频次混合；高频项不被偶发低频项搅乱；参数 τ=7d / freq weight=0.3 / N=8。

### Q2.4 send_to 历史下拉的 UI 形态？
- **Options:**
  - input + ARIA combobox listbox (建议)
  - <datalist>
  - input + select 两档分价
- **Selected:** input + ARIA combobox listbox (建议)
- **Rationale:** 自定义实现支持平台 icon + 删除按钮；datalist 不能插入这些；Playwright 可靠测试。

## Area 3 — Dispatch state machine + SW 重启韧性

### Q3.1 dispatch state machine 状态集？
- **Options:**
  - pending→opening→awaiting_complete→awaiting_adapter→done|error|cancelled (建议)
  - 粗额度 4 状态
  - 加中间 verifying 状态
- **Selected:** pending→opening→awaiting_complete→awaiting_adapter→done|error|cancelled (建议)
- **Rationale:** roadmap SC #3 "SW 在 opening 与 awaiting_complete 之间 kill" 需要详细状态才能区分接续语义；verifying 是 adapter 内部细节、不进 SW 状态机。

### Q3.2 幂等键策略？
- **Options:**
  - dispatchId UUID (popup 生成) (建议)
  - SW 生成 id
  - 组合哈希键
- **Selected:** dispatchId UUID (popup 生成) (建议)
- **Rationale:** 简洁；popup 内 signal 持有 activeDispatchId 给快速双击复用；不会拦截用户有意重发。

### Q3.3 SW 重启时怎么被唤醒接续未完成的 dispatch？
- **Options:**
  - tabs.onUpdated:complete 顶层 listener (建议)
  - chrome.alarms 轮询
  - 两者并用
- **Selected:** tabs.onUpdated:complete 顶层 listener (建议)
- **Rationale:** Chrome 保证 SW 唤醒；与 Phase 1 顶层 listener 模式一致；附加 chrome.alarms 30s 兜底超时。

### Q3.4 工具栏 badge 三态过期策略？
- **Options:**
  - loading=`...` 灰 / ok=`ok` 绿 5s / err=`err` 红 留至下次 popup (建议)
  - 5s 统一过期
  - popup 打开时才清
- **Selected:** loading=`...` 灰 / ok=`ok` 绿 5s / err=`err` 红 留至下次 popup (建议)
- **Rationale:** ok 不多干扰用户，err 能被看到；颜色板对应 slate-400 / green-500 / red-500。

## Area 4 — Draft 恢复 + 设置 / 快捷键

### Q4.1 popup draft 的 schema 形态？
- **Options:**
  - 单 popupDraft item (建议)
  - 拆三条 draft items
  - 单 popupDraft 但在 storage.session
- **Selected:** 单 popupDraft item (建议)
- **Rationale:** 一条记录走完整 popup 状态；DSP-09 跨进程恢复要求 storage.local 而非 session；与 Phase 1 typed item 模式一致。

### Q4.2 popupDraft 何时清空？
- **Options:**
  - dispatch=done 后清 (建议)
  - 手动丢弃
  - 带 TTL 的清
- **Selected:** dispatch=done 后清 (建议)
- **Rationale:** 与"发送成功 = 该话题结束"用户预期一致；error/cancelled 不清留给用户重试。

### Q4.3 设置面板形态？
- **Options:**
  - 独立 options page (建议)
  - popup 内嵌抽屉
  - 推迟到 Phase 6
- **Selected:** 独立 options page (建议)
- **Rationale:** popup 360×240 空间不够；Phase 4 grantedOrigins / Phase 6 i18n switcher 都会在此扩展。

### Q4.4 默认快捷键？
- **Options:**
  - Ctrl+Shift+S (roadmap 明说) (建议)
  - Alt+Shift+S (避免 OS save 冲突)
  - onboarding 让用户选
- **Selected:** Ctrl+Shift+S (roadmap 明说) (建议)
- **Rationale:** roadmap SC #5 明文写默认 Ctrl+Shift+S；冲突时用户在 chrome://extensions/shortcuts 重绑（Chrome 原生 UI）；不加 onboarding（simplicity-first）。

## 决策汇总

总计 16 个决策（D-23..D-38），分布：
- Area 1: D-23..D-26 (Adapter 契约)
- Area 2: D-27..D-30 (send_to ↔ prompt + 历史)
- Area 3: D-31..D-34 (Dispatch state machine + SW 韧性)
- Area 4: D-35..D-38 (Draft + 设置 + 快捷键)

附 8 项 Claude's Discretion 委托给 plan 阶段。

## Deferred Ideas（驳回与延后）

驳回的方案 10 项（见 03-CONTEXT.md `<deferred>`）；延后到 Phase 4/5/6/7 的项 4 组；留 v1.x 的项 4 项。

---

*Discussion conducted: 2026-04-30, default mode, 16 questions across 4 areas, 1 重选 (Q2.2)*
