import type { ArrayField } from 'payload'
import type { Field } from 'payload'

import deepMerge from '../utilities/deepMerge'
import type { LinkAppearances } from './link'
import link from './link'

type LinkGroupType = (options?: {
  name?: string
  overrides?: Partial<ArrayField>
  appearances?: LinkAppearances[] | false
}) => Field

const linkGroup: LinkGroupType = ({ overrides = {}, appearances, name = 'links' } = {}) => {
  const generatedLinkGroup: Field = {
    name,
    type: 'array',
    fields: [
      link({
        appearances,
      }),
    ],
  }

  return deepMerge(generatedLinkGroup, overrides)
}

export default linkGroup
