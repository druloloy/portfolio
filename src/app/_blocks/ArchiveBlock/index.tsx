'use client'
import React from 'react'

import { CollectionArchive } from '../../_components/CollectionArchive'
import { Gutter } from '../../_components/Gutter'
import RichText from '../../_components/RichText'
import { ArchiveBlockProps } from './types'

import classes from './index.module.scss'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = props => {
  const {
    introContent,
    id,
    relationTo,
    populateBy,
    limit,
    populatedDocs,
    populatedDocsTotal,
    selectedDocs,
    categories,
    blockName,
  } = props

  return (
    <div
      id={!blockName ? `block-${id}` : blockName}
      className={[classes.archiveBlock, classes[blockName]].join(' ')}
    >
      {introContent && (
        <div data-aos="fade-up" data-aos-once="true" data-aos-duration="1000">
          <Gutter className={classes.introContent}>
            <RichText content={introContent} />
          </Gutter>
        </div>
      )}
      <div>
        <CollectionArchive
          populateBy={populateBy}
          relationTo={relationTo}
          populatedDocs={populatedDocs}
          populatedDocsTotal={populatedDocsTotal}
          selectedDocs={selectedDocs}
          categories={categories}
          limit={limit}
          sort="-publishedAt"
        />
      </div>
    </div>
  )
}
