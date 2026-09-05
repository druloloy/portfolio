import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getRevalidationKey } from '../../../payload/utilities/revalidationKey'

export async function GET(request: NextRequest): Promise<Response> {
  const collection = request.nextUrl.searchParams.get('collection')
  const slug = request.nextUrl.searchParams.get('slug')
  const global = request.nextUrl.searchParams.get('global')
  const secret = request.nextUrl.searchParams.get('secret')

  const expected = getRevalidationKey()

  // Do not indicate that the revalidation key is incorrect in the response
  // This will protect this API route from being exploited
  if (!expected || !secret || secret !== expected) {
    return new Response('Invalid request', { status: 400 })
  }

  // Globals are fetched under a single tag each, since they have no slug.
  if (typeof global === 'string' && global) {
    revalidateTag(`global_${global}`)
    return NextResponse.json({ revalidated: true, now: Date.now() })
  }

  if (typeof collection === 'string' && collection && typeof slug === 'string' && slug) {
    // Bust the single document and any list that includes it. `fetchDocs` tags
    // its results with the bare collection name, so a publish has to clear both
    // or an archive block keeps showing the old title.
    revalidateTag(`${collection}_${slug}`)
    revalidateTag(collection)
    return NextResponse.json({ revalidated: true, now: Date.now() })
  }

  return new Response('Invalid request', { status: 400 })
}
