---
bootstrapped_at: 2026-09-21T16:58:52Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: obowiazki
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: obowiazki
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

## Why this stack

A 1-week family chore web app with separate parent and child logins needs auth and a database out of the box, not a framework debate. 10x Astro Starter (Astro + React + TypeScript + Supabase + Cloudflare) is the recommended default for a JS web app: typed, convention-based, and batteries-included for FR-001–004. Vue and C# were considered because that is the author's daily stack; Nuxt would still require wiring auth, and .NET would split UI and API in a one-week window. Cloudflare Pages is the starter default; CI is GitHub Actions with auto-deploy on merge. Scaffolding is registered but not battle-tested, so expect mostly-smooth setup with occasional manual steps.

## Pre-scaffold verification

| Signal             | Value                                                | Severity | Notes                                                                 |
| ------------------ | ---------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| npm package        | not run                                              | —        | `cmd_template` starts with `git clone`; npm recency check skipped     |
| GitHub repo        | przeprogramowani/10x-astro-starter last pushed 2026-09-12T21:16:08Z | fresh    | `gh` not on PATH; fetched via GitHub API `pushed_at`                  |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0 (clone + install completed after a first-attempt Node/registry failure; `npm install --registry https://registry.npmjs.org/` succeeded)
**Files moved**: 0 (cwd already contained the starter)
**Conflicts (.scaffold siblings)**: `.nvmrc.scaffold` only (content differed: cwd `22.14.0` vs scaffold `22.23.2`). 49 identical files skipped — no sidecar written.
**.gitignore handling**: append-merged (no new lines)
**.bootstrap-scaffold cleanup**: pending delete after log write
**Notes**: First CLI run failed (`Node.js v22.14.0 is not installed`; default NVM version is `22.23.2`; user `.npmrc` registry `http://172.16.0.4:4873` timed out). Retry used Node 22.23.2 and the public npm registry. `node_modules` was not copied (cwd already had it). Cloned `.git/` was not merged into cwd.

## Post-scaffold audit

**Tool**: `npm audit --json --registry https://registry.npmjs.org/`
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/0/0 direct of total 0/0/0/0
**Dependencies scanned**: 804

#### CRITICAL findings

none

#### HIGH findings

none

#### MODERATE findings

none

#### LOW / INFO findings

none

Default `npm audit` against `http://172.16.0.4:4873` times out; audit was run against the public registry.

## Hints recorded but not acted on

| Hint                       | Value                              |
| -------------------------- | ---------------------------------- |
| bootstrapper_confidence    | first-class                        |
| quality_override           | false                              |
| path_taken                 | standard                           |
| self_check_answers         | null                               |
| team_size                  | solo                               |
| deployment_target          | cloudflare-pages                   |
| ci_provider                | github-actions                     |
| ci_default_flow            | auto-deploy-on-merge               |
| has_auth                   | true                               |
| has_payments               | false                              |
| has_realtime               | false                              |
| has_ai                     | false                              |
| has_background_jobs        | false                              |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review `.nvmrc.scaffold` (`22.23.2`) vs `.nvmrc` (`22.14.0`) and keep one version.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
