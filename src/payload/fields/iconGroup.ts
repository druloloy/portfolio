import type { ArrayField } from 'payload/dist/fields/config/types'
import type { Field } from 'payload/types'

import deepMerge from '../utilities/deepMerge'
import iconLink from './iconLinks'

type IconGroupType = (options?: { name?: string; overrides?: Partial<ArrayField> }) => Field

const iconGroup: IconGroupType = ({ overrides = {}, name = 'iconLinks' } = {}) => {
  const generatedLinkGroup: Field = {
    name,
    type: 'array',
    fields: [iconLink({})],
  }

  return deepMerge(generatedLinkGroup, overrides)
}

export default iconGroup
