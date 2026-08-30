import { checkins, strengthLifts, type PersonLog, type StrengthLift } from '../data/checkins.ts'
import {
  ACTIVITY_MAX,
  STEP_DAYS_TO_SCORE,
  STRENGTH_POINTS,
  TOTAL_WEEKS,
  adam,
  contestants,
  titleForScore,
  weekNumber,
  weightPoints,
  yagiz,
  type Contestant,
  type PersonId,
} from './challenge.ts'

export type LiftProgress = {
  lift: StrengthLift
  baseline: number | null
  current: number | null
  improvementPct: number | null
}

export type PersonStats = {
  id: PersonId
  name: string
  corner: string
  startWeight: number
  goalWeight: number
  toLose: number
  currentWeight: number
  poundsLost: number
  poundsLeft: number
  cutPct: number
  weightPts: number
  strengthPts: number
  activityPts: number
  total: number
  onPace: boolean
  expectedLost: number
  paceDelta: number
  weeklyPace: number
  activityWeeks: number
  streak: number
  bestStreak: number
  title: string
  xp: number
  lifts: LiftProgress[]
}

export type WeekRound = {
  week: number
  date: string
  adam: PersonLog
  yagiz: PersonLog
  winner: PersonId | null
  note?: string
}

export type Standings = {
  now: Date
  calendarWeek: number
  adam: PersonStats
  yagiz: PersonStats
  leader: PersonId | null
  trailer: PersonId | null
  margin: number
  rounds: WeekRound[]
}

function firstNumber(id: PersonId, field: keyof PersonLog): number | null {
  for (const row of checkins) {
    const value = row[id][field]
    if (typeof value === 'number') {
      return value
    }
  }
  return null
}

function latestNumber(id: PersonId, field: keyof PersonLog): number | null {
  for (let index = checkins.length - 1; index >= 0; index -= 1) {
    const value = checkins[index]?.[id][field]
    if (typeof value === 'number') {
      return value
    }
  }
  return null
}

export function activityWeeksEarned(id: PersonId): number {
  return checkins.filter((row) => row.week >= 1 && (row[id].stepDays ?? 0) >= STEP_DAYS_TO_SCORE)
    .length
}

export function activityStreaks(id: PersonId): { current: number; best: number } {
  const weeks = new Map<number, boolean>()
  for (const row of checkins) {
    if (row.week >= 1) {
      weeks.set(row.week, (row[id].stepDays ?? 0) >= STEP_DAYS_TO_SCORE)
    }
  }

  let best = 0
  let run = 0
  for (let week = 1; week <= TOTAL_WEEKS; week += 1) {
    if (weeks.get(week)) {
      run += 1
      best = Math.max(best, run)
    } else if (weeks.has(week)) {
      run = 0
    }
  }

  const logged = [...weeks.keys()].toSorted((a, b) => a - b)
  let current = 0
  for (let index = logged.length - 1; index >= 0; index -= 1) {
    const week = logged[index]
    if (week && weeks.get(week)) {
      current += 1
    } else {
      break
    }
  }

  return { current, best }
}

export function liftProgress(id: PersonId): LiftProgress[] {
  return strengthLifts.map((lift) => {
    const baseline = firstNumber(id, lift)
    const current = latestNumber(id, lift)
    let improvementPct: number | null = null
    if (baseline && baseline > 0 && current !== null) {
      improvementPct = ((current - baseline) / baseline) * 100
    }
    return { lift, baseline, current, improvementPct }
  })
}

export function strengthPointsFromLifts(lifts: LiftProgress[]): number {
  const scored = lifts
    .map((lift) => lift.improvementPct)
    .filter((value): value is number => value !== null)
  if (scored.length === 0) {
    return 0
  }
  const average = scored.reduce((sum, value) => sum + value, 0) / scored.length
  return Math.min(STRENGTH_POINTS, Math.max(0, average))
}

function buildPerson(person: Contestant, calendarWeek: number): PersonStats {
  const currentWeight = latestNumber(person.id, 'weight') ?? person.startWeight
  const poundsLost = Math.max(0, person.startWeight - currentWeight)
  const poundsLeft = Math.max(0, currentWeight - person.goalWeight)
  const cutPct = Math.min(100, (poundsLost / person.toLose) * 100)
  const weightPts = weightPoints(poundsLost, person.toLose)
  const lifts = liftProgress(person.id)
  const strengthPts = strengthPointsFromLifts(lifts)
  const activityPts = Math.min(ACTIVITY_MAX, activityWeeksEarned(person.id))
  const total = weightPts + strengthPts + activityPts
  const weekForPace = Math.max(calendarWeek, 0)
  const expectedLost = person.toLose * (weekForPace / TOTAL_WEEKS)
  const paceDelta = poundsLost - expectedLost
  const onPace = weekForPace === 0 ? true : poundsLost + 0.4 >= expectedLost
  const streaks = activityStreaks(person.id)

  return {
    id: person.id,
    name: person.name,
    corner: person.corner,
    startWeight: person.startWeight,
    goalWeight: person.goalWeight,
    toLose: person.toLose,
    currentWeight,
    poundsLost,
    poundsLeft,
    cutPct,
    weightPts,
    strengthPts,
    activityPts,
    total,
    onPace,
    expectedLost,
    paceDelta,
    weeklyPace: person.toLose / TOTAL_WEEKS,
    activityWeeks: activityPts,
    streak: streaks.current,
    bestStreak: streaks.best,
    title: titleForScore(total),
    xp: Math.round(total * 10),
    lifts,
  }
}

function weekWinner(row: (typeof checkins)[number]): PersonId | null {
  const score = (id: PersonId): number => {
    const person = contestants[id]
    const weight = row[id].weight
    const lost = weight === null ? 0 : Math.max(0, person.startWeight - weight)
    const cut = lost / person.toLose
    const steps = (row[id].stepDays ?? 0) >= STEP_DAYS_TO_SCORE ? 1 : 0
    return cut * 2 + steps
  }
  const adamScore = score('adam')
  const yagizScore = score('yagiz')
  if (adamScore === yagizScore) {
    return null
  }
  return adamScore > yagizScore ? 'adam' : 'yagiz'
}

export function buildStandings(now = new Date()): Standings {
  const calendarWeek = weekNumber(now)
  const adamStats = buildPerson(adam, calendarWeek)
  const yagizStats = buildPerson(yagiz, calendarWeek)
  const margin = Math.abs(adamStats.total - yagizStats.total)
  let leader: PersonId | null = null
  if (adamStats.total > yagizStats.total) leader = 'adam'
  if (yagizStats.total > adamStats.total) leader = 'yagiz'

  return {
    now,
    calendarWeek,
    adam: adamStats,
    yagiz: yagizStats,
    leader,
    trailer: leader === 'adam' ? 'yagiz' : leader === 'yagiz' ? 'adam' : null,
    margin,
    rounds: checkins.map((row) => ({
      week: row.week,
      date: row.date,
      adam: row.adam,
      yagiz: row.yagiz,
      winner: row.week === 0 ? null : weekWinner(row),
      note: row.note,
    })),
  }
}

export function cutSeries(
  id: PersonId,
): { week: number; pct: number | null; weight: number | null }[] {
  const person = contestants[id]
  const byWeek = new Map<number, number>()
  for (const row of checkins) {
    if (row[id].weight !== null) {
      byWeek.set(row.week, row[id].weight)
    }
  }
  return Array.from({ length: TOTAL_WEEKS + 1 }, (_, week) => {
    const weight = byWeek.get(week) ?? null
    const pct =
      weight === null
        ? null
        : Math.min(100, Math.max(0, ((person.startWeight - weight) / person.toLose) * 100))
    return { week, pct, weight }
  })
}

export function paceSeries(): { week: number; pct: number }[] {
  return Array.from({ length: TOTAL_WEEKS + 1 }, (_, week) => ({
    week,
    pct: (week / TOTAL_WEEKS) * 100,
  }))
}

export function formatPts(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function formatLbs(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
