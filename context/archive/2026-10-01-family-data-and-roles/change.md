---
change_id: family-data-and-roles
title: Family data and roles
status: archived
created: 2026-10-01
updated: 2026-10-04
archived_at: 2026-10-04T08:59:19Z
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

Implementation landed: migration + FORCE RLS, types, profile helper, smoke SQL.
Verified: `npx supabase db reset` + `scripts/family-rls-smoke.sql` → `family-rls-smoke: OK`.
Plan review (2026-10-01): F1–F3 FIXED in plan/brief.
Follow-up: `supabase/migrations/20261001202800_today_chores_child_column_lock.sql` (child UPDATE column lock).
Review: `context/changes/family-data-and-roles/reviews/plan-review.md`.
