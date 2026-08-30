import cloudflare from '@astrojs/cloudflare'
import { cacheCloudflare } from '@astrojs/cloudflare/cache'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, fontProviders } from 'astro/config'

import { websiteUrl } from './src/lib/challenge.ts'
import { latestCheckinDate } from './src/lib/seo.ts'

const pageCache = { maxAge: 60, swr: 30, tags: ['page'] }

export default defineConfig({
  site: websiteUrl,
  output: 'server',
  compressHTML: true,
  session: false,
  trailingSlash: 'never',
  prefetch: true,
  adapter: cloudflare({
    imageService: 'compile',
    prerenderEnvironment: 'node',
  }),
  cache: {
    provider: cacheCloudflare(),
  },
  routeRules: {
    '/': pageCache,
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Bebas Neue',
      cssVariable: '--font-bebas',
    },
    {
      provider: fontProviders.google(),
      name: 'Outfit',
      cssVariable: '--font-outfit',
      weights: [400, 500, 600, 700],
    },
  ],
  integrations: [
    sitemap({
      filter: (page) => new URL(page).pathname === '/',
      serialize(item) {
        return {
          ...item,
          lastmod: latestCheckinDate(),
        }
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
