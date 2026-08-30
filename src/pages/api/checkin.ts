import type { APIContext } from 'astro'
import { env } from 'cloudflare:workers'

import { checkins as seedCheckins } from '../../data/checkins.ts'
import { TOTAL_WEEKS, weekLogDate, weekNumber } from '../../lib/challenge.ts'
import {
  CHECKIN_MAX_BODY_BYTES,
  extractToken,
  parseCheckinPatch,
  personFromToken,
  type CheckinSecrets,
} from '../../lib/checkin-api.ts'
import { existingLogFor, loadCheckins, savePersonWeek } from '../../lib/checkin-store.ts'
import { buildStandings } from '../../lib/scoring.ts'

export const prerender = false

function secretsFromEnv(): CheckinSecrets {
  return {
    adam: env.ADAM_CHECKIN_TOKEN,
    yagiz: env.YAGIZ_CHECKIN_TOKEN,
  }
}

function noStore(status: number, body: unknown): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}

function wantsHtml(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('text/html')
}

function redirectToLog(request: Request, params: Record<string, string>): Response {
  const url = new URL('/log', request.url)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return Response.redirect(url, 303)
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > CHECKIN_MAX_BODY_BYTES) {
    throw new Error('too-large')
  }

  const type = request.headers.get('content-type') ?? ''
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData()
    const body: Record<string, unknown> = {}
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') {
        body[key] = value
      }
    }
    return body
  }

  const text = await request.text()
  if (text.length > CHECKIN_MAX_BODY_BYTES) {
    throw new Error('too-large')
  }
  if (!text.trim()) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    throw new Error('invalid-body')
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid-body') {
      throw error
    }
    if (type.includes('application/json')) {
      throw new Error('invalid-body')
    }
    const params = new URLSearchParams(text)
    const body: Record<string, unknown> = {}
    for (const [key, value] of params.entries()) {
      body[key] = value
    }
    if (Object.keys(body).length === 0) {
      throw new Error('invalid-body')
    }
    return body
  }
}

async function bustStandingsCache(request: Request): Promise<void> {
  const origin = new URL(request.url).origin
  const cache = (caches as typeof caches & { default?: Cache }).default
  if (!cache) {
    return
  }
  await Promise.all([
    cache.delete(new Request(`${origin}/`)),
    cache.delete(new Request(`${origin}/standings.json`)),
  ])
}

export async function POST(context: APIContext): Promise<Response> {
  const { request, locals } = context
  let body: Record<string, unknown>
  try {
    body = await readBody(request)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'invalid-body'
    if (code === 'too-large') {
      return noStore(413, { ok: false, error: 'too-large' })
    }
    return noStore(400, { ok: false, error: 'invalid-body', message: 'Send JSON or a form.' })
  }

  const token = extractToken(
    request.headers.get('authorization'),
    request.headers.get('x-checkin-token'),
    body.token,
  )
  const auth = personFromToken(token ?? '', secretsFromEnv())
  if (!auth.ok) {
    if (auth.error === 'unconfigured' || auth.error === 'tokens-not-unique') {
      return noStore(503, {
        ok: false,
        error: 'unconfigured',
        message: 'Set ADAM_CHECKIN_TOKEN and YAGIZ_CHECKIN_TOKEN as Worker secrets.',
      })
    }
    if (wantsHtml(request)) {
      return redirectToLog(request, { error: 'unauthorized' })
    }
    return noStore(401, { ok: false, error: 'unauthorized' })
  }

  const parsed = parseCheckinPatch(body)
  if (!parsed.ok) {
    if (wantsHtml(request)) {
      return redirectToLog(request, { error: parsed.error })
    }
    return noStore(400, { ok: false, error: 'invalid', message: parsed.error })
  }

  const now = new Date()
  const calendarWeek = weekNumber(now)
  const week = parsed.patch.week ?? calendarWeek
  if (week > calendarWeek) {
    const message = `Week ${week} has not started yet.`
    if (wantsHtml(request)) {
      return redirectToLog(request, { error: message })
    }
    return noStore(400, { ok: false, error: 'week-not-started', message })
  }

  const kv = env.CHECKINS
  if (!kv) {
    return noStore(503, {
      ok: false,
      error: 'store-unavailable',
      message: 'CHECKINS KV is not bound on this Worker.',
    })
  }

  const rows = await loadCheckins(kv, seedCheckins)
  const current = existingLogFor(rows, auth.person, week)
  const saved = await savePersonWeek(
    kv,
    auth.person,
    week,
    { ...current, date: parsed.patch.date ?? current.date ?? weekLogDate(week) },
    { ...parsed.patch, week },
    now,
  )

  if (!saved.unchanged) {
    const waitUntil = locals.cfContext?.waitUntil?.bind(locals.cfContext)
    if (waitUntil) {
      waitUntil(bustStandingsCache(request))
    } else {
      await bustStandingsCache(request)
    }
  }

  const nextRows = await loadCheckins(kv, seedCheckins)
  const standings = buildStandings(now, nextRows)
  const payload = {
    ok: true,
    unchanged: saved.unchanged,
    person: auth.person,
    week,
    date: saved.entry.date,
    log: saved.entry.log,
    total: standings[auth.person].total,
  }

  if (wantsHtml(request)) {
    return redirectToLog(request, {
      result: saved.unchanged ? 'unchanged' : 'saved',
      week: String(week),
    })
  }
  return noStore(200, payload)
}

export async function GET({ request }: APIContext): Promise<Response> {
  const url = new URL(request.url)
  const token = extractToken(
    request.headers.get('authorization'),
    request.headers.get('x-checkin-token'),
    null,
  )
  const auth = personFromToken(token ?? '', secretsFromEnv())
  if (!auth.ok) {
    if (auth.error === 'unconfigured' || auth.error === 'tokens-not-unique') {
      return noStore(503, { ok: false, error: 'unconfigured' })
    }
    return noStore(401, { ok: false, error: 'unauthorized' })
  }

  const kv = env.CHECKINS
  const now = new Date()
  const calendarWeek = weekNumber(now)
  const rawWeek = url.searchParams.get('week')
  const requested = rawWeek === null || rawWeek === '' ? Number.NaN : Number(rawWeek)
  const week =
    Number.isInteger(requested) && requested >= 0 && requested <= TOTAL_WEEKS
      ? requested
      : calendarWeek
  const rows = await loadCheckins(kv, seedCheckins)
  const current = existingLogFor(rows, auth.person, week)
  return noStore(200, {
    ok: true,
    person: auth.person,
    week,
    calendarWeek,
    date: current.date,
    log: current.log,
  })
}
