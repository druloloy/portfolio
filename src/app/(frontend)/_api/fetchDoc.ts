import type { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies'

import type { Config } from '@/payload/payload-types'
import { PAGE } from '../_graphql/pages'
import { POST } from '../_graphql/posts'
import { PROJECT } from '../_graphql/projects'
import { CACHE_REVALIDATE_SECONDS, GRAPHQL_API_URL } from './shared'
import { payloadToken } from './token'

const queryMap = {
  pages: {
    query: PAGE,
    key: 'Pages',
  },
  posts: {
    query: POST,
    key: 'Posts',
  },
  projects: {
    query: PROJECT,
    key: 'Projects',
  },
}

export const fetchDoc = async <T>(args: {
  collection: keyof Config['collections']
  slug?: string
  id?: string
  draft?: boolean
}): Promise<T> => {
  const { collection, slug, draft } = args || {}

  if (!queryMap[collection]) throw new Error(`Collection ${collection} not found`)

  let token: RequestCookie | undefined

  if (draft) {
    const { cookies } = await import('next/headers')
    token = (await cookies()).get(payloadToken)
  }

  // Draft requests carry a JWT and return unpublished content, so they must
  // never enter the shared Data Cache — a cached draft could be served to the
  // public. Published reads are cached and busted by tag when the doc is saved.
  const cacheOptions: RequestInit = draft
    ? { cache: 'no-store' }
    : { next: { tags: [`${collection}_${slug}`], revalidate: CACHE_REVALIDATE_SECONDS } }

  const doc: T = await fetch(`${GRAPHQL_API_URL}/api/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token?.value && draft ? { Authorization: `JWT ${token.value}` } : {}),
    },
    ...cacheOptions,
    body: JSON.stringify({
      query: queryMap[collection].query,
      variables: {
        slug,
        draft,
      },
    }),
  })
    ?.then(res => res.json())
    ?.then(res => {
      if (res.errors) throw new Error(res?.errors?.[0]?.message ?? 'Error fetching doc')
      return res?.data?.[queryMap[collection].key]?.docs?.[0]
    })

  return doc
}
