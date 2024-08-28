import type { MetadataRoute } from 'next'

import type { Page, Project } from '../payload/payload-types'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { docs: pages }: { docs: Page[] } = await fetch(`${serverURL}/api/pages?limit=0`).then(
    res => {
      return res.json()
    },
  )
  const { docs: projects }: { docs: Project[] } = await fetch(
    `${serverURL}/api/projects?limit=0`,
  ).then(res => {
    return res.json()
  })

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
