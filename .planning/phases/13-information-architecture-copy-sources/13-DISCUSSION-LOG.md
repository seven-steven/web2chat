# Phase 13: 信息架构与文案事实源 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 13-信息架构与文案事实源
**Areas discussed:** 页面叙事顺序, 能力边界表述, 事实源规则, 内容产物形态

---

## 页面叙事顺序

| Question | Options | Selected |
|----------|---------|----------|
| 页面主叙事优先级怎么锁？ | 价值先行 / 平台先行 / 信任先行 / 你决定 | 价值先行 |
| 首屏应该承载多少信息？ | 紧凑首屏 / 极简首屏 / 全量首屏 / 你决定 | 紧凑首屏 |
| 支持平台列表放在叙事中的哪个位置？ | 中段平台 / Hero 平台 / 后置矩阵 / 你决定 | 中段平台 |
| 隐私与权限说明应如何呈现？ | 独立信任区 / 分散提示 / 底部说明 / 你决定 | 独立信任区 |

**Notes:** 页面先讲核心价值，再用 payload、flow、platform、trust 证明；隐私与权限保持独立 section，便于审计。

---

## 能力边界表述

| Question | Options | Selected |
|----------|---------|----------|
| 平台能力边界怎么呈现，才能既真实又不削弱主卖点？ | Shipped + limits / 完整矩阵 / 只写 shipped / 你决定 | Shipped + limits |
| Telegram 的 live UAT gap 应该如何影响页面文案？ | Shipped 有风险 / 暂不主列 / 正常列出 / 你决定 | Shipped 有风险 |
| Feishu/Lark dropped 状态要不要在宣传页里出现？ | Dropped 说明 / 不提 / Deferred 列表 / 你决定 | Dropped 说明 |
| 权限模型的对外文案应精确到什么程度？ | 生产权限 / 用户简化 / 完整权限表 / 你决定 | 生产权限 |

**Notes:** 主平台列表保持 OpenClaw / Discord / Slack / Telegram；风险放 Known limits；权限 claim 只描述 production config。

---

## 事实源规则

| Question | Options | Selected |
|----------|---------|----------|
| Phase 13 应如何锁定 claim 与事实源的关系？ | Claims matrix / Content config / 规则说明 / 你决定 | Claims matrix |
| 当前支持平台列表的权威来源选哪一个？ | PROJECT 为准 / Listing 为准 / 代码推断 / 你决定 | PROJECT 为准 |
| 隐私与权限 claims 的事实源如何分工？ | 双来源 / Privacy 为主 / Config 为主 / 你决定 | 双来源 |
| 为了 OPS-01/02，维护规则需要细到什么层级？ | 可审计字段 / 轻量字段 / 可执行数据 / 你决定 | 可审计字段 |

**Notes:** Claims matrix 需要支持后续 Phase 16 audit；`STORE-LISTING.md` 可参考风格但当前平台列表可能过旧。

---

## 内容产物形态

| Question | Options | Selected |
|----------|---------|----------|
| Phase 13 的主要产物应是什么形态？ | Planning artifact / Content files / 两者都做 / 你决定 | Planning artifact |
| Phase 13 要锁定到多细的文案层级？ | 文案护栏 / 完整草稿 / 标题要点 / 你决定 | 文案护栏 |
| 截图 / mockup / diagram 的来源状态规则要不要在 Phase 13 锁定？ | 标签规则 / 素材清单 / 不处理 / 你决定 | 标签规则 |
| Phase 13 plan 的验收产物应如何落盘？ | 独立文档 / 只用 CONTEXT / 更新源文件 / 你决定 | 独立文档 |

**Notes:** Phase 13 产出独立 planning document，而不是 runtime content files；最终页面 copy 留给 Phase 15。

---

## Claude's Discretion

- 具体 section 标题、exact copy、visual hierarchy、CTA label、claims matrix 文件名由 research/planning 阶段裁定。

## Deferred Ideas

None.
