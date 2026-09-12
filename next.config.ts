import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

import ContentSecurityPolicy from './csp.js'
import redirects from './redirects.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 writes AGENTS.md and CLAUDE.md into the repo root on boot. This
  // project keeps agent tooling out of its history.
  agentRules: false,
  images: {
    // Payload 3 serves uploads from its own route; the remote patterns cover
    // media still fetched from the configured origin.
    localPatterns: [{ pathname: '/api/media/file/**' }],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      ...(serverURL
        ? [
            {
              protocol: new URL(serverURL).protocol.replace(':', '') as 'http' | 'https',
              hostname: new URL(serverURL).hostname,
            },
          ]
        : []),
    ],
  },
  redirects,
  async headers() {
    const headers = []

    // Keep search engines off anything that is not explicitly live.
    if (!process.env.NEXT_PUBLIC_IS_LIVE) {
      headers.push({
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
        source: '/:path*',
      })
    }

    headers.push({
      source: '/(.*)',
      headers: [{ key: 'Content-Security-Policy', value: ContentSecurityPolicy }],
    })

    return headers
  },
  webpack: webpackConfig => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
    // @innovixx/payload-icon-picker-field ships its components as .jsx with no
    // .js alongside, so a bare directory import of ./IconPicker only resolves
    // if .jsx is in the extension list. The webpack block below does the same
    // job for the webpack builder, which Turbopack ignores.
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json'],
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
