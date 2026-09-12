/**
 * Restore the live content from the backup into a freshly created v3 schema.
 *
 * Only live content is restored. The `_*_v*` version-history tables are not:
 * their shape changed too, and Payload regenerates version rows as documents
 * are edited, so replaying old revisions into a new schema is high risk for
 * no live benefit. The backup keeps them if they are ever needed.
 *
 * The interesting part is that v2 kept upload and single-relationship values in
 * the polymorphic `*_rels` tables, keyed by a `path` like `hero.media` or
 * `layout.0.gallery.3.media`, while v3 stores them as a foreign key on the
 * owning row. Those values are moved here, and the now-redundant rels rows are
 * dropped rather than carried over.
 *
 * Usage:
 *   node restore.cjs <backup-dir>            # dry run, touches nothing
 *   node restore.cjs <backup-dir> --apply    # writes
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const BACKUP = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!BACKUP) {
  console.error('usage: node restore.cjs <backup-dir> [--apply]')
  process.exit(1)
}

const load = (t) => {
  const p = path.join(BACKUP, 'data', t + '.json')
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : []
}

const sessionUri = () => {
  const u = new URL(process.env.DATABASE_URI)
  u.port = '5432'
  return u.toString()
}

// --- derive the relationship values v3 wants on the row -------------------

const relIndex = (rows, pathName) => {
  const m = new Map()
  for (const r of rows) if (r.path === pathName) m.set(r.parent_id, r)
  return m
}

const pagesRels = load('pages_rels')
const projectsRels = load('projects_rels')
const stacksRels = load('stacks_rels')
const categoriesRels = load('categories_rels')

const pagesHeroMedia = relIndex(pagesRels, 'hero.media')
const pagesMetaImage = relIndex(pagesRels, 'meta.image')
const projectsMetaImage = relIndex(projectsRels, 'meta.image')
const projectsHeroMedia = relIndex(projectsRels, 'hero.media')
const stacksMedia = relIndex(stacksRels, 'media')

// gallery: layout.<blockIdx>.gallery.<itemIdx>.media
const projectBlocks = load('projects_blocks_project_block')
const blockById = new Map(projectBlocks.map((b) => [b.id, b]))
const galleryMedia = new Map() // gallery row id -> media id
for (const g of load('projects_blocks_project_block_gallery')) {
  const block = blockById.get(g._parent_id)
  if (!block) continue
  const wanted = `layout.${(block._order ?? 1) - 1}.gallery.${(g._order ?? 1) - 1}.media`
  const rel = projectsRels.find((r) => r.parent_id === block._parent_id && r.path === wanted)
  if (rel && rel.media_id != null) galleryMedia.set(g.id, rel.media_id)
}

// breadcrumbs: breadcrumbs.<idx>.doc
const breadcrumbDoc = new Map() // breadcrumb row id -> category id
for (const b of load('categories_breadcrumbs')) {
  const wanted = `breadcrumbs.${(b._order ?? 1) - 1}.doc`
  const rel = categoriesRels.find((r) => r.parent_id === b._parent_id && r.path === wanted)
  if (rel && rel.categories_id != null) breadcrumbDoc.set(b.id, rel.categories_id)
}

// Rels rows whose value moved onto the row are not carried over.
const movedPaths = {
  pages_rels: (r) => r.path === 'hero.media' || r.path === 'meta.image',
  projects_rels: (r) =>
    r.path === 'meta.image' || r.path === 'hero.media' || /\.gallery\.\d+\.media$/.test(r.path),
  stacks_rels: (r) => r.path === 'media',
}

// v2 named these in camelCase; v3 normalises them.
const RENAMES = {
  iconLink_type: 'icon_link_type',
  populateBy: 'populate_by',
  relationTo: 'relation_to',
  populateCollection: 'populate_collection',
}

// Extra values computed per row, beyond a straight column copy.
const DERIVED = {
  pages: (r) => ({
    hero_media_id: pagesHeroMedia.get(r.id)?.media_id ?? null,
    meta_image_id: pagesMetaImage.get(r.id)?.media_id ?? null,
  }),
  projects: (r) => ({
    hero_media_id: projectsHeroMedia.get(r.id)?.media_id ?? null,
    meta_image_id: projectsMetaImage.get(r.id)?.media_id ?? null,
  }),
  stacks: (r) => ({ media_id: stacksMedia.get(r.id)?.media_id ?? null }),
  projects_blocks_project_block_gallery: (r) => ({ media_id: galleryMedia.get(r.id) ?? null }),
  categories_breadcrumbs: (r) => ({ doc_id: breadcrumbDoc.get(r.id) ?? null }),
}

// Parents before children; every *_rels table last so its targets exist.
const ORDER = [
  'users',
  'users_roles',
  'media',
  'categories',
  'categories_breadcrumbs',
  'pages',
  'pages_hero_links',
  'pages_hero_icon_links',
  'pages_blocks_cta',
  'pages_blocks_cta_links',
  'pages_blocks_content',
  'pages_blocks_content_columns',
  'pages_blocks_media_block',
  'pages_blocks_archive',
  'pages_blocks_stacks_parade',
  'pages_blocks_project_block',
  'pages_blocks_project_block_gallery',
  'projects',
  'projects_hero_links',
  'projects_hero_icon_links',
  'projects_blocks_content',
  'projects_blocks_content_columns',
  'projects_blocks_media_block',
  'projects_blocks_project_block',
  'projects_blocks_project_block_gallery',
  'stacks',
  'settings',
  'header',
  'header_nav_items',
  'footer',
  'footer_nav_items',
  'payload_preferences',
  'pages_rels',
  'projects_rels',
  'stacks_rels',
  'payload_preferences_rels',
]

async function main() {
  const pool = new Pool({ connectionString: sessionUri(), connectionTimeoutMillis: 20000 })

  // The live column list is the authority on what can be inserted.
  const colRows = (
    await pool.query(
      `select table_name, column_name from information_schema.columns
       where table_schema='public' order by table_name, ordinal_position`,
    )
  ).rows
  const liveCols = new Map()
  for (const c of colRows) {
    if (!liveCols.has(c.table_name)) liveCols.set(c.table_name, [])
    liveCols.get(c.table_name).push(c.column_name)
  }

  const plan = []
  for (const table of ORDER) {
    const target = liveCols.get(table)
    if (!target) continue
    const source = load(table)
    if (!source.length) continue

    const skip = movedPaths[table]
    const rows = []
    for (const raw of source) {
      if (skip && skip(raw)) continue
      const mapped = {}
      for (const [k, v] of Object.entries(raw)) {
        const name = RENAMES[k] ?? k
        if (target.includes(name)) mapped[name] = v
      }
      Object.assign(mapped, DERIVED[table] ? DERIVED[table](raw) : {})
      for (const k of Object.keys(mapped)) if (!target.includes(k)) delete mapped[k]
      rows.push(mapped)
    }
    if (rows.length) plan.push({ table, rows, dropped: source.length - rows.length })
  }

  console.log('RESTORE PLAN' + (APPLY ? ' (APPLYING)' : ' (dry run)'))
  let total = 0
  for (const p of plan) {
    total += p.rows.length
    const note = p.dropped ? '  (' + p.dropped + ' rels rows moved onto their row)' : ''
    console.log('  ' + p.table.padEnd(42) + String(p.rows.length).padStart(4) + note)
  }
  console.log('  ' + 'TOTAL'.padEnd(42) + String(total).padStart(4))

  console.log('')
  console.log('derived foreign keys:')
  console.log('  pages.hero_media_id      : ' + pagesHeroMedia.size)
  console.log('  pages.meta_image_id      : ' + pagesMetaImage.size)
  console.log('  projects.meta_image_id   : ' + projectsMetaImage.size)
  console.log('  stacks.media_id          : ' + stacksMedia.size)
  console.log('  gallery.media_id         : ' + galleryMedia.size)
  console.log('  breadcrumbs.doc_id       : ' + breadcrumbDoc.size)

  if (!APPLY) {
    const sample = plan.find((p) => p.table === 'pages')
    if (sample)
      console.log('\nsample pages row:\n  ' + JSON.stringify(sample.rows[0]).slice(0, 400))
    await pool.end()
    console.log('\nDry run only. Re-run with --apply to write.')
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const p of plan) {
      for (const row of p.rows) {
        const cols = Object.keys(row)
        const params = cols.map((_, i) => '$' + (i + 1))
        await client.query(
          'INSERT INTO "' +
            p.table +
            '" (' +
            cols.map((c) => '"' + c + '"').join(', ') +
            ') VALUES (' +
            params.join(', ') +
            ')',
          cols.map((c) => row[c]),
        )
      }
    }
    // Explicit ids were inserted, so every sequence has to be moved past them.
    await client.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT c.relname AS seq, t.relname AS tbl, a.attname AS col
          FROM pg_class c
          JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'a'
          JOIN pg_class t ON t.oid = d.refobjid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind = 'S' AND n.nspname = 'public'
        LOOP
          EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 0) + 1, false)', r.seq, r.col, r.tbl);
        END LOOP;
      END $$;
    `)
    await client.query('COMMIT')
    console.log('\nCommitted.')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('\nROLLED BACK: ' + e.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('RESTORE FAILED:', e.message)
  process.exit(1)
})
