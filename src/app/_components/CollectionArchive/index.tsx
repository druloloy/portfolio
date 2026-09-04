'use client'

import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import qs from 'qs'

import type { Post, Project, Stack } from '../../../payload/payload-types'
import type { ArchiveBlockProps } from '../../_blocks/ArchiveBlock/types'
import { Card } from '../Card'
import { Gutter } from '../Gutter'

// import { PageRange } from '../PageRange'
// import { Pagination } from '../Pagination'
import classes from './index.module.scss'

type Result = {
  docs: (Post | Project | Stack | string)[]
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number
  page: number
  prevPage: number
  totalDocs: number
  totalPages: number
}

export type Props = {
  categories?: ArchiveBlockProps['categories']
  className?: string
  limit?: number
  onResultChange?: (result: Result) => void // eslint-disable-line no-unused-vars
  populateBy?: 'collection' | 'selection'
  populatedDocs?: ArchiveBlockProps['populatedDocs']
  populatedDocsTotal?: ArchiveBlockProps['populatedDocsTotal']
  relationTo?: 'posts' | 'projects' | 'stacks'
  selectedDocs?: ArchiveBlockProps['selectedDocs']
  showPageRange?: boolean
  sort?: string
}

export const CollectionArchive: React.FC<Props> = props => {
  const {
    categories: catsFromProps,
    className,
    limit = 10,
    onResultChange,
    populateBy,
    populatedDocs,
    populatedDocsTotal,
    relationTo,
    selectedDocs,
    // showPageRange,
    sort = '-createdAt',
  } = props

  const [results, setResults] = useState<Result>({
    docs: (populateBy === 'collection'
      ? populatedDocs
      : populateBy === 'selection'
      ? selectedDocs
      : []
    )?.map(doc => doc.value),
    hasNextPage: false,
    hasPrevPage: false,
    nextPage: 1,
    page: 1,
    prevPage: 1,
    totalDocs: typeof populatedDocsTotal === 'number' ? populatedDocsTotal : 0,
    totalPages: 1,
  })

  const archiveRef = React.useRef<HTMLDivElement>(null)
  const hasHydrated = useRef(false)
  const isRequesting = useRef(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)

  const categories = (catsFromProps || [])
    .map(cat => (typeof cat === 'object' ? cat.id : cat))
    .join(',')

  const scrollToRef = useCallback(() => {
    const { current } = scrollRef
    if (current) {
      // current.scrollIntoView({
      //   behavior: 'smooth',
      // })
    }
  }, [])

  useEffect(() => {
    if (!isLoading && typeof results.page !== 'undefined') {
      // scrollToRef()
    }
  }, [isLoading, scrollToRef, results])

  useEffect(() => {
    let timer: NodeJS.Timeout = null

    if (populateBy === 'collection' && !isRequesting.current) {
      isRequesting.current = true

      // hydrate the block with fresh content after first render
      // don't show loader unless the request takes longer than x ms
      // and don't show it during initial hydration
      timer = setTimeout(() => {
        if (hasHydrated.current) {
          setIsLoading(true)
        }
      }, 500)

      const searchQuery = qs.stringify(
        {
          depth: 1,
          limit,
          page,
          sort,
          where: {
            ...(categories
              ? {
                  categories: {
                    in: categories,
                  },
                }
              : {}),
          },
        },
        { encode: false },
      )

      const makeRequest = async () => {
        try {
          const req = await fetch(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/${relationTo}?${searchQuery}`,
          )

          const json = await req.json()
          clearTimeout(timer)

          const { docs } = json as { docs: (Post | Project)[] }

          if (docs && Array.isArray(docs)) {
            setResults(json)
            setIsLoading(false)
            if (typeof onResultChange === 'function') {
              onResultChange(json)
            }
          }
        } catch (err) {
          console.warn(err) // eslint-disable-line no-console
          setIsLoading(false)
          setError(`Unable to load "${relationTo} archive" data at this time.`)
        }

        isRequesting.current = false
        hasHydrated.current = true
      }

      void makeRequest()
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [page, categories, relationTo, onResultChange, sort, limit, populateBy])

  // Horizontal scroll-carousel.
  //
  // Maps vertical scroll position deterministically to a horizontal offset,
  // rather than accumulating deltas — accumulation drifts, fights the CSS
  // transform, and cannot recover from a resize or a jump-scroll.
  React.useEffect(() => {
    const el = archiveRef.current
    if (!el) return undefined

    el.style.transform = ''

    let frame = 0

    const update = (): void => {
      const track = el.querySelector<HTMLElement>(`.${classes.grid}`)
      if (!track) return

      const windowWidth = el.clientWidth
      const trackWidth = track.scrollWidth
      if (windowWidth === 0 || trackWidth === 0) return

      const rect = el.getBoundingClientRect()
      const travel = rect.height + window.innerHeight
      const raw = (window.innerHeight - rect.top) / travel
      const progress = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 1) : 0

      // Sweep the track across the window rather than panning within an
      // overflow: at progress 0 the cards sit just past the right edge, and at
      // progress 1 they have travelled fully past the left edge. Scrolling back
      // up runs it in reverse, because progress is a pure function of position.
      const startX = windowWidth
      const endX = -trackWidth
      const x = startX + progress * (endX - startX)

      track.style.transform = `translateX(${x}px)`
    }

    const onScroll = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [results])

  return (
    <div
      ref={archiveRef}
      className={[classes.collectionArchive, className].filter(Boolean).join(' ')}
    >
      <div className={classes.scrollRef} ref={scrollRef} />
      {!isLoading && error && <Gutter>{error}</Gutter>}
      <Fragment>
        {/* {showPageRange !== false && populateBy !== 'selection' && (
          <Gutter>
            <div className={classes.pageRange}>
              <PageRange
                collection={relationTo}
                currentPage={results.page}
                limit={limit}
                totalDocs={results.totalDocs}
              />
            </div>
          </Gutter>
        )} */}
        {/* <Gutter> */}

        <div className={classes.grid}>
          {results.docs?.map((result, index) => {
            if (typeof result === 'object' && result !== null) {
              return (
                <div
                  // data-aos="fade-down"
                  // data-aos-duration="1000"
                  // data-aos-delay={(index + 1) * 500}
                  // data-aos-once="true"
                  className={[classes.column].join(' ')}
                  key={index}
                >
                  <Card doc={result} relationTo={relationTo} showCategories />
                </div>
              )
            }

            return null
          })}
        </div>
        {/* {results.totalPages > 1 && populateBy !== 'selection' && (
          <Pagination
            className={classes.pagination}
            onClick={setPage}
            page={results.page}
            totalPages={results.totalPages}
          />
        )} */}
        {/* </Gutter> */}
      </Fragment>
    </div>
  )
}
