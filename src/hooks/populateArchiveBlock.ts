import type { CollectionAfterReadHook } from 'payload'

import { adminsOrPublished } from '../access/adminsOrPublished'
import type { Page, Post, Project, Stack } from '../payload-types'

export const populateArchiveBlock: CollectionAfterReadHook = async ({ doc, context, req }) => {
  // pre-populate the archive block if `populateBy` is `collection`
  // then hydrate it on your front-end
  const payload = req.payload
  const adminOrPublishedResult = await adminsOrPublished({ req: req })
  const adminOrPublishedQuery = adminOrPublishedResult

  const layoutWithArchive = await Promise.all(
    doc.layout.map(async block => {
      if (block.blockType === 'archive') {
        const archiveBlock = block as Extract<Page['layout'][0], { blockType: 'archive' }> & {
          populatedDocs: Array<{
            relationTo: 'pages' | 'posts' | 'stacks'
            value: string
          }>
        }

        if (archiveBlock.populateBy === 'collection' && !context.isPopulatingArchiveBlock) {
          const res: { totalDocs: number; docs: Array<Post | Stack | Project | string> } =
            await payload.find({
              collection: archiveBlock.relationTo,
              limit: archiveBlock.limit || 10,
              context: {
                isPopulatingArchiveBlock: true,
              },
              where: {
                ...(archiveBlock?.categories?.length > 0
                  ? {
                      categories: {
                        in: archiveBlock.categories
                          .map(cat => {
                            if (typeof cat === 'string' || typeof cat === 'number') return cat
                            return cat.id
                          })
                          .join(','),
                      },
                    }
                  : {}),
                ...(typeof adminOrPublishedQuery === 'boolean' ? {} : adminOrPublishedQuery),
              },
              sort: '-publishedAt',
            })

          return {
            ...block,
            populatedDocsTotal: res.totalDocs,
            // The whole document, not its id. This hook runs in afterRead, which
            // is after Payload has populated relationships by depth, so an id
            // put here is never resolved and the front end receives a number
            // where it expects a document.
            //
            // GraphQL hid that: value had its own field resolver, so asking
            // for subfields populated it on demand. Reading the same page over
            // REST or the Local API returned bare ids, and the archive rendered
            // nothing until a client-side fetch filled it in — too late for the
            // scroll animation, which had already found an empty track.
            populatedDocs: res.docs.map(thisDoc => ({
              relationTo: archiveBlock.relationTo,
              value: thisDoc,
            })),
          }
        }
      }

      return block
    }),
  )

  return {
    ...doc,
    layout: layoutWithArchive,
  }
}
