// The server fetches its own GraphQL endpoint. Which origin to use depends on
// where the code is running, and getting it wrong is not obvious: pointing at
// the public origin from a local server sends the query to production, which
// answers with HTML, so `fetchDoc` returns undefined and every route falls
// through to notFound() — a 404 on every page with no error anywhere.
const localOrigin = `http://127.0.0.1:${process.env.PORT || 3000}`

export const GRAPHQL_API_URL =
  process.env.NEXT_BUILD || process.env.NODE_ENV === 'development'
    ? localOrigin
    : process.env.NEXT_PUBLIC_SERVER_URL

/**
 * Safety net for the Data Cache, in seconds.
 *
 * Publishing in the admin panel busts the relevant tag immediately, so this is
 * not how content normally refreshes — it is the backstop for when that call
 * cannot be made (the CMS process cannot reach the front end, a network blip, a
 * document changed by a migration rather than the admin UI). Without a TTL a
 * missed tag revalidation means content that is stale forever.
 */
export const CACHE_REVALIDATE_SECONDS = 300
