import type { PersonId } from '../lib/challenge.ts'

/**
 * Weekly official log. Week 0 is the opening weigh-in (Sept 1). Weeks 1–30
 * are seven-day weeks from Sept 1, then two days to the April 1 lock. Live
 * rows from the authenticated webhook overlay this seed at request time —
 * do not append here for a normal Sunday log.
 *
 * stepDays = how many days that week hit 10,000+ steps. 4+ earns the activity point.
 * waist is taped in inches and is not scored.
 * Strength is scored against personal goals: push-ups and walking lunges are
 * percent of goal, pull-ups are linear per strict rep. Walking lunges are
 * reps per leg at the prescribed dumbbell load. Week 0 lifts are starting
 * points only — they do not score until a later official entry.
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
  pullUps: number | null
  walkingLunges: number | null
}

export const personLogFields = [
  'weight',
  'waist',
  'stepDays',
  'pushUps',
  'pullUps',
  'walkingLunges',
] as const

export type PersonLogField = (typeof personLogFields)[number]

export const strengthLifts = ['pushUps', 'pullUps', 'walkingLunges'] as const
export type StrengthLift = (typeof strengthLifts)[number]

export const liftLabels: Record<StrengthLift, string> = {
  pushUps: 'Push-ups',
  pullUps: 'Pull-ups',
  walkingLunges: 'Walking lunges',
}

export const liftUnits: Record<StrengthLift, string> = {
  pushUps: 'reps',
  pullUps: 'reps',
  walkingLunges: 'reps / leg',
}

export const liftLogField: Record<StrengthLift, keyof PersonLog> = {
  pushUps: 'pushUps',
  pullUps: 'pullUps',
  walkingLunges: 'walkingLunges',
}

export function emptyLog(): PersonLog {
  return {
    weight: null,
    waist: null,
    stepDays: null,
    pushUps: null,
    pullUps: null,
    walkingLunges: null,
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

export function formatLiftCount(lift: StrengthLift, value: number): string {
  const count = Number.isInteger(value) ? String(value) : value.toFixed(1)
  if (lift === 'walkingLunges') {
    return `${count} / leg`
  }
  return `${count} ${liftUnits[lift]}`
}

/** Old seed / test writes that predate the official opening card. */
export function isStalePlaceholderOpening(log: PersonLog): boolean {
  return (
    (log.weight === 285 || log.weight === 185) &&
    log.waist === null &&
    log.pushUps === null &&
    log.pullUps === null &&
    log.walkingLunges === null
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
      pullUps: 0,
      walkingLunges: null,
    },
    yagiz: {
      weight: 178,
      waist: 39,
      stepDays: null,
      pushUps: 13,
      pullUps: 1,
      walkingLunges: null,
    },
    note: 'Opening card. Weight, waist, and strength starting points are locked.',
  },
  {
    week: 1,
    date: '2026-09-07',
    adam: {
      weight: 277.6,
      waist: null,
      stepDays: 4,
      pushUps: null,
      pullUps: null,
      walkingLunges: null,
    },
    yagiz: {
      weight: 174.6,
      waist: null,
      stepDays: 0,
      pushUps: null,
      pullUps: null,
      walkingLunges: null,
    },
    note: 'Week 1 weigh-in. Adam 4 days at 10k. Yagiz 0.',
  },
  {
    week: 2,
    date: '2026-09-14',
    adam: {
      weight: 273.8,
      waist: null,
      stepDays: 4,
      pushUps: null,
      pullUps: null,
      walkingLunges: null,
    },
    yagiz: {
      weight: 173.8,
      waist: null,
      stepDays: 0,
      pushUps: null,
      pullUps: null,
      walkingLunges: null,
    },
    note: 'Week 2 weigh-in. Adam 4 days at 10k. Yagiz 0.',
  },
  {
    week: 3,
    date: '2026-09-21',
    adam: {
      weight: 270.4,
      waist: null,
      stepDays: 5,
      pushUps: null,
      pullUps: null,
      walkingLunges: null,
    },
    yagiz: {
      weight: 174,
      waist: null,
      stepDays: 4,
      pushUps: null,
      pullUps: null,
      walkingLunges: null,
    },
    note: 'Week 3 weigh-in. Adam 5 days at 10k. Yagiz 4.',
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
