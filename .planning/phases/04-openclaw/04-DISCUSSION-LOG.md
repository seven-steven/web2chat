# Phase 4: OpenClaw 适配器 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-05-01
**Phase:** 04-OpenClaw 适配器
**Mode:** discuss (default, interactive)
**Areas discussed:** 消息格式化, 权限授权 UX, DOM 注入策略, canDispatch 探针

## Discussion

### 消息格式化

| Question | Options | User Selection |
|----------|---------|----------------|
| compose() 写入消息怎么排列？ | Prompt 在前 + Markdown / Snapshot 在前 + Markdown / 纯文本拼接 / You decide | **Prompt 在前 + Markdown** |
| OpenClaw 无字符限制，是否截断？ | 不截断（推荐） / 32KB 全局安全网 | **不截断** |
| compose Markdown 包含哪些 snapshot 字段？ | 4 字段 (无 create_at)（推荐） / 全部 5 字段 / You decide | **全部 5 字段，内容为空时省略** |

### 权限授权 UX

| Question | Options | User Selection |
|----------|---------|----------------|
| 何时触发 chrome.permissions.request？ | Confirm 时授权（推荐） / 输入时立即授权 / Options page 预配置 | **Confirm 时授权** |
| 用户拒绝授权后 popup 怎么表现？ | ErrorBanner + 重新授权按钮 / 复用 ErrorBanner 错误三态 | **ErrorBanner + 重新授权按钮** |
| dispatch 前的权限检查在哪个层？ | dispatch-pipeline 检查（推荐） / popup 端检查 | **dispatch-pipeline 检查** |
| 已授权 origin 如何持久化？ | 独立 grantedOrigins item（推荐） / 实时查询 chrome.permissions.contains | **独立 grantedOrigins item** |
| Options page 的已授权 origin 管理？ | 简单列表 + 移除（推荐） / 推迟到后续 phase | **简单列表 + 移除** |

### DOM 注入策略

| Question | Options | User Selection |
|----------|---------|----------------|
| textarea 用什么选择器策略？ | CSS selector 优先（推荐） / ARIA 属性优先 / You decide | **CSS selector 优先** |
| shared/dom-injector.ts 的 API 形态？ | 通用 setInputValue helper（推荐） / Adapter 内写死 | **通用 setInputValue helper** |
| compose 后怎么触发发送？ | Enter keydown（推荐） / Click 发送按钮 / You decide | **Enter keydown** |
| send() 后怎么确认消息已上屏？ | MutationObserver（推荐） / 固定延迟 / You decide | **MutationObserver** |
| waitForReady 在哪里实现，超时多久？ | Adapter 内 5s 超时（推荐） / Pipeline 固定延迟 | **Adapter 内 5s 超时** |

### canDispatch 探针

| Question | Options | User Selection |
|----------|---------|----------------|
| canDispatch 探针谁来执行？ | Adapter 内部 (content script) / Pipeline 端 fetch 探测 / You decide | **Adapter 内部 (content script)** |
| 'OpenClaw 未运行' 怎么检测？ | Adapter 检查 DOM 就已足够（推荐） / Pipeline 端 fetch 探测 | **Adapter 检查 DOM 就已足够** |

## Deferred Ideas

None — discussion stayed within phase scope.

## Claude's Discretion Items

- OpenClaw textarea 的精确 CSS selector（研究阶段确定）
- compose Markdown 模板的精确格式（heading level / 分隔符）
- OPENCLAW_OFFLINE vs INPUT_NOT_FOUND 的 DOM 特征区分条件
- grantedOrigins storage schema version bump
- options page 已授权 Origin 区块的视觉布局
- E2E fixture 形态（stub HTML vs 真实 OpenClaw 服务）
