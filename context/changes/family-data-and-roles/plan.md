# Family data and roles Implementation Plan

## Overview

Deliver the F-01 data and access contract for Obowiązki: families, parent/child profiles, today chores with `child_checked_at` / `parent_confirmed_at`, RLS isolation, parent bootstrap on signup, TypeScript types, and a SQL smoke script — without chore UI or create-child API (S-01).

## Current State Analysis

- Auth SSR exists (`src/lib/supabase.ts`, `src/middleware.ts`, signup/signin APIs) with no role metadata.
- No domain migrations, no `src/types.ts`, no RLS for family data.
- Roadmap F-01 unlocked S-01…S-05; child account creation left as a non-blocking unknown (resolved in planning: parent creates child).

### Key Discoveries:

- Signup is email/password only (`src/pages/api/auth/signup.ts`) — bootstrap must be DB-side on `auth.users` insert.
- Child users must skip parent bootstrap via `raw_user_meta_data.role = 'child'` so S-01 can attach them to the parent's family.
- Repo has no unit test runner; verification is migration + SQL smoke + lint/astro check.

## Desired End State

- `families`, `profiles`, `today_chores` exist with RLS.
- New parent signups get a family + parent profile automatically.
- App code can read the current profile via `getCurrentProfile`.
- Smoke SQL documents isolation and the done rule.

## What We're NOT Doing

- UI for add-child, lists, check-off, confirm, delete
- Admin/service-role create-child API (S-01)
- Hard SQL limit of 2 children
- Observability / auto-deploy
- Chore catalog or calendar variants

## Implementation Approach

One migration for schema + RLS + bootstrap trigger; TypeScript domain types and a thin profile reader; SQL smoke under `scripts/` run against local Supabase after `db reset`.

## Critical Implementation Details

- **Timing & lifecycle:** Public signup → trigger creates family + parent. Child creation (S-01) must set `raw_user_meta_data.role = 'child'` before insert into `auth.users`, then insert `profiles` as the parent (RLS policy `profiles_insert_parent_for_family`).
- **State sequencing:** `parent_confirmed_at` requires `child_checked_at` (table CHECK). Done in app = both non-null (`isDone`).
- **Child UPDATE column lock:** RLS alone cannot restrict which columns a role updates. Enforce with a BEFORE UPDATE trigger on `today_chores`: when `current_profile_role() = 'child'`, allow changes only to `child_checked_at` (and `updated_at` if present); raise on any other column change. Do not rely on app-only enforcement.

## Phase 1: Schema + RLS

### Overview

Create domain tables and per-operation RLS policies.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/20261001180000_family_data_and_roles.sql`

**Intent:** Create `families`, `profiles` (role parent|child), `today_chores` with dual timestamps; enable RLS so parents see family chores, children see only their own rows, children cannot delete, parents delete only unconfirmed rows. Child UPDATE is DB-enforced to status fields only (`child_checked_at`) — children must not be able to change `title` or other identity columns.

**Contract:** FKs to `auth.users` and `families`; indexes on `family_id` and `(child_profile_id, chore_date)`; CHECK that confirmed implies checked; helpers `current_family_id()` / `current_profile_role()`; BEFORE UPDATE trigger (or equivalent) rejects child mutations of `title`, `family_id`, `child_profile_id`, `chore_date`, `parent_confirmed_at`.

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly via `npx supabase db reset` (or migration up) against local Supabase
- SQL file parses without syntax errors

#### Manual Verification:

- Tables and RLS visible in Studio/SQL after reset

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Parent bootstrap

### Overview

Idempotent family + parent profile on auth user insert (non-child).

### Changes Required:

#### 1. Trigger in migration

**File**: `supabase/migrations/20261001180000_family_data_and_roles.sql` (`handle_new_user` + `on_auth_user_created`)

**Intent:** After `auth.users` insert, if metadata role is not `child`, create a family and parent profile. Skip when profile already exists.

**Contract:** Default role parent; children skip trigger and are profiled in S-01.

### Success Criteria:

#### Automated Verification:

- After parent user insert, exactly one parent profile and one family exist
- Child metadata role skips profile creation

#### Manual Verification:

- Re-running ensure path does not duplicate family for existing parent

---

## Phase 3: Types + read helper

### Overview

Expose domain contract to later slices.

### Changes Required:

#### 1. Domain types

**File**: `src/types.ts`

**Intent:** Define `ProfileRole`, `Family`, `Profile`, `TodayChore`, `isDone`, and document synthetic email convention for children.

**Contract:** `isDone` true only when both timestamps are non-null.

#### 2. Profile helper

**File**: `src/lib/profile.ts`

**Intent:** Read the current user's profile via existing SSR Supabase client.

**Contract:** `getCurrentProfile(supabase) → Promise<Profile | null>`.

### Success Criteria:

#### Automated Verification:

- `npx astro check` passes
- `npx eslint src/types.ts src/lib/profile.ts` passes

#### Manual Verification:

- Types importable from `@/types`; no UI changes required

---

## Phase 4: Smoke verification

### Overview

Repeatable proof of isolation and done/delete rules.

### Changes Required:

#### 1. SQL smoke

**File**: `scripts/family-rls-smoke.sql`

**Intent:** Seed parent + two children, chores; assert child isolation, parent confirm after check-off, delete blocked when confirmed / allowed when unconfirmed. Rolls back at end.

**Contract:** Ends with `NOTICE 'family-rls-smoke: OK'` when run as postgres against local DB after migrations.

### Success Criteria:

#### Automated Verification:

- Script completes successfully against local Supabase (`psql … -f scripts/family-rls-smoke.sql`)

#### Manual Verification:

- Results match isolation + done-rule expectations

---

## Testing Strategy

### Unit Tests:

- None (no unit runner in repo)

### Integration Tests:

- `scripts/family-rls-smoke.sql` against local Supabase

### Manual Testing Steps:

1. `npx supabase start` then `npx supabase db reset`
2. Run `scripts/family-rls-smoke.sql` via `psql`
3. Confirm notice `family-rls-smoke: OK`

## Performance Considerations

Small family scale; indexes on family and child+date are sufficient for MVP.

## Migration Notes

Forward-only migration; local rollback via `db reset`. Empty `supabase/seed.sql` satisfies config `sql_paths`.

## References

- Roadmap F-01: `context/foundation/roadmap.md`
- PRD Access Control / Business Logic: `context/foundation/prd.md`
- Auth client: `src/lib/supabase.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Schema + RLS

#### Automated

- [x] 1.1 Migration applies cleanly via `npx supabase db reset` (or migration up) against local Supabase
- [x] 1.2 SQL file parses without syntax errors

#### Manual

- [x] 1.3 Tables and RLS visible in Studio/SQL after reset

### Phase 2: Parent bootstrap

#### Automated

- [x] 2.1 After parent user insert, exactly one parent profile and one family exist
- [x] 2.2 Child metadata role skips profile creation

#### Manual

- [x] 2.3 Re-running ensure path does not duplicate family for existing parent

### Phase 3: Types + read helper

#### Automated

- [x] 3.1 `npx astro check` passes
- [x] 3.2 `npx eslint src/types.ts src/lib/profile.ts` passes

#### Manual

- [x] 3.3 Types importable from `@/types`; no UI changes required

### Phase 4: Smoke verification

#### Automated

- [x] 4.1 Script completes successfully against local Supabase (`psql … -f scripts/family-rls-smoke.sql`)

#### Manual

- [x] 4.2 Results match isolation + done-rule expectations
