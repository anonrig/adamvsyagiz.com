export const websiteUrl = 'https://adamvsyagiz.com'
export const PRIZE_USD = 5000
export const prizeLabel = `$${PRIZE_USD.toLocaleString('en-US')}`

export const websiteTitle = `Adam vs Yagiz — ${prizeLabel} Spring Break Fitness Challenge`
export const websiteDescription = `Live standings for two friends, 32 weeks, winner takes ${prizeLabel}. Weight, strength, and steps — September 1, 2026 to April 11, 2027.`

export const CHALLENGE_START = '2026-09-01T00:00:00-04:00'
export const CHALLENGE_END = '2027-04-11T23:59:59-04:00'
export const SPRING_BREAK = '2027-04-12'
export const TOTAL_WEEKS = 32
export const WEIGHT_POINTS = 50
export const STRENGTH_POINTS = 25
export const ACTIVITY_POINTS = 25
export const ACTIVITY_BONUS = 7
export const ACTIVITY_MAX = 32
export const STEP_DAY_TARGET = 10_000
export const STEP_DAYS_TO_SCORE = 4
export const NORMAL_SCORE = 100
export const MAXIMUM_SCORE = 107

export type PersonId = 'adam' | 'yagiz'

export type Contestant = {
  id: PersonId
  name: string
  corner: string
  startWeight: number
  goalWeight: number
  toLose: number
}

export const adam: Contestant = {
  id: 'adam',
  name: 'Adam',
  corner: 'Blue corner',
  startWeight: 284.8,
  goalWeight: 225,
  toLose: 59.8,
}

export const yagiz: Contestant = {
  id: 'yagiz',
  name: 'Yagiz',
  corner: 'Red corner',
  startWeight: 178,
  goalWeight: 145,
  toLose: 33,
}

export const contestants = { adam, yagiz } as const

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function weekNumber(
  now: Date,
  start = new Date(CHALLENGE_START),
  end = new Date(CHALLENGE_END),
): number {
  if (now < start) {
    return 0
  }
  if (now > end) {
    return TOTAL_WEEKS
  }
  return Math.min(TOTAL_WEEKS, Math.floor((now.getTime() - start.getTime()) / MS_PER_WEEK) + 1)
}

export function weekStartIso(week: number): string {
  const start = new Date(CHALLENGE_START)
  const day = new Date(start.getTime() + (week - 1) * MS_PER_WEEK)
  return day.toISOString().slice(0, 10)
}

/** Official log date for a week: opening day, week-ending Sunday, or the final weigh-in. */
export function weekLogDate(week: number): string {
  if (week <= 0) {
    return '2026-09-01'
  }
  if (week >= TOTAL_WEEKS) {
    return '2027-04-11'
  }
  const utc = new Date(Date.UTC(2026, 8, 1 + week * 7 - 1))
  const year = utc.getUTCFullYear()
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function weightPoints(poundsLost: number, goalPounds: number): number {
  if (goalPounds <= 0) {
    return 0
  }
  return Math.min(WEIGHT_POINTS, (poundsLost / goalPounds) * WEIGHT_POINTS)
}

export function titleForScore(total: number): string {
  if (total >= 100) return 'Final boss'
  if (total >= 75) return 'Title threat'
  if (total >= 50) return 'Dangerous'
  if (total >= 25) return 'In the cut'
  if (total >= 10) return 'Heating up'
  return 'Contender'
}
