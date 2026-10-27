import {
  checkins as seedCheckins,
  formatLiftCount,
  liftLogField,
  strengthLifts,
  uniqueCheckins,
  type Checkin,
  type PersonLog,
  type StrengthLift,
} from '../data/checkins.ts'
import {
  ACTIVITY_MAX,
  STEP_DAYS_TO_SCORE,
  STRENGTH_POINTS,
  TOTAL_WEEKS,
  adam,
  contestants,
  liftMaxPoints,
  liftPoints,
  lungeStartLabel,
  strengthGoals,
  titleForScore,
  weekNumber,
  weightPoints,
  yagiz,
  type Contestant,
  type PersonId,
} from './challenge.ts'

export type LiftProgress = {
  lift: StrengthLift
  start: number | null
  goal: number
  current: number | null
  points: number
  maxPoints: number
  goalPct: number | null
  startDisplay: string | null
  currentDisplay: string | null
  goalDisplay: string
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
  startWaist: number | null
  currentWaist: number | null
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
  checkins: Checkin[]
}

function firstNumber(rows: Checkin[], id: PersonId, field: keyof PersonLog): number | null {
  for (const row of uniqueCheckins(rows)) {
    const value = row[id][field]
    if (typeof value === 'number') {
      return value
    }
  }
  return null
}

function latestNumber(rows: Checkin[], id: PersonId, field: keyof PersonLog): number | null {
  const unique = uniqueCheckins(rows)
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const value = unique[index]?.[id][field]
    if (typeof value === 'number') {
      return value
    }
  }
  return null
}

/** Opening lifts are baselines. Strength scores only after a later official test. */
function latestScoredLift(rows: Checkin[], id: PersonId, field: keyof PersonLog): number | null {
  const unique = uniqueCheckins(rows)
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const row = unique[index]
    if (!row || row.week < 1) {
      continue
    }
    const value = row[id][field]
    if (typeof value === 'number') {
      return value
    }
  }
  return null
}

export function activityWeeksEarned(id: PersonId, rows: Checkin[] = seedCheckins): number {
  return uniqueCheckins(rows).filter(
    (row) =>
      row.week >= 1 && row.week <= TOTAL_WEEKS && (row[id].stepDays ?? 0) >= STEP_DAYS_TO_SCORE,
  ).length
}

export function activityStreaks(
  id: PersonId,
  rows: Checkin[] = seedCheckins,
): { current: number; best: number } {
  const weeks = new Map<number, boolean>()
  for (const row of uniqueCheckins(rows)) {
    if (row.week >= 1 && row.week <= TOTAL_WEEKS) {
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

function goalDisplayFor(id: PersonId, lift: StrengthLift, goal: number): string {
  if (lift === 'walkingLunges') {
    return `${formatLiftCount(lift, goal)} · ${strengthGoals[id].lungeDumbbellLb} lb`
  }
  return formatLiftCount(lift, goal)
}

function startDisplayFor(id: PersonId, lift: StrengthLift, start: number | null): string | null {
  if (start !== null) {
    return formatLiftCount(lift, start)
  }
  if (lift === 'walkingLunges') {
    return lungeStartLabel[id]
  }
  return null
}

export function liftProgress(id: PersonId, rows: Checkin[] = seedCheckins): LiftProgress[] {
  const goals = strengthGoals[id]
  return strengthLifts.map((lift) => {
    const field = liftLogField[lift]
    const start = firstNumber(rows, id, field)
    const current = latestScoredLift(rows, id, field)
    const goal = goals[lift]
    const maxPoints = liftMaxPoints[lift]
    const points = liftPoints(current, goal, maxPoints)
    const goalPct = current === null || goal <= 0 ? null : Math.min(100, (current / goal) * 100)
    return {
      lift,
      start,
      goal,
      current,
      points,
      maxPoints,
      goalPct,
      startDisplay: startDisplayFor(id, lift, start),
      currentDisplay: current === null ? null : formatLiftCount(lift, current),
      goalDisplay: goalDisplayFor(id, lift, goal),
    }
  })
}

export function strengthPointsFromLifts(lifts: LiftProgress[]): number {
  const total = lifts.reduce((sum, lift) => sum + lift.points, 0)
  return Math.min(STRENGTH_POINTS, Math.max(0, total))
}

function buildPerson(person: Contestant, calendarWeek: number, rows: Checkin[]): PersonStats {
  const currentWeight = latestNumber(rows, person.id, 'weight') ?? person.startWeight
  const poundsLost = Math.max(0, Math.round((person.startWeight - currentWeight) * 10) / 10)
  const poundsLeft = Math.max(0, Math.round((currentWeight - person.goalWeight) * 10) / 10)
  const cutPct = Math.min(100, (poundsLost / person.toLose) * 100)
  const weightPts = weightPoints(poundsLost, person.toLose)
  const lifts = liftProgress(person.id, rows)
  const strengthPts = strengthPointsFromLifts(lifts)
  const activityWeeks = activityWeeksEarned(person.id, rows)
  const activityPts = Math.min(ACTIVITY_MAX, activityWeeks)
  const total = weightPts + strengthPts + activityPts
  const startWaist = firstNumber(rows, person.id, 'waist')
  const currentWaist = latestNumber(rows, person.id, 'waist')
  const weekForPace = Math.max(calendarWeek, 0)
  const expectedLost = person.toLose * (weekForPace / TOTAL_WEEKS)
  const paceDelta = poundsLost - expectedLost
  const onPace = weekForPace === 0 ? true : poundsLost + 0.4 >= expectedLost
  const streaks = activityStreaks(person.id, rows)

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
    activityWeeks,
    streak: streaks.current,
    bestStreak: streaks.best,
    title: titleForScore(total),
    xp: Math.round(total * 10),
    startWaist,
    currentWaist,
    lifts,
  }
}

function weekWinner(row: Checkin): PersonId | null {
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

export function buildStandings(now = new Date(), rows: Checkin[] = seedCheckins): Standings {
  const unique = uniqueCheckins(rows)
  const calendarWeek = weekNumber(now)
  const adamStats = buildPerson(adam, calendarWeek, unique)
  const yagizStats = buildPerson(yagiz, calendarWeek, unique)
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
    rounds: unique.map((row) => ({
      week: row.week,
      date: row.date,
      adam: row.adam,
      yagiz: row.yagiz,
      winner: row.week === 0 ? null : weekWinner(row),
      note: row.note,
    })),
    checkins: unique,
  }
}

export function cutSeries(
  id: PersonId,
  rows: Checkin[] = seedCheckins,
): { week: number; pct: number | null; weight: number | null }[] {
  const person = contestants[id]
  const byWeek = new Map<number, number>()
  for (const row of uniqueCheckins(rows)) {
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

export function formatInches(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }
  const hundredths = Math.round(value * 100) / 100
  if (Number.isInteger(hundredths * 10)) {
    return hundredths.toFixed(1)
  }
  return hundredths.toFixed(2)
}
