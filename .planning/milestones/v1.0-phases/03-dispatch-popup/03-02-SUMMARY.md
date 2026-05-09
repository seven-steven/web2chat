---
phase: 03-dispatch-popup
plan: 02
status: complete
started: "2026-05-01T14:30:00.000Z"
completed: "2026-05-01T19:15:00.000Z"
requirements_addressed: [DSP-02, DSP-03, DSP-04, DSP-06, DSP-09, STG-03]
---

## Plan 03-02: Storage Repos

**Objective:** Land the typed-repo business-method layer for Phase 3.

### Deliverables

1. **5 typed storage items** in `shared/storage/items.ts` — sendToHistory, promptHistory, bindings, popupDraft (4 storage.local) + activeDispatchPointer (1 storage.session). All 4 local items declare no-op identity migration for WXT parity.
2. **history repo** — hybrid score formula `exp(-Δt/τ) + 0.3·log(count+1)` with τ=7d, CAP=50, TOP_N=8. Dedupe + sort + truncate. sendTo + prompt share same formula via `addCore`/`topNCore`/`removeCore` generics. `resetAllHistory()` empties both lists.
3. **binding repo** — `upsert(send_to, prompt, { mark_dispatched })` with never-dispatched-marker, `get(send_to)`, `resetAll()`.
4. **popupDraft repo** — `get(): Promise<PopupDraft | null>` null contract (epoch sentinel normalisation), `update(partial)`, `clear()`.
5. **dispatch repo** — per-key `dispatch:<id>` session writes (Pattern 2 race mitigation). `set`/`get`/`remove`/`listAll` + `setActive`/`getActive`/`clearActive` pointer.
6. **3 spec files** — 27 tests total covering score monotonicity, cap, dedupe, binding lifecycle, null contract, per-key writes, active pointer.

### Commits

- `22cb6f5` feat(03-02): add 5 typed storage items + extend barrel
- `98bb79b` feat(03-02): add history + binding repos with hybrid score + dedupe
- `97c1bd3` feat(03-02): add popupDraft + dispatch repos with null contract + fix test isolation

### Deviations

- **Test isolation fix:** `fakeBrowser.reset()` alone didn't fully clear WXT storage state between tests in the same describe block. Added explicit `await sendToHistoryItem.setValue([])` (and equivalent for other items) in `beforeEach` alongside `fakeBrowser.reset()`. This pattern should be followed in future storage tests.

### Key Constants

- TAU_MS = 7 days, FREQ_WEIGHT = 0.3, CAP = 50, TOP_N = 8
- Dispatch key prefix: `dispatch:`, active pointer key: `dispatch:active`
- popupDraft sentinel: `updated_at === new Date(0).toISOString()`
