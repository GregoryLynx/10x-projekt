# Isolation, Done-Rule, and Today Boundary — Plan Brief

> Full plan: `context/changes/testing-isolation-and-done-rule/plan.md`
> Research: `context/changes/testing-isolation-and-done-rule/research.md`

## What & Why

Rollout phase 1 of `context/foundation/test-plan.md` stands up Vitest and proves three behaviors that are already in the product: two children each see only their own list, a chore counts as done only after the parent confirms, and a yesterday chore is not on today's list and cannot be checked off as today. The repo has auth smoke and no chore test, so those regressions would ship green.

## Starting Point

The dashboard and the check-off and confirm handlers already apply the profile and Warsaw-date filters. `isDone` is both timestamps. The parent heading for that state is "Done"; the child heading is "Checked off", with Undo hidden after confirm. A second confirm returns before `update`, but the success redirect is the same URL as a first confirm. `npm run smoke` does not call these routes.

## Desired End State

`npm test` runs one HTTP scenario against local Supabase and `astro preview`. It fails if a child sees a sibling title, if check-off alone marks the row done, if a second confirm changes `parent_confirmed_at`, or if a yesterday row shows up on today's list or accepts a check-off. Auth smoke stays as it is. CI does not run Vitest until test-plan phase 3.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Question budget | 0 substantive questions | The test plan and research already fixed scope, oracles, and the layer. | Plan |
| Proof layer | HTTP against preview and local Supabase | The Container API does not run the Supabase filters, and browser e2e is outside this rollout. | Research |
| Runner | Vitest via `getViteConfig()` | That is the frozen stack in test-plan §4 and the Astro testing guide. | Plan |
| `isDone` unit test | Not added | An assertion of that function would copy `src/types.ts`. | Research |
| Yesterday fixture | A different `chore_date` than the inserted row, written by the parent session | The test must not reimplement `warsawToday()`, and the child trigger rejects a date change. | Research |
| Second confirm | Stored `parent_confirmed_at` must be unchanged | The handler sends `confirmed=1` for both the write and the skip. | Research |
| "Done" on screen | Parent heading "Done"; child "Checked off" without Undo | The child screen has no "Done" heading. | Research |
| Scenario shape | One sequential test for risks #1, #2, and #5 | The test plan puts the yesterday case inside the same integration test. | Plan |
| CI | Not in this change | Test-plan phase 3 is the gate that runs the suite on pull requests. | Plan |
| Overlapping confirms | Out of this phase | The required case is a later POST after the first response has returned. | Plan |

## Scope

**In scope:**

- Vitest config, an offline canary, and `npm test`
- One cookie-session scenario for sibling lists, the done-rule, and the today boundary
- Cookbook §6.1, §6.2, and §6.4, plus `AGENTS.md` and `CLAUDE.md` command notes

**Out of scope:**

- Risks #3 and #4, Playwright, a mocked database, and product changes
- A unit test of `isDone` or `warsawToday()`
- A CI workflow job for Vitest

## Architecture / Approach

Vitest starts in Node. The scenario signs up a parent, creates two children through the product API, and posts chores the same way. Page reads and form posts use cookie jars like `scripts/smoke.mjs`. Timestamp and date checks use a parent Supabase client with the anon key, so RLS still applies. The preview process holds the service role key because child creation needs it. Yesterday is an update of the stored `chore_date` to another calendar day.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Vitest runner | `npm test` exits 0 with no server | `getViteConfig()` loads the Cloudflare adapter and the runner never starts |
| 2. HTTP scenario | One test proves risks #1, #2, and #5 | A green test that only checks titles or the `confirmed=1` redirect |
| 3. Cookbook and contributor docs | §6 and the agent command lists name this suite | The next agent still reads "no unit-test runner" and skips `npm test` |

**Prerequisites:** Node 22.14.0, Docker, local Supabase with the family migrations applied, and a preview env that includes `SUPABASE_SERVICE_ROLE_KEY`.
**Estimated effort:** about one working session across 3 phases.

## Open Risks & Assumptions

- If `getViteConfig()` cannot drop the Cloudflare adapter via its second argument, phase 1 still has to reach a Node runner that executes `tests/**/*.test.ts`. The proof stays HTTP against preview.
- `client:load` islands are server-rendered today, so headings are in the HTML `fetch` returns. The timestamp oracle is the parent select, which does not depend on that HTML.
- Local signup must keep working the way `scripts/smoke.mjs` already uses it: sign up, then sign in, with no extra mail click.
- Research did not execute `warsawToday()`, so the exact characters for a given instant are unrecorded. The fixture copies the stored `chore_date` instead of guessing them.
- Two overlapping confirm requests were not part of the risk statement and are not covered here.

## Success Criteria (Summary)

- `npm test` passes against local Supabase and `astro preview` when isolation, the done-rule, and the today boundary hold.
- `npm test` fails when the preview is down, and it fails when a sibling title leaks, check-off alone counts as done, a second confirm rewrites the timestamp, or a yesterday row is checkable as today.
- The cookbook and `AGENTS.md` / `CLAUDE.md` tell the next agent to run that suite, and to keep `npm run smoke` as the auth check.
