import type { PersonId } from '../lib/challenge.ts'

/**
 * Weekly official log. Week 0 is the opening weigh-in (Sept 1). Weeks 1–32
 * are seven-day weeks from Sept 1. Live rows from the authenticated webhook
 * overlay this seed at request time — do not append here for a normal Sunday log.
 *
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
    date: '2026-09-01',
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
  return (
    left.weight === right.weight &&
    left.stepDays === right.stepDays &&
    left.pushUps === right.pushUps &&
    left.invertedRows === right.invertedRows &&
    left.overheadPress === right.overheadPress
  )
}

export function mergePersonLogs(base: PersonLog, overlay: PersonLog): PersonLog {
  return {
    weight: overlay.weight ?? base.weight,
    stepDays: overlay.stepDays ?? base.stepDays,
    pushUps: overlay.pushUps ?? base.pushUps,
    invertedRows: overlay.invertedRows ?? base.invertedRows,
    overheadPress: overlay.overheadPress ?? base.overheadPress,
  }
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
