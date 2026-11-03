<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Isolation, Done-Rule, and Today Boundary

- **Plan**: context/changes/testing-isolation-and-done-rule/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-11-03
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Full lint is checked but still exits 1

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: package.json
- **Detail**: Progress rows 1.2 and 2.3 say `npm run lint` exits 0. In this session that command exited 1 with 1180 Prettier `Delete CR` errors on existing files. `npx eslint vitest.config.ts tests/runner.test.ts tests/family-today.integration.test.ts` exited 0. The user chose not to rewrite those line endings. The checkbox records the accepted, narrower check, not a green full-repo lint.
- **Fix**: Leave the rows as they are. The CRLF errors are outside this change.
- **Decision**: FIXED — left rows 1.2 and 2.3 unchanged; CRLF is outside this change

### F2 — Green suite ran on astro dev, not astro preview

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/family-today.integration.test.ts:10
- **Detail**: Row 2.1 names `astro preview` on port 4321. The passing run (2 files, 2 tests, about 12s, re-checked at 23:04) hit the already-running `astro dev` on that port. Child creation succeeded, so that server had `SUPABASE_SERVICE_ROLE_KEY`. A closed port (`127.0.0.1:4399`) made `npm test` exit 1 with `ECONNREFUSED`, which matches row 2.2. With `BASE_URL` unset and dev still on 4321, `npm test` exits 0, so row 1.1 no longer describes an offline suite.
- **Fix**: Re-run `npm test` against `astro preview` when port 4321 is free, if a production-build proof is still wanted.
- **Decision**: FIXED — `npm test` exited 0 against `astro preview` on port 4322 (dev stayed on 4321). 2 files, 2 tests, 3.75s, 2026-11-03 23:17. Preview process stopped afterward.

### F3 — Plan still says sign-in returns `/`

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/testing-isolation-and-done-rule/plan.md:120
- **Detail**: The phase contract says `POST /api/auth/signin` returns 302 to `/`. `src/pages/api/auth/signin.ts:19` redirects to `/dashboard`. The test asserts `/dashboard` (`tests/family-today.integration.test.ts:254`). Child creation in the same sentence already says `email`, which matches `src/pages/api/family/children.ts`. The risk assertions match the plan.
- **Fix**: Change that one redirect in the plan contract from `/` to `/dashboard`.
- **Decision**: FIXED — plan.md contract now says sign-in `302` to `/dashboard`.
