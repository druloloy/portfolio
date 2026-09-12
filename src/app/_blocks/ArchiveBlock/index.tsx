'use client'
import React from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'

import { prefersReducedMotion } from '../../_utilities/prefersReducedMotion'
import { CollectionArchive } from '../../_components/CollectionArchive'
import { Gutter } from '../../_components/Gutter'
import RichText from '../../_components/RichText'
import { ArchiveBlockProps } from './types'

// How the sweep is driven. Desktop scrubs across the section's own passage
// through the viewport; mobile pins the section and spends real scroll on the
// sweep, so each card gets a turn in the centre of the screen.
type SweepMode =
  | { kind: 'passing'; trigger: Element }
  | { kind: 'pinned'; trigger: Element; pin: Element }

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
    const sweep = (mode: SweepMode): void => {
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

      // Distance the track travels. Expressed as a function so
      // invalidateOnRefresh re-derives it after a resize or a late image,
      // rather than freezing the value measured at setup.
      const sweepDistance = (): number => Math.abs(centreOn(first) - centreOn(last))

      const scrollTrigger =
        mode.kind === 'passing'
          ? { trigger: mode.trigger, start: 'top bottom', end: 'bottom top' }
          : {
              trigger: mode.trigger,
              // The section is exactly one viewport tall at this breakpoint, so
              // pinning it flush to the top makes the held frame identical to
              // the screen: nothing can be clipped, and the nav clearance the
              // stylesheet reserves actually does its job. Anchoring to the
              // row's centre instead left the section's top hanging above the
              // viewport, with the heading stuck behind the fixed nav for the
              // whole hold.
              //
              // It holds for exactly the horizontal distance the track has to
              // cover, so one pixel of scrolling is one pixel of sweep and the
              // pin releases precisely as the last card lands in the centre.
              start: 'top top',
              end: () => `+=${sweepDistance()}`,
              pin: mode.pin,
              anticipatePin: 1,
            }

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
      sweep({ kind: 'passing', trigger: section })
    })

    // At mid-break and below the section becomes `height: fit-content` and the
    // row is a small part of it, so scrubbing across the section's passage
    // spends most of its progress while the row is still off screen.
    //
    // Anchoring to the row fixed that, but the sweep then finished as the row's
    // top reached the top of the viewport — the last card landed under the
    // fixed nav with most of the screen empty below it. There is also no way,
    // without a pin, to hold a card still long enough to be looked at: the row
    // is always moving up while the cards move sideways.
    //
    // So on a phone the section pins. It holds from the moment the row is
    // vertically centred until the track has covered its full width, which
    // gives every card a turn in the middle of the screen and only lets the
    // page move on once the last one has had it.
    //
    // A pin reserves its distance through an injected spacer, which is part of
    // the document height. That is what stranded the page short of its end
    // before — Lenis cached a scroll limit measured before the spacer existed.
    // The provider now watches the body's children and re-measures, so the
    // spacer is accounted for. That check is not optional here.
    mm.add('(max-width: 1024px)', () => {
      sweep({ kind: 'pinned', trigger: section, pin: section })
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
