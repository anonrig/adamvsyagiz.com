import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ACTIVITY_MAX,
  ACTIVITY_POINTS,
  FINAL_DAY,
  MAXIMUM_SCORE,
  NORMAL_SCORE,
  PRIZE_USD,
  TOTAL_WEEKS,
  LUNGE_POINTS,
  PULL_UP_POINTS,
  PUSH_UP_POINTS,
  STRENGTH_POINTS,
  WEIGHT_POINTS,
  adam,
  liftPoints,
  prizeLabel,
  pullUpPointsPerRep,
  strengthGoals,
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

  it('is 31 on the final day', () => {
    assert.equal(weekNumber(new Date('2027-04-01T12:00:00-04:00')), 31)
  })

  it('stays at 31 after the challenge', () => {
    assert.equal(weekNumber(new Date('2027-04-02T00:00:00-04:00')), TOTAL_WEEKS)
  })
})

describe('weekLogDate', () => {
  it('anchors week 0, week 1, and the final day', () => {
    assert.equal(weekLogDate(0), '2026-09-01')
    assert.equal(weekLogDate(1), '2026-09-07')
    assert.equal(weekLogDate(31), '2027-04-01')
  })
})

describe('calendar window', () => {
  it('ends April 1 after 31 weeks', () => {
    assert.equal(FINAL_DAY, '2027-04-01')
    assert.equal(TOTAL_WEEKS, 31)
    assert.equal(ACTIVITY_MAX, ACTIVITY_POINTS)
    assert.equal(ACTIVITY_MAX, 30)
    assert.equal(WEIGHT_POINTS + STRENGTH_POINTS + ACTIVITY_POINTS, NORMAL_SCORE)
    assert.equal(NORMAL_SCORE, MAXIMUM_SCORE)
    assert.equal(MAXIMUM_SCORE, 100)
  })
})

describe('purse', () => {
  it('is a $5,000 winner-take-all', () => {
    assert.equal(PRIZE_USD, 5000)
    assert.equal(prizeLabel, '$5,000')
  })
})

describe('strength goals', () => {
  it('splits 25 points across push-ups, pull-ups, and lunges', () => {
    assert.equal(PUSH_UP_POINTS + PULL_UP_POINTS + LUNGE_POINTS, STRENGTH_POINTS)
    assert.equal(strengthGoals.adam.pushUps, 25)
    assert.equal(strengthGoals.yagiz.pushUps, 35)
    assert.equal(strengthGoals.adam.pullUps, 3)
    assert.equal(strengthGoals.yagiz.pullUps, 6)
    assert.equal(strengthGoals.adam.walkingLunges, 12)
    assert.equal(strengthGoals.adam.lungeDumbbellLb, 40)
    assert.equal(strengthGoals.yagiz.lungeDumbbellLb, 50)
    assert.equal(liftPoints(null, 25, 10), 0)
    assert.ok(Math.abs(pullUpPointsPerRep(3) - 5 / 3) < 1e-9)
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
  it('awards 45 for a completed goal', () => {
    assert.equal(weightPoints(55, 55), 45)
    assert.equal(weightPoints(20, 20), 45)
  })

  it('is proportional for partial progress', () => {
    assert.equal(weightPoints(27.5, 55), 22.5)
  })

  it('caps at 45', () => {
    assert.equal(weightPoints(70, 55), 45)
  })
})
