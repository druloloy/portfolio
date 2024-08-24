'use client'
import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import RichText from '../../_components/RichText'

import classes from './index.module.scss'

export const SimpleHero: React.FC<{ richText: Page['hero']['richText'] }> = ({ richText }) => {
  return (
    <Gutter className={classes.hero}>
      <div className={classes.content}>
        <RichText content={richText} />
      </div>
    </Gutter>
  )
}
