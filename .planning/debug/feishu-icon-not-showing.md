---
status: diagnosed
trigger: "feishu platform icon not appearing in popup — shows default/unsupported icon instead"
created: 2026-05-17T10:00:00+08:00
updated: 2026-05-17T10:05:00+08:00
---

## Current Focus

hypothesis: iconKeyToVariant in SendForm.tsx has a hardcoded `known` array that does not include 'feishu', causing all feishu platform icon lookups to fall back to 'unsupported'
test: verified by reading the known array at line 472
expecting: array is missing 'feishu'
next_action: return diagnosis

## Symptoms

expected: pasting a feishu.cn or larksuite.com URL shows the feishu platform icon
actual: shows default/unsupported icon
errors: none
reproduction: paste https://xxx.feishu.cn/messenger/xxx into popup send_to input
started: discovered during UAT testing of phase 12

## Eliminated

(none needed — root cause found directly)

## Evidence

- timestamp: 2026-05-17T10:02:00+08:00
  checked: registry.ts feishu match function
  found: match function correctly handles *.feishu.cn and *.larksuite.com hostnames and /next/messenger and /messenger path prefixes
  implication: registry-level platform detection is correct

- timestamp: 2026-05-17T10:03:00+08:00
  checked: PlatformIcon.tsx
  found: PlatformVariant type includes 'feishu', and component renders feishu SVG when variant === 'feishu'
  implication: icon rendering layer is correct

- timestamp: 2026-05-17T10:04:00+08:00
  checked: SendForm.tsx iconKeyToVariant function (lines 467-476)
  found: The `known` array at line 472 is `['mock', 'openclaw', 'discord', 'slack', 'telegram']` — it does NOT include 'feishu'. When the adapter's iconKey is 'platform_icon_feishu', iconKeyToVariant strips the prefix to get 'feishu', checks against known, and returns 'unsupported'.
  implication: THIS IS THE ROOT CAUSE. The hardcoded known array was not updated when the feishu adapter was added to registry.ts.

- timestamp: 2026-05-17T10:04:30+08:00
  checked: SendForm.tsx iconForPlatformId function (lines 484-489)
  found: This function looks up the adapter registry entry and calls iconKeyToVariant — which is where the failure occurs. The Combobox leadingIcon prop receives 'unsupported' instead of 'feishu'.
  implication: Confirms the broken path: detectPlatformId returns 'feishu' correctly, but iconForPlatformId -> iconKeyToVariant downgrades it to 'unsupported'.

## Resolution

root_cause: The `known` array in `iconKeyToVariant()` (SendForm.tsx line 472) is a hardcoded allowlist of platform icon variants that does not include 'feishu'. When the feishu adapter was added to registry.ts, this validation array was not updated, causing all feishu icon lookups to fall back to 'unsupported'.
fix: Add 'feishu' to the `known` array in SendForm.tsx line 472
verification: (not performed — find_root_cause_only mode)
files_changed: [entrypoints/popup/components/SendForm.tsx]
