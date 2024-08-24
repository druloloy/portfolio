'use client'
import React from 'react'

import { CollectionStacksParade } from '../../_components/CollectionStacksParade'
import { Gutter } from '../../_components/Gutter'
import RichText from '../../_components/RichText'
import { StacksParadeProps } from './types'

import classes from './index.module.scss'

export const StacksParade: React.FC<
  StacksParadeProps & {
    id?: string
  }
> = props => {
  const { introContent, id, limit, populatedDoc, populatedDocsTotal, categories, blockName } = props

  return (
    <div
      id={!blockName ? `block-${id}` : blockName}
      className={[classes.stacksParade, classes[blockName]].join(' ')}
    >
      {introContent && (
        <div data-aos="fade-down" data-aos-once="true" data-aos-duration="1000">
          <Gutter className={classes.introContent}>
            <RichText content={introContent} />
          </Gutter>
        </div>
      )}
      <div>
        <CollectionStacksParade
          populateBy={'collection'}
          relationTo="stacks"
          populatedDoc={populatedDoc}
          populatedDocsTotal={populatedDocsTotal}
          categories={categories}
          limit={limit}
          sort="-publishedAt"
        />
      </div>
    </div>
  )
}
