import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CHALLENGE_END, CHALLENGE_START, websiteUrl } from './challenge.ts'
import { absoluteUrl, homepageJsonLd, latestCheckinDate } from './seo.ts'

describe('absoluteUrl', () => {
  it('keeps the homepage without a trailing slash', () => {
    assert.equal(absoluteUrl('/'), websiteUrl)
    assert.equal(absoluteUrl(''), websiteUrl)
    assert.ok(!absoluteUrl('/').endsWith('/'))
  })

  it('resolves nested paths against the site origin', () => {
    assert.equal(absoluteUrl('/og.png'), `${websiteUrl}/og.png`)
    assert.equal(absoluteUrl('/standings.json'), `${websiteUrl}/standings.json`)
  })
})

describe('homepageJsonLd', () => {
  const graph = homepageJsonLd()
  const byType = Object.fromEntries(
    graph['@graph'].map((node) => [
      Array.isArray(node['@type']) ? node['@type'][0] : node['@type'],
      node,
    ]),
  )

  it('describes the site, page, image, event, and author', () => {
    assert.deepEqual(
      graph['@graph'].map((node) => node['@type']),
      ['WebSite', 'WebPage', 'ImageObject', 'SportsEvent', 'Person'],
    )
  })

  it('does not advertise the purse as a ticket offer', () => {
    assert.equal(
      graph['@graph'].some((node) => node['@type'] === 'Offer' || 'offers' in node),
      false,
    )
  })

  it('uses absolute URLs and the official challenge window', () => {
    assert.equal(byType.WebSite.url, websiteUrl)
    assert.equal(byType.SportsEvent.startDate, CHALLENGE_START)
    assert.equal(byType.SportsEvent.endDate, CHALLENGE_END)
    assert.equal(
      byType.SportsEvent.eventAttendanceMode,
      'https://schema.org/OnlineEventAttendanceMode',
    )
    assert.equal(byType.ImageObject.url, `${websiteUrl}/og.png`)
    assert.equal(byType.ImageObject.width, 1200)
    assert.equal(byType.ImageObject.height, 630)
  })

  it('lists both corners', () => {
    assert.deepEqual(
      byType.SportsEvent.competitor.map((person: { name: string }) => person.name),
      ['Adam', 'Yagiz Nizipli'],
    )
  })
})

describe('latestCheckinDate', () => {
  it('returns the opening weigh-in until more weeks are logged', () => {
    assert.equal(latestCheckinDate(), '2026-09-01')
  })
})
