# Isolation, Done-Rule, and Today Boundary Implementation Plan

## Overview

Stand up Vitest and prove three behaviors the app already implements: two children each see only their own list, a chore is done only after parent confirmation, and a yesterday row is not on today's list. This is rollout phase 1 of `context/foundation/test-plan.md`. It does not change product behavior.

## Current State Analysis

At commit `2294649` the three risks hold on the paths in `context/changes/testing-isolation-and-done-rule/research.md`. Nothing in the repo runs those paths as a test. `package.json` has no Vitest script. `scripts/smoke.mjs` checks eight auth HTTP results and no chore request. `scripts/family-rls-smoke.sql` checks child A's row count for the current date and does not switch the JWT to child B, issue a second confirm, or insert a non-today `chore_date`. CI job `smoke` runs `npm run smoke` against `astro preview` and local Supabase, and it writes only the anon key into `.env` and `.dev.vars`.

List and check-off isolation is two gates: the cookie-session query, then RLS. The date boundary is the app's `.eq("chore_date", warsawToday())`. RLS select does not repeat it. Confirm idempotency is the handler branch that returns before `update` when `parent_confirmed_at` is already set. The parent UPDATE policy does not encode that skip.

## Desired End State

A developer with local Supabase and a production preview can run `npm test` and see one HTTP scenario fail when sibling isolation, the done-rule, or the today boundary breaks. `npm run smoke` still covers auth only. CI does not run this suite yet.

### Key Discoveries:

- Child list filter is own profile id plus `warsawToday()` at `src/pages/dashboard.astro:167-172`. Check-off repeats those predicates and returns before `update` when the row is missing (`src/pages/api/family/chore-check.ts:45-58`).
- `isDone` is the conjunction of the two timestamps (`src/types.ts:37-38`). Parent groups are "To do", "Waiting for confirmation", and "Done" (`src/components/family/ParentToday.tsx:206-222`). Child groups are "To do" and "Checked off"; Undo is omitted when `parentConfirmedAt` is set (`src/components/family/ChildToday.tsx:47-73`).
- `POST /api/family/chores` stores `warsawToday()` (`src/pages/api/family/chores.ts:63-67`). A parent session may update `chore_date`. The child column-lock trigger rejects that change (`supabase/migrations/20261001202800_today_chores_child_column_lock.sql:11-21`).
- Creating a child calls `createAdminClient()` and redirects with "Service role key is not configured" when `SUPABASE_SERVICE_ROLE_KEY` is missing (`src/pages/api/family/children.ts:68-71`).
- Astro's testing guide configures Vitest with `getViteConfig()`. `client:load` islands are server-rendered, so a `fetch` of `/dashboard` contains the group headings. The second-confirm redirect is not a timestamp oracle: `src/pages/api/family/chore-confirm.ts:62-64` and `:80` both send `/dashboard?confirmed=1`.

## What We're NOT Doing

- Risks #3 and #4 (wrong role, cross-family id, delete). Those are test-plan phase 2.
- A CI job for Vitest. That is test-plan phase 3. Job `smoke` stays the auth check.
- Playwright, the Astro Container API, or a mocked Supabase client.
- A unit test of `isDone` or of `warsawToday()`.
- Two overlapping confirm requests. The required case is a second POST after the first response has returned.
- Product changes to handlers, RLS, or the dashboard.
- Treating `scripts/family-rls-smoke.sql` as the proof.

## Implementation Approach

Vitest is the runner, configured with `getViteConfig()` from `astro/config`, as frozen in test-plan §4. The proof is one sequential HTTP scenario against `astro preview`, using a cookie jar with the same rules as `scripts/smoke.mjs`. The database is local Supabase. Rows are created through the product endpoints. The yesterday row is that inserted row with `chore_date` changed, through the parent session, to a different `YYYY-MM-DD` than the value just read. The test does not import `src/lib/today.ts` or `src/types.ts`.

`npm test` is `vitest run`. After phase 2 it requires the preview. It does not start Supabase or the server.

## Critical Implementation Details

**Runner versus the Cloudflare adapter.** `getViteConfig()` loads `astro.config.mjs`, which installs `@astrojs/cloudflare`. Phase 1 is done only when `npm test` executes in Node with no server. If that plugin aborts the process, the second argument of `getViteConfig()` must supply an Astro config override that does not install the Cloudflare adapter. These tests do not import pages, so they do not need the adapter.

**Yesterday's date.** Read `chore_date` from the row `POST /api/family/chores` stored. Write a different `YYYY-MM-DD` with the parent session. Do not call `warsawToday()` and do not format `Europe/Warsaw` in the test. The child session cannot make this write: `today_chores_child_column_lock` raises when a child changes `chore_date`.

**Second confirm.** The success redirect is emitted for the first write and for the already-confirmed skip. Compare `parent_confirmed_at` from a parent-session select before and after the second POST. The strings must be equal.

**Visible groups.** Assert headings in the dashboard HTML. "Nothing to do today." and "Nothing on today's list." do not prove a date filter. For yesterday, the title is absent from both dashboards, and a parent select of that id shows `child_checked_at` still null. The shared error string "That chore is not on today's list" is the same for a sibling id and a non-today id, so the column read is the proof that `update` did not run.

**Service role.** The preview process needs `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, or child creation fails. The test process needs the URL and the anon key for `signInWithPassword` and the parent select. It does not use the service role for the date patch or the timestamp read.

---

## Phase 1: Vitest runner

### Overview

Install Vitest so `npm test` runs a test file in Node with no preview and no Supabase. The include pattern must pick up the phase 2 file without a later config change.

### Changes Required:

#### 1. Runner dependency and script

**File**: `package.json`

**Intent**: Add the runner the rest of the suite uses, in a form that exits instead of watching.

**Contract**: `vitest` is a devDependency. The `test` script is `vitest run`. Existing scripts, including `smoke`, stay as they are.

#### 2. Vitest config

**File**: `vitest.config.ts`

**Intent**: Apply the Astro project's Vite settings the way the official testing guide and test-plan §4 require, while keeping this phase runnable offline.

**Contract**: The default export is `getViteConfig(...)` from `astro/config`. The Vitest `test` options set the environment to `node` and include `tests/**/*.test.ts`. Phase 1 is done only when `npm test` exits 0 with no preview running and `BASE_URL` unset. If loading the Cloudflare adapter prevents that, the second argument of `getViteConfig` is the override that omits the adapter. Do not start a `webServer`, build, or preview from this config.

#### 3. Offline canary

**File**: `tests/runner.test.ts`

**Intent**: Give `npm test` a file that proves the runner started, without touching product code or the network.

**Contract**: The file imports from `vitest` explicitly. It does not import `src/lib/today.ts`, `src/types.ts`, pages, or `@supabase/supabase-js`. It does not read `BASE_URL`. One assertion on a constant is enough. The new file is covered by the existing `tsconfig.json` include `**/*` and by ESLint's `**/*.{ts,tsx}` pattern, and `npm run lint` must pass.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0 when no preview is running and `BASE_URL` is unset
- `npm run lint` exits 0

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: HTTP scenario for isolation, done-rule, and today

### Overview

Add one sequential HTTP test that proves risks #1, #2, and #5 against a running preview and local Supabase. A green run that only checks the parent's happy path does not meet this phase.

### Changes Required:

#### 1. Cookie HTTP helper

**File**: `tests/family-today.integration.test.ts` (extract `tests/http.ts` only if the test file becomes hard to read)

**Intent**: Send form posts and authenticated page reads the same way `scripts/smoke.mjs` already talks to the preview.

**Contract**: `BASE_URL` defaults to `http://localhost:4321`. Requests use `redirect: "manual"`, a `Cookie` header, and `Origin` set to `BASE_URL`. Form bodies are `application/x-www-form-urlencoded`. `Set-Cookie` values with `max-age=0` are dropped from the jar; other cookies are stored. This matches `scripts/smoke.mjs:9-36`. Each role (parent, child A, child B) has its own jar. The test fails when the preview is down. It does not `skip` and it does not start the server.

#### 2. Family fixture through product endpoints

**File**: `tests/family-today.integration.test.ts`

**Intent**: Build a fresh family the way the app does, so the test exercises signup, child creation, and chore insert.

**Contract**: One `test` whose name states sibling isolation, the done-rule, and the today boundary. Per run, sign up a unique parent email via `POST /api/auth/signup` with fields `email` and `password`, expecting the smoke statuses: `302` to `/auth/confirm-email`, then `POST /api/auth/signin` `302` to `/dashboard`. Create two children via `POST /api/family/children` with `display_name`, `email`, and `password`. Each child email is a full address, unique across runs, and is the address used at sign-in. Sign each child in through `POST /api/auth/signin`. Parent `POST /api/family/chores` with `title` and `child_profile_id` creates each today chore. Titles are unique per run. Chore ids and timestamp columns are read with a parent Supabase client (`@supabase/supabase-js`, anon key, `signInWithPassword`), not with the service role. The preview must have been started with `SUPABASE_SERVICE_ROLE_KEY` or child creation redirects to "Service role key is not configured".

#### 3. Risk assertions

**File**: `tests/family-today.integration.test.ts`

**Intent**: Encode the oracles from research so a dropped filter, an early "done", or a copied date helper fails this test.

**Contract**:

- Risk #1: child A's `GET /dashboard` HTML contains A's title and does not contain B's title. Child B is the reverse. Child B `POST /api/family/chore-check` with A's `chore_id` and `intent=check` returns before a write. A parent select of that id shows `child_checked_at` null.
- Risk #2: child A checks off A's chore (`intent=check`). Parent dashboard HTML contains "Waiting for confirmation" and A's title, and does not contain the "Done" heading. Parent select shows `child_checked_at` non-null and `parent_confirmed_at` null. Child dashboard HTML contains "Checked off" and A's title. Parent `POST /api/family/chore-confirm` with `chore_id`. Parent dashboard HTML then contains "Done" and A's title, and does not contain "Waiting for confirmation". Child dashboard HTML contains "Checked off" and A's title, and does not contain an undo form for that chore id (`intent` value `undo` posted with that id). Parent select shows both timestamps non-null. Capture `parent_confirmed_at`. A second confirm POST leaves that stored string unchanged. Do not treat location `/dashboard?confirmed=1` as that proof.
- Risk #5: parent creates one more chore, reads its `chore_date`, and updates `chore_date` to a different `YYYY-MM-DD` through the parent session. That title is absent from the parent dashboard HTML and from the owning child's dashboard HTML. The owning child's check-off POST for that id leaves `child_checked_at` null on a parent select of the id. Do not import `warsawToday`.

The test does not import `isDone`. It does not assert the empty-state sentences as proof of the date filter.

### Success Criteria:

#### Automated Verification:

- With local Supabase running and `astro preview` on port 4321 built with `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, `BASE_URL=http://localhost:4321 npm test` exits 0
- `npm test` exits non-zero when no preview is running
- `npm run lint` exits 0

#### Manual Verification:

- The integration test asserts each child's dashboard contains only that child's title, a foreign check leaves `child_checked_at` null, check-off shows "Waiting for confirmation" with `parent_confirmed_at` null, one confirm shows parent "Done" and child "Checked off" without Undo, a second confirm leaves the stored `parent_confirmed_at` unchanged, and a yesterday row is absent from both dashboards and cannot be checked off

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Cookbook and contributor docs

### Overview

Leave the pattern where the next agent will look: the test-plan cookbook, plus the command lists that today say there is no unit-test runner. Do not add a CI job.

### Changes Required:

#### 1. Cookbook

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the phase 1 TBD rows so the next test does not add a unit test of `isDone` or a date helper that copies `warsawToday()`.

**Contract**: §6.1 states that this phase added no unit test of `isDone`, because that assertion would copy `src/types.ts:37-38`, and points at the HTTP scenario. §6.2 describes that scenario for risks #1, #2, and #5: cookie sessions, parent-session select of the timestamps, and a yesterday `chore_date` taken from the inserted row rather than from `warsawToday()`. §6.4 names the same scenario as the pattern for a new chore endpoint covered by this phase. Leave the §3 status table to the test-plan orchestrator. Add a §6.5 note only when implementation hit a constraint the risk table does not already state.

#### 2. Agent command lists

**File**: `AGENTS.md`

**Intent**: Tell the next agent to run the new suite, and keep smoke as the auth check.

**Contract**: The command list gains `npm test` against a running preview (`BASE_URL`, default `http://localhost:4321`) and local Supabase, with `SUPABASE_SERVICE_ROLE_KEY` present in the preview env. The Testing & CI paragraph no longer says there is no unit-test runner. It still says `npm run smoke` covers auth and that CI, until test-plan phase 3, does not run Vitest.

**File**: `CLAUDE.md`

**Intent**: Keep the long-form command list aligned with `AGENTS.md`.

**Contract**: The Commands section gains the same `npm test` entry: preview plus local Supabase, service role on the preview, `BASE_URL` default `http://localhost:4321`. The `npm run smoke` entry stays the auth-flow check.

### Success Criteria:

#### Manual Verification:

- `context/foundation/test-plan.md` §6.1 states that phase 1 added no unit test of `isDone`, because that assertion would copy `src/types.ts`
- `context/foundation/test-plan.md` §6.2 and §6.4 describe the HTTP scenario for risks #1, #2, and #5, including the parent-session timestamp read and the yesterday `chore_date` taken from the inserted row
- `AGENTS.md` command list and Testing section name `npm test` against a running preview and local Supabase, and still name `npm run smoke` for auth
- `CLAUDE.md` command list names `npm test` with that same preview and local Supabase prerequisite, and still names `npm run smoke` for auth

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- `tests/runner.test.ts` only proves the runner starts. Do not add a test that imports `isDone` or `warsawToday`.

### Integration Tests:

- One sequential test in `tests/family-today.integration.test.ts` covers risks #1, #2, and #5.
- Prelude, same shape as CI job `smoke`, plus the service role key: start local Supabase, write `SUPABASE_URL`, `SUPABASE_KEY` (anon), and `SUPABASE_SERVICE_ROLE_KEY` into `.env` and `.dev.vars` from `supabase status`, `npm run build`, `npm run preview -- --port 4321`, then `BASE_URL=http://localhost:4321 npm test`. Export the URL and anon key to the test process as well.
- A second run creates a new parent and new child emails. It does not delete previous auth users. That matches smoke.

### Manual Testing Steps:

1. Run the phase 2 prelude and confirm `npm test` exits 0.
2. Stop the preview and confirm `npm test` exits non-zero.
3. Read the integration test against the contract in Phase 2. A passing run is not a substitute for that read: the test-plan anti-patterns are a child who only sees their own chores, an assertion copied from `isDone`, an empty list treated as proof of the date filter, and `confirmed=1` treated as proof the timestamp was unchanged.

## Performance Considerations

The scenario signs up one parent and two children and then walks a single chore through check-off and two confirms. That is the whole load. Do not add loops, parallel families, or a load target.

## Migration Notes

No schema change. The suite assumes the existing Supabase migrations are already applied, including `today_chores_child_column_lock`. Auth users created by the test remain in the local database, as smoke users do.

## References

- Related research: `context/changes/testing-isolation-and-done-rule/research.md`
- Rollout source: `context/foundation/test-plan.md` §2 risks #1, #2, #5 and §3 phase 1
- HTTP shape to copy: `scripts/smoke.mjs:9-36`
- Child list: `src/pages/dashboard.astro:167-172`
- Check-off reject path: `src/pages/api/family/chore-check.ts:45-58`
- Confirm skip and shared redirect: `src/pages/api/family/chore-confirm.ts:62-80`
- Done predicate: `src/types.ts:37-38`
- Parent and child headings: `src/components/family/ParentToday.tsx:206-222`, `src/components/family/ChildToday.tsx:47-73`
- Inserted date: `src/pages/api/family/chores.ts:63-67`
- Child date lock: `supabase/migrations/20261001202800_today_chores_child_column_lock.sql:11-21`
- Astro Vitest guide: `https://docs.astro.build/en/guides/testing/` (checked 2026-11-03)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Vitest runner

#### Automated

- [x] 1.1 `npm test` exits 0 when no preview is running and `BASE_URL` is unset — 983bcf7
- [x] 1.2 `npm run lint` exits 0 — 983bcf7

### Phase 2: HTTP scenario for isolation, done-rule, and today

#### Automated

- [x] 2.1 With local Supabase running and `astro preview` on port 4321 built with `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, `BASE_URL=http://localhost:4321 npm test` exits 0 — c9409d0
- [x] 2.2 `npm test` exits non-zero when no preview is running — c9409d0
- [x] 2.3 `npm run lint` exits 0 — c9409d0

#### Manual

- [x] 2.4 The integration test asserts each child's dashboard contains only that child's title, a foreign check leaves `child_checked_at` null, check-off shows "Waiting for confirmation" with `parent_confirmed_at` null, one confirm shows parent "Done" and child "Checked off" without Undo, a second confirm leaves the stored `parent_confirmed_at` unchanged, and a yesterday row is absent from both dashboards and cannot be checked off — c9409d0

### Phase 3: Cookbook and contributor docs

#### Manual

- [x] 3.1 `context/foundation/test-plan.md` §6.1 states that phase 1 added no unit test of `isDone`, because that assertion would copy `src/types.ts` — fce6922
- [x] 3.2 `context/foundation/test-plan.md` §6.2 and §6.4 describe the HTTP scenario for risks #1, #2, and #5, including the parent-session timestamp read and the yesterday `chore_date` taken from the inserted row — fce6922
- [x] 3.3 `AGENTS.md` command list and Testing section name `npm test` against a running preview and local Supabase, and still name `npm run smoke` for auth — fce6922
- [x] 3.4 `CLAUDE.md` command list names `npm test` with that same preview and local Supabase prerequisite, and still names `npm run smoke` for auth — fce6922
