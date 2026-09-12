import type { MetadataRoute } from 'next'

import type { Page, Project } from '@/payload-types'
import { fetchDocs } from './_api/fetchDocs'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Skip in development and staging.
  if (!process.env.NEXT_PUBLIC_IS_LIVE) {
    return []
  }

  // Read through the Local API rather than fetching this app's own REST
  // endpoints. The sitemap is prerendered, and at build time nothing is
  // listening on localhost yet, so the fetch threw and took the whole build
  // down with "Error occurred prerendering page /sitemap.xml".
  const [pages, projects] = await Promise.all([
    fetchDocs<Page>('pages'),
    fetchDocs<Project>('projects'),
  ])

  const siteMap: MetadataRoute.Sitemap = []

  for (const page of pages) {
    siteMap.push({
      url: `${serverURL}/${page.slug === 'home' ? '' : page.slug}`,
      lastModified: page.updatedAt,
      priority: 1,
      changeFrequency: 'monthly',
    })
  }

  for (const project of projects) {
    siteMap.push({
      url: `${serverURL}/projects/${project.slug}`,
      lastModified: project.updatedAt,
      priority: 0.8,
      changeFrequency: 'monthly',
    })
  }

  return siteMap
}
