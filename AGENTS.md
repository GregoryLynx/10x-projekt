# Repository Guidelines

Astro 7 SSR app (`output: "server"`) with React 19 islands, Tailwind 4, Supabase auth, and Cloudflare Workers. Full agent rules and auth map live in @CLAUDE.md; this file is the short onboarding layer.

## Hard rules

- Prefer Astro for static/layout; React only when interactivity is needed. Never add Next.js directives (`"use client"`). Extract hooks to `src/components/hooks/`.
- Merge Tailwind classes with `cn()` from `@/lib/utils` — do not concatenate class strings.
- API routes: uppercase `GET`/`POST` exports, `export const prerender = false`, validate input with zod. Reference shape: @src/pages/api/auth/signin.ts.
- New Supabase tables go in `supabase/migrations/` as `YYYYMMDDHHmmss_short_description.sql` with RLS enabled and per-operation, per-role policies.
- Keep `SUPABASE_URL` / `SUPABASE_KEY` server-only (`.env` or `.dev.vars`); copy from @.env.example. Do not expose them to the client.

## Project structure

- `src/pages/` — Astro pages and `api/` endpoints; auth pages under `auth/`.
- `src/components/` — UI (`ui/` = shadcn "new-york"); interactive auth forms under `auth/`.
- `src/lib/` — helpers/services (`supabase.ts`, `utils.ts`); shared DTOs belong in `src/types.ts`.
- `src/middleware.ts` — session + `PROTECTED_ROUTES` gate. Product context: @context/foundation/prd.md.

## Build, test, and development

- `npm run dev` — Cloudflare workerd local server.
- `npm run build` / `npm run preview` — production build and preview.
- `npm run lint` / `npm run lint:fix` — ESLint (type-checked); `npm run format` — Prettier.
- `npm run smoke` — auth-flow smoke against a running server (`BASE_URL`, default `http://localhost:4321`).
- Node **22.14.0** (@.nvmrc). Path alias `@/*` → `./src/*` (@tsconfig.json).

## Coding style

ESLint + typescript-eslint strict/stylistic type-checked (@eslint.config.js); Prettier 2-space, double quotes, printWidth 120 (@.prettierrc.json). Add shadcn components with `npx shadcn@latest add [name]` into `src/components/ui/`.

## Testing & CI

No unit-test runner in-repo; use `npm run smoke` after auth or dependency changes. CI (@.github/workflows/ci.yml) on push/PR to `master`: `astro sync`, `npm run lint`, `astro check`, `npm run build` (needs `SUPABASE_*` secrets), plus a smoke job against local Supabase + preview. Commit message convention is not established yet (no git history in this working copy).
