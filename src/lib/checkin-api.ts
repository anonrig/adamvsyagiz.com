import { createHash, timingSafeEqual } from 'node:crypto'

import { strengthLifts, type PersonLog } from '../data/checkins.ts'
import { TOTAL_WEEKS, type PersonId } from './challenge.ts'

export const CHECKIN_TOKEN_MIN_LENGTH = 20
export const CHECKIN_MAX_BODY_BYTES = 8_192

export type CheckinSecrets = {
  adam?: string
  yagiz?: string
}

export type CheckinPatch = {
  week?: number
  date?: string
  weight?: number
  stepDays?: number
  pushUps?: number
  invertedRows?: number
  overheadPress?: number
  note?: string
  sampleId?: string
}

export type AuthResult =
  | { ok: true; person: PersonId }
  | { ok: false; error: 'unconfigured' | 'tokens-not-unique' | 'unauthorized' }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SAMPLE_ID_RE = /^[\w.:+-]{1,128}$/
const NOTE_MAX = 200

const FIELD_LIMITS = {
  weight: { min: 80, max: 450 },
  stepDays: { min: 0, max: 7, integer: true },
  pushUps: { min: 1, max: 400, integer: true },
  invertedRows: { min: 1, max: 400, integer: true },
  overheadPress: { min: 1, max: 500 },
} as const

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function tokenMatches(provided: string, expected: string): boolean {
  return timingSafeEqual(sha256(provided), sha256(expected))
}

export function secretsReady(secrets: CheckinSecrets): boolean {
  const adam = secrets.adam?.trim() ?? ''
  const yagiz = secrets.yagiz?.trim() ?? ''
  return (
    adam.length >= CHECKIN_TOKEN_MIN_LENGTH &&
    yagiz.length >= CHECKIN_TOKEN_MIN_LENGTH &&
    adam !== yagiz
  )
}

export function personFromToken(token: string, secrets: CheckinSecrets): AuthResult {
  const adam = secrets.adam?.trim() ?? ''
  const yagiz = secrets.yagiz?.trim() ?? ''
  if (!secretsReady(secrets)) {
    return { ok: false, error: 'unconfigured' }
  }

  const provided = token.trim()
  if (!provided) {
    return { ok: false, error: 'unauthorized' }
  }

  const isAdam = tokenMatches(provided, adam)
  const isYagiz = tokenMatches(provided, yagiz)
  if (isAdam && isYagiz) {
    return { ok: false, error: 'tokens-not-unique' }
  }
  if (isAdam) {
    return { ok: true, person: 'adam' }
  }
  if (isYagiz) {
    return { ok: true, person: 'yagiz' }
  }
  return { ok: false, error: 'unauthorized' }
}

export function extractToken(
  authorization: string | null,
  headerToken: string | null,
  bodyToken: unknown,
): string | null {
  const bearer = authorization?.match(/^Bearer\s+(\S+)/i)?.[1]
  if (bearer) {
    return bearer
  }
  if (headerToken?.trim()) {
    return headerToken.trim()
  }
  if (typeof bodyToken === 'string' && bodyToken.trim()) {
    return bodyToken.trim()
  }
  return null
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function validateNumber(
  name: keyof typeof FIELD_LIMITS,
  value: number,
): { ok: true; value: number } | { ok: false; error: string } {
  const limit = FIELD_LIMITS[name]
  if ('integer' in limit && limit.integer && !Number.isInteger(value)) {
    return { ok: false, error: `${name} must be a whole number.` }
  }
  if (value < limit.min || value > limit.max) {
    return { ok: false, error: `${name} must be between ${limit.min} and ${limit.max}.` }
  }
  if (name === 'weight' || name === 'overheadPress') {
    return { ok: true, value: Math.round(value * 10) / 10 }
  }
  return { ok: true, value }
}

export function parseCheckinPatch(
  input: Record<string, unknown>,
): { ok: true; patch: CheckinPatch } | { ok: false; error: string } {
  const patch: CheckinPatch = {}

  if (input.week !== undefined && input.week !== null && input.week !== '') {
    const week = asFiniteNumber(input.week)
    if (week === undefined || !Number.isInteger(week) || week < 0 || week > TOTAL_WEEKS) {
      return { ok: false, error: `week must be an integer from 0 to ${TOTAL_WEEKS}.` }
    }
    patch.week = week
  }

  const date = asTrimmedString(input.date)
  if (date !== undefined) {
    if (!DATE_RE.test(date)) {
      return { ok: false, error: 'date must be YYYY-MM-DD.' }
    }
    patch.date = date
  }

  const sampleId = asTrimmedString(input.sampleId) ?? asTrimmedString(input.recordedAt)
  if (sampleId !== undefined) {
    if (!SAMPLE_ID_RE.test(sampleId)) {
      return { ok: false, error: 'sampleId must be a short Health sample id or timestamp.' }
    }
    patch.sampleId = sampleId
  }

  const note = asTrimmedString(input.note)
  if (note !== undefined) {
    if (note.length > NOTE_MAX) {
      return { ok: false, error: `note must be ${NOTE_MAX} characters or fewer.` }
    }
    let cleaned = ''
    for (const char of note) {
      const code = char.codePointAt(0) ?? 0
      if (code >= 32 || code === 9) {
        cleaned += char
      }
    }
    patch.note = cleaned
  }

  const numericFields = ['weight', 'stepDays', 'pushUps', 'invertedRows', 'overheadPress'] as const
  for (const field of numericFields) {
    if (input[field] === undefined || input[field] === null || input[field] === '') {
      continue
    }
    const raw = asFiniteNumber(input[field])
    if (raw === undefined) {
      return { ok: false, error: `${field} must be a number.` }
    }
    const checked = validateNumber(field, raw)
    if (!checked.ok) {
      return checked
    }
    patch[field] = checked.value
  }

  const hasValue =
    patch.weight !== undefined ||
    patch.stepDays !== undefined ||
    patch.pushUps !== undefined ||
    patch.invertedRows !== undefined ||
    patch.overheadPress !== undefined ||
    patch.note !== undefined

  if (!hasValue) {
    return { ok: false, error: 'Send at least one of weight, stepDays, a lift, or note.' }
  }

  return { ok: true, patch }
}

export function applyLogPatch(current: PersonLog, patch: CheckinPatch): PersonLog {
  const next = { ...current }
  if (patch.weight !== undefined) next.weight = patch.weight
  if (patch.stepDays !== undefined) next.stepDays = patch.stepDays
  for (const lift of strengthLifts) {
    const value = patch[lift]
    if (value !== undefined) {
      next[lift] = value
    }
  }
  return next
}

export function patchTouchesLog(patch: CheckinPatch): boolean {
  return (
    patch.weight !== undefined ||
    patch.stepDays !== undefined ||
    patch.pushUps !== undefined ||
    patch.invertedRows !== undefined ||
    patch.overheadPress !== undefined
  )
}
