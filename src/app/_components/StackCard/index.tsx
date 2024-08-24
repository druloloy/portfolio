import React from 'react'

import { Post, Project, Stack } from '../../../payload/payload-types'
import { Media } from '../Media'

import classes from './index.module.scss'

export const StackCard: React.FC<{
  relationTo?: 'projects' | 'posts' | 'stacks'
  doc?: Stack
}> = props => {
  const { doc } = props
  const { media } = doc

  return (
    <div className={classes.card}>
      <Media size="auto" imgClassName={classes.image} resource={media} />
    </div>
  )
}
