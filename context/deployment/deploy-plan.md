---
project: Obowiązki
platform: Cloudflare Workers
worker_name: obowiazki
status: deployed
public_url: https://obowiazki.obowiazki-rodzinne.workers.dev
secrets_required:
  - SUPABASE_URL
  - SUPABASE_KEY
secrets_omitted:
  - OPENROUTER_API_KEY
---

## What this deploy is

First production publish of the Astro 7 SSR app on Cloudflare Workers. The installed adapter is `@astrojs/cloudflare`. Commands are Workers commands (`npm run build`, then `npx wrangler deploy`). Pages commands are not used.

`session: false` is set in `astro.config.mjs` so the first deploy does not create a `SESSION` KV namespace. Auth stays on Supabase cookies. The Worker name in `wrangler.jsonc` is `obowiazki`. `main` stays `@astrojs/cloudflare/entrypoints/server`.

## Agent steps already done

- `session: false` in `astro.config.mjs`
- Worker `name` set to `obowiazki` in `wrangler.jsonc`
- `deployment_target` in `context/foundation/tech-stack.md` set to `cloudflare-workers`
- `npm run build` exited 0 on 2026-09-26. Adapter `@astrojs/cloudflare`, output `dist/`. The build log has no `SESSION` KV binding. Sitemap skipped because `site` is unset; that does not block deploy.
- Human completed `npx wrangler deploy` on 2026-09-26. Public URL: `https://obowiazki.obowiazki-rodzinne.workers.dev`.

The agent does not run `npx wrangler login`, `npx wrangler secret put`, or `npx wrangler deploy`.

## Human gates

1. Cloudflare account, then `npx wrangler login`.
2. Hosted Supabase project. Do not store `http://127.0.0.1:54321`. The Worker cannot reach local Docker.

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
```

`SUPABASE_KEY` is the anon key. Do not put values in `wrangler.jsonc` `vars` or in git. Local names stay in gitignored `.dev.vars`. `OPENROUTER_API_KEY` is omitted until that call exists in code.

3. Deploy only after the secrets exist:

```bash
npm run build
npx wrangler deploy
```

4. Copy the `*.workers.dev` host from the deploy output. In the hosted Supabase project (Authentication → URL Configuration), add that host to Site URL and Redirect URLs. Leave `supabase/config.toml` on localhost.
5. `npx wrangler rollback` restores Worker code only. It does not undo Supabase SQL or rows.

## Verification

Checked against `https://obowiazki.obowiazki-rodzinne.workers.dev` on 2026-09-26:

- `GET /` returned 200.
- `GET /dashboard` without a cookie returned 302 to `/auth/signin`.
- The pre-deploy build log had no `SESSION` KV binding. The deploy log itself was not re-read here.

Email/password sign-in on this host still depends on the hosted Supabase allow-list (Authentication → URL Configuration). Add `https://obowiazki.obowiazki-rodzinne.workers.dev` to Site URL and Redirect URLs if that step is not done yet. Leave `supabase/config.toml` on localhost.
