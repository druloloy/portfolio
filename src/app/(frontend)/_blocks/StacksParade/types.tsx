import type { Page } from '@/payload-types'

export type StacksParadeProps = Extract<Page['layout'][0], { blockType: 'stacks-parade' }>
