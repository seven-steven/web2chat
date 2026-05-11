# Phase 10: Slack 适配器 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11T15:50:00+08:00
**Phase:** 10-Slack 适配器
**Areas discussed:** 消息格式化, ToS / 安全声明, URL 匹配范围, 编辑器注入 + 发送确认细节

---

## 消息格式化

### 格式化策略

| Option | Description | Selected |
|--------|-------------|----------|
| Slack mrkdwn 专用格式化 | 新建 slack-format.ts，针对 mrkdwn 做格式化（bold 用 *、无 blockquote、escape <>& 等） | ✓ |
| 复用通用 markdown | 用通用 markdown（与 Discord 相同），Slack 对 ** 和 > 的渲染可能不理想 | |
| 纯文本无格式 | 不做任何格式化，直接拼接原文 | |

**User's choice:** Slack mrkdwn 专用格式化

### 字符截断

| Option | Description | Selected |
|--------|-------------|----------|
| 不做 truncation | Slack 40K 限制足够，通常不会触发 | ✓ |
| 复用 Discord truncation 模式 | 保持一致的 truncation 逻辑 | |
| 交给 planner 判断 | Planner 自行决定 | |

**User's choice:** 不做 truncation（40K 足够）

### Mention escape

| Option | Description | Selected |
|--------|-------------|----------|
| Slack mention escape | escape <!everyone> / <@U123> 等 Slack mention 格式 | ✓ |
| 不需要 escape | 用户输入已过 DOMPurify | |

**User's choice:** Slack mention escape

### 字段排列

| Option | Description | Selected |
|--------|-------------|----------|
| 相同结构 + mrkdwn 语法 | 与 Discord 相同字段排列和逻辑，只替换 markdown 语法 | ✓ |
| 重新设计布局 | 根据 Slack 显示特性重新设计 | |

**User's choice:** 相同结构 + mrkdwn 语法

---

## ToS / 安全声明

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 Discord ToS 模式 | popup 显示 slack_tos_warning，i18n key 如 Discord | ✓ |
| 不显示 ToS 警告 | Slack ToS 策略可能不同 | |
| 先调研再决定 | Researcher 先调研 Slack ToS 政策 | |

**User's choice:** 复用 Discord ToS 模式

---

## URL 匹配范围

### v1 范围

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 Channel | 只匹配 /client/<ws>/<ch>，DM/thread 后续扩展 | ✓ |
| Channel + DM | 同时覆盖 DM URL | |
| 先调研再决定 | Researcher 确认 URL 结构 | |

**User's choice:** 仅 Channel

### 匹配精确度

| Option | Description | Selected |
|--------|-------------|----------|
| 精确 4 段路径匹配 | 验证 URL 结构有效性，至少 4 段 | ✓ |
| 宽松前缀匹配 | 只要以 /client/ 开头即可 | |

**User's choice:** 精确 4 段路径匹配

---

## 编辑器注入 + 发送确认细节

### MAIN world 注入

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 MAIN world paste 模式 | Slack Quill 需要 MAIN world ClipboardEvent（与 Discord Slate 相同原因） | ✓ |
| Researcher 先验证 | 先验证 ISOLATED world 是否可行 | |

**User's choice:** 复用 MAIN world paste 模式

### 发送确认

| Option | Description | Selected |
|--------|-------------|----------|
| 编辑器清空确认 | 复用 Discord 模式 | |
| MutationObserver 新消息节点 | 监听新消息节点出现 | |
| Researcher 调研后决定 | 先验证 Slack 发送后 DOM 行为 | ✓ |

**User's choice:** Researcher 调研后决定

### 登录检测

| Option | Description | Selected |
|--------|-------------|----------|
| 复用分层登录检测模式 | URL 路径 + DOM probe（Discord 模式） | |
| 仅 URL 层检测 | 只用 loggedOutPathPatterns | |
| Researcher 调研后决定 | 先调研 Slack 登录行为 | ✓ |

**User's choice:** Researcher 调研后决定

---

## Claude's Discretion

- `slack-format.ts` 的具体 mrkdwn 语法映射（blockquote 等价形式、link 格式、code block）
- `escapeSlackMentions()` 的具体 escape 手法
- Slack MAIN world injector 的具体实现
- `slack-login-detect.ts` 的 DOM 标记和检测逻辑
- ToS 警告文案的具体措辞

## Deferred Ideas

- **DM 投递** — Slack DM URL 不在 v1 范围，未来扩展
- **Thread view 投递** — URL 行为复杂，推后
- **Slack Block Kit 格式化** — 更丰富的消息布局，未来优化
