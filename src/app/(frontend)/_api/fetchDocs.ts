import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import type { Config } from '@/payload-types'
import { CACHE_REVALIDATE_SECONDS } from './shared'

type Collection = keyof Config['collections']

/**
 * Read a whole collection. See the note in `fetchDoc.ts` for why this reads
 * through the Local API rather than the app's own HTTP endpoint.
 *
 * This is what `generateStaticParams` calls, which is exactly where the HTTP
 * version could not work: at build time nothing is listening on the public
 * origin yet, so the fetch failed, the error was caught, and an empty list was
 * returned as though the collection had no documents.
 */
const cachedDocs = (collection: Collection) =>
  unstable_cache(
    async () => {
      const payload = await getPayload({ config: configPromise })

      const result = await payload.find({
        collection,
        // Callers use these for slugs and card listings, so relationships do
        // not need populating and a shallower read is cheaper.
        depth: 1,
        limit: 300,
        pagination: false,
      })

      return result.docs ?? []
    },
    [collection, 'all'],
    { tags: [collection], revalidate: CACHE_REVALIDATE_SECONDS },
  )

export const fetchDocs = async <T>(
  collection: Collection,
  draft?: boolean,
): Promise<T[]> => {
  // Drafts stay out of the shared cache, for the reason given in `fetchDoc.ts`.
  if (draft) {
    const payload = await getPayload({ config: configPromise })

    const result = await payload.find({
      collection,
      depth: 1,
      draft: true,
      limit: 300,
      pagination: false,
    })

    return (result.docs ?? []) as T[]
  }

  return (await cachedDocs(collection)()) as T[]
}
