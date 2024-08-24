import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { Field } from 'payload/types'

import iconGroup from './iconGroup'
import { LabelFeature } from './lexicalFeatures/label'
import { LargeBodyFeature } from './lexicalFeatures/largeBody'
import linkGroup from './linkGroup'
import richText from './richText'

export const hero: Field = {
  name: 'hero',
  label: false,
  type: 'group',
  fields: [
    {
      type: 'select',
      name: 'type',
      label: 'Type',
      required: true,
      defaultValue: 'lowImpact',
      options: [
        {
          label: 'None',
          value: 'none',
        },
        {
          label: 'High Impact',
          value: 'highImpact',
        },
        {
          label: 'Medium Impact',
          value: 'mediumImpact',
        },
        {
          label: 'Low Impact',
          value: 'lowImpact',
        },
        {
          label: 'Revamp',
          value: 'revamp',
        },
        {
          label: 'Simple',
          value: 'simple',
        },
      ],
    },
    richText({
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, LabelFeature(), LargeBodyFeature()],
      }),
    }),
    linkGroup({
      overrides: {
        maxRows: 2,
        admin: {
          condition: (_, { type } = {}) =>
            ['highImpact', 'mediumImpact', 'lowImpact', 'revamp'].includes(type),
        },
      },
    }),
    iconGroup({
      overrides: {
        maxRows: 5,
        admin: {
          condition: (_, { type } = {}) => ['revamp'].includes(type),
        },
      },
    }),
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        condition: (_, { type } = {}) => ['highImpact', 'mediumImpact', 'revamp'].includes(type),
      },
    },
  ],
}
