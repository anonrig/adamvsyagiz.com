import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ACTIVITY_MAX,
  ACTIVITY_POINTS,
  CHALLENGE_START,
  FINAL_DAY,
  MAXIMUM_SCORE,
  NORMAL_SCORE,
  PRIZE_USD,
  TOTAL_WEEKS,
  FINAL_EXTRA_DAYS,
  challengeSpanLabel,
  adam,
  liftMaxPoints,
  liftPoints,
  prizeLabel,
  scoreCard,
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

  it('is 30 on the final day', () => {
    assert.equal(weekNumber(new Date('2027-04-01T12:00:00-04:00')), 30)
  })

  it('stays at 30 after the challenge', () => {
    assert.equal(weekNumber(new Date('2027-04-02T00:00:00-04:00')), TOTAL_WEEKS)
  })
})

describe('weekLogDate', () => {
  it('anchors week 0, week 1, and the final day', () => {
    assert.equal(weekLogDate(0), '2026-09-01')
    assert.equal(weekLogDate(1), '2026-09-07')
    assert.equal(weekLogDate(29), '2027-03-22')
    assert.equal(weekLogDate(30), '2027-04-01')
  })
})

describe('calendar window', () => {
  it('is 30 weeks plus 2 days from Sept 1 to April 1', () => {
    const start = new Date(CHALLENGE_START)
    const finalMorning = new Date(`${FINAL_DAY}T00:00:00-04:00`)
    const days = Math.round((finalMorning.getTime() - start.getTime()) / 86_400_000)
    assert.equal(FINAL_DAY, '2027-04-01')
    assert.equal(TOTAL_WEEKS, 30)
    assert.equal(FINAL_EXTRA_DAYS, 2)
    assert.equal(days, TOTAL_WEEKS * 7 + FINAL_EXTRA_DAYS)
    assert.equal(challengeSpanLabel, '30 weeks + 2 days')
    assert.equal(ACTIVITY_MAX, ACTIVITY_POINTS)
    assert.equal(ACTIVITY_MAX, 30)
    assert.equal(NORMAL_SCORE, MAXIMUM_SCORE)
    assert.equal(MAXIMUM_SCORE, 100)
    for (const id of ['adam', 'yagiz'] as const) {
      const card = scoreCard[id]
      assert.equal(card.weight + card.strength + card.steps, NORMAL_SCORE)
      assert.equal(card.steps, ACTIVITY_MAX)
      assert.equal(liftMaxPoints[id].pushUps + liftMaxPoints[id].walkingLunges, card.strength)
    }
  })
})

describe('purse', () => {
  it('is a $5,000 winner-take-all', () => {
    assert.equal(PRIZE_USD, 5000)
    assert.equal(prizeLabel, '$5,000')
  })
})

describe('score card', () => {
  it('gives Adam the cut and Yagiz the strength card', () => {
    assert.deepEqual(scoreCard.adam, { weight: 50, strength: 20, steps: 30 })
    assert.deepEqual(scoreCard.yagiz, { weight: 20, strength: 50, steps: 30 })
    assert.deepEqual(liftMaxPoints.adam, { pushUps: 10, walkingLunges: 10 })
    assert.deepEqual(liftMaxPoints.yagiz, { pushUps: 25, walkingLunges: 25 })
  })
})

describe('strength goals', () => {
  it('keeps the rep targets and drops pull-ups to 30 lb lunges', () => {
    assert.equal(strengthGoals.adam.pushUps, 25)
    assert.equal(strengthGoals.yagiz.pushUps, 35)
    assert.equal(strengthGoals.adam.walkingLunges, 12)
    assert.equal(strengthGoals.yagiz.walkingLunges, 12)
    assert.equal(strengthGoals.adam.lungeDumbbellLb, 30)
    assert.equal(strengthGoals.yagiz.lungeDumbbellLb, 30)
    assert.equal('pullUps' in strengthGoals.adam, false)
    assert.equal(liftPoints(null, 25, 10), 0)
  })
})

describe('official cards', () => {
  it('keeps start, goal, and cut consistent', () => {
    assert.equal(adam.goalWeight, 225)
    assert.equal(adam.startWeight, 284.8)
    assert.equal(adam.toLose, 59.8)
    assert.equal(adam.toLose, Math.round((adam.startWeight - adam.goalWeight) * 10) / 10)
    assert.equal(yagiz.goalWeight, 160)
    assert.equal(yagiz.startWeight, 178)
    assert.equal(yagiz.toLose, 18)
    assert.equal(yagiz.toLose, Math.round((yagiz.startWeight - yagiz.goalWeight) * 10) / 10)
  })
})

describe('weightPoints', () => {
  it('awards the personal cap for a completed goal', () => {
    assert.equal(weightPoints(59.8, 59.8, scoreCard.adam.weight), 50)
    assert.equal(weightPoints(18, 18, scoreCard.yagiz.weight), 20)
  })

  it('is proportional for partial progress', () => {
    assert.equal(weightPoints(29.9, 59.8, 50), 25)
    assert.equal(weightPoints(9, 18, 20), 10)
  })

  it('caps at the personal weight card', () => {
    assert.equal(weightPoints(80, 59.8, 50), 50)
    assert.equal(weightPoints(30, 18, 20), 20)
  })
})
