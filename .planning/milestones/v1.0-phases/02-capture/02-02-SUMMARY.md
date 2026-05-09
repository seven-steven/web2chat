---
plan: "02-02"
phase: 02-capture
status: complete
started: "2026-04-30T10:10:00Z"
completed: "2026-04-30T10:25:00Z"
self_check: passed
---

# Summary: Plan 02-02 — 扩展消息协议层

## What Was Built

扩展 shared/messaging 类型契约，为 Phase 2-5 提供统一类型锚点：

1. **ErrorCode 联合扩展** — 新增 `RESTRICTED_URL`、`EXTRACTION_EMPTY`、`EXECUTE_SCRIPT_FAILED`
2. **ArticleSnapshotSchema** — 5 字段 zod schema（title/url/description/create_at/content），url 用 `z.string().url()`，create_at 用 `z.string().datetime()`
3. **capture.run 路由** — 注册到 ProtocolMap + schemas，返回 `Result<ArticleSnapshot>`
4. **Barrel re-export** — index.ts 导出 ArticleSnapshot 类型和 ArticleSnapshotSchema 值

## Key Files

| File | Action | What Changed |
|------|--------|-------------|
| `shared/messaging/result.ts` | modified | ErrorCode 联合 1→4 码 |
| `shared/messaging/protocol.ts` | modified | +ArticleSnapshotSchema、+capture.run 路由、+schemas 条目 |
| `shared/messaging/index.ts` | modified | +ArticleSnapshot 类型导出、+ArticleSnapshotSchema 值导出 |
| `tests/unit/messaging/errorCode.spec.ts` | created | ErrorCode 三码编译期+运行期验证 |

## Self-Check

- [x] `pnpm typecheck` 通过
- [x] `pnpm test` 全部 19 测试通过
- [x] grep `RESTRICTED_URL` in result.ts ✓
- [x] grep `ArticleSnapshotSchema` in protocol.ts ✓
- [x] grep `capture.run` in protocol.ts ✓
- [x] grep `ArticleSnapshot` in index.ts ✓
- [x] `meta.bumpHello` 路由未被删除

## Deviations

无偏差。
