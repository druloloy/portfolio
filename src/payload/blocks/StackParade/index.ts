import type { Block } from 'payload/types'

import richText from '../../fields/richText'

export const StackParade: Block = {
  slug: 'stacks-parade',
  labels: {
    singular: 'StackParade',
    plural: 'StacksParade',
  },
  fields: [
    richText({
      name: 'introContent',
      label: 'Intro Content',
    }),
    {
      name: 'populateCollection',
      type: 'select',
      defaultValue: 'collection',
      options: [
        {
          label: 'Collection',
          value: 'collection',
        },
      ],
      admin: {
        hidden: true,
      },
    },
    {
      type: 'relationship',
      name: 'categories',
      label: 'Categories To Show',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      type: 'number',
      name: 'limit',
      label: 'Limit',
      defaultValue: 10,
    },
    {
      type: 'relationship',
      name: 'populatedDoc',
      label: 'Populated Doc',
      relationTo: ['posts', 'projects', 'stacks'],
      hasMany: true,
      admin: {
        disabled: true,
        description: 'This field is auto-populated after-read',
      },
    },
    {
      type: 'number',
      name: 'populatedDocsTotal',
      label: 'Populated Docs Total',
      admin: {
        step: 1,
        disabled: true,
        description: 'This field is auto-populated after-read',
      },
    },
  ],
}
