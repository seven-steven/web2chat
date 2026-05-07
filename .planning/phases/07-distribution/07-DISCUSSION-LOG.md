# Phase 7: 分发上架 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 07-distribution
**Areas discussed:** README 双语结构, PRIVACY.md 风格与范围, Limitations 章节, CWS 上架准备

---

## README 双语结构

### Q1: README 双语的组织方式？

| Option | Description | Selected |
|--------|-------------|----------|
| 单文件上下排列 | 单个 README.md，先 en 全版，然后 zh_CN 全版，中间用 hr/heading 分隔 | |
| 分文件 | 两个文件：README.md（en）+ README.zh_CN.md（zh_CN）。GitHub 默认展示 en | ✓ |
| en 主 + zh 折叠 | README.md 主体写 en，每个章节用 details 折叠块嵌入 zh_CN 翻译 | |

**User's choice:** 分文件

### Q2: README.md（默认版）用哪个语言？

| Option | Description | Selected |
|--------|-------------|----------|
| en 主语言 | README.md 顶部放"简体中文版 → README.zh_CN.md"链接 | |
| zh_CN 主语言 | README.md 写 zh_CN，README.en.md 写 en。符合开发者主语言 | ✓ |
| Claude 裁定 | | |

**User's choice:** zh_CN 主语言

### Q3: README 章节顺序偏好？

| Option | Description | Selected |
|--------|-------------|----------|
| 用户优先 | 简介 → 安装 → 使用 → 平台说明 → Limitations → 开发 → 隐私 | ✓ |
| 开发者优先 | 简介 → 开发 → 安装 → 使用 → 平台 → Limitations → 隐私 | |
| Claude 裁定 | | |

**User's choice:** 用户优先

### Q4: 当前 README.md 中 Phase 1 的手测脚本和项目结构等开发内容怎么处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 重写旧 README | 完全重写，删除 Phase 1 开发期内容 | ✓ |
| 追加而不删 | 保留开发环境/快速开始部分，仅追加用户向章节 | |

**User's choice:** 重写旧 README

---

## PRIVACY.md 风格与范围

### Q1: PRIVACY.md 的语气风格？

| Option | Description | Selected |
|--------|-------------|----------|
| 技术说明风 | 清晰的技术说明：列表字段、存储位置、传输场景。面向开发者/技术用户 | |
| 法律政策风 | 正式的法律政策语言："我们收集"/"我们不会"。面向 CWS 审核和普通用户 | ✓ |
| Claude 裁定 | | |

**User's choice:** 法律政策风

### Q2: PRIVACY.md 语言策略？

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 en | PRIVACY.md 写 en，CWS 审核和国际用户可直接阅读 | |
| 双语分文件 | PRIVACY.md（en）+ PRIVACY.zh_CN.md，与 README 分文件策略一致 | ✓ |
| 单文件双语 | 单文件内 en + zh_CN 上下排列 | |

**User's choice:** 双语分文件

### Q3: PRIVACY.md 覆盖范围？

| Option | Description | Selected |
|--------|-------------|----------|
| 最小范围 | 仅覆盖实际存在的场景：本地存储 + 用户主动投递时传递到目标 IM | |
| 显式否定 + 肯定 | 全场景 + 显式声明"不收集"：无分析、无远程服务器、无第三方 SDK、无 API key | ✓ |

**User's choice:** 显式否定 + 肯定

---

## Limitations 章节

### Q1: Limitations 章节怎么表述延迟到 v2 的功能？

| Option | Description | Selected |
|--------|-------------|----------|
| 仅陈述现状 | 只列"当前不支持"+ "当前限制"，不提 v2 计划 | |
| 现状 + roadmap 暗示 | 列限制同时标注"计划中"，让用户知道有 roadmap | ✓ |
| Claude 裁定 | | |

**User's choice:** 现状 + roadmap 暗示

### Q2: Limitations 列哪些内容？

| Option | Description | Selected |
|--------|-------------|----------|
| 完整列举 | 列出所有 v2 Tier-A/B/C + v1.x 优化项。全面但较长 | |
| 精选 3-5 项 | 只列最关键的：仅 Chrome、无 Telegram/Slack、单消息截断、无重试队列 | ✓ |

**User's choice:** 精选 3-5 项

---

## CWS 上架准备

### Q1: 本 phase 的 CWS 准备到什么程度？

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 zip 可上传 | 只确保 zip 可上传 + manifest 校验通过 | |
| zip + listing 文案 | 同时准备 store listing 的 short/detailed description 双语文案 | ✓ |
| 全套上架材料 | zip + listing 文案 + 截图指南 | |

**User's choice:** zip + listing 文案

### Q2: CWS listing 文案的文件组织？

| Option | Description | Selected |
|--------|-------------|----------|
| 单文件双语 | STORE-LISTING.md 内含 en + zh_CN | |
| 分文件 | STORE-LISTING.md（zh_CN）+ STORE-LISTING.en.md | ✓ |
| Claude 裁定 | | |

**User's choice:** 分文件

### Q3: CWS listing 的分类定位偏向？

| Option | Description | Selected |
|--------|-------------|----------|
| 工具类 | 喜拍浏览器扩展/一键复制/网页剪藏/笔记工具 | |
| AI/自动化类 | AI Agent 助手/与 AI 对话/自动化投递 | ✓ |
| Claude 裁定 | | |

**User's choice:** AI/自动化类

---

## Claude's Discretion

- zip 构建是否需要额外 WXT 配置
- PRIVACY.md 精确法律措辞
- README 开发章节详略
- STORE-LISTING.md detailed description 长度
- markdown lint 检查的具体实现

## Deferred Ideas

None — discussion stayed within phase scope
