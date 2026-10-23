---
project: Obowiązki
researched_at: 2026-09-26
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 7 + React 19
  runtime: Cloudflare Workers (workerd) via @astrojs/cloudflare
---

## Recommendation

**Deploy on Cloudflare Workers.**

Obowiązki is a one-family, request/response Astro 7 SSR app (Astro ^7.3.2, React 19). It does not need a process that stays alive between requests. Cost and iteration speed were weighted equally. There is no hands-on platform experience; the course path is the one already in the repo: `@astrojs/cloudflare` ^14.3.1, Wrangler 4.131.1, and the README deploy steps. Supabase and OpenRouter stay external HTTPS APIs, which matches a host that only needs `fetch`. One region is enough. Workers Free covers 100,000 requests per day. If an OpenRouter response pushes past the free 10 ms CPU cap, Workers Paid is a $5 monthly minimum and raises that cap. Vercel is the runner-up because a long model call fits its 300-second Hobby functions, at the cost of leaving the course adapter.

## Platform Comparison

Scores use Pass / Partial / Fail against the five agent-friendly criteria. Checked 2026-09-26. No platform was dropped: the app is stateless, and every candidate can run Astro SSR. Equal weight on cost and developer experience, plus course alignment, favors the adapter already installed. A single country does not reward edge for its own sake. External Supabase and OpenRouter mean a bundled database is not a plus.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5 Pass |
| Vercel | Pass | Pass | Pass | Pass | Partial | 4 Pass, 1 Partial |
| Netlify | Pass | Pass | Pass | Pass | Pass | 5 Pass |
| Render | Partial | Pass | Pass | Pass | Pass | 4 Pass, 1 Partial |
| Fly.io | Pass | Pass | Pass | Pass | Partial | 4 Pass, 1 Partial |
| Railway | Partial | Pass | Partial | Pass | Partial | 1 Pass, 4 Partial |

**Cloudflare Workers.** `npx wrangler deploy`, `npx wrangler rollback`, and `npx wrangler tail` cover the loop. The platform is managed isolates, not a VM. Docs publish `llms.txt` and per-page markdown. Workers Free is $0 for 100,000 requests per day and 10 ms CPU per invocation. Workers Paid starts at $5 per month with 10 million included requests and 30 million CPU-milliseconds (pricing page updated 7 July 2026). Subrequests: 50 per invocation on Free, 10,000 by default on Paid. One OpenRouter `fetch` counts as one subrequest. Waiting on the network is not CPU time; JavaScript that parses the stream is. This repo already has `nodejs_compat`, `main` pointed at `@astrojs/cloudflare/entrypoints/server`, and `npm run dev` running on `workerd`.

**Vercel.** `vercel deploy`, `vercel rollback`, `vercel env`, and `vercel logs` are CLI-first. Hobby is $0 for non-commercial use, 1 million invocations, 4 CPU-hours, and functions up to 300 seconds. Fluid compute bills active CPU, so time spent waiting on OpenRouter is the case Vercel documents as a better fit than a CPU-millisecond cap. MCP at `https://mcp.vercel.com` is a public beta. Hobby rollback only reaches the previous production deployment. The Astro page on vercel.com still shows `@astrojs/vercel/serverless` and `output: 'hybrid'`, which are the wrong setup for Astro 7. Reaching Vercel means removing the course adapter.

**Netlify.** Official `@astrojs/netlify` adapter, `netlify deploy` / `netlify deploy --prod`, and an official MCP (`@netlify/mcp`, remote `https://netlify-mcp.netlify.app/mcp`). The credit-based Free plan is 300 credits per month with a hard stop. A production deploy costs 15 credits. Web requests cost 2 credits per 10,000. Netlify's own AI inference meter is 180 credits per $1 of model usage; an external OpenRouter call is still ordinary compute, not that meter. When credits run out, the site pauses until the next cycle.

**Render.** Hosted MCP and markdown docs. Free web services sleep after 15 minutes. Staying awake starts at the $7 instance. SSR means `@astrojs/node`, `HOST=0.0.0.0`, and `node dist/server/entry.mjs`. Rollback is the dashboard or `POST /v1/services/{serviceId}/rollback`.

**Fly.io.** `fly launch` with `@astrojs/node` emits a Dockerfile. Rollback is `fly deploy --image` while the image remains in the registry. A shared-cpu-1x / 256 MB Machine is about $1.94 per month until 1 October 2026, then about $2.19. `fly mcp` is marked experimental. A container is extra surface for a stateless app.

**Railway.** `railway up` and `railway logs` work from the CLI. Arbitrary rollback is dashboard-only. The Free plan includes $1 of usage per month. Hobby is $5 including $5 of usage. SSR still needs the Node adapter. Docs were not confirmed as `llms.txt` in this pass. The hosted MCP is documented; launch posts still described it as ready for testing.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

It won because the course, the README, and the installed adapter already target it, and the interview did not ask for a different host. Supabase and OpenRouter are outbound HTTPS, which Workers can call. The free tier is enough for one household until a model response exceeds 10 ms of CPU, and the paid step is $5 rather than a new adapter. The accepted risks are that CPU cap, `workerd` rather than Node, and rollbacks that do not touch Supabase.

#### 2. Vercel

Strongest alternative when an OpenRouter call must run for many seconds inside the request. Hobby functions last up to 300 seconds and do not bill wait time as CPU. It ranks second because getting there deletes `@astrojs/cloudflare`, and the person deploying is relying on the course, which does not use this adapter. MCP is a public beta. Default function region is `iad1` unless `vercel.json` pins one region (`fra1` for Frankfurt).

#### 3. Netlify

Same shape as an official Astro SSR adapter plus a first-party MCP that is not in beta. It ranks third because the Free plan can pause the site when 300 credits are gone, and the move is still an adapter swap with none of the course-path advantage.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. Workers Free allows 10 ms of CPU per invocation. Time spent waiting on OpenRouter does not count. Parsing a streamed model response and rendering the Astro page in that same invocation does. The failure mode is Cloudflare error 1102 while the parent is waiting for a suggestion.
2. The runtime is `workerd`, not Node. `nodejs_compat` is already set in `wrangler.jsonc` and does not turn the isolate into Node. A dependency that calls `require` or `node:fs` can pass on another host and throw on a phone.
3. `npx wrangler rollback` restores Worker code only. It does not undo a Supabase migration or rows written by a bad OpenRouter prompt.
4. An OpenRouter key placed in `vars` inside `wrangler.jsonc` is committed with the repo. Secrets belong in `wrangler secret put` and in gitignored `.dev.vars`.
5. Cloudflare's Astro guide still shows `main: dist/_worker.js/index.js` and `npx wrangler dev`. This repo's `wrangler.jsonc` already points `main` at `@astrojs/cloudflare/entrypoints/server`, and `npm run dev` is the workerd dev server. Following the older guide fights the installed adapter. Isolated Worker Previews (`npx wrangler preview`) need Wrangler ≥ 4.135.0. The lockfile pins 4.131.1, so that command is not available yet.

### Pre-Mortem — How This Could Fail

The app stayed on Workers because the course and the README already said so, and the chore list worked on the free plan. OpenRouter came next. A parent asked for a suggestion, the model took a few seconds, and the Worker returned 1102 because composing the page and reading the stream crossed 10 ms of CPU. Workers Paid at $5 fixed it, so the limit dropped off the list. The API key was pasted into the Wrangler config "so local dev would work" and landed in git. Someone else spent it. Separately, the branch preview host was not on the Supabase redirect allow-list, so login was tested on production. A bad prompt wrote junk rows. `wrangler rollback` restored the script in seconds and left those rows in place. The morning list was wrong, and the OpenRouter bill was not a Cloudflare bill.

### Unknown Unknowns

- `tech-stack.md` says `cloudflare-pages`. The installed adapter and the current Astro deploy guide target Workers. New projects should not be created as Pages.
- Since Astro 6, `astro dev` and `astro preview` run on `workerd`. A separate `wrangler dev` loop is the old workflow. `CLOUDFLARE_ENV` is chosen at `astro build`, not only as `wrangler deploy --env`.
- One OpenRouter call is one subrequest. Free allows 50 per invocation. Paid defaults to 10,000, configurable up to 10 million. A loop that calls several models inside one request can hit the free cap even when CPU is fine.
- The app does not use `Astro.session`. Leaving Astro sessions enabled makes the first deploy provision a KV namespace named `SESSION`. A later rollback is refused if that binding has been deleted.
- Preview URLs on `workers.dev` are public unless Cloudflare Access is added. Wrangler 4.131.1 does not support the Worker Previews shipped on 22 September 2026. Workers Builds' non-production command on this version is `npx wrangler versions upload`, which publishes a version URL, not an isolated preview with its own secrets.

## Operational Story

- **Preview deploys**: Connect the Git repository with Workers Builds. The production branch runs `npm run build` then `npx wrangler deploy`. On Wrangler 4.131.1 a non-production branch defaults to `npx wrangler versions upload`, which returns a version preview URL on `workers.dev`. That URL is public. Fork PRs do not receive that build unless the project allows them. Isolated previews via `npx wrangler preview` require upgrading Wrangler to at least 4.135.0 first. Add every host that should accept login to the Supabase auth redirect allow-list. Protect a preview with Cloudflare Access if the URL must not be world-readable.
- **Secrets**: `npx wrangler secret put SUPABASE_URL`, `npx wrangler secret put SUPABASE_KEY`, and `npx wrangler secret put OPENROUTER_API_KEY`. These are account secrets for the Worker, not keys in `wrangler.jsonc`. People who can deploy the Worker can replace a secret; `wrangler secret` does not print the current value back. Local `npm run dev` reads the same names from gitignored `.dev.vars`. Rotation is `wrangler secret put` again and a new deploy. When the OpenRouter call is added in code, declare `OPENROUTER_API_KEY` in the Astro server env schema the same way as the Supabase secrets.
- **Rollback**: `npx wrangler rollback` promotes a previous Worker version immediately (the last 100 published versions). With no id, Wrangler asks which version. It does not revert Supabase SQL, stored prompts, or secret values. A rollback is refused if a KV, R2, or queue binding used by the target version no longer exists.
- **Approval**: A human runs `npx wrangler deploy` to production, rotates `SUPABASE_KEY` or `OPENROUTER_API_KEY`, and applies any Supabase migration. An agent may run `npm run dev`, `npm run build`, and `npx wrangler tail` unattended. Dropping the Supabase project or the OpenRouter key's budget cap is a human action on those vendors, not a Wrangler action.
- **Logs**: `npx wrangler tail` streams runtime logs. `npx wrangler tail --status error` and `npx wrangler tail --format json` narrow that stream. `observability.enabled` is already true in `wrangler.jsonc`. Build failure text is the output of `npm run build` and of the Workers Builds log for that deployment. Cloudflare's docs MCP and `developers.cloudflare.com/workers/llms.txt` are the agent-readable doc surface.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| OpenRouter stream plus Astro render exceeds 10 ms CPU and returns error 1102 | Devil's advocate / Pre-mortem | H | H | Ship the chore list on Free. On the first 1102, move the account to Workers Paid ($5). Do not try to raise the free CPU cap in config. |
| OpenRouter API key committed in `wrangler.jsonc` `vars` | Devil's advocate / Pre-mortem | M | H | Store it only with `npx wrangler secret put OPENROUTER_API_KEY` and in `.dev.vars`. Never add it under `vars`. |
| `workerd` throws on a Node-only dependency that `nodejs_compat` does not cover | Devil's advocate | M | H | Reproduce on `npm run dev` before deploy. That command is already the Workers runtime. |
| `wrangler rollback` restores code and leaves a Supabase migration or bad prompt rows | Pre-mortem | M | H | Ship schema changes in a backwards-compatible step. Do not roll back code across a destructive migration without a down migration. |
| Preview or production login fails because the Supabase redirect list has the wrong host | Pre-mortem | H | H | After the first deploy, add the `workers.dev` host and any version-preview host you actually use. Do not debug login on production because a preview host was rejected. |
| Following the older Cloudflare Astro guide (`wrangler dev`, `dist/_worker.js`) diverges from Astro 7 | Unknown unknowns | M | M | Keep `main` as `@astrojs/cloudflare/entrypoints/server`. Use `npm run dev`. Deploy with `npm run build` then `npx wrangler deploy`. |
| First deploy creates an unused `SESSION` KV namespace and a later rollback is blocked if it is deleted | Unknown unknowns | M | M | Set `session: false` in `astro.config.mjs` before the first deploy. This app authenticates with Supabase cookies. |
| `wrangler preview` is documented online but absent from Wrangler 4.131.1 | Research finding | H | L | Stay on version preview URLs (`wrangler versions upload`) until Wrangler is upgraded to ≥ 4.135.0. |

## Getting Started

The repo already has the adapter. Installed versions: Astro ^7.3.2, `@astrojs/cloudflare` ^14.3.1, Wrangler 4.131.1 (lockfile). `wrangler.jsonc` already sets `main` to `@astrojs/cloudflare/entrypoints/server`, `nodejs_compat`, and `observability.enabled`. Do not switch to the older `dist/_worker.js` entry or to `wrangler dev`. Do not run `wrangler preview` on this Wrangler version.

1. Local dev is the Workers runtime. Put secrets in `.dev.vars` (gitignored), then start the app:

```bash
npm run dev
```

Names: `SUPABASE_URL`, `SUPABASE_KEY`, and `OPENROUTER_API_KEY` when that call exists.

2. This app does not use `Astro.session`. In `astro.config.mjs`, set `session: false` next to `output: "server"` so the first deploy does not create a `SESSION` KV namespace.

3. The Worker name in `wrangler.jsonc` is `10x-astro-starter`. Change `name` to the app name before the first production deploy if the public `workers.dev` host should not be the starter name.

4. Log in and store production secrets. This prints nothing back and does not belong in git:

```bash
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
npx wrangler secret put OPENROUTER_API_KEY
```

5. Deploy, then read logs or roll back:

```bash
npm run build
npx wrangler deploy
npx wrangler tail
npx wrangler rollback
```

Add the deployed host to the Supabase auth redirect allow-list. If a request that calls OpenRouter returns error 1102, upgrade the Cloudflare account to Workers Paid ($5 per month).

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
