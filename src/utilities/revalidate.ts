import type { Payload } from 'payload'

import { getRevalidationKey } from './revalidationKey'

const hit = async (args: { payload: Payload; query: string; label: string }): Promise<void> => {
  const { payload, query, label } = args

  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_SERVER_URL
      }/next/revalidate?secret=${getRevalidationKey()}&${query}`,
    )

    if (res.ok) {
      payload.logger.info(`Revalidated ${label}`)
    } else {
      payload.logger.error(`Error revalidating ${label}: ${res.status} ${res.statusText}`)
    }
  } catch (err: unknown) {
    payload.logger.error(`Error hitting revalidate route for ${label}: ${err}`)
  }
}

export const revalidate = async (args: {
  collection: string
  slug: string
  payload: Payload
}): Promise<void> => {
  const { collection, slug, payload } = args

  await hit({
    payload,
    query: `collection=${collection}&slug=${slug}`,
    label: `page '${slug}' in collection '${collection}'`,
  })
}

export const revalidateGlobal = async (args: {
  global: string
  payload: Payload
}): Promise<void> => {
  const { global, payload } = args

  await hit({ payload, query: `global=${global}`, label: `global '${global}'` })
}
