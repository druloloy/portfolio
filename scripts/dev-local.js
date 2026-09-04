#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Local development entrypoint — `yarn dev:local`.
 *
 * Why this exists:
 *
 * `.env` sets PAYLOAD_PUBLIC_SERVER_URL and NEXT_PUBLIC_SERVER_URL to the
 * production origin. That is correct for a deployed build, but it makes local
 * development impossible: `src/app/_api/shared.ts` builds GRAPHQL_API_URL from
 * NEXT_PUBLIC_SERVER_URL, so a local server posts its queries to production,
 * receives HTML instead of JSON, `fetchDoc` returns undefined, and every route
 * falls through to `notFound()` — a 404 on every page, with no obvious cause.
 *
 * This script points both variables at the local server and then hands off to
 * the same nodemon command `yarn dev` uses. The port is read from `.env` so it
 * cannot drift out of sync if PORT changes.
 *
 * `.env` itself is never read for anything else and never modified.
 *
 * Note: this still uses whatever DATABASE_URI `.env` specifies. If that points
 * at production, `yarn dev` and `yarn dev:local` will both run a Drizzle schema
 * push against production on boot. Use a local or staging database.
 */

const { spawn } = require('child_process')
const path = require('path')
const dotenv = require('dotenv')

const projectRoot = path.resolve(__dirname, '..')

// dotenv does not overwrite variables already present in process.env, so an
// explicit shell override still wins over the file.
dotenv.config({ path: path.resolve(projectRoot, '.env') })

const port = process.env.PORT || 3000
const origin = `http://localhost:${port}`

console.log(`[dev:local] public URLs -> ${origin}  (.env unchanged)`)

if (process.env.DATABASE_URI && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URI)) {
  console.log('[dev:local] WARNING: DATABASE_URI is not local. Payload will run a schema')
  console.log('[dev:local]          push against that database on boot.')
}

const child = spawn(
  process.execPath,
  [path.resolve(projectRoot, 'node_modules/nodemon/bin/nodemon.js')],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      PAYLOAD_CONFIG_PATH: 'src/payload/payload.config.ts',
      PAYLOAD_PUBLIC_SERVER_URL: origin,
      NEXT_PUBLIC_SERVER_URL: origin,
    },
  },
)

child.on('exit', code => process.exit(code === null ? 1 : code))
child.on('error', err => {
  console.error('[dev:local] failed to start nodemon:', err.message)
  process.exit(1)
})
