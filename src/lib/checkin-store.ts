import {
  cloneCheckins,
  emptyLog,
  personLogsEqual,
  uniqueCheckins,
  type Checkin,
  type PersonLog,
} from '../data/checkins.ts'
import { weekLogDate, type PersonId } from './challenge.ts'
import { applyLogPatch, type CheckinPatch } from './checkin-api.ts'

export const CHECKIN_KEY_PREFIX = 'log:'

export type CheckinKV = {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  list(options: { prefix: string; cursor?: string }): Promise<{
    keys: { name: string }[]
    list_complete?: boolean
    cursor?: string
  }>
}

export type StoredPersonWeek = {
  week: number
  date: string
  log: PersonLog
  note?: string
  sampleId?: string
  updatedAt: string
}

export type PersonWeekPatch = {
  person: PersonId
  entry: StoredPersonWeek
}

const KEY_RE = /^log:(adam|yagiz):(\d+)$/

function isPersonId(value: string): value is PersonId {
  return value === 'adam' || value === 'yagiz'
}

export function checkinKey(person: PersonId, week: number): string {
  return `${CHECKIN_KEY_PREFIX}${person}:${week}`
}

export function parseCheckinKey(key: string): { person: PersonId; week: number } | null {
  const match = key.match(KEY_RE)
  const person = match?.[1]
  const week = match?.[2]
  if (!person || week === undefined || !isPersonId(person)) {
    return null
  }
  return { person, week: Number(week) }
}

function isPersonLog(value: unknown): value is PersonLog {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const log = value as Record<string, unknown>
  const fields = ['weight', 'stepDays', 'pushUps', 'invertedRows', 'overheadPress'] as const
  return fields.every((field) => log[field] === null || typeof log[field] === 'number')
}

export function parseStoredPersonWeek(raw: string, fallbackWeek: number): StoredPersonWeek | null {
  try {
    const value = JSON.parse(raw) as unknown
    if (value === null || typeof value !== 'object') {
      return null
    }
    const row = value as Record<string, unknown>
    if (!isPersonLog(row.log)) {
      return null
    }
    const week =
      typeof row.week === 'number' && Number.isInteger(row.week) ? row.week : fallbackWeek
    const date = typeof row.date === 'string' && row.date.length >= 8 ? row.date : weekLogDate(week)
    const note = typeof row.note === 'string' ? row.note : undefined
    const sampleId = typeof row.sampleId === 'string' ? row.sampleId : undefined
    const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : ''
    return { week, date, log: { ...row.log }, note, sampleId, updatedAt }
  } catch {
    return null
  }
}

export function findDuplicateWeighIn(
  rows: Checkin[],
  patches: PersonWeekPatch[],
  person: PersonId,
  week: number,
  next: { weight: number | null; date: string; sampleId?: string },
): number | null {
  if (next.sampleId) {
    const sampleHit = patches.find(
      (item) =>
        item.person === person && item.entry.sampleId === next.sampleId && item.entry.week !== week,
    )
    if (sampleHit) {
      return sampleHit.entry.week
    }
  }

  if (typeof next.weight !== 'number') {
    return null
  }

  for (const row of rows) {
    if (row.week === week) {
      continue
    }
    if (row[person].weight === next.weight && row.date === next.date) {
      return row.week
    }
  }
  return null
}

export function mergeCheckins(seed: Checkin[], patches: PersonWeekPatch[]): Checkin[] {
  const byWeek = new Map<number, Checkin>()
  for (const row of uniqueCheckins(seed)) {
    byWeek.set(row.week, row)
  }

  for (const { person, entry } of patches) {
    const existing = byWeek.get(entry.week) ?? {
      week: entry.week,
      date: entry.date || weekLogDate(entry.week),
      adam: emptyLog(),
      yagiz: emptyLog(),
    }
    byWeek.set(entry.week, {
      week: entry.week,
      date: entry.date || existing.date,
      adam: person === 'adam' ? { ...entry.log } : existing.adam,
      yagiz: person === 'yagiz' ? { ...entry.log } : existing.yagiz,
      note: entry.note ?? existing.note,
    })
  }

  return uniqueCheckins([...byWeek.values()])
}

export async function loadPatches(kv: CheckinKV): Promise<PersonWeekPatch[]> {
  const patches: PersonWeekPatch[] = []
  let cursor: string | undefined
  for (;;) {
    const page = await kv.list({ prefix: CHECKIN_KEY_PREFIX, ...(cursor ? { cursor } : {}) })
    for (const item of page.keys) {
      const parsedKey = parseCheckinKey(item.name)
      if (!parsedKey) {
        continue
      }
      const raw = await kv.get(item.name)
      if (!raw) {
        continue
      }
      const entry = parseStoredPersonWeek(raw, parsedKey.week)
      if (!entry) {
        continue
      }
      patches.push({ person: parsedKey.person, entry: { ...entry, week: parsedKey.week } })
    }
    if (page.list_complete !== false || !page.cursor) {
      break
    }
    cursor = page.cursor
  }
  return patches
}

export async function loadCheckinState(
  kv: CheckinKV | undefined,
  seed: Checkin[],
): Promise<{ rows: Checkin[]; patches: PersonWeekPatch[] }> {
  if (!kv) {
    return { rows: uniqueCheckins(cloneCheckins(seed)), patches: [] }
  }
  try {
    const patches = await loadPatches(kv)
    return { rows: mergeCheckins(seed, patches), patches }
  } catch {
    return { rows: uniqueCheckins(cloneCheckins(seed)), patches: [] }
  }
}

export async function loadCheckins(kv: CheckinKV | undefined, seed: Checkin[]): Promise<Checkin[]> {
  const { rows } = await loadCheckinState(kv, seed)
  return rows
}

export async function readPersonWeek(
  kv: CheckinKV,
  person: PersonId,
  week: number,
): Promise<StoredPersonWeek | null> {
  const raw = await kv.get(checkinKey(person, week))
  if (!raw) {
    return null
  }
  return parseStoredPersonWeek(raw, week)
}

export function existingLogFor(
  rows: Checkin[],
  person: PersonId,
  week: number,
): { log: PersonLog; date: string; note?: string } {
  const row = rows.find((item) => item.week === week)
  if (!row) {
    return { log: emptyLog(), date: weekLogDate(week) }
  }
  return { log: { ...row[person] }, date: row.date, note: row.note }
}

export async function savePersonWeek(
  kv: CheckinKV,
  person: PersonId,
  week: number,
  current: { log: PersonLog; date: string; note?: string },
  patch: CheckinPatch,
  now = new Date(),
): Promise<{ entry: StoredPersonWeek; unchanged: boolean }> {
  const nextLog = applyLogPatch(current.log, patch)
  const nextDate = patch.date ?? current.date
  const nextNote = patch.note ?? current.note
  const stored = await readPersonWeek(kv, person, week)
  const nextSampleId = patch.sampleId ?? stored?.sampleId
  const unchanged =
    personLogsEqual(current.log, nextLog) &&
    nextDate === current.date &&
    nextNote === current.note &&
    nextSampleId === stored?.sampleId

  const entry: StoredPersonWeek = {
    week,
    date: nextDate,
    log: nextLog,
    note: nextNote,
    sampleId: nextSampleId,
    updatedAt: now.toISOString(),
  }

  if (unchanged) {
    return {
      entry: stored ?? {
        week,
        date: current.date,
        log: current.log,
        note: current.note,
        sampleId: nextSampleId,
        updatedAt: '',
      },
      unchanged: true,
    }
  }

  await kv.put(checkinKey(person, week), JSON.stringify(entry))
  return { entry, unchanged: false }
}
