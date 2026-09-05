'use client'
import React from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'

import { prefersReducedMotion } from '../../_utilities/prefersReducedMotion'
import { CollectionArchive } from '../../_components/CollectionArchive'
import { Gutter } from '../../_components/Gutter'
import RichText from '../../_components/RichText'
import { ArchiveBlockProps } from './types'

type SweepTrigger = {
  trigger: Element
  start: string
  end: string
}

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

    // Both breakpoints sweep between exactly the same two positions — first
    // card centred, last card centred. What differs is the stretch of scrolling
    // that sweep is mapped onto.
    const sweep = (scrollTrigger: SweepTrigger): void => {
      const track = section.querySelector<HTMLElement>('[data-carousel-track]')
      const viewport = track?.parentElement
      if (!track || !viewport) return

      const cards = Array.from(track.children) as HTMLElement[]
      if (cards.length === 0) return

      // A card's left offset inside the track. Derived from bounding rects
      // rather than offsetLeft: both rects shift equally with the track's
      // transform, so their difference is transform-independent and stays
      // valid mid-animation.
      const offsetWithinTrack = (card: HTMLElement): number =>
        card.getBoundingClientRect().left - track.getBoundingClientRect().left

      // Track position that places a given card in the centre of the window.
      const centreOn = (card: HTMLElement): number =>
        viewport.clientWidth / 2 - card.getBoundingClientRect().width / 2 - offsetWithinTrack(card)

      const first = cards[0]
      const last = cards[cards.length - 1]

      // With one card, start and end coincide: there is nothing to sweep.
      if (Math.abs(centreOn(first) - centreOn(last)) <= 0) return

      gsap.fromTo(
        track,
        { x: () => centreOn(first) },
        {
          x: () => centreOn(last),
          ease: 'none',
          scrollTrigger: {
            scrub: 1,
            invalidateOnRefresh: true,
            ...scrollTrigger,
          },
        },
      )
    }

    const mm = gsap.matchMedia(section)

    // Above mid-break the section is a full `height: 100vh` with the card row
    // filling whatever the heading leaves, so the row occupies most of the
    // section and scrubbing across the section's own passage through the
    // viewport reads correctly.
    mm.add('(min-width: 1025px)', () => {
      sweep({ trigger: section, start: 'top bottom', end: 'bottom top' })
    })

    // At mid-break and below the section becomes `height: fit-content` and the
    // row is a small part of it — 341px inside an 845px section on a 375px
    // phone. Scrubbing across the whole section then spends most of its
    // progress while the row is still off screen: measured, the sweep was
    // already 51% done by the time the row was fully visible, so the first
    // project had swept past before it could be seen.
    //
    // Anchoring to the row instead maps the sweep onto exactly the stretch
    // where the row is fully on screen: progress 0 as its bottom meets the
    // viewport bottom, progress 1 as its top reaches the viewport top. The
    // first card is centred when the row settles into view and the last is
    // centred as it leaves — the desktop behaviour, on a phone.
    mm.add('(max-width: 1024px)', () => {
      const row = section.querySelector<HTMLElement>('[data-carousel-track]')?.parentElement
      if (!row) return
      sweep({ trigger: row, start: 'bottom bottom', end: 'top top' })
    })

    // ScrollTrigger resolves start/end from the trigger's measurements at
    // setup and does not re-measure on its own. Card images finishing, fetched
    // cards arriving and fonts swapping all move those positions afterwards,
    // which would otherwise leave the sweep mapped onto the wrong stretch of
    // scrolling.
    //
    // The track is observed as well as the section because above mid-break
    // `.projects` is a fixed `height: 100vh`: cards loading never changes the
    // section's size there, only the track's, so observing the section alone
    // would never fire.
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
      mm.revert()
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
