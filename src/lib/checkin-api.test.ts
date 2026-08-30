import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { checkins, emptyLog, personLogsEqual } from '../data/checkins.ts'
import { weekLogDate } from './challenge.ts'
import {
  applyLogPatch,
  extractToken,
  parseCheckinPatch,
  personFromToken,
  secretsReady,
} from './checkin-api.ts'
import {
  checkinKey,
  mergeCheckins,
  parseCheckinKey,
  savePersonWeek,
  type CheckinKV,
} from './checkin-store.ts'

const secrets = {
  adam: 'adam-dev-token-do-not-use-in-prod-1',
  yagiz: 'yagiz-dev-token-do-not-use-in-prod-2',
}

function memoryKv(): CheckinKV & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    async get(key) {
      return data.get(key) ?? null
    },
    async put(key, value) {
      data.set(key, value)
    },
    async list({ prefix }) {
      return {
        keys: [...data.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })),
        list_complete: true,
      }
    },
  }
}

describe('weekLogDate', () => {
  it('uses the opening day, week-ending dates, and the final weigh-in', () => {
    assert.equal(weekLogDate(0), '2026-09-01')
    assert.equal(weekLogDate(1), '2026-09-07')
    assert.equal(weekLogDate(2), '2026-09-14')
    assert.equal(weekLogDate(32), '2027-04-11')
  })
})

describe('personFromToken', () => {
  it('maps each fighter to their own secret and rejects everyone else', () => {
    assert.deepEqual(personFromToken(secrets.adam, secrets), { ok: true, person: 'adam' })
    assert.deepEqual(personFromToken(secrets.yagiz, secrets), { ok: true, person: 'yagiz' })
    assert.deepEqual(personFromToken('nope', secrets), { ok: false, error: 'unauthorized' })
    assert.deepEqual(personFromToken(secrets.adam, {}), { ok: false, error: 'unconfigured' })
    assert.equal(secretsReady({ adam: 'short', yagiz: secrets.yagiz }), false)
  })

  it('does not let a body person field impersonate the other corner', () => {
    const auth = personFromToken(secrets.adam, secrets)
    assert.equal(auth.ok && auth.person, 'adam')
  })
})

describe('extractToken', () => {
  it('prefers Authorization, then the header, then the body', () => {
    assert.equal(extractToken('Bearer abc', 'header', 'body'), 'abc')
    assert.equal(extractToken(null, ' header ', 'body'), 'header')
    assert.equal(extractToken(null, null, ' body '), 'body')
    assert.equal(extractToken(null, null, 1), null)
  })
})

describe('parseCheckinPatch', () => {
  it('accepts a Sunday log and ignores spoofed identity fields', () => {
    const parsed = parseCheckinPatch({
      week: '1',
      weight: '282.44',
      stepDays: 5,
      person: 'yagiz',
      token: 'ignore',
    })
    assert.equal(parsed.ok, true)
    if (parsed.ok) {
      assert.deepEqual(parsed.patch, { week: 1, weight: 282.4, stepDays: 5 })
    }
  })

  it('rejects empty posts and out-of-range numbers', () => {
    assert.equal(parseCheckinPatch({ week: 1 }).ok, false)
    assert.equal(parseCheckinPatch({ weight: 10 }).ok, false)
    assert.equal(parseCheckinPatch({ stepDays: 8 }).ok, false)
    assert.equal(parseCheckinPatch({ pushUps: 0 }).ok, false)
  })
})

describe('merge and upsert', () => {
  it('overlays one person without wiping the other', () => {
    const merged = mergeCheckins(checkins, [
      {
        person: 'adam',
        entry: {
          week: 1,
          date: '2026-09-07',
          log: { ...emptyLog(), weight: 282, stepDays: 5 },
          updatedAt: '2026-09-07T20:00:00.000Z',
        },
      },
    ])
    assert.equal(merged.length, 2)
    assert.equal(merged[1]?.adam.weight, 282)
    assert.equal(merged[1]?.yagiz.weight, null)
    assert.equal(merged[0]?.adam.weight, 285)
  })

  it('updates a week in place instead of appending a duplicate row', async () => {
    const kv = memoryKv()
    const first = await savePersonWeek(
      kv,
      'adam',
      1,
      { log: emptyLog(), date: weekLogDate(1) },
      { weight: 282, stepDays: 4 },
      new Date('2026-09-07T18:00:00.000Z'),
    )
    const second = await savePersonWeek(
      kv,
      'adam',
      1,
      first.entry,
      { weight: 281.5, stepDays: 5 },
      new Date('2026-09-07T21:00:00.000Z'),
    )
    const same = await savePersonWeek(
      kv,
      'adam',
      1,
      second.entry,
      { weight: 281.5, stepDays: 5 },
      new Date('2026-09-07T22:00:00.000Z'),
    )

    assert.equal(first.unchanged, false)
    assert.equal(second.unchanged, false)
    assert.equal(same.unchanged, true)
    assert.equal(second.entry.log.weight, 281.5)
    assert.equal(kv.data.size, 1)
    assert.equal(parseCheckinKey(checkinKey('adam', 1))?.person, 'adam')
  })

  it('treats an identical resubmit as a no-op even when some fields are omitted', () => {
    const current = { ...emptyLog(), weight: 282, stepDays: 5 }
    const next = applyLogPatch(current, { weight: 282 })
    assert.equal(personLogsEqual(current, next), true)
  })
})
