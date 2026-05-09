# Phase 8: 架构泛化 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09T14:54:24.969Z
**Phase:** 8-架构泛化
**Areas discussed:** PlatformId 边界, MAIN 桥接契约, SPA filter 来源, ErrorCode 命名空间

---

## PlatformId 边界

### `mock` 平台处理

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 mock（推荐） | 保留现有 E2E/单元测试路径，避免引入 test-only registry；生产里只是 localhost fixture，影响可控。 | ✓ |
| mock 测试化 | 生产 registry 只含真实平台，测试用独立 registry；更干净，但 Phase 8 会扩大测试重构面。 | |
| 你决定 | 下游 planner 按最小改动决定；默认倾向保留现状并只加强类型边界。 | |

**User's choice:** 保留 mock（推荐）
**Notes:** `mock` 继续作为 registry 平台保留。

### storage `platform_id` 类型

| Option | Description | Selected |
|--------|-------------|----------|
| 存 raw string（推荐） | `DispatchRecord.platform_id` 继续是 `string`，读出时用 registry 校验；避免 storage schema migration，也兼容未来平台。 | |
| 存 branded | `DispatchRecord.platform_id: PlatformId`；类型更强，但持久化数据本质仍不可信，测试和迁移更重。 | ✓ |
| 你决定 | 让 planner 按实际影响决定；默认保护现有 storage 不迁移。 | |

**User's choice:** 存 branded
**Notes:** storage/session 中 `platform_id` 也使用 branded `PlatformId`。

### branded 值来源

| Option | Description | Selected |
|--------|-------------|----------|
| registry 构造（推荐） | 新增 `definePlatformId()` / `defineAdapter()`，registry entry 创建时产出 branded id；storage 只写从 registry 得到的 id。 | ✓ |
| 集中 cast | 任何字符串通过 `toPlatformId()` cast 成 brand；代码短，但 brand 容易失去实际约束。 | |
| 运行时校验 | 用 Zod/运行时 validator 确认字符串当前存在于 registry 后再 brand；更严，但调用点更多。 | |

**User's choice:** registry 构造（推荐）
**Notes:** 避免 raw casts 分散到调用点。

### 平台展示 metadata

| Option | Description | Selected |
|--------|-------------|----------|
| registry 承载（推荐） | `AdapterRegistryEntry` 继续承载 `iconKey`，并增加/保留 UI 可消费 metadata；新平台少改 popup switch，降低合并冲突。 | ✓ |
| UI 单独映射 | registry 只做 dispatch/URL；popup 的 icon/label 单独 mapping。边界清晰，但新增平台仍要改 UI 文件。 | |
| 你决定 | 让 planner 以现有 `iconKey` 最小演进为准。 | |

**User's choice:** registry 承载（推荐）
**Notes:** registry 是平台 metadata 的单一来源。

---

## MAIN 桥接契约

### Injector 粒度

| Option | Description | Selected |
|--------|-------------|----------|
| per-adapter（推荐） | 每个 adapter 提供自包含 `mainWorldInjector`，registry 负责路由；最大隔离，符合 ARCH-02，但会有少量重复。 | ✓ |
| 通用 injector | 抽一个通用 paste/enter MAIN injector，adapter 只给 selector 和动作参数；复用高，但容易被 Slack/Telegram 差异拖复杂。 | |
| 延后泛化 | Phase 8 只抽 port 路由，保留 Discord injector，等 Slack 再泛化；改动最小但后续仍要再动 SW。 | |

**User's choice:** per-adapter（推荐）
**Notes:** 避免用通用 DSL 提前抽象不同编辑器行为。

### Injector 挂载位置

| Option | Description | Selected |
|--------|-------------|----------|
| registry 挂载（推荐） | `AdapterRegistryEntry` 可选挂 `mainWorldInjector`/bridge metadata；新增平台只改 registry + adapter 文件，最符合 Phase 8 目标。 | ✓ |
| 背景层映射 | 单独 `background/main-world-injectors.ts` 按 PlatformId 映射；popup bundle 更干净，但新增平台多改一个背景层文件。 | |
| content 自带 | registry 只放 port prefix，injector 由 adapter content script 自带；SW 只按 prefix 反调 executeScript。 | |

**User's choice:** registry 挂载（推荐）
**Notes:** 新平台不应改 SW/pipeline 平台分支。

### Port 命名

| Option | Description | Selected |
|--------|-------------|----------|
| 前缀+id（推荐） | 统一 `WEB2CHAT_MAIN_WORLD:<platformId>`；SW 解析 id 后查 registry injector，路由规则简单且可测试。 | ✓ |
| entry 全名 | 每个 registry entry 声明完整 `portName`；最灵活，但命名规范更分散。 | |
| 单 port | 所有平台共用一个 port，payload 里带 platformId；更少常量，但更依赖消息体校验。 | |

**User's choice:** 前缀+id（推荐）
**Notes:** Port 格式锁定为 `WEB2CHAT_MAIN_WORLD:<platformId>`。

### Payload 形态

| Option | Description | Selected |
|--------|-------------|----------|
| 只传 text（推荐） | bridge 只接收 `{ text }`；selector、paste、Enter/按钮点击都封装在平台 injector 内，接口稳定、payload 最小。 | ✓ |
| per-adapter payload | 每个 adapter 定义自己的 payload schema；更灵活，但 Phase 8 需要更多校验/类型 plumbing。 | |
| 命令协议 | 定义 command 协议（paste、enter、clear 等）；复用强，但对当前目标过重。 | |

**User's choice:** 只传 text（推荐）
**Notes:** Bridge payload 固定为 `{ text }`。

---

## SPA filter 来源

### Opt-in 来源

| Option | Description | Selected |
|--------|-------------|----------|
| 显式 opt-in（推荐） | `AdapterRegistryEntry` 增加显式 `spaHostPatterns`/`spaNavigation` 字段；只有需要 SPA 监听的平台 opt-in，避免误监听。 | ✓ |
| hostMatches 推导 | 直接从 `hostMatches` 推导 filter；字段少，但 OpenClaw 空 hostMatches、未来动态权限平台会有歧义。 | |
| callback 过滤 | 所有 registry 平台都监听再在 callback 里判断；实现简单，但唤醒范围更宽，不利 MV3。 | |

**User's choice:** 显式 opt-in（推荐）
**Notes:** 不从 host permissions 自动推导 SPA 监听。

### 字段形态

| Option | Description | Selected |
|--------|-------------|----------|
| hosts 字段（推荐） | registry 填 `spaNavigationHosts: ['discord.com']`；builder 统一生成 `hostEquals` + `.hostSuffix`，避免裸 suffix 误匹配。 | ✓ |
| 原生 filter | registry 直接填 Chrome `events.UrlFilter[]`；最灵活，但把 Chrome API 细节泄漏进 shared registry。 | |
| 解析 glob | 复用 `hostMatches` glob 并解析 host；字段少，但动态权限/空数组平台不好表达。 | |

**User's choice:** hosts 字段（推荐）
**Notes:** 使用 host 列表字段，不直接暴露 Chrome UrlFilter。

### 子域匹配

| Option | Description | Selected |
|--------|-------------|----------|
| 精确 host（推荐） | 默认 exact host；需要子域时显式声明。Slack/Telegram/Discord 都可窄到具体 host，权限/唤醒面最小。 | ✓ |
| 含子域 | 每个 host 自动包含所有子域；对多租户平台方便，但更宽。 | |
| 显式开关 | 字段支持 `{ host, includeSubdomains }`；更啰嗦，但最清楚。 | |

**User's choice:** 精确 host（推荐）
**Notes:** 默认不自动包含子域。

### Handler 入口

| Option | Description | Selected |
|--------|-------------|----------|
| 复用入口（推荐） | 保留 `onTabComplete` 作为推进入口；SPA listener 只做 main-frame/URL guard 后转发，状态机路径一致。 | |
| 专用 handler | 新增 `onSpaNavigation` 专用 handler；语义清晰，但会多一条状态推进路径。 | ✓ |
| pipeline setup | 把 listener 注册和 handler 都封装进 dispatch-pipeline；background 只调用一个 setup 函数，但要小心 SW 顶层同步注册。 | |

**User's choice:** 专用 handler
**Notes:** SPA history update 和普通 tab complete 语义分开；可共享底层 helper。

---

## ErrorCode 命名空间

### Namespace 模型

| Option | Description | Selected |
|--------|-------------|----------|
| 混合模型（推荐） | 保留 `NOT_LOGGED_IN`/`TIMEOUT`/`INPUT_NOT_FOUND` 等通用码；只有平台特有原因用 `PLATFORM_*`。UI 复用最多。 | ✓ |
| 全平台前缀 | 所有错误都带平台前缀，如 `DISCORD_NOT_LOGGED_IN`；来源清晰，但 ErrorBanner/i18n 键会膨胀。 | |
| code+namespace | code 保持通用，另加 `platformId`/`namespace` 字段；类型更结构化，但协议改动更大。 | |

**User's choice:** 混合模型（推荐）
**Notes:** 通用语义码保留，平台码只表达真正平台特有原因。

### 前缀落点

| Option | Description | Selected |
|--------|-------------|----------|
| 类型分组（推荐） | 定义 `CommonErrorCode` / `OpenClawErrorCode` 等 type namespace，但保留现有字符串值（`TIMEOUT` 等），避免大范围 UI/test 迁移。 | ✓ |
| COMMON 前缀 | 把通用码也改成 `COMMON_TIMEOUT` / `COMMON_NOT_LOGGED_IN`；最符合“前缀”字面含义，但改动面最大。 | |
| 新码前缀 | 旧码不动，新码才用前缀；迁移少，但长期不一致。 | |

**User's choice:** 类型分组（推荐）
**Notes:** 不把现有字符串值迁移到 `COMMON_*`。

### 平台专属码新增规则

| Option | Description | Selected |
|--------|-------------|----------|
| 严格新增（推荐） | 只有无法用通用码表达、且 UI/重试语义不同的错误才新增平台码；如 `OPENCLAW_PERMISSION_DENIED`。 | ✓ |
| 平台自由扩展 | 每个平台可按自身 DOM/登录/发送失败细分错误；诊断丰富，但 UI/i18n 增长快。 | |
| 只用通用码 | 所有 adapter 只能返回通用码；平台差异放 message。最简单，但用户提示不够精确。 | |

**User's choice:** 严格新增（推荐）
**Notes:** 控制 ErrorCode 膨胀。

### 类型与运行时校验组织

| Option | Description | Selected |
|--------|-------------|----------|
| 分组常量（推荐） | 按 namespace 导出 `commonErrorCodes`/`openclawErrorCodes`，用 `satisfies` 组成 `ErrorCode`；同时提供 `isErrorCode`。 | |
| 单 union | 继续维护单个 `ErrorCode` union；改动少，但无法体现命名空间结构。 | |
| registry 聚合 | 从 registry/adapter 声明的 errors 聚合生成；扩展性强，但 Phase 8 复杂度偏高。 | ✓ |

**User's choice:** registry 聚合
**Notes:** 需要 planner 设计无循环依赖的 registry/adapter errors 聚合方式。

---

## Claude's Discretion

- Helper、字段、handler 的精确命名交给 planner。
- MAIN injector 挂 registry 时如何控制 popup bundle 体积交给 planner。
- ErrorCode registry 聚合的具体类型技巧交给 planner，前提是保持可读、可测试。

## Deferred Ideas

None — discussion stayed within phase scope
