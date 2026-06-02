# Phase 15: 宣传页内容与视觉实现 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 15-宣传页内容与视觉实现
**Areas discussed:** Section 布局与视觉层级, 产品证据与素材策略, Three-step flow 与 payload 可视化, CTA 与安装路径

---

## Section 布局与视觉层级

### 页面整体布局形态

| Option | Description | Selected |
|--------|-------------|----------|
| 统一单栏 | 所有 section 保持 max-w-3xl 居中，线性滚动。Hero 可稍宽（max-w-4xl）。 | ✓ |
| 宽窄交替 | Hero/CTA 横跨全宽，中间 section 用 max-w-3xl。 | |
| 灵活混合 | 每个 section 独立控制宽度。 | |

**User's choice:** 统一单栏
**Notes:** 简单、构建快、视觉统一。

### 导航结构

| Option | Description | Selected |
|--------|-------------|----------|
| 无导航 | 无导航栏、无 anchor。纯线性滚动页面。 | ✓ |
| 固定顶部导航 | 顶部固定导航栏，点击跳转到对应 section。 | |
| 轻量滚动指示器 | 侧边/底部 dot/pill 指示器，显示当前浏览位置。 | |

**User's choice:** 无导航
**Notes:** 8 个 section 内容量不大，不值得加导航。

### 视觉权重分配

| Option | Description | Selected |
|--------|-------------|----------|
| 信息密度优先 | Hero 最大权重。Use cases / payload / platforms / flow 紧凑卡片。Trust/limits 低调文字。 | ✓ |
| 宽舒留白 | 大留白分隔，视觉节奏宽松。 | |

**User's choice:** 信息密度优先
**Notes:** 延续 Phase 13 D-02 "紧凑信息密度" 决策。

### Section 间视觉分隔

| Option | Description | Selected |
|--------|-------------|----------|
| 背景色交替分段 | canvas vs surface-subtle 交替，视觉分隔清晰但不突兀。 | ✓ |
| 统一背景 + spacing | 统一 canvas 背景，用 border 或 spacing 分隔。 | |
| 视觉丰富分段 | 每个 section 独特背景或装饰。 | |

**User's choice:** 背景色交替分段

---

## 产品证据与素材策略

### 产品证据形式

| Option | Description | Selected |
|--------|-------------|----------|
| 代码生成 mockup | 纯 CSS/HTML 构建产品界面示意图，标注为 mockup。零外部素材依赖。 | ✓ |
| 实际截图 | 手动截图产品 UI 作为静态图片嵌入。 | |
| 混合（mockup + 截图） | 代码 mockup 为主，关键位置用截图增加真实感。 | |
| 纯文字 + diagram | 纯文字描述 + 流程图，不使用视觉素材。 | |

**User's choice:** 代码生成 mockup
**Notes:** 随代码更新自动保持一致，零外部素材依赖。

### Mockup 覆盖范围

| Option | Description | Selected |
|--------|-------------|----------|
| Popup + 目标页面两个 mockup | 覆盖核心链路两个关键界面。 | ✓ |
| 仅 Popup mockup | 只 mock popup 窗口。 | |
| 三个视角全 mock | popup + 目标页面 + payload 结构化视图。 | |

**User's choice:** Popup + 目标页面两个 mockup

### Mockup 文案处理

| Option | Description | Selected |
|--------|-------------|----------|
| 单语，跟随 locale | 文案从 i18n JSON 读取，跟随 locale 切换。 | ✓ |
| 硬编码文案 | mockup 内文案硬编码，不随 i18n 切换。 | |
| 无文字占位块 | 灰色占位块表示内容区域。 | |

**User's choice:** 单语，跟随 locale
**Notes:** 保持与真实产品文案一致。

---

## Three-step flow 与 payload 可视化

### Three-step flow 展示形态

| Option | Description | Selected |
|--------|-------------|----------|
| 水平步进条 | 三步横向排列，图标 + 短描述 + 箭头连接。 | ✓ |
| 纵向步进 + mini mockup | 三步纵向排列，每步配 mini mockup。 | |
| 纯文字列表 | 只用文字 + 箭头，无图形元素。 | |

**User's choice:** 水平步进条

### Structured-payload example 展示形态

| Option | Description | Selected |
|--------|-------------|----------|
| 代码块对比 | JSON/Markdown 代码块样式，左侧结构化 payload vs 右侧手动复制粘贴。 | |
| 字段表格 | 表格形式展示字段名和示例值。 | |
| 模拟 popup 界面 | 模拟真实 popup 界面中的字段展示效果。 | ✓ |
| 混合形式 | 字段列表 + 简短对比说明。 | |

**User's choice:** 模拟 popup 界面
**Notes:** 初始选择代码块对比，后改为模拟 popup 界面，与产品证据 mockup 风格统一。

### Payload 示例数据来源

| Option | Description | Selected |
|--------|-------------|----------|
| 硬编码示例数据 | 在 site-content.ts 中硬编码模拟文章 payload。 | ✓ |
| i18n 化示例数据 | 从 i18n JSON 读取示例数据，跟随 locale 切换。 | |
| 字段名占位 | 只用字段名占位，无实际数据。 | |

**User's choice:** 硬编码示例数据

### 步进条图标来源

| Option | Description | Selected |
|--------|-------------|----------|
| CSS 形状 + 产品 icon | CSS 圆形数字 + public/icon/* 产品 icon。零新依赖。 | ✓ |
| 引入 icon 库 | 引入 Lucide/heroicons 等轻量 SVG icon 库。 | |
| 纯文字数字 | 只用 ① ② ③ 文字数字。 | |

**User's choice:** CSS 形状 + 产品 icon

---

## CTA 与安装路径

### CTA 安装路径安排

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub 源码 + README 安装指引 | 主 CTA 指向 GitHub，次要 CTA 指向 README 安装说明。CWS 上架后可替换。 | ✓ |
| 仅 GitHub CTA + 底部链接 | 一个 CTA 指向 GitHub，安装说明放在底部文字链接。 | |
| GitHub + CWS placeholder | 主 CTA 指向 GitHub，安装部分用"即将上架 CWS" placeholder。 | |

**User's choice:** GitHub 源码 + README 安装指引

### CTA 出现位置

| Option | Description | Selected |
|--------|-------------|----------|
| Hero + 底部 CTA section 双重出现 | Hero 有主 CTA，底部 CTA section 有源码 + 安装按钮。 | ✓ |
| 仅底部 CTA section | 只在页面底部出现 CTA 按钮。 | |

**User's choice:** Hero + 底部 CTA section 双重出现

---

## Claude's Discretion

- 各 section 具体文案措辞
- 背景色交替的起始色和 section 映射
- 水平步进条精确间距和箭头样式
- Mockup 边框、阴影、圆角等视觉细节
- CTA 按钮颜色和尺寸
- 响应式断点选择和移动端适配细节

## Deferred Ideas

None — discussion stayed within phase scope.
