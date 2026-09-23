---
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
---

## Why this stack

A 1-week family chore web app with separate parent and child logins needs auth and a database out of the box, not a framework debate. 10x Astro Starter (Astro + React + TypeScript + Supabase + Cloudflare) is the recommended default for a JS web app: typed, convention-based, and batteries-included for FR-001–004. Vue and C# were considered because that is the author's daily stack; Nuxt would still require wiring auth, and .NET would split UI and API in a one-week window. Cloudflare Pages is the starter default; CI is GitHub Actions with auto-deploy on merge. Scaffolding is registered but not battle-tested, so expect mostly-smooth setup with occasional manual steps.
