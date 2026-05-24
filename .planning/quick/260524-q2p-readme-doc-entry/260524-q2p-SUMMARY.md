# 260524-q2p-readme-doc-entry Summary

## Scope
- 在 `README.md` 增加 `./doc/chrome-web-store/README.md` 入口。
- 在 `README.en.md` 增加 `./doc/chrome-web-store/README.md` 入口。
- 删除 `README.en.md` 重复的 `Chrome Web Store` 安装段落，仅保留一处。
- 保持 `README.md -> ./PRIVACY.zh_CN.md` 与 `README.en.md -> ./PRIVACY.md` 不变。
- 未迁移 `PRIVACY*.md`、`STORE-LISTING*.md`。

## Changes
- `README.md`：在安装章节的 Chrome Web Store 入口下新增物料索引链接。
- `README.en.md`：在安装章节的 Chrome Web Store 入口下新增物料索引链接，并去掉重复的 Chrome Web Store 段落。

## Verification
- Requested command: `pnpm tsx /Users/seven/data/coding/projects/seven/web2chat/scripts/verify-readme-anchors.ts`
  - Result: failed in this environment with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` / `Command "tsx" not found`.
- Fallback run: `/Users/seven/data/coding/projects/seven/web2chat/node_modules/.bin/tsx /Users/seven/data/coding/projects/seven/web2chat/scripts/verify-readme-anchors.ts`
  - Result: passed — `[verify-readme] OK -- both READMEs have 8 sections, PRIVACY files present`

## Commit
- Source/doc changes committed separately; quick artifacts intentionally not committed.
