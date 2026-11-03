---
change_id: testing-isolation-and-done-rule
title: Rollout phase 1 — isolation, done-rule, and today boundary
status: archived
created: 2026-11-03
updated: 2026-11-03
archived_at: 2026-11-03T22:27:39Z
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Izolacja i reguła zrobione".
Risks covered: #1 child sees a sibling list or checks off a sibling chore; #2 a chore counts as done before the parent confirms, or stays not-done after confirmation; #5 a yesterday chore shows on today's list or can be checked off as today.
Test types planned: Vitest + integration.
Risk response intent: #1 prove two children each see only their own list and a foreign check-off does not change the row; #2 prove check-off leaves the item not done, both roles see it done after confirm, and a second confirm does not change the timestamp; #5 prove a yesterday row is absent from today's list and cannot be checked off as today.
After creating the folder, follow the downstream continuation rule.
