import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { checkins, emptyLog, type StrengthLift } from '../data/checkins.ts'
import {
  adam,
  liftPoints,
  pullUpPointsPerRep,
  weekLogDate,
  weekNumber,
  weightPoints,
} from './challenge.ts'
import {
  activityWeeksEarned,
  buildStandings,
  formatInches,
  liftProgress,
  strengthPointsFromLifts,
  type LiftProgress,
} from './scoring.ts'

function liftStub(lift: StrengthLift, points: number): LiftProgress {
  return {
    lift,
    start: null,
    goal: 1,
    current: null,
    points,
    maxPoints: 10,
    goalPct: null,
    startDisplay: null,
    currentDisplay: null,
    goalDisplay: '1 reps',
  }
}

describe('opening standings', () => {
  it('keeps opening-day weight at zero and does not score starting lifts', () => {
    const standings = buildStandings(new Date('2026-08-31T12:00:00-04:00'), [checkins[0]!])
    assert.equal(standings.calendarWeek, 0)
    assert.equal(standings.adam.currentWeight, 284.8)
    assert.equal(standings.adam.poundsLeft, 59.8)
    assert.equal(standings.yagiz.currentWeight, 178)
    assert.equal(standings.yagiz.poundsLeft, 33)
    assert.equal(standings.adam.currentWaist, 49.75)
    assert.equal(standings.yagiz.currentWaist, 39)
    assert.equal(standings.adam.weightPts, 0)
    assert.equal(standings.yagiz.weightPts, 0)
    assert.equal(standings.adam.strengthPts, 0)
    assert.equal(standings.yagiz.strengthPts, 0)
    assert.equal(standings.adam.total, 0)
    assert.equal(standings.yagiz.total, 0)
    assert.equal(standings.leader, null)
  })

  it('scores the week 1 cut on the live card', () => {
    const standings = buildStandings(new Date('2026-09-07T12:00:00-04:00'), checkins.slice(0, 2))
    assert.equal(standings.calendarWeek, 1)
    assert.equal(standings.adam.currentWeight, 277.6)
    assert.equal(standings.yagiz.currentWeight, 174.6)
    assert.equal(standings.adam.poundsLost, 7.2)
    assert.equal(standings.yagiz.poundsLost, 3.4)
    assert.equal(standings.adam.poundsLeft, 52.6)
    assert.equal(standings.yagiz.poundsLeft, 29.6)
    assert.equal(standings.leader, 'adam')
    assert.equal(standings.adam.activityPts, 1)
    assert.equal(standings.yagiz.activityPts, 0)
    assert.equal(checkins[1]?.adam.stepDays, 4)
    assert.equal(checkins[1]?.yagiz.stepDays, 0)
  })

  it('scores the week 2 cut on the live card', () => {
    const standings = buildStandings(new Date('2026-09-14T12:00:00-04:00'), checkins.slice(0, 3))
    assert.equal(standings.calendarWeek, 2)
    assert.equal(standings.adam.currentWeight, 273.8)
    assert.equal(standings.yagiz.currentWeight, 173.8)
    assert.equal(standings.adam.poundsLost, 11)
    assert.equal(standings.yagiz.poundsLost, 4.2)
    assert.equal(standings.adam.poundsLeft, 48.8)
    assert.equal(standings.yagiz.poundsLeft, 28.8)
    assert.equal(standings.leader, 'adam')
    assert.equal(standings.adam.activityPts, 2)
    assert.equal(standings.yagiz.activityPts, 0)
    assert.equal(checkins[2]?.adam.stepDays, 4)
    assert.equal(checkins[2]?.yagiz.stepDays, 0)
    assert.equal(standings.rounds[2]?.winner, 'adam')
  })

  it('scores the week 3 cut on the live card', () => {
    const standings = buildStandings(new Date('2026-09-21T12:00:00-04:00'))
    assert.equal(standings.calendarWeek, 3)
    assert.equal(standings.adam.currentWeight, 270.4)
    assert.equal(standings.yagiz.currentWeight, 174)
    assert.equal(standings.adam.poundsLost, 14.4)
    assert.equal(standings.yagiz.poundsLost, 4)
    assert.equal(standings.adam.poundsLeft, 45.4)
    assert.equal(standings.yagiz.poundsLeft, 29)
    assert.equal(standings.leader, 'adam')
    assert.equal(standings.adam.weightPts, (14.4 / 59.8) * 45)
    assert.equal(standings.yagiz.weightPts, (4 / 33) * 45)
    assert.equal(standings.adam.activityPts, 3)
    assert.equal(standings.yagiz.activityPts, 1)
    assert.equal(standings.adam.strengthPts, 0)
    assert.equal(standings.yagiz.strengthPts, 0)
    assert.equal(checkins[3]?.adam.stepDays, 5)
    assert.equal(checkins[3]?.yagiz.stepDays, 4)
    assert.equal(standings.rounds[3]?.winner, 'adam')
  })

  it('keeps the opening weigh-in in the log', () => {
    assert.equal(checkins[0]?.week, 0)
    assert.equal(checkins[0]?.adam.weight, adam.startWeight)
    assert.equal(checkins[0]?.yagiz.weight, 178)
    assert.equal(checkins[0]?.adam.waist, 49.75)
    assert.equal(checkins[0]?.yagiz.waist, 39)
  })

  it('locks opening lifts against personal strength goals', () => {
    const standings = buildStandings(new Date('2026-09-01T12:00:00-04:00'))
    const adamLifts = Object.fromEntries(standings.adam.lifts.map((lift) => [lift.lift, lift]))
    const yagizLifts = Object.fromEntries(standings.yagiz.lifts.map((lift) => [lift.lift, lift]))
    assert.equal(adamLifts.pushUps?.start, 9)
    assert.equal(adamLifts.pushUps?.goal, 25)
    assert.equal(adamLifts.pushUps?.current, null)
    assert.equal(adamLifts.pushUps?.points, 0)
    assert.equal(adamLifts.pullUps?.start, 0)
    assert.equal(adamLifts.pullUps?.goal, 3)
    assert.equal(adamLifts.pullUps?.current, null)
    assert.equal(adamLifts.pullUps?.points, 0)
    assert.equal(adamLifts.walkingLunges?.start, null)
    assert.equal(adamLifts.walkingLunges?.startDisplay, 'Unable')
    assert.equal(adamLifts.walkingLunges?.goalDisplay, '12 / leg · 40 lb')
    assert.equal(yagizLifts.pushUps?.start, 13)
    assert.equal(yagizLifts.pushUps?.goal, 35)
    assert.equal(yagizLifts.pushUps?.current, null)
    assert.equal(yagizLifts.pushUps?.points, 0)
    assert.equal(yagizLifts.pullUps?.start, 1)
    assert.equal(yagizLifts.pullUps?.goal, 6)
    assert.equal(yagizLifts.pullUps?.current, null)
    assert.equal(yagizLifts.pullUps?.points, 0)
    assert.equal(yagizLifts.walkingLunges?.startDisplay, 'TBD')
    assert.equal(yagizLifts.walkingLunges?.goalDisplay, '12 / leg · 50 lb')
  })
})

describe('strength scoring', () => {
  it('is 0 until a lift has points', () => {
    assert.equal(strengthPointsFromLifts([liftStub('pushUps', 0)]), 0)
  })

  it('adds the three lifts and caps at 25', () => {
    assert.equal(
      strengthPointsFromLifts([
        liftStub('pushUps', 8),
        liftStub('pullUps', 5),
        liftStub('walkingLunges', 7.5),
      ]),
      20.5,
    )
    assert.equal(strengthPointsFromLifts([liftStub('pushUps', 30)]), 25)
  })

  it('matches the official goal examples', () => {
    assert.equal(liftPoints(20, 25, 10), 8)
    assert.equal(liftPoints(28, 35, 10), 8)
    assert.equal(liftPoints(9, 12, 10), 7.5)
    assert.ok(Math.abs(liftPoints(10, 12, 10) - (10 / 12) * 10) < 1e-9)
    assert.ok(Math.abs(pullUpPointsPerRep(3) - 5 / 3) < 1e-9)
    assert.ok(Math.abs(pullUpPointsPerRep(6) - 5 / 6) < 1e-9)
    assert.equal(liftPoints(4, 3, 5), 5)
    assert.equal(liftPoints(40, 25, 10), 10)
  })
})

describe('activity', () => {
  it('ignores the opening weigh-in and scores qualifying weeks', () => {
    assert.equal(activityWeeksEarned('adam', [checkins[0]!]), 0)
    assert.equal(activityWeeksEarned('adam'), 3)
    assert.equal(activityWeeksEarned('yagiz'), 1)
  })

  it('scores 30 walking points across the 30-week card', () => {
    const rows = [
      checkins[0]!,
      ...Array.from({ length: 30 }, (_, index) => ({
        week: index + 1,
        date: weekLogDate(index + 1),
        adam: { ...emptyLog(), stepDays: 4 },
        yagiz: emptyLog(),
      })),
      {
        week: 31,
        date: '2027-04-08',
        adam: { ...emptyLog(), stepDays: 4 },
        yagiz: emptyLog(),
      },
    ]
    const standings = buildStandings(new Date('2027-04-01T12:00:00-04:00'), rows)
    assert.equal(activityWeeksEarned('adam', rows), 30)
    assert.equal(standings.adam.activityWeeks, 30)
    assert.equal(standings.adam.activityPts, 30)
  })
})

describe('goal retests', () => {
  it('scores a later test against the personal goal, not the start', () => {
    const rows = [
      ...checkins,
      {
        week: 8,
        date: '2026-10-26',
        adam: { ...emptyLog(), pushUps: 20, pullUps: 2, walkingLunges: 9 },
        yagiz: emptyLog(),
      },
    ]
    const lifts = Object.fromEntries(liftProgress('adam', rows).map((lift) => [lift.lift, lift]))
    assert.equal(lifts.pushUps?.start, 9)
    assert.equal(lifts.pushUps?.current, 20)
    assert.equal(lifts.pushUps?.points, 8)
    assert.equal(lifts.pullUps?.current, 2)
    assert.ok(Math.abs((lifts.pullUps?.points ?? 0) - (2 / 3) * 5) < 1e-9)
    assert.equal(lifts.walkingLunges?.current, 9)
    assert.equal(lifts.walkingLunges?.points, 7.5)
    assert.equal(lifts.walkingLunges?.currentDisplay, '9 / leg')
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
  it('is proportional on the 45-point card', () => {
    assert.equal(weightPoints(27.5, 55), 22.5)
    assert.equal(weightPoints(14.4, 59.8), (14.4 / 59.8) * 45)
    assert.equal(weightPoints(4, 33), (4 / 33) * 45)
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
        week: 3,
        date: '2026-09-21',
        adam: { ...emptyLog(), weight: 269, stepDays: 5 },
        yagiz: emptyLog(),
      },
    ]
    const standings = buildStandings(new Date('2026-09-21T12:00:00-04:00'), rows)
    assert.equal(standings.adam.activityPts, 3)
    assert.equal(standings.adam.currentWeight, 269)
    assert.equal(standings.yagiz.currentWeight, 174)
    assert.equal(checkins.length, 4)
    assert.equal(buildStandings(new Date('2026-09-21T12:00:00-04:00')).adam.activityPts, 3)
  })

  it('does not double-count a duplicated week row', () => {
    const week = {
      week: 4,
      date: '2026-09-28',
      adam: { ...emptyLog(), weight: 268, stepDays: 5 },
      yagiz: emptyLog(),
    }
    const standings = buildStandings(new Date('2026-09-28T12:00:00-04:00'), [
      ...checkins,
      week,
      week,
    ])
    assert.equal(standings.rounds.length, 5)
    assert.equal(standings.adam.activityPts, 4)
  })
})
