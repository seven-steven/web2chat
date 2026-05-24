# Quick Task Summary — 260524-9lb-doc-chrome-web-store

- 状态：完成
- 目标：新增 `doc/chrome-web-store/` 作为 Chrome Web Store 上架物料集中入口，并仅迁移低风险模板资产。

## 产物

- `doc/chrome-web-store/README.md`
- `doc/chrome-web-store/assets/templates/`
- `scripts/screenshot-assets.mjs`

## 执行结果

1. 新增 `doc/chrome-web-store/README.md`，集中索引现有上架文案、隐私政策、截图脚本、图标目录与分发校验文档。
2. 明确保留 `STORE-LISTING*.md`、`PRIVACY*.md`、`public/icon/` 原路径，避免打断 README、校验脚本与构建资源链路。
3. 将 `.store-assets/` 迁移到 `doc/chrome-web-store/assets/templates/`。
4. 更新 `scripts/screenshot-assets.mjs` 的模板源目录与提示文本到新路径。
5. 验证 `pnpm assets:screenshot` 与 `pnpm verify:readme` 通过，引用检查未发现本次整理导致的断链。

## 验证命令

- `pnpm assets:screenshot`
- `pnpm verify:readme`
- `rg -n "STORE-LISTING(\.en)?\.md|PRIVACY(\.zh_CN)?\.md|doc/chrome-web-store/assets/templates|public/icon" . --glob '!node_modules' --glob '!.git'`

## 偏差

- 无。按 plan 做了最小范围整理。
