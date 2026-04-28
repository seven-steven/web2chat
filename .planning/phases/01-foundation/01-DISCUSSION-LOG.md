# Phase 1: 扩展骨架 (Foundation) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 1-扩展骨架 (Foundation)
**Areas discussed:** Storage schema 落多深、类型化消息协议形态、Hello-world 演示形态、样式栈 + CI baseline

---

## 1. Storage schema 一次落多深

### Q1.1 — Phase 1 落多少 storage items?

| Option | Description | Selected |
|--------|-------------|----------|
| A. 极简 (只落 meta) | 只落 `meta.schemaVersion` (+ 可选 locale)；其它 9 个 items 到使用的 phase 再加；migration 留骨架 + v0→v1 noop | ✓ |
| B. 核心三件套 | Phase 1 落 meta + sendToHistory[] + promptHistory[] 的 zod 形态；含 v0→v1 空 migration | |
| C. 完整 v1 schema | typed 全部 9 个 items + 实质 v0→v1 migration；后续 phase 不碰 storage 层 | |

**User's choice:** A
**Notes:** 符合 simplicity first；现在没真实使用场景的 shape 容易错；后续 phase 自行追加。

### Q1.2 — meta item 包含哪些字段?

| Option | Description | Selected |
|--------|-------------|----------|
| A. 仅 schemaVersion | `meta = { schemaVersion: 1 }`；最纯，locale 留 Phase 6 | ✓ |
| B. + locale | `meta = { schemaVersion, locale: 'zh_CN' \| 'en' }`；让 hello-world demo 可读用，Phase 1 只读不写 | |
| C. + installedAt + lastOpenedAt | 多几个常用探针字段，Phase 7 PRIVACY.md 可能要靠这些说明识别设备 | |
| D. You decide | Claude 在 plan 阶段选 | |

**User's choice:** A
**Notes:** I18N-02 留 Phase 6；Phase 1 popup 走 @wxt-dev/i18n 跟随浏览器语言机制即可。

### Q1.3 — popup / SW 怎么调 storage?

| Option | Description | Selected |
|--------|-------------|----------|
| A. 薄包装 (defineItem 原生 API) | 直接 import metaItem，调用 `metaItem.getValue()` / `setValue()` | |
| B. 业务 namespace 包装 | `repo.meta.get/set/subscribe`；后续可加 `repo.history.add` | |
| C. You decide (Phase 1 默 A，后续再评) | Claude 决定，默认薄包装 | ✓ |

**User's choice:** C
**Notes:** Phase 1 只有 metaItem，不需要包装。Phase 3 加 history 时再评估是否包装。

### Q1.4 — migration framework Phase 1 走多远?

| Option | Description | Selected |
|--------|-------------|----------|
| A. 骨架就位 + v0→v1 noop | `shared/storage/migrate.ts` 定义 registry；注册 v0→v1: () => ({ schemaVersion: 1 }) | ✓ |
| B. 仅预留字段 | 只定义 schemaVersion；不写 migrate.ts；后续 phase 加迁移时再加 | |
| C. 骨架 + v1→v2 场景示例测试 | 携带空 v0→v1 + 假设 v1→v2 示例 + 测试；过重 | |

**User's choice:** A
**Notes:** 结构真实、逻辑轻；FND-04 "预留 migration 钩子" 实质走通。

---

## 2. 类型化消息协议形态

### Q2.1 — popup ↔ SW 的 RPC 用哪种底层?

| Option | Description | Selected |
|--------|-------------|----------|
| A. 单 envelope + discriminated union | `{ kind, payload }` zod discriminated union；总 listener 内 switch | |
| B. 自实现路由表 + request<TIn,TOut>() | 路由表 Record<R, Handler> + 自己写 ~80 行包装 | |
| C. @webext-core/messaging | WXT 官方文档推荐；defineExtensionMessaging<TProtocolMap>() 开箱即用 | ✓ |
| D. You decide | Claude 选 | |

**User's choice:** C
**Notes:** 减少自研代码，类型推断由库提供。zod 校验在 handler 入口手写。

### Q2.2 — 跨上下文 RPC 的错误怎么报?

| Option | Description | Selected |
|--------|-------------|----------|
| E1. 全 throw | client try/catch | |
| E2. 全 Result<T,E> | 永不抛；popup 统一 if (!result.ok) 处理 | |
| E3. 混合 | 业务错走 Result，程序错抛 throw；popup 主路径处理 Result，外层有 try/catch 兜程序错 | ✓ |
| F. 延后到 Phase 3 | 等真正有业务错时再定 | |

**User's choice:** E3
**Notes:** Phase 1 ErrorCode 只有 INTERNAL；后续 phase 各自扩枚举（DSP-07 / ADO-05 / ADD-06）。

### Q2.3 — RPC protocol 归哪?

| Option | Description | Selected |
|--------|-------------|----------|
| A. 单文件总表 + 双向 parse | `shared/messaging/protocol.ts` 一张 ProtocolMap；handler 入参 + popup 出参都跑 zod parse | |
| B. 按 feature 分文件 | `routes/meta.ts` / `capture.ts` / `dispatch.ts` ...；适合路由多了之后 | |
| C. Phase 1 走 A，Phase 3 拆分 | 路由超 5 条时拆分；迁移代价小 | ✓ |

**User's choice:** C
**Notes:** Phase 1 只 1 条路由，单文件最直观；Phase 3 路由数量爆发时拆分。

---

## 3. Hello-world 演示形态

### Q3.1 — popup 演示什么?

| Option | Description | Selected |
|--------|-------------|----------|
| A. 读 schema version | 只读路径；popup 显示 "schema v1, locale=zh_CN" | |
| B. 读写 helloCount | popup 每次打开 `meta.bumpHello`，counter +1；杀 SW 后再点仍递增 = 最硬存活证据 | ✓ |
| C. 读 manifest version + schema version | 仅读，演示 SW 可访问 chrome.runtime API | |
| D. You decide | Claude 选 | |

**User's choice:** B
**Notes:** 满足成功标准 #3 (popup ↔ SW ↔ storage 端到端) + #4 (SW 重启韧性) 的最强形态；helloCount 落 meta 内，Phase 2 删除即可。

### Q3.2 — helloCount 落 local 还是 session storage?

| Option | Description | Selected |
|--------|-------------|----------|
| A. chrome.storage.local | 跨 SW 重启 + 浏览器重启都存活；与 STG-01 user data 一致 | ✓ |
| B. chrome.storage.session | 仅跨 SW 重启；浏览器重启清零；演示 session vs local 差异 | |
| C. You decide | Claude 决定，默认 A | |

**User's choice:** A

### Q3.3 — popup 打开时自动 bump，还是加个按钮?

| Option | Description | Selected |
|--------|-------------|----------|
| A. popup 打开即 bump | popup mount 后立即发 RPC bump；点击 action = mount = +1，与成功标准 #4 自然契合 | ✓ |
| B. popup 打开读 + 按钮手动 bump | 读/写在 UI 上可区分；但需要多一次用户动作才能验证存活 | |
| C. You decide | 默 A | |

**User's choice:** A

---

## 4. 样式栈 + CI baseline

### Q4.1 — popup 样式怎么走?

| Option | Description | Selected |
|--------|-------------|----------|
| A. Tailwind v4 from day 1 | 跟 STACK.md 推荐；接受集成偶发问题需排坑 | ✓ |
| B. CSS modules 起步，Phase 3 再评 | 零集成风险；Phase 3 popup 表单复杂时再切 | |
| C. 先试 Tailwind v4，30 min 不通就回退 | 带兜底的 A | |
| D. You decide (默 B) | Claude 选 | |

**User's choice:** A
**Notes:** 主动忽略 STACK.md 的 "v4 不通则回退" 兜底；若集成失败按执行期 deviation 处理。

### Q4.2 — Phase 1 接多多 CI?

| Option | Description | Selected |
|--------|-------------|----------|
| A. GitHub Actions 全集 from Phase 1 | 含 Playwright in CI（headless + load-extension），调通有摩擦 | |
| B. CI 跑 lint+typecheck+vitest+manifest，Playwright 留 Phase 4 | Phase 1 接 GitHub Actions，但 e2e 留到首个适配器落地 | ✓ |
| C. 本地 + Husky，CI 留 Phase 7 | 不接 GitHub Actions；package.json scripts + pre-commit | |
| D. You decide (默 B) | Claude 选 | |

**User's choice:** B
**Notes:** 守护类型 + 单元 + manifest 校验；e2e 在 Phase 4 真正有 fixture 时再接 CI。

### Q4.3 — pre-commit + ESLint 配套?

| Option | Description | Selected |
|--------|-------------|----------|
| A. Husky + lint-staged + 轻量 i18n 规则 | pre-commit 跑 typecheck + ESLint（含 JSX 裸字符串 literal 拦截）+ prettier --write | ✓ |
| B. 不上 Husky，仅 CI | 依赖开发者本地 pnpm lint 自律 | |
| C. You decide (默 A) | Claude 选 | |

**User's choice:** A
**Notes:** 完整版 I18N-03 hardcoded-string detector 留 Phase 6；Phase 1 只上"JSX text node 不能是裸字符串"这一条轻量规则。

---

## Claude's Discretion

讨论中明确委托给 plan 阶段的项：

- **typed repo API 形态**（Q1.3 → C）：Phase 1 默薄包装，Phase 3 加 history 时再评估是否包装
- **manifest entrypoint 命名 / 目录布局**：跟随 WXT 默认 `entrypoints/` 约定
- **i18n message key 命名约定**：dot-notation 风格（`popup.hello`），具体 key 名称由 plan 决定

## Deferred Ideas

按目标 phase 分组（详见 CONTEXT.md `<deferred>`）：

- **Phase 2**: `articleSnapshotDraft`
- **Phase 3**: `sendToHistory` / `promptHistory` / `bindings` / `dispatchDraft` / `dispatchSession` items；`dispatch.*` / `history.*` / `binding.*` RPC 路由；`messaging/routes/*.ts` 拆分；typed-repo 业务包装评估
- **Phase 4**: `grantedOrigins` item；`permissions.requestOrigin` RPC；Playwright e2e 接入 CI
- **Phase 6**: `meta.locale` + 运行时 locale 切换；完整 hardcoded-string detector；locale 覆盖率 CI 检查
- **Phase 7**: zip / release artifact；PRIVACY.md

### 已驳回的方案（仅记录）

- "Tailwind v4 集成不通就回退 CSS modules" — 由 D-10 主动忽略
- "popup 提供 Say hello 按钮" — 选了 popup mount 自动 bump
