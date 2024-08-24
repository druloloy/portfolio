import { lexicalEditor, LinkFeature } from '@payloadcms/richtext-lexical'
import type { Block } from 'payload/types'

import richText from '../../fields/richText'

export const ProjectBlock: Block = {
  slug: 'projectBlock',
  fields: [
    {
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'media',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    richText({
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, LinkFeature({})],
      }),
    }),
  ],
}
