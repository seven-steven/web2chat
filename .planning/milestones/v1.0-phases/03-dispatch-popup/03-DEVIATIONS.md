# Phase 3 Deviations from CONTEXT.md

> One-time deviation log. Captures decisions that ship code different from the
> strict letter of `03-CONTEXT.md` while preserving its intent.

---

## D-34: ok-badge auto-clear timing 5s -> 30s

**Source decision:** CONTEXT.md "3. Dispatch state machine + SW 重启韧性" -- D-34 specifies:
> - `ok` = `ok` (绿色) — dispatch 进入 `done` 时设置；通过 `chrome.alarms.create('badge-clear:'+id, { delayInMinutes: 5/60 })` 5 秒后自清

**Deviation:** ok-badge auto-clear scheduled at **30 seconds** (`delayInMinutes: 0.5`), not 5 seconds.

**Reason -- chrome.alarms minimum delay (production):**
- Chrome MV3 `chrome.alarms.create({ delayInMinutes })` has a minimum effective
  delay of **30 seconds** in production mode (Chrome 120+; was 60s before).
  Sub-30s values are silently clamped to 30s and produce a console warning:
  "Alarm delayInMinutes is less than minimum of 0.5".
- In **unpacked dev mode** (`chrome://extensions -> Load unpacked`), sub-30s
  delays are honored -- 5s would work locally but not in production. This
  asymmetry would let "5s clears" appear correct during dev and silently fail
  after Web Store packaging.
- Source: [chrome.alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)

**Considered alternatives:**
1. **`setTimeout` in SW** -- rejected. SW idle-suspends after ~30s; setTimeout
   does not survive across SW restart. Same symptom as the clamp, plus violates
   CLAUDE.md "约定" ("跨事件调度只用 chrome.alarms").
2. **Clear ok-badge only on next popup mount** -- rejected. Equivalent to err
   behavior; loses the "short-lived green flash" success signal that's the
   point of D-34's tri-state.
3. **Keep 5s literal in code** -- rejected. Production silent-clamp is the
   worst failure mode (works in dev, breaks in production with no error).

**Selected: 30s.** PM intent of "short-lived green flash after success" is
preserved at coarser grain; user has typically navigated away from the badge
long before 30s elapse, so the 25s lengthening is invisible in normal use.

**Implementation site:** `background/dispatch-pipeline.ts` -- `chrome.alarms.create('badge-clear:'+id, { delayInMinutes: 0.5 })` after dispatch reaches `done` state. The constant is exported as `BADGE_OK_CLEAR_MINUTES = 0.5` for spec assertions.

**Test note:** Phase 3 unit test `tests/unit/dispatch/state-machine.spec.ts` asserts the alarm is created with `delayInMinutes: 0.5`. Phase 3 e2e (Plan 08 dispatch.spec.ts) does NOT assert badge clearing inside test (would require 35s timeout); manual verification is documented in 03-VALIDATION.md "Manual-Only Verifications".

**Reversibility:** if Chrome later relaxes the alarms minimum (or a popup-side timer pattern proves viable), Phase 6 polish can revisit. Until then, 30s is the binding contract.
