/**
 * Data + schema-metadata backup of the Payload database.
 *
 * This is not a pg_dump replacement — it cannot reproduce every DDL detail.
 * It is a safety net for the part that is irreplaceable: the rows. Schema is
 * captured as metadata (columns, types, defaults, constraints, indexes,
 * sequences) so the current shape can be inspected and compared after any
 * migration, and so a restore can be checked against it.
 *
 * Runs over the session-mode pooler (5432), not the transaction pooler (6543).
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const OUT = process.argv[2]
if (!OUT) {
  console.error('usage: node backup.cjs <output-dir>')
  process.exit(1)
}

const sessionUri = () => {
  const u = new URL(process.env.DATABASE_URI)
  u.port = '5432'
  return u.toString()
}

const q = async (pool, text, params) => (await pool.query(text, params)).rows

async function main() {
  const pool = new Pool({ connectionString: sessionUri(), connectionTimeoutMillis: 20000 })
  fs.mkdirSync(path.join(OUT, 'data'), { recursive: true })

  const meta = {}
  meta.takenAt = new Date().toISOString()
  meta.server = (await q(pool, 'select version() as v'))[0].v
  meta.database = (await q(pool, 'select current_database() as d'))[0].d

  meta.columns = await q(
    pool,
    `select table_name, column_name, data_type, is_nullable, column_default, ordinal_position
     from information_schema.columns where table_schema='public' order by table_name, ordinal_position`,
  )
  meta.constraints = await q(
    pool,
    `select tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
     from information_schema.table_constraints tc
     left join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     where tc.table_schema='public' order by tc.table_name, tc.constraint_name`,
  )
  meta.indexes = await q(
    pool,
    `select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by tablename, indexname`,
  )
  meta.sequences = await q(
    pool,
    `select sequence_name, start_value, minimum_value, maximum_value, increment
     from information_schema.sequences where sequence_schema='public' order by sequence_name`,
  )
  meta.enums = await q(
    pool,
    `select t.typname, e.enumlabel, e.enumsortorder
     from pg_type t join pg_enum e on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace where n.nspname='public'
     order by t.typname, e.enumsortorder`,
  )

  const tables = (
    await q(
      pool,
      `select table_name from information_schema.tables
       where table_schema='public' and table_type='BASE TABLE' order by table_name`,
    )
  ).map((r) => r.table_name)

  const counts = {}
  let total = 0
  for (const t of tables) {
    const rows = await q(pool, `select * from "${t}"`)
    counts[t] = rows.length
    total += rows.length
    fs.writeFileSync(path.join(OUT, 'data', t + '.json'), JSON.stringify(rows, null, 0))
  }
  meta.rowCounts = counts
  meta.totalRows = total
  meta.tableCount = tables.length

  fs.writeFileSync(path.join(OUT, 'schema-metadata.json'), JSON.stringify(meta, null, 2))
  await pool.end()

  console.log('tables dumped : ' + tables.length)
  console.log('total rows    : ' + total)
  console.log(
    'non-empty     : ' +
      Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([t, n]) => t + '=' + n)
        .join(', '),
  )
}

main().catch((e) => {
  console.error('BACKUP FAILED:', e.message)
  process.exit(1)
})
