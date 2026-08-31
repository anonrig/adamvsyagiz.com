import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { TOTAL_WEEKS, adam, weekLogDate, weekNumber, weightPoints, yagiz } from './challenge.ts'

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

describe('official cards', () => {
  it('keeps start, goal, and cut consistent', () => {
    assert.equal(adam.goalWeight, 220)
    assert.equal(adam.toLose, adam.startWeight - adam.goalWeight)
    assert.equal(adam.toLose, 65)
    assert.equal(yagiz.goalWeight, 145)
    assert.equal(yagiz.toLose, yagiz.startWeight - yagiz.goalWeight)
    assert.equal(yagiz.toLose, 40)
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
