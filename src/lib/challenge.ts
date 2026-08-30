export const websiteUrl = 'https://adamvsyagiz.com'
export const websiteTitle = 'Adam vs Yagiz — $3,000 Spring Break Fitness Challenge'
export const websiteDescription =
  'Two friends. 32 weeks. Winner takes $3,000. Weight loss, strength, and daily activity — August 31, 2026 to April 11, 2027.'

export const CHALLENGE_START = '2026-08-31T00:00:00-04:00'
export const CHALLENGE_END = '2027-04-11T23:59:59-04:00'
export const SPRING_BREAK = '2027-04-12'
export const TOTAL_WEEKS = 32
export const PRIZE_USD = 3000

export const WEIGHT_POINTS = 50
export const STRENGTH_POINTS = 25
export const ACTIVITY_POINTS = 25
export const ACTIVITY_BONUS = 7
export const NORMAL_SCORE = 100
export const MAXIMUM_SCORE = 107

export const adam = {
  name: 'Adam',
  startWeight: 285,
  goalWeight: 230,
  toLose: 55,
} as const

export const yagiz = {
  name: 'Yagiz',
  startWeight: 185,
  goalWeight: 165,
  toLose: 20,
} as const

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

export function weightPoints(poundsLost: number, goalPounds: number): number {
  if (goalPounds <= 0) {
    return 0
  }
  return Math.min(WEIGHT_POINTS, (poundsLost / goalPounds) * WEIGHT_POINTS)
}
