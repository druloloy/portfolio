import type { GlobalAfterChangeHook } from 'payload'

import { revalidateGlobal } from '../../utilities/revalidate'

// The header and footer are read on every page and are now cached, so a save in
// the admin panel has to bust its tag or the nav silently keeps the old links
// until the TTL expires. As with the collection hooks, this is deliberately not
// awaited: revalidation must not hold up the editor's save.
export const revalidateGlobalHook =
  (global: string): GlobalAfterChangeHook =>
  ({ doc, req: { payload } }) => {
    revalidateGlobal({ global, payload })
    return doc
  }
