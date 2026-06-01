# Phase 12: 飞书/Lark 适配器 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16T16:00:00+08:00
**Phase:** 12-飞书/Lark 适配器
**Areas discussed:** 品牌与图标策略, host_permissions 双域名, 消息格式化与截断

---

## 品牌与图标策略

| Option | Description | Selected |
|--------|-------------|----------|
| 统一用飞书 logo | zh_CN/en 都显示 Feishu，蓝色飞书 logo | |
| 统一用 Feishu 名称 | 两个语言环境都显示 Feishu，简单但不反映 Lark 国际品牌 | |
| 按域名区分品牌 | zh_CN "飞书" / en "Lark"，Lark logo | ✓ |

**User's choice:** 按域名区分品牌
**Notes:** 反映飞书官方品牌策略：国内飞书、海外 Lark。

### 图标选择

| Option | Description | Selected |
|--------|-------------|----------|
| 飞书蓝色 logo | 与 platformId "feishu" 一致，统一的品牌符号 | ✓ |
| Lark 绿色 logo | 与英文环境 "Lark" 名称匹配 | |

**User's choice:** 飞书蓝色 logo
**Notes:** 飞书和 Lark 共享同一个小鸟品牌符号，使用蓝色飞书版本与 platformId 一致。

---

## host_permissions 双域名

| Option | Description | Selected |
|--------|-------------|----------|
| 两个都静态声明 | feishu.cn + larksuite.com 都在 manifest 静态声明，与 Discord/Slack/Telegram 一致 | ✓ |
| 飞书静态 + Lark 动态 | 飞书静态，Lark 走 optional 动态授权 | |

**User's choice:** 两个都静态声明
**Notes:** 保持与现有适配器模式完全一致。

### 子域名范围

| Option | Description | Selected |
|--------|-------------|----------|
| 裸域名匹配 | `https://feishu.cn/*` + `https://larksuite.com/*` | |
| 通配子域名 | `https://*.feishu.cn/*` + `https://*.larksuite.com/*` | ✓ |

**User's choice:** 通配子域名
**Notes:** 覆盖所有子域名，确保无论飞书 Web 聊天在哪个子域名上权限都充足。具体 URL 结构由 researcher 验证。

---

## 消息格式化与截断

### 格式化方向

| Option | Description | Selected |
|--------|-------------|----------|
| 跟随模式 | 新建 feishu-format.ts，字段排列一致，具体语法由 researcher 决定 | ✓ |
| 保守纯文本 | 如果 paste 不支持格式，直接纯文本 | |

**User's choice:** 跟随模式
**Notes:** 新建 `feishu-format.ts`，与 `telegram-format.ts` / `slack-format.ts` 结构对称。

### 截断策略

| Option | Description | Selected |
|--------|-------------|----------|
| 默认不截断 | 类似 Slack 模式，如果有限制再实现 | |
| 预防性截断 | 像 Telegram 一样默认实现 metadata 优先截断 | |
| Researcher 决定 | 交给 researcher 调研飞书消息长度限制后决定 | ✓ |

**User's choice:** Researcher 决定
**Notes:** 截断策略与飞书实际消息长度限制挂钩，由 researcher 调研后决定。

---

## Claude's Discretion

- `feishu-format.ts` 的具体格式化语法映射
- 飞书 MAIN world injector 的具体实现
- `feishu-login-detect.ts` 的具体 DOM 标记和检测逻辑
- ToS 警告文案的具体措辞
- `hostMatches` 的精确 glob 模式
- `spaNavigationHosts` 的精确 hostname 列表
- `loggedOutPathPatterns` 的具体路径

## Deferred Ideas

None — discussion stayed within phase scope
