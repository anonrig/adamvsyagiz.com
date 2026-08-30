import { handle } from '@astrojs/cloudflare/handler'

const PAGE_CDN_CACHE = 'public, max-age=60, stale-while-revalidate=30'
const ASSET_CDN_CACHE = 'public, max-age=31536000, immutable'
const LIVE_NO_STORE = new Set(['/log', '/standings.json'])

function isImmutableAsset(pathname: string): boolean {
  return pathname.startsWith('/_astro/') || pathname.startsWith('/fonts/')
}

function isLivePath(pathname: string): boolean {
  return pathname.startsWith('/api/') || LIVE_NO_STORE.has(pathname)
}

function withHeaders(response: Response, mutate: (headers: Headers) => void): Response {
  const headers = new Headers(response.headers)
  mutate(headers)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function applyCdnCache(request: Request, response: Response): Response {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return response
  }
  if (response.status !== 200) {
    return response
  }

  return withHeaders(response, (headers) => {
    const existing = headers.get('Cloudflare-CDN-Cache-Control')
    if (existing && existing !== 'no-store') {
      return
    }
    const { pathname } = new URL(request.url)
    if (isLivePath(pathname)) {
      headers.set('Cache-Control', 'no-store')
      headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
      return
    }
    headers.set(
      'Cloudflare-CDN-Cache-Control',
      isImmutableAsset(pathname) ? ASSET_CDN_CACHE : PAGE_CDN_CACHE,
    )
    if (!headers.has('Cache-Tag')) {
      headers.set('Cache-Tag', isImmutableAsset(pathname) ? 'asset' : 'page')
    }
  })
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const response = await handle(request, env, ctx)
    return applyCdnCache(request, response)
  },
} satisfies ExportedHandler<Env>
