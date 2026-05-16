# Phase 12: 飞书/Lark 适配器 - Research

**Researched:** 2026-05-16
**Domain:** 飞书/Lark Web Messenger DOM 注入适配器
**Confidence:** MEDIUM

## Summary

Phase 12 为 web2chat 添加飞书/Lark 适配器，这是项目的第一个**双域名单适配器**场景。飞书（国内版 feishu.cn）和 Lark（国际版 larksuite.com）共用一个 registry entry（platformId `feishu`），通过一个 match 函数同时匹配两个域名。

核心研究发现：飞书/Lark Web 聊天使用路径模式 `{tenant}.feishu.cn/next/messenger` 或 `www.larksuite.com/next/messenger`，这是基于企业租户子域名 + `/next/messenger` 路径的结构。编辑器使用 L1 级别的数据驱动 contenteditable 编辑器（类 Slate/ProseMirror 架构），需要 MAIN world ClipboardEvent paste 注入。消息没有严格字符限制（文本消息 150KB），不需要截断逻辑。

**Primary recommendation:** 复用 Telegram/Slack 的 MAIN world paste + contenteditable 模式。由于飞书 Web 聊天的内部 DOM 结构没有公开文档且会随版本更新变化，选择器和登录检测需要在实际飞书 Web 页面上通过 DevTools 验证后再固化为 fixture HTML。format 模块使用纯文本格式（飞书 paste 不保留 Markdown 格式标记），不做截断。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-154:** 品牌区分 — zh_CN 显示"飞书"，en 显示"Lark"
- **D-155:** 平台图标使用飞书蓝色 logo（小鸟品牌符号）
- **D-156:** feishu.cn 和 larksuite.com 都加入静态 host_permissions
- **D-157:** 使用通配子域名模式：`https://*.feishu.cn/*` + `https://*.larksuite.com/*`
- **D-158:** 新建 `feishu-format.ts`，字段排列与 Discord/Slack/Telegram 保持相同结构
- **D-159:** 格式化程度和截断策略由 researcher 决定（本 research 结论：纯文本，不截断）
- **D-160:** 复用 ToS 警告模式，新增 `feishu_tos_warning` / `feishu_tos_details` i18n key
- **D-161:** 编辑器注入方式由 researcher 决定（本 research 结论：MAIN world ClipboardEvent paste）
- **D-162:** 发送确认策略由 researcher 决定（本 research 结论：编辑器清空确认）
- **D-163:** 登录检测策略由 researcher 决定（本 research 结论：URL 层 + DOM 层分层防护）
- **D-164:** 编辑器选择器采用 ARIA-first 三层 fallback

### Claude's Discretion
- `feishu-format.ts` 的具体格式化语法映射
- MAIN world injector 的具体实现（选择器、pre-paste cleanup、post-send cleanup）
- `feishu-login-detect.ts` 的具体 DOM 标记和检测逻辑
- ToS 警告文案的具体措辞
- `hostMatches` 条目的精确 glob 模式
- `spaNavigationHosts` 的精确 hostname 列表
- `loggedOutPathPatterns` 的具体路径

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FSL-01 | 双域名匹配（feishu.cn + larksuite.com），统一 platformId `feishu` | URL 结构研究：`{tenant}.feishu.cn/next/messenger` 和 `www.larksuite.com/next/messenger`；match 函数匹配两个域名 |
| FSL-02 | 登录墙检测（URL 层 + DOM 层），`waitForReady` 竞速登录探测 | 登录页面研究：passport.feishu.cn 跳转、`/accounts/page/login` 路径、DOM 表单标记 |
| FSL-03 | contenteditable 编辑器 DOM 注入 — ClipboardEvent paste 或 property-descriptor setter | 编辑器研究：L1 数据驱动 contenteditable，推荐 MAIN world ClipboardEvent paste |
| FSL-04 | 消息发送确认 — Enter 或发送按钮触发后 MutationObserver 等待新消息节点 | 发送确认研究：推荐编辑器清空确认（与 Telegram 模式一致） |
| FSL-05 | 平台图标 + `platform_icon_feishu` i18n key（en: Lark, zh_CN: 飞书） | 品牌策略已锁定（D-154），图标使用蓝色飞书 logo |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| URL 匹配（双域名） | Browser / Client | — | match 函数在 popup 和 SW 中执行，纯 URL 解析 |
| 登录检测 | Browser / Client | Frontend Server (SSR) | DOM 层检测在 content script 中；URL 层在 SW dispatch-pipeline |
| 编辑器注入 | Browser / Client (MAIN world) | — | ClipboardEvent paste 必须在 MAIN world 执行 |
| 消息格式化 | Browser / Client | — | Pure function，无 chrome.* 依赖 |
| 发送确认 | Browser / Client | — | 编辑器清空轮询在 content script 中 |
| 权限管理 | API / Backend (SW) | — | host_permissions 在 manifest 中声明 |

## Standard Stack

### Core

无新增核心依赖。Phase 12 完全复用项目已有技术栈。

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.x | MV3 框架 | 项目基础框架 |
| Preact | 10.29 | Popup UI | 已有，无改动 |
| zod | 3.24 | 消息载荷校验 | 已有，无改动 |

### Supporting

无新增。适配器模式不需要额外库。

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MAIN world ClipboardEvent paste | ISOLATED world property-descriptor setter | 飞书编辑器是 L1 数据驱动 contenteditable，setter 无法可靠触发内部状态更新，paste 更安全 [ASSUMED] |
| 纯文本格式 | Markdown 格式化 | 飞书 paste 处理器不保留标准 Markdown 标记，纯文本更可靠 [ASSUMED] |

**Installation:**

```bash
# 无新安装。Phase 12 不引入新依赖。
```

## Architecture Patterns

### System Architecture Diagram

```
用户 popup 输入 feishu.cn/larksuite.com URL
       │
       ▼
  ┌─────────────────────────┐
  │  popup: findAdapter()   │  ← registry.match() 检查 hostname
  │  检测为 platformId=feishu│     *.feishu.cn 或 *.larksuite.com
  └────────┬────────────────┘
           │
           ▼
  ┌─────────────────────────┐
  │  SW dispatch-pipeline   │  ← tabs.create/udpate 打开目标 tab
  │  等待 tabs.onUpdated    │     等待 complete 状态
  │  + webNavigation SPA    │     + onHistoryStateUpdated（两个域名）
  └────────┬────────────────┘
           │
           ▼
  ┌─────────────────────────┐
  │  executeScript          │  ← chrome.scripting.executeScript
  │  (feishu.content.ts)    │     ISOLATED world content script
  │  登录检测 → 找编辑器    │
  │  → compose 消息         │
  └────────┬────────────────┘
           │ port: WEB2CHAT_MAIN_WORLD:feishu
           ▼
  ┌─────────────────────────┐
  │  executeScript          │  ← chrome.scripting.executeScript
  │  (feishu-main-world.ts) │     MAIN world
  │  ClipboardEvent paste   │     DataTransfer + text/plain
  │  → 触发 Enter/发送按钮  │
  │  → 返回结果             │
  └────────┬────────────────┘
           │
           ▼
  content script 轮询编辑器清空 → 返回成功/失败
```

### Recommended Project Structure

```
新增文件:
shared/adapters/feishu-format.ts          # 消息格式化（纯文本）
shared/adapters/feishu-login-detect.ts    # DOM 层登录检测
background/injectors/feishu-main-world.ts # MAIN world paste injector
entrypoints/feishu.content.ts             # Content script
tests/unit/adapters/feishu-match.spec.ts  # URL 匹配测试
tests/unit/adapters/feishu-format.spec.ts # 格式化测试
tests/unit/adapters/feishu-selector.spec.ts # 编辑器选择器测试
tests/unit/adapters/feishu-login.spec.ts  # 登录检测测试
tests/unit/adapters/feishu.fixture.html   # 编辑器 fixture HTML
tests/unit/adapters/feishu-i18n.spec.ts   # i18n 覆盖测试

修改文件:
shared/adapters/registry.ts              # 追加 defineAdapter({ id: 'feishu', ... })
background/main-world-registry.ts        # 追加 ['feishu', feishuMainWorldPaste]
wxt.config.ts                            # host_permissions 追加两个通配域名
locales/en.yml                           # 追加 feishu 相关 key
locales/zh_CN.yml                        # 追加 feishu 相关 key
scripts/verify-manifest.ts               # 更新 host_permissions 断言列表
```

### Pattern 1: 双域名 Registry Entry

**What:** 一个 `defineAdapter()` 条目通过 match 函数同时匹配两个域名。
**When to use:** 当国内版和国际版使用不同域名但功能完全相同时。

```typescript
// shared/adapters/registry.ts
defineAdapter({
  id: 'feishu',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      // 匹配 feishu.cn（国内版）和 larksuite.com（国际版）
      const isFeishuHost = u.hostname === 'feishu.cn' || u.hostname.endsWith('.feishu.cn');
      const isLarkHost = u.hostname === 'larksuite.com' || u.hostname.endsWith('.larksuite.com');
      if (!isFeishuHost && !isLarkHost) return false;
      // 匹配 /next/messenger 路径前缀 [ASSUMED — 需在实际飞书 Web 上验证]
      return u.pathname.startsWith('/next/messenger') ||
             u.pathname.startsWith('/messenger');
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/feishu.js',
  hostMatches: [
    'https://*.feishu.cn/*',
    'https://*.larksuite.com/*',
  ],
  iconKey: 'platform_icon_feishu',
  spaNavigationHosts: ['feishu.cn', 'larksuite.com'],
  loggedOutPathPatterns: [
    '/accounts/page/login*',
    '/login*',
    '/passport*',
  ],
}),
```

**注意:** 上面的 `spaNavigationHosts` 使用裸域名（如 `discord.com`），这要求 `buildSpaUrlFilters()` 使用 `hostEquals` 匹配。但飞书使用子域名（如 `{tenant}.feishu.cn`），因此可能需要改为具体子域名或使用 `hostSuffix`。需要验证 `buildSpaUrlFilters()` 是否支持子域名匹配。`[ASSUMED — 需验证现有 SPA filter 实现是否处理子域名]`

### Pattern 2: MAIN World ClipboardEvent Paste

**What:** 通过 MAIN world bridge 在飞书 contenteditable 编辑器中注入文本。
**When to use:** 当目标编辑器是 L1 数据驱动 contenteditable 时（Slate/ProseMirror 类）。

```typescript
// background/injectors/feishu-main-world.ts — 参考 telegram-main-world.ts 结构
export async function feishuMainWorldPaste(text: string): Promise<boolean> {
  // 三层选择器 fallback [ASSUMED — 具体选择器需 DevTools 验证]
  const editor =
    document.querySelector<HTMLElement>('[contenteditable="true"][role="textbox"]') ??
    document.querySelector<HTMLElement>('.message-input [contenteditable="true"]') ??
    document.querySelector<HTMLElement>('[contenteditable="true"]');

  if (!editor) return false;
  editor.focus();

  // Pre-paste cleanup
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(new InputEvent('beforeinput', {
      inputType: 'deleteContentBackward', bubbles: true, cancelable: true,
    }));
  }

  // ClipboardEvent paste
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: dt, bubbles: true, cancelable: true,
  }));

  // 触发 input 事件激活发送按钮状态机
  editor.dispatchEvent(new Event('input', { bubbles: true }));

  await new Promise<void>(resolve => setTimeout(resolve, 300));

  // 点击发送按钮或 Enter fallback [ASSUMED — 具体发送按钮选择器需验证]
  // ...

  return true;
}
```

### Anti-Patterns to Avoid

- **不要使用 `textContent =` / `innerText =` 直接设置编辑器内容。** 飞书使用 L1 数据驱动 contenteditable，直接 DOM 操作会绕过内部数据模型，导致编辑器状态不一致。
- **不要在 ISOLATED world 中执行 paste。** 飞书的 paste 处理器监听 MAIN world 的 ClipboardEvent，ISOLATED world 的事件会被忽略。
- **不要假设固定的编辑器 DOM 结构。** 飞书 Web 前端是混淆压缩的 SPA，class name 随版本更新变化。必须使用稳定的属性（role、contenteditable、data-* 属性）作为选择器。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 消息截断逻辑 | 自定义截断 | 不截断 | 飞书文本消息限制 150KB（约 150,000 字符），远超实际网页内容长度，无需截断 [VERIFIED: open.feishu.cn document] |
| Markdown 解析 | Markdown → 飞书格式转换 | 纯文本 | 飞书 paste 处理器不保留标准 Markdown 标记，纯文本更可靠 [ASSUMED] |
| 跨域通信 | 自定义 postMessage 桥接 | WXT content script bridge + MAIN world port | 已有 Phase 8 建立的 `WEB2CHAT_MAIN_WORLD:<platformId>` port 模式 |

**Key insight:** 飞书适配器是项目中最"宽松"的平台之一（150KB 消息限制、不截断），但编辑器 DOM 结构是最不透明的（没有公开文档、混淆 class name、数据驱动模型）。核心风险在选择器稳定性上，不在消息格式化上。

## Common Pitfalls

### Pitfall 1: 子域名匹配不完整

**What goes wrong:** 飞书 Web 聊天使用 `{tenant}.feishu.cn/next/messenger` 格式（tenant 是企业标识符），match 函数只匹配 `feishu.cn` 裸域名而遗漏子域名。
**Why it happens:** REQUIREMENTS.md 写的是 `feishu.cn/messenger/*`，但实际 URL 结构是 `{tenant}.feishu.cn/next/messenger`。
**How to avoid:** match 函数使用 `hostname === 'feishu.cn' || hostname.endsWith('.feishu.cn')` 匹配所有子域名。host_permissions 使用 `https://*.feishu.cn/*` 通配。
**Warning signs:** 用户输入的 URL 包含子域名（如 `acme.feishu.cn/next/messenger`），但扩展显示"unsupported platform"。

### Pitfall 2: `/next/messenger` vs `/messenger` 路径差异

**What goes wrong:** 飞书可能同时支持 `/next/messenger` 和 `/messenger` 两种路径（新旧版本），match 函数只匹配其中一种。
**Why it happens:** 飞书 Web 应用正在从旧路径迁移到 `/next/` 前缀的新路径。
**How to avoid:** match 函数同时匹配 `/next/messenger` 和 `/messenger` 两种路径前缀。
**Warning signs:** 部分 URL 能匹配，部分不能。

### Pitfall 3: Lark 使用 www 子域名

**What goes wrong:** Lark 国际版的 Web 聊天 URL 可能是 `www.larksuite.com/next/messenger` 而不是裸域名。
**Why it happens:** Lark 和飞书的域名路由策略不同，Lark 可能强制使用 `www` 子域名。
**How to avoid:** match 函数匹配 `hostname === 'larksuite.com' || hostname.endsWith('.larksuite.com')`，host_permissions 使用 `https://*.larksuite.com/*`。
**Warning signs:** 用户输入 `www.larksuite.com/next/messenger`，扩展无法识别。

### Pitfall 4: SPA 导航 filter 不匹配子域名

**What goes wrong:** `spaNavigationHosts: ['feishu.cn']` 使用 `hostEquals` 精确匹配，但实际 URL 是 `{tenant}.feishu.cn`，SPA filter 不触发。
**Why it happens:** `buildSpaUrlFilters()` 使用 `hostEquals`（精确匹配），不支持子域名通配。
**How to avoid:** 验证 `buildSpaUrlFilters()` 的实际行为。如果它不支持子域名匹配，需要将 `spaNavigationHosts` 扩展为包含可能的子域名模式，或修改 filter 逻辑。检查现有 `discord.com` 是否也是裸域名（是 — Discord 使用裸域名 `discord.com/channels/...`，不需要子域名）。飞书可能需要不同的处理。
**Warning signs:** 用户在飞书 Web 中通过 SPA 导航切换聊天，但 `webNavigation.onHistoryStateUpdated` 不触发，导致 dispatch pipeline 等不到 `complete` 状态。

### Pitfall 5: 登录页面重定向到 passport 子域名

**What goes wrong:** 未登录时，飞书会将页面重定向到 `passport.feishu.cn/accounts/page/login?...`，此时 hostname 变为 `passport.feishu.cn`，与 chat 页面的 `{tenant}.feishu.cn` 不同。
**Why it happens:** 飞书使用统一的 passport 认证服务处理登录，登录页和聊天页不在同一个域名上。
**How to avoid:** `loggedOutPathPatterns` 不仅检查当前页面的 pathname，还需考虑 hostname 变化。在 dispatch-pipeline 的 `isLoggedOutUrlForAdapter()` 中，如果 hostname 不再匹配 adapter 的 hostMatches，也可以作为登录状态的信号。content script 侧的 DOM 检测作为补充。
**Warning signs:** dispatch-pipeline 发送用户到 `passport.feishu.cn` 但 `loggedOutPathPatterns` 只检查 `feishu.cn` 的 pathname，导致漏检。

### Pitfall 6: 编辑器选择器因版本更新失效

**What goes wrong:** 飞书 Web 客户端更新后，编辑器 DOM 结构变化，选择器不再匹配。
**Why it happens:** 飞书使用混淆的 class name（如 `_2a3b4c5d`），每次部署都可能变化。
**How to avoid:** 优先使用稳定的属性选择器（`role="textbox"`、`contenteditable="true"`、`aria-label`），避免依赖 class name。三层 fallback + 低置信度 warning（tier3 class fragment）。
**Warning signs:** selector fixture 测试通过但实际飞书 Web 上 `findEditor()` 返回 null。

## Code Examples

### 飞书消息格式化（纯文本，D-158 对称结构）

```typescript
// shared/adapters/feishu-format.ts
// Pure function — no chrome.* / WXT imports

export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}

/**
 * Build prompt-first plain text message.
 * Feishu web chat paste handler does not preserve Markdown formatting,
 * so we use plain text with field labels for clarity.
 * No truncation — Feishu text message limit is 150KB (~150K chars).
 *
 * Field order: prompt → title → url → description → timestamp → content
 */
export function composeFeishuMessage(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel: string;
}): string {
  const { prompt, snapshot, timestampLabel } = payload;
  const lines: string[] = [];

  if (prompt) lines.push(prompt, '');
  if (snapshot.title) lines.push(snapshot.title, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  if (snapshot.description) lines.push(snapshot.description, '');
  if (snapshot.create_at) lines.push(`${timestampLabel} ${snapshot.create_at}`, '');
  if (snapshot.content) lines.push(snapshot.content);

  return lines.join('\n').trim();
}
```

### 飞书 URL 匹配函数

```typescript
// 参考 registry.ts 中其他 adapter 的 match 模式
function matchFeishu(url: string): boolean {
  try {
    const u = new URL(url);
    const isFeishu = u.hostname === 'feishu.cn' || u.hostname.endsWith('.feishu.cn');
    const isLark = u.hostname === 'larksuite.com' || u.hostname.endsWith('.larksuite.com');
    if (!isFeishu && !isLark) return false;
    // 匹配 /next/messenger 或 /messenger 路径
    return u.pathname.startsWith('/next/messenger') ||
           u.pathname.startsWith('/messenger');
  } catch {
    return false;
  }
}
```

### 飞书 Chat ID 提取

```typescript
// 飞书 Web messenger URL 可能包含 chat_id
// 可能格式: /next/messenger/chat/{chat_id} 或 hash 路由
// 需要在实际飞书 Web 上验证具体路径结构 [ASSUMED]
function extractFeishuChatId(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    // /next/messenger/chat/{chat_id}
    const messengerIdx = parts.indexOf('messenger');
    if (messengerIdx >= 0 && parts.length > messengerIdx + 1) {
      // 可能是 chat/{chat_id} 或直接的 ID
      if (parts[messengerIdx + 1] === 'chat' && parts.length > messengerIdx + 2) {
        return parts[messengerIdx + 2] ?? null;
      }
      // 可能直接是 /next/messenger/{chat_id}
      return parts[messengerIdx + 1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `feishu.cn/messenger` | `{tenant}.feishu.cn/next/messenger` | 飞书 Web 升级 | URL 路径增加 `/next/` 前缀，且引入企业子域名 |
| L0 contenteditable（`document.execCommand`） | L1 数据驱动 contenteditable | 飞书文档架构升级 | paste 事件处理更复杂，需要 ClipboardEvent 而非直接 DOM 操作 |
| 单域名适配器 | 双域名单适配器（feishu.cn + larksuite.com） | 本 phase | 首次处理双域名场景，为未来多域名适配器建立模式 |

**Deprecated/outdated:**
- `feishu.cn/messenger` 旧路径：飞书正在迁移到 `/next/messenger`，旧路径可能仍然可访问但不再推荐 `[ASSUMED]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 飞书 Web 聊天 URL 为 `{tenant}.feishu.cn/next/messenger` 或 `www.larksuite.com/next/messenger` | URL 匹配 | match 函数无法匹配实际 URL，需要修正路径模式 |
| A2 | 飞书编辑器使用 L1 数据驱动 contenteditable，需要 MAIN world ClipboardEvent paste | 编辑器注入 | 如果飞书使用更底层的编辑器（如自定义 input），paste 可能无效 |
| A3 | 飞书 paste 处理器不保留 Markdown 格式标记，应使用纯文本 | 消息格式化 | 如果飞书 paste 支持 Markdown，则可以提供更丰富的格式 |
| A4 | 飞书消息没有实用截断需求（150KB 限制远超网页内容长度） | 截断策略 | 如果飞书 Web 编辑器有更严格的输入限制，需要添加截断 |
| A5 | `buildSpaUrlFilters()` 的 `hostEquals` 无法匹配子域名，需要特殊处理 | SPA 导航 | SPA 路由变化不会被检测到，dispatch 可能超时 |
| A6 | 飞书发送消息后编辑器会被清空，可以用于发送确认 | 发送确认 | 如果编辑器不清空，需要改用 MutationObserver 检测新消息节点 |
| A7 | 飞书编辑器有 `role="textbox"` 和 `contenteditable="true"` 属性 | 选择器策略 | 需要使用更低置信度的选择器，增加 tier3 class fragment 匹配 |
| A8 | 登录重定向到 `passport.feishu.cn/accounts/page/login` | 登录检测 | 如果登录页面 URL 不同，`loggedOutPathPatterns` 需要修正 |

**需要用户确认的关键假设:**
- A1（URL 结构）和 A7（编辑器选择器）需要在实际飞书 Web 页面上通过 DevTools 验证。建议在实现阶段打开飞书 Web 聊天，用 F12 检查 URL 和 DOM 结构。
- A5（SPA filter 子域名支持）需要检查 `buildSpaUrlFilters()` 的实际实现和 `chrome.webNavigation.onHistoryStateUpdated` filter 对子域名的行为。

## Open Questions

1. **飞书 Web 聊天的实际 URL 结构是什么？**
   - What we know: 飞书 Web 版入口在 `feishu.cn/next/messenger`，企业子域名格式为 `{tenant}.feishu.cn/next/messenger`
   - What's unclear: 具体的 chat 路由格式（是 hash 路由还是 path 路由？chat_id 如何出现在 URL 中？）
   - Recommendation: match 函数宽松匹配 `/next/messenger` 或 `/messenger` 路径前缀，不要求精确的 chat_id 路径。用户只需粘贴飞书 messenger URL 即可。

2. **`buildSpaUrlFilters()` 是否支持子域名匹配？**
   - What we know: 现有实现使用 `hostEquals`（精确匹配），Discord 使用裸域名 `discord.com` 不需要子域名
   - What's unclear: 飞书使用 `{tenant}.feishu.cn` 子域名，`hostEquals: 'feishu.cn'` 不会匹配 `acme.feishu.cn`
   - Recommendation: 验证 `chrome.webNavigation.onHistoryStateUpdated` 的 `hostEquals` filter 是否匹配子域名。如果不匹配，需要修改 `buildSpaUrlFilters()` 或使用不同的 filter 策略。

3. **飞书 Web 编辑器的具体 DOM 结构和发送按钮选择器？**
   - What we know: 使用 L1 数据驱动 contenteditable，类 Slate/ProseMirror 架构
   - What's unclear: 具体的 `role`、`class`、`data-*` 属性和发送按钮 DOM
   - Recommendation: 实现阶段时在飞书 Web 上通过 DevTools 检查，然后创建 fixture HTML

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Chrome MV3 | 运行时 | ✓ | — | — |
| 飞书 Web 账号 | 开发/测试 fixture 验证 | — | — | 使用 DOM snapshot fixture |
| Node.js | 构建/测试 | ✓ | 22.x | — |
| pnpm | 包管理 | ✓ | — | — |

**Missing dependencies with no fallback:**
- 飞书 Web 账号：用于创建编辑器 fixture HTML。需要开发者登录飞书 Web 并通过 DevTools 提取 DOM 结构。如果无法获取实际 DOM，使用假设的 fixture HTML（标记为低置信度）。

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm vitest run tests/unit/adapters/feishu-` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FSL-01 | 双域名 URL 匹配 | unit | `pnpm vitest run tests/unit/adapters/feishu-match.spec.ts` | Wave 0 |
| FSL-02 | 登录检测 | unit | `pnpm vitest run tests/unit/adapters/feishu-login.spec.ts` | Wave 0 |
| FSL-03 | 编辑器选择器三层 fallback | unit | `pnpm vitest run tests/unit/adapters/feishu-selector.spec.ts` | Wave 0 |
| FSL-04 | 发送确认（编辑器清空） | unit | `pnpm vitest run tests/unit/adapters/` | Wave 0 |
| FSL-05 | i18n key 覆盖 | unit | `pnpm vitest run tests/unit/adapters/feishu-i18n.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run tests/unit/adapters/feishu-`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/adapters/feishu-match.spec.ts` — covers FSL-01 双域名匹配
- [ ] `tests/unit/adapters/feishu-format.spec.ts` — covers 消息格式化
- [ ] `tests/unit/adapters/feishu-selector.spec.ts` — covers FSL-03 选择器
- [ ] `tests/unit/adapters/feishu-login.spec.ts` — covers FSL-02 登录检测
- [ ] `tests/unit/adapters/feishu.fixture.html` — 编辑器 DOM fixture
- [ ] `tests/unit/adapters/feishu-i18n.spec.ts` — covers FSL-05 i18n

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 不涉及认证，只检测登录状态 |
| V3 Session Management | no | 不管理会话 |
| V4 Access Control | no | 不涉及访问控制 |
| V5 Input Validation | yes | zod 校验 dispatch payload；URL 匹配纯函数验证 |
| V6 Cryptography | no | 不涉及加密 |

### Known Threat Patterns for Feishu/Lark Adapter

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM 注入导致 XSS | Tampering | DataTransfer 只设置 `text/plain`，不设置 `text/html`；消息格式化为纯文本 |
| 选择器注入 | Tampering | 选择器使用硬编码字符串，不接受用户输入 |
| 权限过度申请 | Elevation | `host_permissions` 限制在 `*.feishu.cn` 和 `*.larksuite.com`，不使用 `<all_urls>` |

## Project Constraints (from CLAUDE.md)

- **DOM 注入：** 禁止使用 `innerText=` / `document.execCommand`。Slate/Lexical 类编辑器使用 ClipboardEvent paste，React 受控 input 使用 property-descriptor setter。
- **权限模型：** 静态 `host_permissions` 中绝不使用 `<all_urls>`；`<all_urls>` 只允许出现在 `optional_host_permissions` 中。飞书使用静态 `host_permissions`（D-156）。
- **适配器模式：** 每个 IM 平台对应一个 adapter 文件集（format + login-detect + main-world + content script），通过 registry entry 注册。
- **测试：** 适配器 selector 在已提交的 DOM fixture（`tests/unit/adapters/<platform>.fixture.html`）上验证，而不是 live 站点。
- **i18n：** 用户可见的字符串全部走 `t(...)`；`en` 与 `zh_CN` locale 文件必须达到 100% 键覆盖率。
- **Service worker 纪律：** 所有事件监听器在模块顶层同步注册。SW 当作无状态。

## Sources

### Primary (HIGH confidence)
- [open.feishu.cn] — Feishu Open Platform message API：消息大小限制 150KB（文本）/ 30KB（卡片富文本）
- [open.feishu.cn] — Feishu AppLink protocol：打开聊天页面的 URL scheme
- [Codebase: shared/adapters/types.ts, registry.ts] — 现有适配器注册表结构和 defineAdapter 模式
- [Codebase: entrypoints/telegram.content.ts] — Telegram 适配器完整实现参考
- [Codebase: background/injectors/telegram-main-world.ts] — Telegram MAIN world paste 实现

### Secondary (MEDIUM confidence)
- [www.feishu.cn/hc/zh-CN/articles/360040080753] — 飞书网页版使用帮助：浏览器要求、登录流程
- [www.larksuite.com/hc/en-US/articles/360040081953] — Lark 网页版使用帮助
- [www.feishu.cn/hc/en-US/articles/644692782731] — 飞书消息格式编辑支持：粗体、斜体、删除线、列表、引用、超链接、代码块
- [open.feishu.cn/document/ukTMukTMukTM/uUzNwUjL1cDM14SN3ATN] — 飞书文本组件支持 `plain_text` 和 `lark_md` 两种模式

### Tertiary (LOW confidence)
- WebSearch 搜索结果（飞书 Web 聊天具体 URL 路径、编辑器 DOM 结构）— 需要在实际飞书 Web 上验证
- [ASSUMED] 飞书编辑器使用 L1 数据驱动 contenteditable，基于知乎文章对飞书编辑器架构的描述

## Metadata

**Confidence breakdown:**
- URL 匹配: MEDIUM — 飞书 Web 聊天的确切 URL 路径需要实际验证，但子域名 + `/next/messenger` 模式有多个来源佐证
- 消息格式化: HIGH — 纯文本方案保守可靠，飞书消息限制有官方文档确认
- 编辑器注入: MEDIUM — MAIN world ClipboardEvent paste 是已验证的模式（Telegram/Slack），但飞书编辑器的具体 DOM 结构需要实际验证
- 登录检测: LOW — 飞书登录页面 URL 和 DOM 标记需要实际验证
- 发送确认: MEDIUM — 编辑器清空确认是 Telegram 验证过的模式，但飞书发送后的 DOM 行为需要确认
- 选择器: LOW — 飞书编辑器的具体 class/role/data 属性需要实际 DevTools 检查

**Research date:** 2026-05-16
**Valid until:** 2026-06-16（飞书 Web 前端可能频繁更新 DOM 结构）
