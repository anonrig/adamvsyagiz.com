import { env } from 'cloudflare:workers'

import { checkins as seedCheckins } from '@/data/checkins'
import { achievementsFor, earnedCount } from '@/lib/achievements'
import { loadCheckins } from '@/lib/checkin-store'
import { buildStandings } from '@/lib/scoring'

export const prerender = false

export async function GET(): Promise<Response> {
  const rows = await loadCheckins(env.CHECKINS, seedCheckins)
  const standings = buildStandings(new Date(), rows)
  return Response.json(
    {
      generatedAt: standings.now.toISOString(),
      calendarWeek: standings.calendarWeek,
      leader: standings.leader,
      margin: standings.margin,
      adam: {
        ...standings.adam,
        badges: earnedCount('adam', standings),
        unlocked: achievementsFor('adam', standings)
          .filter((item) => item.earned)
          .map((item) => item.id),
      },
      yagiz: {
        ...standings.yagiz,
        badges: earnedCount('yagiz', standings),
        unlocked: achievementsFor('yagiz', standings)
          .filter((item) => item.earned)
          .map((item) => item.id),
      },
      rounds: standings.rounds,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'X-Robots-Tag': 'noindex',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
