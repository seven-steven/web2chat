# Phase 9: 投递鲁棒性 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10T06:14:47Z
**Phase:** 9-投递鲁棒性
**Areas discussed:** 超时策略, 登录识别, 重试语义, 低置信度提示

---

## 超时策略

| Question | Options presented | User's choice | Notes |
|----------|-------------------|---------------|-------|
| 超时配置的基线策略怎么定？ | 统一默认（推荐） / 全部显式 / 你决定 | 统一默认（推荐） | registry 支持 override；现有平台先继承 30s / 20s 默认。 |
| dispatchTimeoutMs 和 Chrome alarms 的 30 秒最小粒度怎么处理？ | 强制≥30s（推荐） / 运行时取整 / 仅默认值 | 强制≥30s（推荐） | 小于 30s 配置应通过测试或构建失败暴露。 |
| adapterResponseTimeoutMs 的实现形态要不要也改成 chrome.alarms？ | 保留 Promise.race（推荐） / 也用 alarm / 你决定 | 保留 Promise.race（推荐） | 只保护单次 adapter response，不做跨 SW 生命周期调度。 |
| dispatch 总超时和 adapter response 超时，在用户可见错误码上要不要区分？ | 统一 TIMEOUT（推荐） / 拆错误码 / 你决定 | 统一 TIMEOUT（推荐） | 内部 message 可区分来源；用户只需要可重试。 |

---

## 登录识别

| Question | Options presented | User's choice | Notes |
|----------|-------------------|---------------|-------|
| loggedOutPathPatterns 的表达能力要到什么程度？ | 路径模式（推荐） / 表达式模式 / 你决定 | 路径模式（推荐） | string[]，匹配 adapter host 内 pathname。 |
| Phase 9 后，pipeline 还要不要保留同 host 但不 match 就算登录跳转的兜底？ | 只看登录模式（推荐） / 保留兜底 / 你决定 | 只看登录模式（推荐） | 取消泛化 host mismatch 兜底，减少误判。 |
| 没有 loggedOutPathPatterns 的平台，URL 层登录检测应如何处理？ | 不 remap（推荐） / 旧推断 / 强制显式 | 不 remap（推荐） | OpenClaw/self-hosted 不做 URL 层登录误判。 |
| 登录 URL 检测应该在哪些 pipeline 节点执行？ | 统一 helper（推荐） / 只在导航点 / 你决定 | 统一 helper（推荐） | complete、SPA、timeout/sendMessage failure、INPUT_NOT_FOUND remap 共用 helper。 |

---

## 重试语义

| Question | Options presented | User's choice | Notes |
|----------|-------------------|---------------|-------|
| 点击 Retry 时应使用哪份 payload？ | 当前表单（推荐） / 原始 payload / 回到 Confirm | 当前表单（推荐） | 支持用户修正内容后直接重试。 |
| Retry 按钮显示条件以什么为准？ | 看 retriable（推荐） / 双条件 / 你决定 | 看 retriable（推荐） | ErrorCode 只决定文案。 |
| Retry 发起后 popup 应显示什么状态？ | 进入进度态（推荐） / 按钮 loading / 你决定 | 进入进度态（推荐） | Retry 后显示 InProgressView。 |
| Retry 时旧失败 dispatch 状态怎么处理？ | 切 active（推荐） / 删除旧记录 / 成功后切 | 切 active（推荐） | 旧失败 record 可留存诊断，但不再驱动 UI。 |

---

## 低置信度提示

| Question | Options presented | User's choice | Notes |
|----------|-------------------|---------------|-------|
| 低置信度 selector 命中时，用户确认发生在发送前还是发送后？ | 发送前确认（推荐） / 发送后警告 / 非阻塞提示 | 发送前确认（推荐） | 确认前不能 send。 |
| 发送前确认在协议上怎么落地？ | 确认后重发（推荐） / 同次暂停 / 你决定 | 确认后重发（推荐） | 第一次 dispatch 返回 warning；确认后新 dispatchId + confirmed flag 重走 dispatch.start。 |
| 哪些 selector tier 算低置信度？ | tier3 触发（推荐） / tier2+触发 / adapter 自定 | tier3 触发（推荐） | ARIA/role 与 data-* 正常；class fragment 触发 warning。 |
| 用户确认低置信度 selector 后，这个确认应保存多久？ | 单次确认（推荐） / 会话内记住 / 持久记住 | 单次确认（推荐） | 不持久信任脆弱 selector。 |
| SELECTOR_LOW_CONFIDENCE 在类型上应是 warning 还是 error？ | warnings 数组（推荐） / 错误码 / 你决定 | warnings 数组（推荐） | Warning 不是失败，不扩张 ErrorCode。 |

---

## Claude's Discretion

- Timeout helper / registry 默认值命名与测试拆分。
- loggedOutPathPatterns 的精确路径匹配约定。
- Low-confidence confirmation UI 的视觉样式、focus 管理和 i18n key 命名。

## Deferred Ideas

None — discussion stayed within phase scope
