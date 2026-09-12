import type { GlobalConfig } from 'payload'

import { revalidateGlobalHook } from './hooks/revalidateGlobal'

export const Settings: GlobalConfig = {
  slug: 'settings',
  typescript: {
    interface: 'Settings',
  },
  graphQL: {
    name: 'Settings',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateGlobalHook('settings')],
  },
  fields: [
    {
      name: 'postsPage',
      type: 'relationship',
      relationTo: 'pages',
      label: 'Posts page',
    },
    {
      name: 'projectsPage',
      type: 'relationship',
      relationTo: 'pages',
      label: 'Projects page',
    },
  ],
}
