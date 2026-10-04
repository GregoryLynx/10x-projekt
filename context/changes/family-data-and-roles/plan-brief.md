# Family data and roles — Plan Brief

> Full plan: `context/changes/family-data-and-roles/plan.md`

## What & Why

Ship the minimal data/access foundation so later slices can implement the parent↔child chore loop. Without families, roles, today-chore rows, and RLS, S-01 cannot be planned safely.

## Starting Point

Astro + Supabase auth SSR works (cookie session, signup/signin). There were no domain tables, migrations, or role-aware policies.

## Desired End State

Schema + RLS (FORCE RLS) live in Supabase migrations; new parents auto-get a family/profile; TypeScript types and `getCurrentProfile` expose the contract; SQL smoke documents isolation and the done rule. Child UPDATE is DB-locked to `child_checked_at` only (trigger), not app-only.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Child accounts | Parent creates (S-01) | Matches PRD “parent adds child”; schema skips bootstrap when `role=child` |
| F-01 scope | Data + RLS + types only | Keeps foundation vertical-unlock without UI scope creep |
| Child login | Synthetic email | Works with email/password Auth when kids lack email |
| Family creation | Auto on parent signup | Zero manual setup for v1 |
| Chore state | Two timestamps | Auditable; done = both non-null |
| Isolation | RLS + FORCE RLS + profile role | Matches repo RLS convention; table owners cannot bypass |
| Child UPDATE | Trigger column lock | RLS cannot restrict columns; child must not edit `title` |
| Child limit | Soft (app later) | Avoid hard DB constraint before S-05 |

## Scope

**In scope:** migrations (tables, RLS, FORCE RLS, bootstrap trigger, child UPDATE column lock), `src/types.ts`, `src/lib/profile.ts`, `scripts/family-rls-smoke.sql`, empty seed stub

**Out of scope:** chore UI/API, admin create-child, hard limit of 2 children, notifications, observability

## Architecture / Approach

`auth.users` → trigger → `families` + parent `profiles`; children attached later with metadata `role=child`. `today_chores` keyed by family + child with check/confirm timestamps; RLS helpers read current family/role; BEFORE UPDATE trigger locks child column writes to `child_checked_at`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schema + RLS | Tables, policies, child column lock | Policy recursion / wrong isolation |
| 2. Bootstrap | Parent family on signup | Child signup accidentally creating a family |
| 3. Types + helper | App contract | Untyped Supabase queries |
| 4. Smoke | Proof script | Local Supabase/Docker not running |

**Prerequisites:** Local Supabase (Docker) for migration apply + smoke; `SUPABASE_*` already used by auth.
**Estimated effort:** One focused implementation session across 4 phases (smoke gated on Docker).

## Open Risks & Assumptions

- S-01 must use service-role user creation with `role=child` metadata or bootstrap will treat children as parents.
- Child column lock landed in `20261001202800_today_chores_child_column_lock.sql`; smoke asserts title mutation fails.

## Success Criteria (Summary)

- Migration present and applies via `db reset`
- Parent bootstrap + child-skip covered by smoke (`family-rls-smoke: OK` verified locally)
- Child cannot mutate `title` (DB trigger)
- Lint/typecheck clean for new TS files
