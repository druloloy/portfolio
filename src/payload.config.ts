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
  cors: [serverURL].filter(Boolean),
  csrf: [serverURL].filter(Boolean),
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
