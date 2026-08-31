import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { checkins, emptyLog } from '../data/checkins.ts'
import { adam, weekNumber, weightPoints } from './challenge.ts'
import {
  activityWeeksEarned,
  buildStandings,
  formatInches,
  liftProgress,
  strengthPointsFromLifts,
} from './scoring.ts'

describe('opening standings', () => {
  it('starts both men at the official card weights', () => {
    const standings = buildStandings(new Date('2026-08-31T12:00:00-04:00'))
    assert.equal(standings.calendarWeek, 0)
    assert.equal(standings.adam.currentWeight, 284.8)
    assert.equal(standings.adam.poundsLeft, 59.8)
    assert.equal(standings.yagiz.currentWeight, 178)
    assert.equal(standings.yagiz.poundsLeft, 33)
    assert.equal(standings.adam.currentWaist, 49.75)
    assert.equal(standings.yagiz.currentWaist, 39)
    assert.equal(standings.adam.strengthPts, 0)
    assert.equal(standings.yagiz.strengthPts, 0)
    assert.equal(standings.adam.total, 0)
    assert.equal(standings.yagiz.total, 0)
    assert.equal(standings.leader, null)
  })

  it('keeps the opening weigh-in in the log', () => {
    assert.equal(checkins[0]?.week, 0)
    assert.equal(checkins[0]?.adam.weight, adam.startWeight)
    assert.equal(checkins[0]?.yagiz.weight, 178)
    assert.equal(checkins[0]?.adam.waist, 49.75)
    assert.equal(checkins[0]?.yagiz.waist, 39)
  })

  it('locks opening lifts as 0% strength baselines', () => {
    const standings = buildStandings(new Date('2026-09-01T12:00:00-04:00'))
    const adamLifts = Object.fromEntries(standings.adam.lifts.map((lift) => [lift.lift, lift]))
    const yagizLifts = Object.fromEntries(standings.yagiz.lifts.map((lift) => [lift.lift, lift]))
    assert.equal(adamLifts.pushUps?.baseline, 9)
    assert.equal(adamLifts.invertedRows?.baseline, 6)
    assert.equal(adamLifts.overheadPress?.baseline, 325)
    assert.equal(adamLifts.overheadPress?.baselineDisplay, '13 × 25 lb')
    assert.equal(yagizLifts.pushUps?.baseline, 13)
    assert.equal(yagizLifts.invertedRows?.baseline, 6)
    assert.equal(yagizLifts.overheadPress?.baseline, 320)
    assert.equal(yagizLifts.overheadPress?.baselineDisplay, '16 × 20 lb')
    assert.equal(
      standings.adam.lifts.every((lift) => lift.improvementPct === 0),
      true,
    )
    assert.equal(
      standings.yagiz.lifts.every((lift) => lift.improvementPct === 0),
      true,
    )
  })
})

describe('strength scoring', () => {
  it('is 0 until a baseline exists', () => {
    assert.equal(
      strengthPointsFromLifts([
        {
          lift: 'pushUps',
          baseline: null,
          current: null,
          improvementPct: null,
          baselineDisplay: null,
          currentDisplay: null,
        },
      ]),
      0,
    )
  })

  it('averages lift improvement and caps at 25', () => {
    assert.equal(
      strengthPointsFromLifts([
        {
          lift: 'pushUps',
          baseline: 10,
          current: 12,
          improvementPct: 20,
          baselineDisplay: '10 reps',
          currentDisplay: '12 reps',
        },
        {
          lift: 'invertedRows',
          baseline: 10,
          current: 12,
          improvementPct: 20,
          baselineDisplay: '10 reps',
          currentDisplay: '12 reps',
        },
        {
          lift: 'overheadPress',
          baseline: 10,
          current: 12,
          improvementPct: 20,
          baselineDisplay: '1 × 10 lb',
          currentDisplay: '1 × 12 lb',
        },
      ]),
      20,
    )
    assert.equal(
      strengthPointsFromLifts([
        {
          lift: 'pushUps',
          baseline: 10,
          current: 20,
          improvementPct: 80,
          baselineDisplay: '10 reps',
          currentDisplay: '20 reps',
        },
      ]),
      25,
    )
  })
})

describe('activity', () => {
  it('ignores the opening weigh-in', () => {
    assert.equal(activityWeeksEarned('adam'), 0)
  })
})

describe('overhead press volume', () => {
  it('scores reps × load against the opening set', () => {
    const rows = [
      ...checkins,
      {
        week: 8,
        date: '2026-10-26',
        adam: { ...emptyLog(), overheadPressReps: 16, overheadPressWeight: 25 },
        yagiz: emptyLog(),
      },
    ]
    const press = liftProgress('adam', rows).find((lift) => lift.lift === 'overheadPress')
    assert.equal(press?.baseline, 325)
    assert.equal(press?.current, 400)
    assert.equal(press?.currentDisplay, '16 × 25 lb')
    assert.ok(
      press?.improvementPct !== null &&
        Math.abs((press.improvementPct ?? 0) - (75 / 325) * 100) < 1e-9,
    )
  })
})

describe('formatInches', () => {
  it('keeps quarter inches', () => {
    assert.equal(formatInches(39), '39')
    assert.equal(formatInches(49.75), '49.75')
    assert.equal(formatInches(48.5), '48.5')
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
    assert.equal(standings.yagiz.currentWeight, 178)
    assert.equal(checkins.length, 1)
    assert.equal(buildStandings(new Date('2026-09-07T12:00:00-04:00')).adam.activityPts, 0)
  })

  it('does not double-count a duplicated week row', () => {
    const week = {
      week: 1,
      date: '2026-09-07',
      adam: { ...emptyLog(), weight: 282, stepDays: 5 },
      yagiz: emptyLog(),
    }
    const standings = buildStandings(new Date('2026-09-07T12:00:00-04:00'), [
      ...checkins,
      week,
      week,
    ])
    assert.equal(standings.rounds.length, 2)
    assert.equal(standings.adam.activityPts, 1)
  })
})
