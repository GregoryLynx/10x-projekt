---
date: 2026-11-03T21:23:05+01:00
researcher: Grok 4.7
git_commit: 2294649ac09f96a335a13e8eedb9666eaa86d43d
branch: master
repository: 10x-projekt
topic: "Ground rollout phase 1: sibling isolation, done-rule, and the today boundary"
tags: [research, codebase, chores, testing]
status: complete
last_updated: 2026-11-03
last_updated_by: Grok 4.7
---

# Research: Ground rollout phase 1: sibling isolation, done-rule, and the today boundary

**Date**: 2026-11-03T21:23:05+01:00
**Researcher**: Grok 4.7
**Git Commit**: 2294649ac09f96a335a13e8eedb9666eaa86d43d
**Branch**: master
**Repository**: 10x-projekt

## Research Question

For rollout phase 1 of `context/foundation/test-plan.md` ("Izolacja i reguła zrobione"), where do risks #1, #2, and #5 actually fail or hold, what do the existing smoke scripts already assert, and which test layer can prove the behaviors without copying the implementation?

## Summary

At commit `2294649`, on the paths inspected below, the three risks are behaviors the code already implements. They are not missing features.

A child dashboard read keeps a `today_chores` row when `child_profile_id` equals that child's profile id and `chore_date` equals `warsawToday()` (`src/pages/dashboard.astro:167-172`). Check-off uses the same three predicates and, when that select returns no row, redirects to `/dashboard?error=That chore is not on today's list` without calling `update` (`src/pages/api/family/chore-check.ts:45-58`). RLS `today_chores_select` also limits a child to `child_profile_id = auth.uid()` and does not mention `chore_date` (`supabase/migrations/20261001180000_family_data_and_roles.sql:163-168`).

A chore is treated as done by `isDone` when both timestamps are non-null (`src/types.ts:37-38`). The parent screen then places that row under the heading "Done" (`src/components/family/ParentToday.tsx:208`, `src/components/family/ParentToday.tsx:222`). The child screen does not use that heading. `checkedOff` is `chores.filter` where `childCheckedAt !== null` (`src/components/family/ChildToday.tsx:62`), and that array is rendered under "Checked off" (`src/components/family/ChildToday.tsx:73`). Undo is omitted when `parentConfirmedAt` is set (`src/components/family/ChildToday.tsx:47`). A second confirm, when the loaded row already has `parent_confirmed_at`, returns `/dashboard?confirmed=1` before the update (`src/pages/api/family/chore-confirm.ts:62-64`). That is the same redirect the handler returns after an update that reported no error (`src/pages/api/family/chore-confirm.ts:76-80`).

`warsawToday()` asks `Intl` for the current instant's year, month, and day in `Europe/Warsaw` (`src/lib/today.ts:1-9`). This session did not execute `format()`, so the exact characters are not recorded here. The create handler stores that function's return value (`src/pages/api/family/chores.ts:63-67`). The column default is a UTC date (`supabase/migrations/20261001180000_family_data_and_roles.sql:29`) and is not the value this insert sends.

`scripts/smoke.mjs` asserts eight auth HTTP results and no chore behavior (`scripts/smoke.mjs:39-58`). `scripts/family-rls-smoke.sql` asserts that child A's `count(*)` is 1 when two current-date chores exist (`scripts/family-rls-smoke.sql:109-115`). It does not switch the JWT to child B, does not compare a second `parent_confirmed_at`, and does not insert a non-today `chore_date`. CI job `smoke` runs `npm run smoke` and does not run the SQL file (`.github/workflows/ci.yml:49-53`).

The cheapest proof is an HTTP integration with cookie sessions, the same shape as `scripts/smoke.mjs`, plus a read of the stored timestamps. A unit test that imports `isDone` would repeat `src/types.ts:38`. The Astro Container API renders component HTML and does not run these Supabase filters.

## Detailed Findings

### Risk #1 — sibling list and sibling check-off

`getCurrentProfile` loads the `profiles` row whose `id` equals `auth.getUser()`'s user id (`src/lib/profile.ts:22-30`). On the child branch, the dashboard queries `today_chores` with `.eq("child_profile_id", profile.id)` and `.eq("chore_date", warsawToday())` (`src/pages/dashboard.astro:167-172`). That query uses `createClient` from the request cookies (`src/pages/dashboard.astro:81`). `createAdminClient` on this page is used for `auth.admin.getUserById` to fill a login email (`src/pages/dashboard.astro:98-117`). The chore select at lines 133-138 and 167-172 is the cookie client, not that admin client.

The parent read loads at most two child profiles in the parent's family (`src/pages/dashboard.astro:85-91`, then `slice(0, 2)` at line 101) and then chores with `.in("child_profile_id", allowedIds)` plus the same date equality (`src/pages/dashboard.astro:133-138`). RLS lets a parent select family rows and lets a child select rows whose `child_profile_id` equals `auth.uid()` (`supabase/migrations/20261001180000_family_data_and_roles.sql:163-168`). The policy text has no `chore_date` term.

Check-off rejects a non-child before the query (`src/pages/api/family/chore-check.ts:29-32`). The lookup requires `id`, `child_profile_id = profile.id`, and `chore_date = warsawToday()` (`src/pages/api/family/chore-check.ts:45-51`). No row produces the redirect at lines 56-57 and does not reach `update` at lines 72-79. The update repeats those three filters and writes `child_checked_at` (`src/pages/api/family/chore-check.ts:72-78`).

A parent adds each child with the same `POST` body: `display_name`, `login`, `password` (`src/pages/api/family/children.ts:42-47`). When the parent-session count of child profiles in that family is at least 2, the handler redirects with "This family already has two children." (`src/pages/api/family/children.ts:54-66`). The admin `createUser` call sets email `` `${login}@family.local` `` and `user_metadata.role` to `"child"` (`src/pages/api/family/children.ts:73-77`). The profile insert sets `id` to that new user id and `family_id` to the parent's family (`src/pages/api/family/children.ts:84-90`). `handle_new_user` returns before creating a family when `raw_user_meta_data.role` is `child` (`supabase/migrations/20261001180000_family_data_and_roles.sql:84-88`). This session did not run Auth, so the copy from `user_metadata` into `raw_user_meta_data` is not observed here.

`scripts/family-rls-smoke.sql` inserts one chore for child A and one for child B, both with `current_date` (`scripts/family-rls-smoke.sql:101-107`), then requires child A's visible count to be 1 (`scripts/family-rls-smoke.sql:109-115`). The script does not set `request.jwt.claim.sub` to child B in the lines inspected (the child subject set in this file is the one at line 110).

The hot-spot directories `src/pages` and `src/pages/api` match these read and check-off filters. The RLS policy is an additional gate in `supabase/migrations`, which the 30-day scan recorded as 0 commits. That does not make the page citation misleading. A test that runs the SQL script and does not call the HTTP handlers can miss a cookie-client query that drops `child_profile_id` while RLS still hides the row, and it can miss the HTTP redirect. The user-visible proof is two cookie sessions reading `/dashboard` and one child posting the other child's chore id, then reading that row's `child_checked_at` again.

The shared error string is a weak oracle. The missing-row branch does not say whether `id`, `child_profile_id`, or `chore_date` failed (`src/pages/api/family/chore-check.ts:45-57`).

### Risk #2 — done after confirm, and a second confirm

`isDone` returns the conjunction of the two timestamps being non-null (`src/types.ts:37-38`). `ParentToday` calls it as `choreIsDone` (`src/components/family/ParentToday.tsx:40-45`) and splits rows into "To do", "Waiting for confirmation", and "Done" (`src/components/family/ParentToday.tsx:206-222`). `ChildToday` does not call `isDone`. Its split is `childCheckedAt === null` versus not (`src/components/family/ChildToday.tsx:61-62`). When `parentConfirmedAt` is set, the Undo form is omitted (`src/components/family/ChildToday.tsx:47`). Neither component renders the timestamp string; grep of `src/components/family` found `parentConfirmedAt` used for that lock and for `choreIsDone`, not as visible text.

Confirm allows a parent (`src/pages/api/family/chore-confirm.ts:28-31`). The lookup is `id` plus `chore_date = warsawToday()` and does not add `child_profile_id` (`src/pages/api/family/chore-confirm.ts:43-48`). A null `child_checked_at` redirects with "That chore has not been checked off" before any update (`src/pages/api/family/chore-confirm.ts:59-61`). A row that already has `parent_confirmed_at` redirects to `/dashboard?confirmed=1` before any update (`src/pages/api/family/chore-confirm.ts:62-64`). The first-write update sets `parent_confirmed_at` and `updated_at` to the same `new Date().toISOString()` value and adds `.is("parent_confirmed_at", null)` (`src/pages/api/family/chore-confirm.ts:66-74`). If `updated.error` is absent, the handler redirects to the same `confirmed=1` URL and does not check `updated.data` (`src/pages/api/family/chore-confirm.ts:76-80`). This session did not send two concurrent confirms, so the zero-row update path is unread at runtime.

The parent update policy allows a parent to update a family row and does not mention `parent_confirmed_at` (`supabase/migrations/20261001180000_family_data_and_roles.sql:185-196`). The idempotent skip is in the handler at lines 62-64, not in that policy. The SQL smoke sets `parent_confirmed_at` once and checks that both timestamps are non-null (`scripts/family-rls-smoke.sql:167-173`). It does not issue a second confirm or compare the stored value to a previous one.

Importing `isDone` in a unit test would assert `src/types.ts:38` against itself. The independent oracle is the product rule: after check-off and before confirm, the parent group is "Waiting for confirmation" and `parent_confirmed_at` is null; after one confirm, the parent group is "Done", the child row stays under "Checked off" without Undo, and both timestamps are non-null; after a second confirm request, the stored `parent_confirmed_at` string is the one saved by the first write. The success redirect does not establish that last fact, because lines 63 and 80 emit it for both the skip and the write.

Check-off writes `{ child_checked_at: new Date().toISOString() }` or `{ child_checked_at: null }` (`src/pages/api/family/chore-check.ts:72-74`). It does not send `parent_confirmed_at`. The table constraint `today_chores_confirmed_implies_checked` rejects a stored row with `parent_confirmed_at` set and `child_checked_at` null (`supabase/migrations/20261001180000_family_data_and_roles.sql:34-38`).

### Risk #5 — yesterday is not today

`warsawToday` is the `en-CA` `Intl.DateTimeFormat` configured with `timeZone: "Europe/Warsaw"` and year, month, and day fields (`src/lib/today.ts:1-9`). Callers compare `chore_date` to its return value with `.eq` on the dashboard child read (`src/pages/dashboard.astro:171`), the dashboard parent read (`src/pages/dashboard.astro:137`), check-off (`src/pages/api/family/chore-check.ts:50` and `:77`), and confirm (`src/pages/api/family/chore-confirm.ts:47` and `:71`). RLS select does not apply that predicate (`supabase/migrations/20261001180000_family_data_and_roles.sql:163-168`).

A yesterday row therefore fails these app equalities. On check-off it shares the missing-row redirect with a sibling id (`src/pages/api/family/chore-check.ts:56-57`). An empty successful child query leaves `childChores` as the array declared at `src/pages/dashboard.astro:22`. The assignment from parsed rows is at lines 188-189, inside the branch where `childChoresLoadFailed` is false. `ChildToday` shows "Nothing to do today." when `chores.length === 0` and load did not fail (`src/components/family/ChildToday.tsx:65-68`). A failed child query sets `childChoresLoadFailed` and shows "Could not load today's list." (`src/pages/dashboard.astro:175-176`, `src/components/family/ChildToday.tsx:65-66`). The title set is the oracle. The empty-state sentence is not, by itself, proof that a date filter ran.

The insert path used by the app sets `chore_date` to `warsawToday()` (`src/pages/api/family/chores.ts:63-67`). A fixture that needs "not today" should store a different `chore_date` than the row created by that handler, rather than reimplement `src/lib/today.ts:8-9` and compare the two copies.

### What phase 1 should not treat as coverage

`package.json` scripts are `dev`, `build`, `preview`, `astro`, `lint`, `lint:fix`, `format`, and `smoke`. The manifest inspected for this research does not list Vitest, Jest, or Playwright. The `*.test.*` search under the repo, excluding a read of `.cursor/` and `node_modules/`, found no product test files. CI job `ci` runs lint, `astro check`, and build. Job `smoke` runs `npm run smoke` against the preview (`.github/workflows/ci.yml:49-53`).

Phase 1 does not need a browser e2e or the Container API for these three risks. The filters run in the page's Supabase query and in the `POST` handlers.

Risks #3 and #4 (wrong role, cross-family id, delete) stay in phase 2. One boundary matters for the phase 1 confirm call: the confirm lookup on this path is id plus today's date, and the parent RLS policy is the family, not a child id (`src/pages/api/family/chore-confirm.ts:43-48`, `supabase/migrations/20261001180000_family_data_and_roles.sql:185-196`).

## Code References

- `src/pages/dashboard.astro:81` — cookie Supabase client for list reads
- `src/pages/dashboard.astro:167-172` — child list filter: own profile id and `warsawToday()`
- `src/pages/dashboard.astro:133-138` — parent list filter: up to two child ids and `warsawToday()`
- `src/pages/api/family/chore-check.ts:45-58` — sibling or non-today id returns before `update`
- `src/pages/api/family/chore-check.ts:72-78` — check-off writes `child_checked_at` under the same three filters
- `src/pages/api/family/chore-confirm.ts:59-64` — no check-off, or second confirm, returns before `update`
- `src/pages/api/family/chore-confirm.ts:66-80` — first confirm writes both timestamp columns to one ISO string; success redirect does not require `updated.data`
- `src/types.ts:37-38` — `isDone` conjunction; a unit test of this function copies it
- `src/components/family/ParentToday.tsx:206-222` — parent groups, including "Done"
- `src/components/family/ChildToday.tsx:47` — Undo hidden when `parentConfirmedAt` is set
- `src/components/family/ChildToday.tsx:61-73` — child groups are "To do" and "Checked off"
- `src/lib/today.ts:1-9` — Warsaw calendar-day formatter; return text not executed in this session
- `src/pages/api/family/chores.ts:63-67` — inserted `chore_date` is `warsawToday()`, not the UTC column default
- `src/pages/api/family/children.ts:54-77` — second child uses the same POST; app stops at two child profiles
- `supabase/migrations/20261001180000_family_data_and_roles.sql:163-168` — child SELECT RLS has no date predicate
- `supabase/migrations/20261001180000_family_data_and_roles.sql:185-196` — parent UPDATE policy does not stop a second confirm
- `scripts/smoke.mjs:39-58` — eight auth status and redirect checks; no chore request in this array
- `scripts/family-rls-smoke.sql:109-115` — child A row count is 1; child B is not the subject
- `.github/workflows/ci.yml:49-53` — CI runs `npm run smoke`, not the SQL file

## Architecture Insights

List and check-off isolation is two gates on the inspected path: the cookie-client query, then RLS. Date isolation is the app `.eq("chore_date", warsawToday())` on the inspected reads and writes. RLS does not repeat it. Confirm idempotency is the handler branch at `src/pages/api/family/chore-confirm.ts:62-64`. The parent UPDATE policy does not encode it.

Visible headings and the stored timestamps answer different questions. "Done" is a parent heading. The child heading for a confirmed row on this UI is "Checked off". The second-confirm timestamp is stored and is not printed as text by the components inspected above. Astro still serializes island props into the dashboard HTML (`src/pages/dashboard.astro:202-221`), so a timestamp can appear in that payload, but the stable oracle is a select of `parent_confirmed_at` with the parent session.

## Historical Context (from prior changes)

- `context/archive/2026-10-01-family-data-and-roles/plan.md` — said the repo had no unit runner and that `scripts/family-rls-smoke.sql` was the data check. Supported for the runner: `package.json` still has no Vitest, Jest, or Playwright script. Supported that the SQL file exists. Partial for coverage: the current script checks child A's count, not child B's session (`scripts/family-rls-smoke.sql:109-115`).
- `context/archive/2026-10-16-child-view-and-checkoff/plan.md` — said `npm run smoke` does not cover the child list. Supported by `scripts/smoke.mjs:39-58`, which has no chore request.
- `context/archive/2026-10-23-parent-confirm-chores/plan.md` — said no new integration test, with manual checking and RLS as the guard. Partial against current code: the HTTP skip for a second confirm is in `src/pages/api/family/chore-confirm.ts:62-64`, and the SQL smoke's done check is a single parent update (`scripts/family-rls-smoke.sql:167-173`).

## Related Research

No `research.md` files were found under `context/changes/` or `context/archive/` when this document was written. Not applicable.

## Open Questions

- `warsawToday()` was not executed, so this document does not record the exact date string for 2026-11-03. A yesterday fixture can copy `chore_date` from a row inserted by `POST /api/family/chores` and store a different date, instead of reimplementing `src/lib/today.ts`.
- This session did not call Supabase Auth, so it does not show that `user_metadata.role = "child"` arrives as `raw_user_meta_data.role`. The product path is the `createUser` call at `src/pages/api/family/children.ts:73-77` together with the trigger at `supabase/migrations/20261001180000_family_data_and_roles.sql:86-88`.
- Two overlapping confirm requests were not sent. The handler's response to a zero-row update with no `updated.error` is the redirect at `src/pages/api/family/chore-confirm.ts:80`.
