import { achievementsFor, earnedCount } from '@/lib/achievements'
import { buildStandings } from '@/lib/scoring'

export const prerender = false

export function GET(): Response {
  const standings = buildStandings()
  return Response.json({
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
  })
}
