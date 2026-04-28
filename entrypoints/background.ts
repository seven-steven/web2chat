// Placeholder background entrypoint for Phase 1 Plan 01-1 scaffold.
//
// WXT requires at least one entrypoint to run `wxt prepare` / `wxt build`.
// The full SW lifecycle (top-level listeners, RPC routing, storage migration)
// is implemented in Plan 03 (messaging-sw). This stub will be replaced there.
//
// IMPORTANT: per FND-02, Plan 03 must register every listener at the top level
// of `defineBackground(() => { ... })`'s main function (no top-level await).
export default defineBackground(() => {
  // Intentionally empty: scaffold-only placeholder.
});
