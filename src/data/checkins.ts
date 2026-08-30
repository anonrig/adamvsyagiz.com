import type { PersonId } from '../lib/challenge.ts'

/**
 * Weekly official log. Append a row after each Sunday.
 *
 * week 0 = opening weigh-in (Aug 31). Weeks 1–32 = Monday–Sunday challenge weeks.
 * stepDays = how many days that week hit 10,000+ steps. 4+ earns the activity point.
 * Strength numbers are optional. The first logged value for a lift becomes that
 * person's baseline. Later values are scored as % improvement.
 */
export type Checkin = {
  week: number
  date: string
  adam: PersonLog
  yagiz: PersonLog
  note?: string
}

export type PersonLog = {
  weight: number | null
  stepDays: number | null
  pushUps: number | null
  invertedRows: number | null
  overheadPress: number | null
}

export const strengthLifts = ['pushUps', 'invertedRows', 'overheadPress'] as const
export type StrengthLift = (typeof strengthLifts)[number]

export const liftLabels: Record<StrengthLift, string> = {
  pushUps: 'Push-ups',
  invertedRows: 'Inverted rows',
  overheadPress: 'Overhead press',
}

export const liftUnits: Record<StrengthLift, string> = {
  pushUps: 'reps',
  invertedRows: 'reps',
  overheadPress: 'lbs',
}

export function emptyLog(): PersonLog {
  return {
    weight: null,
    stepDays: null,
    pushUps: null,
    invertedRows: null,
    overheadPress: null,
  }
}

export const checkins: Checkin[] = [
  {
    week: 0,
    date: '2026-08-31',
    adam: {
      weight: 285,
      stepDays: null,
      pushUps: null,
      invertedRows: null,
      overheadPress: null,
    },
    yagiz: {
      weight: 185,
      stepDays: null,
      pushUps: null,
      invertedRows: null,
      overheadPress: null,
    },
    note: 'Opening weigh-in. Strength baselines get locked the first time each lift is tested.',
  },
]

export function logsFor(id: PersonId): { week: number; date: string; log: PersonLog }[] {
  return checkins.map((row) => ({ week: row.week, date: row.date, log: row[id] }))
}
