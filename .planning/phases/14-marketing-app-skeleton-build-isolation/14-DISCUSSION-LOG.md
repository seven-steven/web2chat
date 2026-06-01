# Phase 14: 独立 marketing app 骨架与构建隔离 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 14-独立 marketing app 骨架与构建隔离
**Areas discussed:** 目录落点与工程边界, 技术栈与依赖复用边界, 构建与预览命令设计, smoke test 形式

---

## 目录落点与工程边界

### 源码目录

| Option | Description | Selected |
|--------|-------------|----------|
| apps/marketing | 仓库内独立子应用，与扩展入口、脚本、未来子站扩展一致 | ✓ |
| site/ | 更像单独官网目录，命名更短 | |
| public-site/ | 强调对外页面属性，但后续扩展空间有限 | |

**User's choice:** apps/marketing
**Notes:** 推荐，和未来 docs/changelog 子站扩展模式一致。

### 共享范围

| Option | Description | Selected |
|--------|-------------|----------|
| 只共享静态资源与设计 token | 不共享 UI 组件，避免 marketing 被扩展交互模型绑住 | ✓ |
| 共享通用 UI 组件 | 允许复用 popup/options 组件 | |
| 完全隔离，连 token 也不共享 | 最隔离但视觉一致性差 | |

**User's choice:** 只共享静态资源与设计 token
**Notes:** 满足 BUILD-03，对下游 planner 友好。

### 文案数据维护位置

| Option | Description | Selected |
|--------|-------------|----------|
| 放在 marketing app 内部数据文件 | 简单直接，marketing 自包含 | ✓ |
| 从 planning/artifact 源文件读取生成 | 事实源单一但构建复杂 | |
| 两层：planning 为事实源，marketing 内部为落地拷贝 | 两层维护，更新时需同步 | |

**User's choice:** 放在 marketing app 内部数据文件

### 工程边界强度

| Option | Description | Selected |
|--------|-------------|----------|
| 硬隔离 | 目录和 import 规则显式禁止扩展 runtime 依赖 | ✓ |
| 默认隔离 | 默认不依赖，允许少量例外 | |
| 不设机制 | 只要能 build 就行 | |

**User's choice:** 硬隔离
**Notes:** Phase 16 验收时需验证隔离。

---

## 技术栈与依赖复用边界

### 依赖管理

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 package.json + pnpm workspace | 依赖版本独立管理，需加 pnpm-workspace.yaml | ✓ |
| 共享根 package.json | 更简单但版本冲突风险高 | |
| 混合方案 | 折中但边界模糊 | |

**User's choice:** 独立 package.json

### UI 框架

| Option | Description | Selected |
|--------|-------------|----------|
| Preact + Tailwind | 和扩展保持一致，复用开发经验和设计 token | ✓ |
| 纯 HTML + Tailwind | 零 runtime，但复杂页面维护成本高 | |
| Astro + Tailwind | 引入新框架，降低可维护性 | |

**User's choice:** Preact + Tailwind

### Vite 配置

| Option | Description | Selected |
|--------|-------------|----------|
| 完全独立 | 不 import WXT vite 配置，满足 BUILD-03 | ✓ |
| 共享插件配置 | 减少重复但引入耦合 | |

**User's choice:** 完全独立

### Design token 共享方式

| Option | Description | Selected |
|--------|-------------|----------|
| 拷贝或 symlink | 硬隔离最简单 | |
| 提取到 shared/ 目录 | 单一事实源，验证时有明确路径 | ✓ |

**User's choice:** 提取到 shared/ 目录

---

## 构建与预览命令设计

### 命令入口

| Option | Description | Selected |
|--------|-------------|----------|
| marketing 内定义 + 根代理 | 两边都能独立跑，根目录有便捷入口 | ✓ |
| 只在 marketing 内定义 | 完全隔离但需 cd | |
| 只在根 package.json | 最简单但违反隔离意图 | |

**User's choice:** marketing 内定义 + 根代理

### 命令前缀

| Option | Description | Selected |
|--------|-------------|----------|
| site:* | 简短且明显是网站相关 | ✓ |
| marketing:* | 和目录名对应但较长 | |
| www:* | 短但语义局限 | |

**User's choice:** site:*

### 输出目录

| Option | Description | Selected |
|--------|-------------|----------|
| apps/marketing/dist | 和源码同目录，完全独立于 .output | ✓ |
| .site-output/ | 和 .output/ 平级但多根级构建产物 | |

**User's choice:** apps/marketing/dist

---

## Smoke Test 形式

### 验证范围

| Option | Description | Selected |
|--------|-------------|----------|
| 构建产物验证 | 只验证 build 成功 + dist 非空 + index.html 存在 | ✓ |
| Playwright 页面加载验证 | 更全面但引入 Playwright 依赖 | |
| Vitest HTML 解析验证 | 中等复杂度但不太必要 | |

**User's choice:** 构建产物验证
**Notes:** Phase 14 骨架期足够；更全面的验证留给 Phase 16。

### 命令组织

| Option | Description | Selected |
|--------|-------------|----------|
| site:verify 代理 | marketing 内 verify:build + 根代理，和 verify:manifest 模式一致 | ✓ |
| 仅 CI 内联验证 | 少一个命令但本地不友好 | |

**User's choice:** site:verify 代理

---

## Claude's Discretion

- pnpm-workspace.yaml 的具体 packages 配置
- apps/marketing/ 内的子目录结构
- shared/ 目录的文件命名与 token 提取粒度
- 硬隔离规则的校验方式
- Vite 配置中的具体插件选择与 dev server 端口
- site:verify 的具体验证脚本实现

## Deferred Ideas

None — discussion stayed within phase scope.
