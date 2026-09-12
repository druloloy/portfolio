#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * DESTRUCTIVE. Drops every Payload table and enum type in the `public` schema.
 *
 * This is step 1 of the Payload 2 -> 3 rebuild. Payload's own migrate:create
 * generates an *initial* migration rather than a diff — it has no knowledge of
 * the v2 schema — so it cannot upgrade a populated database in place. The route
 * that works is: drop, let Payload create the v3 schema from that migration,
 * then restore the content with scripts/restore-content.cjs, which moves the
 * relationship values v3 now keeps on the row rather than in the *_rels tables.
 *
 * Refuses to run unless a backup directory is named and looks complete, and
 * unless --apply is passed. Drops tables and types only: the schema itself, and
 * therefore its grants, is left alone.
 *
 * Usage:
 *   node scripts/drop-payload-schema.cjs <backup-dir>
 *   node scripts/drop-payload-schema.cjs <backup-dir> --apply
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const BACKUP = process.argv[2]
const APPLY = process.argv.includes('--apply')

if (!BACKUP) {
  console.error('Refusing to run: name the backup directory to check against.')
  console.error('usage: node scripts/drop-payload-schema.cjs <backup-dir> [--apply]')
  process.exit(1)
}

for (const required of ['schema.sql', 'schema-metadata.json', 'data']) {
  if (!fs.existsSync(path.join(BACKUP, required))) {
    console.error(`Refusing to run: ${required} is missing from ${BACKUP}.`)
    process.exit(1)
  }
}

const meta = JSON.parse(fs.readFileSync(path.join(BACKUP, 'schema-metadata.json'), 'utf8'))
const dataFiles = fs.readdirSync(path.join(BACKUP, 'data')).filter((f) => f.endsWith('.json'))

console.log(`backup      : ${BACKUP}`)
console.log(`  taken at  : ${meta.takenAt}`)
console.log(`  tables    : ${dataFiles.length}`)
console.log(`  rows      : ${meta.totalRows}`)

if (dataFiles.length !== meta.tableCount) {
  console.error('Refusing to run: the backup is incomplete (table count does not match).')
  process.exit(1)
}

const sessionUri = () => {
  const url = new URL(process.env.DATABASE_URI)
  url.port = '5432'
  return url.toString()
}

async function main() {
  const pool = new Pool({ connectionString: sessionUri(), connectionTimeoutMillis: 20000 })

  const tables = (
    await pool.query(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname='public' and c.relkind='r' order by c.relname`,
    )
  ).rows.map((r) => r.relname)

  const types = (
    await pool.query(
      `select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
       where n.nspname='public' and t.typtype='e' order by t.typname`,
    )
  ).rows.map((r) => r.typname)

  console.log(`\nwould drop  : ${tables.length} tables, ${types.length} enum types`)

  if (!APPLY) {
    await pool.end()
    console.log('\nDry run. Nothing was changed. Re-run with --apply to drop.')
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const t of tables) await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE`)
    for (const ty of types) await client.query(`DROP TYPE IF EXISTS "${ty}" CASCADE`)
    await client.query('COMMIT')
    console.log(`dropped     : ${tables.length} tables, ${types.length} enum types`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`ROLLED BACK : ${err.message}`)
    process.exitCode = 1
  } finally {
    client.release()
  }

  const left = await pool.query(
    `select count(*)::int as n from information_schema.tables where table_schema='public'`,
  )
  console.log(`remaining   : ${left.rows[0].n} tables in public`)
  await pool.end()
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
