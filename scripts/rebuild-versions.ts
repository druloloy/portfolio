import dotenv from 'dotenv'

dotenv.config()

/**
 * Give every restored document a version row.
 *
 * Collections with `versions: { drafts: true }` are read through their `_*_v`
 * table in the admin panel, so a document with no version row is invisible
 * there — the list shows "1-1 of 1" while the collection actually holds 21
 * rows. The database is fine; the admin simply cannot see them.
 *
 * The content restore deliberately skipped the version tables, on the grounds
 * that Payload rebuilds version history as documents are edited. That is true
 * of *history*, but it missed that drafts-enabled collections need at least one
 * version row per document to appear at all.
 *
 * Rather than synthesise those rows in SQL — which would mean reproducing
 * Payload's own versioning layout by hand — each document is re-saved through
 * the Local API so Payload writes its own. A document's existing `_status` is
 * preserved, so a draft stays a draft.
 *
 * Side effect: `updatedAt` moves to now on every document it touches.
 *
 * Usage:
 *   npx tsx scripts/rebuild-versions.ts           # report only
 *   npx tsx scripts/rebuild-versions.ts --apply   # write
 */

const APPLY = process.argv.includes('--apply')

const COLLECTIONS = ['pages', 'posts', 'projects', 'stacks', 'comments'] as const

const run = async (): Promise<void> => {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })

  for (const collection of COLLECTIONS) {
    const all = await payload.find({ collection, depth: 0, limit: 1000, pagination: false })
    const visible = await payload.find({ collection, depth: 0, draft: true, limit: 0 })

    if (all.totalDocs === 0) {
      console.log(`${collection.padEnd(10)} no documents`)
      continue
    }

    console.log(
      `${collection.padEnd(10)} ${all.totalDocs} documents, ${visible.totalDocs} visible to the admin panel`,
    )

    if (!APPLY) continue

    let done = 0
    let failed = 0
    for (const doc of all.docs) {
      const status = (doc as { _status?: string })._status
      try {
        await payload.update({
          collection,
          id: doc.id,
          // A patch containing a field's own current value changes nothing but
          // still makes Payload write a version row.
          data: { title: (doc as { title?: string }).title } as never,
          draft: status !== 'published',
        })
        done++
      } catch (err) {
        failed++
        console.log(`  failed id ${doc.id}: ${(err as Error).message}`)
      }
    }

    const after = await payload.find({ collection, depth: 0, draft: true, limit: 0 })
    console.log(
      `${''.padEnd(10)} re-saved ${done}${failed ? `, ${failed} failed` : ''} -> ${after.totalDocs} now visible`,
    )
  }

  if (!APPLY) console.log('\nReport only. Re-run with --apply to write.')
  process.exit(0)
}

run().catch((err: Error) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
