# web2chat 维护指南 (Maintenance)

> Marketing 声明的 source-first → artifact-second → page-last 更新路径。
> 本文件**形式化**（formalizes，而非重新发明）`13-CONTENT-SOURCES.md` 的 Maintenance Rules（第 169–208 行），
> 让维护者在改动 marketing 页面之前，先命中权威源头。

## 平台列表 (Platform list)

1. **Source first：** 更新 `.planning/PROJECT.md` 的 Current shipped platform set 与 Key Decisions。
2. **Artifact second：** 更新 `13-CONTENT-SOURCES.md` 的 Platform Status 表与 Claims Matrix CLM-PLATFORM-01。
3. **Page last：** 更新 `apps/marketing/src/data/site-content.ts` 的 `supportedPlatforms` 与 Known limits 段落。
4. **Verify：** `pnpm verify:claims`（校验已发布平台名齐全 + 已移除平台不泄漏到宣传文案）。

## 隐私声明 (Privacy claims)

1. **Source first：** 更新 `PRIVACY.md` / `PRIVACY.zh_CN.md` 的隐私模型。
2. **Artifact second：** 更新 `13-CONTENT-SOURCES.md` 的 CLM-PRIVACY-01 与 Privacy / Permission Guardrails。
3. **Page last：** 更新 `apps/marketing/src/i18n/locales/{en,zh_CN}.json` 的 `trust.privacy.*` 键。
4. **Verify：** `pnpm verify:claims`（forbidden-wording 扫描，依据 CLM-PRIVACY-01）。

## 权限声明 (Permission claims)

1. **Source first：** 更新 `wxt.config.ts` 的 production manifest 分支（第 5–65 行）。
2. **Verify：** `pnpm verify:manifest`（manifest 形状）+ `pnpm verify:claims`（locale 文本 === built manifest 集合）。
3. **Artifact second：** 更新 `13-CONTENT-SOURCES.md` 的 CLM-PERM-01。
4. **Page last：** 更新 `apps/marketing/src/i18n/locales/{en,zh_CN}.json` 的 `trust.permissions.fact1`。

## 截图 / mockup / diagram / placeholder

1. **Source first：** 使用 `pnpm assets:screenshot`（从已构建运行的扩展重新生成素材）。
2. **Artifact second：** 更新 `13-CONTENT-SOURCES.md` 的 Asset Status Rules 元数据（version / date / owner / update trigger）。
3. **Page last：** 用正确打标的素材替换 `apps/marketing/src/components/proof/*` 中的对应 proof 模块。
4. **Verify：** `pnpm site:verify`（校验 proof-label 标记存在）。

## CTA 文案 (CTA text)

1. **Source first：** 校验 `apps/marketing/src/data/site-content.ts` 的 `REPO_URL` / `INSTALL_URL` 仍然解析且可访问。
2. **Artifact second：** 更新 `13-CONTENT-SOURCES.md` 的 Page Outline CTA 段落。
3. **Page last：** 更新 `apps/marketing/src/app.tsx` 的 Hero CTA 与底部 CTA `<CtaButton>` 用法。
4. **Verify：** `pnpm verify:readme`（README/PRIVACY/install anchor 一致性，CTA URL 同源校验）。

## 验证命令清单 (Verification command cheatsheet)

| 校验目标 | 命令 |
|----------|------|
| Manifest 形状（permissions / host_permissions / `MSG_*` 字段） | `pnpm verify:manifest` |
| Marketing 构建产物完整性 + 17 个 page markers | `pnpm site:build && pnpm site:verify` |
| README heading 对齐 + PRIVACY 文件存在 + install anchor | `pnpm verify:readme` |
| Marketing claims ↔ canonical source 一致性（跨源校验） | `pnpm verify:claims` |
| 截图 / mockup 重新生成 | `pnpm assets:screenshot` |
| 完整本地 CI 镜像（全量门禁） | `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest && pnpm site:build && pnpm site:verify && pnpm verify:readme && pnpm verify:claims` |

> **加载顺序不变式（load-bearing）：** `pnpm verify:manifest` 必须在 `pnpm verify:claims` 之前运行。
> `verify:manifest` 的首步是 `wxt build`，会产出 production 分支的 `.output/chrome-mv3/manifest.json`
>（无 `tabs`、无静态 `<all_urls>`）。若 `verify:claims` 先跑或基于 dev 构建，
> 将要么崩溃（manifest 缺失），要么对 dev manifest 静默 false-pass。

---

> 本文件只是把 `13-CONTENT-SOURCES.md` 的 Maintenance Rules（第 169–208 行）落到仓库根，
> 方便维护者一眼定位。所有 chain 的 4 步均可在该源文件逐条追溯——本文件不新增任何规则，
> 也不复制 Claims Matrix 的 forbidden-wording 列表（那些仍由 `13-CONTENT-SOURCES.md` + `scripts/verify-claims.ts` 持有）。
