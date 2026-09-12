import type { Metadata } from 'next'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  siteName: 'druloloy',
  title: 'Andrew Loloy | Full Stack Web Developer | Lifetime Learner',
  description:
    'Crafting solutions that understand your needs. Explore my work and get a glimpse into how I build engaging digital experiences.',
  images: [
    {
      url: 'https://firebasestorage.googleapis.com/v0/b/druloloy-bc6d8.appspot.com/o/contents%2Fog-banner.jpg?alt=media',
    },
  ],
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
