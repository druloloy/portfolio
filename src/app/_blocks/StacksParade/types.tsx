import type { Page } from '../../../payload/payload-types'

export type StacksParadeProps = Extract<Page['layout'][0], { blockType: 'stacks-parade' }>
