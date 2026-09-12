import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import type { Config } from '@/payload-types'
import { CACHE_REVALIDATE_SECONDS } from './shared'

type Collection = keyof Config['collections']

/**
 * Read a single published document, cached and busted by tag on publish.
 *
 * This used to POST a GraphQL query to the app's own HTTP endpoint. That made
 * rendering depend on `NEXT_PUBLIC_SERVER_URL` naming a host that was already
 * serving this app — which is not true during its own build, and is not true in
 * any environment deployed somewhere other than that URL. The failure was
 * silent: the fetch returned the wrong host's HTML, JSON parsing threw, the
 * error was swallowed and the route fell through to notFound().
 *
 * The Local API runs in-process, so there is no origin, no HTTP round trip per
 * render, and no way for a DNS or hosting change to break rendering.
 *
 * Caching moves with it. `fetch` tags are gone, so `unstable_cache` carries the
 * same tags and the same TTL, and `/next/revalidate` keeps working untouched.
 */
const cachedDoc = (collection: Collection, slug: string) =>
  unstable_cache(
    async () => {
      const payload = await getPayload({ config: configPromise })

      const result = await payload.find({
        collection,
        // Matches the depth the GraphQL queries relied on: uploads and
        // relationships arrive as objects rather than ids.
        depth: 2,
        limit: 1,
        pagination: false,
        where: { slug: { equals: slug } },
      })

      return result.docs?.[0] ?? null
    },
    [collection, slug],
    {
      tags: [`${collection}_${slug}`, collection],
      revalidate: CACHE_REVALIDATE_SECONDS,
    },
  )

export const fetchDoc = async <T>(args: {
  collection: Collection
  slug?: string
  id?: string
  draft?: boolean
}): Promise<T> => {
  const { collection, slug, draft } = args || {}

  if (!slug) return null as T

  // Drafts return unpublished content and must never enter a shared cache: a
  // cached draft could be served to the public. They are read directly, and
  // `draft: true` makes Payload return the newest version rather than the
  // published one.
  if (draft) {
    const payload = await getPayload({ config: configPromise })

    const result = await payload.find({
      collection,
      depth: 2,
      draft: true,
      limit: 1,
      pagination: false,
      where: { slug: { equals: slug } },
    })

    return (result.docs?.[0] ?? null) as T
  }

  return (await cachedDoc(collection, slug)()) as T
}
