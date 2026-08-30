import { checkins } from '../data/checkins.ts'
import {
  CHALLENGE_END,
  CHALLENGE_START,
  adam,
  websiteDescription,
  websiteTitle,
  websiteUrl,
  yagiz,
} from './challenge.ts'

export const siteName = 'Adam vs Yagiz'
export const htmlLang = 'en-US'
export const siteLocale = 'en_US'
export const themeColor = '#0c0b09'
export const twitterHandle = '@yagiznizipli'
export const supportTweetUrl = 'https://x.com/yagiznizipli/status/2094196882524323952'
export const authorName = 'Yagiz Nizipli'
export const authorUrl = 'https://yagiz.co'
export const authorSameAs = [
  'https://x.com/yagiznizipli',
  'https://github.com/anonrig',
  'https://yagiz.co',
] as const

export const ogImage = {
  path: '/og.png',
  type: 'image/png',
  width: 1200,
  height: 630,
} as const

export const indexRobots =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

export function absoluteUrl(path = '/'): string {
  const normalized = path === '' ? '/' : path
  if (normalized === '/') {
    return websiteUrl
  }
  return new URL(normalized, `${websiteUrl}/`).href
}

export function latestCheckinDate(): string {
  return checkins.at(-1)?.date ?? CHALLENGE_START.slice(0, 10)
}

export function homepageJsonLd() {
  const page = websiteUrl
  const imageUrl = absoluteUrl(ogImage.path)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${page}/#website`,
        url: page,
        name: siteName,
        alternateName: websiteTitle,
        description: websiteDescription,
        inLanguage: htmlLang,
        publisher: { '@id': `${page}/#author` },
        image: { '@id': `${page}/#og` },
      },
      {
        '@type': 'WebPage',
        '@id': `${page}/#webpage`,
        url: page,
        name: websiteTitle,
        description: websiteDescription,
        isPartOf: { '@id': `${page}/#website` },
        about: { '@id': `${page}/#event` },
        inLanguage: htmlLang,
        primaryImageOfPage: { '@id': `${page}/#og` },
      },
      {
        '@type': 'ImageObject',
        '@id': `${page}/#og`,
        url: imageUrl,
        contentUrl: imageUrl,
        width: ogImage.width,
        height: ogImage.height,
        caption: websiteTitle,
        inLanguage: htmlLang,
      },
      {
        '@type': 'SportsEvent',
        '@id': `${page}/#event`,
        name: websiteTitle,
        description: websiteDescription,
        startDate: CHALLENGE_START,
        endDate: CHALLENGE_END,
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        url: page,
        image: imageUrl,
        inLanguage: htmlLang,
        location: {
          '@type': 'VirtualLocation',
          url: page,
        },
        organizer: { '@id': `${page}/#author` },
        competitor: [
          {
            '@type': 'Person',
            name: adam.name,
            description: `${adam.corner}. ${adam.startWeight} lb to ${adam.goalWeight} lb.`,
          },
          {
            '@type': 'Person',
            name: authorName,
            url: authorUrl,
            sameAs: [...authorSameAs],
            description: `${yagiz.corner}. ${yagiz.startWeight} lb to ${yagiz.goalWeight} lb.`,
          },
        ],
      },
      {
        '@type': 'Person',
        '@id': `${page}/#author`,
        name: authorName,
        url: authorUrl,
        sameAs: [...authorSameAs],
      },
    ],
  }
}
