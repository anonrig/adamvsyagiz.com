import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { achievementsFor, earnedCount } from './achievements.ts'
import { buildStandings } from './scoring.ts'

describe('achievements', () => {
  it('unlocks the contract and the opening weigh-in only', () => {
    const standings = buildStandings(new Date('2026-08-30T12:00:00-04:00'))
    const adam = achievementsFor('adam', standings)
    const earned = new Set(adam.filter((item) => item.earned).map((item) => item.id))
    assert.equal(earned.has('card'), true)
    assert.equal(earned.has('weigh-in'), true)
    assert.equal(earned.has('first-cut'), false)
    assert.equal(earned.has('belt'), false)
    assert.equal(earnedCount('adam', standings).total, adam.length)
    assert.equal(earnedCount('adam', standings).earned, 2)
  })
})
