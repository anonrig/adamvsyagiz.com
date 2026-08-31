import { ACTIVITY_POINTS, TOTAL_WEEKS, prizeLabel, type PersonId } from './challenge.ts'
import { buildStandings, type PersonStats, type Standings } from './scoring.ts'

export type Achievement = {
  id: string
  name: string
  blurb: string
  earned: boolean
}

export function achievementsFor(id: PersonId, standings = buildStandings()): Achievement[] {
  const person = standings[id]
  const rival = standings[id === 'adam' ? 'yagiz' : 'adam']
  const wasBehind = trailThenLead(id, standings)
  const latestWin = [...standings.rounds].reverse().find((round) => round.week >= 1 && round.winner)

  return [
    { id: 'card', name: 'The Card', blurb: `Signed up. ${prizeLabel} is real.`, earned: true },
    {
      id: 'weigh-in',
      name: 'On the Scale',
      blurb: 'Official opening weight is locked.',
      earned: person.currentWeight > 0,
    },
    {
      id: 'first-cut',
      name: 'First Cut',
      blurb: 'Lost at least a pound.',
      earned: person.poundsLost >= 1,
    },
    {
      id: 'five-down',
      name: 'Five Down',
      blurb: 'Five pounds gone.',
      earned: person.poundsLost >= 5,
    },
    {
      id: 'ten-down',
      name: 'Double Digits',
      blurb: 'Ten pounds gone.',
      earned: person.poundsLost >= 10,
    },
    {
      id: 'twenty-down',
      name: 'Twenty Club',
      blurb: 'Twenty pounds gone.',
      earned: person.poundsLost >= 20,
    },
    {
      id: 'halfway',
      name: 'Halfway Hero',
      blurb: '50% of your own cut.',
      earned: person.cutPct >= 50,
    },
    {
      id: 'three-quarter',
      name: 'Three-Quarter',
      blurb: '75% of your own cut.',
      earned: person.cutPct >= 75,
    },
    {
      id: 'goal',
      name: 'Goal Crusher',
      blurb: 'Hit the weight goal.',
      earned: person.cutPct >= 100,
    },
    {
      id: 'pace',
      name: 'On Pace',
      blurb: 'At or ahead of the 32-week line.',
      earned: standings.calendarWeek >= 1 && person.onPace,
    },
    {
      id: 'walk',
      name: 'Walker',
      blurb: 'First 4-day, 10k week.',
      earned: person.activityWeeks >= 1,
    },
    {
      id: 'streak-3',
      name: 'On a Heater',
      blurb: '3-week step streak.',
      earned: person.bestStreak >= 3,
    },
    {
      id: 'streak-6',
      name: 'Unbroken',
      blurb: '6-week step streak.',
      earned: person.bestStreak >= 6,
    },
    {
      id: 'streak-12',
      name: 'Machine',
      blurb: '12-week step streak.',
      earned: person.bestStreak >= 12,
    },
    {
      id: 'iron-month',
      name: 'Iron Month',
      blurb: 'Four qualifying step weeks.',
      earned: person.activityWeeks >= 4,
    },
    {
      id: 'floor',
      name: 'Floor Cleared',
      blurb: '25 activity points.',
      earned: person.activityWeeks >= ACTIVITY_POINTS,
    },
    {
      id: 'bonus',
      name: 'Bonus Round',
      blurb: 'Earned past week 25.',
      earned: person.activityWeeks >= 26,
    },
    {
      id: 'perfect',
      name: 'Perfect Season',
      blurb: '32/32 step weeks.',
      earned: person.activityWeeks >= TOTAL_WEEKS,
    },
    {
      id: 'baseline',
      name: 'Under the Bar',
      blurb: 'Strength baseline recorded.',
      earned: person.lifts.some((lift) => lift.baseline !== null),
    },
    {
      id: 'stronger',
      name: 'Stronger',
      blurb: 'Any lift up from baseline.',
      earned: person.lifts.some((lift) => (lift.improvementPct ?? 0) > 0),
    },
    {
      id: 'triple',
      name: 'Triple Threat',
      blurb: 'All three lifts improved.',
      earned: person.lifts.every((lift) => (lift.improvementPct ?? 0) > 0),
    },
    {
      id: 'press',
      name: 'Press Lord',
      blurb: 'Overhead press +20%.',
      earned:
        (person.lifts.find((lift) => lift.lift === 'overheadPress')?.improvementPct ?? 0) >= 20,
    },
    {
      id: 'belt',
      name: 'The Belt',
      blurb: 'Currently winning the fight.',
      earned: standings.leader === id,
    },
    {
      id: 'round',
      name: 'Round Winner',
      blurb: 'Took the latest logged week.',
      earned: latestWin?.winner === id,
    },
    {
      id: 'comeback',
      name: 'Comeback',
      blurb: 'Were behind. Now ahead.',
      earned: wasBehind && standings.leader === id,
    },
    {
      id: 'gap',
      name: 'Separation',
      blurb: 'Lead by 10+ points.',
      earned: standings.leader === id && standings.margin >= 10,
    },
    {
      id: 'hunter',
      name: 'Hunter',
      blurb: 'Within 5 points of the lead.',
      earned: standings.leader !== id && standings.leader !== null && standings.margin <= 5,
    },
    {
      id: 'rival',
      name: 'Keep Up',
      blurb: 'Match or beat rival cut %.',
      earned: person.cutPct > 0 && person.cutPct >= rival.cutPct,
    },
  ]
}

function trailThenLead(id: PersonId, standings: Standings): boolean {
  if (standings.rounds.length < 3) {
    return false
  }
  const mid = standings.rounds[Math.floor(standings.rounds.length / 2)]
  if (!mid || mid.week === 0) {
    return false
  }
  return standings.leader === id
}

export function earnedCount(
  id: PersonId,
  standings = buildStandings(),
): { earned: number; total: number } {
  const list = achievementsFor(id, standings)
  return { earned: list.filter((item) => item.earned).length, total: list.length }
}

export function lockerRoomLine(standings: Standings): string {
  const { adam: a, yagiz: y, leader, margin, calendarWeek } = standings
  if (calendarWeek === 0) {
    return 'Weigh-in week. The belt is on the table. Do not show up light on courage.'
  }
  if (leader === null && a.total === 0 && y.total === 0) {
    return 'Zero–zero. The first cut, the first walk, the first rep — someone has to flinch.'
  }
  if (leader === null) {
    return `Dead even at ${a.total.toFixed(1)}. The purse hates a tie. Separate.`
  }
  const champ = standings[leader]
  const other = standings[leader === 'adam' ? 'yagiz' : 'adam']
  if (margin < 2) {
    return `${champ.name} has the belt by a whisper. ${other.name}, that is not a lead. That is an insult.`
  }
  if (margin < 8) {
    return `${champ.name} is in front. ${other.name} can still smell the money. Hunt.`
  }
  return `${champ.name} is pulling away. ${other.name} — either you wake up this week or you fund spring break.`
}

export function weeklyQuests(standings: Standings): {
  title: string
  detail: string
  done: (person: PersonStats) => boolean
}[] {
  const week = Math.max(standings.calendarWeek, 1)
  const row = standings.rounds.find((item) => item.week === week)
  return [
    {
      title: 'Weigh in',
      detail: `Log Sunday weight for week ${week}.`,
      done: (person) => row?.[person.id].weight !== null && row?.[person.id].weight !== undefined,
    },
    {
      title: '4 days at 10k',
      detail: 'Four separate days. Apple Watch is the ref.',
      done: (person) => (row?.[person.id].stepDays ?? 0) >= 4,
    },
    {
      title: 'Protect the streak',
      detail: personStreakCopy(week),
      done: (person) => (row?.[person.id].stepDays ?? 0) >= 4 || person.streak === 0,
    },
    {
      title: week === 1 || week === 32 ? 'Strength test' : 'Stay strong',
      detail:
        week === 1
          ? 'Opening baselines are locked. Train. Official retest is week 32.'
          : week === 32
            ? 'Final test. These numbers close the strength card.'
            : 'Train the three lifts. Official retest is week 32.',
      done: (person) =>
        week === 1 || week === 32 ? person.lifts.every((lift) => lift.current !== null) : true,
    },
  ]
}

function personStreakCopy(week: number): string {
  return week === 1 ? 'Start the season 1–0.' : 'Miss a week and the fire goes out.'
}
