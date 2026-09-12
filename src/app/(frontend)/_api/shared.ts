/**
 * Safety net for cached reads, in seconds.
 *
 * Publishing in the admin panel busts the relevant tag immediately, so this is
 * not how content normally refreshes — it is the backstop for when that call
 * cannot be made (the CMS process cannot reach the front end, a network blip, a
 * document changed by a migration rather than the admin UI). Without a TTL a
 * missed tag revalidation means content that is stale forever.
 */
export const CACHE_REVALIDATE_SECONDS = 300
