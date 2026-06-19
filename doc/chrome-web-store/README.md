# Chrome Web Store 物料入口

此目录是仓库内 Chrome Web Store 上架物料的统一人工入口。

本 quick task 只做低风险整理：新增 `doc/chrome-web-store/` 作为索引中心，并把仅被截图脚本消费的 HTML 模板集中到这里；不会把现有根目录文案或扩展构建资源改成新路径。

## 物料索引

### 上架准备清单

- [`./MATERIALS-CHECKLIST.md`](./MATERIALS-CHECKLIST.md) — Chrome Web Store Developer Dashboard 上架材料清单；明确每次上架必须准备中英文文案、中英文截图/宣传图、版本号更新和 zip 打包产物。
- [`./SUBMISSION-v1.2.0.md`](./SUBMISSION-v1.2.0.md) — 当前最新已交付版本 v1.2.0 的实际上架填写材料；后续提交 Dashboard 时优先使用该文件。

### 上架文案

- [`../../STORE-LISTING.md`](../../STORE-LISTING.md) — 中文版商店文案唯一来源；包含字段说明与 Developer Dashboard 可粘贴纯文本区块。
- [`../../STORE-LISTING.en.md`](../../STORE-LISTING.en.md) — 英文版商店文案唯一来源；包含字段说明与 Developer Dashboard 可粘贴纯文本区块。
- [`../../PRIVACY.md`](../../PRIVACY.md) — 英文隐私政策；本次保留在仓库根目录，因为 README 链接与 `scripts/verify-readme-anchors.ts` 依赖该精确路径。
- [`../../PRIVACY.zh_CN.md`](../../PRIVACY.zh_CN.md) — 中文隐私政策；本次保留在仓库根目录，因为 README 链接与 `scripts/verify-readme-anchors.ts` 依赖该精确路径。

### 截图与宣传图素材

- [`./assets/templates/`](./assets/templates/) — Chrome Web Store 截图与 promo 图 HTML 模板；由 `scripts/screenshot-assets.mjs` 读取并生成 `.output/store-assets/`。
- [`../../scripts/screenshot-assets.mjs`](../../scripts/screenshot-assets.mjs) — 截图生成脚本；已改为从本目录下的模板路径读取源文件。

### 扩展资源与校验参考

- [`../../public/icon/`](../../public/icon/) — 扩展图标资源；本次保留在原位，因为它属于扩展构建/打包资源树，不做迁移。
- [`../../.planning/milestones/v1.0-phases/07-distribution/07-VERIFICATION.md`](../../.planning/milestones/v1.0-phases/07-distribution/07-VERIFICATION.md) — 分发阶段校验记录，可作为上架核对参考。

## 边界说明

- `doc/chrome-web-store/` 是统一的人类可读入口，不是一次性路径重构。
- 本次只迁移低风险的模板资产，不移动 `STORE-LISTING*.md`、`PRIVACY*.md`、`public/icon/`。
- 若后续要真正收敛根目录文案路径，需要同时更新 README、校验脚本和所有相对链接，再单独开 plan 处理。
