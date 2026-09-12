import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import type { GenerateTitle } from '@payloadcms/plugin-seo/types'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { gcsStorage } from '@payloadcms/storage-gcs'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import Categories from './collections/Categories'
import Comments from './collections/Comments'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Projects } from './collections/Projects'
import { Stacks } from './collections/Stacks'
import Users from './collections/Users'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { Settings } from './globals/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const generateTitle: GenerateTitle = () => 'My Website'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || ''

// Payload checks the request origin against these lists and rejects anything
// else as unauthorised. That does not look like a CORS problem from the admin
// panel — the page renders, but every action fails with "you must be logged
// in" even though a valid session exists.
//
// NEXT_PUBLIC_SERVER_URL is the production origin, so on its own it locks out
// local development. scripts/dev-local.js used to mask this by rewriting that
// variable; listing the local origin here fixes it where the reason is legible.
const devPort = process.env.PORT || 3000
const allowedOrigins = [
  serverURL,
  ...(process.env.NODE_ENV === 'development'
    ? [`http://localhost:${devPort}`, `http://127.0.0.1:${devPort}`]
    : []),
].filter(Boolean)

export default buildConfig({
  admin: {
    user: Users.slug,
    // Required in v3: custom components are referenced by path string and
    // resolved through a generated import map rooted here.
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      graphics: { Logo: '@/components/Graphics/Logo' },
    },
  },
  editor: lexicalEditor({}),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI },
    // Drizzle's schema push is on by default in development. This database is
    // production, so leaving it on would let simply starting the dev server
    // rewrite the live schema to match v3 — silently and with no way back.
    // Schema changes go through generated migration files instead, reviewed and
    // applied deliberately. Turn this on only against a throwaway database.
    push: false,
  }),
  collections: [Pages, Posts, Projects, Media, Categories, Users, Comments, Stacks],
  globals: [Settings, Header, Footer],
  // v3 reads the secret from the config rather than from payload.init().
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  graphQL: { schemaOutputFile: path.resolve(dirname, 'generated-schema.graphql') },
  cors: allowedOrigins,
  csrf: allowedOrigins,
  plugins: [
    redirectsPlugin({ collections: ['pages', 'posts'] }),
    nestedDocsPlugin({ collections: ['categories'] }),
    seoPlugin({
      collections: ['pages', 'posts', 'projects'],
      generateTitle,
      uploadsCollection: 'media',
    }),
    payloadCloudPlugin(),
    // Replaces the v2 cloudStorage + gcsAdapter pairing. Same bucket, same
    // credentials; the standalone package is how v3 ships storage adapters.
    gcsStorage({
      collections: { media: true },
      bucket: process.env.GCS_BUCKET || '',
      options: {
        keyFilename: `./keystore/${process.env.GCS_KEYFILENAME}`,
        projectId: process.env.GCS_PROJECT_ID,
      },
    }),
  ],
})
