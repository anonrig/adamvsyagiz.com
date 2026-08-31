import type { PersonId } from '../lib/challenge.ts'

/**
 * Weekly official log. Week 0 is the opening weigh-in (Sept 1). Weeks 1–31
 * are seven-day weeks from Sept 1. Live rows from the authenticated webhook
 * overlay this seed at request time — do not append here for a normal Sunday log.
 *
 * stepDays = how many days that week hit 10,000+ steps. 4+ earns the activity point.
 * waist is taped in inches and is not scored.
 * Strength: first logged value for a lift is the baseline. Overhead press is
 * stored as reps at a load and scored as volume (reps × lb).
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
  waist: number | null
  stepDays: number | null
  pushUps: number | null
  invertedRows: number | null
  overheadPressReps: number | null
  overheadPressWeight: number | null
}

export const personLogFields = [
  'weight',
  'waist',
  'stepDays',
  'pushUps',
  'invertedRows',
  'overheadPressReps',
  'overheadPressWeight',
] as const

export type PersonLogField = (typeof personLogFields)[number]

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
  overheadPress: 'reps × lb',
}

export type OverheadPressSet = {
  reps: number
  weight: number
  volume: number
}

export function emptyLog(): PersonLog {
  return {
    weight: null,
    waist: null,
    stepDays: null,
    pushUps: null,
    invertedRows: null,
    overheadPressReps: null,
    overheadPressWeight: null,
  }
}

export function coercePersonLog(value: unknown): PersonLog | null {
  if (value === null || typeof value !== 'object') {
    return null
  }
  const raw = value as Record<string, unknown>
  const log = emptyLog()
  for (const field of personLogFields) {
    const item = raw[field]
    if (item === undefined || item === null) {
      continue
    }
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      return null
    }
    log[field] = item
  }
  return log
}

export function overheadPressSet(log: PersonLog): OverheadPressSet | null {
  const reps = log.overheadPressReps
  const weight = log.overheadPressWeight
  if (typeof reps !== 'number' || typeof weight !== 'number') {
    return null
  }
  return { reps, weight, volume: reps * weight }
}

export function formatOhpSet(set: OverheadPressSet): string {
  const load = Number.isInteger(set.weight) ? String(set.weight) : set.weight.toFixed(1)
  return `${set.reps} × ${load} lb`
}

/** Old seed / test writes that predate the official opening card. */
export function isStalePlaceholderOpening(log: PersonLog): boolean {
  return (
    (log.weight === 285 || log.weight === 185) &&
    log.waist === null &&
    log.pushUps === null &&
    log.invertedRows === null &&
    log.overheadPressReps === null &&
    log.overheadPressWeight === null
  )
}

export const checkins: Checkin[] = [
  {
    week: 0,
    date: '2026-09-01',
    adam: {
      weight: 284.8,
      waist: 49.75,
      stepDays: null,
      pushUps: 9,
      invertedRows: 6,
      overheadPressReps: 13,
      overheadPressWeight: 25,
    },
    yagiz: {
      weight: 178,
      waist: 39,
      stepDays: null,
      pushUps: 13,
      invertedRows: 6,
      overheadPressReps: 16,
      overheadPressWeight: 20,
    },
    note: 'Opening card. Weight, waist, and strength baselines are locked.',
  },
]

export function logsFor(
  id: PersonId,
  rows: Checkin[] = checkins,
): { week: number; date: string; log: PersonLog }[] {
  return rows.map((row) => ({ week: row.week, date: row.date, log: row[id] }))
}

export function cloneCheckins(rows: Checkin[] = checkins): Checkin[] {
  return rows.map((row) => ({
    week: row.week,
    date: row.date,
    adam: { ...row.adam },
    yagiz: { ...row.yagiz },
    note: row.note,
  }))
}

export function personLogsEqual(left: PersonLog, right: PersonLog): boolean {
  return personLogFields.every((field) => left[field] === right[field])
}

export function mergePersonLogs(base: PersonLog, overlay: PersonLog): PersonLog {
  const next = emptyLog()
  for (const field of personLogFields) {
    next[field] = overlay[field] ?? base[field]
  }
  return next
}

/** One official row per challenge week. Later values fill empty fields on a collision. */
export function uniqueCheckins(rows: Checkin[]): Checkin[] {
  const byWeek = new Map<number, Checkin>()
  for (const row of rows) {
    const existing = byWeek.get(row.week)
    if (!existing) {
      byWeek.set(row.week, {
        week: row.week,
        date: row.date,
        adam: { ...row.adam },
        yagiz: { ...row.yagiz },
        note: row.note,
      })
      continue
    }
    byWeek.set(row.week, {
      week: row.week,
      date: row.date || existing.date,
      adam: mergePersonLogs(existing.adam, row.adam),
      yagiz: mergePersonLogs(existing.yagiz, row.yagiz),
      note: row.note ?? existing.note,
    })
  }
  return [...byWeek.values()].toSorted((left, right) => left.week - right.week)
}
