import * as fa6Icons from 'react-icons/fa6'
import iconPickerField from '@innovixx/payload-icon-picker-field'
import { Block, Field } from 'payload/types'

const iconContactFields: Field[] = [
  iconPickerField({
    name: 'icon',
    label: 'Icon',
    reactIconPack: fa6Icons,
    admin: {
      condition: (_, siblingData) => siblingData?.appearance === 'iconPrimary',
    },
  }),
  {
    type: 'row',
    fields: [
      {
        name: 'type',
        type: 'radio',
        options: [
          {
            label: 'Internal link',
            value: 'reference',
          },
          {
            label: 'Custom URL',
            value: 'custom',
          },
        ],
        defaultValue: 'reference',
        admin: {
          layout: 'horizontal',
          width: '50%',
        },
      },
      {
        name: 'newTab',
        label: 'Open in new tab',
        type: 'checkbox',
        admin: {
          width: '50%',
          style: {
            alignSelf: 'flex-end',
          },
        },
      },
    ],
  },
]

export const ContactIconBlock: Block = {
  slug: 'contactIconBlock',
  fields: [
    {
      name: 'contact',
      type: 'array',
      fields: iconContactFields,
    },
  ],
}
