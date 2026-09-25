import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { checkins } from '../data/checkins.ts'
import { achievementsFor, earnedCount } from './achievements.ts'
import { buildStandings } from './scoring.ts'

describe('achievements', () => {
  it('unlocks the contract, the opening weigh-in, and the strength baselines', () => {
    const standings = buildStandings(new Date('2026-08-30T12:00:00-04:00'), [checkins[0]!])
    const adam = achievementsFor('adam', standings)
    const earned = new Set(adam.filter((item) => item.earned).map((item) => item.id))
    assert.equal(earned.has('card'), true)
    assert.equal(earned.has('weigh-in'), true)
    assert.equal(earned.has('baseline'), true)
    assert.equal(earned.has('first-cut'), false)
    assert.equal(earned.has('belt'), false)
    assert.equal(earned.has('hunter'), false)
    assert.equal(earned.has('chin'), false)
    assert.equal(earnedCount('adam', standings).total, adam.length)
    assert.equal(earnedCount('adam', standings).earned, 3)
  })

  it('does not treat opening lifts as a scored strength entry', () => {
    const standings = buildStandings(new Date('2026-09-21T12:00:00-04:00'))
    assert.equal(standings.adam.strengthPts, 0)
    assert.equal(standings.yagiz.strengthPts, 0)
    const yagiz = achievementsFor('yagiz', standings)
    assert.equal(yagiz.find((item) => item.id === 'chin')?.earned, false)
  })
})
