# Phase 7: 分发上架 - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 交付 Web2Chat v1 的分发就绪产物：

1. **CWS 兼容 zip**：`pnpm build && pnpm zip` 产出可直接上传 Chrome Web Store 或本地 Load unpacked 的包（DST-01）
2. **隐私政策**：PRIVACY.md（en）+ PRIVACY.zh_CN.md，正式法律政策语言，显式列出收集/不收集的数据及传输场景（DST-02）
3. **manifest 权限验证**：确认生产构建 manifest 静态 `host_permissions` 仅含 `https://discord.com/*`，`optional_host_permissions: ["<all_urls>"]`（DST-03 — 已由现有 `verify-manifest.ts` 覆盖）
4. **双语 README**：README.md（zh_CN）+ README.en.md，覆盖安装、使用、平台说明、Limitations（DST-04）
5. **CWS listing 文案**：STORE-LISTING.md（zh_CN）+ STORE-LISTING.en.md，含 short description + detailed description

Phase 7 **不包含**：

- 新增适配器或投递功能（v2）
- 截图/promotional tile 资源制作
- 实际上传到 Chrome Web Store（手动操作）
- Firefox/Safari 移植
- 任何运行时代码变更（除非 zip 校验暴露构建问题）

</domain>

<decisions>
## Implementation Decisions

### 1. README 双语结构 (D-83..D-86)

- **D-83:** **分文件策略**。README.md（zh_CN 主语言）+ README.en.md。GitHub 默认展示 zh_CN 版本。README.md 顶部放一行 "English version → README.en.md" 链接；README.en.md 顶部放 "中文版 → README.md" 链接。
- **D-84:** **zh_CN 为主语言**。README.md 写 zh_CN，符合开发者主语言。README.en.md 为英文完整版（非翻译摘要，而是结构对等的完整文档）。
- **D-85:** **用户优先章节顺序**。简介 → 安装 → 使用 → 平台说明（OpenClaw 配置 + Discord ToS）→ Limitations → 开发 → 隐私。
- **D-86:** **重写旧 README**。删除当前 README.md 中 Phase 1 手测脚本、项目结构等开发期内容，重写为面向最终用户/贡献者的完整文档。开发命令精简为"开发"章节中的简明列表。

### 2. PRIVACY.md 风格与范围 (D-87..D-89)

- **D-87:** **法律政策风格**。使用正式的隐私政策语言（"我们收集"/"我们不会"等第一人称复数表述），面向 CWS 审核和普通用户。
- **D-88:** **双语分文件**。PRIVACY.md（en）+ PRIVACY.zh_CN.md。CWS listing 的 privacy policy 链接指向 PRIVACY.md（en）。README 中链接到对应语言版本。
- **D-89:** **显式否定 + 肯定**。覆盖全场景：(1) 收集什么（url/title/description/content/prompt/create_at — 仅存于 chrome.storage.local/.session）；(2) 传输场景（仅用户主动确认投递时，通过浏览器标签页直接导航传递到目标 IM）；(3) 显式否定：无远程服务器、无第三方分析/SDK、无 API key 存储、无遥测、无云同步、无广告跟踪。

### 3. Limitations 章节 (D-90..D-91)

- **D-90:** **精选 3-5 项 + roadmap 暗示**。不完整列举所有 v2 项，选择用户最可能关心的限制。标注"计划中"以暗示有 roadmap。
- **D-91:** **推荐列出项**：(1) 仅支持 Chrome/Chromium（Firefox/Safari 计划中）；(2) 仅支持 OpenClaw + Discord 两个平台（Telegram/Slack 等计划中）；(3) 单条消息截断（长内容被截断为 2000 字符，计划中：多条切分）；(4) 无失败重试队列（计划中）；(5) Discord 投递使用 DOM 注入，存在 ToS 风险。

### 4. CWS 上架准备 (D-92..D-94)

- **D-92:** **zip + listing 文案**。本 phase 确保 zip 可上传并准备 store listing 描述文案。不含截图/promotional tile。
- **D-93:** **分文件 listing**。STORE-LISTING.md（zh_CN）+ STORE-LISTING.en.md。包含 CWS 要求的 short description（≤132 字符）和 detailed description。
- **D-94:** **AI/自动化类定位**。listing 文案突出"AI Agent 辅助"和"自动化投递"定位，而非通用的"网页剪藏工具"标签。

### Claude's Discretion

下列决策委托给 plan 阶段：

- **zip 构建是否需要额外配置**：WXT `wxt zip` 的默认行为是否满足 CWS 要求（source maps 排除、图标尺寸等），由研究阶段确认。
- **PRIVACY.md 的精确法律措辞**：具体条款表述由 planner 参考 CWS 审核要求决定。
- **README 中开发章节的详略程度**：保留哪些开发命令、是否含 CONTRIBUTING 说明。
- **STORE-LISTING.md 的 detailed description 长度**：CWS 允许的字符限制内由 planner 裁定。
- **markdown lint 检查的具体实现**：ROADMAP 成功标准 #4 要求验证两种语言的锚点存在，具体 lint 工具/脚本由 planner 决定。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目顶层上下文
- `CLAUDE.md` — 隐私约定（仅本地保存，不上报第三方）、权限模型（static host_permissions 仅 discord.com）、适配器模式
- `.planning/PROJECT.md` — Core Value、约束、Key Decisions 表
- `.planning/REQUIREMENTS.md` §Distribution — DST-01..DST-04 验收标准
- `.planning/ROADMAP.md` §"Phase 7: 分发上架" — 4 条成功标准精确措辞

### 先前 Phase 决策
- `.planning/phases/05-discord/05-CONTEXT.md` §D-59..D-61 — Discord ToS 脚注文案意图（README 双语 ToS 章节的内容来源）
- `.planning/phases/06-i18n/06-CONTEXT.md` — 运行时 locale 切换 + ESLint 规则已就位的确认

### 已有基础设施
- `wxt.config.ts` — manifest 配置（dev/prod 权限区分）、build 配置
- `scripts/verify-manifest.ts` — manifest 形态校验脚本（已验证 host_permissions/optional_host_permissions）
- `package.json` — `build` / `zip` / `verify:manifest` scripts 已就位

### 外部参考
- Chrome Web Store Developer Documentation — 上传要求、listing 字段限制、privacy policy 要求
- WXT 0.20.x §`wxt zip` — zip 打包行为与配置

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-manifest.ts` — 已验证 permissions/host_permissions 形态，Phase 7 可扩展验证 zip 内容
- `wxt.config.ts` — WXT 构建配置已区分 dev/prod 模式，生产构建不含 `<all_urls>` 在 host_permissions
- `.github/workflows/ci.yml` — CI pipeline 已含 typecheck + lint + test + verify:manifest

### Established Patterns
- **分文件双语**：Phase 7 新建立的模式（README.md/README.en.md + PRIVACY.md/PRIVACY.zh_CN.md + STORE-LISTING.md/STORE-LISTING.en.md）
- **verify-manifest 校验**：Phase 1 建立的 manifest 断言模式，可扩展为 zip 内容断言

### Integration Points
- `package.json` — 可能新增 `zip:verify` 或类似 script 验证 zip 内容
- `.output/chrome-mv3/` — `pnpm build` 生产构建产物目录
- README.md — 完全重写（当前内容废弃）
- 仓库根目录 — 新增 PRIVACY.md、PRIVACY.zh_CN.md、README.en.md、STORE-LISTING.md、STORE-LISTING.en.md

</code_context>

<specifics>
## Specific Ideas

- **Discord ToS README 章节内容**（D-60 from Phase 5）：DOM 注入 = 自动化操作 = 可能触发 Discord 检测/账号风险；用户自行承担。双语。
- **Limitations 精选项**：仅 Chrome、仅 OpenClaw + Discord、单消息截断、无重试队列、Discord ToS 风险。标注"计划中"暗示 roadmap。
- **PRIVACY.md 显式否定清单**：无远程服务器、无第三方分析/SDK、无 API key 存储、无遥测、无云同步、无广告跟踪。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-distribution*
*Context gathered: 2026-05-07*
