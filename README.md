# Adam vs Yagiz

One-page site for the **$3,000 Spring Break Fitness Challenge**.

Astro on [Cloudflare Workers](https://developers.cloudflare.com/workers/), same stack as [yagiz.co](https://github.com/anonrig/yagiz.co).

- **Adam vs Yagiz**
- August 31, 2026 – April 11, 2027
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

```bash
pnpm run deploy
```

That builds the Astro site and runs `wrangler deploy` as a Worker named `adamvsyagiz`. Attach **adamvsyagiz.com** as a custom domain on the Worker in the Cloudflare dashboard.
