/**
 * Emit restorable DDL for the public schema without pg_dump.
 *
 * Postgres can hand back exact SQL for the hard parts — pg_get_constraintdef()
 * for constraints and pg_indexes.indexdef for indexes — so the only thing this
 * has to compose by hand is the column list, using format_type() so the types
 * come out exactly as declared. That covers what a Payload schema uses: enums,
 * plain column types, defaults, primary keys, foreign keys, uniques, indexes
 * and sequences.
 *
 * Runs over the session-mode pooler (5432).
 */
require('dotenv').config()
const fs = require('fs')
const { Pool } = require('pg')

const OUT = process.argv[2]
if (!OUT) {
  console.error('usage: node dumpschema.cjs <output.sql>')
  process.exit(1)
}

const sessionUri = () => {
  const u = new URL(process.env.DATABASE_URI)
  u.port = '5432'
  return u.toString()
}

const q = async (pool, text) => (await pool.query(text)).rows
const ident = (n) => '"' + n.replace(/"/g, '""') + '"'

async function main() {
  const pool = new Pool({ connectionString: sessionUri(), connectionTimeoutMillis: 20000 })
  const out = []
  out.push('-- Schema dump of the Payload database (public schema).')
  out.push('-- Generated ' + new Date().toISOString() + ' without pg_dump.')
  out.push('-- Restore order: enums, tables, constraints, indexes, sequence values.')
  out.push('')

  const enums = await q(
    pool,
    `select t.typname,
            array_agg(e.enumlabel::text order by e.enumsortorder) as labels
     from pg_type t
     join pg_enum e on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
     group by t.typname order by t.typname`,
  )
  out.push('-- ' + enums.length + ' enum types')
  for (const e of enums) {
    const labels = e.labels.map((l) => "'" + String(l).replace(/'/g, "''") + "'").join(', ')
    out.push('CREATE TYPE ' + ident(e.typname) + ' AS ENUM (' + labels + ');')
  }
  out.push('')

  const tables = (
    await q(
      pool,
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname='public' and c.relkind='r' order by c.relname`,
    )
  ).map((r) => r.relname)

  out.push('-- ' + tables.length + ' tables')
  for (const t of tables) {
    const cols = await q(
      pool,
      `select a.attname,
              format_type(a.atttypid, a.atttypmod) as coltype,
              a.attnotnull,
              pg_get_expr(d.adbin, d.adrelid) as default_expr
       from pg_attribute a
       left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
       where a.attrelid = '${'public.' + ident(t)}'::regclass
         and a.attnum > 0 and not a.attisdropped
       order by a.attnum`,
    )
    const lines = cols.map((c) => {
      let s = '  ' + ident(c.attname) + ' ' + c.coltype
      if (c.default_expr) s += ' DEFAULT ' + c.default_expr
      if (c.attnotnull) s += ' NOT NULL'
      return s
    })
    out.push('CREATE TABLE ' + ident(t) + ' (')
    out.push(lines.join(',\n'))
    out.push(');')
  }
  out.push('')

  // pg_get_constraintdef gives exact SQL. Primary keys and uniques first so
  // foreign keys have something to reference.
  const cons = await q(
    pool,
    `select rel.relname as table_name, con.conname, con.contype,
            pg_get_constraintdef(con.oid) as def
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_namespace n on n.oid = rel.relnamespace
     where n.nspname='public'
     order by case con.contype when 'p' then 1 when 'u' then 2 when 'c' then 3 else 4 end,
              rel.relname, con.conname`,
  )
  out.push('-- ' + cons.length + ' constraints')
  for (const c of cons) {
    out.push(
      'ALTER TABLE ' +
        ident(c.table_name) +
        ' ADD CONSTRAINT ' +
        ident(c.conname) +
        ' ' +
        c.def +
        ';',
    )
  }
  out.push('')

  const idx = await q(
    pool,
    `select indexname, indexdef from pg_indexes where schemaname='public' order by tablename, indexname`,
  )
  // Indexes backing a constraint are created by the constraint itself.
  const consNames = new Set(cons.map((c) => c.conname))
  const plain = idx.filter((i) => !consNames.has(i.indexname))
  out.push('-- ' + plain.length + ' standalone indexes')
  for (const i of plain) out.push(i.indexdef + ';')
  out.push('')

  const seqs = await q(
    pool,
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname='public' and c.relkind='S' order by c.relname`,
  )
  out.push('-- ' + seqs.length + ' sequence positions')
  for (const s of seqs) {
    const v = await q(pool, `select last_value, is_called from ${ident(s.relname)}`)
    out.push(
      "SELECT setval('" +
        s.relname.replace(/'/g, "''") +
        "', " +
        v[0].last_value +
        ', ' +
        (v[0].is_called ? 'true' : 'false') +
        ');',
    )
  }

  fs.writeFileSync(OUT, out.join('\n') + '\n')
  await pool.end()
  console.log('enums       : ' + enums.length)
  console.log('tables      : ' + tables.length)
  console.log('constraints : ' + cons.length)
  console.log('indexes     : ' + plain.length)
  console.log('sequences   : ' + seqs.length)
  console.log('written     : ' + OUT)
}

main().catch((e) => {
  console.error('SCHEMA DUMP FAILED:', e.message)
  process.exit(1)
})
