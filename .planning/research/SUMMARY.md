# 项目调研总结 — v1.1 多渠道适配

**项目：** Web2Chat
**领域：** Chrome MV3 网页剪藏 + 多 IM 投递自动化
**调研时间：** 2026-05-09
**Milestone：** v1.1 多渠道适配

---

## 可行性总览

| 平台 | 可行性 | 优先级 |
|------|--------|--------|
| **Slack** | ✅ 可行（Quill contenteditable） | P0 |
| **Telegram Web K** | ✅ 可行（contenteditable，开源） | P0 |
| **Feishu / Lark** | ✅ 可行（数据驱动 ContentEditable） | P1 |
| **Nextcloud Talk** | ✅ 可行（标准 input，用户自部署） | P1 |
| **WhatsApp Web** | ⚠️ 高风险（DOM 可注入但 ToS + 反自动化） | P2 |
| **Microsoft Teams** | ⚠️ 困难（复杂 SPA + 企业安全） | P2 |
| **Google Chat** | ⚠️ 困难（Google CSP + A/B 测试） | P2 |
| **WeCom 企业微信** | ⚠️ 高风险（企业级反自动化） | P3 |
| **Zalo** | ❓ 待验证 | P3 |
| **Signal** | ❌ 不可行（无浏览器 Web UI） | — |
| **LINE** | ❌ 不可行（无个人聊天 Web UI） | — |
| **QQ** | ❌ 不可行（无稳定 Web 聊天） | — |

## 关键发现

### 技术栈：无新增依赖
v1.1 所有功能可在现有技术栈（WXT + Preact + TypeScript + 原生 DOM API）上完成。不需要引入新库。

### 架构：4 项泛化改动（详见 ARCHITECTURE.md）
1. PlatformId branded type（避免多平台并行开发合并冲突）
2. MAIN world paste 桥接泛化（Discord 专用 → per-adapter）
3. SPA 路由检测 filter 动态构建（硬编码 → registry 驱动）
4. 投递超时/登录检测参数移入 AdapterRegistryEntry

### 投递鲁棒性（详见 ARCHITECTURE.md）
- 投递重试：popup-driven（非 SW auto-retry），复用 dispatch.start
- 适配器选择器：分层置信度 + canary 验证 + 低置信度用户警告
- 超时分层：per-adapter 可配置（OpenClaw 10s vs Discord 30s）
- 登录检测：从 Discord 硬编码泛化为 registry 的 loggedOutPathPatterns

### 平台风险
- **WhatsApp Web** 是双刃剑：技术上可行但有 ToS 封号风险
- **Slack** 和 **Telegram** 是最低风险的 P0 平台：公开 Web UI + 标准 contenteditable
- **Feishu** 是国内刚需但双域名（feishu.cn + larksuite.com）增加维护面

## 建议的 Phase 结构

| Phase | 内容 | 依赖 |
|-------|------|------|
| A | 架构泛化（PlatformId + MAIN world + SPA filter + timeout） | 仅 shared/ 层 |
| B | 投递鲁棒性（超时分层 + 登录检测泛化 + 重试 UI） | Phase A |
| C | Slack 适配器（P0 平台） | Phase B |
| D | Telegram 适配器（P0 平台） | Phase B，可与 C 并行 |
| E | Feishu/Lark 适配器（P1 平台） | Phase B |

## 来源

- `.planning/research/ARCHITECTURE.md` — v1.1 架构调研（HIGH 置信度）
- `.planning/research/FEATURES.md` — v1.0 功能调研（平台可行性参考）
- `.planning/research/PITFALLS.md` — v1.0 陷阱调研
- Web 搜索：Slack Quill editor、Telegram Web K、飞书编辑器、WhatsApp Web DOM
