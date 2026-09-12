#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Runs the Payload CLI against the database in **session mode**.
 *
 * `DATABASE_URI` points at Supabase's transaction pooler (port 6543), which is
 * the right choice for the running app — it multiplexes many short-lived
 * connections. It is the wrong choice for DDL: transaction pooling does not
 * hold a session across statements, so named prepared statements and the
 * session-level state that migrations rely on are not available.
 *
 * Supabase serves session mode from the same pooler host on port 5432, so the
 * only change needed is the port. Doing it here rather than in `.env` keeps the
 * runtime connection unchanged, and doing it in a script rather than inline on
 * the command line keeps the password out of shell history and process lists.
 *
 * Usage: node scripts/with-session-db.cjs migrate:status
 */

const { spawn } = require('child_process')
const path = require('path')
const dotenv = require('dotenv')

const projectRoot = path.resolve(__dirname, '..')
dotenv.config({ path: path.resolve(projectRoot, '.env') })

if (!process.env.DATABASE_URI) {
  console.error('[db] DATABASE_URI is not set')
  process.exit(1)
}

let sessionUri
try {
  const url = new URL(process.env.DATABASE_URI)
  const originalPort = url.port
  url.port = '5432'
  sessionUri = url.toString()
  console.log(`[db] ${url.hostname}: port ${originalPort || '(default)'} -> 5432 (session mode)`)
} catch (err) {
  console.error('[db] DATABASE_URI could not be parsed:', err.message)
  process.exit(1)
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('[db] usage: node scripts/with-session-db.cjs <payload command>')
  process.exit(1)
}

const child = spawn(
  process.execPath,
  [path.resolve(projectRoot, 'node_modules/payload/bin.js'), ...args],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URI: sessionUri,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-deprecation`.trim(),
    },
  },
)

child.on('exit', (code) => process.exit(code === null ? 1 : code))
child.on('error', (err) => {
  console.error('[db] failed to start the Payload CLI:', err.message)
  process.exit(1)
})
