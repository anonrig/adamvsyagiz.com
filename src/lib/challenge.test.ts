import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  PRIZE_USD,
  TOTAL_WEEKS,
  adam,
  prizeLabel,
  weekLogDate,
  weekNumber,
  weightPoints,
  yagiz,
} from './challenge.ts'

describe('weekNumber', () => {
  it('is 0 before the start', () => {
    assert.equal(weekNumber(new Date('2026-08-31T12:00:00-04:00')), 0)
  })

  it('is 1 on opening day', () => {
    assert.equal(weekNumber(new Date('2026-09-01T00:00:00-04:00')), 1)
  })

  it('is 2 on day eight', () => {
    assert.equal(weekNumber(new Date('2026-09-08T00:00:00-04:00')), 2)
  })

  it('is 32 on the final day', () => {
    assert.equal(weekNumber(new Date('2027-04-11T12:00:00-04:00')), 32)
  })

  it('stays at 32 after the challenge', () => {
    assert.equal(weekNumber(new Date('2027-04-12T00:00:00-04:00')), TOTAL_WEEKS)
  })
})

describe('weekLogDate', () => {
  it('anchors week 0, week 1, and the final day', () => {
    assert.equal(weekLogDate(0), '2026-09-01')
    assert.equal(weekLogDate(1), '2026-09-07')
    assert.equal(weekLogDate(32), '2027-04-11')
  })
})

describe('purse', () => {
  it('is a $5,000 winner-take-all', () => {
    assert.equal(PRIZE_USD, 5000)
    assert.equal(prizeLabel, '$5,000')
  })
})

describe('official cards', () => {
  it('keeps start, goal, and cut consistent', () => {
    assert.equal(adam.goalWeight, 225)
    assert.equal(adam.startWeight, 284.8)
    assert.equal(adam.toLose, 59.8)
    assert.equal(adam.toLose, Math.round((adam.startWeight - adam.goalWeight) * 10) / 10)
    assert.equal(yagiz.goalWeight, 145)
    assert.equal(yagiz.startWeight, 178)
    assert.equal(yagiz.toLose, 33)
    assert.equal(yagiz.toLose, Math.round((yagiz.startWeight - yagiz.goalWeight) * 10) / 10)
  })
})

describe('weightPoints', () => {
  it('awards 50 for a completed goal', () => {
    assert.equal(weightPoints(55, 55), 50)
    assert.equal(weightPoints(20, 20), 50)
  })

  it('is proportional for partial progress', () => {
    assert.equal(weightPoints(27.5, 55), 25)
  })

  it('caps at 50', () => {
    assert.equal(weightPoints(70, 55), 50)
  })
})
