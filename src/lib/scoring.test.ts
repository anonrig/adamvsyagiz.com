import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { checkins, emptyLog } from '../data/checkins.ts'
import { adam, weekNumber, weightPoints } from './challenge.ts'
import { activityWeeksEarned, buildStandings, strengthPointsFromLifts } from './scoring.ts'

describe('opening standings', () => {
  it('starts both men at the official card weights', () => {
    const standings = buildStandings(new Date('2026-08-31T12:00:00-04:00'))
    assert.equal(standings.calendarWeek, 0)
    assert.equal(standings.adam.currentWeight, 285)
    assert.equal(standings.yagiz.currentWeight, 185)
    assert.equal(standings.adam.total, 0)
    assert.equal(standings.yagiz.total, 0)
    assert.equal(standings.leader, null)
  })

  it('keeps the opening weigh-in in the log', () => {
    assert.equal(checkins[0]?.week, 0)
    assert.equal(checkins[0]?.adam.weight, adam.startWeight)
  })
})

describe('strength scoring', () => {
  it('is 0 until a baseline exists', () => {
    assert.equal(
      strengthPointsFromLifts([
        { lift: 'pushUps', baseline: null, current: null, improvementPct: null },
      ]),
      0,
    )
  })

  it('averages lift improvement and caps at 25', () => {
    assert.equal(
      strengthPointsFromLifts([
        { lift: 'pushUps', baseline: 10, current: 12, improvementPct: 20 },
        { lift: 'invertedRows', baseline: 10, current: 12, improvementPct: 20 },
        { lift: 'overheadPress', baseline: 10, current: 12, improvementPct: 20 },
      ]),
      20,
    )
    assert.equal(
      strengthPointsFromLifts([{ lift: 'pushUps', baseline: 10, current: 20, improvementPct: 80 }]),
      25,
    )
  })
})

describe('activity', () => {
  it('ignores the opening weigh-in', () => {
    assert.equal(activityWeeksEarned('adam'), 0)
  })
})

describe('weight math still holds', () => {
  it('is proportional', () => {
    assert.equal(weightPoints(27.5, 55), 25)
  })
})

describe('calendar week', () => {
  it('is 1 on opening day', () => {
    assert.equal(weekNumber(new Date('2026-09-01T00:00:00-04:00')), 1)
  })
})

describe('live rows', () => {
  it('scores a webhook week without mutating the seed log', () => {
    const rows = [
      ...checkins,
      {
        week: 1,
        date: '2026-09-07',
        adam: { ...emptyLog(), weight: 282, stepDays: 5 },
        yagiz: emptyLog(),
      },
    ]
    const standings = buildStandings(new Date('2026-09-07T12:00:00-04:00'), rows)
    assert.equal(standings.adam.activityPts, 1)
    assert.equal(standings.adam.currentWeight, 282)
    assert.equal(standings.yagiz.currentWeight, 185)
    assert.equal(checkins.length, 1)
    assert.equal(buildStandings(new Date('2026-09-07T12:00:00-04:00')).adam.activityPts, 0)
  })
})
