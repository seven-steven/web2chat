# Web2Chat

> Chrome MV3 扩展骨架 — 抓取页面结构化元数据 + 用户预设 prompt，一键投递到 IM / AI Agent 聊天会话。

当前状态：**Phase 1 (Foundation) — 扩展骨架。** 投递与抓取逻辑由后续 phase 落地。

## 开发环境

- Node.js >= 20.19
- pnpm 10.x（`corepack enable`）
- Chrome / Chromium 稳定版（用于本地 unpacked 加载与 Playwright e2e）

## 快速开始

```bash
pnpm install         # 安装依赖；postinstall 跑 wxt prepare + husky
pnpm dev             # 启动 WXT dev server，自动 HMR
pnpm build           # 生产构建到 .output/chrome-mv3/
pnpm verify:manifest # 校验 manifest 形态（CI 同款检查）
pnpm test            # Vitest 单元测试
pnpm test:e2e        # Playwright e2e（本地，需要 headed Chromium；CI 不跑此步）
                     # 首次跑前必须先安装浏览器：pnpm exec playwright install chromium
pnpm typecheck       # tsc --noEmit
pnpm lint            # ESLint flat config
```

## 加载 unpacked 扩展

1. 跑 `pnpm build`
2. 打开 `chrome://extensions`
3. 右上角打开 **开发者模式**
4. 点击 **Load unpacked**，选择本仓库的 `.output/chrome-mv3/` 目录
5. 工具栏出现 Web2Chat action 图标

## Phase 1 手测脚本

### #1 — manifest 形态（FND-05）

加载 unpacked 后，从 `chrome://extensions` 卡片右侧 "Inspect views" → service worker，
或直接打开 `.output/chrome-mv3/manifest.json`，确认：

- `permissions` === `["activeTab", "scripting", "storage"]`（顺序无关）
- `host_permissions` === `["https://discord.com/*"]`（**绝不**含 `<all_urls>`）
- `optional_host_permissions` === `["<all_urls>"]`
- `default_locale` === `"en"`
- `name` / `description` / `action.default_title` 全部以 `__MSG_` 起头

或一行执行：`pnpm verify:manifest`

### #2 — i18n hello-world（FND-06 + ROADMAP 成功标准 #2）

1. 浏览器 UI 语言设为英文，重启浏览器，打开 `chrome://extensions`，**Reload** 扩展
2. 点击工具栏 Web2Chat 图标 → popup 显示 `Hello, world (×N)`
3. 把 Chrome UI 语言切换为简体中文，重启，重新 Reload 扩展
4. 再次点击图标 → popup 显示 `你好，世界 ×N`

### #3 — popup ↔ SW ↔ storage 链路（FND-03 + ROADMAP 成功标准 #3）

1. 加载 unpacked 后点击 action 图标 → popup 显示 `(×1)`（或 `×1`）
2. 关闭 popup，再点击 action 图标 → 显示 `(×2)`
3. 关闭浏览器进程，重新启动，加载扩展，再点击 → 显示 `(×3)`（证明 chrome.storage.local 跨进程持久化）

### #4 — SW 重启韧性（FND-02 + ROADMAP 成功标准 #4）

1. 加载 unpacked 后点击图标 → 记下当前 helloCount（设为 N）
2. 打开 `chrome://serviceworker-internals/`（Chrome 138+ 已从 chrome://extensions 卡片移除 Stop 按钮，必须走此页面）
3. 在列表中找到 Web2Chat 的 SW（按 scope 中的扩展 ID 过滤），点击 **Stop**
4. 立即点击工具栏 action 图标 → popup 显示 `(×{N+1})`，证明：
   - SW 监听器在模块顶层同步注册（FND-02）
   - chrome.scripting / chrome.runtime listener 在 SW 唤醒时正确恢复
   - 没有依赖任何模块作用域状态（陷阱 3）

或一行执行（先安装 Chromium binary）：

```bash
pnpm exec playwright install chromium   # 首次必跑；约 150 MB
pnpm test:e2e                            # Playwright 用 chrome.runtime.reload 模拟同等路径
```

### #5 — 校验 CI 步骤本地复现（D-11 + ROADMAP 成功标准 #5）

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:manifest
```

以上 5 步都通过即满足 GitHub Actions `ci.yml` 的全部 job。Playwright e2e **不**在 CI 跑（D-11，留 Phase 4），本地仍可 `pnpm test:e2e`。

## 项目结构

```
.
├── entrypoints/
│   ├── background.ts          # service worker — 顶层 listener 注册
│   └── popup/                 # popup（Preact + Tailwind v4）
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       └── style.css
├── shared/
│   ├── messaging/             # zod 校验的 RPC 协议（@webext-core/messaging）
│   ├── storage/               # 类型化 chrome.storage.local 包装 + migration 框架
│   └── i18n/                  # @wxt-dev/i18n facade
├── locales/                   # en.yml / zh_CN.yml — 真值来源（YAML，按 STACK.md §i18n 边界）
├── tests/
│   ├── unit/                  # Vitest + happy-dom + WXT fakeBrowser
│   └── e2e/                   # Playwright + launchPersistentContext
├── scripts/
│   └── verify-manifest.ts     # CI 也调用同一脚本
├── .github/workflows/ci.yml   # install + typecheck + lint + vitest + verify:manifest（无 Playwright）
├── wxt.config.ts
└── .planning/                 # GSD 工作流产物（roadmap / phases / research）
```

## Phase 1 之后

见 `.planning/ROADMAP.md`：

- Phase 2 — 抓取流水线（Readability + DOMPurify + Turndown）
- Phase 3 — 投递核心 + popup UI（send_to / prompt 历史 / 草稿 / 幂等性）
- Phase 4 — OpenClaw 适配器（首个端到端投递目标）
- Phase 5 — Discord 适配器（Slate 编辑器 + ClipboardEvent 注入）
- Phase 6 — i18n 加固 + 打磨（运行时切换 + 完整版硬编码字符串 lint）
- Phase 7 — 分发（Web Store zip + PRIVACY.md + 双语 README）
