import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import type { Footer, Header, Settings } from '@/payload-types'
import { CACHE_REVALIDATE_SECONDS } from './shared'

/**
 * Globals are read on every page by the header and footer, so they are the
 * hottest reads in the app and the ones most worth not sending over HTTP. See
 * the note in `fetchDoc.ts` for why the Local API replaced the self-call.
 *
 * Each keeps the tag it had, so the `afterChange` hooks on the globals still
 * bust exactly what they busted before, with the TTL from `shared.ts` as the
 * backstop.
 */
const cachedGlobal = <T>(slug: 'settings' | 'header' | 'footer') =>
  unstable_cache(
    async () => {
      const payload = await getPayload({ config: configPromise })

      const result = await payload.findGlobal({
        slug,
        // Nav items reference pages, and the header renders their slugs.
        depth: 2,
      })

      return result as T
    },
    ['global', slug],
    { tags: [`global_${slug}`], revalidate: CACHE_REVALIDATE_SECONDS },
  )

export async function fetchSettings(): Promise<Settings> {
  return cachedGlobal<Settings>('settings')()
}

export async function fetchHeader(): Promise<Header> {
  return cachedGlobal<Header>('header')()
}

export async function fetchFooter(): Promise<Footer> {
  return cachedGlobal<Footer>('footer')()
}

export const fetchGlobals = async (): Promise<{
  settings: Settings
  header: Header
  footer: Footer
}> => {
  // Started in parallel rather than awaited in turn, as before.
  const [settings, header, footer] = await Promise.all([
    fetchSettings(),
    fetchHeader(),
    fetchFooter(),
  ])

  return { settings, header, footer }
}
