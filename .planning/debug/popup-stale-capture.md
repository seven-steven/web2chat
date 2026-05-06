---
status: resolved
trigger: "点击插件图标，popup 显示的采集信息会缓存上一次采集的结果，不是当前页面内容"
created: 2026-05-06T00:00:00Z
updated: 2026-05-06T01:00:00Z
---

## Current Focus

hypothesis: popup mount logic 把上一次会话的 popupDraft 中的 title/description/content 字段无条件覆盖到了刚抓到的 ArticleSnapshot 上，导致显示陈旧数据
test: 阅读 entrypoints/popup/App.tsx mount 流程 + entrypoints/popup/components/SendForm.tsx 的 draft 写入逻辑 + background/capture-pipeline.ts
expecting: 找到 capture 路径正确（每次都重抓），但 draft 覆盖路径错误地覆盖 title/description/content
next_action: 修复 App.tsx 不再用 draft 覆盖刚采集的 title/description/content（仅保留 send_to / prompt 的草稿恢复语义）

## Symptoms

expected: 每次点击扩展图标打开 popup 时，popup 中的采集信息（title / url / description / content 等）应反映当前 active tab 的页面内容
actual: popup 打开后显示的是上一次采集的结果（即上一个被采集页面的缓存数据），不是当前页面
errors: 无明确错误信息（silent stale-data bug）
reproduction:
  1. 在页面 A 上点击扩展图标，触发一次采集（popup 显示 A 的内容）
  2. 切换到页面 B（不同 tab 或同 tab 导航）
  3. 在页面 B 上再次点击扩展图标
  4. 观察：popup 显示的仍是页面 A 的采集结果，而不是页面 B
started: 用户在最近 UAT/调试阶段发现，未指定具体 phase

## Eliminated

- ✗ "capture-pipeline 有按 tab/url 缓存"：`background/capture-pipeline.ts` 每次都执行 `chrome.scripting.executeScript`，无任何缓存键，固定返回最新页面的 ArticleSnapshot
- ✗ "module-level signals 跨 popup 实例残留"：popup 关闭后 JS realm 销毁，下次打开 `popupSig`/`titleSig` 都重置为初值
- ✗ "onChanged 监听过晚错过事件"：popup mount 主流程是 RPC 主动拉取（`sendMessage('capture.run')`），不依赖 storage onChanged 推送 snapshot

## Evidence

- timestamp: 2026-05-06T00:25Z
  observation: `background/capture-pipeline.ts:40-124` `runCapturePipeline()` 无任何缓存层 — 每次调用都重新 `chrome.scripting.executeScript({ files: ['content-scripts/extractor.js'] })`，所以从 SW 视角，capture 输出永远是当前 active tab 的实时内容
  hypothesis_status: 否定 "capture pipeline 缓存" 假设；问题不在 capture 链路

- timestamp: 2026-05-06T00:26Z
  observation: `entrypoints/popup/App.tsx:133-155` popup mount 时并行执行 `sendMessage('capture.run')` 与 `draftRepo.get()`。在 `captureRes.ok` 分支内：
  ```
  snapshotSig.value = captureRes.data;
  titleSig.value = captureRes.data.title;
  descriptionSig.value = captureRes.data.description;
  contentSig.value = captureRes.data.content;
  if (draftRes) {
    sendToSig.value = draftRes.send_to || '';
    promptSig.value = draftRes.prompt || '';
    promptDirtySig.value = (draftRes.prompt || '') !== '';
    // Draft overrides capture for user-edited fields (DSP-09 draft recovery)
    if (draftRes.title) titleSig.value = draftRes.title;
    if (draftRes.description) descriptionSig.value = draftRes.description;
    if (draftRes.content) contentSig.value = draftRes.content;
  }
  ```
  注释自称是 "user-edited fields" 草稿恢复，但实现层不能区分 "用户编辑过的值" 与 "上次自动写入的捕获值"，只要 `draftRes.title/description/content` 非空就强行覆盖，导致页面 B 的最新 capture 被页面 A 的草稿覆盖
  hypothesis_status: 强烈支持「draft 覆盖捕获」根因

- timestamp: 2026-05-06T00:27Z
  observation: `entrypoints/popup/components/SendForm.tsx:106-120` 每当 `props.titleValue / descriptionValue / contentValue / sendTo / prompt` 变化时，800ms 防抖后 `draftRepo.update({ title, description, content, send_to, prompt })`。注意：popup mount 时 App.tsx 把 capture 数据写入 `titleSig/descriptionSig/contentSig`（line 144-146），这会触发 SendForm 的 effect，在用户**完全不操作**的情况下也会把当前 capture 持久化进 popupDraft.title/description/content。下一次任意页面打开 popup → `draftRes.title` 非空 → 触发上一条 evidence 中的覆盖路径
  hypothesis_status: 闭环 — 解释了为什么在用户一无操作的情况下 stale data 也会出现

- timestamp: 2026-05-06T00:28Z
  observation: `background/dispatch-pipeline.ts:298-307` `succeedDispatch()` 中调用 `draftRepo.clear()`。这意味着只有 **dispatch 成功** 才清空 popupDraft；用户关闭 popup 不分发、分发失败、分发取消，popupDraft 都会残留 → 下一次打开任何页面的 popup 都被旧 capture 覆盖
  hypothesis_status: 解释了 reproduction 步骤 1→3 之间不需要点过 Confirm 也能复现

- timestamp: 2026-05-06T00:29Z
  observation: 综合 4 条证据，**根因确认**：popup 草稿恢复（D-35 / DSP-09）的实现把 capture 字段（title/description/content）与用户编辑字段（send_to/prompt）混为一谈，且 SendForm 的草稿持久化 effect 在 mount 时就会把 capture 自动写入草稿，使每次 popup 打开都进入"用 popupDraft 的 title/description/content 覆盖刚抓到的最新 capture"的稳定路径
  hypothesis_status: confirmed

## Resolution

root_cause: |
  popup 草稿恢复逻辑错误：`entrypoints/popup/App.tsx` mount 时，只要 popupDraft 中 `title/description/content` 非空，就用 popupDraft 覆盖刚通过 `capture.run` 拿到的最新 ArticleSnapshot 字段。结合 `SendForm.tsx` 的 800ms 防抖在 popup mount 后会把当前 capture 自动写入 popupDraft（即使用户毫无编辑），且 `draftRepo.clear()` 仅在 dispatch 成功路径调用，其他路径（关闭 popup、错误、取消）都让 popupDraft 残留。结果：第二次以后打开 popup 总是渲染上一次的 capture 数据。

fix: |
  在 popupDraft schema 增加 `url: string` 字段，记录 capture 字段最后一次写入时所在页面的 URL；popup mount 把 capture 字段（title/description/content）的草稿覆盖路径用 `if (draftRes.url && draftRes.url === captureRes.data.url)` URL 守护包起来。语义：(1) send_to/prompt 与 URL 无关，仍始终从草稿恢复（DSP-09 不变）；(2) 同页重开 popup → 用户编辑过的标题/描述/内容仍能恢复（DSP-09 不变）；(3) 跨页打开 popup → 草稿的 capture 字段不再污染新捕获（bug fixed）；(4) legacy 无 url 字段的旧草稿被视为不可信，不再覆盖任何捕获字段。

verification: |
  - npx tsc --noEmit → clean (0 errors)
  - npx vitest run → 197/197 passed (含新增 4 个 popup/stale-capture 单元测试)
  - npm run lint → 0 errors（4 个既有 any-type warnings 与本次无关）
  - npm run build → wxt 产出 chrome-mv3 完整 bundle (379.63 kB)，无错误
  - 关键回归保护: tests/unit/repos/popupDraft.spec.ts、tests/e2e/draft-recovery.spec.ts (DSP-09 同 URL 草稿恢复路径) 仍然通过

files_changed: |
  - shared/storage/items.ts: PopupDraft 接口 + POPUP_DRAFT_DEFAULT 新增 `url: string` 字段
  - entrypoints/popup/App.tsx: mount 时把 `if (draftRes.title) titleSig.value = ...` 等 3 行 capture-字段 override 包到 `if (draftRes.url && draftRes.url === captureRes.data.url)` URL 守护内
  - entrypoints/popup/components/SendForm.tsx: 800ms popupDraft 防抖写入时新增 `url: props.snapshot.url` 字段
  - tests/unit/popup/stale-capture.spec.ts: 4 个新单元测试覆盖 (a) 无草稿；(b) 同 URL + 草稿编辑标题恢复；(c) 跨 URL 时草稿不污染新捕获；(d) legacy 无 url 字段的草稿不污染

status: resolved
