import { StaticImageData } from 'next/image'

import type { Project } from '../../../payload/payload-types'

export type ProjectBlockProps = Extract<Project['layout'][0], { blockType: 'projectBlock' }>
