# Phase 11: Telegram 适配器 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16T10:00:00+08:00
**Phase:** 11-Telegram 适配器
**Areas discussed:** 消息格式化程度, 消息截断策略, 技术细节委托

---

## 消息格式化程度

| Option | Description | Selected |
|--------|-------------|----------|
| Telegram Markdown 格式化 | 新建 telegram-format.ts，将 CommonMark 转为 Telegram Markdown 语法。与 slack-format.ts 对称。研究员测试 paste 是否支持格式保留。 | |
| 纯文本，不保留格式 | 像 Slack 一样先 strip 所有格式，发送纯文本。最简单可靠。 | |
| 研究员决定 | 交给 researcher 在实际 Telegram Web K 上测试后决定。 | ✓ |

**User's choice:** 研究员决定
**Notes:** 用户选择将格式化程度委托给 researcher 在实际 Telegram Web K 编辑器上测试 paste 行为后决定。

---

## 消息截断策略

| Option | Description | Selected |
|--------|-------------|----------|
| 截断 + 标记 | 与 Slack 类似，超限时截断并追加 "...[truncated]" 标记。 | ✓ |
| 仅发 metadata | 超限时只发送 metadata，不发送正文。 | |
| 智能分配空间 | 先保证 metadata 完整，剩余空间给正文，最后加标记。 | |

**User's choice:** 截断 + 标记
**Notes:** 选择了推荐的截断+标记方案。

### 截断空间分配

| Option | Description | Selected |
|--------|-------------|----------|
| 整体截断，metadata 优先 | 4096 字符是整条消息限制。优先保留 metadata，剩余空间给正文，最后加标记。 | ✓ |
| 只截正文 | metadata 不截断，只有正文部分有剩余空间。简单但如果 metadata 超限会失败。 | |

**User's choice:** 整体截断，metadata 优先
**Notes:** 4096 字符限制覆盖整条消息（prompt + title + url + description + timestamp + content），metadata 优先保留。

---

## 技术细节全权委托

| Option | Description | Selected |
|--------|-------------|----------|
| 技术细节全权委托 | 编辑器选择器、登录检测、发送确认、MAIN world vs ISOLATED 等技术细节交给 researcher + planner。 | ✓ |

**User's choice:** 技术细节全权委托
**Notes:** 用户明确将编辑器选择器、登录检测 DOM 标记、发送确认机制、注入方式等全部技术实现细节委托给 researcher + planner。与 Phase 10 Slack 的讨论模式一致。

---

## Claude's Discretion

- `telegram-format.ts` 的具体格式化语法映射（纯文本 vs Telegram Markdown）— 由 researcher 调研后决定
- Telegram MAIN world injector 的具体实现 — 参考 slack-main-world.ts 模式
- `telegram-login-detect.ts` 的具体 DOM 标记和检测逻辑 — researcher + planner
- ToS 警告文案措辞 — 参考 Discord/Slack 模式
- 4096 字符截断实现细节（截断标记 i18n key、UTF-8 安全截断等）— planner

## Deferred Ideas

None — discussion stayed within phase scope
