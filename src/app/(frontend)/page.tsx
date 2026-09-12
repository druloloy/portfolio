import PageTemplate, { generateMetadata } from './(pages)/[slug]/page'

// Route segment config is not inherited through a re-export, so the
// `force-dynamic` on the template does not reach this route and `/` was the one
// page Next tried to prerender.
//
// That matters more than it sounds. The server fetches its own GraphQL endpoint,
// which cannot answer during its own build — nothing is listening yet — so the
// prerender captured failed fetches and froze a homepage with no nav, no footer
// and no content into a static file. Rendering per request avoids the
// chicken-and-egg entirely.
//
// This does not give up the caching work: `force-dynamic` sets `forceDynamic`
// but never touches `fetchCache`, so the tagged fetches still come from the
// Data Cache. The real fix is to read through Payload's Local API instead of
// the app calling itself over HTTP, which removes the self-call altogether.
export const dynamic = 'force-dynamic'

export default PageTemplate

export { generateMetadata }
