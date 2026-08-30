# Adam vs Yagiz

One-page site for the **$3,000 Spring Break Fitness Challenge**.

Astro on [Cloudflare Workers](https://developers.cloudflare.com/workers/), same stack as [yagiz.co](https://github.com/anonrig/yagiz.co).

- **Adam vs Yagiz**
- September 1, 2026 – April 11, 2027
- 32 weeks · winner takes $3,000

## Getting started

```bash
pnpm install
pnpm run dev
```

Open http://localhost:3000.

```bash
pnpm test
pnpm run build
pnpm run preview
```

## Deploy

Do not run bare `wrangler deploy`. Wrangler would rebundle `src/worker.ts` and fail on Astro virtual modules (`virtual:astro:app`, `astro:assets`, …).

```bash
wrangler login
pnpm run deploy
```

That runs `astro build`, then deploys the already-bundled Worker:

```bash
wrangler deploy --config dist/server/wrangler.json
```

Worker name: `adamvsyagiz`. Attach **adamvsyagiz.com** as a custom domain on that Worker.

Non-interactive (CI / Workers Builds):

- Build command: `pnpm run build`
- Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
- Secret: `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID` if the token can see more than one account)

## Cloudflare MCP

Official [Cloudflare API MCP](https://mcp.cloudflare.com/mcp) is declared in `.cursor/mcp.json` (OAuth, no tokens in git).

- **Cursor IDE:** open the project, then Customize → MCP → connect `cloudflare-api` and finish Cloudflare OAuth.
- **Cloud Agents:** repo `mcp.json` is not enough. Add the same HTTP URL in the [agents MCP dropdown](https://cursor.com/agents) and complete OAuth there.

After it is connected, an agent can put Worker secrets (`ADAM_CHECKIN_TOKEN`, `YAGIZ_CHECKIN_TOKEN`) without committing them.

## Log a week

Live standings read the opening weigh-in in `src/data/checkins.ts`, then overlay whatever Adam and Yagiz post to the webhook. Opening week is `0`. You do not redeploy for a normal Sunday log.

Only two tokens can write. Generate them on a machine you trust:

```bash
openssl rand -hex 24
openssl rand -hex 24
```

Set them as **Worker secrets** (not repo files, not `wrangler.toml`):

```bash
npx wrangler secret put ADAM_CHECKIN_TOKEN
npx wrangler secret put YAGIZ_CHECKIN_TOKEN
```

Or Cloudflare Dashboard → Workers → `adamvsyagiz` → Settings → Variables and Secrets. For local preview, copy `.dev.vars.example` to `.dev.vars`.

The `CHECKINS` KV namespace is declared without an id so Wrangler provisions it on deploy.

### Webhook

`POST https://adamvsyagiz.com/api/checkin`

```http
Authorization: Bearer <your token>
Content-Type: application/json

{"weight":282.4,"stepDays":5,"pushUps":20,"invertedRows":8,"overheadPress":95}
```

The token picks the person. A `person` field in the body is ignored. `week` defaults to the current challenge week. Duplicates are dropped:

- Same person + same week overwrites that row. Identical numbers return `{ "unchanged": true, "duplicate": true }` and do not write.
- The same weigh-in (`date` + `weight`, or `sampleId`) cannot be filed on a second week.
- Two rows for week N collapse into one before scoring, so activity points cannot double-count.

Optional fields: `week`, `date`, `weight`, `stepDays`, `pushUps`, `invertedRows`, `overheadPress`, `note`, `sampleId`. Send at least one value. Form posts from `/log` work too.

### iPhone Shortcut

Build it on the phone from the numbered steps on [adamvsyagiz.com/log](https://adamvsyagiz.com/log). Put your token in a **Text** action, ask for the numbers, then **Get Contents of URL** → POST the JSON with `Authorization: Bearer …`. Do not share that shortcut.

Safari backup: [adamvsyagiz.com/log](https://adamvsyagiz.com/log). Live JSON: `/standings.json`.
