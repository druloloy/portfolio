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

      const cards = Array.from(track.children) as HTMLElement[]
      if (cards.length === 0) return

      // A card's left offset inside the track. Derived from bounding rects
      // rather than offsetLeft: the pin's spacer changes the offsetParent, but
      // both rects shift equally with the track's transform, so their
      // difference is transform-independent and valid mid-animation.
      const offsetWithinTrack = (card: HTMLElement): number =>
        card.getBoundingClientRect().left - track.getBoundingClientRect().left

      // Track position that places a given card in the centre of the window.
      const centreOn = (card: HTMLElement): number =>
        viewport.clientWidth / 2 - card.getBoundingClientRect().width / 2 - offsetWithinTrack(card)

      const first = cards[0]
      const last = cards[cards.length - 1]

      // With one card, start and end coincide: a pin with zero distance traps
      // scroll with nothing to show for it, so skip the trigger entirely.
      if (Math.abs(centreOn(first) - centreOn(last)) <= 0) return

      gsap.fromTo(
        track,
        { x: () => centreOn(first) },
        {
          x: () => centreOn(last),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            // Exactly the distance the track travels, so the sweep completes
            // as the pin releases and no scroll is spent on empty approach.
            end: () => `+=${Math.abs(centreOn(first) - centreOn(last))}`,
            pin: true,
            pinSpacing: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        },
      )
    }, section)

    // The pin reserves scroll distance from the section's size at setup, and
    // that reservation is part of the document height — so every section below
    // it, and the page's own scroll limit, depend on it staying accurate.
    //
    // Nothing else re-measures. Card images finishing, fetched cards arriving,
    // fonts swapping and viewport resizes all change the layout afterwards and
    // would otherwise leave the reservation stale, stranding the page short of
    // its real end.
    //
    // The track is observed as well as the section because `.projects` is a
    // fixed `height: 100vh`: cards loading never changes the section's size,
    // only the track's, so observing the section alone would never fire.
    let refreshFrame = 0

    const scheduleRefresh = (): void => {
      cancelAnimationFrame(refreshFrame)
      refreshFrame = requestAnimationFrame(() => {
        ScrollTrigger.refresh()
      })
    }

    const observer = new ResizeObserver(scheduleRefresh)
    observer.observe(section)

    const trackEl = section.querySelector<HTMLElement>('[data-carousel-track]')
    if (trackEl) observer.observe(trackEl)

    // Images are the common case and do not resize anything observable until
    // they decode, so take one more measurement once everything has loaded.
    window.addEventListener('load', scheduleRefresh)

    return () => {
      cancelAnimationFrame(refreshFrame)
      observer.disconnect()
      window.removeEventListener('load', scheduleRefresh)
      ctx.revert()
    }
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
