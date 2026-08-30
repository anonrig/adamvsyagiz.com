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

## Log a week

Standings, charts, quests, and badges all read from `src/data/checkins.ts`.

Opening weigh-in is already in as week `0`. After each challenge week, append a row:

```ts
{
  week: 1,
  date: '2026-09-07',
  adam: { weight: 282.4, stepDays: 5, pushUps: 20, invertedRows: 8, overheadPress: 95 },
  yagiz: { weight: 183.0, stepDays: 6, pushUps: 35, invertedRows: 12, overheadPress: 75 },
}
```

- `stepDays`: days that week with 10,000+ steps. `4+` earns the activity point.
- Strength fields are optional. The first logged value for a lift becomes that person's baseline.
- Redeploy after you save. Live JSON: `/standings.json`
