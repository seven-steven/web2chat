---
status: complete
quick_id: 260509
description: 添加 GitHub Actions CI + Release workflow，更新文档添加 release 安装说明
date: 2026-05-09
---

## Summary

### 完成内容

1. **创建 `.github/workflows/release.yml`** — tag `v*` 触发的 release workflow
   - CI 全流程：typecheck → lint → test → verify:manifest → zip
   - 使用 `softprops/action-gh-release@v2` 创建 GitHub Release，上传 zip 制品
   - 自动生成 release notes

2. **更新 README.md（中文）** — 添加"从 Release 下载"安装说明
3. **更新 README.en.md（英文）** — 同步添加"Download from Release"安装说明

### 文件变更

- 新增: `.github/workflows/release.yml`
- 修改: `README.md`
- 修改: `README.en.md`
