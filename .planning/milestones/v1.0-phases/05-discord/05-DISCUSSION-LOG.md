# Phase 5: Discord 适配器 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-05-05
**Phase:** 05-Discord 适配器
**Mode:** discuss (default, interactive)
**Areas discussed:** 消息格式化+截断, Discord 特殊语法 escape, ToS 风险声明呈现

## Area Selection

User selected: all 3 gray areas + "全部讨论"

## Discussion

### 1. 消息格式化 + 截断

**Q1: Discord 消息格式与 2000 字符截断策略？**
- Options: 同 OpenClaw 顺序 + Discord MD / 精简模式 / 智能截断
- **Selected:** 同 OpenClaw 顺序 + Discord MD
- Note: 用户确认保持与 OpenClaw 一致的字段顺序，使用 Discord Markdown 方言

**Q2: 超过 2000 字符时的截断策略？**
- Options: prompt 优先截 content / 硬截断到核心字段 / 等比例截断
- **Selected:** prompt 优先截 content
- User comment: 用户询问 2000 字符限制是否太短、能否多条切分
- Claude response: 2000 是 Discord 服务端硬限制。多条切分复杂度高（循环 compose+send、rate limit 放宽、失败回滚），建议留 v1.x
- **Follow-up selected:** 单条截断（v1），多条切分留 v1.x

### 2. Discord 特殊语法 escape

**Q3: Discord 特殊语法转义范围？**
- Options: 只转 mention / 全量 escape / 不转义
- **Selected:** Mention escape 只转 mention
- Scope: @everyone / @here / <@id> / <#channel> / <@&role>
- Method: 零宽空格插入破坏 pattern

### 3. ToS 风险声明呈现

**Q4: Discord ToS 风险声明在 popup 中怎么呈现？**
- Options: 条件性脚注 / 全平台显示 / 首次确认弹窗
- **Selected:** 条件性脚注
- Behavior: 仅当 send_to 识别为 Discord 时显示，不阻断操作

## Completion

User confirmed ready to generate context after 3 areas discussed.

## Claude's Discretion Items

- Discord textbox 精确 ARIA selector 参数
- 频道锚点精确 DOM selector
- compose Markdown 模板精确格式
- Discord DOM fixture 获取方式
- popup 脚注精确视觉样式
- webNavigation permission 处理
- E2E fixture 形态
