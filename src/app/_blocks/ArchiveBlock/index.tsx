'use client'
import React from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'

import { prefersReducedMotion } from '../../_utilities/prefersReducedMotion'
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

  const sectionRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    // Only the projects block pins. Other archive blocks render normally.
    if (blockName !== 'projects') return undefined

    // Pinning takes over the visitor's scroll. Never do that to someone who
    // asked for reduced motion — they keep native scrolling and get the cards
    // as a plain scrollable row (see index.module.scss).
    if (prefersReducedMotion()) return undefined

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      const track = section.querySelector<HTMLElement>('[data-carousel-track]')
      const viewport = track?.parentElement
      if (!track || !viewport) return

      // The cards are narrower than the viewport, so there is no overflow to
      // scroll through. Instead the track sweeps across: it starts just past
      // the right edge and ends just past the left. The pin lasts exactly that
      // distance, so the sweep completes as the section releases.
      gsap.fromTo(
        track,
        { x: () => viewport.clientWidth },
        {
          x: () => -track.scrollWidth,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${viewport.clientWidth + track.scrollWidth}`,
            pin: true,
            pinSpacing: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        },
      )
    }, section)

    return () => ctx.revert()
  }, [blockName, populatedDocs, selectedDocs])

  return (
    <div
      id={!blockName ? `block-${id}` : blockName}
      className={[classes.archiveBlock, classes[blockName]].join(' ')}
      ref={sectionRef}
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
